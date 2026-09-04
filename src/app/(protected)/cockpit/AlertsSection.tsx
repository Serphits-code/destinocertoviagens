"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  TrendingDown,
  TrendingUp,
  User,
  Building2,
  Phone,
  MessageSquare,
  ArrowRight,
  Filter,
  Search,
} from "lucide-react";

export interface DueEntry {
  id: string;
  type: "RECEBIMENTO" | "PAGAMENTO";
  description: string;
  amount: number;
  dueDate: string | null;
  status: string;
  category: string | null;
  customer?: {
    id: string;
    name: string;
    mobile: string | null;
    phone: string | null;
  } | null;
  supplier?: {
    id: string;
    name: string;
    category: string | null;
    phone: string | null;
  } | null;
}

interface AlertsSectionProps {
  entries: DueEntry[];
  summary: {
    totalOverdueReceivables: number;
    countOverdueReceivables: number;
    totalOverduePayables: number;
    countOverduePayables: number;
    totalUpcomingReceivables: number;
    countUpcomingReceivables: number;
    totalUpcomingPayables: number;
    countUpcomingPayables: number;
  };
}

const formatBRL = (val: number) =>
  val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function formatDate(dateStr: string | null) {
  if (!dateStr) return "Sem data";
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function getDueInfo(dateStr: string | null) {
  if (!dateStr) return { isOverdue: false, days: 0, label: "Sem data", badge: "bg-slate-500/10 text-slate-600 border-slate-500/20" };
  const due = new Date(dateStr);
  const now = new Date();
  // reset hours to compare days
  due.setUTCHours(0, 0, 0, 0);
  now.setUTCHours(0, 0, 0, 0);
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const past = Math.abs(diffDays);
    return {
      isOverdue: true,
      days: past,
      label: `Vencido há ${past} dia${past > 1 ? "s" : ""}`,
      badge: "bg-rose-500/10 text-rose-600 border-rose-500/20 font-bold",
    };
  } else if (diffDays === 0) {
    return {
      isOverdue: false,
      days: 0,
      label: "Vence hoje!",
      badge: "bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold animate-pulse",
    };
  } else {
    return {
      isOverdue: false,
      days: diffDays,
      label: `Vence em ${diffDays} dia${diffDays > 1 ? "s" : ""}`,
      badge: "bg-sky-500/10 text-sky-600 border-sky-500/20",
    };
  }
}

