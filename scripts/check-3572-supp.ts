import { execSync } from 'child_process';

const pgRestore = 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe';
const dumpPath = 'c:/geo/data/database_20260917103253.dump';

const raw = execSync(`"${pgRestore}" -f - -a -t vendas_produtos "${dumpPath}"`, {
  maxBuffer: 50 * 1024 * 1024,
  encoding: 'utf-8',
});

const lines = raw.split('\n');
for (const line of lines) {
  if (line.includes('49cbeb91-48a2-4137-ac8d-b7c02be4c7c8')) {
    console.log('3572 vp:', line);
  }
}
