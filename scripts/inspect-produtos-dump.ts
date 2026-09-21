import { execSync } from 'child_process';

const pgRestore = 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe';
const dumpPath = 'c:/geo/data/database_20260917103253.dump';

const raw = execSync(`"${pgRestore}" -f - -a -t vendas_produtos "${dumpPath}"`, {
  maxBuffer: 50 * 1024 * 1024,
  encoding: 'utf-8',
});

const lines = raw.split('\n');
const copyLine = lines.find((l) => l.startsWith('COPY destinocertoroteiros.vendas_produtos (')) || '';
const colMatch = copyLine.match(/\((.*)\)/);
const columns = colMatch ? colMatch[1].split(', ').map((c) => c.trim()) : [];

for (const line of lines) {
  // 3572 id: 49cbeb91-48a2-4137-ac8d-b7c02be4c7c8
  // 3569 id: 87a89e91-e968-421a-ac1f-19d1319a4ba7
  if (line.includes('49cbeb91-48a2-4137-ac8d-b7c02be4c7c8') || line.includes('87a89e91-e968-421a-ac1f-19d1319a4ba7')) {
    const parts = line.split('\t');
    const obj: Record<string, string> = {};
    columns.forEach((c, i) => {
      obj[c] = parts[i];
    });
    console.log(`\n=== PRODUTO VENDA ${obj.vendas_id} ===`);
    console.log(`produto_id: ${obj.produto_id}`);
    console.log(`descricao: ${obj.descricao}`);
    console.log(`total_cliente: ${obj.total_cliente}`);
    console.log(`valor_total: ${obj.valor_total}`);
    console.log(`nome_pacote: ${obj.nome_pacote}`);
    console.log(`status: ${obj.status}`);
  }
}
