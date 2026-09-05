"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  Cake,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  MessageCircle,
  Clock,
  Sparkles,
  LayoutGrid,
  List,
  CalendarDays,
  ArrowLeft,
  ArrowRight,
  MapPin,
  PartyPopper,
  Gift,
  X,
  Phone,
  CheckCircle2,
  Send,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BirthdayCustomer, MonthlyCount, getBirthdaysByMonth } from "./actions";

interface BirthdaysContentProps {
  initialClients: BirthdayCustomer[];
  initialCounts: MonthlyCount[];
  initialMonth: number;
  currentYear: number;
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const MONTH_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function formatPhone(phone: string | null) {
  if (!phone) return "-";
  const p = phone.replace(/\D/g, "");
  if (p.length === 11) return `(${p.slice(0, 2)}) ${p.slice(2, 7)}-${p.slice(7)}`;
  if (p.length === 10) return `(${p.slice(0, 2)}) ${p.slice(2, 6)}-${p.slice(6)}`;
  return phone;
}

function getDayOfWeekName(year: number, month: number, day: number) {
  try {
    const d = new Date(year, month - 1, day);
    const dayName = d.toLocaleDateString("pt-BR", { weekday: "long" });
    return dayName.charAt(0).toUpperCase() + dayName.slice(1);
  } catch {
    return "";
  }
}

export function BirthdaysContent({
  initialClients,
  initialCounts,
  initialMonth,
  currentYear,
}: BirthdaysContentProps) {
  const now = new Date();
  const todayMonth = now.getMonth() + 1;
  const todayDay = now.getDate();

  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);
  const [clients, setClients] = useState<BirthdayCustomer[]>(initialClients);
  const [counts] = useState<MonthlyCount[]>(initialCounts);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "TODAY" | "UPCOMING" | "PAST">("ALL");
  const [viewMode, setViewMode] = useState<"cards" | "timeline" | "table">("cards");
  const [isPending, startTransition] = useTransition();

  const handleMonthChange = (newMonth: number) => {
    let m = newMonth;
    if (m < 1) m = 12;
    if (m > 12) m = 1;
    setSelectedMonth(m);
    setStatusFilter("ALL");

    startTransition(async () => {
      const data = await getBirthdaysByMonth(m, currentYear);
      setClients(data);
    });
  };

  const isCurrentMonthActive = selectedMonth === todayMonth;

  // Estatísticas do mês selecionado
  const monthStats = useMemo(() => {
    const total = clients.length;
    let todayCount = 0;
    let upcomingCount = 0;
    let pastCount = 0;
    let withWaCount = 0;

    clients.forEach((c) => {
      const cleanMobile = c.mobile ? c.mobile.replace(/\D/g, "") : null;
      if (cleanMobile && cleanMobile.length >= 10) {
        withWaCount++;
      }

      if (isCurrentMonthActive) {
        if (c.day === todayDay) {
          todayCount++;
        } else if (c.day > todayDay && c.day <= todayDay + 7) {
          upcomingCount++;
        } else if (c.day < todayDay) {
          pastCount++;
        }
      }
    });

    return { total, todayCount, upcomingCount, pastCount, withWaCount };
  }, [clients, isCurrentMonthActive, todayDay]);

