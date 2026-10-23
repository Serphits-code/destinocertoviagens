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

console.log('1. Carregando tabelas do dump...');
const conta = dumpTable('conta');
const contaCol = {};
conta.columns.forEach((c, i) => contaCol[c] = i);
const contaMap = new Map();
conta.rows.forEach(r => {
  contaMap.set(r[contaCol['conta_id']], r[contaCol['descricao']]);
});
console.log('Contas bancárias cadastradas:');
for (const [cId, nome] of contaMap.entries()) {
  console.log(`  Conta ID: ${cId} -> ${nome}`);
}

const pessoa = dumpTable('pessoa');
const pCol = {};
pessoa.columns.forEach((c, i) => pCol[c] = i);
const pMap = new Map();
pessoa.rows.forEach(r => {
  pMap.set(r[pCol['pessoa_id']], r[pCol['nome']]);
});

const fp = dumpTable('forma_pagamento');
const fpCol = {};
fp.columns.forEach((c, i) => fpCol[c] = i);
const fpMap = new Map();
fp.rows.forEach(r => {
  fpMap.set(r[fpCol['forma_pagamento_id']], r[fpCol['nome']]);
});

const v = dumpTable('vendas');
const vCol = {};
v.columns.forEach((c, i) => vCol[c] = i);
const vendaMap = new Map();
v.rows.forEach(r => vendaMap.set(r[vCol['id']], r));

const vp = dumpTable('vendas_produtos');
const vpCol = {};
vp.columns.forEach((c, i) => vpCol[c] = i);
const targetVp = vp.rows.filter(r => r[vpCol['produto_id']] === targetProdId);
const activeVendaIds = new Set();
targetVp.forEach(r => {
  const vId = r[vpCol['vendas_id']];
  const venda = vendaMap.get(vId);
  if (venda && venda[vCol['situacao']] !== 'C') {
    activeVendaIds.add(vId);
  }
});

console.log(`Vendas ativas: ${activeVendaIds.size}`);

const prod = dumpTable('produtos');
const prodCol = {};
prod.columns.forEach((c, i) => prodCol[c] = i);
const prodMap = new Map();
prod.rows.forEach(r => prodMap.set(r[prodCol['id']], r[prodCol['nome']]));

// 2. EXTRAS VENDIDOS
console.log('\n--- ITENS VENDIDOS POR VENDA (PACOTE E EXTRAS) ---');
const allItems = vp.rows.filter(r => activeVendaIds.has(r[vpCol['vendas_id']]));
allItems.forEach(item => {
  const vId = item[vpCol['vendas_id']];
  const venda = vendaMap.get(vId);
  const pId = item[vpCol['produto_id']];
  const pNome = prodMap.get(pId) || item[vpCol['descricao']] || 'Item sem nome';
  const isBase = pId === targetProdId;
  const vt = parseFloat(item[vpCol['valor_total']] || '0');
  const qtd = item[vpCol['quantidade']];
  const desc = item[vpCol['descricao']] || '';
  console.log(`Venda ${venda[vCol['numero']]} | ${isBase ? '[BASE]' : '[EXTRA]'} Produto: ${pNome} | Qtd: ${qtd} | Valor: R$ ${vt.toFixed(2)} | Detalhe: ${desc}`);
});

// 3. FINANCEIRO DE ENTRADA (RECEBIMENTOS)
console.log('\n--- ENTRADAS: CONTAS A RECEBER E CONTAS BANCÁRIAS DE ENTRADA ---');
const fin = dumpTable('financeiro');
const finCol = {};
fin.columns.forEach((c, i) => finCol[c] = i);

const cm = dumpTable('conta_movimento');
const cmCol = {};
cm.columns.forEach((c, i) => cmCol[c] = i);

// Mapa de conta_movimento por financeiro_id
const cmByFin = new Map();
cm.rows.forEach(m => {
  const fId = m[cmCol['financeiro_id']];
  if (!cmByFin.has(fId)) cmByFin.set(fId, []);
  cmByFin.get(fId).push(m);
});

