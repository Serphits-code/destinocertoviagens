import { execSync } from 'child_process';

const pgRestore = 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe';
const dumpPath = 'c:/geo/data/database_20260917103253.dump';

console.log('Extracting produtos from dump...');
const raw = execSync(`"${pgRestore}" -f - -a -t produtos "${dumpPath}"`, {
  maxBuffer: 50 * 1024 * 1024,
  encoding: 'utf-8',
});

const lines = raw.split('\n');
const copyLine = lines.find((l) => l.startsWith('COPY destinocertoroteiros.produtos (')) || '';
const colMatch = copyLine.match(/\((.*)\)/);
const columns = colMatch ? colMatch[1].split(', ').map((c) => c.trim()) : [];
console.log('Columns:', columns);

for (const line of lines) {
  if (line.includes('COPY') || line.startsWith('\\.') || !line.trim()) continue;
  const parts = line.split('\t');
  const obj: Record<string, string> = {};
  columns.forEach((c, i) => {
    obj[c] = parts[i];
  });
  console.log(`Produto ID: ${obj.produto_id || obj.id} | Nome: ${obj.nome} | Tipo: ${obj.tipo}`);
}
