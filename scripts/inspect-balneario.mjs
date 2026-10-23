import { execSync } from 'child_process';

const pgRestore = 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe';
const dumpPath = 'c:/geo/data/database_20261016143511.dump';

function dumpTable(table) {
  const raw = execSync(`"${pgRestore}" -f - -a -t ${table} "${dumpPath}"`, {
    maxBuffer: 100 * 1024 * 1024,
    encoding: 'utf-8',
  });
  const lines = raw.split('\n');
  const copyLine = lines.find((l) => l.startsWith(`COPY destinocertoroteiros.${table} `)) || '';
  const colMatch = copyLine.match(/\((.*)\)/);
  const columns = colMatch ? colMatch[1].split(', ').map((c) => c.trim()) : [];
  
  const rows = [];
  let inData = false;
  for (const line of lines) {
    if (line.startsWith(`COPY destinocertoroteiros.${table} `)) {
      inData = true;
      continue;
    }
    if (inData) {
      if (line.startsWith('\\.')) break;
      if (line.trim() && !line.startsWith('--')) {
        rows.push(line.split('\t'));
      }
    }
  }
  return { columns, rows };
}

const targetProdId = '7cabac0a-2901-4a3a-a05f-13119f66724a'; // PACOTE BALNEÁRIO E BLUMENAU OUTUBRO-2026

const vp = dumpTable('vendas_produtos');
const vpCol = {};
vp.columns.forEach((c, i) => vpCol[c] = i);
const targetVp = vp.rows.filter(r => r[vpCol['produto_id']] === targetProdId);

const v = dumpTable('vendas');
const vCol = {};
v.columns.forEach((c, i) => vCol[c] = i);
const vendaMap = new Map();
v.rows.forEach(r => vendaMap.set(r[vCol['id']], r));

const vpp = dumpTable('vendas_produtos_passageiros');
const vppCol = {};
vpp.columns.forEach((c, i) => vppCol[c] = i);

const pessoa = dumpTable('pessoa');
const pCol = {};
pessoa.columns.forEach((c, i) => pCol[c] = i);
const pMap = new Map();
pessoa.rows.forEach(r => {
  pMap.set(r[pCol['pessoa_id']], {
    nome: r[pCol['nome']],
    cpf: r[pCol['cpf']] || r[pCol['cnpj']] || '-',
    rg: r[pCol['rg']] || '-',
    nascimento: r[pCol['data_nascimento']] || '-',
    celular: r[pCol['telefone_celular']] || r[pCol['telefone']] || '-',
  });
});

console.log('=== LISTA COMPLETA DOS PASSAGEIROS DO PACOTE ===');

const passengers = [];

targetVp.forEach(r => {
  const vId = r[vpCol['vendas_id']];
  const venda = vendaMap.get(vId);
  if (!venda || venda[vCol['situacao']] === 'C') return;

  const numVenda = venda[vCol['numero']];
  const dataVenda = venda[vCol['data_venda']];
  const paganteInfo = pMap.get(venda[vCol['pagante_id']]) || { nome: 'Sem Nome' };
  const vpId = r[vpCol['vendas_produtos_id']];
  const passRows = vpp.rows.filter(pp => pp[vppCol['vendas_produtos_id']] === vpId);

  passRows.forEach(pp => {
    const pId = pp[vppCol['pessoa_id']];
    const info = pMap.get(pId) || { nome: 'Desconhecido', cpf: '-', rg: '-', nascimento: '-', celular: '-' };
    passengers.push({
      venda: numVenda,
      dataVenda,
      pagante: paganteInfo.nome,
      nome: info.nome,
      cpf: info.cpf,
      rg: info.rg,
      nascimento: info.nascimento,
      celular: info.celular,
      acomodacao: r[vpCol['tipo_acomodacao']] || r[vpCol['categoria_quarto']] || '-',
    });
  });
});

// Ordenar por nome do passageiro
passengers.sort((a, b) => a.nome.localeCompare(b.nome));

console.log(`Total de passageiros listados: ${passengers.length}`);
passengers.forEach((p, idx) => {
  console.log(`${(idx + 1).toString().padStart(2)}. ${p.nome.padEnd(35)} | CPF: ${p.cpf.padEnd(14)} | Nasc: ${p.nascimento.padEnd(10)} | Venda: ${p.venda.padEnd(5)} | Pagante: ${p.pagante.slice(0, 25)}`);
});
