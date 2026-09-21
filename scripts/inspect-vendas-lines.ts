import fs from 'fs';
import readline from 'readline';

const stream = fs.createReadStream('data/database_20260917103253.dump', { encoding: 'latin1' });
const rl = readline.createInterface({ input: stream });

let inVendas = false;
let count = 0;

rl.on('line', (line) => {
  if (line.includes('COPY') && line.includes('vendas (')) {
    inVendas = true;
    return;
  }
  if (inVendas) {
    if (line.startsWith('\\.')) {
      inVendas = false;
      return;
    }
    count++;
    if (count <= 5) {
      console.log(`Line ${count}:`, line.split('\t').slice(0, 15));
    }
    if (line.includes('49cbeb91-48a2-4137-ac8d-b7c02be4c7c8') || line.includes('a1dc6f41-b614-4081-9e2d-c373aaa98075')) {
      console.log('MATCHED ID:', line.split('\t').slice(0, 15));
    }
  }
});
