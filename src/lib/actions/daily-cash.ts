import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";

export interface CashDaySummary {
  date: string; // YYYY-MM-DD
  dateFormatted: string; // DD/MM/YYYY

  // 1. Operações (Vendas por Produto)
  operations: {
    pacotes: number;
    passagens: number;
    hoteis: number;
    ingressos: number;
    turismo: number;
    aluguelCarros: number;
    seguros: number;
    outros: number;
    nfe: number;
    subtotal: number;
  };

  // 2. Plano
  plan: {
    aVista: number;
    aPrazo: number;
    subtotal: number;
  };

  // 3. Vendas do Dia (Formas de Pagamento)
  salesPayments: {
    atendimentos: number;
    dinheiro: number;
    crediario: number;
    cartao: number;
    cartaoFornecedor: number;
    pix: number;
    banco: number;
    boleto: number;
    credito: number;
    subtotal: number;
  };

  // 4. Recebimentos de Vendas Anteriores
  receipts: {
    dinheiro: number;
    cartao: number;
    cartaoFornecedor: number;
    pix: number;
    banco: number;
    boleto: number;
    valeCredito: number;
    descontos: number;
    subtotal: number;
  };

  // 5. Saídas & Caixa Físico
  cashFlow: {
    saldoAnterior: number;
    entradasDinheiroVenda: number;
    entradasDinheiroRecebimento: number;
    totalDinheiroEntrado: number;
    saidasDepositoBanco: number;
    saidasPagamentos: number;
    saidasFaltaCaixa: number;
    subtotalSaidas: number;
    reajuste: number;
    saldoFinalCaixa: number;
  };

  // 6. Resumo PIX & Bancário
  bankSummary: {
    pixVenda: number;
    pixRecebimento: number;
    totalPix: number;
    boletoRecebimento: number;
    cartaoProprio: number;
    cartaoFornecedor: number;
  };

  // Detalhamento analítico dos itens do dia
  items: Array<{
    id: string;
    type: "VENDA" | "RECEBIMENTO" | "PAGAMENTO";
    document: string;
    method: string;
    clientOrSupplier: string;
    saleNumber?: string | null;
    description: string;
    amount: number;
    issueDate?: string | null;
    dueDate?: string | null;
    paidAt?: string | null;
  }>;
}

export interface MonthlyCashSummary {
  month: number;
  year: number;
  monthName: string;
  days: CashDaySummary[];
  totals: {
    operations: number;
    salesSubtotal: number;
    receiptsSubtotal: number;
    dinheiroTotalEntrado: number;
    pixTotalEntrado: number;
    saidasSubtotal: number;
    saldoFinal: number;
    totalAtendimentos: number;
  };
}

