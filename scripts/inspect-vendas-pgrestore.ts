import { execSync } from 'child_process';

const pgRestore = 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe';
const dumpPath = 'c:/geo/data/database_20260917103253.dump';

console.log('Extracting vendas from dump...');
const raw = execSync(`"${pgRestore}" -f - -a -t vendas "${dumpPath}"`, {
  maxBuffer: 50 * 1024 * 1024,
  encoding: 'utf-8',
});

const lines = raw.split('\n');
const copyLine = lines.find((l) => l.startsWith('COPY destinocertoroteiros.vendas (')) || '';
const colMatch = copyLine.match(/\((.*)\)/);
const columns = colMatch ? colMatch[1].split(', ').map((c) => c.trim()) : [];
console.log('Columns:', columns);

for (const line of lines) {
  if (line.includes('\t3572\t') || line.includes('\t3581\t') || line.includes('\t3569\t')) {
    const parts = line.split('\t');
    const obj: Record<string, string> = {};
    columns.forEach((c, i) => {
      obj[c] = parts[i];
    });
    console.log(`\n=== VENDA ${obj.numero} ===`);
    console.log(`id: ${obj.id}`);
    console.log(`data_venda: ${obj.data_venda}`);
    console.log(`situacao: ${obj.situacao}`);
    console.log(`valor_final: ${obj.valor_final}`);
    console.log(`total_produtos: ${obj.total_produtos}`);
    console.log(`observacoes: ${obj.observacoes}`);
    console.log(`obs_financeiro: ${obj.obs_financeiro}`);
  }
}
