"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Receipt,
  Search,
  Calendar,
  Users,
  Plane,
  Building2,
  DollarSign,
  ChevronRight,
  X,
  FileText,
  CreditCard,
  Tag,
  ShieldCheck,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { SaleSummaryItem, getSaleDetail, getSales } from "@/lib/actions/sales";

interface Props {
  initialData: {
    sales: SaleSummaryItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    totalFaturado: number;
  };
  initialSearch: string;
  initialStatus: string;
  initialStartDate: string;
  initialEndDate: string;
}

export function SalesListContent({
  initialData,
  initialSearch,
  initialStatus,
  initialStartDate,
  initialEndDate,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);
  const [paymentMethod, setPaymentMethod] = useState("ALL");
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);

  const isFirstMount = useRef(true);

  // Sincroniza se o servidor reenviar initialData
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Modal / Drawer de Detalhes
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [saleDetail, setSaleDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<"items" | "passengers" | "financial">("items");

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

  // Busca de dados em tempo real
  const fetchSales = useCallback(
    (
      newPage = 1,
      currentSearch = search,
      currentStatus = status,
      currentMethod = paymentMethod,
      currentStart = startDate,
      currentEnd = endDate
    ) => {
      startTransition(async () => {
        try {
          const res = await getSales({
            page: newPage,
            search: currentSearch.trim(),
            status: currentStatus,
            paymentMethod: currentMethod !== "ALL" ? currentMethod : undefined,
            startDate: currentStart || undefined,
            endDate: currentEnd || undefined,
          });
          setData(res);

          // Atualiza URL no navegador sem reload
          const p = new URLSearchParams();
          if (newPage > 1) p.set("page", String(newPage));
          if (currentSearch.trim()) p.set("search", currentSearch.trim());
          if (currentStatus !== "ALL") p.set("status", currentStatus);
          if (currentMethod !== "ALL") p.set("paymentMethod", currentMethod);
          if (currentStart) p.set("startDate", currentStart);
          if (currentEnd) p.set("endDate", currentEnd);
          const q = p.toString();
          window.history.replaceState(null, "", q ? `/vendas?${q}` : "/vendas");
        } catch (err) {
          console.error("Erro ao buscar vendas:", err);
        }
      });
    },
    [search, status, paymentMethod, startDate, endDate]
  );

  // Debounce de 250ms para pesquisa ao digitar
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetchSales(1, search, status, paymentMethod, startDate, endDate);
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);

  // Disparo imediato na troca de filtros
  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    fetchSales(1, search, newStatus, paymentMethod, startDate, endDate);
  };

  const handlePaymentMethodChange = (newMethod: string) => {
    setPaymentMethod(newMethod);
    fetchSales(1, search, status, newMethod, startDate, endDate);
  };

  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    fetchSales(1, search, status, paymentMethod, newStart, endDate);
  };

  const handleEndDateChange = (newEnd: string) => {
    setEndDate(newEnd);
    fetchSales(1, search, status, paymentMethod, startDate, newEnd);
  };

  const handleClearSearch = () => {
    setSearch("");
    fetchSales(1, "", status, paymentMethod, startDate, endDate);
  };

  const handleClearAll = () => {
    setSearch("");
    setStatus("ALL");
    setPaymentMethod("ALL");
    setStartDate("");
    setEndDate("");
    fetchSales(1, "", "ALL", "ALL", "", "");
  };

  const handleOpenDetail = async (id: string) => {
    setSelectedSaleId(id);
    setLoadingDetail(true);
    try {
      const detail = await getSaleDetail(id);
      setSaleDetail(detail);
    } catch (err: any) {
      alert("Erro ao carregar detalhes da venda: " + err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "CONFIRMADA":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">CONFIRMADA</span>;
      case "CANCELADA":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600">CANCELADA</span>;
      case "ORCAMENTO":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600">ORÇAMENTO</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600">{st}</span>;
    }
  };

  const getPaymentBadge = (method: string | null) => {
    switch (method) {
      case "PIX":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 whitespace-nowrap">🟢 PIX</span>;
      case "CARTAO_CREDITO":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20 whitespace-nowrap">🟣 Cartão</span>;
      case "CARTAO_DEBITO":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 border border-sky-500/20 whitespace-nowrap">🔵 Débito</span>;
      case "BOLETO":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 whitespace-nowrap">🟠 Boleto</span>;
      case "DINHEIRO":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-600 border border-teal-500/20 whitespace-nowrap">💵 Dinheiro</span>;
      case "BANCO":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 whitespace-nowrap">🏦 Banco</span>;
      case "CREDITO":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 whitespace-nowrap">🎫 Crédito</span>;
      case "FATURADO":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-600 border border-slate-500/20 whitespace-nowrap">📋 Faturado</span>;
      case "MISTO":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-600 border border-violet-500/20 whitespace-nowrap">🔀 Misto</span>;
      default:
        return <span className="text-[11px] text-(--text-muted)">-</span>;
    }
  };

  const hasActiveFilters = Boolean(search.trim() || status !== "ALL" || paymentMethod !== "ALL" || startDate || endDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-(--surface) p-5 rounded-2xl border border-(--border) shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-(--text-title)">
              Vendas & Emissões da Agência
            </h1>
            <p className="text-xs text-(--text-muted)">
              Controle central de vendas, pacotes, trechos aéreos, recebimentos e passageiros
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-(--surface) p-4 rounded-2xl border border-(--border) shadow-xs">
          <div className="text-[11px] font-semibold text-(--text-muted) uppercase">Total de Vendas</div>
          <div className="text-2xl font-extrabold text-(--text-title) mt-1">{data.total.toLocaleString("pt-BR")}</div>
          <p className="text-[11px] text-(--text-muted) mt-1">Registradas no histórico</p>
        </div>

        <div className="bg-(--surface) p-4 rounded-2xl border border-(--border) shadow-xs">
          <div className="text-[11px] font-semibold text-emerald-600 uppercase">Faturamento Total</div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{formatCurrency(data.totalFaturado)}</div>
          <p className="text-[11px] text-(--text-muted) mt-1">Volume acumulado de vendas</p>
        </div>

        <div className="bg-(--surface) p-4 rounded-2xl border border-(--border) shadow-xs">
          <div className="text-[11px] font-semibold text-primary uppercase">Ticket Médio</div>
          <div className="text-2xl font-extrabold text-primary mt-1">
            {data.total > 0 ? formatCurrency(data.totalFaturado / data.total) : "R$ 0,00"}
          </div>
          <p className="text-[11px] text-(--text-muted) mt-1">Média por contrato de viagem</p>
        </div>

        <div className="bg-(--surface) p-4 rounded-2xl border border-(--border) shadow-xs">
          <div className="text-[11px] font-semibold text-blue-600 uppercase">Página Atual</div>
          <div className="text-2xl font-extrabold text-blue-600 mt-1">
            {data.page} / {data.totalPages || 1}
          </div>
          <p className="text-[11px] text-(--text-muted) mt-1">Mostrando {data.sales.length} vendas</p>
        </div>
      </div>

      {/* Barra de Filtros com Pesquisa em Tempo Real */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-(--surface) p-4 rounded-2xl border border-(--border) shadow-xs items-center">
        {/* Busca por texto */}
        <div className="md:col-span-3 relative">
          {isPending ? (
            <Loader2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary animate-spin" />
          ) : (
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
          )}
          <input
            type="text"
            placeholder="Nº Venda, Cliente, CPF, Vendedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-(--border) bg-(--background) text-(--text-body) focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-(--text-muted) hover:text-(--text-title) p-0.5 rounded-full cursor-pointer transition-colors"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status */}
        <div className="md:col-span-2">
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full py-2 px-3 text-xs rounded-xl border border-(--border) bg-(--background) text-(--text-body) focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
          >
            <option value="ALL">Todos os Status</option>
            <option value="CONFIRMADA">Confirmadas</option>
            <option value="ORCAMENTO">Orçamentos</option>
            <option value="CANCELADA">Canceladas</option>
          </select>
        </div>

        {/* Forma de Pagamento */}
        <div className="md:col-span-3">
          <select
            value={paymentMethod}
            onChange={(e) => handlePaymentMethodChange(e.target.value)}
            className="w-full py-2 px-3 text-xs rounded-xl border border-(--border) bg-(--background) text-(--text-body) focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer font-medium"
          >
            <option value="ALL">Todas Formas de Pagamento</option>
            <option value="PIX">🟢 PIX / Depósito em Conta</option>
            <option value="CARTAO_CREDITO">🟣 Cartão de Crédito</option>
            <option value="CARTAO_DEBITO">🔵 Cartão de Débito</option>
            <option value="BOLETO">🟠 Boleto Bancário</option>
            <option value="DINHEIRO">💵 Dinheiro / Espécie</option>
            <option value="BANCO">🏦 Débito em Conta (Banco)</option>
            <option value="CREDITO">🎫 Crédito na Agência</option>
            <option value="FATURADO">📋 Faturado</option>
            <option value="MISTO">🔀 Pagamento Misto</option>
          </select>
        </div>

        {/* Datas e Limpar */}
        <div className="md:col-span-4 flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1">
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded-xl border border-(--border) bg-(--background) text-(--text-body) focus:outline-none focus:ring-2 focus:ring-primary/40"
              title="Data Inicial"
            />
            <span className="text-xs text-(--text-muted)">a</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded-xl border border-(--border) bg-(--background) text-(--text-body) focus:outline-none focus:ring-2 focus:ring-primary/40"
              title="Data Final"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2.5 py-1.5 text-[11px] font-medium rounded-xl border border-(--border) text-(--text-muted) hover:text-rose-500 hover:border-rose-500/30 hover:bg-rose-500/5 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
              title="Limpar todos os filtros"
            >
              <RotateCcw className="w-3 h-3" />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Tabela de Vendas */}
      <div className="bg-(--surface) rounded-2xl border border-(--border) shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-(--surface-muted) text-(--text-title) border-b border-(--border) font-semibold">
              <tr>
                <th className="py-3 px-4 w-24">Venda #</th>
                <th className="py-3 px-3 w-28">Data Venda</th>
                <th className="py-3 px-4">Cliente Pagante</th>
                <th className="py-3 px-3 w-32">CPF</th>
                <th className="py-3 px-4">Vendedor</th>
                <th className="py-3 px-3 text-center">Pagamento</th>
                <th className="py-3 px-3 text-center">Itens</th>
                <th className="py-3 px-3 text-center">Passag.</th>
                <th className="py-3 px-4 text-right w-32">Valor Total</th>
                <th className="py-3 px-3 text-center w-28">Status</th>
                <th className="py-3 px-3 text-center w-12">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border)">
              {data.sales.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-(--text-muted)">
                    {isPending ? "Carregando resultados..." : "Nenhuma venda encontrada com os critérios informados."}
                  </td>
                </tr>
              ) : (
                data.sales.map((sale) => (
                  <tr
                    key={sale.id}
                    onClick={() => handleOpenDetail(sale.id)}
                    className="hover:bg-primary/5 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-primary">
                      #{sale.saleNumber}
                    </td>
                    <td className="py-3 px-3 font-mono text-(--text-muted)">
                      {formatDateBR(sale.saleDate)}
                    </td>
                    <td className="py-3 px-4 font-medium text-(--text-title)">
                      {sale.customerName}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-(--text-muted)">
                      {sale.customerDoc || "-"}
                    </td>
                    <td className="py-3 px-4 text-(--text-body)">
                      {sale.sellerName || "-"}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {getPaymentBadge(sale.primaryPaymentMethod)}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-(--text-muted)">
                      {sale.itemsCount}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-(--text-muted)">
                      {sale.passengersCount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-(--text-title)">
                      {formatCurrency(sale.finalAmount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {getStatusBadge(sale.status)}
                    </td>
                    <td className="py-3 px-3 text-center text-(--text-muted)">
                      <ChevronRight className="w-4 h-4 inline" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {data.totalPages > 1 && (
          <div className="p-4 border-t border-(--border) flex items-center justify-between bg-(--surface-subtle) text-xs">
            <span className="text-(--text-muted)">
              Total: {data.total} vendas
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchSales(data.page - 1)}
                disabled={data.page <= 1 || isPending}
                className="px-3 py-1.5 rounded-lg border border-(--border) bg-(--surface) text-(--text-body) disabled:opacity-40 cursor-pointer"
              >
                Anterior
              </button>
              <span className="font-semibold text-(--text-title)">
                {data.page} de {data.totalPages}
              </span>
              <button
                onClick={() => fetchSales(data.page + 1)}
                disabled={data.page >= data.totalPages || isPending}
                className="px-3 py-1.5 rounded-lg border border-(--border) bg-(--surface) text-(--text-body) disabled:opacity-40 cursor-pointer"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer Lateral de Detalhes da Venda */}
      {selectedSaleId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-end z-50">
          <div className="bg-(--surface) w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-(--border) overflow-hidden animate-in slide-in-from-right">
            {/* Header Drawer */}
            <div className="p-5 border-b border-(--border) flex items-center justify-between bg-(--surface-subtle)">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                  #{saleDetail?.saleNumber || "..."}
                </div>
                <div>
                  <h3 className="font-bold text-base text-(--text-title)">
                    Venda #{saleDetail?.saleNumber}
                  </h3>
                  <p className="text-xs text-(--text-muted)">
                    Emitida em {formatDateBR(saleDetail?.saleDate)} | Pagante: {saleDetail?.customer.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedSaleId(null);
                  setSaleDetail(null);
                }}
                className="p-1.5 rounded-lg hover:bg-(--surface-muted) text-(--text-muted)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetail || !saleDetail ? (
              <div className="flex-1 flex items-center justify-center text-xs text-(--text-muted)">
                Carregando detalhes completos da venda...
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Resumo Rápido */}
                <div className="p-5 bg-(--background)/50 border-b border-(--border) grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-(--text-muted) block">Total da Venda</span>
                    <span className="font-bold text-base text-primary">
                      {formatCurrency(saleDetail.finalAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-(--text-muted) block">Embarque Previsto</span>
                    <span className="font-semibold text-(--text-title)">
                      {formatDateBR(saleDetail.departureDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-(--text-muted) block">Vendedor</span>
                    <span className="font-semibold text-(--text-title)">
                      {saleDetail.seller?.name || "Direto"}
                    </span>
                  </div>
                </div>

                {/* Abas */}
                <div className="flex border-b border-(--border) px-5 bg-(--surface)">
                  <button
                    onClick={() => setActiveTab("items")}
                    className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                      activeTab === "items"
                        ? "border-primary text-primary"
                        : "border-transparent text-(--text-muted) hover:text-(--text-title)"
                    }`}
                  >
                    <Plane className="w-4 h-4" />
                    Itens & Serviços ({saleDetail.items.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("passengers")}
                    className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                      activeTab === "passengers"
                        ? "border-primary text-primary"
                        : "border-transparent text-(--text-muted) hover:text-(--text-title)"
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Passageiros ({saleDetail.passengers.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("financial")}
                    className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                      activeTab === "financial"
                        ? "border-primary text-primary"
                        : "border-transparent text-(--text-muted) hover:text-(--text-title)"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Financeiro ({saleDetail.financialEntries.length})
                  </button>
                </div>

                {/* Conteúdo da Aba */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  {activeTab === "items" && (
                    <div className="space-y-3">
                      {saleDetail.items.length === 0 ? (
                        <p className="text-xs text-(--text-muted) py-6 text-center">Nenhum item detalhado nesta venda.</p>
                      ) : (
                        saleDetail.items.map((item: any) => (
                          <div
                            key={item.id}
                            className="p-3.5 rounded-xl border border-(--border) bg-(--surface-subtle) space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-(--text-title) flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-bold">
                                  {item.type}
                                </span>
                                {item.description}
                              </span>
                              <span className="font-mono font-bold text-primary">
                                {formatCurrency(item.totalAmount)}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] text-(--text-muted)">
                              <div>Fornecedor: <span className="text-(--text-title) font-medium">{item.supplier?.name || "Não informado"}</span></div>
                              {item.locCode && <div>Localizador (PNR): <span className="font-mono font-bold text-(--text-title)">{item.locCode}</span></div>}
                              {item.startDate && <div>Início: <span className="text-(--text-title)">{formatDateBR(item.startDate)}</span></div>}
                              {item.endDate && <div>Término: <span className="text-(--text-title)">{formatDateBR(item.endDate)}</span></div>}
                              {item.roomType && <div>Acomodação: <span className="text-(--text-title)">{item.roomType}</span></div>}
                              {item.boardType && <div>Regime: <span className="text-(--text-title)">{item.boardType}</span></div>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === "passengers" && (
                    <div className="space-y-2.5">
                      {saleDetail.passengers.length === 0 ? (
                        <p className="text-xs text-(--text-muted) py-6 text-center">Nenhum passageiro vinculado.</p>
                      ) : (
                        saleDetail.passengers.map((p: any) => (
                          <div
                            key={p.id}
                            className="p-3 rounded-xl border border-(--border) bg-(--surface-subtle) flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-(--text-title) block">
                                {p.customer.name}
                              </span>
                              <span className="text-[11px] text-(--text-muted)">
                                CPF: {p.customer.cpf || "-"} | Contato: {p.customer.mobile || "-"}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-(--surface-muted) text-(--text-body) border border-(--border)">
                              {p.role}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === "financial" && (
                    <div className="space-y-2.5">
                      {saleDetail.financialEntries.length === 0 ? (
                        <p className="text-xs text-(--text-muted) py-6 text-center">Nenhum lançamento financeiro vinculado.</p>
                      ) : (
                        saleDetail.financialEntries.map((fe: any) => (
                          <div
                            key={fe.id}
                            className="p-3 rounded-xl border border-(--border) bg-(--surface-subtle) flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  fe.kind === "RECEBIMENTO" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                                }`}>
                                  {fe.kind}
                                </span>
                                <span className="font-medium text-(--text-title)">{fe.description}</span>
                              </div>
                              <span className="text-[11px] text-(--text-muted) mt-0.5 block">
                                Vencimento: {formatDateBR(fe.dueDate)} {fe.paidAt && `| Quitado em: ${formatDateBR(fe.paidAt)}`}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-sm block">
                                {formatCurrency(fe.amount)}
                              </span>
                              <span className={`text-[10px] font-bold ${
                                fe.status === "PAGO" ? "text-emerald-600" : "text-amber-600"
                              }`}>
                                {fe.status}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
