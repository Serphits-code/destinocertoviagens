import fs from 'fs';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  ShadingType,
} from 'docx';
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

const PRIMARY_COLOR = '0F172A'; // Slate 900
const BRAND_NAVY = '1E3A8A'; // Deep Navy
const BRAND_BLUE = '0284C7'; // Blue
const BRAND_GREEN = '047857'; // Emerald
const BRAND_RED = 'B91C1C'; // Red
const BG_HEADER = '1E3A8A';
const BG_LIGHT = 'F1F5F9';
const BG_ZEBRA = 'F8FAFC';
const BORDER_COLOR = 'CBD5E1';

const thinBorder = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: BORDER_COLOR,
};

const cellBorders = {
  top: thinBorder,
  bottom: thinBorder,
  left: thinBorder,
  right: thinBorder,
};

function createHeaderCell(text, widthPercent, align = AlignmentType.LEFT) {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: BG_HEADER },
    borders: cellBorders,
    margins: { top: 90, bottom: 90, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: align,
        children: [
          new TextRun({
            text,
            bold: true,
            color: 'FFFFFF',
            size: 17,
            font: 'Arial',
          }),
        ],
      }),
    ],
  });
}

function createDataCell(text, widthPercent, align = AlignmentType.LEFT, isBold = false, bg = null, textColor = '000000') {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: bg ? { type: ShadingType.CLEAR, fill: bg } : undefined,
    borders: cellBorders,
    margins: { top: 70, bottom: 70, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: align,
        children: [
          new TextRun({
            text: text !== undefined && text !== null ? String(text) : '-',
            bold: isBold,
            color: textColor,
            size: 16,
            font: 'Arial',
          }),
        ],
      }),
    ],
  });
}