let sumBrutoRec = 0;
let sumLiqRec = 0;
let sumTaxasRec = 0;

const entradasPorConta = {};

fin.rows.forEach(f => {
  const vId = f[finCol['venda_id']];
  const canc = f[finCol['cancelado']] === '1' || f[finCol['cancelado']] === 't';
  if (activeVendaIds.has(vId) && !canc && f[finCol['movimento']] === 'C') {
    const val = parseFloat(f[finCol['valor']] || '0');
    const valF = parseFloat(f[finCol['valor_final']] || '0') || val;
    const taxa = val - valF;
    const fpNome = fpMap.get(f[finCol['forma_pagamento_id']]) || 'Outros';
    const cId = f[finCol['conta_id']];
    let contaNome = contaMap.get(cId);

    // Se tiver conta_movimento, pega a conta exata do extrato
    const movs = cmByFin.get(f[finCol['financeiro_id']]) || [];
    if (movs.length > 0 && movs[0][cmCol['conta_id']]) {
      contaNome = contaMap.get(movs[0][cmCol['conta_id']]) || contaNome;
    }

    contaNome = contaNome || 'Conta a Definir / Carteira';

    if (!entradasPorConta[contaNome]) {
      entradasPorConta[contaNome] = { bruto: 0, liquido: 0, taxa: 0, count: 0 };
    }
    entradasPorConta[contaNome].bruto += val;
    entradasPorConta[contaNome].liquido += valF;
    entradasPorConta[contaNome].taxa += taxa;
    entradasPorConta[contaNome].count++;

    sumBrutoRec += val;
    sumLiqRec += valF;
    sumTaxasRec += taxa;
  }
});

console.log('Entradas por Conta Bancária / Destino:');
for (const [cNome, d] of Object.entries(entradasPorConta)) {
  console.log(`  Conta: ${cNome.padEnd(30)} | Lançamentos: ${d.count.toString().padStart(3)} | Bruto: R$ ${d.bruto.toFixed(2).padStart(10)} | Líquido: R$ ${d.liquido.toFixed(2).padStart(10)} | Taxas: R$ ${d.taxa.toFixed(2).padStart(8)}`);
}

// 4. SAÍDAS (CUSTOS) E CONTAS BANCÁRIAS DE SAÍDA
console.log('\n--- SAÍDAS: CONTAS A PAGAR E CONTAS DE ORIGEM DO PAGAMENTO ---');
const saidasPorConta = {};
let sumCustoReal = 0;

fin.rows.forEach(f => {
  const opId = f[finCol['operacao_propria_id']];
  const canc = f[finCol['cancelado']] === '1' || f[finCol['cancelado']] === 't';
  if (opId === targetProdId && !canc && f[finCol['movimento']] === 'D') {
    const val = parseFloat(f[finCol['valor']] || '0');
    const valF = parseFloat(f[finCol['valor_final']] || '0') || val;
    const isLiq = f[finCol['liquidacao']] && f[finCol['liquidacao']] !== '\\N';
    const movs = cmByFin.get(f[finCol['financeiro_id']]) || [];
    
    let contaOrigem = 'Pendente de Pagamento';
    if (movs.length > 0 && movs[0][cmCol['conta_id']]) {
      contaOrigem = contaMap.get(movs[0][cmCol['conta_id']]) || 'Conta não mapeada';
    } else if (f[finCol['conta_id']]) {
      contaOrigem = contaMap.get(f[finCol['conta_id']]) || contaOrigem;
    }

    const forn = pMap.get(f[finCol['pessoa_id']]) || 'Sem Fornecedor';
    const desc = f[finCol['descricao']];
    const dataLiq = f[finCol['liquidacao']];
    const dataVenc = f[finCol['vencimento']];

    console.log(`Saída: ${forn.padEnd(30)} | R$ ${valF.toFixed(2).padStart(9)} | Conta: ${contaOrigem.padEnd(25)} | Liq: ${dataLiq || 'NÃO'} | Venc: ${dataVenc} | Desc: ${desc}`);
  }
});
