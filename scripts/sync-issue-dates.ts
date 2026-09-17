import { execSync } from 'child_process';
import path from 'path';
import { db } from '../src/lib/db';

async function syncIssueDates() {
  console.log('🔄 Extraindo data de emissão (issueDate) do dump do Monde...');

  const pgRestore = 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe';
  const dumpPath = path.resolve('data/database_20260917103253.dump');

  const finRaw = execSync(`"${pgRestore}" -a -t financeiro -f - "${dumpPath}"`, {
    maxBuffer: 100 * 1024 * 1024,
    encoding: 'utf8',
  });

  const lines = finRaw.split('\n');
  const emissaoMap = new Map<string, string>(); // mondeId -> YYYY-MM-DD

  for (const line of lines) {
    if (line.startsWith('\\.') || line.startsWith('--') || !line.trim() || line.startsWith('COPY') || line.startsWith('SET') || line.startsWith('SELECT')) continue;
    const parts = line.split('\t');
    if (parts.length > 11) {
      const fId = parts[0]?.trim();
      const emissao = parts[11]?.trim();
      if (fId && emissao && emissao !== '\\N') {
        emissaoMap.set(fId, emissao);
      }
    }
  }

  console.log(`📊 Total de datas de emissão extraídas do dump: ${emissaoMap.size}`);

  const allEntries = await db.financialEntry.findMany({
    select: { id: true, mondeId: true, dueDate: true, sale: { select: { saleDate: true } } },
  });

  console.log(`⚡ Atualizando ${allEntries.length} lançamentos no banco de dados...`);

  let updatedCount = 0;
  const batchSize = 500;

  for (let i = 0; i < allEntries.length; i += batchSize) {
    const batch = allEntries.slice(i, i + batchSize);
    await Promise.all(
      batch.map((entry) => {
        let issueDateStr = entry.mondeId ? emissaoMap.get(entry.mondeId) : null;
        let dateObj: Date | null = null;
        if (issueDateStr) {
          dateObj = new Date(`${issueDateStr}T00:00:00.000Z`);
        } else if (entry.sale?.saleDate) {
          dateObj = entry.sale.saleDate;
        } else {
          dateObj = entry.dueDate;
        }

        return db.financialEntry.update({
          where: { id: entry.id },
          data: { issueDate: dateObj },
        });
      })
    );
    updatedCount += batch.length;
    process.stdout.write(`\rProcessados: ${updatedCount} / ${allEntries.length}`);
  }

  console.log('\n✅ Datas de emissão atualizadas com sucesso!');

  // Testar 22/07/2026 com DINHEIRO
  const dinDay = await db.financialEntry.findMany({
    where: {
      kind: 'RECEBIMENTO',
      paidAt: {
        gte: new Date('2026-07-22T00:00:00.000Z'),
        lte: new Date('2026-07-22T23:59:59.999Z'),
      },
      paymentMethod: 'DINHEIRO',
    },
    select: {
      id: true,
      amount: true,
      issueDate: true,
      paidAt: true,
      dueDate: true,
      customer: { select: { name: true } },
    },
  });

  console.log(`\n🔍 Verificação Dinheiro em 22/07/2026:`);
  for (const r of dinDay) {
    const isVendaDoDia = r.issueDate && r.paidAt && r.issueDate.toISOString().slice(0, 10) === r.paidAt.toISOString().slice(0, 10);
    console.log(`  - ${r.customer?.name}: R$ ${r.amount} (Emissão: ${r.issueDate?.toISOString().slice(0, 10)}) -> Tipo: ${isVendaDoDia ? '🛒 VENDA DO DIA' : '📥 RECEBIMENTO (VENDA ANTERIOR)'}`);
  }
}

syncIssueDates()
  .catch((err) => console.error(err))
  .finally(() => db.$disconnect());
