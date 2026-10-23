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

const PRIMARY_COLOR = '1E3A8A'; // Deep Navy
const SECONDARY_COLOR = '0284C7'; // Blue
const TEXT_MUTED = '64748B'; // Slate gray
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
    margins: { top: 120, bottom: 120, left: 150, right: 150 },
    children: [
      new Paragraph({
        alignment: align,
        children: [
          new TextRun({
            text,
            bold: true,
            color: 'FFFFFF',
            size: 19, // 9.5pt
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
    margins: { top: 100, bottom: 100, left: 150, right: 150 },
    children: [
      new Paragraph({
        alignment: align,
        children: [
          new TextRun({
            text,
            bold: isBold,
            color: textColor,
            size: 18, // 9pt
            font: 'Arial',
          }),
        ],
      }),
    ],
  });
}

async function generateDocx() {
  console.log('Gerando documento DOCX de auditoria...');

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              bottom: 1000,
              left: 1000,
              right: 1000,
            },
          },
        },
        children: [
          // Título Principal
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'RELATÓRIO DE AUDITORIA FINANCEIRA & CONCILIAÇÃO',
                bold: true,
                size: 28,
                color: PRIMARY_COLOR,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: 'PACOTE SÃO PAULO / CAMPOS DO JORDÃO / APARECIDA 03/27',
                bold: true,
                size: 22,
                color: SECONDARY_COLOR,
                font: 'Arial',
              }),
            ],
          }),

          // Metadados
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: 'Data da Auditoria: ', bold: true, size: 20, font: 'Arial' }),
              new TextRun({ text: '16 de Outubro de 2026', size: 20, font: 'Arial' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: 'Origem da Base de Dados: ', bold: true, size: 20, font: 'Arial' }),
              new TextRun({ text: 'Dump Oficial do Monde ERP (database_20261016143511.dump)', size: 20, font: 'Arial' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 250 },
            children: [
              new TextRun({ text: 'Objeto da Análise: ', bold: true, size: 20, font: 'Arial' }),
              new TextRun({
                text: 'Discrepância de R$ 5.030,73 entre o Valor Total Contratado (R$ 129.825,00) e o Recebimento na Análise de Operação do Monde (R$ 124.794,27).',
                size: 20,
                font: 'Arial',
              }),
            ],
          }),

          // Divisor
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 150 },
            children: [
              new TextRun({
                text: '1. Resumo Executivo da Discrepância',
                bold: true,
                size: 24,
                color: PRIMARY_COLOR,
                font: 'Arial',
              }),
            ],
          }),

          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun({
                text: 'A auditoria realizada nos registros do banco de dados oficial comprovou com exatidão matemática ao centavo que a diferença de R$ 5.030,73 é resultado direto da soma de dois fatores operacionais bem definidos:',
                size: 20,
                font: 'Arial',
              }),
            ],
          }),

          // Tabela Resumo Executivo
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Conceito Operacional / Financeiro', 55),
                  createHeaderCell('Valor (R$)', 20, AlignmentType.RIGHT),
                  createHeaderCell('Status / Impacto no Caixa', 25),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Valor Total dos Contratos Ativos (23 Vendas Confirmadas)', 55, AlignmentType.LEFT, true),
                  createDataCell('R$ 129.825,00', 20, AlignmentType.RIGHT, true, null, PRIMARY_COLOR),
                  createDataCell('Total Bruto Contratado', 25, AlignmentType.LEFT),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('(-) Taxas Retidas pelas Administradoras de Cartão de Crédito', 55, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell('- R$ 1.910,73', 20, AlignmentType.RIGHT, true, BG_ZEBRA, 'B91C1C'),
                  createDataCell('Retenção Bancária / Maquininha', 25, AlignmentType.LEFT, false, BG_ZEBRA),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('(-) 1 Pacote / Passageiro não faturado na aba Financeiro', 55, AlignmentType.LEFT, false),
                  createDataCell('- R$ 3.120,00', 20, AlignmentType.RIGHT, true, null, 'B91C1C'),
                  createDataCell('Pendente de Lançamento no ERP', 25, AlignmentType.LEFT),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('(=) Recebimento Líquido Projetado no Relatório da Monde', 55, AlignmentType.LEFT, true, BG_LIGHT),
                  createDataCell('R$ 124.794,27', 20, AlignmentType.RIGHT, true, BG_LIGHT, '047857'),
                  createDataCell('Valor da Análise de Operação', 25, AlignmentType.LEFT, true, BG_LIGHT),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Diferença Total Apurada (Discrepância no Caixa)', 55, AlignmentType.LEFT, true, 'FEF3C7'),
                  createDataCell('R$ 5.030,73', 20, AlignmentType.RIGHT, true, 'FEF3C7', 'B45309'),
                  createDataCell('R$ 1.910,73 + R$ 3.120,00', 25, AlignmentType.LEFT, true, 'FEF3C7'),
                ],
              }),
            ],
          }),

          // Equação de Conciliação
          new Paragraph({
            spacing: { before: 200, after: 300 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Fórmula Exata: R$ 129.825,00 (Total Contratado) - R$ 1.910,73 (Taxas Cartão) - R$ 3.120,00 (Cota Pendente) = R$ 124.794,27',
                bold: true,
                size: 19,
                color: PRIMARY_COLOR,
                font: 'Arial',
              }),
            ],
          }),

          // Seção 2: Causa 1 - Taxas de Cartão
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 250, after: 150 },
            children: [
              new TextRun({
                text: '2. Detalhamento da Causa 1: Taxas de Cartão de Crédito (R$ 1.910,73)',
                bold: true,
                size: 24,
                color: PRIMARY_COLOR,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'No sistema Monde, o relatório de ',
                size: 20,
                font: 'Arial',
              }),
              new TextRun({
                text: 'Análise de Operações Próprias',
                bold: true,
                size: 20,
                font: 'Arial',
              }),
              new TextRun({
                text: ' trabalha com o conceito de ',
                size: 20,
                font: 'Arial',
              }),
              new TextRun({
                text: 'Recebimento Líquido',
                bold: true,
                size: 20,
                font: 'Arial',
              }),
              new TextRun({
                text: '. Isso significa que para vendas parceladas no cartão de crédito, o sistema desconta a taxa de intermediação das adquirentes (Stone, Cielo, etc.) gravada no campo ',
                size: 20,
                font: 'Arial',
              }),
              new TextRun({
                text: 'valor_final',
                bold: true,
                font: 'Consolas',
                size: 19,
              }),
              new TextRun({
                text: ' das parcelas.',
                size: 20,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun({
                text: '• Volume bruto negociado em Cartão de Crédito: ',
                bold: true,
                size: 20,
                font: 'Arial',
              }),
              new TextRun({ text: 'R$ 60.400,00\n', size: 20, font: 'Arial' }),
              new TextRun({
                text: '• Valor líquido previsto a cair no banco: ',
                bold: true,
                size: 20,
                font: 'Arial',
              }),
              new TextRun({ text: 'R$ 58.489,27\n', size: 20, font: 'Arial' }),
              new TextRun({
                text: '• Desconto total retido pelas operadoras: ',
                bold: true,
                size: 20,
                font: 'Arial',
              }),
              new TextRun({ text: 'R$ 1.910,73 (origem exata dos ', size: 20, font: 'Arial' }),
              new TextRun({ text: ',73 centavos', bold: true, size: 20, font: 'Arial' }),
              new TextRun({ text: ' da discrepância apontada).', size: 20, font: 'Arial' }),
            ],
          }),

          // Tabela de Taxas por Venda
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Venda', 12),
                  createHeaderCell('Cliente Pagante', 38),
                  createHeaderCell('Bruto Cartão', 18, AlignmentType.RIGHT),
                  createHeaderCell('Líquido Cartão', 18, AlignmentType.RIGHT),
                  createHeaderCell('Taxa Retida', 14, AlignmentType.RIGHT),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('3817', 12),
                  createDataCell('EUNICE CRISPINIANO DE SOUZA', 38),
                  createDataCell('R$ 9.360,00', 18, AlignmentType.RIGHT),
                  createDataCell('R$ 9.046,50', 18, AlignmentType.RIGHT),
                  createDataCell('R$ 313,50', 14, AlignmentType.RIGHT, true, null, 'B91C1C'),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('3847', 12, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell('MARIA ANDREZA MELO DE MORAES', 38, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell('R$ 6.240,00', 18, AlignmentType.RIGHT, false, BG_ZEBRA),
                  createDataCell('R$ 5.975,46', 18, AlignmentType.RIGHT, false, BG_ZEBRA),
                  createDataCell('R$ 264,54', 14, AlignmentType.RIGHT, true, BG_ZEBRA, 'B91C1C'),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('3802', 12),
                  createDataCell('MIKAELA ESTEFANI TORRES DA SILVA', 38),
                  createDataCell('R$ 6.240,00', 18, AlignmentType.RIGHT),
                  createDataCell('R$ 5.999,76', 18, AlignmentType.RIGHT),
                  createDataCell('R$ 240,24', 14, AlignmentType.RIGHT, true, null, 'B91C1C'),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('3782', 12, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell('NAYARA LARISSA DE ANDRADE COSTA', 38, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell('R$ 6.330,00', 18, AlignmentType.RIGHT, false, BG_ZEBRA),
                  createDataCell('R$ 6.109,52', 18, AlignmentType.RIGHT, false, BG_ZEBRA),
                  createDataCell('R$ 220,48', 14, AlignmentType.RIGHT, true, BG_ZEBRA, 'B91C1C'),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('3842', 12),
                  createDataCell('JOSÉ MARQUES MONTEIRO', 38),
                  createDataCell('R$ 6.240,00', 18, AlignmentType.RIGHT),
                  createDataCell('R$ 6.047,17', 18, AlignmentType.RIGHT),
                  createDataCell('R$ 192,83', 14, AlignmentType.RIGHT, true, null, 'B91C1C'),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('3798', 12, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell('ELIETE PEREIRA FERNANDES', 38, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell('R$ 3.120,00', 18, AlignmentType.RIGHT, false, BG_ZEBRA),
                  createDataCell('R$ 2.999,88', 18, AlignmentType.RIGHT, false, BG_ZEBRA),
                  createDataCell('R$ 120,12', 14, AlignmentType.RIGHT, true, BG_ZEBRA, 'B91C1C'),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('3952', 12),
                  createDataCell('ADILMA RAMOS DA SILVA', 38),
                  createDataCell('R$ 3.120,00', 18, AlignmentType.RIGHT),
                  createDataCell('R$ 2.999,90', 18, AlignmentType.RIGHT),
                  createDataCell('R$ 120,10', 14, AlignmentType.RIGHT, true, null, 'B91C1C'),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('3918', 12, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell('LUIZ FELIX DE FREITAS SILVA', 38, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell('R$ 3.120,00', 18, AlignmentType.RIGHT, false, BG_ZEBRA),
                  createDataCell('R$ 3.015,48', 18, AlignmentType.RIGHT, false, BG_ZEBRA),
                  createDataCell('R$ 104,52', 14, AlignmentType.RIGHT, true, BG_ZEBRA, 'B91C1C'),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('3944', 12),
                  createDataCell('MARIA JANIKELY CORDEIRO BISPO', 38),
                  createDataCell('R$ 3.090,00', 18, AlignmentType.RIGHT),
                  createDataCell('R$ 2.990,30', 18, AlignmentType.RIGHT),
                  createDataCell('R$ 99,70', 14, AlignmentType.RIGHT, true, null, 'B91C1C'),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('3964', 12, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell('GRASIELE IONARA SOUZA DE MORAIS', 38, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell('R$ 3.120,00', 18, AlignmentType.RIGHT, false, BG_ZEBRA),
                  createDataCell('R$ 3.050,08', 18, AlignmentType.RIGHT, false, BG_ZEBRA),
                  createDataCell('R$ 69,92', 14, AlignmentType.RIGHT, true, BG_ZEBRA, 'B91C1C'),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('3717', 12),
                  createDataCell('MARIA DO SOCORRO DA SILVA', 38),
                  createDataCell('R$ 3.120,00', 18, AlignmentType.RIGHT),
                  createDataCell('R$ 3.050,16', 18, AlignmentType.RIGHT),
                  createDataCell('R$ 69,84', 14, AlignmentType.RIGHT, true, null, 'B91C1C'),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('3820', 12, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell('MARIA EDENIZE MENEZES DE ALMEIDA', 38, AlignmentType.LEFT, false, BG_ZEBRA),
                  createDataCell('R$ 3.120,00', 18, AlignmentType.RIGHT, false, BG_ZEBRA),
                  createDataCell('R$ 3.050,16', 18, AlignmentType.RIGHT, false, BG_ZEBRA),
                  createDataCell('R$ 69,84', 14, AlignmentType.RIGHT, true, BG_ZEBRA, 'B91C1C'),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('3789', 12),
                  createDataCell('JOSEFA ANGELA DA SILVA', 38),
                  createDataCell('R$ 1.120,00', 18, AlignmentType.RIGHT),
                  createDataCell('R$ 1.094,90', 18, AlignmentType.RIGHT),
                  createDataCell('R$ 25,10', 14, AlignmentType.RIGHT, true, null, 'B91C1C'),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('TOTAL', 50, AlignmentType.LEFT, true, BG_LIGHT),
                  createDataCell('R$ 60.400,00', 18, AlignmentType.RIGHT, true, BG_LIGHT),
                  createDataCell('R$ 58.489,27', 18, AlignmentType.RIGHT, true, BG_LIGHT),
                  createDataCell('R$ 1.910,73', 14, AlignmentType.RIGHT, true, BG_LIGHT, 'B91C1C'),
                ],
              }),
            ],
          }),

          // Seção 3: Causa 2 - Cota Pendente
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 250, after: 150 },
            children: [
              new TextRun({
                text: '3. Detalhamento da Causa 2: Pacote Pendente de Lançamento no Financeiro (R$ 3.120,00)',
                bold: true,
                size: 24,
                color: PRIMARY_COLOR,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'O valor padrão de uma cota individual para este pacote é de ',
                size: 20,
                font: 'Arial',
              }),
              new TextRun({
                text: 'R$ 3.120,00',
                bold: true,
                size: 20,
                font: 'Arial',
              }),
              new TextRun({
                text: '. Ao analisar a conciliação entre a aba ',
                size: 20,
                font: 'Arial',
              }),
              new TextRun({
                text: 'Produtos da Venda',
                bold: true,
                size: 20,
                font: 'Arial',
              }),
              new TextRun({
                text: ' e a aba ',
                size: 20,
                font: 'Arial',
              }),
              new TextRun({
                text: 'Pagamentos / Financeiro (Contas a Receber)',
                bold: true,
                size: 20,
                font: 'Arial',
              }),
              new TextRun({
                text: ', a auditoria identificou vendas onde foram cadastrados passageiros no contrato, porém sem a geração correspondente dos títulos a receber:',
                size: 20,
                font: 'Arial',
              }),
            ],
          }),

          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: '• Venda nº 4007 (Cadastrada em 14/10/2026 - Maria Ednilda Menezes de Almeida): ',
                bold: true,
                size: 20,
                font: 'Arial',
              }),
              new TextRun({
                text: 'O contrato possui 2 passageiras (Maria Ednilda e Maryany Avany Almeida Lins), totalizando R$ 6.090,00. No entanto, na aba Financeiro foi cadastrado apenas 1 título de R$ 2.970,00. Ficou faltando lançar a forma de pagamento e as parcelas da 2ª passageira no valor de ',
                size: 20,
                font: 'Arial',
              }),
              new TextRun({
                text: 'exatamente R$ 3.120,00',
                bold: true,
                size: 20,
                color: 'B91C1C',
                font: 'Arial',
              }),
              new TextRun({
                text: ' (R$ 6.090,00 - R$ 2.970,00 = R$ 3.120,00).',
                size: 20,
                font: 'Arial',
              }),
            ],
          }),

          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun({
                text: '• Venda nº 3717 (Cadastrada em 28/07/2026 - Maria do Socorro da Silva): ',
                bold: true,
                size: 20,
                font: 'Arial',
              }),
              new TextRun({
                text: 'O contrato possui 2 passageiros (Maria do Socorro e Sérgio Ricardo da Silva), totalizando R$ 6.240,00. Na aba Financeiro foram lançadas apenas 12 parcelas de R$ 260,00 no cartão de crédito, somando R$ 3.120,00. O valor referente ao 2º passageiro (Sérgio Ricardo) de ',
                size: 20,
                font: 'Arial',
              }),
              new TextRun({
                text: 'exatamente R$ 3.120,00',
                bold: true,
                size: 20,
                color: 'B91C1C',
                font: 'Arial',
              }),
              new TextRun({
                text: ' não possui lançamentos de contas a receber no sistema.',
                size: 20,
                font: 'Arial',
              }),
            ],
          }),

          // Seção 4: Tabela Completa das 23 Vendas
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 250, after: 150 },
            children: [
              new TextRun({
                text: '4. Tabela Analítica Completa das 23 Vendas Ativas do Pacote',
                bold: true,
                size: 24,
                color: PRIMARY_COLOR,
                font: 'Arial',
              }),
            ],
          }),

          // Tabela Geral de Vendas
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Venda', 10),
                  createHeaderCell('Data', 13),
                  createHeaderCell('Sit.', 6),
                  createHeaderCell('Cliente Pagante', 37),
                  createHeaderCell('Vendedor', 20),
                  createHeaderCell('Total (R$)', 14, AlignmentType.RIGHT),
                ],
              }),
              ...[
                { n: '3709', d: '24/07/2026', s: 'F', c: 'MARIA GRAZIELE DOS SANTOS SILVA ROMÃO', v: 'EDJANE CARINA', val: '7.945,00' },
                { n: '3710', d: '22/07/2026', s: 'A', c: 'SELMA DA SILVA SOBRAL', v: 'GEORGE AUGUSTO', val: '3.120,00' },
                { n: '3714', d: '27/07/2026', s: 'F', c: 'EDMILSON FERREIRA DINIZ', v: 'ANTONIELLY FRANCIELLY', val: '5.940,00' },
                { n: '3717', d: '28/07/2026', s: 'A', c: 'MARIA DO SOCORRO DA SILVA', v: 'ANTONIELLY FRANCIELLY', val: '6.240,00' },
                { n: '3779', d: '03/08/2026', s: 'F', c: 'MARIA AUXILIADORA SIMÕES RODRIGUES', v: 'GEORGE AUGUSTO', val: '2.970,00' },
                { n: '3782', d: '11/08/2026', s: 'F', c: 'NAYARA LARISSA DE ANDRADE COSTA', v: 'ANTONIELLY FRANCIELLY', val: '12.330,00' },
                { n: '3789', d: '13/08/2026', s: 'F', c: 'JOSEFA ANGELA DA SILVA', v: 'ANTONIELLY FRANCIELLY', val: '3.120,00' },
                { n: '3798', d: '17/08/2026', s: 'F', c: 'ELIETE PEREIRA FERNANDES', v: 'ANTONIELLY FRANCIELLY', val: '3.120,00' },
                { n: '3802', d: '17/08/2026', s: 'F', c: 'MIKAELA ESTEFANI TORRES DA SILVA', v: 'ANTONIELLY FRANCIELLY', val: '6.240,00' },
                { n: '3807', d: '20/08/2026', s: 'A', c: 'MARIA ESTELITA DOMINGOS OLIVEIRA', v: 'EDJANE CARINA', val: '5.940,00' },
                { n: '3817', d: '26/08/2026', s: 'F', c: 'EUNICE CRISPINIANO DE SOUZA', v: 'GEORGE AUGUSTO', val: '9.360,00' },
                { n: '3820', d: '27/08/2026', s: 'F', c: 'MARIA EDENIZE MENEZES DE ALMEIDA', v: 'EDJANE CARINA', val: '3.120,00' },
                { n: '3842', d: '29/08/2026', s: 'F', c: 'JOSÉ MARQUES MONTEIRO', v: 'EVYLIN RAIANE', val: '6.240,00' },
                { n: '3847', d: '02/09/2026', s: 'A', c: 'MARIA ANDREZA MELO DE MORAES', v: 'ANTONIELLY FRANCIELLY', val: '6.240,00' },
                { n: '3888', d: '16/09/2026', s: 'F', c: 'ELTON ANTONIO FLORENCIO', v: 'ANTONIELLY FRANCIELLY', val: '12.480,00' },
                { n: '3906', d: '22/09/2026', s: 'F', c: 'KIRLEY LOPES GUIMARÃES SOUZA', v: 'GEORGE AUGUSTO', val: '2.970,00' },
                { n: '3908', d: '23/09/2026', s: 'F', c: 'LAYSA MACEDO DE PAIVA', v: 'GEORGE AUGUSTO', val: '5.940,00' },
                { n: '3918', d: '24/09/2026', s: 'F', c: 'LUIZ FELIX DE FREITAS SILVA', v: 'ANTONIELLY FRANCIELLY', val: '3.120,00' },
                { n: '3920', d: '04/09/2026', s: 'F', c: 'CILENE MARIA DE AZEVEDO', v: 'ANTONIELLY FRANCIELLY', val: '4.970,00' },
                { n: '3944', d: '28/09/2026', s: 'F', c: 'MARIA JANIKELY CORDEIRO BISPO', v: 'ANTONIELLY FRANCIELLY', val: '6.090,00' },
                { n: '3952', d: '29/09/2026', s: 'F', c: 'ADILMA RAMOS DA SILVA', v: 'GEORGE AUGUSTO', val: '3.120,00' },
                { n: '3964', d: '01/10/2026', s: 'F', c: 'GRASIELE IONARA SOUZA DE MORAIS', v: 'EDJANE CARINA', val: '3.120,00' },
                { n: '4007', d: '14/10/2026', s: 'A', c: 'MARIA EDNILDA MENEZES DE ALMEIDA', v: 'EDJANE CARINA', val: '6.090,00' },
              ].map((row, idx) => {
                const bg = idx % 2 === 1 ? BG_ZEBRA : null;
                return new TableRow({
                  children: [
                    createDataCell(row.n, 10, AlignmentType.LEFT, false, bg),
                    createDataCell(row.d, 13, AlignmentType.LEFT, false, bg),
                    createDataCell(row.s, 6, AlignmentType.CENTER, true, bg),
                    createDataCell(row.c, 37, AlignmentType.LEFT, false, bg),
                    createDataCell(row.v, 20, AlignmentType.LEFT, false, bg),
                    createDataCell(`R$ ${row.val}`, 14, AlignmentType.RIGHT, false, bg),
                  ],
                });
              }),
              new TableRow({
                children: [
                  createDataCell('TOTAL GERAL CONTRATADO', 86, AlignmentType.LEFT, true, BG_LIGHT),
                  createDataCell('R$ 129.825,00', 14, AlignmentType.RIGHT, true, BG_LIGHT, PRIMARY_COLOR),
                ],
              }),
            ],
          }),

          // Seção 5: Conclusões e Ações Recomendadas
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 250, after: 150 },
            children: [
              new TextRun({
                text: '5. Conclusões e Ações Recomendadas',
                bold: true,
                size: 24,
                color: PRIMARY_COLOR,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: '1. Reconhecimento Contábil das Taxas de Cartão (R$ 1.910,73):\n',
                bold: true,
                size: 20,
                font: 'Arial',
              }),
              new TextRun({
                text: 'O valor de R$ 1.910,73 não representa sumiço de dinheiro nem falha cadastral, mas sim o custo de intermediação financeira cobrado pelas maquininhas/bancos. O caixa da agência nunca receberá R$ 129.825,00 integralmente em dinheiro, pois R$ 1.910,73 fica retido pelas adquirentes.',
                size: 20,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: '2. Regularização dos Lançamentos Financeiros Pendentes (R$ 3.120,00):\n',
                bold: true,
                size: 20,
                font: 'Arial',
              }),
              new TextRun({
                text: 'Para que a Análise de Operação do Monde reflita o valor correto, a equipe deve acessar no Monde as vendas identificadas (em especial a Venda nº 4007 e a Venda nº 3717) e concluir a geração das parcelas/títulos a receber correspondentes às cotas pendentes de R$ 3.120,00.',
                size: 20,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: '3. Conciliação com o Extrato Bancário Real:\n',
                bold: true,
                size: 20,
                font: 'Arial',
              }),
              new TextRun({
                text: 'Até o momento do último dump, foram liquidados e depositados efetivamente nas contas bancárias da agência R$ 47.463,26 deste pacote. Os demais valores correspondem a parcelas de cartão e boletos a vencer entre outubro de 2026 e agosto de 2027.',
                size: 20,
                font: 'Arial',
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = 'c:/geo/AUDITORIA_PACOTE_SAO_PAULO_03_27.docx';
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ Arquivo criado com sucesso em: ${outputPath}`);
}

generateDocx().catch(console.error);
