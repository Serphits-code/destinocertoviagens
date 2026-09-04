"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Check,
  MessageSquare,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Save,
  ShieldCheck,
  History,
  Compass,
  Users,
  ExternalLink,
  ChevronRight,
  Flame,
  Award,
  Sparkles,
} from "lucide-react";
import { updateClient } from "../actions";

interface Companion {
  companionId: string;
  name: string;
  tripsCount: number;
  lastTripName: string;
  lastTripDate: string | null;
}

interface ClientTripItem {
  id: string;
  groupName: string;
  destination: string | null;
  departureDate: string | null;
  returnDate: string | null;
  saleNumber: string | null;
  role: string;
  isGroupTrip: boolean;
  companions: { customerId: string; name: string }[];
}

interface ClientDetailProps {
  initialClient: any;
  financialSummary: {
    totalPurchased: number;
    totalPaid: number;
    totalPending: number;
    entriesCount: number;
  };
  travelSummary: {
    totalTrips: number;
    groupTripsCount: number;
    frequentCompanions: Companion[];
  };
}

function formatCpf(cpf: string | null) {
  if (!cpf) return "-";
  const c = cpf.replace(/\D/g, "");
  if (c.length === 11) {
    return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`;
  }
  return cpf;
}

function formatPhone(phone: string | null) {
  if (!phone) return "-";
  const p = phone.replace(/\D/g, "");
  if (p.length === 11) return `(${p.slice(0, 2)}) ${p.slice(2, 7)}-${p.slice(7)}`;
  if (p.length === 10) return `(${p.slice(0, 2)}) ${p.slice(2, 6)}-${p.slice(6)}`;
  return phone;
}

function formatDate(iso: string | null) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "-";
  }
}

function formatCurrency(val: number) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ClientDetailClient({
  initialClient,
  financialSummary,
  travelSummary,
}: ClientDetailProps) {
  const [client, setClient] = useState(initialClient);
  const [form, setForm] = useState({ ...initialClient });
  const [activeTab, setActiveTab] = useState<"viagens" | "financeiro" | "cadastro">("viagens");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const cleanMobile = form.mobile ? form.mobile.replace(/\D/g, "") : null;
  const hasWa = cleanMobile && cleanMobile.length >= 10;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus("saving");
    setErrorMessage("");

    const res = await updateClient(client.id, form);
    if (res.success) {
      setSaveStatus("saved");
      setClient({ ...client, ...form });
      setTimeout(() => setSaveStatus("idle"), 2000);
    } else {
      setSaveStatus("error");
      setErrorMessage(res.error || "Erro ao salvar alterações");
    }
  };

  const trips: ClientTripItem[] = client.trips || [];
  const frequentCompanions = travelSummary?.frequentCompanions || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Botão Voltar */}
      <div>
        <Link
          href="/clientes"
          className="inline-flex items-center gap-2 text-sm font-medium text-(--text-muted) hover:text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Voltar para Lista de Clientes</span>
        </Link>
      </div>

      {/* Header do Cliente com Avatar e Contatos */}
      <div className="p-6 rounded-3xl bg-(--surface) border border-(--border) shadow-(--shadow-card) flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl shrink-0 shadow-inner">
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-(--text-title)">
                {client.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Cliente Destino Certo
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-(--text-muted)">
              {client.cpf && (
                <span className="font-mono">CPF: {formatCpf(client.cpf)}</span>
              )}
              {client.rg && <span>RG: {client.rg}</span>}
              {client.city && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {client.city} - {client.state}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="flex items-center gap-3">
          {hasWa && (
            <a
              href={`https://wa.me/55${cleanMobile}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-all shadow-md cursor-pointer"
            >
              <MessageSquare size={16} />
              <span>Chamar no WhatsApp</span>
            </a>
          )}
        </div>
      </div>

      {/* Cards de Resumo Inteligente (Viagens, Companheiros e Financeiro) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Viagens */}
        <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
              Total de Viagens
            </span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Compass size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-(--text-title) mt-2">
            {travelSummary?.totalTrips || 0}
          </p>
          <p className="text-xs text-primary font-medium mt-0.5">
            {travelSummary?.groupTripsCount || 0} em grupos / excursões
          </p>
        </div>

        {/* Companheiros de Viagem */}
        <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
              Companheiros Frequentes
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-(--text-title) mt-2">
            {frequentCompanions.length}
          </p>
          <p className="text-xs text-indigo-600 font-medium mt-0.5">
            Viajam habitualmente juntos
          </p>
        </div>

        {/* Total em Viagens Contratadas */}
        <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
              Total em Contratos
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            {formatCurrency(financialSummary.totalPurchased)}
          </p>
          <p className="text-xs text-emerald-600/80 mt-0.5">
            Pago: {formatCurrency(financialSummary.totalPaid)}
          </p>
        </div>

        {/* Saldo Pendente */}
        <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
              Saldo em Aberto
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <p
            className={`text-2xl font-bold mt-2 ${
              financialSummary.totalPending > 0 ? "text-amber-600" : "text-(--text-title)"
            }`}
          >
            {formatCurrency(financialSummary.totalPending)}
          </p>
          <p className="text-xs text-(--text-muted) mt-0.5">
            {financialSummary.totalPending > 0 ? "Parcelas a vencer/vencidas" : "Tudo quitado"}
          </p>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex items-center gap-2 border-b border-(--border) pb-2">
        <button
          onClick={() => setActiveTab("viagens")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === "viagens"
              ? "bg-primary text-white shadow-md shadow-primary/20"
              : "text-(--text-muted) hover:text-(--text-title) hover:bg-(--surface)"
          }`}
        >
          <Compass size={16} />
          <span>Histórico de Viagens & Grupos</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
              activeTab === "viagens"
                ? "bg-white/20 text-white"
                : "bg-(--surface-subtle) text-(--text-muted)"
            }`}
          >
            {travelSummary?.totalTrips || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("financeiro")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === "financeiro"
              ? "bg-primary text-white shadow-md shadow-primary/20"
              : "text-(--text-muted) hover:text-(--text-title) hover:bg-(--surface)"
          }`}
        >
          <CreditCard size={16} />
          <span>Financeiro & Parcelas</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
              activeTab === "financeiro"
                ? "bg-white/20 text-white"
                : "bg-(--surface-subtle) text-(--text-muted)"
            }`}
          >
            {financialSummary.entriesCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("cadastro")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === "cadastro"
              ? "bg-primary text-white shadow-md shadow-primary/20"
              : "text-(--text-muted) hover:text-(--text-title) hover:bg-(--surface)"
          }`}
        >
          <User size={16} />
          <span>Dados Cadastrais & Edição</span>
        </button>
      </div>

      {/* ABA 1: HISTÓRICO DE VIAGENS & GRUPOS */}
      {activeTab === "viagens" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* SEÇÃO 1: COMPANHEIROS FREQUENTES DE VIAGEM ("Com quem costuma viajar") */}
          <div className="p-6 rounded-3xl bg-(--surface) border border-(--border) shadow-(--shadow-card) space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-(--border)">
              <div>
                <h2 className="font-bold text-base text-(--text-title) flex items-center gap-2">
                  <Users size={18} className="text-primary" />
                  <span>Com quem costuma viajar (Acompanhantes Frequentes)</span>
                </h2>
                <p className="text-xs text-(--text-muted) mt-0.5">
                  Clientes identificados que mais compartilharam contratos, reservas e excursões com{" "}
                  <strong>{client.name}</strong>
                </p>
              </div>

              <span className="px-3 py-1 rounded-xl bg-primary/10 text-primary text-xs font-bold shrink-0 self-start sm:self-auto">
                {frequentCompanions.length} acompanhante{frequentCompanions.length !== 1 ? "s" : ""}
              </span>
            </div>

            {frequentCompanions.length === 0 ? (
              <div className="py-8 text-center text-(--text-muted)">
                <Users size={32} className="mx-auto mb-2 opacity-30" />
                <p className="font-medium text-sm">
                  Nenhum acompanhante frequente identificado até o momento
                </p>
                <p className="text-xs text-(--text-muted) mt-0.5">
                  As viagens deste cliente foram realizadas de forma individual.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                {frequentCompanions.map((comp, idx) => {
                  const medal =
                    idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;

                  return (
                    <div
                      key={comp.companionId}
                      className="group relative p-4 rounded-2xl bg-(--surface-subtle)/70 hover:bg-(--surface-subtle) border border-(--border) hover:border-primary/40 transition-all flex flex-col justify-between gap-3 shadow-2xs hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative w-11 h-11 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-base shadow-inner">
                          {comp.name.charAt(0).toUpperCase()}
                          {medal && (
                            <span className="absolute -top-1.5 -right-1.5 text-xs">
                              {medal}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-sm text-(--text-title) truncate group-hover:text-primary transition-colors">
                            {comp.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 font-extrabold text-[11px] border border-amber-500/20">
                              <Flame size={11} className="text-amber-500" />
                              <span>{comp.tripsCount} viagem{comp.tripsCount !== 1 ? "ns" : ""} juntos</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-(--border)/60 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-(--text-muted) truncate max-w-[170px]" title={comp.lastTripName}>
                          Última: {comp.lastTripName}
                        </span>

                        <Link
                          href={`/clientes/${comp.companionId}`}
                          className="inline-flex items-center gap-1 text-primary hover:underline font-bold text-xs shrink-0 cursor-pointer"
                        >
                          <span>Ver Perfil</span>
                          <ChevronRight size={14} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SEÇÃO 2: HISTÓRICO COMPLETO DE VIAGENS & EXCURSÕES */}
          <div className="p-6 rounded-3xl bg-(--surface) border border-(--border) shadow-(--shadow-card) space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-(--border)">
              <div>
                <h2 className="font-bold text-base text-(--text-title) flex items-center gap-2">
                  <Compass size={18} className="text-primary" />
                  <span>Histórico de Excursões & Viagens Cadastradas</span>
                </h2>
                <p className="text-xs text-(--text-muted) mt-0.5">
                  Todas as viagens, grupos de viagem e operações próprias onde o cliente participou
                </p>
              </div>

              <span className="px-3 py-1 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) text-xs font-bold shrink-0 self-start sm:self-auto">
                {trips.length} viagem{trips.length !== 1 ? "ns" : ""} no histórico
              </span>
            </div>

            {trips.length === 0 ? (
              <div className="py-12 text-center text-(--text-muted)">
                <Compass size={36} className="mx-auto mb-2 opacity-30" />
                <p className="font-semibold text-sm">Nenhuma viagem registrada</p>
                <p className="text-xs text-(--text-muted) mt-0.5">
                  Não foram encontrados contratos de viagem antigos vinculados a este cliente.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {trips.map((trip) => {
                  return (
                    <div
                      key={trip.id}
                      className="p-4 rounded-2xl bg-(--surface-subtle)/50 hover:bg-(--surface-subtle) border border-(--border) hover:border-primary/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 min-w-0 flex-1">
                        {/* Badges de Destaque */}
                        <div className="flex flex-wrap items-center gap-2">
                          {trip.isGroupTrip ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                              <Users size={12} />
                              <span>Excursão em Grupo (Operação Própria)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                              <Compass size={12} />
                              <span>Viagem Individual / Pacote</span>
                            </span>
                          )}

                          {trip.role === "PAGANTE_E_PASSAGEIRO" ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-semibold text-[11px]">
                              Pagante & Passageiro
                            </span>
                          ) : trip.role === "PAGANTE" ? (
                            <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 font-semibold text-[11px]">
                              Contratante / Pagante
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 font-semibold text-[11px]">
                              Passageiro
                            </span>
                          )}

                          {trip.saleNumber && (
                            <span className="text-[11px] font-mono text-(--text-muted)">
                              Contrato #{trip.saleNumber}
                            </span>
                          )}
                        </div>

                        {/* Nome do Pacote / Grupo */}
                        <h3 className="font-bold text-base text-(--text-title) truncate">
                          {trip.groupName}
                        </h3>

                        {/* Datas de Embarque e Retorno */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-(--text-muted)">
                          {trip.departureDate && (
                            <span className="flex items-center gap-1">
                              <Calendar size={13} className="text-primary" />
                              <span>
                                Embarque: <strong>{formatDate(trip.departureDate)}</strong>
                              </span>
                            </span>
                          )}
                          {trip.returnDate && (
                            <span>
                              Retorno: <strong>{formatDate(trip.returnDate)}</strong>
                            </span>
                          )}
                        </div>

                        {/* Acompanhantes que viajaram junto nesta mesma reserva */}
                        {trip.companions && trip.companions.length > 0 && (
                          <div className="pt-2 border-t border-(--border)/60">
                            <span className="text-xs font-semibold text-(--text-muted) block mb-1.5">
                              Viajou junto com nesta reserva:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {trip.companions.slice(0, 8).map((comp) => (
                                <Link
                                  key={comp.customerId}
                                  href={`/clientes/${comp.customerId}`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-(--surface) hover:bg-primary/10 text-(--text-title) hover:text-primary border border-(--border) hover:border-primary/40 text-xs font-medium transition-colors cursor-pointer"
                                  title="Clique para abrir o perfil deste passageiro"
                                >
                                  <div className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">
                                    {comp.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span>{comp.name}</span>
                                </Link>
                              ))}
                              {trip.companions.length > 8 && (
                                <span className="text-xs text-(--text-muted) self-center px-1">
                                  +{trip.companions.length - 8} outros
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 2: HISTÓRICO FINANCEIRO */}
      {activeTab === "financeiro" && (
        <div className="p-6 rounded-3xl bg-(--surface) border border-(--border) shadow-(--shadow-card) space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-(--border)">
            <div>
              <h2 className="font-bold text-base text-(--text-title) flex items-center gap-2">
                <CreditCard size={18} className="text-primary" />
                <span>Histórico Financeiro & Parcelas</span>
              </h2>
              <p className="text-xs text-(--text-muted) mt-0.5">
                Lançamentos de cobranças, recebimentos e títulos vinculados a este cliente
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-semibold text-xs">
              {client.financialEntries.length} registros
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-(--surface-subtle) border-b border-(--border) text-(--text-muted) font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Descrição / Pacote</th>
                  <th className="py-2.5 px-3">Vencimento</th>
                  <th className="py-2.5 px-3">Liquidação</th>
                  <th className="py-2.5 px-3">Valor</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border)">
                {client.financialEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-(--text-muted)">
                      <History size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="font-medium">Nenhum lançamento financeiro registrado</p>
                    </td>
                  </tr>
                ) : (
                  client.financialEntries.map((entry: any) => {
                    const isPaid = entry.status === "PAGO";

                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-(--surface-subtle)/70 transition-colors"
                      >
                        <td className="py-3 px-3">
                          <p className="font-semibold text-(--text-title) max-w-[280px] truncate">
                            {entry.description}
                          </p>
                          {entry.document && (
                            <p className="text-[11px] text-(--text-muted) font-mono">
                              Doc: {entry.document}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-(--text-title) font-mono">
                          {formatDate(entry.dueDate)}
                        </td>
                        <td className="py-3 px-3 text-(--text-title) font-mono">
                          {formatDate(entry.paidAt)}
                        </td>
                        <td className="py-3 px-3 font-bold text-(--text-title)">
                          {formatCurrency(entry.amount)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold text-[11px] ${
                              isPaid
                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                            }`}
                          >
                            {isPaid ? (
                              <>
                                <CheckCircle2 size={12} />
                                <span>Pago</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle size={12} />
                                <span>Pendente</span>
                              </>
                            )}
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
      )}

      {/* ABA 3: DADOS CADASTRAIS & EDIÇÃO */}
      {activeTab === "cadastro" && (
        <form
          onSubmit={handleSave}
          className="p-6 rounded-3xl bg-(--surface) border border-(--border) shadow-(--shadow-card) space-y-5 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-(--border) pb-4">
            <h2 className="font-bold text-base text-(--text-title) flex items-center gap-2">
              <User size={18} className="text-primary" />
              <span>Dados Cadastrais & Endereço</span>
            </h2>
            <button
              type="submit"
              disabled={saveStatus === "saving"}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-strong transition-all shadow cursor-pointer disabled:opacity-50"
            >
              {saveStatus === "saving" ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : saveStatus === "saved" ? (
                <>
                  <Check size={14} />
                  <span>Salvo com sucesso!</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Coluna 1: Pessoais */}
            <div className="space-y-4">
              <div>
                <label className="block font-medium text-(--text-title) mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={form.name || ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-(--text-title) mb-1">CPF</label>
                  <input
                    type="text"
                    value={form.cpf || ""}
                    onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-(--text-title) mb-1">RG</label>
                  <input
                    type="text"
                    value={form.rg || ""}
                    onChange={(e) => setForm({ ...form, rg: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-(--text-title) mb-1">Data de Nascimento</label>
                  <input
                    type="date"
                    value={form.birthDate ? form.birthDate.split("T")[0] : ""}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-medium text-(--text-title) mb-1">Passaporte</label>
                  <input
                    type="text"
                    value={form.passport || ""}
                    onChange={(e) => setForm({ ...form, passport: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-(--text-title) mb-1">Celular / WhatsApp</label>
                  <input
                    type="text"
                    value={form.mobile || ""}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-(--text-title) mb-1">Telefone Fixo</label>
                  <input
                    type="text"
                    value={form.phone || ""}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-(--text-title) mb-1">E-mail</label>
                <input
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            {/* Coluna 2: Endereço e Observações */}
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block font-medium text-(--text-title) mb-1">Endereço</label>
                  <input
                    type="text"
                    value={form.address || ""}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-medium text-(--text-title) mb-1">Número</label>
                  <input
                    type="text"
                    value={form.number || ""}
                    onChange={(e) => setForm({ ...form, number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-(--text-title) mb-1">Bairro</label>
                  <input
                    type="text"
                    value={form.neighborhood || ""}
                    onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-medium text-(--text-title) mb-1">CEP</label>
                  <input
                    type="text"
                    value={form.zipCode || ""}
                    onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block font-medium text-(--text-title) mb-1">Cidade</label>
                  <input
                    type="text"
                    value={form.city || ""}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-medium text-(--text-title) mb-1">UF</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={form.state || ""}
                    onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) uppercase focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-(--text-title) mb-1">Observações Gerais</label>
                <textarea
                  rows={4}
                  value={form.notes || ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Preferências de viagem, assentos, histórico especial..."
                  className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
