"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";

export interface FinancialReportFilters {
  period?: "today" | "week" | "month" | "last_month" | "year" | "all" | "custom";
  startDate?: string;
  endDate?: string;
  dateBasis?: "paidAt" | "dueDate" | "issueDate";
  kind?: "ALL" | "RECEBIMENTO" | "PAGAMENTO";
  status?: "ALL" | "PAGO" | "PENDENTE" | "VENCIDO";
  paymentMethod?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "date" | "amount" | "description";
  sortOrder?: "asc" | "desc";
}

export interface FinancialReportKPIs {
  receitasPagas: number;
  receitasPendentes: number;
  totalReceitas: number;
  despesasPagas: number;
  despesasPendentes: number;
  totalDespesas: number;
  lucroRealizado: number;
  lucroProjetado: number;
  margemRealizadaPercent: number;
  vencidosReceber: number;
  vencidosPagar: number;
  totalTransacoes: number;
}

export interface DREItem {
  label: string;
  valor: number;
  tipo: "receita" | "custo" | "subtotal" | "resultado";
  percentual?: number;
}

export interface ChartPoint {
  label: string;
  receitas: number;
  despesas: number;
  lucro: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  label: string;
  receitas: number;
  despesas: number;
  total: number;
}

export interface FinancialReportEntry {
  id: string;
  mondeId: string | null;
  kind: "RECEBIMENTO" | "PAGAMENTO";
  description: string;
  document: string | null;
  amount: number;
  issueDate: string | null;
  dueDate: string;
  paidAt: string | null;
  status: string;
  isOverdue: boolean;
  paymentMethod: string | null;
  paymentMethodName: string | null;
  customerName: string | null;
  customerDoc: string | null;
  supplierName: string | null;
  supplierCnpj: string | null;
  saleNumber: string | null;
}

export interface FinancialReportResponse {
  kpis: FinancialReportKPIs;
  dre: DREItem[];
  timelineChart: ChartPoint[];
  paymentMethods: PaymentMethodBreakdown[];
  entries: FinancialReportEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function resolveDateRange(period?: string, startStr?: string, endStr?: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === "today") {
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return { start: today, end };
  }

  if (period === "week") {
    const dayOfWeek = today.getDay(); // 0 is Sunday
    const start = new Date(today);
    start.setDate(today.getDate() - dayOfWeek);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (period === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  if (period === "last_month") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
    return { start, end };
  }

  if (period === "year") {
    const start = new Date(today.getFullYear(), 0, 1);
    const end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { start, end };
  }

  if (period === "custom" && startStr && endStr) {
    const start = new Date(startStr + "T00:00:00");
    const end = new Date(endStr + "T23:59:59");
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      return { start, end };
    }
  }

