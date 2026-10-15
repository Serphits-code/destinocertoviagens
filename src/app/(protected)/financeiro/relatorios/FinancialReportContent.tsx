"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Filter,
  Search,
  Download,
  Printer,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  User,
  CreditCard,
  PieChart,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from "recharts";
import type {
  FinancialReportResponse,
  FinancialReportFilters,
} from "@/lib/actions/financial-reports";

interface FinancialReportContentProps {
  initialData: FinancialReportResponse;
  initialFilters: FinancialReportFilters;
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function fmtPercent(v: number) {
  return `${v.toFixed(1)}%`;
}

export function FinancialReportContent({
  initialData,
  initialFilters,
}: FinancialReportContentProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filtros locais
  const [period, setPeriod] = useState(initialFilters.period || "month");
  const [startDate, setStartDate] = useState(initialFilters.startDate || "");
  const [endDate, setEndDate] = useState(initialFilters.endDate || "");
  const [dateBasis, setDateBasis] = useState(initialFilters.dateBasis || "dueDate");
  const [kind, setKind] = useState(initialFilters.kind || "ALL");
  const [status, setStatus] = useState(initialFilters.status || "ALL");
  const [paymentMethod, setPaymentMethod] = useState(initialFilters.paymentMethod || "ALL");
  const [search, setSearch] = useState(initialFilters.search || "");
  const [activeTab, setActiveTab] = useState<"executive" | "detailed">("executive");

  const { kpis, dre, timelineChart, paymentMethods, entries, totalCount, page, totalPages } =
    initialData;

  const applyFilters = (override: Partial<FinancialReportFilters> = {}) => {
    startTransition(() => {
      const params = new URLSearchParams();
      const nextPeriod = override.period ?? period;
      params.set("period", nextPeriod);

      if (nextPeriod === "custom") {
        if (override.startDate ?? startDate) params.set("startDate", override.startDate ?? startDate);
        if (override.endDate ?? endDate) params.set("endDate", override.endDate ?? endDate);
      }

      const nextBasis = override.dateBasis ?? dateBasis;
      if (nextBasis !== "dueDate") params.set("dateBasis", nextBasis);

      const nextKind = override.kind ?? kind;
      if (nextKind !== "ALL") params.set("kind", nextKind);

      const nextStatus = override.status ?? status;
      if (nextStatus !== "ALL") params.set("status", nextStatus);

      const nextMethod = override.paymentMethod ?? paymentMethod;
      if (nextMethod !== "ALL") params.set("paymentMethod", nextMethod);

      const nextSearch = override.search !== undefined ? override.search : search;
      if (nextSearch.trim()) params.set("search", nextSearch.trim());

      const nextPage = override.page ?? 1;
      if (nextPage > 1) params.set("page", String(nextPage));

      router.push(`/financeiro/relatorios?${params.toString()}`);
    });
  };

  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Tipo",
      "Descricao",
      "Documento",
      "Valor",
      "Vencimento",
      "Data Pagamento",
      "Status",
      "Forma Pagamento",
      "Cliente/Pagante",
      "Fornecedor",
      "Venda",
    ];

