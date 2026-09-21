import { execSync } from 'child_process';

const pgRestore = 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe';
const dumpPath = 'c:/geo/data/database_20260917103253.dump';

const raw = execSync(`"${pgRestore}" -f - -a -t financeiro "${dumpPath}"`, {
  maxBuffer: 50 * 1024 * 1024,
  encoding: 'utf-8',
});

const lines = raw.split('\n');
const copyLine = lines.find((l) => l.startsWith('COPY destinocertoroteiros.financeiro (')) || '';
const colMatch = copyLine.match(/\((.*)\)/);
const columns = colMatch ? colMatch[1].split(', ').map((c) => c.trim()) : [];

const liqIdx = columns.indexOf('liquidacao');
const valIdx = columns.indexOf('valor');
const docIdx = columns.indexOf('documento');
const contaIdx = columns.indexOf('conta_id');
const descIdx = columns.indexOf('descricao');
const emiIdx = columns.indexOf('emissao');

for (const line of lines) {
  if (line.includes('COPY') || line.startsWith('\\.') || !line.trim()) continue;
  const parts = line.split('\t');
  if (parts[liqIdx] === '2026-07-01') {
    const val = parts[valIdx];
    const doc = parts[docIdx];
    const conta = parts[contaIdx];
    const desc = parts[descIdx];
    const emi = parts[emiIdx];
    console.log(`Valor: R$ ${val.padStart(8)} | Doc: ${doc.padEnd(18)} | Conta: ${conta} | Emissao: ${emi} | Desc: ${desc}`);
  }
}
