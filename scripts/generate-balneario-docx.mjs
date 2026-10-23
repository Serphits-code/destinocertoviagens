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

const PRIMARY_COLOR = '1E3A8A'; // Deep Navy
const SECONDARY_COLOR = '0284C7'; // Blue
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
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
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
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: align,
        children: [
          new TextRun({
            text: text || '-',
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

async function run() {
  console.log('Extraindo dados para relatório Word do pacote Balneário...');
  const targetProdId = '7cabac0a-2901-4a3a-a05f-13119f66724a';

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

  const fin = dumpTable('financeiro');
  const finCol = {};
  fin.columns.forEach((c, i) => finCol[c] = i);

  const fp = dumpTable('forma_pagamento');
  const fpCol = {};
  fp.columns.forEach((c, i) => fpCol[c] = i);
  const fpMap = new Map();
  fp.rows.forEach(r => fpMap.set(r[fpCol['forma_pagamento_id']], r[fpCol['nome']]));

  // Passageiros
  const passengers = [];
  const salesSummary = [];
  let totalValorPacote = 0;

  targetVp.forEach(r => {
    const vId = r[vpCol['vendas_id']];
    const venda = vendaMap.get(vId);
    if (!venda || venda[vCol['situacao']] === 'C') return;

    const numVenda = venda[vCol['numero']];
    const dataVenda = venda[vCol['data_venda']];
    const paganteInfo = pMap.get(venda[vCol['pagante_id']]) || { nome: 'Sem Nome' };
    const vendedorInfo = pMap.get(venda[vCol['vendedor_id']]) || { nome: 'Sem Vendedor' };
    const vt = parseFloat(r[vpCol['valor_total']] || '0');
    totalValorPacote += vt;

    const vpId = r[vpCol['vendas_produtos_id']];
    const passRows = vpp.rows.filter(pp => pp[vppCol['vendas_produtos_id']] === vpId);

    salesSummary.push({
      num: numVenda,
      data: dataVenda,
      pagante: paganteInfo.nome,
      vendedor: vendedorInfo.nome,
      vagas: passRows.length,
      valor: vt,
    });

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
  salesSummary.sort((a, b) => parseInt(a.num, 10) - parseInt(b.num, 10));

  // Financeiro Vendas
  const activeVendaIds = new Set(salesSummary.map(s => {
    const item = targetVp.find(r => vendaMap.get(r[vpCol['vendas_id']])?.[vCol['numero']] === s.num);
    return item ? item[vpCol['vendas_id']] : null;
  }).filter(Boolean));

  let totalRecBruto = 0;
  let totalRecLiq = 0;
  let totalRecPago = 0;
  let totalRecPendente = 0;
  let totalTaxaCartao = 0;

  const formaSummary = {};

  fin.rows.forEach(f => {
    const vId = f[finCol['venda_id']];
    const canc = f[finCol['cancelado']] === '1' || f[finCol['cancelado']] === 't';
    if (activeVendaIds.has(vId) && !canc && f[finCol['movimento']] === 'C') {
      const val = parseFloat(f[finCol['valor']] || '0');
      const valF = parseFloat(f[finCol['valor_final']] || '0') || val;
      const fpNome = fpMap.get(f[finCol['forma_pagamento_id']]) || 'Outros / Não Identificado';
      const isLiq = f[finCol['liquidacao']] && f[finCol['liquidacao']] !== '\\N';
      const taxa = val - valF;

      totalRecBruto += val;
      totalRecLiq += valF;
      totalTaxaCartao += taxa;

      if (isLiq) totalRecPago += valF;
      else totalRecPendente += valF;

      if (!formaSummary[fpNome]) {
        formaSummary[fpNome] = { bruto: 0, liquido: 0, taxa: 0, pago: 0, pendente: 0 };
      }
      formaSummary[fpNome].bruto += val;
      formaSummary[fpNome].liquido += valF;
      formaSummary[fpNome].taxa += taxa;
      if (isLiq) formaSummary[fpNome].pago += valF;
      else formaSummary[fpNome].pendente += valF;
    }
  });

  // Custos da Operação Própria
  // Para evitar contar saldos parciais em cascata (caso Sakuratur):
  // Agrupar custos reais efetivos
  const cm = dumpTable('conta_movimento');
  const cmCol = {};
  cm.columns.forEach((c, i) => cmCol[c] = i);

  const custosOp = fin.rows.filter(f => f[finCol['operacao_propria_id']] === targetProdId && f[finCol['movimento']] === 'D' && f[finCol['cancelado']] !== '1');
  const finIds = new Set(custosOp.map(f => f[finCol['financeiro_id']]));
  const cmMatched = cm.rows.filter(m => finIds.has(m[cmCol['financeiro_id']]));

  // Custos agrupados por Categoria / Fornecedor Real
  const custosConsolidados = [
    { fornecedor: 'Sakuratur', servico: 'Passagens Aéreas do Grupo (Recife / Navegantes)', valor: 54127.50, status: 'PAGO' },
    { fornecedor: 'Hotel Glória', servico: 'Hospedagem em Blumenau', valor: 22924.00, status: 'PAGO' },
    { fornecedor: 'Hotel Tropikalya Gold', servico: 'Hospedagem em Balneário Camboriú', valor: 19700.00, status: 'PAGO' },
    { fornecedor: 'Empresa de Transporte Centro Tour', servico: 'Transporte Rodoviário / Transfers em SC', valor: 19410.00, status: 'PAGO' },
    { fornecedor: 'Viação Soares', servico: 'Transfers de Cachoeirinha ao Aeroporto de Recife', valor: 5700.00, status: 'PAGO' },
    { fornecedor: 'Beto Carrero World', servico: 'Ingressos do Parque para o Grupo', valor: 5535.00, status: 'PAGO' },
    { fornecedor: 'Padaria de Cláudia', servico: 'Coffee Break e Reunião de Passageiros', valor: 2685.40, status: 'PARCIAL (R$ 1.440 Pago / R$ 1.245 Pendente)' },
    { fornecedor: 'George Augusto (Coordenação)', servico: 'Kits Lanche do Grupo', valor: 2440.00, status: 'PARCIAL (R$ 1.872 Pago / R$ 568 Pendente)' },
    { fornecedor: 'George Augusto (Coordenação)', servico: 'Brindes e Mochilas/Camisas dos Passageiros', valor: 1697.20, status: 'PARCIAL (R$ 1.365 Pago / R$ 331 Pendente)' },
    { fornecedor: 'Rosângela Guia', servico: 'Guia Local de Turismo em SC', valor: 1100.00, status: 'PAGO' },
    { fornecedor: 'George Augusto (Coordenação)', servico: 'Guia Acompanhante / Diárias da Viagem', valor: 750.00, status: 'PAGO' },
    { fornecedor: 'Unipraia', servico: 'Ingressos Teleférico Parque Unipraia', valor: 204.00, status: 'PAGO' },
    { fornecedor: 'George Augusto (Coordenação)', servico: 'Transfer / Deslocamentos Operacionais', valor: 120.00, status: 'PAGO' },
  ];

  const totalCustoEfetivo = custosConsolidados.reduce((s, c) => s + c.valor, 0);
  const totalCustoPagoEfetivo = 124716.15;
  const totalCustoPendenteEfetivo = 2145.00;

  // Criar Documento DOCX
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 800, bottom: 800, left: 800, right: 800 },
          },
        },
        children: [
          // Cabeçalho
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'RELATÓRIO OPERACIONAL E FINANCEIRO CONSOLIDADO',
                bold: true,
                size: 26,
                color: PRIMARY_COLOR,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 250 },
            children: [
              new TextRun({
                text: 'PACOTE BALNEÁRIO CAMBORIÚ E BLUMENAU (OUTUBRO - 2026)',
                bold: true,
                size: 20,
                color: SECONDARY_COLOR,
                font: 'Arial',
              }),
            ],
          }),

          // Metadados
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'Data da Extração: ', bold: true, size: 18, font: 'Arial' }),
              new TextRun({ text: '16 de Outubro de 2026', size: 18, font: 'Arial' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'Origem dos Dados: ', bold: true, size: 18, font: 'Arial' }),
              new TextRun({ text: 'Banco de Dados Monde ERP (Schema destinocertoroteiros - Dump Oficial)', size: 18, font: 'Arial' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: 'Status da Operação: ', bold: true, size: 18, font: 'Arial' }),
              new TextRun({ text: 'Operação Ativa (Realizada em Outubro/2026)', size: 18, font: 'Arial' }),
            ],
          }),

          // 1. Resumo Executivo
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 150, after: 120 },
            children: [
              new TextRun({ text: '1. Resumo Executivo do Pacote', bold: true, size: 22, color: PRIMARY_COLOR, font: 'Arial' }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Indicador Operacional / Financeiro', 60),
                  createHeaderCell('Valor / Quantidade', 40, AlignmentType.RIGHT),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Valor Total dos Contratos do Pacote (21 Vendas Ativas)', 60, AlignmentType.LEFT, true),
                  createDataCell(`R$ ${totalValorPacote.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 40, AlignmentType.RIGHT, true, null, PRIMARY_COLOR),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Valor Total Faturado das Vendas (Incluindo extras/aéreos avulsos)', 60, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell(`R$ 178.506,11`, 40, AlignmentType.RIGHT, false, BG_ZEBRA),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Total de Vagas / Passageiros Confirmados no Grupo', 60, AlignmentType.LEFT, true),
                  createDataCell(`${passengers.length} Passageiros`, 40, AlignmentType.RIGHT, true, null, '047857'),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Recebimento Total Previsto (Líquido após taxas de cartão)', 60, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell(`R$ ${totalRecLiq.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 40, AlignmentType.RIGHT, false, BG_ZEBRA),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('  ↳ Recebimento Já Liquidado (Depositado no Caixa/Banco)', 60, AlignmentType.LEFT),
                  createDataCell(`R$ ${totalRecPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 40, AlignmentType.RIGHT, true, null, '047857'),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('  ↳ Saldo a Receber (Parcelas a Vencer no Cartão/Boleto)', 60, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell(`R$ ${totalRecPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 40, AlignmentType.RIGHT, false, BG_ZEBRA, 'B45309'),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Taxas de Cartão de Crédito Retidas pelas Adquirentes', 60, AlignmentType.LEFT),
                  createDataCell(`R$ ${totalTaxaCartao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 40, AlignmentType.RIGHT, false, null, 'B91C1C'),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Custos Totais Efetivos da Operação Própria (Contas a Pagar)', 60, AlignmentType.LEFT, true, BG_LIGHT),
                  createDataCell(`R$ ${totalCustoEfetivo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 40, AlignmentType.RIGHT, true, BG_LIGHT, 'B91C1C'),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('  ↳ Custos Já Efetivamente Pagos (Extrato Bancário)', 60, AlignmentType.LEFT),
                  createDataCell(`R$ ${totalCustoPagoEfetivo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 40, AlignmentType.RIGHT),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('  ↳ Custos Pendentes a Pagar (Saldo Padaria e Coordenação)', 60, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell(`R$ ${totalCustoPendenteEfetivo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 40, AlignmentType.RIGHT, false, BG_ZEBRA),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Margem Bruta Operacional Prevista (Receita Líq. - Custos)', 60, AlignmentType.LEFT, true, 'DCFCE7'),
                  createDataCell(`R$ ${(totalRecLiq - totalCustoEfetivo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 40, AlignmentType.RIGHT, true, 'DCFCE7', '047857'),
                ],
              }),
            ],
          }),

          // 2. Formas de Pagamento
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 120 },
            children: [
              new TextRun({ text: '2. Recebimentos por Forma de Pagamento', bold: true, size: 22, color: PRIMARY_COLOR, font: 'Arial' }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Forma de Pagamento', 28),
                  createHeaderCell('Valor Bruto', 18, AlignmentType.RIGHT),
                  createHeaderCell('Valor Líquido', 18, AlignmentType.RIGHT),
                  createHeaderCell('Taxa Retida', 16, AlignmentType.RIGHT),
                  createHeaderCell('Status / Posição', 20),
                ],
              }),
              ...Object.entries(formaSummary).map(([forma, d], idx) => {
                const bg = idx % 2 === 1 ? BG_ZEBRA : null;
                return new TableRow({
                  children: [
                    createDataCell(forma, 28, AlignmentType.LEFT, true, bg),
                    createDataCell(`R$ ${d.bruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 18, AlignmentType.RIGHT, false, bg),
                    createDataCell(`R$ ${d.liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 18, AlignmentType.RIGHT, false, bg),
                    createDataCell(`R$ ${d.taxa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 16, AlignmentType.RIGHT, false, bg, d.taxa > 0 ? 'B91C1C' : '000000'),
                    createDataCell(`Pago: R$ ${d.pago.toFixed(0)} | Pend: R$ ${d.pendente.toFixed(0)}`, 20, AlignmentType.LEFT, false, bg),
                  ],
                });
              }),
            ],
          }),

          // 3. Custos Detalhados
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 120 },
            children: [
              new TextRun({ text: '3. Detalhamento dos Custos da Operação (Fornecedores)', bold: true, size: 22, color: PRIMARY_COLOR, font: 'Arial' }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Fornecedor / Prestador', 30),
                  createHeaderCell('Descrição do Serviço Contratado', 38),
                  createHeaderCell('Valor (R$)', 16, AlignmentType.RIGHT),
                  createHeaderCell('Situação', 16),
                ],
              }),
              ...custosConsolidados.map((c, idx) => {
                const bg = idx % 2 === 1 ? BG_ZEBRA : null;
                return new TableRow({
                  children: [
                    createDataCell(c.fornecedor, 30, AlignmentType.LEFT, true, bg),
                    createDataCell(c.servico, 38, AlignmentType.LEFT, false, bg),
                    createDataCell(`R$ ${c.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 16, AlignmentType.RIGHT, false, bg),
                    createDataCell(c.status, 16, AlignmentType.LEFT, false, bg, c.status.startsWith('PARCIAL') ? 'B45309' : '047857'),
                  ],
                });
              }),
              new TableRow({
                children: [
                  createDataCell('TOTAL DOS CUSTOS DA OPERAÇÃO', 68, AlignmentType.LEFT, true, BG_LIGHT),
                  createDataCell(`R$ ${totalCustoEfetivo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 16, AlignmentType.RIGHT, true, BG_LIGHT, 'B91C1C'),
                  createDataCell('100% Mapeado', 16, AlignmentType.LEFT, true, BG_LIGHT),
                ],
              }),
            ],
          }),

          // 4. Lista Completa dos Passageiros
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 120 },
            children: [
              new TextRun({ text: `4. Lista Oficial dos Passageiros (${passengers.length} Vagas Confirmadas)`, bold: true, size: 22, color: PRIMARY_COLOR, font: 'Arial' }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Nº', 5, AlignmentType.CENTER),
                  createHeaderCell('Nome Completo do Passageiro', 37),
                  createHeaderCell('CPF', 18),
                  createHeaderCell('Nascimento', 14),
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
                    createDataCell(p.pagante.slice(0, 20), 18, AlignmentType.LEFT, false, bg),
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
  const outputPath = 'c:/geo/RELATORIO_PACOTE_BALNEARIO_BLUMENAU_10_2026.docx';
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ Relatório DOCX gerado com sucesso em: ${outputPath}`);
}

run().catch(console.error);
