import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dumpPath = 'c:/geo/data/database_20260902155615.dump';
const pgRestore = 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe';

function parseDate(str: string | null): Date | null {
  if (!str || str === '\\N') return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function cleanVal(str: string | undefined): string | null {
  if (!str || str === '\\N') return null;
  const trimmed = str.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function main() {
  console.log('💳 Iniciando importação dos dados financeiros do dump...');

  // Carregar mapas de Clientes e Fornecedores por mondeId
  console.log('🔍 Mapeando Clientes e Fornecedores cadastrados...');
  const [customers, suppliers] = await Promise.all([
    prisma.customer.findMany({ select: { id: true, mondeId: true } }),
    prisma.supplier.findMany({ select: { id: true, mondeId: true } }),
  ]);

  const customerMap = new Map<string, string>();
  for (const c of customers) {
    if (c.mondeId) customerMap.set(c.mondeId, c.id);
  }

  const supplierMap = new Map<string, string>();
  for (const s of suppliers) {
    if (s.mondeId) supplierMap.set(s.mondeId, s.id);
  }

  console.log(`   - ${customerMap.size} Clientes mapeados`);
  console.log(`   - ${supplierMap.size} Fornecedores mapeados`);

  console.log('📄 Extraindo dados da tabela financeiro do dump...');
  const finRaw = execSync(`"${pgRestore}" -a -t financeiro -f - "${dumpPath}"`, {
    maxBuffer: 100 * 1024 * 1024,
    encoding: 'utf8',
  });

  const lines = finRaw.split('\n');
  const entries: any[] = [];

  for (const line of lines) {
    if (line.startsWith('\\.') || line.startsWith('--') || !line.trim() || line.startsWith('COPY') || line.startsWith('SET') || line.startsWith('SELECT')) continue;
    const parts = line.split('\t');
    if (parts.length > 10) {
      const financeiroId = cleanVal(parts[0]);
      const pessoaId = cleanVal(parts[2]);
      if (!financeiroId || !pessoaId) continue;

      const customerId = customerMap.get(pessoaId) || null;
      const supplierId = supplierMap.get(pessoaId) || null;

      // Se não pertencer a nenhum cliente nem fornecedor registrado, pular
      if (!customerId && !supplierId) continue;

      const mov = parts[5];
      const doc = cleanVal(parts[6]);
      const desc = cleanVal(parts[7]) || 'Lançamento financeiro';
      const venc = parseDate(parts[8]);
      const val = parseFloat(parts[9]) || 0;
      const liq = parseDate(parts[10]);

      if (!venc) continue;

      entries.push({
        mondeId: financeiroId,
        kind: mov === 'C' ? 'RECEBIMENTO' : 'PAGAMENTO',
        description: desc,
        document: doc,
        amount: val,
        dueDate: venc,
        paidAt: liq,
        status: liq ? 'PAGO' : 'PENDENTE',
        customerId,
        supplierId,
      });
    }
  }

  console.log(`💰 Total de lançamentos mapeados e prontos: ${entries.length}`);

  // Inserção em lotes de 1.000
  console.log('💾 Inserindo lançamentos financeiros no PostgreSQL...');
  const batchSize = 1000;
  for (let i = 0; i < entries.length; i += batchSize) {
    const chunk = entries.slice(i, i + batchSize);
    await prisma.financialEntry.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    process.stdout.write(`   Inseridos ${Math.min(i + batchSize, entries.length)} de ${entries.length} lançamentos\r`);
  }

  const totalFin = await prisma.financialEntry.count();
  console.log(`\n✅ Sucesso! Total de lançamentos no banco: ${totalFin}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro na importação financeira:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