    const rows = entries.map((e) => [
      e.id,
      e.kind,
      `"${(e.description || "").replace(/"/g, '""')}"`,
      `"${e.document || ""}"`,
      e.amount.toFixed(2),
      e.dueDate,
      e.paidAt || "",
      e.status,
      `"${e.paymentMethodName || e.paymentMethod || ""}"`,
      `"${(e.customerName || "").replace(/"/g, '""')}"`,
      `"${(e.supplierName || "").replace(/"/g, '""')}"`,
      `"${e.saleNumber || ""}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `relatorio_financeiro_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-6 rounded-2xl border border-border shadow-shadow-card">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <BarChart3 size={22} />
            </div>
            <h1 className="text-2xl font-black text-text-title tracking-tight">
              Relatório Financeiro Empresarial
            </h1>
          </div>
          <p className="text-xs text-text-muted max-w-2xl">
            Visão consolidada de receitas, despesas operacionais, fluxo de caixa, DRE gerencial e conciliação analítica para tomada de decisão executiva.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => applyFilters()}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-surface-subtle text-xs font-semibold text-text-body hover:bg-surface transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={isPending ? "animate-spin text-primary" : ""} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-surface-subtle hover:bg-surface text-xs font-semibold text-text-body transition-all cursor-pointer"
          >
            <Download size={14} className="text-primary" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-md transition-all cursor-pointer"
          >
            <Printer size={14} />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros Pertinentes */}
      <div className="bg-surface rounded-2xl border border-border shadow-shadow-card p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2 text-xs font-bold text-text-title">
            <SlidersHorizontal size={15} className="text-primary" />
            <span>Filtros do Relatório</span>
          </div>

