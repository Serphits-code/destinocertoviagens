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
const descIdx = columns.indexOf('descricao');
const contaIdx = columns.indexOf('conta_id');

for (const date of ['2026-07-08', '2026-07-14', '2026-07-15']) {
  console.log(`\n=== ENTRIES ON ${date} WITH 484, 621, or 8981 ===`);
  for (const line of lines) {
    if (line.includes('COPY') || line.startsWith('\\.') || !line.trim()) continue;
    const parts = line.split('\t');
    if (parts[liqIdx] === date) {
      const val = parts[valIdx];
      const doc = parts[docIdx];
      const desc = parts[descIdx];
      const conta = parts[contaIdx];
      if (val === '484.00' || val === '621.00' || val.includes('8981') || val.includes('3102')) {
        console.log(`Valor: R$ ${val} | Doc: ${doc} | Conta: ${conta} | Desc: ${desc}`);
      }
    }
  }
}
