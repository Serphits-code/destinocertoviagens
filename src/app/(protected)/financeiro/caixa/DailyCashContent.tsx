"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Search,
  Download,
  DollarSign,
  TrendingUp,
  CreditCard,
  Building2,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Eye,
  Table as TableIcon,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Coins,
} from "lucide-react";
import { CashDaySummary, MonthlyCashSummary } from "@/lib/actions/daily-cash";

interface DailyCashContentProps {
  dayData: CashDaySummary;
  monthData?: MonthlyCashSummary | null;
  selectedDate: string;
}

export function DailyCashContent({
  dayData,
  monthData,
  selectedDate,
}: DailyCashContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<"DIARIO" | "MENSAL">("DIARIO");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "VENDA" | "RECEBIMENTO" | "PAGAMENTO">("ALL");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");

  const handleDateChange = (newDate: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("date", newDate);
      router.push(`/financeiro/caixa?${params.toString()}`);
    });
  };

  const handleMonthChange = (direction: "prev" | "next") => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const currentDate = new Date(y, m - 1, d);
    if (direction === "prev") currentDate.setMonth(currentDate.getMonth() - 1);
    else currentDate.setMonth(currentDate.getMonth() + 1);

    const newDateStr = currentDate.toISOString().slice(0, 10);
    handleDateChange(newDateStr);
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val || 0);
  };

  // Filtragem dos itens analíticos
  const filteredItems = dayData.items.filter((item) => {
    if (typeFilter !== "ALL" && item.type !== typeFilter) return false;
    if (methodFilter !== "ALL") {
      const doc = item.document.toUpperCase();
      const meth = item.method.toUpperCase();
      if (!doc.includes(methodFilter) && !meth.includes(methodFilter)) return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const client = item.clientOrSupplier.toLowerCase();
      const desc = item.description.toLowerCase();
      const doc = item.document.toLowerCase();
      const sale = (item.saleNumber || "").toLowerCase();
      if (!client.includes(q) && !desc.includes(q) && !doc.includes(q) && !sale.includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Controles */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              📊 Espelho Planilha CAIXA 2026
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Automação Contábil em Tempo Real
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Livro Caixa & Fechamento Diário
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Separação analítica de vendas do dia, quitações de parcelas anteriores e fluxo de caixa físico.
          </p>
        </div>

        {/* Seletor de Data & Atalhos Rápidos */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => handleMonthChange("prev")}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-2">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              />
            </div>
            <button
              onClick={() => handleMonthChange("next")}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => handleDateChange("2026-07-22")}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition ${
              selectedDate === "2026-07-22"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
            }`}
          >
            🎯 Teste 22/07/2026
          </button>

          {/* Alternância de Abas */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab("DIARIO")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "DIARIO"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Dia ({dayData.dateFormatted})
            </button>
            <button
              onClick={() => setActiveTab("MENSAL")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "MENSAL"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Planilha Mensal (Grid)
            </button>
          </div>
        </div>
      </div>

      {/* CARDS DE DESTAQUE EXECUTIVO (KPIS DA PLANILHA) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* CARD 1: CAIXA FÍSICO (GAVETA / ESPÉCIE) */}
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent bg-white dark:bg-slate-900 p-5 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Coins className="w-4 h-4" />
              Caixa Físico (Gaveta)
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Dinheiro em Espécie
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {formatBRL(dayData.cashFlow.totalDinheiroEntrado)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Entrou no caixa físico nesta data
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-amber-200/50 dark:border-amber-900/30 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span>🛒 Venda do Dia (em mãos):</span>
              <span className="font-bold text-amber-700 dark:text-amber-300">
                {formatBRL(dayData.cashFlow.entradasDinheiroVenda)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span>📥 Recebimento (venda ant.):</span>
              <span className="font-bold text-amber-700 dark:text-amber-300">
                {formatBRL(dayData.cashFlow.entradasDinheiroRecebimento)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 text-[11px]">
              <span>(-) Saídas em dinheiro:</span>
              <span className="font-medium text-rose-600 dark:text-rose-400">
                {formatBRL(dayData.cashFlow.subtotalSaidas)}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 2: CONTA BANCÁRIA & PIX */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              Conta & PIX
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Líquido na Conta
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {formatBRL(dayData.bankSummary.totalPix)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Total liquidado via PIX no dia
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-emerald-200/50 dark:border-emerald-900/30 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span>🛒 PIX Venda do Dia:</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300">
                {formatBRL(dayData.bankSummary.pixVenda)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span>📥 PIX Vendas Anteriores:</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300">
                {formatBRL(dayData.bankSummary.pixRecebimento)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 text-[11px]">
              <span>🏦 Boletos Compensados:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {formatBRL(dayData.bankSummary.boletoRecebimento)}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3: TOTAL DE VENDAS EMITIDAS NO DIA */}
        <div className="bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent bg-white dark:bg-slate-900 p-5 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
              <Receipt className="w-4 h-4" />
              Vendas Emitidas
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              {dayData.salesPayments.atendimentos} Atendimentos
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {formatBRL(dayData.salesPayments.subtotal)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Volume total de contratos fechados
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-indigo-200/50 dark:border-indigo-900/30 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span>💳 À Vista (Recebido no ato):</span>
              <span className="font-bold text-indigo-700 dark:text-indigo-300">
                {formatBRL(dayData.plan.aVista)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span>📋 A Prazo / Crediário:</span>
              <span className="font-bold text-indigo-700 dark:text-indigo-300">
                {formatBRL(dayData.plan.aPrazo)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 text-[11px]">
              <span>Cartão Direto Fornecedor:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {formatBRL(dayData.salesPayments.cartaoFornecedor)}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 4: TOTAL DE RECEBIMENTOS DE VENDAS ANTERIORES */}
        <div className="bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent bg-white dark:bg-slate-900 p-5 rounded-2xl border border-cyan-200/60 dark:border-cyan-900/40 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4" />
              Recebimentos Anteriores
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
              Contas a Receber
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {formatBRL(dayData.receipts.subtotal)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Parcelas de vendas antigas quitadas hoje
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-cyan-200/50 dark:border-cyan-900/30 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span>PIX de Vendas Passadas:</span>
              <span className="font-bold text-cyan-700 dark:text-cyan-300">
                {formatBRL(dayData.receipts.pix)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span>Boletos Compensados:</span>
              <span className="font-bold text-cyan-700 dark:text-cyan-300">
                {formatBRL(dayData.receipts.boleto)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span>Dinheiro em Espécie:</span>
              <span className="font-bold text-cyan-700 dark:text-cyan-300">
                {formatBRL(dayData.receipts.dinheiro)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {activeTab === "DIARIO" ? (
        <>
          {/* PAINEL DOS 5 BLOCOS DA PLANILHA (RESUMO DO DIA) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                Estrutura das Colunas da Planilha (Dia {dayData.dateFormatted})
              </h2>
              <span className="text-xs text-slate-500">
                Fórmulas e colunas espelhadas da planilha CAIXA 2026
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
              {/* BLOCO 1: OPERAÇÕES */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-200 block border-b border-slate-200 dark:border-slate-700 pb-1">
                  1. OPERAÇÕES (PRODUTOS)
                </span>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pacotes:</span>
                    <span className="font-semibold">{formatBRL(dayData.operations.pacotes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Passagens:</span>
                    <span className="font-semibold">{formatBRL(dayData.operations.passagens)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hotéis:</span>
                    <span className="font-semibold">{formatBRL(dayData.operations.hoteis)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ingressos / Outros:</span>
                    <span className="font-semibold">{formatBRL(dayData.operations.ingressos + dayData.operations.outros)}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-slate-900 dark:text-white">
                  <span>Subtotal Op.:</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{formatBRL(dayData.operations.subtotal)}</span>
                </div>
              </div>

              {/* BLOCO 2: PLANO */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-200 block border-b border-slate-200 dark:border-slate-700 pb-1">
                  2. PLANO (CONDIÇÃO)
                </span>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">À Vista:</span>
                    <span className="font-semibold">{formatBRL(dayData.plan.aVista)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">A Prazo (Crediário):</span>
                    <span className="font-semibold">{formatBRL(dayData.plan.aPrazo)}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-slate-900 dark:text-white">
                  <span>Subtotal Plano:</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{formatBRL(dayData.plan.subtotal)}</span>
                </div>
              </div>

              {/* BLOCO 3: VENDAS (FORMAS DE PAGAMENTO) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-200 block border-b border-slate-200 dark:border-slate-700 pb-1">
                  3. VENDAS DO DIA
                </span>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dinheiro:</span>
                    <span className="font-semibold text-amber-600">{formatBRL(dayData.salesPayments.dinheiro)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Crediário:</span>
                    <span className="font-semibold">{formatBRL(dayData.salesPayments.crediario)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cartão Agência:</span>
                    <span className="font-semibold">{formatBRL(dayData.salesPayments.cartao)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cartão Fornecedor:</span>
                    <span className="font-semibold">{formatBRL(dayData.salesPayments.cartaoFornecedor)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">PIX:</span>
                    <span className="font-semibold text-emerald-600">{formatBRL(dayData.salesPayments.pix)}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-slate-900 dark:text-white">
                  <span>Subtotal Vendas:</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{formatBRL(dayData.salesPayments.subtotal)}</span>
                </div>
              </div>

              {/* BLOCO 4: RECEBIMENTOS (VENDAS ANTERIORES) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-200 block border-b border-slate-200 dark:border-slate-700 pb-1">
                  4. RECEBIMENTOS (PASSADO)
                </span>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dinheiro:</span>
                    <span className="font-semibold text-amber-600">{formatBRL(dayData.receipts.dinheiro)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">PIX:</span>
                    <span className="font-semibold text-emerald-600">{formatBRL(dayData.receipts.pix)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Boleto:</span>
                    <span className="font-semibold">{formatBRL(dayData.receipts.boleto)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cartão / Banco:</span>
                    <span className="font-semibold">{formatBRL(dayData.receipts.cartao + dayData.receipts.banco)}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-slate-900 dark:text-white">
                  <span>Subtotal Rec.:</span>
                  <span className="text-cyan-600 dark:text-cyan-400">{formatBRL(dayData.receipts.subtotal)}</span>
                </div>
              </div>

              {/* BLOCO 5: SAÍDAS & SALDO CAIXA FÍSICO */}
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-200 dark:border-amber-900/50 space-y-2">
                <span className="font-bold text-amber-800 dark:text-amber-300 block border-b border-amber-200 dark:border-amber-800 pb-1">
                  5. FLUXO CAIXA (GAVETA)
                </span>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dinheiro Vendas:</span>
                    <span className="font-semibold text-amber-700">{formatBRL(dayData.cashFlow.entradasDinheiroVenda)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dinheiro Rec.:</span>
                    <span className="font-semibold text-amber-700">{formatBRL(dayData.cashFlow.entradasDinheiroRecebimento)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Total em Espécie:</span>
                    <span className="font-black text-amber-800 dark:text-amber-300">{formatBRL(dayData.cashFlow.totalDinheiroEntrado)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">(-) Saídas/Pagos:</span>
                    <span className="font-semibold text-rose-600">{formatBRL(dayData.cashFlow.subtotalSaidas)}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-amber-200 dark:border-amber-800 flex justify-between font-bold">
                  <span className="text-slate-700 dark:text-slate-200">Saldo Fechamento:</span>
                  <span className="text-amber-800 dark:text-amber-300">{formatBRL(dayData.cashFlow.saldoFinalCaixa)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* BARRA DE FILTROS & BUSCA EM TEMPO REAL DOS ITENS */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar cliente, venda, doc..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium focus:outline-none"
              >
                <option value="ALL">Origem: Todas</option>
                <option value="VENDA">🛒 Venda do Dia</option>
                <option value="RECEBIMENTO">📥 Recebimento (Passado)</option>
                <option value="PAGAMENTO">📤 Pagamentos / Saídas</option>
              </select>

              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium focus:outline-none"
              >
                <option value="ALL">Forma: Todas</option>
                <option value="DINHEIRO">💵 Dinheiro</option>
                <option value="PIX">🟢 PIX</option>
                <option value="BOLETO">🟠 Boleto</option>
                <option value="CARTAO">🟣 Cartão</option>
                <option value="DEPOSITO">🏦 Depósito</option>
              </select>

              <div className="text-xs text-slate-500 px-2">
                {filteredItems.length} registros
              </div>
            </div>
          </div>

          {/* TABELA ANALÍTICA DE AUDITORIA DO DIA */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Detalhamento Analítico dos Lançamentos do Dia
                </h3>
                <p className="text-xs text-slate-500">
                  Conferência transparente de cada cliente e forma de liquidação
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Origem</th>
                    <th className="py-3 px-4">Documento / Forma</th>
                    <th className="py-3 px-4">Cliente / Favorecido</th>
                    <th className="py-3 px-4">Venda</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4 text-center">Emissão (Venda)</th>
                    <th className="py-3 px-4 text-center">Liquidação</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Nenhum lançamento encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const isVenda = item.type === "VENDA";
                      const isRec = item.type === "RECEBIMENTO";
                      const isPag = item.type === "PAGAMENTO";

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                        >
                          <td className="py-3 px-4">
                            {isVenda && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                🛒 Venda do Dia
                              </span>
                            )}
                            {isRec && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                                📥 Recebimento (Passado)
                              </span>
                            )}
                            {isPag && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                📤 Pagamento / Saída
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {item.document}
                            </span>
                            <span className="block text-[10px] text-slate-500">
                              {item.method}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                            {item.clientOrSupplier}
                          </td>
                          <td className="py-3 px-4">
                            {item.saleNumber ? (
                              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                #{item.saleNumber}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                            {item.description}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-600 dark:text-slate-400">
                            {item.issueDate || "-"}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-600 dark:text-slate-400">
                            {item.paidAt || "-"}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            <span
                              className={
                                isPag
                                  ? "text-rose-600 dark:text-rose-400"
                                  : isVenda
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-sky-600 dark:text-sky-400"
                              }
                            >
                              {isPag ? "-" : "+"} {formatBRL(item.amount)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* ABA 2: VISÃO MENSAL TIPO PLANILHA (GRID COM 31 DIAS) */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                Planilha Mensal Consolidada: {monthData?.monthName} {monthData?.year}
              </h3>
              <p className="text-xs text-slate-500">
                Grid de 31 dias idêntico à aba CAIXA do Excel
              </p>
            </div>
            {monthData?.totals && (
              <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-400">Vendas do Mês:</span>{" "}
                  <strong className="text-indigo-600 dark:text-indigo-400">
                    {formatBRL(monthData.totals.salesSubtotal)}
                  </strong>
                </div>
                <div className="border-l border-slate-300 dark:border-slate-600 pl-3">
                  <span className="text-slate-400">Dinheiro Entrado:</span>{" "}
                  <strong className="text-amber-600">
                    {formatBRL(monthData.totals.dinheiroTotalEntrado)}
                  </strong>
                </div>
                <div className="border-l border-slate-300 dark:border-slate-600 pl-3">
                  <span className="text-slate-400">PIX Total:</span>{" "}
                  <strong className="text-emerald-600">
                    {formatBRL(monthData.totals.pixTotalEntrado)}
                  </strong>
                </div>
              </div>
            )}
          </div>

          <div className="overflow-x-auto max-h-[600px] border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0 z-10 text-[11px] uppercase">
                <tr>
                  <th className="py-2.5 px-3 border-r border-b border-slate-200 dark:border-slate-700">Data</th>
                  <th className="py-2.5 px-3 border-r border-b border-slate-200 dark:border-slate-700 text-center">Atend.</th>
                  <th className="py-2.5 px-3 border-r border-b border-slate-200 dark:border-slate-700 text-right">Vendas Totais</th>
                  <th className="py-2.5 px-3 border-r border-b border-slate-200 dark:border-slate-700 text-right bg-amber-50/50 dark:bg-amber-950/20 text-amber-700">Vendas Dinheiro</th>
                  <th className="py-2.5 px-3 border-r border-b border-slate-200 dark:border-slate-700 text-right">Crediário</th>
                  <th className="py-2.5 px-3 border-r border-b border-slate-200 dark:border-slate-700 text-right bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700">Vendas PIX</th>
                  <th className="py-2.5 px-3 border-r border-b border-slate-200 dark:border-slate-700 text-right">Vendas Cartão</th>
                  <th className="py-2.5 px-3 border-r border-b border-slate-200 dark:border-slate-700 text-right bg-amber-50/50 dark:bg-amber-950/20 text-amber-700">Rec. Dinheiro</th>
                  <th className="py-2.5 px-3 border-r border-b border-slate-200 dark:border-slate-700 text-right bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700">Rec. PIX</th>
                  <th className="py-2.5 px-3 border-r border-b border-slate-200 dark:border-slate-700 text-right">Rec. Boleto</th>
                  <th className="py-2.5 px-3 border-r border-b border-slate-200 dark:border-slate-700 text-right text-rose-600">Saídas</th>
                  <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700 text-right font-black">Saldo Cx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                {monthData?.days.map((d) => {
                  const isSelected = d.date === selectedDate;

                  return (
                    <tr
                      key={d.date}
                      onClick={() => {
                        handleDateChange(d.date);
                        setActiveTab("DIARIO");
                      }}
                      className={`cursor-pointer transition ${
                        isSelected
                          ? "bg-emerald-50 dark:bg-emerald-950/40 font-bold"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 font-sans font-semibold">
                        {d.dateFormatted}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-center">
                        {d.salesPayments.atendimentos || "-"}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-bold">
                        {d.salesPayments.subtotal > 0 ? formatBRL(d.salesPayments.subtotal) : "-"}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-right text-amber-700 dark:text-amber-400 font-semibold bg-amber-50/30 dark:bg-amber-950/10">
                        {d.salesPayments.dinheiro > 0 ? formatBRL(d.salesPayments.dinheiro) : "-"}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-right">
                        {d.salesPayments.crediario > 0 ? formatBRL(d.salesPayments.crediario) : "-"}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-right text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50/30 dark:bg-emerald-950/10">
                        {d.salesPayments.pix > 0 ? formatBRL(d.salesPayments.pix) : "-"}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-right">
                        {d.salesPayments.cartao > 0 ? formatBRL(d.salesPayments.cartao) : "-"}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-right text-amber-700 dark:text-amber-400 font-semibold bg-amber-50/30 dark:bg-amber-950/10">
                        {d.receipts.dinheiro > 0 ? formatBRL(d.receipts.dinheiro) : "-"}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-right text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50/30 dark:bg-emerald-950/10">
                        {d.receipts.pix > 0 ? formatBRL(d.receipts.pix) : "-"}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-right">
                        {d.receipts.boleto > 0 ? formatBRL(d.receipts.boleto) : "-"}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-right text-rose-600">
                        {d.cashFlow.subtotalSaidas > 0 ? formatBRL(d.cashFlow.subtotalSaidas) : "-"}
                      </td>
                      <td className="py-2 px-3 text-right font-black text-slate-900 dark:text-white">
                        {formatBRL(d.cashFlow.saldoFinalCaixa)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