  // Default se vazio: mês atual
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function getCorporateFinancialReport(
  filters: FinancialReportFilters = {}
): Promise<FinancialReportResponse> {
  await requireAuth();

  const {
    period = "month",
    startDate,
    endDate,
    dateBasis = "dueDate",
    kind = "ALL",
    status = "ALL",
    paymentMethod = "ALL",
    search = "",
    page = 1,
    pageSize = 25,
    sortBy = "date",
    sortOrder = "desc",
  } = filters;

  const { start, end } = resolveDateRange(period, startDate, endDate);
  const now = new Date();

  // Construção do filtro WHERE
  const where: any = {};

  // Filtro de data
  if (period !== "all") {
    const fieldName = dateBasis === "paidAt" ? "paidAt" : dateBasis === "issueDate" ? "issueDate" : "dueDate";
    where[fieldName] = {
      gte: start,
      lte: end,
    };
  }

  // Filtro de natureza
  if (kind !== "ALL") {
    where.kind = kind;
  }

  // Filtro de status
  if (status === "PAGO") {
    where.status = "PAGO";
  } else if (status === "PENDENTE") {
    where.status = "PENDENTE";
    where.dueDate = { ...where.dueDate, gte: now };
  } else if (status === "VENCIDO") {
    where.status = "PENDENTE";
    where.dueDate = { ...where.dueDate, lt: now };
  }

  // Filtro de forma de pagamento
  if (paymentMethod && paymentMethod !== "ALL") {
    where.paymentMethod = paymentMethod;
  }

  // Filtro textual
  if (search.trim()) {
    const q = search.trim();
    where.OR = [
      { description: { contains: q, mode: "insensitive" } },
      { document: { contains: q, mode: "insensitive" } },
      { customer: { name: { contains: q, mode: "insensitive" } } },
      { customer: { cpf: { contains: q } } },
      { supplier: { name: { contains: q, mode: "insensitive" } } },
      { supplier: { tradeName: { contains: q, mode: "insensitive" } } },
      { supplier: { cnpj: { contains: q } } },
      { sale: { saleNumber: { contains: q, mode: "insensitive" } } },
    ];
  }

  // Buscar todas as entradas agregadas do período (para KPIs e DRE precisos)
  const allPeriodEntries = await db.financialEntry.findMany({
    where,
    select: {
      id: true,
      kind: true,
      amount: true,
      status: true,
      dueDate: true,
      paidAt: true,
      paymentMethod: true,
      paymentMethodName: true,
      description: true,
    },
  });

  // Cálculo dos KPIs Executivos
  let receitasPagas = 0;
  let receitasPendentes = 0;
  let despesasPagas = 0;
  let despesasPendentes = 0;
  let vencidosReceber = 0;
  let vencidosPagar = 0;

  const paymentMap: Record<string, { label: string; receitas: number; despesas: number }> = {};
  const monthMap: Record<string, { label: string; receitas: number; despesas: number; lucro: number }> = {};

  for (const item of allPeriodEntries) {
    const val = Number(item.amount) || 0;
    const isPaid = item.status === "PAGO";
    const isOverdue = !isPaid && new Date(item.dueDate) < now;

    // Totais
    if (item.kind === "RECEBIMENTO") {
      if (isPaid) receitasPagas += val;
      else receitasPendentes += val;
      if (isOverdue) vencidosReceber += val;
    } else {
      if (isPaid) despesasPagas += val;
      else despesasPendentes += val;
      if (isOverdue) vencidosPagar += val;
    }

    // Por forma de pagamento
    const mKey = item.paymentMethod || "OUTROS";
    const mLabel = item.paymentMethodName || mKey;
    if (!paymentMap[mKey]) paymentMap[mKey] = { label: mLabel, receitas: 0, despesas: 0 };
    if (item.kind === "RECEBIMENTO") paymentMap[mKey].receitas += val;
    else paymentMap[mKey].despesas += val;

    // Timeline diária/mensal
    const dObj = item.paidAt ? new Date(item.paidAt) : new Date(item.dueDate);
    const timeKey = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, "0")}`;
    const monthName = dObj.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });

    if (!monthMap[timeKey]) monthMap[timeKey] = { label: monthName, receitas: 0, despesas: 0, lucro: 0 };
    if (item.kind === "RECEBIMENTO") monthMap[timeKey].receitas += val;
    else monthMap[timeKey].despesas += val;
    monthMap[timeKey].lucro = monthMap[timeKey].receitas - monthMap[timeKey].despesas;
  }

  const totalReceitas = receitasPagas + receitasPendentes;
  const totalDespesas = despesasPagas + despesasPendentes;
  const lucroRealizado = receitasPagas - despesasPagas;
  const lucroProjetado = totalReceitas - totalDespesas;
  const margemRealizadaPercent = receitasPagas > 0 ? (lucroRealizado / receitasPagas) * 100 : 0;

  const kpis: FinancialReportKPIs = {
    receitasPagas,
    receitasPendentes,
    totalReceitas,
    despesasPagas,
    despesasPendentes,
    totalDespesas,
    lucroRealizado,
    lucroProjetado,
    margemRealizadaPercent,
    vencidosReceber,
    vencidosPagar,
    totalTransacoes: allPeriodEntries.length,
  };

  // DRE Gerencial Sintético
  // Estimativa baseada em fornecedores de turismo vs despesas operacionais
  const custosDiretos = despesasPagas * 0.78; // aprox. custo de fornecedores de viagem
  const despesasOperacionais = despesasPagas * 0.22; // despesas administrativas / taxas
  const margemContribuicao = receitasPagas - custosDiretos;

  const dre: DREItem[] = [
    { label: "1. Receita Operacional Bruta", valor: totalReceitas, tipo: "receita", percentual: 100 },
    { label: "   (-) Receitas a Realizar (A Vencer)", valor: receitasPendentes, tipo: "custo" },
    { label: "2. Receita Operacional Líquida Realizada", valor: receitasPagas, tipo: "subtotal", percentual: totalReceitas > 0 ? (receitasPagas / totalReceitas) * 100 : 0 },
    { label: "   (-) Custos dos Serviços Prestados (Fornecedores Turismo)", valor: custosDiretos, tipo: "custo", percentual: receitasPagas > 0 ? (custosDiretos / receitasPagas) * 100 : 0 },
    { label: "3. Margem de Contribuição Bruta", valor: margemContribuicao, tipo: "subtotal", percentual: receitasPagas > 0 ? (margemContribuicao / receitasPagas) * 100 : 0 },
    { label: "   (-) Despesas Administrativas & Operacionais", valor: despesasOperacionais, tipo: "custo", percentual: receitasPagas > 0 ? (despesasOperacionais / receitasPagas) * 100 : 0 },
    { label: "4. Resultado Operacional Líquido da Empresa", valor: lucroRealizado, tipo: "resultado", percentual: margemRealizadaPercent },
  ];

  // Timeline organizada cronologicamente
  const timelineChart: ChartPoint[] = Object.keys(monthMap)
    .sort()
    .map((k) => monthMap[k]);

  // Formas de pagamento
  const paymentMethods: PaymentMethodBreakdown[] = Object.entries(paymentMap).map(([key, data]) => ({
    method: key,
    label: data.label,
    receitas: data.receitas,
    despesas: data.despesas,
    total: data.receitas + data.despesas,
  })).sort((a, b) => b.total - a.total);

  // Paginação e busca da listagem detalhada
  const skip = (Math.max(1, page) - 1) * pageSize;
  const take = Math.max(1, Math.min(100, pageSize));

  const totalCount = allPeriodEntries.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Ordenação
  const orderByClause: any = {};
  if (sortBy === "amount") {
    orderByClause.amount = sortOrder;
  } else if (sortBy === "description") {
    orderByClause.description = sortOrder;
  } else {
    orderByClause.dueDate = sortOrder;
  }

  const pagedRecords = await db.financialEntry.findMany({
    where,
    skip,
    take,
    orderBy: orderByClause,
    include: {
      customer: {
        select: { name: true, cpf: true },
      },
      supplier: {
        select: { name: true, tradeName: true, cnpj: true },
      },
      sale: {
        select: { saleNumber: true },
      },
    },
  });

  const entries: FinancialReportEntry[] = pagedRecords.map((item) => {
    const isPaid = item.status === "PAGO";
    const isOverdue = !isPaid && new Date(item.dueDate) < now;

    return {
      id: item.id,
      mondeId: item.mondeId,
      kind: item.kind as "RECEBIMENTO" | "PAGAMENTO",
      description: item.description,
      document: item.document,
      amount: Number(item.amount),
      issueDate: item.issueDate ? item.issueDate.toISOString().split("T")[0] : null,
      dueDate: item.dueDate.toISOString().split("T")[0],
      paidAt: item.paidAt ? item.paidAt.toISOString().split("T")[0] : null,
      status: item.status,
      isOverdue,
      paymentMethod: item.paymentMethod,
      paymentMethodName: item.paymentMethodName,
      customerName: item.customer?.name || null,
      customerDoc: item.customer?.cpf || null,
      supplierName: item.supplier?.tradeName || item.supplier?.name || null,
      supplierCnpj: item.supplier?.cnpj || null,
      saleNumber: item.sale?.saleNumber || null,
    };
  });

  return {
    kpis,
    dre,
    timelineChart,
    paymentMethods,
    entries,
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}
