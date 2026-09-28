"use client";

import { useState, useMemo } from "react";
import {
  Users,
  Plus,
  Trash2,
  Calendar,
  MessageCircle,
  Search,
  Phone,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Filter,
} from "lucide-react";
import type { InterestedLead } from "@/lib/actions/addons";

interface InterestedLeadsViewProps {
  excursionId: string;
  leads: InterestedLead[];
  onUpdateLeads: (leads: InterestedLead[]) => void;
}

// Formata telefone (XX) XXXXX-XXXX
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

// Gera link direto do WhatsApp (wa.me)
function getWhatsAppLink(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${full}`;
}

// Retorna data de hoje em YYYY-MM-DD
function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

// Helper de texto de data relativa (Hoje, Ontem, Há X dias)
function getRelativeDateLabel(dateStr?: string): { label: string; color: string } {
  if (!dateStr) return { label: "Sem contato", color: "text-text-muted bg-surface-subtle" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = dateStr.split("-");
  if (parts.length !== 3) return { label: dateStr, color: "text-text-muted bg-surface-subtle" };
  const target = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { label: "Hoje", color: "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/40" };
  }
  if (diffDays === 1) {
    return { label: "Ontem", color: "text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-950/40" };
  }
  if (diffDays > 1 && diffDays <= 5) {
    return { label: `Há ${diffDays} dias`, color: "text-amber-800 bg-amber-100 dark:text-amber-300 dark:bg-amber-950/40" };
  }
  if (diffDays > 5) {
    return { label: `Há ${diffDays} dias`, color: "text-rose-800 bg-rose-100 dark:text-rose-300 dark:bg-rose-950/40" };
  }
  return { label: dateStr, color: "text-text-muted bg-surface-subtle" };
}

export function InterestedLeadsView({
  leads,
  onUpdateLeads,
}: InterestedLeadsViewProps) {
  // Estado do formulário de novo interessado
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [lastContactDate, setLastContactDate] = useState(getTodayString());
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "today" | "pending">("all");
  const [copiedAll, setCopiedAll] = useState(false);

  // Adicionar novo interessado
  function handleAddLead(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    const newLead: InterestedLead = {
      id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: cleanName,
      phone: phone.trim(),
      lastContactDate: lastContactDate || getTodayString(),
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    onUpdateLeads([newLead, ...leads]);

    // Reseta formulário
    setName("");
    setPhone("");
    setLastContactDate(getTodayString());
    setNotes("");
  }

  // Atualizar campo inline de um interessado
  function handleUpdateLead(id: string, patch: Partial<InterestedLead>) {
    const updated = leads.map((lead) =>
      lead.id === id ? { ...lead, ...patch } : lead
    );
    onUpdateLeads(updated);
  }

  // Excluir interessado
  function handleDeleteLead(id: string) {
    const updated = leads.filter((l) => l.id !== id);
    onUpdateLeads(updated);
  }

  // Marcar última data de contato como HOJE
  function handleSetContactToday(id: string) {
    handleUpdateLead(id, { lastContactDate: getTodayString() });
  }

  // Copiar todos os telefones para lista de transmissão
  function handleCopyAllPhones() {
    const phonesList = leads
      .map((l) => l.phone.replace(/\D/g, ""))
      .filter((p) => p.length >= 10)
      .join("\n");
    if (!phonesList) return;
    navigator.clipboard.writeText(phonesList);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  // Filtragem dos interessados
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        lead.name.toLowerCase().includes(q) ||
        lead.phone.includes(q) ||
        (lead.notes || "").toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === "today") {
        return lead.lastContactDate === getTodayString();
      }
      if (statusFilter === "pending") {
        return lead.lastContactDate !== getTodayString();
      }
      return true;
    });
  }, [leads, searchQuery, statusFilter]);

  // Estatísticas rápidas
  const todayCount = leads.filter((l) => l.lastContactDate === getTodayString()).length;
  const pendingCount = leads.length - todayCount;

  return (
    <div className="space-y-6">
      {/* Cabeçalho Superior da Página */}
      <div className="bg-surface rounded-2xl border border-border shadow-shadow-card p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-text-title">Lista de Interessados</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold">
                {leads.length} {leads.length === 1 ? "interessado" : "interessados"}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Cadastre potenciais clientes desta excursão, controle o histórico de contato e abra conversas diretamente no WhatsApp.
            </p>
          </div>
        </div>

        {/* Botão de Ação Auxiliar */}
        {leads.length > 0 && (
          <button
            type="button"
            onClick={handleCopyAllPhones}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface-subtle hover:bg-surface text-text-title text-xs font-semibold transition-all cursor-pointer"
            title="Copiar números para lista de transmissão ou CRM"
          >
            {copiedAll ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Copy size={14} />}
            <span>{copiedAll ? "Números Copiados!" : "Copiar Telefones"}</span>
          </button>
        )}
      </div>

      {/* Cards de Resumo e Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-surface rounded-xl border border-border p-3.5 space-y-1">
          <span className="text-[11px] font-semibold text-text-muted uppercase flex items-center gap-1.5">
            <Users size={13} className="text-primary" /> Total na Lista
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-text-title tabular-nums">
              {leads.length}
            </span>
            <span className="text-xs text-text-muted">pessoas registradas</span>
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase flex items-center gap-1.5">
            <CheckCircle2 size={13} /> Contatados Hoje
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {todayCount}
            </span>
            <span className="text-xs text-text-muted">com contato recente</span>
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase flex items-center gap-1.5">
            <Clock size={13} /> Aguardando Contato
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-amber-700 dark:text-amber-400 tabular-nums">
              {pendingCount}
            </span>
            <span className="text-xs text-text-muted">sem contato hoje</span>
          </div>
        </div>
      </div>

      {/* Formulário de Adicionar Interessado ("abaixo um campo pra por as pessoas interessadas...") */}
      <div className="bg-surface rounded-2xl border border-border shadow-shadow-card p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            <Plus size={14} />
          </div>
          <h3 className="text-sm font-bold text-text-title">Novo Interessado</h3>
        </div>

        <form onSubmit={handleAddLead} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Campo Nome */}
          <div className="md:col-span-4 space-y-1">
            <label className="text-xs font-semibold text-text-title flex items-center gap-1.5">
              <User size={13} className="text-primary" />
              <span>Nome Completo *</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Maria Clara dos Santos"
              required
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-xs text-text-title placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all font-medium"
            />
          </div>

          {/* Campo Número de Contato */}
          <div className="md:col-span-3 space-y-1">
            <label className="text-xs font-semibold text-text-title flex items-center gap-1.5">
              <Phone size={13} className="text-primary" />
              <span>Número de Contato *</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              required
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-xs text-text-title placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all font-medium tabular-nums"
            />
          </div>

          {/* Campo Última Data de Contato */}
          <div className="md:col-span-3 space-y-1">
            <label className="text-xs font-semibold text-text-title flex items-center gap-1.5">
              <Calendar size={13} className="text-primary" />
              <span>Última Data de Contato</span>
            </label>
            <input
              type="date"
              value={lastContactDate}
              onChange={(e) => setLastContactDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-xs text-text-title focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all font-medium cursor-pointer"
            />
          </div>

          {/* Botão (+) Adicionar */}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full h-[38px] flex items-center justify-center gap-1.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Adicionar pessoa à lista de interessados"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Adicionar</span>
            </button>
          </div>
        </form>
      </div>

      {/* Barra de Filtro e Busca da Lista */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, telefone ou nota..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-border bg-surface text-xs text-text-body placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-subtle border border-border w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "all"
                ? "bg-surface text-text-title shadow-2xs font-bold"
                : "text-text-muted hover:text-text-body"
            }`}
          >
            Todos ({leads.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("today")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "today"
                ? "bg-surface text-emerald-700 dark:text-emerald-400 shadow-2xs font-bold"
                : "text-text-muted hover:text-text-body"
            }`}
          >
            Hoje ({todayCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "pending"
                ? "bg-surface text-amber-700 dark:text-amber-400 shadow-2xs font-bold"
                : "text-text-muted hover:text-text-body"
            }`}
          >
            Aguardando ({pendingCount})
          </button>
        </div>
      </div>

      {/* Tabela de Interessados */}
      <div className="bg-surface rounded-2xl border border-border shadow-shadow-card overflow-hidden">
        {filteredLeads.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-subtle text-text-muted flex items-center justify-center mx-auto">
              <Users size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-text-title">
                {leads.length === 0
                  ? "Nenhum interessado cadastrado ainda"
                  : "Nenhum interessado encontrado para esta busca"}
              </h4>
              <p className="text-xs text-text-muted max-w-md mx-auto">
                {leads.length === 0
                  ? "Use o formulário acima para adicionar pessoas interessadas nesta excursão e registrar o contato com elas."
                  : "Tente alterar os termos de busca ou o filtro de status selecionado."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-subtle/80 border-b border-border text-[11px] font-bold text-text-muted uppercase tracking-wider">
                  <th className="py-3 px-4 min-w-[200px]">Nome do Interessado</th>
                  <th className="py-3 px-4 min-w-[190px]">Contato / WhatsApp</th>
                  <th className="py-3 px-4 min-w-[220px]">Última Data de Contato</th>
                  <th className="py-3 px-4 min-w-[180px]">Observações / Notas</th>
                  <th className="py-3 px-4 text-center w-[70px]">Excluir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredLeads.map((lead) => {
                  const waUrl = getWhatsAppLink(lead.phone);
                  const relDate = getRelativeDateLabel(lead.lastContactDate);
                  const isContactToday = lead.lastContactDate === getTodayString();

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-surface-subtle/70 transition-colors group"
                    >
                      {/* Nome */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                            {lead.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <span className="text-xs font-bold text-text-title block truncate">
                              {lead.name}
                            </span>
                            <span className="text-[10px] text-text-muted block">
                              Cadastrado em {new Date(lead.createdAt).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contato (Número clicável que redireciona para o chat do WhatsApp) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {waUrl ? (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs transition-colors cursor-pointer group/link border border-emerald-500/20 shadow-2xs"
                              title="Clique para abrir a conversa no WhatsApp deste contato"
                            >
                              <MessageCircle size={14} className="text-emerald-600 dark:text-emerald-400 group-hover/link:scale-110 transition-transform" />
                              <span className="tabular-nums underline decoration-emerald-500/40 underline-offset-2">
                                {lead.phone}
                              </span>
                              <ExternalLink size={11} className="opacity-60" />
                            </a>
                          ) : (
                            <span className="text-xs text-text-muted font-medium tabular-nums">
                              {lead.phone || "Sem telefone"}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Última Data de Contato (Atualizável diretamente na lista) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={lead.lastContactDate || ""}
                            onChange={(e) =>
                              handleUpdateLead(lead.id, {
                                lastContactDate: e.target.value,
                              })
                            }
                            className="px-2 py-1 rounded-lg border border-border bg-surface text-xs font-semibold text-text-title focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer transition-all"
                            title="Alterar última data de contato diretamente na lista"
                          />

                          {/* Badge de tempo relativo */}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${relDate.color}`}
                          >
                            {relDate.label}
                          </span>

                          {/* Botão rápido "Hoje" se não foi hoje */}
                          {!isContactToday && (
                            <button
                              type="button"
                              onClick={() => handleSetContactToday(lead.id)}
                              className="px-2 py-0.5 rounded-lg border border-border bg-surface hover:bg-primary hover:text-white hover:border-primary text-[10px] font-bold text-text-muted transition-colors cursor-pointer shrink-0"
                              title="Marcar contato realizado hoje"
                            >
                              Hoje
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Observações / Notas */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={lead.notes || ""}
                          onChange={(e) =>
                            handleUpdateLead(lead.id, { notes: e.target.value })
                          }
                          placeholder="Ex: Prefere pagar no PIX..."
                          className="w-full px-2.5 py-1 rounded-lg border border-transparent hover:border-border focus:border-primary bg-transparent focus:bg-surface text-xs text-text-body placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                        />
                      </td>

                      {/* Excluir ("Um campo pra excluir também") */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteLead(lead.id)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-status-danger hover:bg-status-danger-bg transition-colors cursor-pointer"
                          title={`Excluir ${lead.name} da lista de interessados`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
