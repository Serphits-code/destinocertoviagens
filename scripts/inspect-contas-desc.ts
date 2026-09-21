import { execSync } from 'child_process';

const pgRestore = 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe';
const dumpPath = 'c:/geo/data/database_20260917103253.dump';

const raw = execSync(`"${pgRestore}" -f - -a -t conta "${dumpPath}"`, {
  maxBuffer: 50 * 1024 * 1024,
  encoding: 'utf-8',
});

const lines = raw.split('\n');
const copyLine = lines.find((l) => l.startsWith('COPY destinocertoroteiros.conta (')) || '';
const colMatch = copyLine.match(/\((.*)\)/);
const columns = colMatch ? colMatch[1].split(', ').map((c) => c.trim()) : [];
const idIdx = columns.indexOf('conta_id');
const descIdx = columns.indexOf('descricao');
const tipoIdx = columns.indexOf('tipo');
const fcIdx = columns.indexOf('fechamento_caixa');

for (const line of lines) {
  if (line.includes('COPY') || line.startsWith('\\.') || !line.trim() || line.startsWith('--') || line.startsWith('SET') || line.startsWith('SELECT')) continue;
  const parts = line.split('\t');
  if (parts.length > 5) {
    console.log(`Conta: ID=${parts[idIdx]} | Descricao='${parts[descIdx]}' | Tipo='${parts[tipoIdx]}' | FechamentoCaixa='${parts[fcIdx]}'`);
  }
}
