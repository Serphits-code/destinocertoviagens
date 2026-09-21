import fs from 'fs';
import readline from 'readline';

const stream = fs.createReadStream('data/database_20260917103253.dump', { encoding: 'latin1' });
const rl = readline.createInterface({ input: stream });

let inVendas = false;

rl.on('line', (line) => {
  if (line.includes('COPY') && line.includes('vendas (')) {
    inVendas = true;
    console.log('Found COPY vendas!');
    return;
  }
  if (inVendas) {
    if (line.startsWith('\\.')) {
      inVendas = false;
      return;
    }
    if (line.includes('\t3572\t') || line.includes('\t3581\t') || line.includes('\t3569\t')) {
      console.log('LINE:', line.slice(0, 300));
    }
  }
});
