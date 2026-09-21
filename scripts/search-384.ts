import { execSync } from 'child_process';

const pgRestore = 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe';
const dumpPath = 'c:/geo/data/database_20260917103253.dump';

const raw = execSync(`"${pgRestore}" -f - -a -t financeiro "${dumpPath}"`, {
  maxBuffer: 50 * 1024 * 1024,
  encoding: 'utf-8',
});

const lines = raw.split('\n');
console.log('Searching for 384.00 or 384 in financeiro...');
for (const line of lines) {
  if (line.includes('2026-07-01') && (line.includes('384') || line.includes('407') || line.includes('197'))) {
    console.log(line);
  }
}
