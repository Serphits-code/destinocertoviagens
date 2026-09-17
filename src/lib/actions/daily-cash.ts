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

const MONTHLY_INITIAL_BALANCES: Record<string, number> = {
  "2026-01": 34.20,
  "2026-02": 5.00,
  "2026-03": 720.25,
  "2026-04": 3358.39,
  "2026-05": 1165.04,
  "2026-06": 387.00,
  "2026-07": 21384.15,
};

export async function getDailyCash(dateStr: string): Promise<CashDaySummary> {
  try {
    await requireAuth();
  } catch (e: any) {
    if (!e.message?.includes("headers")) throw e;
  }

  const [y, m, d] = dateStr.split("-").map(Number);
  const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));

  // 1. Vendas emitidas na data (excluindo canceladas)
  const sales = await db.sale.findMany({
    where: {
      saleDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: { not: "CANCELADA" },
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
    const val = Number(s.finalAmount);
    const desc = (s.notes || "" + " " + s.items.map((i: any) => i.description).join(" ")).toUpperCase();
    const isPacote =
      desc.includes("PACOTE") ||
      desc.includes("GRAMADO") ||
      desc.includes("EXCURS") ||
      desc.includes("CHILE") ||
      desc.includes("FOZ") ||
      desc.includes("JATIUCA") ||
      desc.includes("NORONHA") ||
      desc.includes("LENÇOIS") ||
      (desc.includes("HOTEL") && (desc.includes("VOO") || desc.includes("PASSEIO") || desc.includes("TRANSFER") || desc.includes("GUIA")));

    if (isPacote) {
      operations.pacotes += val;
    } else if (desc.includes("HOTEL") || desc.includes("POUSADA") || desc.includes("RESORT") || desc.includes("HOSPEDAGEM")) {
      operations.hoteis += val;
    } else if (desc.includes("INGRESSO")) {
      operations.ingressos += val;
    } else if (desc.includes("CARRO") || desc.includes("ALUGUEL")) {
      operations.aluguelCarros += val;
    } else if (desc.includes("SEGURO")) {
      operations.seguros += val;
    } else {
      operations.passagens += val;
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
    const desc = (r.description || "").toUpperCase().trim();
    const issueDateStr = r.issueDate ? r.issueDate.toISOString().slice(0, 10) : "";

    // Rendimentos de aplicações bancárias não são receitas de vendas/recebimentos da agência
    if (desc.includes("RENDIMENTO") || desc.includes("APLICAÇÃO")) {
      continue;
    }

    // Parcelas da adquirente (Stone/Sumup) agendadas em conta virtual não caem como recebimento direto no BB/gaveta
    const isStoneVirtual = doc === "STONE" || doc.includes("SUMUP");
    if (isStoneVirtual) {
      continue;
    }

    const isVendaDoDia = Boolean(r.saleId) && issueDateStr === dateStr;

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

    if (!isVendaDoDia) {
      if (doc === "DINHEIRO" || meth === "DINHEIRO") receipts.dinheiro += val;
      else if (doc === "BOLETO" || meth === "BOLETO") receipts.boleto += val;
      else if (doc === "CARTAO" || meth === "CARTAO") receipts.cartao += val;
      else {
        // PIX e Depósitos em Conta (Banco do Brasil)
        receipts.pix += val;
      }
    }
  }

  // Mapear formas de pagamento das novas vendas do dia
  for (const s of sales) {
    const val = Number(s.finalAmount);

    if (s.financialEntries.length === 0) {
      // Sem títulos na agência -> pago direto no fornecedor (ex: Flytour, CVC)
      salesPayments.cartaoFornecedor += val;
    } else {
      const primaryMethod = (s.primaryPaymentMethod || "").toUpperCase();
      const firstEntry = s.financialEntries[0];
      const firstDoc = (firstEntry?.document || "").toUpperCase();
      const firstMeth = (firstEntry?.paymentMethod || "").toUpperCase();

      const isSaleCard =
        primaryMethod.includes("CARD") ||
        primaryMethod.includes("CARTAO") ||
        firstDoc.includes("STONE") ||
        firstDoc.includes("SUMUP") ||
        firstDoc.includes("CARTAO") ||
        firstMeth.includes("CARD") ||
        firstMeth.includes("CARTAO");

      if (isSaleCard) {
        salesPayments.cartao += val;
      } else {
        const paidTodayEntries = s.financialEntries.filter(
          (e: any) => e.paidAt && e.paidAt.toISOString().slice(0, 10) === dateStr
        );
        let paidTodayAmount = 0;
        for (const pe of paidTodayEntries) {
          const pVal = Number(pe.amount);
          const pDoc = (pe.document || "").toUpperCase();
          const pMeth = (pe.paymentMethod || "").toUpperCase();
          if (pDoc === "DINHEIRO" || pMeth === "DINHEIRO") salesPayments.dinheiro += pVal;
          else if (pDoc === "PIX" || pMeth === "PIX") salesPayments.pix += pVal;
          else salesPayments.crediario += pVal;
          paidTodayAmount += pVal;
        }

        const futureBalance = val - paidTodayAmount;
        if (futureBalance > 0.01) {
          salesPayments.crediario += futureBalance;
        }
      }
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
    aVista: salesPayments.dinheiro + salesPayments.pix + salesPayments.cartao + salesPayments.cartaoFornecedor,
    aPrazo: salesPayments.crediario + salesPayments.boleto,
    subtotal: salesPayments.subtotal,
  };

  // Mapear Saídas / Pagamentos do dia
  // Apenas pagamentos em DINHEIRO saem da gaveta física (caixa físico).
  let saidasPagamentosGaveta = 0;
  for (const p of payables) {
    const val = Number(p.amount);
    const doc = (p.document || "").toUpperCase().trim();
    const meth = (p.paymentMethod || "").toUpperCase().trim();
    const isDinheiro = doc === "DINHEIRO" || meth === "DINHEIRO";

    if (isDinheiro) {
      saidasPagamentosGaveta += val;
    }

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

  // Cálculo de Saldo da Gaveta
  const monthKey = `${y}-${String(m).padStart(2, "0")}`;
  const baseBalance = MONTHLY_INITIAL_BALANCES[monthKey] ?? 21384.15;

  let accumulatedCashIn = 0;
  let accumulatedCashOut = 0;

  if (d > 1) {
    const prevStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
    const prevEnd = new Date(Date.UTC(y, m - 1, d - 1, 23, 59, 59, 999));

    const [prevRecs, prevPays] = await Promise.all([
      db.financialEntry.findMany({
        where: {
          paidAt: { gte: prevStart, lte: prevEnd },
          kind: "RECEBIMENTO",
          OR: [{ document: "DINHEIRO" }, { paymentMethod: "DINHEIRO" }],
        },
      }),
      db.financialEntry.findMany({
        where: {
          paidAt: { gte: prevStart, lte: prevEnd },
          kind: "PAGAMENTO",
          OR: [{ document: "DINHEIRO" }, { paymentMethod: "DINHEIRO" }],
        },
      }),
    ]);

    accumulatedCashIn = prevRecs.reduce((sum, r) => sum + Number(r.amount), 0);
    accumulatedCashOut = prevPays.reduce((sum, p) => sum + Number(p.amount), 0);
  }

  const saldoAnterior = baseBalance + accumulatedCashIn - accumulatedCashOut;
  const saldoFinalCaixa = saldoAnterior + totalDinheiroEntrado - saidasPagamentosGaveta;

  const cashFlow = {
    saldoAnterior,
    entradasDinheiroVenda,
    entradasDinheiroRecebimento,
    totalDinheiroEntrado,
    saidasDepositoBanco: 0,
    saidasPagamentos: saidasPagamentosGaveta,
    saidasFaltaCaixa: 0,
    subtotalSaidas: saidasPagamentosGaveta,
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
