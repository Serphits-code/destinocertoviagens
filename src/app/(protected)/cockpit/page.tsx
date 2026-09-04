import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { CockpitContent } from "./CockpitContent";
import type { DueEntry } from "./AlertsSection";
import type { ExcursionSummary } from "./UpcomingExcursions";

const MONTHS_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export default async function CockpitPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);

  // Executa todas as consultas de forma concorrente no PostgreSQL
  const [
    recPaidAgg,
    recPendingAgg,
    payPaidAgg,
    payPendingAgg,
    customersCount,
    suppliersCount,
    activeExcursionsCount,
    pendingEntriesRaw,
    excursionsRaw,
    supplierCategoriesRaw,
    recentEntriesRaw,
  ] = await Promise.all([
    // Total recebido de clientes (RECEBIMENTO PAGO)
    db.financialEntry.aggregate({
      _sum: { amount: true },
      where: { kind: "RECEBIMENTO", status: "PAGO" },
    }),
    // Total pendente a receber de clientes (RECEBIMENTO PENDENTE)
    db.financialEntry.aggregate({
      _sum: { amount: true },
      where: { kind: "RECEBIMENTO", status: "PENDENTE" },
    }),
    // Total pago a fornecedores (PAGAMENTO PAGO)
    db.financialEntry.aggregate({
      _sum: { amount: true },
      where: { kind: "PAGAMENTO", status: "PAGO" },
    }),
    // Total pendente a pagar a fornecedores (PAGAMENTO PENDENTE)
    db.financialEntry.aggregate({
      _sum: { amount: true },
      where: { kind: "PAGAMENTO", status: "PENDENTE" },
    }),
    // Contagem de passageiros
    db.customer.count(),
    // Contagem de fornecedores
    db.supplier.count(),
    // Excursões ativas
    db.excursion.count({ where: { status: "ATIVA" } }),
    // Lançamentos pendentes com cliente/fornecedor para Central de Alertas
    db.financialEntry.findMany({
      where: { status: "PENDENTE" },
      orderBy: [{ dueDate: "asc" }, { amount: "desc" }],
      take: 60,
      include: {
        customer: { select: { id: true, name: true, phone: true, mobile: true } },
        supplier: { select: { id: true, name: true, phone: true, category: true } },
      },
    }),
    // Próximas excursões cadastradas
    db.excursion.findMany({
      orderBy: { periodStart: "asc" },
      take: 6,
      include: {
        _count: { select: { blocks: true } },
      },
    }),
    // Fornecedores por categoria com pagamentos
    db.supplier.findMany({
      where: { category: { not: null } },
      select: {
        category: true,
        financialEntries: {
          where: { kind: "PAGAMENTO" },
          select: { amount: true },
        },
      },
    }),
    // Amostra de lançamentos ordenados por vencimento para o gráfico de fluxo de caixa
    db.financialEntry.findMany({
      select: {
        amount: true,
        kind: true,
        status: true,
        dueDate: true,
      },
      take: 3000,
      orderBy: { dueDate: "desc" },
    }),
  ]);

  const totalReceived = Number(recPaidAgg._sum?.amount ?? 0);
  const totalPendingReceivables = Number(recPendingAgg._sum?.amount ?? 0);
  const totalPaidOut = Number(payPaidAgg._sum?.amount ?? 0);
  const totalPendingPayables = Number(payPendingAgg._sum?.amount ?? 0);
  const netOperatingResult = totalReceived - totalPaidOut;

  // Processa os alertas de vencimento
  const alertEntries: DueEntry[] = pendingEntriesRaw.map((e) => ({
    id: e.id,
    type: e.kind as "RECEBIMENTO" | "PAGAMENTO",
    description: e.description,
    amount: Number(e.amount),
    dueDate: e.dueDate ? e.dueDate.toISOString() : null,
    status: e.status,
    category: e.supplier?.category || null,
    customer: e.customer,
    supplier: e.supplier,
  }));

  let totalOverdueReceivables = 0;
  let countOverdueReceivables = 0;
  let totalOverduePayables = 0;
  let countOverduePayables = 0;
  let totalUpcomingReceivables = 0;
  let countUpcomingReceivables = 0;
  let totalUpcomingPayables = 0;
  let countUpcomingPayables = 0;

  for (const e of alertEntries) {
    const isOverdue = e.dueDate ? new Date(e.dueDate).getTime() < now.getTime() : false;
    if (e.type === "RECEBIMENTO") {
      if (isOverdue) {
        totalOverdueReceivables += e.amount;
        countOverdueReceivables++;
      } else {
        totalUpcomingReceivables += e.amount;
        countUpcomingReceivables++;
      }
    } else {
      if (isOverdue) {
        totalOverduePayables += e.amount;
        countOverduePayables++;
      } else {
        totalUpcomingPayables += e.amount;
        countUpcomingPayables++;
      }
    }
  }

  // Processa fluxo de caixa mensal
  const monthMap = new Map<string, { month: string; recebido: number; pago: number; aReceber: number }>();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${MONTHS_PT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
    monthMap.set(key, { month: label, recebido: 0, pago: 0, aReceber: 0 });
  }

  for (const t of recentEntriesRaw) {
    if (!t.dueDate) continue;
    const d = new Date(t.dueDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const existing = monthMap.get(key);
    if (existing) {
      const val = Number(t.amount);
      if (t.kind === "RECEBIMENTO") {
        if (t.status === "PAGO") {
          existing.recebido += val;
        } else {
          existing.aReceber += val;
        }
      } else if (t.kind === "PAGAMENTO" && t.status === "PAGO") {
        existing.pago += val;
      }
    }
  }

  const cashFlow = Array.from(monthMap.values());
  const hasCashFlowData = cashFlow.some((c) => c.recebido > 0 || c.pago > 0 || c.aReceber > 0);

  let finalCashFlow = cashFlow;
  if (!hasCashFlowData && recentEntriesRaw.length > 0) {
    // Monta série com os meses mais recentes com movimentação no dump
    const dynamicMap = new Map<string, { month: string; recebido: number; pago: number; aReceber: number }>();
    for (const t of recentEntriesRaw) {
      if (!t.dueDate) continue;
      const d = new Date(t.dueDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!dynamicMap.has(key)) {
        const label = `${MONTHS_PT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
        dynamicMap.set(key, { month: label, recebido: 0, pago: 0, aReceber: 0 });
      }
      const item = dynamicMap.get(key)!;
      const val = Number(t.amount);
      if (t.kind === "RECEBIMENTO") {
        if (t.status === "PAGO") item.recebido += val;
        else item.aReceber += val;
      } else if (t.kind === "PAGAMENTO" && t.status === "PAGO") {
        item.pago += val;
      }
    }
    const sortedKeys = Array.from(dynamicMap.keys()).sort();
    finalCashFlow = sortedKeys.slice(-6).map((k) => dynamicMap.get(k)!);
  }

  // Agrupamento de categorias de fornecedores
  const categoryTotals: Record<string, { amount: number; count: number }> = {};
  for (const s of supplierCategoriesRaw) {
    const cat = s.category || "Outros";
    if (!categoryTotals[cat]) categoryTotals[cat] = { amount: 0, count: 0 };
    for (const f of s.financialEntries) {
      categoryTotals[cat].amount += Number(f.amount);
      categoryTotals[cat].count++;
    }
  }
  const categoryData = Object.entries(categoryTotals)
    .map(([category, data]) => ({ category, amount: data.amount, count: data.count }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  // Processa excursões
  const upcomingExcursions: ExcursionSummary[] = excursionsRaw.map((e) => ({
    id: e.id,
    name: e.name,
    periodStart: e.periodStart ? e.periodStart.toISOString() : null,
    periodEnd: e.periodEnd ? e.periodEnd.toISOString() : null,
    slots: e.slots,
    status: e.status,
    blocksCount: e._count.blocks,
  }));

  return (
    <CockpitContent
      userName={session.user.name || "Gestor"}
      kpis={{
        totalReceived,
        totalPendingReceivables,
        totalPaidOut,
        totalPendingPayables,
        netOperatingResult,
        customersCount,
        suppliersCount,
        activeExcursionsCount,
      }}
      cashFlow={finalCashFlow}
      categoryData={categoryData}
      alertEntries={alertEntries}
      alertSummary={{
        totalOverdueReceivables,
        countOverdueReceivables,
        totalOverduePayables,
        countOverduePayables,
        totalUpcomingReceivables,
        countUpcomingReceivables,
        totalUpcomingPayables,
        countUpcomingPayables,
      }}
      upcomingExcursions={upcomingExcursions}
    />
  );
}
