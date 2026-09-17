"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Landmark,
  Wallet,
  CreditCard,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Calendar,
  Search,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  X,
} from "lucide-react";
import {
  BankAccountItem,
  BankStatementResult,
  BankStatementTransaction,
  createBankTransfer,
  toggleReconciliation,
} from "@/lib/actions/bank-accounts";

interface Props {
  accounts: BankAccountItem[];
  selectedAccountId: string;
  initialStatement: BankStatementResult | null;
  initialStartDate: string;
  initialEndDate: string;
}

export function BankStatementView({
  accounts,
  selectedAccountId,
  initialStatement,
  initialStartDate,
  initialEndDate,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [currentAccountId, setCurrentAccountId] = useState(selectedAccountId);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [searchFilter, setSearchFilter] = useState("");
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // Form State Transferência
  const [transferToId, setTransferToId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDate, setTransferDate] = useState(initialStartDate);
  const [transferDesc, setTransferDesc] = useState("Transferência para: APLICAÇÃO.");
  const [transferError, setTransferError] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const formatDateBR = (iso: string) => {
    if (!iso) return "-";
    const parts = iso.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return iso;
  };

  const handleApplyFilters = (newAccId?: string, newStart?: string, newEnd?: string) => {
    const acc = newAccId ?? currentAccountId;
    const s = newStart ?? startDate;
    const e = newEnd ?? endDate;
    startTransition(() => {
      router.push(`/financeiro/extrato?accountId=${acc}&startDate=${s}&endDate=${e}`);
    });
  };

  const handleToggleReconciled = async (txId: string, currentStatus: boolean) => {
    try {
      await toggleReconciliation(txId, !currentStatus);
      router.refresh();
    } catch (err: any) {
      alert("Erro ao alterar conciliação: " + err.message);
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError("");
    setTransferLoading(true);

    try {
      const numVal = parseFloat(transferAmount.replace(",", "."));
      if (isNaN(numVal) || numVal <= 0) throw new Error("Informe um valor válido.");

      await createBankTransfer({
        fromAccountId: currentAccountId,
        toAccountId: transferToId,
        amount: numVal,
        date: transferDate,
        description: transferDesc,
      });

      setTransferModalOpen(false);
      setTransferAmount("");
      router.refresh();
    } catch (err: any) {
      setTransferError(err.message);
    } finally {
      setTransferLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!initialStatement?.transactions) return;
    const headers = ["Data", "Pessoa", "CPF_CNPJ", "Classificacao", "Descricao", "Valor", "Documento", "Conciliado"];
    const rows = initialStatement.transactions.map((t) => [
      formatDateBR(t.date),
      `"${t.personName || ''}"`,
      `"${t.personDoc || ''}"`,
      `"${t.categoryName || ''}"`,
      `"${t.description}"`,
      t.amount.toFixed(2),
      `"${t.document || ''}"`,
      t.isReconciled ? "SIM" : "NAO",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `extrato_${initialStatement.account.name}_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case "APLICACAO":
        return <Coins className="w-4 h-4 text-emerald-500" />;
      case "CARTAO":
        return <CreditCard className="w-4 h-4 text-purple-500" />;
      case "CAIXA":
        return <Wallet className="w-4 h-4 text-amber-500" />;
      default:
        return <Landmark className="w-4 h-4 text-blue-500" />;
    }
  };

  // Filtrar transações por termo de busca
  const filteredTransactions = (initialStatement?.transactions || []).filter((t) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      (t.personName && t.personName.toLowerCase().includes(term)) ||
      (t.personDoc && t.personDoc.includes(term)) ||
      (t.description && t.description.toLowerCase().includes(term)) ||
      (t.categoryName && t.categoryName.toLowerCase().includes(term)) ||
      (t.document && t.document.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header com Título e Ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-(--surface) p-5 rounded-2xl border border-(--border) shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-(--text-title)">
                Extrato Bancário & Conciliação
              </h1>
              <p className="text-xs text-(--text-muted)">
                Visão oficial de livro-caixa, movimentações bancárias e conciliação da Monde
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => {
              const appAccount = accounts.find((a) => a.type === "APLICACAO");
              if (appAccount) setTransferToId(appAccount.id);
              setTransferModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-primary text-white hover:bg-primary-strong transition-colors shadow-sm"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Transferência entre Contas
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-(--border) bg-(--surface-subtle) text-(--text-body) hover:bg-(--surface-muted) transition-colors"
            title="Exportar CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Exportar
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-(--border) bg-(--surface-subtle) text-(--text-body) hover:bg-(--surface-muted) transition-colors"
            title="Imprimir"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            Imprimir
          </button>
        </div>
      </div>

      {/* Seletor de Contas em Abas Rápidas */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {accounts.map((acc) => {
          const isSelected = acc.id === currentAccountId;
          return (
            <button
              key={acc.id}
              onClick={() => {
                setCurrentAccountId(acc.id);
                handleApplyFilters(acc.id);
              }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-medium transition-all whitespace-nowrap shrink-0 shadow-xs ${
                isSelected
                  ? "bg-secondary text-white border-secondary ring-2 ring-primary/30"
                  : "bg-(--surface) text-(--text-body) border-(--border) hover:border-primary/50"
              }`}
            >
              {getAccountIcon(acc.type)}
              <span>{acc.name}</span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                  isSelected
                    ? "bg-white/15 text-white"
                    : "bg-(--surface-muted) text-(--text-title)"
                }`}
              >
                {formatCurrency(acc.currentBalance)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Barra de Filtros de Período & Busca */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-(--surface) p-4 rounded-2xl border border-(--border) shadow-xs">
        <div className="md:col-span-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
            <input
              type="text"
              placeholder="Pesquisar por pessoa, doc, descrição..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-(--border) bg-(--background) text-(--text-body) focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <div className="md:col-span-5 flex items-center gap-2">
          <div className="flex items-center gap-1.5 w-full">
            <span className="text-xs text-(--text-muted) shrink-0 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> De:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-(--border) bg-(--background) text-(--text-body) focus:ring-2 focus:ring-primary/40"
            />
            <span className="text-xs text-(--text-muted) shrink-0">Até:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-(--border) bg-(--background) text-(--text-body) focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <div className="md:col-span-3 flex items-center gap-2 justify-end">
          <button
            onClick={() => handleApplyFilters()}
            disabled={isPending}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-white hover:bg-primary-strong transition-colors"
          >
            {isPending ? "Filtrando..." : "Filtrar Período"}
          </button>
          
          <button
            onClick={() => {
              setStartDate("2026-09-15");
              setEndDate("2026-09-17");
              handleApplyFilters(undefined, "2026-09-15", "2026-09-17");
            }}
            className="px-2.5 py-2 text-[11px] font-medium rounded-xl border border-(--border) text-(--text-muted) hover:text-(--text-body) hover:bg-(--surface-muted) transition-colors whitespace-nowrap"
            title="Ver período 15 a 17/09 do print da Monde"
          >
            15 a 17/09
          </button>
        </div>
      </div>

      {/* Cards de Resumo Financeiro da Conta (Idêntico ao Monde) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-(--surface) p-4 rounded-2xl border border-(--border) shadow-xs">
          <div className="text-[11px] font-semibold text-(--text-muted) uppercase tracking-wider">
            Saldo Anterior
          </div>
          <div className="text-xl font-bold text-(--text-title) mt-1">
            {formatCurrency(initialStatement?.saldoAnterior ?? 0)}
          </div>
          <p className="text-[11px] text-(--text-muted) mt-1">Antes de {formatDateBR(startDate)}</p>
        </div>

        <div className="bg-(--surface) p-4 rounded-2xl border border-emerald-500/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Entradas (Créditos)
            </span>
            <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(initialStatement?.totalEntradas ?? 0)}
          </div>
          <p className="text-[11px] text-(--text-muted) mt-1">Receitas e transferências</p>
        </div>

        <div className="bg-(--surface) p-4 rounded-2xl border border-rose-500/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Saídas (Débitos)
            </span>
            <div className="w-6 h-6 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            - {formatCurrency(initialStatement?.totalSaidas ?? 0)}
          </div>
          <p className="text-[11px] text-(--text-muted) mt-1">Pagamentos e tarifas</p>
        </div>

        <div className="bg-(--surface) p-4 rounded-2xl border border-primary/30 shadow-xs">
          <div className="text-[11px] font-semibold text-primary uppercase tracking-wider">
            Saldo Final em {formatDateBR(endDate)}
          </div>
          <div className="text-xl font-extrabold text-(--text-title) mt-1">
            {formatCurrency(initialStatement?.saldoFinal ?? 0)}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-[11px] text-(--text-muted)">
              Conciliado com Monde
            </span>
          </div>
        </div>
      </div>

      {/* Grade do Extrato Bancário (Reproduzindo a Tela do Print da Monde) */}
      <div className="bg-(--surface) rounded-2xl border border-(--border) shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-(--border) flex items-center justify-between bg-(--surface-subtle)">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-(--text-title)">
              Extrato Detalhado da Conta: {initialStatement?.account.name || "Conta"}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
              {filteredTransactions.length} lançamentos
            </span>
          </div>

          <div className="text-xs text-(--text-muted)">
            Período: {formatDateBR(startDate)} a {formatDateBR(endDate)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-(--surface-muted) text-(--text-title) border-b border-(--border) font-semibold select-none">
              <tr>
                <th className="py-3 px-3 w-10 text-center" title="Fechado / Conciliado">Fech.</th>
                <th className="py-3 px-3 w-28">Data</th>
                <th className="py-3 px-4">Pessoa / Favorecido</th>
                <th className="py-3 px-3 w-36">CPF / CNPJ</th>
                <th className="py-3 px-4">Classificação</th>
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4 text-right w-32">Valor</th>
                <th className="py-3 px-3 w-28 text-center">Documento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border)">
              {/* Linha de Saldo Anterior */}
              <tr className="bg-(--surface-subtle)/60 text-(--text-muted) italic font-medium">
                <td className="py-2.5 px-3 text-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 inline" />
                </td>
                <td className="py-2.5 px-3 font-mono">{formatDateBR(startDate)}</td>
                <td className="py-2.5 px-4 font-semibold" colSpan={3}>
                  Saldo Anterior
                </td>
                <td className="py-2.5 px-4">Posição inicial no início do período</td>
                <td className="py-2.5 px-4 text-right font-bold text-(--text-title)">
                  {formatCurrency(initialStatement?.saldoAnterior ?? 0)}
                </td>
                <td className="py-2.5 px-3 text-center">-</td>
              </tr>

              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-(--text-muted)">
                    Nenhuma movimentação encontrada para o período selecionado.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, idx) => {
                  const isCredit = tx.amount >= 0;
                  const isTransfer = tx.description.toLowerCase().includes("transferência");

                  return (
                    <tr
                      key={tx.id || idx}
                      className={`hover:bg-primary/5 transition-colors ${
                        isTransfer ? "bg-amber-500/5" : ""
                      }`}
                    >
                      {/* Checkbox de Fechamento / Conciliação */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={tx.isReconciled}
                          onChange={() => handleToggleReconciled(tx.id, tx.isReconciled)}
                          className="rounded border-(--border) text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          title={tx.isReconciled ? "Conciliado" : "Pendente de conciliação"}
                        />
                      </td>

                      {/* Data */}
                      <td className="py-2.5 px-3 font-mono text-(--text-body) whitespace-nowrap">
                        {formatDateBR(tx.date)}
                      </td>

                      {/* Pessoa / Favorecido */}
                      <td className="py-2.5 px-4 font-medium text-(--text-title)">
                        {tx.personName || (isTransfer ? "Transferência Interna" : "-")}
                      </td>

                      {/* CPF / CNPJ */}
                      <td className="py-2.5 px-3 font-mono text-[11px] text-(--text-muted) whitespace-nowrap">
                        {tx.personDoc || "-"}
                      </td>

                      {/* Classificação */}
                      <td className="py-2.5 px-4 text-[11px]">
                        {tx.categoryName ? (
                          <span
                            className={`px-2 py-0.5 rounded-md font-semibold ${
                              isCredit
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {tx.categoryName}
                          </span>
                        ) : isTransfer ? (
                          <span className="px-2 py-0.5 rounded-md font-semibold bg-amber-500/10 text-amber-600">
                            TRANSFERÊNCIA
                          </span>
                        ) : (
                          <span className="text-(--text-muted)">-</span>
                        )}
                      </td>

                      {/* Descrição */}
                      <td className="py-2.5 px-4 text-(--text-body) max-w-xs truncate" title={tx.description}>
                        {tx.description}
                      </td>

                      {/* Valor */}
                      <td
                        className={`py-2.5 px-4 text-right font-mono font-bold whitespace-nowrap ${
                          isCredit
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {formatCurrency(tx.amount)}
                      </td>

                      {/* Documento */}
                      <td className="py-2.5 px-3 text-center">
                        {tx.document ? (
                          <span className="inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-(--surface-muted) text-(--text-body) border border-(--border)">
                            {tx.document}
                          </span>
                        ) : (
                          <span className="text-(--text-muted)">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Linha de Fechamento / Saldo Final */}
              <tr className="bg-(--surface-subtle) font-bold text-xs border-t-2 border-(--border)">
                <td className="py-3 px-3 text-center">
                  <CheckCircle2 className="w-4 h-4 text-primary inline" />
                </td>
                <td className="py-3 px-3 font-mono">{formatDateBR(endDate)}</td>
                <td className="py-3 px-4 uppercase tracking-wider text-primary" colSpan={3}>
                  Saldo Atual da Conta
                </td>
                <td className="py-3 px-4 text-(--text-muted)">
                  {filteredTransactions.length} lançamentos processados
                </td>
                <td className="py-3 px-4 text-right text-base font-extrabold text-(--text-title)">
                  {formatCurrency(initialStatement?.saldoFinal ?? 0)}
                </td>
                <td className="py-3 px-3 text-center">
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                    FECHADO
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Nova Transferência entre Contas */}
      {transferModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-(--surface) rounded-2xl border border-(--border) w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-(--border) pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-sm text-(--text-title)">
                  Transferência entre Contas
                </h3>
              </div>
              <button
                onClick={() => setTransferModalOpen(false)}
                className="text-(--text-muted) hover:text-(--text-title)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {transferError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {transferError}
              </div>
            )}

            <form onSubmit={handleCreateTransfer} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-(--text-muted) mb-1">
                  Conta de Origem:
                </label>
                <div className="p-2.5 rounded-xl border border-(--border) bg-(--surface-muted) font-semibold text-(--text-title)">
                  {initialStatement?.account.name}
                </div>
              </div>

              <div>
                <label className="block font-medium text-(--text-muted) mb-1">
                  Conta de Destino:
                </label>
                <select
                  value={transferToId}
                  onChange={(e) => setTransferToId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-(--border) bg-(--background) text-(--text-body) focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">Selecione a conta destino...</option>
                  {accounts
                    .filter((a) => a.id !== currentAccountId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatCurrency(a.currentBalance)})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-(--text-muted) mb-1">
                    Valor (R$):
                  </label>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-(--border) bg-(--background) text-(--text-body) font-mono font-bold focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block font-medium text-(--text-muted) mb-1">
                    Data:
                  </label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-(--border) bg-(--background) text-(--text-body) focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-(--text-muted) mb-1">
                  Descrição do Lançamento:
                </label>
                <input
                  type="text"
                  value={transferDesc}
                  onChange={(e) => setTransferDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-(--border) bg-(--background) text-(--text-body) focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-(--border) text-(--text-muted) hover:bg-(--surface-muted)"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={transferLoading}
                  className="px-4 py-2 rounded-xl bg-primary text-white font-bold hover:bg-primary-strong transition-colors"
                >
                  {transferLoading ? "Processando..." : "Confirmar Transferência"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