  // Filtro de clientes
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      // Busca textual
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesCity = (c.city || "").toLowerCase().includes(q);
        const matchesPhone = (c.mobile || "").includes(q) || (c.phone || "").includes(q);
        const matchesDay = c.day.toString().padStart(2, "0") === q || c.day.toString() === q;
        if (!matchesName && !matchesCity && !matchesPhone && !matchesDay) return false;
      }

      // Filtro de status
      if (isCurrentMonthActive) {
        if (statusFilter === "TODAY" && c.day !== todayDay) return false;
        if (statusFilter === "UPCOMING" && c.day <= todayDay) return false;
        if (statusFilter === "PAST" && c.day >= todayDay) return false;
      }

      return true;
    });
  }, [clients, searchQuery, statusFilter, isCurrentMonthActive, todayDay]);

  // Agrupamento por dia (para visualização em Linha do Tempo)
  const groupedByDay = useMemo(() => {
    const groups: { [day: number]: BirthdayCustomer[] } = {};
    filteredClients.forEach((c) => {
      if (!groups[c.day]) groups[c.day] = [];
      groups[c.day].push(c);
    });
    return groups;
  }, [filteredClients]);

  const sortedDays = useMemo(() => {
    return Object.keys(groupedByDay)
      .map(Number)
      .sort((a, b) => a - b);
  }, [groupedByDay]);

  const getWaLink = (client: BirthdayCustomer) => {
    const rawNumber = client.mobile ? client.mobile.replace(/\D/g, "") : null;
    if (!rawNumber || rawNumber.length < 10) return null;

    const firstName = client.name.split(" ")[0];
    const message = `🎉 Olá ${firstName}! A equipe da Destino Certo deseja a você um Feliz Aniversário! Muita saúde, paz e muitas viagens incríveis pelo mundo! ✈️🎂`;
    return `https://wa.me/55${rawNumber}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-(--text-muted) mb-1">
            <Link
              href="/clientes"
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <Users size={13} />
              <span>Clientes & Passageiros</span>
            </Link>
            <span>/</span>
            <span className="text-primary flex items-center gap-1">
              <Cake size={13} />
              <span>Aniversariantes</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-orange-400 text-white flex items-center justify-center shadow-md shadow-primary/20">
              <Cake size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-(--text-title)">
                Aniversariantes do Mês
              </h1>
              <p className="text-xs text-(--text-muted)">
                Acompanhe as datas festivas, planeje felicitações e estreite o relacionamento com seus viajantes
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/clientes"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-(--border) bg-(--surface) hover:bg-(--surface-subtle) text-(--text-title) text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Todos os Clientes</span>
          </Link>
        </div>
      </div>

      {/* Navegador Principal de Meses */}
      <div className="rounded-2xl bg-(--surface) border border-(--border) p-5 shadow-(--shadow-card) space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Controles Anterior / Próximo e Mês Corrente */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
            <button
              onClick={() => handleMonthChange(selectedMonth - 1)}
              disabled={isPending}
              className="w-10 h-10 rounded-xl border border-(--border) bg-(--surface-subtle) hover:bg-(--surface) text-(--text-title) flex items-center justify-center transition-colors cursor-pointer hover:border-primary/40 disabled:opacity-50"
              title="Mês Anterior"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-lg min-w-[210px] justify-center shadow-xs">
              <Calendar size={18} />
              <span>
                {MONTH_NAMES[selectedMonth - 1]} {currentYear}
              </span>
            </div>

            <button
              onClick={() => handleMonthChange(selectedMonth + 1)}
              disabled={isPending}
              className="w-10 h-10 rounded-xl border border-(--border) bg-(--surface-subtle) hover:bg-(--surface) text-(--text-title) flex items-center justify-center transition-colors cursor-pointer hover:border-primary/40 disabled:opacity-50"
              title="Próximo Mês"
            >
              <ChevronRight size={18} />
            </button>

            {!isCurrentMonthActive && (
              <button
                onClick={() => handleMonthChange(todayMonth)}
                disabled={isPending}
                className="ml-2 px-3 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-semibold border border-orange-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={14} />
                <span>Mês Atual</span>
              </button>
            )}
          </div>

          {/* Indicador de carregamento / feedback */}
          <div className="text-xs text-(--text-muted) flex items-center gap-2">
            {isPending ? (
              <div className="flex items-center gap-1.5 text-primary font-medium animate-pulse">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>Carregando aniversariantes...</span>
              </div>
            ) : (
              <span className="text-xs">
                Total de <strong className="text-(--text-title)">{clients.length}</strong> aniversariantes em {MONTH_NAMES[selectedMonth - 1]}
              </span>
            )}
          </div>
        </div>

        {/* Abas dos 12 Meses com Contadores */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-1.5 pt-2 border-t border-(--border)">
          {MONTH_SHORT.map((shortName, idx) => {
            const m = idx + 1;
            const isSelected = m === selectedMonth;
            const isToday = m === todayMonth;
            const count = counts.find((c) => c.month === m)?.count || 0;

            return (
              <button
                key={m}
                onClick={() => handleMonthChange(m)}
                disabled={isPending}
                className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition-all cursor-pointer ${
                  isSelected
                    ? "bg-gradient-to-b from-primary to-[#ff7a22] text-white font-bold shadow-md shadow-primary/20 scale-[1.02]"
                    : isToday
                    ? "bg-primary/10 text-primary border border-primary/30 font-semibold hover:bg-primary/20"
                    : "bg-(--surface-subtle) hover:bg-(--surface) text-(--text-muted) hover:text-(--text-title) border border-transparent hover:border-(--border)"
                }`}
              >
                {isToday && !isSelected && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
                )}
                <span className="text-xs">{shortName}</span>
                <span
                  className={`text-[10px] mt-0.5 px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-(--surface) text-(--text-muted)"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards de Métricas e Destaques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total do Mês */}
        <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card) flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
              Aniversariantes no Mês
            </span>
            <p className="text-2xl font-bold text-(--text-title) mt-1">
              {monthStats.total}
            </p>
            <p className="text-xs text-primary font-medium mt-0.5">
              {MONTH_NAMES[selectedMonth - 1]}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Cake size={22} />
          </div>
        </div>

        {/* Card 2: Aniversariantes de Hoje */}
        <div
          className={`p-4 rounded-2xl border shadow-(--shadow-card) flex items-center justify-between transition-all ${
            isCurrentMonthActive && monthStats.todayCount > 0
              ? "bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-500/5 border-amber-500/30 ring-1 ring-amber-500/20"
              : "bg-(--surface) border-(--border)"
          }`}
        >
          <div>
            <span className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider flex items-center gap-1.5">
              <span>Aniversariantes Hoje</span>
              {isCurrentMonthActive && monthStats.todayCount > 0 && (
                <PartyPopper size={14} className="text-amber-500 animate-bounce" />
              )}
            </span>
            <p
              className={`text-2xl font-bold mt-1 ${
                isCurrentMonthActive && monthStats.todayCount > 0
                  ? "text-amber-500 dark:text-amber-400"
                  : "text-(--text-title)"
              }`}
            >
              {isCurrentMonthActive ? monthStats.todayCount : "-"}
            </p>
            <p className="text-xs text-(--text-muted) font-medium mt-0.5">
              {isCurrentMonthActive
                ? monthStats.todayCount > 0
                  ? "Celebre com seus clientes hoje!"
                  : "Nenhum aniversário hoje"
                : "Disponível no mês atual"}
            </p>
          </div>
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              isCurrentMonthActive && monthStats.todayCount > 0
                ? "bg-amber-500/20 text-amber-600 dark:text-amber-300"
                : "bg-slate-500/10 text-slate-400"
            }`}
          >
            <Gift size={22} />
          </div>
        </div>

        {/* Card 3: Próximos 7 Dias */}
        <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card) flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
              Próximos 7 Dias
            </span>
            <p className="text-2xl font-bold text-(--text-title) mt-1">
              {isCurrentMonthActive ? monthStats.upcomingCount : "-"}
            </p>
            <p className="text-xs text-indigo-500 font-medium mt-0.5">
              {isCurrentMonthActive ? "Prontos para programar" : "Disponível no mês atual"}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <Clock size={22} />
          </div>
        </div>

        {/* Card 4: Com WhatsApp Disponível */}
        <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card) flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
              Com WhatsApp
            </span>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {monthStats.withWaCount}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              Envio de parabéns em 1 clique
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <MessageCircle size={22} />
          </div>
        </div>
      </div>

      {/* Barra de Filtros, Busca e Modos de Exibição */}
      <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card) flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Campo de Busca */}
        <div className="relative w-full md:w-80">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-muted)"
          />
          <input
            type="text"
            placeholder="Buscar por nome, dia (ex: 15) ou cidade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-xs text-(--text-title) placeholder:text-(--text-muted) focus:outline-none focus:border-primary/60 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-(--text-muted) hover:text-(--text-title)"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filtros de Status (Quando no Mês Atual) */}
        {isCurrentMonthActive && (
          <div className="flex items-center gap-1 p-1 rounded-xl bg-(--surface-subtle) border border-(--border) text-xs">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                statusFilter === "ALL"
                  ? "bg-primary text-white shadow-xs"
                  : "text-(--text-muted) hover:text-(--text-title)"
              }`}
            >
              Todos ({monthStats.total})
            </button>
            <button
              onClick={() => setStatusFilter("TODAY")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer ${
                statusFilter === "TODAY"
                  ? "bg-amber-500 text-white shadow-xs font-bold"
                  : "text-(--text-muted) hover:text-amber-500"
              }`}
            >
              <PartyPopper size={13} />
              <span>Hoje ({monthStats.todayCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter("UPCOMING")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                statusFilter === "UPCOMING"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-(--text-muted) hover:text-(--text-title)"
              }`}
            >
              Próximos
            </button>
            <button
              onClick={() => setStatusFilter("PAST")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                statusFilter === "PAST"
                  ? "bg-(--surface) text-(--text-title) shadow-xs font-semibold"
                  : "text-(--text-muted) hover:text-(--text-title)"
              }`}
            >
              Passados
            </button>
          </div>
        )}

        {/* Alternador de Modo de Visualização */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-(--surface-subtle) border border-(--border)">
          <button
            onClick={() => setViewMode("cards")}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              viewMode === "cards"
                ? "bg-(--surface) text-primary shadow-xs font-semibold"
                : "text-(--text-muted) hover:text-(--text-title)"
            }`}
            title="Visualização em Cards"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode("timeline")}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              viewMode === "timeline"
                ? "bg-(--surface) text-primary shadow-xs font-semibold"
                : "text-(--text-muted) hover:text-(--text-title)"
            }`}
            title="Visualização por Dias (Linha do Tempo)"
          >
            <CalendarDays size={16} />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              viewMode === "table"
                ? "bg-(--surface) text-primary shadow-xs font-semibold"
                : "text-(--text-muted) hover:text-(--text-title)"
            }`}
            title="Visualização em Tabela"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Lista / Cards de Aniversariantes */}
      <AnimatePresence mode="wait">
        {filteredClients.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="py-16 text-center rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <Cake size={28} />
            </div>
            <h3 className="text-base font-semibold text-(--text-title)">
              Nenhum aniversariante encontrado
            </h3>
            <p className="text-xs text-(--text-muted) max-w-sm mx-auto mt-1">
              {searchQuery
                ? `Nenhum cliente no mês de ${MONTH_NAMES[selectedMonth - 1]} corresponde à busca "${searchQuery}".`
                : `Não há registros de aniversariantes cadastrados para ${MONTH_NAMES[selectedMonth - 1]}.`}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-4 px-3.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors cursor-pointer"
              >
                Limpar Busca
              </button>
            )}
          </motion.div>
        ) : viewMode === "cards" ? (
          /* MODO 1: CARDS */
          <motion.div
            key="cards"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredClients.map((client) => {
              const isToday = isCurrentMonthActive && client.day === todayDay;
              const isUpcoming =
                isCurrentMonthActive && client.day > todayDay && client.day <= todayDay + 7;
              const waLink = getWaLink(client);
              const weekday = getDayOfWeekName(currentYear, selectedMonth, client.day);

              return (
                <motion.div
                  key={client.id}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.15 }}
                  className={`p-5 rounded-2xl border transition-all relative flex flex-col justify-between ${
                    isToday
                      ? "bg-gradient-to-br from-amber-500/10 via-(--surface) to-(--surface) border-amber-500/40 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30"
                      : isUpcoming
                      ? "bg-(--surface) border-indigo-500/30 shadow-(--shadow-card)"
                      : "bg-(--surface) border-(--border) shadow-(--shadow-card) hover:border-primary/30"
                  }`}
                >
                  {/* Topo do Card: Badge do Dia */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        {/* Selo com o Dia do Mês */}
                        <div
                          className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 font-bold border shadow-xs ${
                            isToday
                              ? "bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/30"
                              : "bg-primary/10 text-primary border-primary/20"
                          }`}
                        >
                          <span className="text-[10px] uppercase font-semibold leading-none tracking-wider opacity-85">
                            Dia
                          </span>
                          <span className="text-xl font-extrabold leading-none mt-0.5">
                            {String(client.day).padStart(2, "0")}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-(--text-muted)">
                              {weekday}
                            </span>
                            {isToday && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white shadow-xs animate-pulse">
                                É HOJE! 🎉
                              </span>
                            )}
                            {isUpcoming && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                Em {client.day - todayDay} dias
                              </span>
                            )}
                          </div>

                          {client.turningAge && (
                            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                              Completando <strong>{client.turningAge} anos</strong>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Ano de Nascimento */}
                      {client.year && (
                        <span className="text-[11px] font-mono text-(--text-muted) bg-(--surface-subtle) px-2 py-1 rounded-md border border-(--border)">
                          {client.year}
                        </span>
                      )}
                    </div>

                    {/* Nome do Cliente */}
                    <Link
                      href={`/clientes/${client.id}`}
                      className="group/name block"
                    >
                      <h3 className="text-sm font-bold text-(--text-title) group-hover/name:text-primary transition-colors line-clamp-1">
                        {client.name}
                      </h3>
                    </Link>

                    {/* Dados de Contato e Cidade */}
                    <div className="mt-3 space-y-1.5 text-xs text-(--text-muted)">
                      {client.city && (
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="shrink-0 text-(--text-muted)" />
                          <span className="truncate">
                            {client.city}
                            {client.state ? ` - ${client.state}` : ""}
                          </span>
                        </div>
                      )}

                      {client.mobile && (
                        <div className="flex items-center gap-1.5">
                          <Phone size={13} className="shrink-0 text-emerald-500" />
                          <span className="font-mono text-(--text-title)">
                            {formatPhone(client.mobile)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rodapé do Card com Ações */}
                  <div className="pt-4 mt-4 border-t border-(--border) flex items-center justify-between gap-2">
                    {waLink ? (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-xs shadow-emerald-500/20 transition-all cursor-pointer"
                        title="Enviar mensagem de Feliz Aniversário pelo WhatsApp"
                      >
                        <Send size={13} />
                        <span>Felicitar</span>
                      </a>
                    ) : (
                      <span className="text-[11px] text-(--text-muted) italic">
                        Sem WhatsApp
                      </span>
                    )}

                    <Link
                      href={`/clientes/${client.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-(--text-muted) hover:text-primary transition-colors cursor-pointer"
                    >
                      <span>Ver Perfil</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : viewMode === "timeline" ? (
          /* MODO 2: LINHA DO TEMPO POR DIAS DO MÊS */
          <motion.div
            key="timeline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {sortedDays.map((day) => {
              const dayClients = groupedByDay[day] || [];
              const isToday = isCurrentMonthActive && day === todayDay;
              const weekday = getDayOfWeekName(currentYear, selectedMonth, day);

              return (
                <div
                  key={day}
                  className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                    isToday
                      ? "bg-gradient-to-r from-amber-500/10 via-(--surface) to-(--surface) border-amber-500/40 shadow-md ring-1 ring-amber-500/30"
                      : "bg-(--surface) border-(--border) shadow-(--shadow-card)"
                  }`}
                >
                  {/* Cabeçalho do Dia */}
                  <div className="flex items-center justify-between border-b border-(--border) pb-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                          isToday
                            ? "bg-amber-500 text-white shadow-md shadow-amber-500/30"
                            : "bg-primary/10 text-primary border border-primary/20"
                        }`}
                      >
                        {String(day).padStart(2, "0")}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-(--text-title)">
                            Dia {day} de {MONTH_NAMES[selectedMonth - 1]}
                          </h3>
                          <span className="text-xs text-(--text-muted)">• {weekday}</span>
                          {isToday && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white shadow-xs">
                              HOJE 🎉
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-(--text-muted)">
                          {dayClients.length} {dayClients.length === 1 ? "aniversariante" : "aniversariantes"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Lista de aniversariantes deste dia */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {dayClients.map((client) => {
                      const waLink = getWaLink(client);

                      return (
                        <div
                          key={client.id}
                          className="p-3 rounded-xl bg-(--surface-subtle) border border-(--border) flex items-center justify-between gap-3 hover:border-primary/40 transition-colors"
                        >
                          <div className="min-w-0">
                            <Link
                              href={`/clientes/${client.id}`}
                              className="text-xs font-bold text-(--text-title) hover:text-primary transition-colors block truncate"
                            >
                              {client.name}
                            </Link>
                            <div className="flex items-center gap-2 text-[11px] text-(--text-muted) mt-0.5">
                              {client.turningAge && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                  {client.turningAge} anos
                                </span>
                              )}
                              {client.city && (
                                <span className="truncate max-w-[120px]">
                                  {client.city}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noreferrer"
                                className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                title="Felicitar pelo WhatsApp"
                              >
                                <Send size={13} />
                              </a>
                            )}
                            <Link
                              href={`/clientes/${client.id}`}
                              className="w-8 h-8 rounded-lg bg-(--surface) border border-(--border) text-(--text-muted) hover:text-primary flex items-center justify-center transition-colors cursor-pointer"
                              title="Ver Detalhes"
                            >
                              <ArrowRight size={13} />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : (
          /* MODO 3: TABELA / LISTA */
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card) overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-(--border) bg-(--surface-subtle) text-[11px] font-semibold text-(--text-muted) uppercase tracking-wider">
                    <th className="py-3 px-4">Dia</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Idade</th>
                    <th className="py-3 px-4">Cidade / UF</th>
                    <th className="py-3 px-4">Telefone / WhatsApp</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border) text-xs">
                  {filteredClients.map((client) => {
                    const isToday = isCurrentMonthActive && client.day === todayDay;
                    const waLink = getWaLink(client);

                    return (
                      <tr
                        key={client.id}
                        className={`hover:bg-primary/5 transition-colors ${
                          isToday ? "bg-amber-500/5 font-medium" : ""
                        }`}
                      >
                        {/* Dia */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold ${
                              isToday
                                ? "bg-amber-500 text-white shadow-xs"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {String(client.day).padStart(2, "0")}
                          </span>
                        </td>

                        {/* Nome */}
                        <td className="py-3 px-4 font-semibold text-(--text-title)">
                          <Link
                            href={`/clientes/${client.id}`}
                            className="hover:text-primary transition-colors"
                          >
                            {client.name}
                          </Link>
                          {isToday && (
                            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                              HOJE! 🎉
                            </span>
                          )}
                        </td>

                        {/* Idade */}
                        <td className="py-3 px-4 whitespace-nowrap text-(--text-muted)">
                          {client.turningAge ? (
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {client.turningAge} anos
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>

                        {/* Cidade */}
                        <td className="py-3 px-4 text-(--text-title) whitespace-nowrap">
                          {client.city ? `${client.city}${client.state ? ` - ${client.state}` : ""}` : "-"}
                        </td>

                        {/* Telefone */}
                        <td className="py-3 px-4 font-mono text-(--text-title) whitespace-nowrap">
                          {formatPhone(client.mobile || client.phone)}
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors cursor-pointer"
                                title="Enviar WhatsApp"
                              >
                                <Send size={12} />
                                <span>Parabéns</span>
                              </a>
                            )}
                            <Link
                              href={`/clientes/${client.id}`}
                              className="px-2.5 py-1 rounded-lg border border-(--border) text-(--text-title) hover:text-primary hover:border-primary/40 text-xs font-medium transition-colors"
                            >
                              Ver Perfil
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
