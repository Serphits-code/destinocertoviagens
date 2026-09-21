import { execSync } from 'child_process';
import path from 'path';

const pgRestore = 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe';
const dumpPath = path.resolve('data/database_20260917103253.dump');

const finRaw = execSync(`"${pgRestore}" -a -t financeiro -f - "${dumpPath}"`, {
  maxBuffer: 100 * 1024 * 1024,
  encoding: 'utf8',
});

const lines = finRaw.split('\n');
for (const line of lines) {
  if (line.includes('71797931-c058-45d7-93b1-795b6bdf9a68') || line.includes('9804ce77-3db6-4137-af5f-97d0696752c4')) {
    const parts = line.split('\t');
    console.log('ID:', parts[0], 'VendaID:', parts[4], 'Doc:', parts[6], 'Desc:', parts[7], 'Venc:', parts[8], 'Valor:', parts[9], 'Liq:', parts[10], 'Emissao:', parts[11]);
  }
}
