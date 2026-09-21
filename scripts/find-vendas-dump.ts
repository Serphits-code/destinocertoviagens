import fs from 'fs';
import readline from 'readline';

const id1 = '49cbeb91-48a2-4137-ac8d-b7c02be4c7c8';
const id2 = 'a1dc6f41-b614-4081-9e2d-c373aaa98075';

const stream = fs.createReadStream('data/database_20260917103253.dump', { encoding: 'latin1' });
const rl = readline.createInterface({ input: stream });

let inCopyVenda = false;
let headerCols: string[] = [];

rl.on('line', (line) => {
  if (line.includes('COPY') && line.includes('venda')) {
    console.log('COPY line:', line);
  }
  if (line.includes(id1)) {
    console.log('\n--- FOUND ID 3572 (49cbeb91...) ---');
    console.log(line);
  }
  if (line.includes(id2)) {
    console.log('\n--- FOUND ID 3581 (a1dc6f41...) ---');
    console.log(line);
  }
});
