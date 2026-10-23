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

const targetProdId = 'bcea8b27-a7e2-4d13-8b89-3e6df0c5d251'; // PACOTE SÃO PAULO/CAMPOS/APARECIDA 03/27

const vp = dumpTable('vendas_produtos');
const vpCol = {};
vp.columns.forEach((c, i) => vpCol[c] = i);
const targetVp = vp.rows.filter(r => r[vpCol['produto_id']] === targetProdId);

const v = dumpTable('vendas');
const vCol = {};
v.columns.forEach((c, i) => vCol[c] = i);
const vendaMap = new Map();
v.rows.forEach(r => vendaMap.set(r[vCol['id']], r));

const activeVendaIds = new Set();
targetVp.forEach(r => {
  const vId = r[vpCol['vendas_id']];
  const venda = vendaMap.get(vId);
  if (venda && venda[vCol['situacao']] !== 'C') {
    activeVendaIds.add(vId);
  }
});

const fin = dumpTable('financeiro');
const finCol = {};
fin.columns.forEach((c, i) => finCol[c] = i);

const matchedFinIds = new Set();
fin.rows.forEach(f => {
  if (activeVendaIds.has(f[finCol['venda_id']])) {
    matchedFinIds.add(f[finCol['financeiro_id']]);
  }
});

console.log(`Financeiro vinculado às vendas ativas: ${matchedFinIds.size}`);

// Check conta_movimento
const cm = dumpTable('conta_movimento');
const cmCol = {};
cm.columns.forEach((c, i) => cmCol[c] = i);
console.log('conta_movimento cols:', cm.columns);

let sumLiquidadoCM = 0;
let countCM = 0;
cm.rows.forEach(m => {
  const fId = m[cmCol['financeiro_id']];
  if (matchedFinIds.has(fId)) {
    countCM++;
    const val = parseFloat(m[cmCol['valor']] || '0');
    sumLiquidadoCM += val;
  }
});

console.log(`Movimentações de conta_movimento liquidadas: ${countCM}`);
console.log(`Soma já efetivamente recebida no caixa/banco até o momento: R$ ${sumLiquidadoCM.toFixed(2)}`);
