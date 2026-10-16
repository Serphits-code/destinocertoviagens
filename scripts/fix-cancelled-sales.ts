import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const pgRestore = 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe';
const dumpDir = path.resolve('data');
const dumpFiles = fs.readdirSync(dumpDir).filter((f) => f.startsWith('database_') && f.endsWith('.dump')).sort();
const dumpPath = path.join(dumpDir, dumpFiles[dumpFiles.length - 1]);

async function fixCancelledSales() {
  console.log('Extraindo situacoes do dump do Monde...');
  const raw = execSync(`"${pgRestore}" -f - -a -t vendas "${dumpPath}"`, {
    maxBuffer: 50 * 1024 * 1024,
    encoding: 'utf-8',
  });

  const lines = raw.split('\n');
  const copyLine = lines.find((l) => l.startsWith('COPY destinocertoroteiros.vendas (')) || '';
  const colMatch = copyLine.match(/\((.*)\)/);
  const columns = colMatch ? colMatch[1].split(', ').map((c) => c.trim()) : [];
  const situacaoIdx = columns.indexOf('situacao');
  const idIdx = columns.indexOf('id');
  const numeroIdx = columns.indexOf('numero');

  const cancelledMondeIds: string[] = [];
  const orcamentoMondeIds: string[] = [];

  for (const line of lines) {
    if (line.includes('COPY') || line.startsWith('\\.') || !line.trim()) continue;
    const parts = line.split('\t');
    const sit = parts[situacaoIdx];
    const mondeId = parts[idIdx];

    if (sit === 'C') {
      cancelledMondeIds.push(mondeId);
    } else if (sit === 'A') {
      orcamentoMondeIds.push(mondeId);
    }
  }

  console.log(`Encontradas ${cancelledMondeIds.length} vendas CANCELADAS ('C') e ${orcamentoMondeIds.length} em ABERTO ('A').`);

  // Atualizar no PostgreSQL
  const resCancel = await prisma.sale.updateMany({
    where: {
      mondeId: { in: cancelledMondeIds },
    },
    data: {
      status: 'CANCELADA',
    },
  });
  console.log(`Atualizadas ${resCancel.count} vendas para CANCELADA no banco de dados.`);

  // Verificar Venda 3581 especificamente
  const s3581 = await prisma.sale.findFirst({
    where: { saleNumber: '3581' },
    select: { saleNumber: true, status: true, finalAmount: true },
  });
  console.log('Status da Venda 3581 após atualização:', s3581);

  await prisma.$disconnect();
}

fixCancelledSales().catch(console.error);