export function AlertsSection({ entries, summary }: AlertsSectionProps) {
  const [filter, setFilter] = useState<"ALL" | "RECEIVABLE" | "PAYABLE" | "OVERDUE">("OVERDUE");
  const [search, setSearch] = useState("");

  const filteredEntries = entries.filter((e) => {
    // Type filter
    if (filter === "RECEIVABLE" && e.type !== "RECEBIMENTO") return false;
    if (filter === "PAYABLE" && e.type !== "PAGAMENTO") return false;
    if (filter === "OVERDUE") {
      const info = getDueInfo(e.dueDate);
      if (!info.isOverdue) return false;
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const entityName = (e.customer?.name || e.supplier?.name || "").toLowerCase();
      const desc = e.description.toLowerCase();
      return entityName.includes(q) || desc.includes(q);
    }

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header com Resumo dos Alertas de Vencimentos */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-500/20">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-(--text-title)">
                Central de Alertas de Vencimentos
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                {summary.countOverdueReceivables + summary.countOverduePayables} pendências críticas
              </span>
            </div>
            <p className="text-xs text-(--text-muted) mt-0.5">
              Monitoramento em tempo real de parcelas de passageiros e faturas de fornecedores com datas de vencimento.
            </p>
          </div>
        </div>

        {/* Mini Cards de Alerta */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-rose-500/5 border border-rose-500/20 flex items-center gap-2.5">
            <TrendingUp size={16} className="text-rose-600" />
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-rose-600">
                A Receber Atrasado
              </p>
              <p className="text-sm font-bold text-(--text-title)">
                {formatBRL(summary.totalOverdueReceivables)}
              </p>
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-2.5">
            <TrendingDown size={16} className="text-amber-600" />
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-600">
                A Pagar Atrasado
              </p>
              <p className="text-sm font-bold text-(--text-title)">
                {formatBRL(summary.totalOverduePayables)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Abas Rápidas */}
        <div className="flex items-center bg-(--surface-subtle) rounded-xl p-1 border border-(--border) w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setFilter("OVERDUE")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filter === "OVERDUE"
                ? "bg-(--surface) text-rose-600 shadow-xs border border-(--border)"
                : "text-(--text-muted) hover:text-(--text-title)"
            }`}
          >
            <AlertCircle size={14} />
            <span>Vencidos ({summary.countOverdueReceivables + summary.countOverduePayables})</span>
          </button>

          <button
            onClick={() => setFilter("RECEIVABLE")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filter === "RECEIVABLE"
                ? "bg-(--surface) text-emerald-600 shadow-xs border border-(--border)"
                : "text-(--text-muted) hover:text-(--text-title)"
            }`}
          >
            <TrendingUp size={14} />
            <span>A Receber ({summary.countOverdueReceivables + summary.countUpcomingReceivables})</span>
          </button>

          <button
            onClick={() => setFilter("PAYABLE")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filter === "PAYABLE"
                ? "bg-(--surface) text-amber-600 shadow-xs border border-(--border)"
                : "text-(--text-muted) hover:text-(--text-title)"
            }`}
          >
            <TrendingDown size={14} />
            <span>A Pagar ({summary.countOverduePayables + summary.countUpcomingPayables})</span>
          </button>

          <button
            onClick={() => setFilter("ALL")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filter === "ALL"
                ? "bg-(--surface) text-(--text-title) shadow-xs border border-(--border)"
                : "text-(--text-muted) hover:text-(--text-title)"
            }`}
          >
            <span>Todos ({entries.length})</span>
          </button>
        </div>

        {/* Input de Busca */}
        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por cliente ou fornecedor..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-xs text-(--text-title) placeholder:text-(--text-muted) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      {/* Tabela de Vencimentos */}
      <div className="rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card) overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-(--surface-subtle) border-b border-(--border) text-(--text-muted) uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Status & Vencimento</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Cliente / Fornecedor</th>
                <th className="py-3 px-4">Descrição do Lançamento</th>
                <th className="py-3 px-4">Valor</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border)">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-(--text-muted)">
                    <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500 opacity-60" />
                    <p className="font-semibold text-sm text-(--text-title)">
                      Nenhum vencimento pendente neste filtro
                    </p>
                    <p className="text-xs text-(--text-muted) mt-0.5">
                      Todos os compromissos selecionados estão em dia!
                    </p>
                  </td>
                </tr>
              ) : (
                filteredEntries.slice(0, 15).map((entry) => {
                  const dueInfo = getDueInfo(entry.dueDate);
                  const isReceivable = entry.type === "RECEBIMENTO";
                  const entityName = isReceivable
                    ? entry.customer?.name || "Cliente não vinculado"
                    : entry.supplier?.name || "Fornecedor não vinculado";
                  const entityLink = isReceivable && entry.customer
                    ? `/clientes/${entry.customer.id}`
                    : !isReceivable && entry.supplier
                    ? `/fornecedores/${entry.supplier.id}`
                    : null;

                  const rawMobile = entry.customer?.mobile || entry.customer?.phone;
                  const cleanMobile = rawMobile ? rawMobile.replace(/\D/g, "") : null;
                  const hasWhatsApp = isReceivable && cleanMobile && cleanMobile.length >= 10;
                  const waText = encodeURIComponent(
                    `Olá ${entityName}! Tudo bem? Entramos em contato da Destino Certo sobre o vencimento da parcela "${entry.description}" no valor de ${formatBRL(entry.amount)} com vencimento em ${formatDate(entry.dueDate)}. Podemos ajudar?`
                  );

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-(--surface-subtle)/70 transition-colors group"
                    >
                      {/* Vencimento & Badge */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-(--text-title) flex items-center gap-1.5">
                            <Calendar size={13} className="text-(--text-muted)" />
                            <span>{formatDate(entry.dueDate)}</span>
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border w-fit ${dueInfo.badge}`}
                          >
                            {dueInfo.label}
                          </span>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="py-3 px-4">
                        {isReceivable ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            <TrendingUp size={12} />
                            <span>Recebimento</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            <TrendingDown size={12} />
                            <span>Pagamento</span>
                          </span>
                        )}
                      </td>

                      {/* Cliente / Fornecedor */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                              isReceivable
                                ? "bg-primary/10 text-primary"
                                : "bg-tertiary/10 text-tertiary"
                            }`}
                          >
                            {isReceivable ? <User size={13} /> : <Building2 size={13} />}
                          </div>
                          <div className="min-w-0">
                            {entityLink ? (
                              <Link
                                href={entityLink}
                                className="font-semibold text-(--text-title) hover:text-primary transition-colors truncate max-w-[200px] block"
                              >
                                {entityName}
                              </Link>
                            ) : (
                              <span className="font-semibold text-(--text-title) truncate max-w-[200px] block">
                                {entityName}
                              </span>
                            )}
                            <span className="text-[11px] text-(--text-muted)">
                              {isReceivable ? "Passageiro" : entry.supplier?.category || "Parceiro"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Descrição */}
                      <td className="py-3 px-4 max-w-[240px]">
                        <p className="truncate text-(--text-title) font-medium">
                          {entry.description}
                        </p>
                        {entry.category && (
                          <span className="text-[10px] text-(--text-muted) block truncate">
                            {entry.category}
                          </span>
                        )}
                      </td>

                      {/* Valor */}
                      <td className="py-3 px-4">
                        <span
                          className={`font-bold font-mono text-sm ${
                            isReceivable ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {formatBRL(entry.amount)}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasWhatsApp && (
                            <a
                              href={`https://wa.me/55${cleanMobile}?text=${waText}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all font-semibold text-[11px] cursor-pointer"
                              title="Enviar cobrança via WhatsApp"
                            >
                              <MessageSquare size={13} />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </a>
                          )}

                          {entityLink && (
                            <Link
                              href={entityLink}
                              className="p-1.5 rounded-lg text-(--text-muted) hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                              title="Abrir perfil completo"
                            >
                              <ArrowRight size={15} />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da tabela */}
        {filteredEntries.length > 15 && (
          <div className="p-3 border-t border-(--border) bg-(--surface-subtle)/50 text-center text-xs text-(--text-muted)">
            Mostrando os 15 vencimentos mais prioritários de um total de{" "}
            <span className="font-bold text-(--text-title)">{filteredEntries.length}</span> registros.
          </div>
        )}
      </div>
    </div>
  );
}
