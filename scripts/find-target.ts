import fs from 'fs';
import readline from 'readline';

const target = 'fc01223f-7e23-49c2-b103-c377d6962181';
const stream = fs.createReadStream('data/database_20260917103253.dump', { encoding: 'latin1' });
const rl = readline.createInterface({ input: stream });

rl.on('line', (line) => {
  if (line.includes(target)) {
    console.log(line.slice(0, 300));
  }
});