          {/* Presets Rápidos de Período */}
          <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-xl border border-border/60 flex-wrap">
            {[
              { id: "today", label: "Hoje" },
              { id: "week", label: "Esta Semana" },
              { id: "month", label: "Este Mês" },
              { id: "last_month", label: "Mês Anterior" },
              { id: "year", label: "Este Ano" },
              { id: "all", label: "Todo o Período" },
              { id: "custom", label: "Personalizado" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPeriod(p.id as any);
                  applyFilters({ period: p.id as any });
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  period === p.id
                    ? "bg-primary text-white shadow-xs"
                    : "text-text-muted hover:text-text-body hover:bg-surface"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Linha de Controles Específicos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Natureza */}
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">
              Natureza do Fluxo
            </label>
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as any);
                applyFilters({ kind: e.target.value as any });
              }}
              className="w-full px-2.5 py-1.5 rounded-xl border border-border bg-surface text-xs text-text-title font-medium focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">Todas as Movimentações</option>
              <option value="RECEBIMENTO">🟢 Receitas (Entradas)</option>
              <option value="PAGAMENTO">🔴 Despesas (Saídas)</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">
              Status da Conta
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as any);
                applyFilters({ status: e.target.value as any });
              }}
              className="w-full px-2.5 py-1.5 rounded-xl border border-border bg-surface text-xs text-text-title font-medium focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">Todos os Status</option>
              <option value="PAGO">Liquidado / Pago</option>
              <option value="PENDENTE">Pendente / Em Aberto</option>
              <option value="VENCIDO">⚠️ Vencido (Atrasado)</option>
            </select>
          </div>

          {/* Base de Data */}
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">
              Referência de Data
            </label>
            <select
              value={dateBasis}
              onChange={(e) => {
                setDateBasis(e.target.value as any);
                applyFilters({ dateBasis: e.target.value as any });
              }}
              className="w-full px-2.5 py-1.5 rounded-xl border border-border bg-surface text-xs text-text-title font-medium focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="dueDate">Data de Vencimento</option>
              <option value="paidAt">Data de Pagamento</option>
              <option value="issueDate">Data de Emissão</option>
            </select>
          </div>

          {/* Forma de Pagamento */}
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">
              Forma de Pagamento
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                applyFilters({ paymentMethod: e.target.value });
              }}
              className="w-full px-2.5 py-1.5 rounded-xl border border-border bg-surface text-xs text-text-title font-medium focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">Todas as Formas</option>
              <option value="PIX">PIX</option>
              <option value="CARTAO_CREDITO">Cartão de Crédito</option>
              <option value="BOLETO">Boleto Bancário</option>
              <option value="CARTAO_DEBITO">Cartão de Débito</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="BANCO">Transferência / Depósito</option>
              <option value="CREDITO">Crédito / Vale</option>
            </select>
          </div>

          {/* Busca Textual */}
          <div className="sm:col-span-2">
            <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">
              Buscar Cliente / Fornecedor / Título
            </label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters({ search })}
                placeholder="Nome, documento, fornecedor ou nota..."
                className="w-full pl-8 pr-12 py-1.5 rounded-xl border border-border bg-surface text-xs text-text-body focus:outline-none focus:border-primary"
              />
              <Search size={14} className="absolute left-2.5 top-2.5 text-text-muted pointer-events-none" />
              <button
                type="button"
                onClick={() => applyFilters({ search })}
                className="absolute right-1.5 top-1 px-2 py-0.5 rounded-md bg-primary text-white text-[11px] font-bold cursor-pointer"
              >
                Filtrar
              </button>
            </div>
          </div>
        </div>

        {/* Intervalo Personalizado (se selecionado) */}
        {period === "custom" && (
          <div className="flex items-center gap-3 pt-2 border-t border-border/40 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-text-muted">De:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-border bg-surface text-text-title text-xs cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-text-muted">Até:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-border bg-surface text-text-title text-xs cursor-pointer"
              />
            </div>
            <button
              onClick={() => applyFilters({ startDate, endDate })}
              className="px-3 py-1 rounded-lg bg-primary text-white font-bold text-xs cursor-pointer"
            >
              Aplicar Intervalo
            </button>
          </div>
        )}
      </div>

      {/* Cards de Indicadores Executivos (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Receita Realizada */}
        <div className="bg-surface p-4 rounded-2xl border border-border shadow-shadow-card space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Receitas Realizadas
            </span>
            <div className="p-1 rounded-lg bg-status-success/15 text-status-success">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <span className="text-xl font-black text-status-success block">
            {fmt(kpis.receitasPagas)}
          </span>
          <span className="text-[11px] text-text-muted block">
            + {fmt(kpis.receitasPendentes)} a receber
          </span>
        </div>

        {/* Despesas Pagas */}
        <div className="bg-surface p-4 rounded-2xl border border-border shadow-shadow-card space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Despesas Realizadas
            </span>
            <div className="p-1 rounded-lg bg-status-danger/15 text-status-danger">
              <ArrowDownRight size={16} />
            </div>
          </div>
          <span className="text-xl font-black text-status-danger block">
            {fmt(kpis.despesasPagas)}
          </span>
          <span className="text-[11px] text-text-muted block">
            + {fmt(kpis.despesasPendentes)} a pagar
          </span>
        </div>

        {/* Lucro Líquido Realizado */}
        <div className="bg-surface p-4 rounded-2xl border border-border shadow-shadow-card space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Lucro Líquido Realizado
            </span>
            <span
              className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                kpis.lucroRealizado >= 0
                  ? "bg-status-success/15 text-status-success"
                  : "bg-status-danger/15 text-status-danger"
              }`}
            >
              {fmtPercent(kpis.margemRealizadaPercent)}
            </span>
          </div>
          <span
            className={`text-xl font-black block ${
              kpis.lucroRealizado >= 0 ? "text-primary" : "text-status-danger"
            }`}
          >
            {fmt(kpis.lucroRealizado)}
          </span>
          <span className="text-[11px] text-text-muted block">
            Projetado: {fmt(kpis.lucroProjetado)}
          </span>
        </div>

        {/* Inadimplência / Vencidos a Receber */}
        <div className="bg-surface p-4 rounded-2xl border border-border shadow-shadow-card space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Atrasos a Receber
            </span>
            <div className="p-1 rounded-lg bg-amber-500/15 text-amber-500">
              <AlertTriangle size={16} />
            </div>
          </div>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400 block">
            {fmt(kpis.vencidosReceber)}
          </span>
          <span className="text-[11px] text-text-muted block">
            Títulos vencidos de clientes
          </span>
        </div>

        {/* Contas Vencidas a Pagar */}
        <div className="bg-surface p-4 rounded-2xl border border-border shadow-shadow-card space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Atrasos a Pagar
            </span>
            <div className="p-1 rounded-lg bg-status-danger/15 text-status-danger">
              <Clock size={16} />
            </div>
          </div>
          <span className="text-xl font-black text-status-danger block">
            {fmt(kpis.vencidosPagar)}
          </span>
          <span className="text-[11px] text-text-muted block">
            Débitos com fornecedores
          </span>
        </div>
      </div>

      {/* Seleção de Abas do Relatório */}
      <div className="flex items-center justify-between border-b border-border/80">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab("executive")}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "executive"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text-body"
            }`}
          >
            <BarChart3 size={16} />
            <span>Visão Executiva &amp; DRE Gerencial</span>
          </button>

          <button
            onClick={() => setActiveTab("detailed")}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "detailed"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text-body"
            }`}
          >
            <FileSpreadsheet size={16} />
            <span>Listagem Analítica de Movimentações ({totalCount})</span>
          </button>
        </div>
      </div>

      {/* Conteúdo da Aba Executiva */}
      {activeTab === "executive" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Gráfico de Evolução Financeira */}
          <div className="lg:col-span-8 bg-surface rounded-2xl border border-border shadow-shadow-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-text-title flex items-center gap-2">
                  <TrendingUp size={16} className="text-primary" />
                  Evolução de Receitas vs Despesas
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Comparativo cronológico de entradas e saídas liquidadas
                </p>
              </div>
            </div>

            <div className="h-[280px] w-full pt-2">
              {timelineChart.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-text-muted">
                  Nenhuma movimentação para exibir no gráfico neste período.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timelineChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: any) => [fmt(Number(val) || 0), ""]}
                      contentStyle={{
                        borderRadius: "12px",
                        fontSize: "12px",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="receitas" name="Receitas (Entradas)" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesas" name="Despesas (Saídas)" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Formas de Pagamento */}
          <div className="lg:col-span-4 bg-surface rounded-2xl border border-border shadow-shadow-card p-5 space-y-4">
            <div>
              <h3 className="font-bold text-sm text-text-title flex items-center gap-2">
                <CreditCard size={16} className="text-primary" />
                Mix de Formas de Pagamento
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Distribuição de liquidez por método
              </p>
            </div>

            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {paymentMethods.length === 0 ? (
                <p className="text-xs text-text-muted italic py-8 text-center">
                  Sem dados para este filtro.
                </p>
              ) : (
                paymentMethods.slice(0, 7).map((m) => (
                  <div key={m.method} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-text-title truncate pr-2">
                        {m.label}
                      </span>
                      <span className="font-bold text-text-title shrink-0">
                        {fmt(m.total)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-subtle overflow-hidden flex">
                      <div
                        className="bg-status-success h-full"
                        style={{
                          width: `${(m.receitas / (m.total || 1)) * 100}%`,
                        }}
                      />
                      <div
                        className="bg-status-danger h-full"
                        style={{
                          width: `${(m.despesas / (m.total || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* DRE Gerencial Sintético */}
          <div className="lg:col-span-12 bg-surface rounded-2xl border border-border shadow-shadow-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-text-title flex items-center gap-2">
                  <FileSpreadsheet size={18} className="text-primary" />
                  DRE Gerencial Sintético (Demonstração do Resultado)
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Estrutura contábil para avaliação de rentabilidade e margem operacional da empresa
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-text-muted uppercase text-[10px] tracking-wider text-left">
                    <th className="py-2.5 px-3">Estrutura de Resultados</th>
                    <th className="py-2.5 px-3 text-right">Valor Consolidado</th>
                    <th className="py-2.5 px-3 text-right">% S/ Receita</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {dre.map((row, i) => (
                    <tr
                      key={i}
                      className={
                        row.tipo === "resultado"
                          ? "bg-primary/10 font-black text-sm text-primary"
                          : row.tipo === "subtotal"
                          ? "bg-surface-subtle font-bold text-text-title"
                          : "text-text-body hover:bg-surface-subtle/50 transition-colors"
                      }
                    >
                      <td className="py-2.5 px-3 whitespace-pre">{row.label}</td>
                      <td
                        className={`py-2.5 px-3 text-right tabular-nums font-mono ${
                          row.tipo === "custo" ? "text-status-danger" : ""
                        }`}
                      >
                        {row.tipo === "custo" ? `(${fmt(row.valor)})` : fmt(row.valor)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-text-muted">
                        {row.percentual !== undefined ? fmtPercent(row.percentual) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba Detalhada (Listagem Analítica) */}
      {activeTab === "detailed" && (
        <div className="bg-surface rounded-2xl border border-border shadow-shadow-card p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-sm text-text-title">
                Movimentações Financeiras Detalhadas
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Página {page} de {totalPages || 1} • {totalCount} registros encontrados
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-text-muted uppercase text-[10px] tracking-wider text-left">
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Descrição / Título</th>
                  <th className="py-2.5 px-3">Contraparte</th>
                  <th className="py-2.5 px-3">Vencimento</th>
                  <th className="py-2.5 px-3">Pagamento</th>
                  <th className="py-2.5 px-3">Forma</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-text-muted italic">
                      Nenhuma movimentação encontrada para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  entries.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-subtle transition-colors">
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            item.kind === "RECEBIMENTO"
                              ? "bg-status-success/15 text-status-success"
                              : "bg-status-danger/15 text-status-danger"
                          }`}
                        >
                          {item.kind === "RECEBIMENTO" ? "ENTRADA" : "SAÍDA"}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-semibold text-text-title max-w-[280px] truncate">
                        <span title={item.description}>{item.description}</span>
                        {item.document && (
                          <span className="block text-[10px] font-normal text-text-muted">
                            Doc: {item.document}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-text-body max-w-[200px] truncate">
                        {item.customerName ? (
                          <span className="flex items-center gap-1" title={item.customerName}>
                            <User size={12} className="text-primary shrink-0" />
                            <span className="truncate">{item.customerName}</span>
                          </span>
                        ) : item.supplierName ? (
                          <span className="flex items-center gap-1" title={item.supplierName}>
                            <Building2 size={12} className="text-amber-500 shrink-0" />
                            <span className="truncate">{item.supplierName}</span>
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 tabular-nums font-mono text-text-muted">
                        {item.dueDate.split("-").reverse().join("/")}
                      </td>

                      <td className="py-2.5 px-3 tabular-nums font-mono text-text-muted">
                        {item.paidAt ? item.paidAt.split("-").reverse().join("/") : "—"}
                      </td>

                      <td className="py-2.5 px-3 text-text-muted">
                        {item.paymentMethodName || item.paymentMethod || "—"}
                      </td>

                      <td className="py-2.5 px-3">
                        {item.status === "PAGO" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-status-success">
                            <CheckCircle2 size={12} /> Pago
                          </span>
                        ) : item.isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-status-danger animate-pulse">
                            <AlertTriangle size={12} /> Atrasado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-text-muted">
                            <Clock size={12} /> Aberto
                          </span>
                        )}
                      </td>

                      <td
                        className={`py-2.5 px-3 text-right tabular-nums font-mono font-bold ${
                          item.kind === "RECEBIMENTO"
                            ? "text-status-success"
                            : "text-status-danger"
                        }`}
                      >
                        {item.kind === "RECEBIMENTO" ? `+${fmt(item.amount)}` : `-${fmt(item.amount)}`}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-border/60">
              <span className="text-xs text-text-muted">
                Página {page} de {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => applyFilters({ page: page - 1 })}
                  className="px-2.5 py-1 rounded-lg border border-border text-xs text-text-body hover:bg-surface-subtle disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => applyFilters({ page: page + 1 })}
                  className="px-2.5 py-1 rounded-lg border border-border text-xs text-text-body hover:bg-surface-subtle disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
