import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

function findPgRestore(): string {
  const possiblePaths = [
    'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe',
    'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_restore.exe',
    'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_restore.exe',
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return 'pg_restore';
}

const pgRestore = findPgRestore();
const dumpDir = path.join(process.cwd(), 'data');
const dumpFiles = fs.readdirSync(dumpDir).filter((f) => f.startsWith('database_') && f.endsWith('.dump')).sort();
const dumpPath = path.join(dumpDir, dumpFiles[dumpFiles.length - 1]);

function cleanVal(v?: string): string | null {
  if (!v || v === '\\N' || v.trim() === '') return null;
  return v.trim();
}

function parseLines(raw: string, copyPrefix: string): { cols: string[]; colIdx: Record<string, number>; rows: string[][] } {
  const lines = raw.split('\n');
  let inCopy = false;
  let cols: string[] = [];
  const rows: string[][] = [];

  for (const line of lines) {
    if (line.startsWith(copyPrefix)) {
      inCopy = true;
      const match = line.match(/\((.*?)\)/);
      if (match) {
        cols = match[1].split(',').map((c) => c.trim().replace(/^"/, '').replace(/"$/, ''));
      }
      continue;
    }
    if (inCopy) {
      if (line.trim() === '\\.') {
        inCopy = false;
        continue;
      }
      if (line.trim().length > 0) {
        rows.push(line.split('\t'));
      }
    }
  }

  const colIdx: Record<string, number> = {};
  cols.forEach((col, idx) => {
    colIdx[col] = idx;
  });

  return { cols, colIdx, rows };
}

function normalizePaymentMethod(name?: string | null): { key: string; label: string } {
  if (!name) return { key: 'OUTROS', label: 'Outros' };
  const lower = name.toLowerCase();
  if (lower.includes('pix') || lower.includes('depósito') || lower.includes('deposito')) {
    return { key: 'PIX', label: 'PIX / Depósito' };
  }
  if (lower.includes('crédito') || lower.includes('credito') || lower.includes('cartão de crédito') || lower.includes('cartao de credito')) {
    return { key: 'CARTAO_CREDITO', label: 'Cartão de Crédito' };
  }
  if (lower.includes('débito') || lower.includes('debito') || lower.includes('cartão de débito') || lower.includes('cartao de debito')) {
    return { key: 'CARTAO_DEBITO', label: 'Cartão de Débito' };
  }
  if (lower.includes('boleto')) {
    return { key: 'BOLETO', label: 'Boleto' };
  }
  if (lower.includes('dinheiro') || lower.includes('espécie') || lower.includes('especie')) {
    return { key: 'DINHEIRO', label: 'Dinheiro' };
  }
  if (lower.includes('conta') || lower.includes('banco') || lower.includes('transferência') || lower.includes('transferencia')) {
    return { key: 'BANCO', label: 'Banco / Débito em Conta' };
  }
  if (lower.includes('crédito na agência') || lower.includes('credito na agencia') || lower.includes('crédito próprio')) {
    return { key: 'CREDITO', label: 'Crédito Agência' };
  }
  if (lower.includes('faturar') || lower.includes('faturado')) {
    return { key: 'FATURADO', label: 'Faturado' };
  }
  return { key: 'OUTROS', label: name };
}

async function main() {
  const prisma = new PrismaClient();
  console.log(`🚀 Iniciando sincronização das formas de pagamento a partir do dump:\n   ${dumpPath}`);

  // 1. Carrega formas de pagamento do dump
  console.log('\n💳 1. Carregando catálogo de formas de pagamento...');
  const fpRaw = execSync(`"${pgRestore}" -a -t forma_pagamento -f - "${dumpPath}"`, {
    maxBuffer: 10 * 1024 * 1024,
    encoding: 'utf8',
  });
  const fpData = parseLines(fpRaw, 'COPY destinocertoroteiros.forma_pagamento ');
  const fpMap = new Map<string, { key: string; label: string; original: string }>();
  for (const row of fpData.rows) {
    const id = cleanVal(row[fpData.colIdx['forma_pagamento_id']]);
    const nome = cleanVal(row[fpData.colIdx['nome']]);
    if (id && nome) {
      const norm = normalizePaymentMethod(nome);
      fpMap.set(id, { ...norm, original: nome });
    }
  }
  console.log(`✅ ${fpMap.size} formas de pagamento mapeadas!`);

  // 2. Mapeamento de Vendas existentes no banco
  console.log('\n📦 2. Mapeando vendas existentes no sistema...');
  const sales = await prisma.sale.findMany({ select: { id: true, mondeId: true } });
  const saleMap = new Map<string, string>();
  for (const s of sales) {
    if (s.mondeId) saleMap.set(s.mondeId, s.id);
  }
  console.log(`✅ ${sales.length} vendas prontas para associação!`);

  // 3. Atualizando FinancialEntry com saleId, paymentMethod e paymentMethodName
  console.log('\n📊 3. Processando 17.942 lançamentos financeiros (financeiro)...');
  const finRaw = execSync(`"${pgRestore}" -a -t financeiro -f - "${dumpPath}"`, {
    maxBuffer: 80 * 1024 * 1024,
    encoding: 'utf8',
  });
  const finData = parseLines(finRaw, 'COPY destinocertoroteiros.financeiro ');

  let updatedEntries = 0;
  let batchUpdates: any[] = [];
  const BATCH_SIZE = 1000;

  for (const row of finData.rows) {
    const finId = cleanVal(row[finData.colIdx['financeiro_id']]);
    if (!finId) continue;

    const vendaMondeId = cleanVal(row[finData.colIdx['venda_id']]);
    const saleId = vendaMondeId ? saleMap.get(vendaMondeId) : null;
    const fpId = cleanVal(row[finData.colIdx['forma_pagamento_id']]);
    const fpInfo = fpId ? fpMap.get(fpId) : null;

    const methodKey = fpInfo?.key || (vendaMondeId ? 'OUTROS' : null);
    const methodName = fpInfo?.label || (vendaMondeId ? 'Outros' : null);

    batchUpdates.push({
      mondeId: finId,
      saleId: saleId || null,
      paymentMethod: methodKey,
      paymentMethodName: methodName,
    });

    if (batchUpdates.length >= BATCH_SIZE) {
      for (const item of batchUpdates) {
        await prisma.financialEntry.updateMany({
          where: { mondeId: item.mondeId },
          data: {
            saleId: item.saleId,
            paymentMethod: item.paymentMethod,
            paymentMethodName: item.paymentMethodName,
          },
        });
      }
      updatedEntries += batchUpdates.length;
      process.stdout.write(`\r   Atualizados: ${updatedEntries} / ${finData.rows.length}`);
      batchUpdates = [];
    }
  }

  if (batchUpdates.length > 0) {
    for (const item of batchUpdates) {
      await prisma.financialEntry.updateMany({
        where: { mondeId: item.mondeId },
        data: {
          saleId: item.saleId,
          paymentMethod: item.paymentMethod,
          paymentMethodName: item.paymentMethodName,
        },
      });
    }
    updatedEntries += batchUpdates.length;
  }
  console.log(`\n✅ ${updatedEntries} lançamentos financeiros vinculados e enriquecidos!`);

  // 4. Atualizando primaryPaymentMethod em Sale
  console.log('\n🎯 4. Calculando forma de pagamento predominante para cada venda...');
  const allSales = await prisma.sale.findMany({
    include: {
      financialEntries: {
        select: { paymentMethod: true, amount: true, kind: true },
      },
    },
  });

  let salesWithMethod = 0;
  for (const s of allSales) {
    const receipts = s.financialEntries.filter((f) => f.paymentMethod);
    if (receipts.length === 0) continue;

    const methodTotals: Record<string, number> = {};
    for (const r of receipts) {
      const k = r.paymentMethod!;
      methodTotals[k] = (methodTotals[k] || 0) + Number(r.amount);
    }

    const sorted = Object.entries(methodTotals).sort((a, b) => b[1] - a[1]);
    const primary = sorted.length > 1 && sorted[0][1] < Number(s.finalAmount) * 0.85 ? 'MISTO' : sorted[0][0];

    await prisma.sale.update({
      where: { id: s.id },
      data: { primaryPaymentMethod: primary },
    });
    salesWithMethod++;
  }
  console.log(`✅ ${salesWithMethod} vendas atualizadas com método de pagamento principal!`);

  // 5. Atualizando BankTransaction com paymentMethod
  console.log('\n🏦 5. Vinculando formas de pagamento no Extrato Bancário (conta_movimento)...');
  const cmRaw = execSync(`"${pgRestore}" -a -t conta_movimento -f - "${dumpPath}"`, {
    maxBuffer: 40 * 1024 * 1024,
    encoding: 'utf8',
  });
  const cmData = parseLines(cmRaw, 'COPY destinocertoroteiros.conta_movimento ');

  let updatedTxs = 0;
  let cmBatch: any[] = [];

  for (const row of cmData.rows) {
    const cmId = cleanVal(row[cmData.colIdx['conta_movimento_id']]);
    if (!cmId) continue;

    const fpId = cleanVal(row[cmData.colIdx['forma_pagamento_id']]);
    const fpInfo = fpId ? fpMap.get(fpId) : null;
    if (!fpInfo) continue;

    cmBatch.push({
      mondeId: cmId,
      paymentMethod: fpInfo.key,
      paymentMethodName: fpInfo.label,
    });

    if (cmBatch.length >= BATCH_SIZE) {
      for (const item of cmBatch) {
        await prisma.bankTransaction.updateMany({
          where: { mondeId: item.mondeId },
          data: {
            paymentMethod: item.paymentMethod,
            paymentMethodName: item.paymentMethodName,
          },
        });
      }
      updatedTxs += cmBatch.length;
      process.stdout.write(`\r   Extratos atualizados: ${updatedTxs} / ${cmData.rows.length}`);
      cmBatch = [];
    }
  }

  if (cmBatch.length > 0) {
    for (const item of cmBatch) {
      await prisma.bankTransaction.updateMany({
        where: { mondeId: item.mondeId },
        data: {
          paymentMethod: item.paymentMethod,
          paymentMethodName: item.paymentMethodName,
        },
      });
    }
    updatedTxs += cmBatch.length;
  }
  console.log(`\n✅ ${updatedTxs} transações do extrato enriquecidas com forma de pagamento!`);

  console.log('\n🎉 Sincronização concluída com sucesso!');
  await prisma.$disconnect();
}

main().catch(console.error);