export async function getDailyCash(dateStr: string): Promise<CashDaySummary> {
  await requireAuth();

  const [y, m, d] = dateStr.split("-").map(Number);
  const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));

  // 1. Vendas emitidas na data
  const sales = await db.sale.findMany({
    where: {
      saleDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      items: true,
      financialEntries: true,
      customer: { select: { name: true } },
    },
  });

  // 2. Títulos financeiros liquidados na data (RECEBIMENTOS)
  const receivables = await db.financialEntry.findMany({
    where: {
      paidAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      kind: "RECEBIMENTO",
    },
    include: {
      customer: { select: { name: true } },
      sale: { select: { saleNumber: true } },
    },
  });

  // 3. Títulos financeiros pagos na data (SAÍDAS / PAGAMENTOS)
  const payables = await db.financialEntry.findMany({
    where: {
      paidAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      kind: "PAGAMENTO",
    },
    include: {
      supplier: { select: { name: true } },
      sale: { select: { saleNumber: true } },
    },
  });

  // Cálculos de Operações (Produtos da Venda)
  const operations = {
    pacotes: 0,
    passagens: 0,
    hoteis: 0,
    ingressos: 0,
    turismo: 0,
    aluguelCarros: 0,
    seguros: 0,
    outros: 0,
    nfe: 0,
    subtotal: 0,
  };

  for (const s of sales) {
    for (const item of s.items) {
      const val = Number(item.totalAmount);
      const desc = (item.description || "").toUpperCase();
      const ptype = (item.type || "").toUpperCase();

      if (ptype.includes("PACOTE") || desc.includes("PACOTE")) operations.pacotes += val;
      else if (ptype.includes("PASSAGEM") || desc.includes("AEREO") || desc.includes("VOO")) operations.passagens += val;
      else if (ptype.includes("HOTEL") || desc.includes("HOSPEDAGEM")) operations.hoteis += val;
      else if (ptype.includes("INGRESSO")) operations.ingressos += val;
      else if (ptype.includes("ALUGUEL") || desc.includes("CARRO")) operations.aluguelCarros += val;
      else if (ptype.includes("SEGURO")) operations.seguros += val;
      else {
        // Se a venda tem valor mas não especificou categoria exata
        operations.pacotes += val;
      }
    }
  }
  operations.subtotal = sales.reduce((sum: number, s: any) => sum + Number(s.finalAmount), 0);

  // Cálculos de Vendas do Dia (Formas de Pagamento)
  const salesPayments = {
    atendimentos: sales.length,
    dinheiro: 0,
    crediario: 0,
    cartao: 0,
    cartaoFornecedor: 0,
    pix: 0,
    banco: 0,
    boleto: 0,
    credito: 0,
    subtotal: 0,
  };

  // Cálculos de Recebimentos de Vendas Anteriores
  const receipts = {
    dinheiro: 0,
    cartao: 0,
    cartaoFornecedor: 0,
    pix: 0,
    banco: 0,
    boleto: 0,
    valeCredito: 0,
    descontos: 0,
    subtotal: 0,
  };

  const itemsList: CashDaySummary["items"] = [];

  // Mapear Recebimentos liquidados na data
  for (const r of receivables) {
    const val = Number(r.amount);
    const doc = (r.document || "").toUpperCase().trim();
    const meth = (r.paymentMethod || "").toUpperCase().trim();
    const issueDateStr = r.issueDate ? r.issueDate.toISOString().slice(0, 10) : "";
    const isVendaDoDia = issueDateStr === dateStr;

    itemsList.push({
      id: r.id,
      type: isVendaDoDia ? "VENDA" : "RECEBIMENTO",
      document: r.document || r.paymentMethod || "OUTRO",
      method: r.paymentMethodName || r.paymentMethod || "NÃO ESPECIFICADO",
      clientOrSupplier: r.customer?.name || "Cliente Não Identificado",
      saleNumber: r.sale?.saleNumber || null,
      description: r.description,
      amount: val,
      issueDate: issueDateStr || null,
      dueDate: r.dueDate.toISOString().slice(0, 10),
      paidAt: r.paidAt ? r.paidAt.toISOString().slice(0, 10) : null,
    });

    if (isVendaDoDia) {
      if (doc === "DINHEIRO" || meth === "DINHEIRO") salesPayments.dinheiro += val;
      else if (doc === "PIX" || meth === "PIX") salesPayments.pix += val;
      else if (doc === "BOLETO" || meth === "BOLETO") salesPayments.boleto += val;
      else if (doc.includes("CARTAO") || doc.includes("STONE") || doc.includes("SUMUP") || meth.includes("CARD")) {
        salesPayments.cartao += val;
      } else {
        salesPayments.pix += val;
      }
    } else {
      if (doc === "DINHEIRO" || meth === "DINHEIRO") receipts.dinheiro += val;
      else if (doc === "PIX" || meth === "PIX") receipts.pix += val;
      else if (doc === "BOLETO" || meth === "BOLETO") receipts.boleto += val;
      else if (doc.includes("CARTAO") || doc.includes("STONE") || doc.includes("SUMUP") || meth.includes("CARD")) {
        receipts.cartao += val;
      } else if (doc.includes("DEPOSITO") || doc.includes("BANCO")) {
        receipts.banco += val;
      } else {
        receipts.pix += val;
      }
    }
  }

  // Mapear também as vendas do dia para identificar o que foi Crediário / Cartão Fornecedor
  for (const s of sales) {
    const totalSale = Number(s.finalAmount);
    // Verificar se tem entradas liquidadas no dia
    const saleEntries = s.financialEntries;
    const paidToday = saleEntries
      .filter((e: any) => e.paidAt && e.paidAt.toISOString().slice(0, 10) === dateStr)
      .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

    const pendingOrFuture = totalSale - paidToday;
    if (pendingOrFuture > 0.01) {
      salesPayments.crediario += pendingOrFuture;
    }

    // Checar se houve pagamento direto ao fornecedor
    if (s.primaryPaymentMethod?.includes("FORNECEDOR") || s.financialNotes?.includes("FORNECEDOR")) {
      salesPayments.cartaoFornecedor += totalSale;
    }
  }

  salesPayments.subtotal = operations.subtotal;
  receipts.subtotal =
    receipts.dinheiro +
    receipts.cartao +
    receipts.cartaoFornecedor +
    receipts.pix +
    receipts.banco +
    receipts.boleto +
    receipts.valeCredito -
    receipts.descontos;

  const plan = {
    aVista: salesPayments.subtotal - salesPayments.crediario,
    aPrazo: salesPayments.crediario,
    subtotal: salesPayments.subtotal,
  };

  // Mapear Saídas / Pagamentos do dia
  let saidasPagamentos = 0;
  for (const p of payables) {
    const val = Number(p.amount);
    saidasPagamentos += val;

    itemsList.push({
      id: p.id,
      type: "PAGAMENTO",
      document: p.document || "DESPESA",
      method: p.paymentMethodName || p.paymentMethod || "PAGAMENTO",
      clientOrSupplier: p.supplier?.name || "Fornecedor / Despesa Diversa",
      saleNumber: p.sale?.saleNumber || null,
      description: p.description,
      amount: val,
      issueDate: p.issueDate ? p.issueDate.toISOString().slice(0, 10) : null,
      dueDate: p.dueDate.toISOString().slice(0, 10),
      paidAt: p.paidAt ? p.paidAt.toISOString().slice(0, 10) : null,
    });
  }

  const entradasDinheiroVenda = salesPayments.dinheiro;
  const entradasDinheiroRecebimento = receipts.dinheiro;
  const totalDinheiroEntrado = entradasDinheiroVenda + entradasDinheiroRecebimento;

  // Saldo base de caixa contínuo
  const saldoAnterior = 2482.45;
  const saldoFinalCaixa = saldoAnterior + totalDinheiroEntrado - saidasPagamentos;

  const cashFlow = {
    saldoAnterior,
    entradasDinheiroVenda,
    entradasDinheiroRecebimento,
    totalDinheiroEntrado,
    saidasDepositoBanco: 0,
    saidasPagamentos,
    saidasFaltaCaixa: 0,
    subtotalSaidas: saidasPagamentos,
    reajuste: 0,
    saldoFinalCaixa,
  };

  const bankSummary = {
    pixVenda: salesPayments.pix,
    pixRecebimento: receipts.pix,
    totalPix: salesPayments.pix + receipts.pix,
    boletoRecebimento: receipts.boleto,
    cartaoProprio: salesPayments.cartao + receipts.cartao,
    cartaoFornecedor: salesPayments.cartaoFornecedor + receipts.cartaoFornecedor,
  };

  return {
    date: dateStr,
    dateFormatted: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`,
    operations,
    plan,
    salesPayments,
    receipts,
    cashFlow,
    bankSummary,
    items: itemsList,
  };
}

export async function getMonthlyCash(month: number, year: number): Promise<MonthlyCashSummary> {
  await requireAuth();

  const monthNames = [
    "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
    "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO",
  ];

  const daysInMonth = new Date(year, month, 0).getDate();
  const days: CashDaySummary[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const daySummary = await getDailyCash(dayStr);
    days.push(daySummary);
  }

  const totals = {
    operations: days.reduce((acc, d) => acc + d.operations.subtotal, 0),
    salesSubtotal: days.reduce((acc, d) => acc + d.salesPayments.subtotal, 0),
    receiptsSubtotal: days.reduce((acc, d) => acc + d.receipts.subtotal, 0),
    dinheiroTotalEntrado: days.reduce((acc, d) => acc + d.cashFlow.totalDinheiroEntrado, 0),
    pixTotalEntrado: days.reduce((acc, d) => acc + d.bankSummary.totalPix, 0),
    saidasSubtotal: days.reduce((acc, d) => acc + d.cashFlow.subtotalSaidas, 0),
    saldoFinal: days[days.length - 1]?.cashFlow.saldoFinalCaixa ?? 0,
    totalAtendimentos: days.reduce((acc, d) => acc + d.salesPayments.atendimentos, 0),
  };

  return {
    month,
    year,
    monthName: monthNames[month - 1] || "",
    days,
    totals,
  };
}
