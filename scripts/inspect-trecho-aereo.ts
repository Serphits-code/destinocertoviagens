import { execSync } from 'child_process';

const pgRestore = 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe';
const dumpPath = 'c:/geo/data/database_20260917103253.dump';

console.log('Extracting trecho_aereo from dump...');
const raw = execSync(`"${pgRestore}" -f - -a -t trecho_aereo "${dumpPath}"`, {
  maxBuffer: 50 * 1024 * 1024,
  encoding: 'utf-8',
});

const lines = raw.split('\n');
console.log('Total trechos aereos:', lines.length);

for (const line of lines) {
  if (line.includes('258-7485641') || line.includes('49cbeb91')) {
    console.log('Found match in trecho_aereo:', line);
  }
}
