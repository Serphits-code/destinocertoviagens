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

  // Executa todas as consultas de forma concorrente e otimizada no PostgreSQL
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
    categoryDataRaw,
    cashFlowRows,
    [exactAlertSummary],
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
    // Amostra de lançamentos pendentes para listagem visual na Central de Alertas
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
    // Agrupamento de fornecedores por categoria com pagamentos feito diretamente no PostgreSQL
    db.$queryRaw<Array<{ category: string; amount: number; count: number }>>`
      SELECT
        COALESCE(s.category, 'Outros') AS category,
        COALESCE(SUM(fe.amount), 0)::float AS amount,
        COUNT(fe.id)::int AS count
      FROM "Supplier" s
      JOIN "FinancialEntry" fe ON fe."supplierId" = s.id AND fe.kind = 'PAGAMENTO'
      WHERE s.category IS NOT NULL
      GROUP BY s.category
      ORDER BY amount DESC
      LIMIT 6;
    `,
    // Agregação de fluxo de caixa mensal direto no banco (evita carregar milhares de linhas em memória)
    db.$queryRaw<Array<{
      month_key: string;
      recebido: number;
      aReceber: number;
      pago: number;
    }>>`
      SELECT
        to_char("dueDate", 'YYYY-MM') AS month_key,
        COALESCE(SUM(CASE WHEN kind = 'RECEBIMENTO' AND status = 'PAGO' THEN amount ELSE 0 END), 0)::float AS recebido,
        COALESCE(SUM(CASE WHEN kind = 'RECEBIMENTO' AND status = 'PENDENTE' THEN amount ELSE 0 END), 0)::float AS "aReceber",
        COALESCE(SUM(CASE WHEN kind = 'PAGAMENTO' AND status = 'PAGO' THEN amount ELSE 0 END), 0)::float AS pago
      FROM "FinancialEntry"
      WHERE "dueDate" IS NOT NULL
      GROUP BY month_key
      HAVING (
        SUM(CASE WHEN kind = 'RECEBIMENTO' AND status = 'PAGO' THEN amount ELSE 0 END) > 0
        OR SUM(CASE WHEN kind = 'RECEBIMENTO' AND status = 'PENDENTE' THEN amount ELSE 0 END) > 0
        OR SUM(CASE WHEN kind = 'PAGAMENTO' AND status = 'PAGO' THEN amount ELSE 0 END) > 0
      )
      ORDER BY month_key ASC;
    `,
    // Totais exatos de alertas calculados sobre toda a base (17.500+ lançamentos)
    db.$queryRaw<Array<{
      totalOverdueReceivables: number;
      countOverdueReceivables: number;
      totalOverduePayables: number;
      countOverduePayables: number;
      totalUpcomingReceivables: number;
      countUpcomingReceivables: number;
      totalUpcomingPayables: number;
      countUpcomingPayables: number;
    }>>`
      SELECT
        COALESCE(SUM(CASE WHEN kind = 'RECEBIMENTO' AND "dueDate" < ${now} THEN amount ELSE 0 END), 0)::float AS "totalOverdueReceivables",
        COALESCE(COUNT(CASE WHEN kind = 'RECEBIMENTO' AND "dueDate" < ${now} THEN 1 END), 0)::int AS "countOverdueReceivables",
        COALESCE(SUM(CASE WHEN kind = 'PAGAMENTO' AND "dueDate" < ${now} THEN amount ELSE 0 END), 0)::float AS "totalOverduePayables",
        COALESCE(COUNT(CASE WHEN kind = 'PAGAMENTO' AND "dueDate" < ${now} THEN 1 END), 0)::int AS "countOverduePayables",
        COALESCE(SUM(CASE WHEN kind = 'RECEBIMENTO' AND "dueDate" >= ${now} THEN amount ELSE 0 END), 0)::float AS "totalUpcomingReceivables",
        COALESCE(COUNT(CASE WHEN kind = 'RECEBIMENTO' AND "dueDate" >= ${now} THEN 1 END), 0)::int AS "countUpcomingReceivables",
        COALESCE(SUM(CASE WHEN kind = 'PAGAMENTO' AND "dueDate" >= ${now} THEN amount ELSE 0 END), 0)::float AS "totalUpcomingPayables",
        COALESCE(COUNT(CASE WHEN kind = 'PAGAMENTO' AND "dueDate" >= ${now} THEN 1 END), 0)::int AS "countUpcomingPayables"
      FROM "FinancialEntry"
      WHERE status = 'PENDENTE' AND "dueDate" IS NOT NULL;
    `,
  ]);

  const totalReceived = Number(recPaidAgg._sum?.amount ?? 0);
  const totalPendingReceivables = Number(recPendingAgg._sum?.amount ?? 0);
  const totalPaidOut = Number(payPaidAgg._sum?.amount ?? 0);
  const totalPendingPayables = Number(payPendingAgg._sum?.amount ?? 0);
  const netOperatingResult = totalReceived - totalPaidOut;

  // Processa os alertas para a listagem
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

  // Resumo de alertas com dados contábeis 100% precisos
  const alertSummary = {
    totalOverdueReceivables: exactAlertSummary?.totalOverdueReceivables || 0,
    countOverdueReceivables: exactAlertSummary?.countOverdueReceivables || 0,
    totalOverduePayables: exactAlertSummary?.totalOverduePayables || 0,
    countOverduePayables: exactAlertSummary?.countOverduePayables || 0,
    totalUpcomingReceivables: exactAlertSummary?.totalUpcomingReceivables || 0,
    countUpcomingReceivables: exactAlertSummary?.countUpcomingReceivables || 0,
    totalUpcomingPayables: exactAlertSummary?.totalUpcomingPayables || 0,
    countUpcomingPayables: exactAlertSummary?.countUpcomingPayables || 0,
  };

  // Mapeia os dados do fluxo de caixa mensal
  const cashFlowMap = new Map<string, { month: string; recebido: number; pago: number; aReceber: number }>();
  for (const row of cashFlowRows) {
    const [y, m] = row.month_key.split("-");
    const monthIndex = parseInt(m, 10) - 1;
    const label = `${MONTHS_PT[monthIndex] || m}/${y.slice(2)}`;
    cashFlowMap.set(row.month_key, {
      month: label,
      recebido: row.recebido,
      pago: row.pago,
      aReceber: row.aReceber,
    });
  }

  // Prepara janela dos últimos 6 meses para o gráfico
  const windowMonthMap = new Map<string, { month: string; recebido: number; pago: number; aReceber: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${MONTHS_PT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
    const fromDb = cashFlowMap.get(key);
    windowMonthMap.set(key, fromDb || { month: label, recebido: 0, pago: 0, aReceber: 0 });
  }

  const windowCashFlow = Array.from(windowMonthMap.values());
  const hasWindowData = windowCashFlow.some((c) => c.recebido > 0 || c.pago > 0 || c.aReceber > 0);

  let finalCashFlow = windowCashFlow;
  if (!hasWindowData && cashFlowRows.length > 0) {
    // Exibe os últimos 6 meses com movimentação ativa
    finalCashFlow = cashFlowRows.slice(-6).map((r) => {
      const [y, m] = r.month_key.split("-");
      const monthIndex = parseInt(m, 10) - 1;
      const label = `${MONTHS_PT[monthIndex] || m}/${y.slice(2)}`;
      return {
        month: label,
        recebido: r.recebido,
        pago: r.pago,
        aReceber: r.aReceber,
      };
    });
  }

  // Categorias de fornecedores
  const categoryData = categoryDataRaw.map((c) => ({
    category: c.category,
    amount: c.amount,
    count: c.count,
  }));

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
      alertSummary={alertSummary}
      upcomingExcursions={upcomingExcursions}
    />
  );
}