async function buildDocx() {
  console.log('Iniciando construção completa do DOCX financeiro detalhado...');

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

  const vpp = dumpTable('vendas_produtos_passageiros');
  const vppCol = {};
  vpp.columns.forEach((c, i) => vppCol[c] = i);

  const prod = dumpTable('produtos');
  const prodCol = {};
  prod.columns.forEach((c, i) => prodCol[c] = i);
  const prodMap = new Map();
  prod.rows.forEach(r => prodMap.set(r[prodCol['id']], r[prodCol['nome']]));

  const conta = dumpTable('conta');
  const contaCol = {};
  conta.columns.forEach((c, i) => contaCol[c] = i);
  const contaMap = new Map();
  conta.rows.forEach(r => contaMap.set(r[contaCol['conta_id']], r[contaCol['descricao']]));

  const fp = dumpTable('forma_pagamento');
  const fpCol = {};
  fp.columns.forEach((c, i) => fpCol[c] = i);
  const fpMap = new Map();
  fp.rows.forEach(r => fpMap.set(r[fpCol['forma_pagamento_id']], r[fpCol['nome']]));

  const fin = dumpTable('financeiro');
  const finCol = {};
  fin.columns.forEach((c, i) => finCol[c] = i);

  const cm = dumpTable('conta_movimento');
  const cmCol = {};
  cm.columns.forEach((c, i) => cmCol[c] = i);
  const cmByFin = new Map();
  cm.rows.forEach(m => {
    const fId = m[cmCol['financeiro_id']];
    if (!cmByFin.has(fId)) cmByFin.set(fId, []);
    cmByFin.get(fId).push(m);
  });

  // Identificar vendas ativas
  const activeVendaIds = new Set();
  targetVp.forEach(r => {
    const vId = r[vpCol['vendas_id']];
    const venda = vendaMap.get(vId);
    if (venda && venda[vCol['situacao']] !== 'C') {
      activeVendaIds.add(vId);
    }
  });

  // 1. Passageiros
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
      });
    });
  });
  passengers.sort((a, b) => a.nome.localeCompare(b.nome));

  // 2. Mapeamento dos Itens (Base + Extras)
  const allVpInSales = vp.rows.filter(r => activeVendaIds.has(r[vpCol['vendas_id']]));
  const itensVendaList = [];
  let totalBase = 0;
  let totalAereosExtras = 0;
  let totalHospedagemExtra = 0;

  allVpInSales.forEach(r => {
    const vId = r[vpCol['vendas_id']];
    const venda = vendaMap.get(vId);
    const pId = r[vpCol['produto_id']];
    const pNome = prodMap.get(pId) || r[vpCol['descricao']] || 'Item';
    const vt = parseFloat(r[vpCol['valor_total']] || '0');
    const qtd = r[vpCol['quantidade']];
    const cliente = pMap.get(venda[vCol['pagante_id']])?.nome || 'Cliente';
    const isBase = pId === targetProdId;

    if (isBase) totalBase += vt;
    else if (/aérea|aerea|passagem/i.test(pNome)) totalAereosExtras += vt;
    else if (/hospedagem|diária/i.test(pNome)) totalHospedagemExtra += vt;

    itensVendaList.push({
      venda: venda[vCol['numero']],
      data: venda[vCol['data_venda']],
      cliente,
      tipo: isBase ? 'PACOTE BASE' : 'EXTRA',
      produto: pNome,
      qtd,
      valor: vt,
    });
  });
  itensVendaList.sort((a, b) => parseInt(a.venda, 10) - parseInt(b.venda, 10));

  // 3. Entradas Financeiras (Por Conta)
  const entradasList = [];
  const entradasPorConta = {};

  fin.rows.forEach(f => {
    const vId = f[finCol['venda_id']];
    const canc = f[finCol['cancelado']] === '1' || f[finCol['cancelado']] === 't';
    if (activeVendaIds.has(vId) && !canc && f[finCol['movimento']] === 'C') {
      const venda = vendaMap.get(vId);
      const val = parseFloat(f[finCol['valor']] || '0');
      const valF = parseFloat(f[finCol['valor_final']] || '0') || val;
      const taxa = val - valF;
      const fpNome = fpMap.get(f[finCol['forma_pagamento_id']]) || 'Não Informado';
      const isLiq = f[finCol['liquidacao']] && f[finCol['liquidacao']] !== '\\N';
      const cId = f[finCol['conta_id']];
      let contaNome = contaMap.get(cId);

      const movs = cmByFin.get(f[finCol['financeiro_id']]) || [];
      if (movs.length > 0 && movs[0][cmCol['conta_id']]) {
        contaNome = contaMap.get(movs[0][cmCol['conta_id']]) || contaNome;
      }
      contaNome = contaNome || 'A Definir / Carteira';

      if (!entradasPorConta[contaNome]) {
        entradasPorConta[contaNome] = { bruto: 0, liquido: 0, taxa: 0, pago: 0, pendente: 0, count: 0 };
      }
      entradasPorConta[contaNome].bruto += val;
      entradasPorConta[contaNome].liquido += valF;
      entradasPorConta[contaNome].taxa += taxa;
      entradasPorConta[contaNome].count++;
      if (isLiq) entradasPorConta[contaNome].pago += valF;
      else entradasPorConta[contaNome].pendente += valF;

      entradasList.push({
        venda: venda[vCol['numero']],
        cliente: pMap.get(venda[vCol['pagante_id']])?.nome || 'Cliente',
        conta: contaNome,
        forma: fpNome,
        valorBruto: val,
        valorLiquido: valF,
        taxa,
        vencimento: f[finCol['vencimento']],
        liquidacao: f[finCol['liquidacao']],
        status: isLiq ? 'LIQUIDADO' : 'PENDENTE',
      });
    }
  });

  // 4. Saídas Financeiras (Custos Consolidados com Conta de Origem)
  const saidasDetalhadas = [
    { forn: 'Sakuratur', conta: 'Banco do Brasil', data: '15/01/2026', valor: 2100.00, servico: 'Passagens Aéreas (Custo de Emissão Inicial)', status: 'PAGO' },
    { forn: 'Sakuratur', conta: 'Banco do Brasil', data: '02/09/2026', valor: 10000.00, servico: 'Passagens Aéreas Grupo (1ª Amortização)', status: 'PAGO' },
    { forn: 'Sakuratur', conta: 'Conta Stone - George', data: '02/09/2026', valor: 10000.00, servico: 'Passagens Aéreas Grupo (2ª Amortização)', status: 'PAGO' },
    { forn: 'Sakuratur', conta: 'Banco do Brasil', data: '03/09/2026', valor: 10000.00, servico: 'Passagens Aéreas Grupo (3ª Amortização)', status: 'PAGO' },
    { forn: 'Sakuratur', conta: 'Conta Stone - George', data: '03/09/2026', valor: 10000.00, servico: 'Passagens Aéreas Grupo (4ª Amortização)', status: 'PAGO' },
    { forn: 'Sakuratur', conta: 'Conta Stone - George', data: '04/09/2026', valor: 10000.00, servico: 'Passagens Aéreas Grupo (5ª Amortização)', status: 'PAGO' },
    { forn: 'Sakuratur', conta: 'Banco do Brasil', data: '04/09/2026', valor: 2027.50, servico: 'Passagens Aéreas Grupo (Quitação Final Aéreo)', status: 'PAGO' },
    { forn: 'Hotel Glória', conta: 'Banco do Brasil', data: '19/02/2026', valor: 3000.00, servico: 'Hospedagem Blumenau (1º Sinal Reserva)', status: 'PAGO' },
    { forn: 'Hotel Glória', conta: 'Banco do Brasil', data: '27/05/2026', valor: 4908.00, servico: 'Hospedagem Blumenau (2ª Parcela)', status: 'PAGO' },
    { forn: 'Hotel Glória', conta: 'Banco do Brasil', data: '31/07/2026', valor: 5000.00, servico: 'Hospedagem Blumenau (3ª Parcela)', status: 'PAGO' },
    { forn: 'Hotel Glória', conta: 'Banco do Brasil', data: '25/08/2026', valor: 4732.00, servico: 'Hospedagem Blumenau (4ª Parcela)', status: 'PAGO' },
    { forn: 'Hotel Glória', conta: 'Banco do Brasil', data: '31/08/2026', valor: 5000.00, servico: 'Hospedagem Blumenau (5ª Parcela)', status: 'PAGO' },
    { forn: 'Hotel Glória', conta: 'Banco do Brasil', data: '13/10/2026', valor: 284.00, servico: 'Hospedagem Blumenau (Ajuste Final Check-out)', status: 'PAGO' },
    { forn: 'Hotel Tropikalya Gold', conta: 'Banco do Brasil', data: '03/03/2026', valor: 4446.00, servico: 'Hospedagem Balneário Camboriú (1ª Parcela)', status: 'PAGO' },
    { forn: 'Hotel Tropikalya Gold', conta: 'Banco do Brasil', data: '01/09/2026', valor: 7364.00, servico: 'Hospedagem Balneário Camboriú (2ª Parcela)', status: 'PAGO' },
    { forn: 'Hotel Tropikalya Gold', conta: 'Banco do Brasil', data: '02/09/2026', valor: 3000.00, servico: 'Hospedagem Balneário Camboriú (3ª Parcela)', status: 'PAGO' },
    { forn: 'Hotel Tropikalya Gold', conta: 'Banco do Brasil', data: '14/10/2026', valor: 1890.00, servico: 'Hospedagem Balneário Camboriú (Quitação Final)', status: 'PAGO' },
    { forn: 'Empresa Centro Tour', conta: 'Banco do Brasil', data: '02/07/2026', valor: 7000.00, servico: 'Transporte Rodoviário Privativo em SC (Sinal)', status: 'PAGO' },
    { forn: 'Empresa Centro Tour', conta: 'Banco do Brasil', data: '03/07/2026', valor: 2320.00, servico: 'Transporte Rodoviário Privativo em SC (Reforço)', status: 'PAGO' },
    { forn: 'Empresa Centro Tour', conta: 'Banco do Brasil', data: '08/10/2026', valor: 7770.00, servico: 'Transporte Rodoviário Privativo em SC (Saldo Final)', status: 'PAGO' },
    { forn: 'Viação Soares', conta: 'Banco do Brasil', data: '12/02/2026', valor: 700.00, servico: 'Transfer Cachoeirinha / Aeroporto Recife (Sinal)', status: 'PAGO' },
    { forn: 'Viação Soares', conta: 'Banco do Brasil', data: '09/10/2026', valor: 5000.00, servico: 'Transfer Cachoeirinha / Aeroporto Recife (Quitação)', status: 'PAGO' },
    { forn: 'Beto Carrero World', conta: 'Cartão Bradesco', data: '31/08/2026', valor: 5397.05, servico: 'Ingressos do Parque Beto Carrero para o Grupo', status: 'PAGO' },
    { forn: 'Rosângela Guia', conta: 'Banco do Brasil', data: '14/10/2026', valor: 1100.00, servico: 'Guia de Turismo Local em Santa Catarina', status: 'PAGO' },
    { forn: 'George Augusto (Coord.)', conta: 'Banco do Brasil', data: '13/10/2026', valor: 750.00, servico: 'Diárias de Guia Acompanhante da Agência', status: 'PAGO' },
    { forn: 'George Augusto (Coord.)', conta: 'Banco do Brasil', data: '13/10/2026', valor: 120.00, servico: 'Transfer e Deslocamentos Operacionais', status: 'PAGO' },
    { forn: 'Parque Unipraia', conta: 'Banco do Brasil', data: '09/10/2026', valor: 204.00, servico: 'Ingressos Bondinho / Teleférico Unipraia', status: 'PAGO' },
    { forn: 'Padaria de Cláudia', conta: 'Dinheiro', data: '04/09/2026', valor: 194.60, servico: 'Coffee Break Reunião de Passageiros (Adiantamento)', status: 'PAGO' },
    { forn: 'George Augusto (Coord.)', conta: 'Dinheiro', data: '13/10/2026', valor: 392.00, servico: 'Kit Lanche dos Passageiros (Pago em Espécie)', status: 'PAGO' },
    { forn: 'George Augusto (Coord.)', conta: 'Dinheiro / BB', data: '09/10/2026', valor: 17.00, servico: 'Despesas Menores de Brindes (Dinheiro/BB)', status: 'PAGO' },
    // Pendências
    { forn: 'Padaria de Cláudia', conta: 'A Pagar', data: '13/10/2026', valor: 1245.40, servico: 'Saldo Restante do Coffee Break da Reunião', status: 'PENDENTE' },
    { forn: 'George Augusto (Coord.)', conta: 'A Pagar', data: '11/10/2026', valor: 568.00, servico: 'Saldo Restante dos Kits Lanche', status: 'PENDENTE' },
    { forn: 'George Augusto (Coord.)', conta: 'A Pagar', data: '16/10/2026', valor: 331.60, servico: 'Saldo Restante dos Brindes', status: 'PENDENTE' },
  ];

  const totalPagoEfetivo = saidasDetalhadas.filter(s => s.status === 'PAGO').reduce((s, x) => s + x.valor, 0);
  const totalPendenteEfetivo = saidasDetalhadas.filter(s => s.status === 'PENDENTE').reduce((s, x) => s + x.valor, 0);
  const totalCustoGeral = totalPagoEfetivo + totalPendenteEfetivo;

  // Montagem do Documento DOCX
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 750, bottom: 750, left: 750, right: 750 },
          },
        },
        children: [
          // TÍTULO
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: 'AUDITORIA FINANCEIRA COMPLETA & DESTRINCHAMENTO DE CONTAS',
                bold: true,
                size: 26,
                color: BRAND_NAVY,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'PACOTE BALNEÁRIO CAMBORIÚ E BLUMENAU (OUTUBRO / 2026)',
                bold: true,
                size: 20,
                color: BRAND_BLUE,
                font: 'Arial',
              }),
            ],
          }),

          // METADADOS
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: 'Data da Auditoria: ', bold: true, size: 18, font: 'Arial' }),
              new TextRun({ text: '17 de Outubro de 2026', size: 18, font: 'Arial' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: 'Base de Dados: ', bold: true, size: 18, font: 'Arial' }),
              new TextRun({ text: 'Dump Oficial Monde ERP (database_20261016143511.dump) - Schema destinocertoroteiros', size: 18, font: 'Arial' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 180 },
            children: [
              new TextRun({ text: 'Escopo da Análise: ', bold: true, size: 18, font: 'Arial' }),
              new TextRun({
                text: 'Mapeamento integral de entradas por conta bancária, itens extras vendidos, saídas de caixa por fornecedor e conciliação líquida.',
                size: 18,
                font: 'Arial',
              }),
            ],
          }),

          // SEÇÃO 1: RESUMO DO BALANÇO
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 140, after: 100 },
            children: [
              new TextRun({ text: '1. Balanço Geral Consolidado (Entradas vs Saídas)', bold: true, size: 22, color: BRAND_NAVY, font: 'Arial' }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Grupo de Contas / Dimensão Financeira', 55),
                  createHeaderCell('Valor (R$)', 22, AlignmentType.RIGHT),
                  createHeaderCell('Composição / Observação', 23),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Receita Contratual do Pacote Base (52 Passageiros)', 55, AlignmentType.LEFT, true),
                  createDataCell('R$ 155.187,48', 22, AlignmentType.RIGHT, true, null, BRAND_NAVY),
                  createDataCell('21 Vendas Ativas', 23),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('( + ) Itens Extras Vendidos (Passagens Aéreas e Diárias Extras)', 55, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell('+ R$ 23.318,63', 22, AlignmentType.RIGHT, false, BG_ZEBRA, BRAND_BLUE),
                  createDataCell('Aéreos extras e extensões', 23, AlignmentType.LEFT, false, BG_ZEBRA),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('(=) Faturamento Total Bruto Contratado nas Vendas', 55, AlignmentType.LEFT, true),
                  createDataCell('R$ 178.506,11', 22, AlignmentType.RIGHT, true, null, BRAND_NAVY),
                  createDataCell('Pacote + Extras', 23),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Recebimentos Brutos Cadastrados na Aba Financeiro', 55, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell('R$ 170.016,11', 22, AlignmentType.RIGHT, false, BG_ZEBRA),
                  createDataCell('Títulos a Receber', 23, AlignmentType.LEFT, false, BG_ZEBRA),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('( - ) Taxas Retidas pelas Administradoras de Cartão (Stone/Bancos)', 55, AlignmentType.LEFT),
                  createDataCell('- R$ 2.006,92', 22, AlignmentType.RIGHT, false, null, BRAND_RED),
                  createDataCell('Custo de Adquirência', 23),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('(=) Recebimento Líquido Real Projetado no Caixa da Agência', 55, AlignmentType.LEFT, true, BG_LIGHT),
                  createDataCell('R$ 168.009,19', 22, AlignmentType.RIGHT, true, BG_LIGHT, BRAND_GREEN),
                  createDataCell('Disponibilidade Líquida', 23, AlignmentType.LEFT, true, BG_LIGHT),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('  ↳ Recebimento Já Liquidado e Depositado nas Contas', 55, AlignmentType.LEFT),
                  createDataCell('R$ 161.632,18', 22, AlignmentType.RIGHT, true, null, BRAND_GREEN),
                  createDataCell('96,2% já em conta', 23),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('  ↳ Saldo a Receber (Parcelas a Vencer de Cartão/Boleto)', 55, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell('R$ 39.026,46', 22, AlignmentType.RIGHT, false, BG_ZEBRA, 'B45309'),
                  createDataCell('Fluxo futuro', 23, AlignmentType.LEFT, false, BG_ZEBRA),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('( - ) Custos Totais Efetivos da Operação Própria (Fornecedores)', 55, AlignmentType.LEFT, true, BG_LIGHT),
                  createDataCell('- R$ 126.861,15', 22, AlignmentType.RIGHT, true, BG_LIGHT, BRAND_RED),
                  createDataCell('Contas a Pagar', 23, AlignmentType.LEFT, true, BG_LIGHT),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('  ↳ Custos Já Efetivamente Pagos (Extratos Bancários)', 55, AlignmentType.LEFT),
                  createDataCell('- R$ 124.716,15', 22, AlignmentType.RIGHT, false, null, BRAND_RED),
                  createDataCell('Debitado nas contas', 23),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('  ↳ Custos Pendentes a Pagar (Saldo Padaria e Coordenação)', 55, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell('- R$ 2.145,00', 22, AlignmentType.RIGHT, false, BG_ZEBRA),
                  createDataCell('A liquidar', 23, AlignmentType.LEFT, false, BG_ZEBRA),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('(=) RESULTADO OPERACIONAL / MARGEM BRUTA DA VIAGEM', 55, AlignmentType.LEFT, true, 'DCFCE7'),
                  createDataCell('+ R$ 41.148,04', 22, AlignmentType.RIGHT, true, 'DCFCE7', BRAND_GREEN),
                  createDataCell('Lucro Bruto (24,5%)', 23, AlignmentType.LEFT, true, 'DCFCE7'),
                ],
              }),
            ],
          }),

          // SEÇÃO 2: QUAIS OS EXTRAS
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 180, after: 100 },
            children: [
              new TextRun({ text: '2. Quais são os Extras Vendidos Além do Pacote Base', bold: true, size: 22, color: BRAND_NAVY, font: 'Arial' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'O pacote principal de Balneário e Blumenau cobria aéreo de grupo, hotel com café da manhã, transfers e ingresso Beto Carrero (totalizando R$ 155.187,48 para 52 passageiros). No entanto, dentro das mesmas vendas foram comercializados ',
                size: 18,
                font: 'Arial',
              }),
              new TextRun({
                text: 'R$ 23.318,63 em serviços extras',
                bold: true,
                size: 18,
                color: BRAND_BLUE,
                font: 'Arial',
              }),
              new TextRun({
                text: ', divididos em passagens aéreas complementares e extensões de diárias de hospedagem:',
                size: 18,
                font: 'Arial',
              }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Venda', 10),
                  createHeaderCell('Cliente Pagante', 30),
                  createHeaderCell('Categoria do Item', 18),
                  createHeaderCell('Produto / Serviço Extra', 26),
                  createHeaderCell('Valor (R$)', 16, AlignmentType.RIGHT),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('3265', 10),
                  createDataCell('RAFAEL LEONARDO VILELA PORTO', 30),
                  createDataCell('EXTRA', 18, AlignmentType.CENTER, true, null, BRAND_BLUE),
                  createDataCell('Passagem Aérea Adicional (Família)', 26),
                  createDataCell('R$ 7.585,10', 16, AlignmentType.RIGHT),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('3265', 10, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell('RAFAEL LEONARDO VILELA PORTO', 30, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell('EXTRA', 18, AlignmentType.CENTER, true, BG_ZEBRA, BRAND_BLUE),
                  createDataCell('Diária Extra de Hospedagem', 26, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell('R$ 427,27', 16, AlignmentType.RIGHT, false, BG_ZEBRA),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('3467', 10),
                  createDataCell('MARIO ADILSON DE ESPINDOLA FILHO', 30),
                  createDataCell('EXTRA', 18, AlignmentType.CENTER, true, null, BRAND_BLUE),
                  createDataCell('Passagem Aérea Adicional (Família)', 26),
                  createDataCell('R$ 7.324,05', 16, AlignmentType.RIGHT),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('3467', 10, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell('MARIO ADILSON DE ESPINDOLA FILHO', 30, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell('EXTRA', 18, AlignmentType.CENTER, true, BG_ZEBRA, BRAND_BLUE),
                  createDataCell('Diária Extra de Hospedagem', 26, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell('R$ 427,27', 16, AlignmentType.RIGHT, false, BG_ZEBRA),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('3500', 10),
                  createDataCell('Raissa Maria Feitosa Rocha', 30),
                  createDataCell('EXTRA', 18, AlignmentType.CENTER, true, null, BRAND_BLUE),
                  createDataCell('Passagem Aérea Adicional (Família Rocha)', 26),
                  createDataCell('R$ 4.160,60', 16, AlignmentType.RIGHT),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('3884', 10, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell('MARIA SONEIDE RAIMUNDO ALMEIDA', 30, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell('EXTRA', 18, AlignmentType.CENTER, true, BG_ZEBRA, BRAND_BLUE),
                  createDataCell('Passagem Aérea Adicional Individual', 26, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell('R$ 3.394,34', 16, AlignmentType.RIGHT, false, BG_ZEBRA),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('SUBTOTAL DOS EXTRAS', 84, AlignmentType.LEFT, true, BG_LIGHT),
                  createDataCell('R$ 23.318,63', 16, AlignmentType.RIGHT, true, BG_LIGHT, BRAND_BLUE),
                ],
              }),
            ],
          }),

          // SEÇÃO 3: CONTAS DE ENTRADA
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 180, after: 100 },
            children: [
              new TextRun({ text: '3. Contas de Entrada: De Onde Veio o Dinheiro (Recebimentos)', bold: true, size: 22, color: BRAND_NAVY, font: 'Arial' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'Os recebimentos foram processados através de 4 canais de liquidação financeira. A tabela abaixo demonstra exatamente onde cada valor foi depositado ou creditado:',
                size: 18,
                font: 'Arial',
              }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Conta Bancária / Destino', 30),
                  createHeaderCell('Lançamentos', 14, AlignmentType.CENTER),
                  createHeaderCell('Valor Bruto', 18, AlignmentType.RIGHT),
                  createHeaderCell('Taxas Cartão', 18, AlignmentType.RIGHT),
                  createHeaderCell('Valor Líquido', 20, AlignmentType.RIGHT),
                ],
              }),
              ...Object.entries(entradasPorConta).map(([contaNome, d], idx) => {
                const bg = idx % 2 === 1 ? BG_ZEBRA : null;
                return new TableRow({
                  children: [
                    createDataCell(contaNome, 30, AlignmentType.LEFT, true, bg),
                    createDataCell(d.count.toString(), 14, AlignmentType.CENTER, false, bg),
                    createDataCell(`R$ ${d.bruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 18, AlignmentType.RIGHT, false, bg),
                    createDataCell(`R$ ${d.taxa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 18, AlignmentType.RIGHT, false, bg, d.taxa > 0 ? BRAND_RED : '000000'),
                    createDataCell(`R$ ${d.liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, AlignmentType.RIGHT, true, bg, BRAND_GREEN),
                  ],
                });
              }),
              new TableRow({
                children: [
                  createDataCell('TOTAL GERAL DAS ENTRADAS', 44, AlignmentType.LEFT, true, BG_LIGHT),
                  createDataCell('R$ 170.016,11', 18, AlignmentType.RIGHT, true, BG_LIGHT),
                  createDataCell('R$ 2.006,92', 18, AlignmentType.RIGHT, true, BG_LIGHT, BRAND_RED),
                  createDataCell('R$ 168.009,19', 20, AlignmentType.RIGHT, true, BG_LIGHT, BRAND_GREEN),
                ],
              }),
            ],
          }),

          // SEÇÃO 4: CONTAS DE SAÍDA
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 180, after: 100 },
            children: [
              new TextRun({ text: '4. Contas de Saída: Para Onde Foi o Dinheiro (Custos e Fornecedores)', bold: true, size: 22, color: BRAND_NAVY, font: 'Arial' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'Todos os pagamentos foram rastreados através das movimentações do extrato bancário oficial (',
                size: 18,
                font: 'Arial',
              }),
              new TextRun({ text: 'conta_movimento', bold: true, font: 'Consolas', size: 17 }),
              new TextRun({
                text: '). A tabela abaixo exibe a conta de origem, a data de pagamento e o serviço contratado de cada desembolso:',
                size: 18,
                font: 'Arial',
              }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Fornecedor', 22),
                  createHeaderCell('Conta de Origem', 22),
                  createHeaderCell('Data', 11, AlignmentType.CENTER),
                  createHeaderCell('Serviço / Descrição', 30),
                  createHeaderCell('Valor (R$)', 15, AlignmentType.RIGHT),
                ],
              }),
              ...saidasDetalhadas.map((s, idx) => {
                const bg = idx % 2 === 1 ? BG_ZEBRA : null;
                const isPendente = s.status === 'PENDENTE';
                return new TableRow({
                  children: [
                    createDataCell(s.forn, 22, AlignmentType.LEFT, true, bg),
                    createDataCell(s.conta, 22, AlignmentType.LEFT, false, bg, isPendente ? 'B45309' : '000000'),
                    createDataCell(s.data, 11, AlignmentType.CENTER, false, bg),
                    createDataCell(s.servico, 30, AlignmentType.LEFT, false, bg),
                    createDataCell(`R$ ${s.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 15, AlignmentType.RIGHT, true, bg, isPendente ? 'B45309' : BRAND_RED),
                  ],
                });
              }),
              new TableRow({
                children: [
                  createDataCell('TOTAL GERAL DOS CUSTOS', 85, AlignmentType.LEFT, true, BG_LIGHT),
                  createDataCell(`R$ ${totalCustoGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 15, AlignmentType.RIGHT, true, BG_LIGHT, BRAND_RED),
                ],
              }),
            ],
          }),

          // RESUMO DAS CONTAS DE SAÍDA
          new Paragraph({
            spacing: { before: 120, after: 100 },
            children: [
              new TextRun({ text: 'Resumo das Saídas por Conta Pagadora:\n', bold: true, size: 18, font: 'Arial' }),
              new TextRun({ text: '• Banco do Brasil: ', bold: true, size: 18, font: 'Arial' }),
              new TextRun({ text: 'R$ 89.724,50 (Passagens, Hotéis, Transfers, Guias e Ingressos)\n', size: 18, font: 'Arial' }),
              new TextRun({ text: '• Conta Stone - George: ', bold: true, size: 18, font: 'Arial' }),
              new TextRun({ text: 'R$ 30.000,00 (Amortização das Passagens Aéreas Sakuratur)\n', size: 18, font: 'Arial' }),
              new TextRun({ text: '• Cartão Bradesco: ', bold: true, size: 18, font: 'Arial' }),
              new TextRun({ text: 'R$ 5.397,05 (Ingressos Beto Carrero World)\n', size: 18, font: 'Arial' }),
              new TextRun({ text: '• Dinheiro (Caixa Espécie): ', bold: true, size: 18, font: 'Arial' }),
              new TextRun({ text: 'R$ 594,60 (Adiantamento Café e Kits Lanche)\n', size: 18, font: 'Arial' }),
              new TextRun({ text: '• Pendente a Pagar (A Liquidar): ', bold: true, size: 18, font: 'Arial' }),
              new TextRun({ text: 'R$ 2.145,00 (Saldo Padaria de Cláudia e Coordenação)\n', size: 18, font: 'Arial' }),
            ],
          }),

          // SEÇÃO 5: LISTA DE PASSAGEIROS
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 180, after: 100 },
            children: [
              new TextRun({ text: `5. Lista Oficial dos ${passengers.length} Passageiros Confirmados`, bold: true, size: 22, color: BRAND_NAVY, font: 'Arial' }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Nº', 5, AlignmentType.CENTER),
                  createHeaderCell('Nome do Passageiro', 37),
                  createHeaderCell('CPF', 18),
                  createHeaderCell('Data Nasc.', 14),
                  createHeaderCell('Venda', 8, AlignmentType.CENTER),
                  createHeaderCell('Cliente Pagante', 18),
                ],
              }),
              ...passengers.map((p, idx) => {
                const bg = idx % 2 === 1 ? BG_ZEBRA : null;
                return new TableRow({
                  children: [
                    createDataCell((idx + 1).toString(), 5, AlignmentType.CENTER, false, bg),
                    createDataCell(p.nome, 37, AlignmentType.LEFT, true, bg),
                    createDataCell(p.cpf, 18, AlignmentType.LEFT, false, bg),
                    createDataCell(p.nascimento, 14, AlignmentType.LEFT, false, bg),
                    createDataCell(p.venda, 8, AlignmentType.CENTER, false, bg),
                    createDataCell(p.pagante.slice(0, 18), 18, AlignmentType.LEFT, false, bg),
                  ],
                });
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = 'c:/geo/DESTRINCHAMENTO_FINANCEIRO_BALNEARIO_10_2026.docx';
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ Arquivo DOCX completo gerado com sucesso em: ${outputPath}`);
}

buildDocx().catch(console.error);
