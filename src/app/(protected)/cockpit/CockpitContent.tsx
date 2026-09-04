"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Building2,
  Calendar,
  Plus,
  Compass,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  Receipt,
} from "lucide-react";
import { CashFlowChart } from "./CashFlowChart";
import { SupplierCategoryChart } from "./SupplierCategoryChart";
import { AlertsSection, type DueEntry } from "./AlertsSection";
import { UpcomingExcursions, type ExcursionSummary } from "./UpcomingExcursions";

interface Kpis {
  totalReceived: number;
  totalPendingReceivables: number;
  totalPaidOut: number;
  totalPendingPayables: number;
  netOperatingResult: number;
  customersCount: number;
  suppliersCount: number;
  activeExcursionsCount: number;
}

interface CockpitContentProps {
  userName: string;
  kpis: Kpis;
  cashFlow: {
    month: string;
    recebido: number;
    pago: number;
    aReceber: number;
  }[];
  categoryData: {
    category: string;
    amount: number;
    count: number;
  }[];
  alertEntries: DueEntry[];
  alertSummary: {
    totalOverdueReceivables: number;
    countOverdueReceivables: number;
    totalOverduePayables: number;
    countOverduePayables: number;
    totalUpcomingReceivables: number;
    countUpcomingReceivables: number;
    totalUpcomingPayables: number;
    countUpcomingPayables: number;
  };
  upcomingExcursions: ExcursionSummary[];
}

const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CockpitContent({
  userName,
  kpis,
  cashFlow,
  categoryData,
  alertEntries,
  alertSummary,
  upcomingExcursions,
}: CockpitContentProps) {
  const cards = [
    {
      title: "Receita Realizada",
      value: formatBRL(kpis.totalReceived),
      subtitle: "Recebido de viagens e passageiros",
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      title: "Contas a Receber",
      value: formatBRL(kpis.totalPendingReceivables),
      subtitle: "Parcelas e contratos pendentes",
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/20",
    },
    {
      title: "Contas a Pagar",
      value: formatBRL(kpis.totalPendingPayables),
      subtitle: "Faturas de hotéis e parceiros a pagar",
      icon: TrendingDown,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      title: "Resultado Líquido",
      value: formatBRL(kpis.netOperatingResult),
      subtitle: "Saldo operacional liquidado",
      icon: ShieldCheck,
      color: "text-tertiary",
      bg: "bg-tertiary/10",
      border: "border-tertiary/20",
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Topo: Boas-vindas e Ações Rápidas */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-(--text-title)">
              Cockpit Geral
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              Operação Online
            </span>
          </div>
          <p className="text-sm text-(--text-muted) mt-1">
            Olá, <strong className="text-(--text-title)">{userName}</strong>! Acompanhe o fluxo financeiro, vendas, parceiros e vencimentos em tempo real.
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-(--surface) border border-(--border) text-(--text-title) font-semibold flex items-center gap-1.5">
              <Users size={13} className="text-primary" />
              <span>{kpis.customersCount.toLocaleString("pt-BR")} Passageiros</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-(--surface) border border-(--border) text-(--text-title) font-semibold flex items-center gap-1.5">
              <Building2 size={13} className="text-tertiary" />
              <span>{kpis.suppliersCount.toLocaleString("pt-BR")} Fornecedores</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-(--surface) border border-(--border) text-(--text-title) font-semibold flex items-center gap-1.5">
              <Compass size={13} className="text-primary" />
              <span>{kpis.activeExcursionsCount} Excursões</span>
            </span>
          </div>
        </div>

        {/* Botões de Ação Rápida */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/excursoes"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary-strong transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus size={16} />
            <span>Nova Excursão</span>
          </Link>

          <Link
            href="/clientes/novo"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-(--surface) border border-(--border) text-(--text-title) text-xs font-semibold hover:border-primary hover:text-primary transition-all cursor-pointer shadow-xs"
          >
            <Users size={15} />
            <span>Novo Cliente</span>
          </Link>

          <Link
            href="/fornecedores/novo"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-(--surface) border border-(--border) text-(--text-title) text-xs font-semibold hover:border-primary hover:text-primary transition-all cursor-pointer shadow-xs"
          >
            <Building2 size={15} />
            <span>Novo Fornecedor</span>
          </Link>
        </div>
      </div>

      {/* Grid de KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.title}
              className="p-5 rounded-3xl bg-(--surface) border border-(--border) shadow-(--shadow-card) hover:shadow-(--shadow-hover) transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-2xl ${c.bg} ${c.color} border ${c.border} flex items-center justify-center`}>
                  <Icon size={24} />
                </div>
                <ArrowUpRight size={16} className="text-(--text-muted) group-hover:text-primary transition-colors" />
              </div>

              <div className="mt-4">
                <p className="text-xs uppercase font-semibold text-(--text-muted) tracking-wider">
                  {c.title}
                </p>
                <p className="text-2xl font-black text-(--text-title) tracking-tight mt-0.5">
                  {c.value}
                </p>
                <p className="text-xs text-(--text-muted) mt-1">
                  {c.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* SEÇÃO PRINCIPAL: ALERTA DE VENCIMENTOS DE DATAS */}
      <AlertsSection entries={alertEntries} summary={alertSummary} />

      {/* Gráficos e Operações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CashFlowChart data={cashFlow} />
        <SupplierCategoryChart data={categoryData} />
      </div>

      {/* Próximos Embarques */}
      <UpcomingExcursions excursions={upcomingExcursions} />
    </div>
  );
}
