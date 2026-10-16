import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

function getDumpPath(): string {
  if (process.argv[2] && fs.existsSync(process.argv[2])) {
    return process.argv[2];
  }
  const dataDir = 'c:/geo/data';
  if (fs.existsSync(dataDir)) {
    const files = fs.readdirSync(dataDir)
      .filter((f) => f.startsWith('database_') && f.endsWith('.dump'))
      .sort()
      .reverse();
    if (files.length > 0) {
      return path.join(dataDir, files[0]).replace(/\\/g, '/');
    }
  }
  return 'c:/geo/data/database_20261016143511.dump';
}

const dumpPath = getDumpPath();
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
  console.log('📁 Arquivo de dump utilizado:', dumpPath);

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

  console.log(`💰 Total de lançamentos extraídos no dump: ${entries.length}`);

  // Verificar quais já existem no banco
  const existingEntries = await prisma.financialEntry.findMany({
    select: { id: true, mondeId: true, status: true, paidAt: true },
  });
  const existingMap = new Map(existingEntries.map((e) => [e.mondeId, e]));

  const newEntries = entries.filter((e) => !existingMap.has(e.mondeId));
  const entriesToUpdate = entries.filter((e) => {
    const dbE = existingMap.get(e.mondeId);
    if (!dbE) return false;
    // Se estava PENDENTE e agora foi liquidado/pago no dump
    return dbE.status === 'PENDENTE' && e.status === 'PAGO';
  });

  // 1. Inserção de novos lançamentos em lotes de 1.000
  const batchSize = 1000;
  if (newEntries.length > 0) {
    console.log(`💾 Inserindo ${newEntries.length} novos lançamentos financeiros no PostgreSQL...`);
    for (let i = 0; i < newEntries.length; i += batchSize) {
      const chunk = newEntries.slice(i, i + batchSize);
      await prisma.financialEntry.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      process.stdout.write(`   Inseridos ${Math.min(i + batchSize, newEntries.length)} de ${newEntries.length} lançamentos\r`);
    }
    console.log(`\n✅ ${newEntries.length} novos lançamentos inseridos com sucesso!`);
  } else {
    console.log(`ℹ️ Nenhum novo lançamento para inserir.`);
  }

  // 2. Atualização de lançamentos que foram quitados (liquidados)
  if (entriesToUpdate.length > 0) {
    console.log(`🔄 Atualizando ${entriesToUpdate.length} lançamentos que foram quitados (PENDENTE ➔ PAGO)...`);
    for (const item of entriesToUpdate) {
      await prisma.financialEntry.update({
        where: { mondeId: item.mondeId },
        data: {
          paidAt: item.paidAt,
          status: 'PAGO',
        },
      });
    }
    console.log(`✅ ${entriesToUpdate.length} lançamentos atualizados para PAGO!`);
  }

  const totalFin = await prisma.financialEntry.count();
  const totalPaid = await prisma.financialEntry.count({ where: { status: 'PAGO' } });
  const totalPending = await prisma.financialEntry.count({ where: { status: 'PENDENTE' } });

  console.log(`\n🎉 Finalizado com sucesso! Total no banco:`);
  console.log(`   - Total de lançamentos: ${totalFin}`);
  console.log(`   - Pagos/Recebidos: ${totalPaid}`);
  console.log(`   - Pendentes: ${totalPending}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro na importação financeira:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
