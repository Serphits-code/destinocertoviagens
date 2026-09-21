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
console.log('Columns in financeiro:', columns);

const targetIds = [
  'ddfc20fa-c82a-44c2-b366-01b70aaee6ab',
  '15f10a7b-4a7b-4df1-abe9-cd860b9d389e',
  '3686bb33-2b88-4a91-b776-2ad98144b5d3',
  '3b048159-40f1-486c-915a-e4d10d95b9a3',
  '22a192e1-4999-40c4-98d2-8ca067887ba7',
];

for (const line of lines) {
  for (const tid of targetIds) {
    if (line.includes(tid)) {
      const parts = line.split('\t');
      const obj: Record<string, string> = {};
      columns.forEach((c, i) => {
        obj[c] = parts[i];
      });
      console.log(`\nID: ${tid}`);
      console.log(`liquidacao: ${obj.liquidacao}`);
      console.log(`vencimento: ${obj.vencimento}`);
      console.log(`valor: ${obj.valor}`);
      console.log(`forma_pagamento_id: ${obj.forma_pagamento_id}`);
      console.log(`documento: ${obj.documento}`);
      console.log(`conta_id: ${obj.conta_id}`);
    }
  }
}
