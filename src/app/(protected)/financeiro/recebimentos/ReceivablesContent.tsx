"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  CreditCard,
  Search,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCcw,
  Receipt,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpDown,
  Building2,
} from "lucide-react";
import {
  ReceivableItem,
  ReceivablesKPIs,
  getReceivables,
  getReceivablesKPIs,
} from "@/lib/actions/receivables";

interface Props {
  initialData: {
    items: ReceivableItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    totalAmount: number;
  };
  initialKPIs: ReceivablesKPIs;
  initialSearch: string;
  initialMethod: string;
  initialStatus: string;
  initialStartDate: string;
  initialEndDate: string;
  initialDateType?: "PAID" | "DUE";
}

export function ReceivablesContent({
  initialData,
  initialKPIs,
  initialSearch,
  initialMethod,
  initialStatus,
  initialStartDate,
  initialEndDate,
  initialDateType,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const [data, setData] = useState(initialData);
  const [kpis, setKpis] = useState(initialKPIs);
  const [search, setSearch] = useState(initialSearch);
  const [paymentMethod, setPaymentMethod] = useState(initialMethod);
  const [status, setStatus] = useState(initialStatus);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [dateType, setDateType] = useState<"PAID" | "DUE">(initialDateType || "PAID");

  const isFirstMount = useRef(true);

  // Sync with initialData changes
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  useEffect(() => {
    setKpis(initialKPIs);
  }, [initialKPIs]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const formatDateBR = (iso: string | null) => {
    if (!iso) return "-";
    const parts = iso.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return iso;
  };

  const fetchReceivables = useCallback(
    (
      newPage = 1,
      currentSearch = search,
      currentMethod = paymentMethod,
      currentStatus = status,
      currentStart = startDate,
      currentEnd = endDate,
      currentDateType = dateType
    ) => {
      startTransition(async () => {
        try {
          const [resData, resKPIs] = await Promise.all([
            getReceivables({
              page: newPage,
              pageSize: 25,
              search: currentSearch.trim(),
              paymentMethod: currentMethod !== "ALL" ? currentMethod : undefined,
              status: currentStatus !== "ALL" ? currentStatus : undefined,
              startDate: currentStart || undefined,
              endDate: currentEnd || undefined,
              dateType: currentDateType,
            }),
            getReceivablesKPIs({
              startDate: currentStart || undefined,
              endDate: currentEnd || undefined,
              dateType: currentDateType,
            }),
          ]);

          setData(resData);
          setKpis(resKPIs);

          // Update URL without page reload
          const p = new URLSearchParams();
          if (newPage > 1) p.set("page", String(newPage));
          if (currentSearch.trim()) p.set("search", currentSearch.trim());
          if (currentMethod !== "ALL") p.set("method", currentMethod);
          if (currentStatus !== "ALL") p.set("status", currentStatus);
          if (currentStart) p.set("startDate", currentStart);
          if (currentEnd) p.set("endDate", currentEnd);
          if (currentDateType !== "PAID") p.set("dateType", currentDateType);
          const q = p.toString();
          window.history.replaceState(null, "", q ? `/financeiro/recebimentos?${q}` : "/financeiro/recebimentos");
        } catch (err) {
          console.error("Erro ao buscar recebimentos:", err);
        }
      });
    },
    [search, paymentMethod, status, startDate, endDate, dateType]
  );

  // Debounce for live search
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetchReceivables(1, search, paymentMethod, status, startDate, endDate, dateType);
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);

  const handleMethodChange = (newMethod: string) => {
    setPaymentMethod(newMethod);
    fetchReceivables(1, search, newMethod, status, startDate, endDate, dateType);
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    fetchReceivables(1, search, paymentMethod, newStatus, startDate, endDate, dateType);
  };

  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    fetchReceivables(1, search, paymentMethod, status, newStart, endDate, dateType);
  };

  const handleEndDateChange = (newEnd: string) => {
    setEndDate(newEnd);
    fetchReceivables(1, search, paymentMethod, status, startDate, newEnd, dateType);
  };

  const handleDateTypeChange = (newType: "PAID" | "DUE") => {
    setDateType(newType);
    fetchReceivables(1, search, paymentMethod, status, startDate, endDate, newType);
  };

  const handleClearAll = () => {
    setSearch("");
    setPaymentMethod("ALL");
    setStatus("ALL");
    setStartDate("");
    setEndDate("");
    setDateType("PAID");
    fetchReceivables(1, "", "ALL", "ALL", "", "", "PAID");
  };

  const getPaymentBadge = (method: string | null) => {
    switch (method) {
      case "PIX":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 whitespace-nowrap">
            🟢 PIX
          </span>
        );
      case "DEPOSITO_CONTA":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-600 border border-sky-500/20 whitespace-nowrap">
            🏦 Depósito em Conta
          </span>
        );
      case "CARTAO_CREDITO":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20 whitespace-nowrap">
            🟣 Cartão Crédito
          </span>
        );
      case "CARTAO_DEBITO":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-600 border border-sky-500/20 whitespace-nowrap">
            🔵 Cartão Débito
          </span>
        );
      case "BOLETO":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 whitespace-nowrap">
            🟠 Boleto
          </span>
        );
      case "DINHEIRO":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-500/10 text-teal-600 border border-teal-500/20 whitespace-nowrap">
            💵 Dinheiro
          </span>
        );
      case "BANCO":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 whitespace-nowrap">
            🏦 Débito em Conta
          </span>
        );
      case "CREDITO":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 whitespace-nowrap">
            🎫 Crédito Agência
          </span>
        );
      case "FATURADO":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-600 border border-slate-500/20 whitespace-nowrap">
            📋 Faturado
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/10 text-gray-500 border border-gray-500/20 whitespace-nowrap">
            Outros
          </span>
        );
    }
  };

  const hasActiveFilters = Boolean(
    search.trim() ||
      paymentMethod !== "ALL" ||
      status !== "ALL" ||
      startDate ||
      endDate ||
      dateType !== "PAID"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-(--surface) p-6 rounded-2xl border border-(--border) shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-xs">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-(--text-title)">
                Recebimentos por Tipo
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/15 text-primary">
                Financeiro
              </span>
            </div>
            <p className="text-xs text-(--text-muted) mt-0.5">
              Classificação analítica e detalhamento por PIX, Cartão de Crédito/Débito, Boleto, Dinheiro e Banco
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Geral */}
        <div className="bg-(--surface) p-5 rounded-2xl border border-(--border) shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
              Volume Total
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-(--text-title)">
              {formatCurrency(kpis.totalAmount)}
            </div>
            <p className="text-xs text-(--text-muted) mt-1">
              {kpis.totalCount.toLocaleString("pt-BR")} lançamentos de entrada
            </p>
          </div>
        </div>

        {/* Liquidado / Pago */}
        <div className="bg-(--surface) p-5 rounded-2xl border border-(--border) shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Recebido (Liquidado)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-600">
              {formatCurrency(kpis.paidAmount)}
            </div>
            <p className="text-xs text-(--text-muted) mt-1">
              {kpis.totalAmount > 0
                ? `${((kpis.paidAmount / kpis.totalAmount) * 100).toFixed(1)}% do total recebido`
                : "0%"}
            </p>
          </div>
        </div>

        {/* Pendente / A Vencer */}
        <div className="bg-(--surface) p-5 rounded-2xl border border-(--border) shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
              Pendente / A Receber
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-600">
              {formatCurrency(kpis.pendingAmount)}
            </div>
            <p className="text-xs text-(--text-muted) mt-1">
              {kpis.totalAmount > 0
                ? `${((kpis.pendingAmount / kpis.totalAmount) * 100).toFixed(1)}% a liquidar`
                : "0%"}
            </p>
          </div>
        </div>

        {/* Total Filtrado na Página */}
        <div className="bg-(--surface) p-5 rounded-2xl border border-primary/20 shadow-xs flex flex-col justify-between bg-gradient-to-br from-primary/5 via-transparent to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Filtrado nesta Busca
            </span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-(--text-title)">
              {formatCurrency(data.totalAmount)}
            </div>
            <p className="text-xs text-(--text-muted) mt-1">
              {data.total.toLocaleString("pt-BR")} itens encontrados
            </p>
          </div>
        </div>
      </div>

      {/* Distribution pills by Payment Method (Interactive Filter) */}
      <div className="bg-(--surface) p-4 rounded-2xl border border-(--border) shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-(--text-muted)">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" />
            <span>DISTRIBUIÇÃO POR FORMA DE PAGAMENTO (Clique para filtrar):</span>
          </div>
          <span>Total: {kpis.methods.length} modalidades ativas</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleMethodChange("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              paymentMethod === "ALL"
                ? "bg-primary text-white shadow-md shadow-primary/25"
                : "bg-(--surface-hover) text-(--text-muted) hover:text-(--text-title) hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            <span>Todos os Tipos</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {kpis.totalCount}
            </span>
          </button>

          {kpis.methods.map((m) => {
            const isSelected = paymentMethod === m.key;
            return (
              <button
                key={m.key}
                onClick={() => handleMethodChange(m.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-2 border ${
                  isSelected
                    ? "bg-primary text-white border-primary shadow-md shadow-primary/25 font-bold"
                    : "bg-(--surface-hover) border-(--border) text-(--text-title) hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                <span>{m.label}</span>
                <span className={`text-[11px] font-bold ${isSelected ? "text-white" : "text-primary"}`}>
                  {formatCurrency(m.total)}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                    isSelected ? "bg-white/20 text-white" : "bg-black/5 dark:bg-white/10 text-(--text-muted)"
                  }`}
                >
                  {m.percentage.toFixed(1)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters Bar with Real-Time Live Search */}
      <div className="bg-(--surface) p-4 rounded-2xl border border-(--border) shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Live Search Input */}
          <div className="relative md:col-span-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted)" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar em tempo real por cliente, CPF, descrição ou venda..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl text-sm bg-(--background) border border-(--border) focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-(--text-title) placeholder:text-(--text-muted) transition-all"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  fetchReceivables(1, "", paymentMethod, status, startDate, endDate, dateType);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-muted) hover:text-(--text-title) p-1"
                title="Limpar pesquisa"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Payment Method Dropdown */}
          <div className="md:col-span-3">
            <select
              value={paymentMethod}
              onChange={(e) => handleMethodChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-(--background) border border-(--border) focus:outline-none focus:border-primary text-(--text-title) cursor-pointer"
            >
              <option value="ALL">Todas as Formas de Pagamento</option>
              <option value="PIX">🟢 PIX</option>
              <option value="DEPOSITO_CONTA">🏦 Depósito em Conta</option>
              <option value="BOLETO">🟠 Boleto Bancário</option>
              <option value="DINHEIRO">💵 Dinheiro</option>
              <option value="CARTAO_CREDITO">🟣 Cartão de Crédito</option>
              <option value="CARTAO_DEBITO">🔵 Cartão de Débito</option>
              <option value="BANCO">🏦 Débito em Conta (Banco)</option>
              <option value="CREDITO">🎫 Crédito Agência</option>
              <option value="FATURADO">📋 Faturado</option>
              <option value="OUTROS">⚪ Outros</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="md:col-span-2">
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-(--background) border border-(--border) focus:outline-none focus:border-primary text-(--text-title) cursor-pointer"
            >
              <option value="ALL">Todos os Status</option>
              <option value="PAGO">Liquidado (Pago)</option>
              <option value="PENDENTE">Pendente</option>
            </select>
          </div>

          {/* Date Type Selector (Liquidação vs Vencimento) */}
          <div className="md:col-span-3 flex items-center gap-1.5">
            <select
              value={dateType}
              onChange={(e) => handleDateTypeChange(e.target.value as "PAID" | "DUE")}
              className="w-full px-3 py-2.5 rounded-xl text-xs font-bold bg-(--background) border border-(--border) focus:outline-none focus:border-primary text-(--text-title) cursor-pointer"
              title="Critério de filtragem de data"
            >
              <option value="PAID">💰 Por Data de Liquidação (Baixa)</option>
              <option value="DUE">📅 Por Data de Vencimento</option>
            </select>
          </div>
        </div>

        {/* Date Inputs Sub-bar with Clear Tag */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-(--border)/60 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span className="font-semibold text-(--text-muted)">
              Intervalo de Datas:
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                dateType === "PAID"
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/25"
                  : "bg-primary/10 text-primary border-primary/25"
              }`}
            >
              {dateType === "PAID"
                ? "Filtrando por Liquidação (Data da Baixa)"
                : "Filtrando por Data de Vencimento"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-(--background) border border-(--border) text-(--text-title) focus:outline-none focus:border-primary"
                title={
                  dateType === "PAID"
                    ? "Data inicial de liquidação (baixa)"
                    : "Data inicial de vencimento"
                }
              />
              <span className="text-(--text-muted) text-xs">até</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-(--background) border border-(--border) text-(--text-title) focus:outline-none focus:border-primary"
                title={
                  dateType === "PAID"
                    ? "Data final de liquidação (baixa)"
                    : "Data final de vencimento"
                }
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  fetchReceivables(1, search, paymentMethod, status, "", "", dateType);
                }}
                className="text-rose-500 hover:text-rose-600 p-1 text-xs flex items-center gap-0.5 cursor-pointer font-medium"
                title="Limpar datas"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Receivables Table */}
      <div className="bg-(--surface) rounded-2xl border border-(--border) shadow-xs overflow-hidden">
        <div className="p-4 border-b border-(--border) flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-(--text-title)">
              Lançamentos Financeiros de Entrada
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-black/5 dark:bg-white/10 text-(--text-muted)">
              {data.total.toLocaleString("pt-BR")} itens
            </span>
          </div>
          {isPending && (
            <div className="flex items-center gap-2 text-xs text-primary font-medium">
              <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Atualizando dados em tempo real...</span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-(--border) text-[11px] font-bold uppercase tracking-wider text-(--text-muted) bg-(--background)/50">
                <th className="py-3 px-4">Forma de Pagamento</th>
                <th className="py-3 px-4">Documento</th>
                <th className="py-3 px-4">Cliente / Favorecido</th>
                <th className="py-3 px-4">Venda & Descrição</th>
                <th
                  className={`py-3 px-4 ${
                    dateType === "DUE" && (startDate || endDate)
                      ? "bg-primary/10 text-primary font-black"
                      : ""
                  }`}
                >
                  Vencimento
                </th>
                <th
                  className={`py-3 px-4 ${
                    dateType === "PAID"
                      ? "bg-emerald-500/10 text-emerald-600 font-black"
                      : ""
                  }`}
                >
                  Baixa / Liquidação {dateType === "PAID" && (startDate || endDate) ? "✓" : ""}
                </th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Valor (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border) text-sm">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-(--text-muted) mb-3">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-(--text-title)">
                        Nenhum recebimento encontrado
                      </p>
                      <p className="text-xs text-(--text-muted) mt-1">
                        Não encontramos lançamentos correspondentes aos filtros selecionados. Experimente buscar por outro termo ou limpar os filtros.
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={handleClearAll}
                          className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                        >
                          Limpar Todos os Filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                data.items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-(--surface-hover) transition-colors group"
                  >
                    {/* Forma de Pagamento */}
                    <td className="py-3 px-4">
                      {getPaymentBadge(item.paymentMethod)}
                    </td>

                    {/* Documento */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.document ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-black/5 dark:bg-white/10 text-(--text-title) border border-(--border)">
                          {item.document}
                        </span>
                      ) : (
                        <span className="text-[11px] text-(--text-muted)">-</span>
                      )}
                    </td>

                    {/* Cliente */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-(--text-title) leading-tight">
                        {item.customerName}
                      </div>
                      {item.customerDoc && (
                        <div className="text-[11px] text-(--text-muted) mt-0.5">
                          CPF/CNPJ: {item.customerDoc}
                        </div>
                      )}
                    </td>

                    {/* Venda & Descrição */}
                    <td className="py-3 px-4 max-w-xs">
                      {item.saleNumber ? (
                        <Link
                          href={`/vendas?search=${encodeURIComponent(item.saleNumber)}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors mb-1"
                        >
                          <Receipt className="w-3 h-3" />
                          Venda #{item.saleNumber}
                          <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-60" />
                        </Link>
                      ) : (
                        <span className="text-[10px] text-(--text-muted) font-medium block mb-1">
                          Lançamento Avulso
                        </span>
                      )}
                      <div className="text-xs text-(--text-muted) truncate" title={item.description}>
                        {item.description || "Sem descrição"}
                      </div>
                    </td>

                    {/* Vencimento */}
                    <td className="py-3 px-4 text-xs font-medium text-(--text-title) whitespace-nowrap">
                      {formatDateBR(item.dueDate)}
                    </td>

                    {/* Baixa / Data Pagamento */}
                    <td className="py-3 px-4 text-xs whitespace-nowrap">
                      {item.paidAt ? (
                        <span
                          className={
                            dateType === "PAID" && (startDate || endDate)
                              ? "font-bold text-emerald-600 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-md"
                              : "text-(--text-muted)"
                          }
                        >
                          {formatDateBR(item.paidAt)}
                        </span>
                      ) : (
                        <span className="text-(--text-muted)">-</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.status === "PAGO" ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          LIQUIDADO
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          PENDENTE
                        </span>
                      )}
                    </td>

                    {/* Valor */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="font-extrabold text-sm text-(--text-title)">
                        {formatCurrency(item.amount)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {data.totalPages > 1 && (
          <div className="p-4 border-t border-(--border) flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-(--text-muted)">
            <div>
              Mostrando página <strong className="text-(--text-title)">{data.page}</strong> de{" "}
              <strong className="text-(--text-title)">{data.totalPages}</strong> ({data.total} itens)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fetchReceivables(data.page - 1, search, paymentMethod, status, startDate, endDate)}
                disabled={data.page <= 1}
                className="p-1.5 rounded-lg border border-(--border) hover:bg-(--surface-hover) disabled:opacity-40 disabled:pointer-events-none transition-colors"
                title="Página Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 font-bold text-(--text-title) bg-black/5 dark:bg-white/10 rounded-lg">
                {data.page} / {data.totalPages}
              </span>

              <button
                onClick={() => fetchReceivables(data.page + 1, search, paymentMethod, status, startDate, endDate)}
                disabled={data.page >= data.totalPages}
                className="p-1.5 rounded-lg border border-(--border) hover:bg-(--surface-hover) disabled:opacity-40 disabled:pointer-events-none transition-colors"
                title="Próxima Página"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
