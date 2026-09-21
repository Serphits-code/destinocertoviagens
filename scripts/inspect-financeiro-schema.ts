import { execSync } from 'child_process';
import path from 'path';

const pgRestore = 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe';
const dumpPath = path.resolve('data/database_20260917103253.dump');

const output = execSync(`"${pgRestore}" -l "${dumpPath}"`, { encoding: 'utf8' });
const finLine = output.split('\n').find(l => l.includes('TABLE DATA') && l.includes('financeiro'));
console.log('TABLE DATA financeiro:', finLine);

const schema = execSync(`"${pgRestore}" -s -t financeiro -f - "${dumpPath}"`, { encoding: 'utf8' });
console.log(schema.slice(0, 2000));
