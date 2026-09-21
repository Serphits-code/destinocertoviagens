import { execSync } from 'child_process';

const pgRestore = 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe';
const dumpPath = 'c:/geo/data/database_20260917103253.dump';

const raw = execSync(`"${pgRestore}" -f - -a -t produto "${dumpPath}"`, {
  maxBuffer: 50 * 1024 * 1024,
  encoding: 'utf-8',
});

const lines = raw.split('\n');
for (const line of lines) {
  if (line.includes('fc01223f-7e23-49c2-b103-c377d6962181') || line.includes('17f82ffb-df9e-4589-bd09-42f51e8788da')) {
    console.log(line);
  }
}
