import { execSync } from 'child_process';

const pgRestore = 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe';
const dumpPath = 'c:/geo/data/database_20260917103253.dump';

console.log('Listing tables in dump...');
const raw = execSync(`"${pgRestore}" -l "${dumpPath}"`, { encoding: 'utf-8' });
const lines = raw.split('\n');
const tableLines = lines.filter(l => l.includes('TABLE DATA'));
for (const t of tableLines) {
  const parts = t.split('TABLE DATA');
  if (parts[1]) {
    const tableName = parts[1].trim();
    if (tableName.includes('prod') || tableName.includes('tipo') || tableName.includes('servico') || tableName.includes('item')) {
      console.log(tableName);
    }
  }
}
