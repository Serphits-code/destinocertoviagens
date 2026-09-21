import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const pgRestore = 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe';
const dumpPath = 'c:/geo/data/database_20260917103253.dump';

async function checkSituacoes() {
  console.log('Extracting situacoes from dump...');
  const raw = execSync(`"${pgRestore}" -f - -a -t vendas "${dumpPath}"`, {
    maxBuffer: 50 * 1024 * 1024,
    encoding: 'utf-8',
  });

  const lines = raw.split('\n');
  const copyLine = lines.find((l) => l.startsWith('COPY destinocertoroteiros.vendas (')) || '';
  const colMatch = copyLine.match(/\((.*)\)/);
  const columns = colMatch ? colMatch[1].split(', ').map((c) => c.trim()) : [];
  const situacaoIdx = columns.indexOf('situacao');
  const numeroIdx = columns.indexOf('numero');
  const idIdx = columns.indexOf('id');

  const counts: Record<string, number> = {};
  const cancelledIds: string[] = [];

  for (const line of lines) {
    if (line.includes('COPY') || line.startsWith('\\.') || !line.trim()) continue;
    const parts = line.split('\t');
    const sit = parts[situacaoIdx] || 'UNKNOWN';
    counts[sit] = (counts[sit] || 0) + 1;
    if (sit === 'C') {
      cancelledIds.push(parts[numeroIdx]);
    }
  }

  console.log('Situações encontradas no dump:', counts);
  console.log('Total de vendas com C (canceladas):', cancelledIds.length);
  console.log('Exemplos de vendas canceladas:', cancelledIds.slice(0, 10));

  await prisma.$disconnect();
}

checkSituacoes().catch(console.error);
