"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart as PieIcon,
  BarChart3,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Sparkles,
  Building2,
  Bus,
  Plane,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  X,
  Download,
  Search,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Layers,
  BedDouble,
  Info,
  Calendar,
  Ticket,
  Copy,
  Check,
  AlertCircle,
  Phone,
  FileText,
  MapPin,
  Wifi,
  Droplets,
  Wind,
} from "lucide-react";
import type { EditorBlock } from "@/lib/editor-types";
import type { ExcursionAddon } from "@/lib/actions/addons";
import type { RoomEntry } from "./RoomListView";
import { parseNum } from "@/lib/package-calc";

export interface PassengerReportItem {
  id: string;
  name: string;
  age: number | null;
  birthDate?: string | null;
  tipo: string;
  roomName: string;
  roomMatchedTierLabel?: string;
  paymentMode: "vista" | "prazo" | "personalizado";
  isPersonalizado: boolean;
  blockBreakdown: {
    blockId: string;
    blockTitle: string;
    category: string;
    cost: number;
    tierLabel: string;
  }[];
  basePackageCost: number;
  agencyProfit: number;
  packageFinalPrice: number;
  passengerAddons: ExcursionAddon[];
  passengerAddonsDetailed: {
    addon: ExcursionAddon;
    cost: number;
    profit: number;
    price: number;
    tierLabel?: string;
  }[];
  totalAddonsPrice: number;
  totalAddonsCost: number;
  totalAddonsProfit: number;
  totalReceivable: number;
  amountPaid: number;
  pendingAmount: number;
  status: "pago" | "parcial" | "pendente" | string;
}

export interface SupplierReportItem {
  blockId: string;
  category: string;
  title: string;
  supplierName: string;
  totalCost: number;
  sinalCost: number;
  balanceToPay: number;
  prazoSinal: string | null;
  prazoPagamentoTotal: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prazosPagamentoFinal?: any;
}

export interface ExcursionFinancialChartsProps {
  excursionName: string;
  passengerReport: PassengerReportItem[];
  suppliersReport: SupplierReportItem[];
  addons: ExcursionAddon[];
  blocks: EditorBlock[];
  rooms: RoomEntry[];
  slots: number;
  profitMargin: number;
  summary: {
    totalPassengers: number;
    confirmedCount: number;
    totalPackageRevenue: number;
    totalAddonsRevenue: number;
    grossRevenue: number;
    totalBlocksCost: number;
    totalAddonsCost: number;
    totalOperatingCost: number;
    netProfit: number;
    netMarginPercent: number;
    averageTicket: number;
    totalReceived: number;
    totalPending: number;
    breakEvenPax: number;
    fixedBlocksTotal: number;
  };
  initialChartMode?: "entradas" | "lucro" | "saidas" | "comparativo" | "extras";
}

export type SelectedDrilldown =
  | { type: "addon_single"; addonId: string; title: string }
  | { type: "addon_all"; title: string }
  | { type: "package_base"; title: string }
  | { type: "package_room"; roomType: string; title: string }
  | { type: "cost_category"; category: string; title: string }
  | { type: "cost_supplier"; blockId: string; title: string }
  | { type: "payment_status"; status: "pago" | "parcial" | "pendente"; title: string }
  | { type: "payment_mode"; mode: "vista" | "prazo" | "personalizado"; title: string }
  | null;

const fmt = (v: number) =>
  (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (d?: string | null) => {
  if (!d) return "-";
  const date = new Date(d);
  return isNaN(date.getTime())
    ? d
    : date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
};

// =========================================================================
// SUBCOMPONENTES: CARDS OPERACIONAIS DOS BLOCOS (AÉREO, HOTEL, BUS, ETC.)
// =========================================================================

function AereoOperationalCard({
  block,
  fmt,
  fmtDate,
  copiedLoc,
  onCopyLoc,
}: {
  block: EditorBlock;
  fmt: (v: number) => string;
  fmtDate: (d?: string | null) => string;
  copiedLoc: string | null;
  onCopyLoc: (loc: string) => void;
}) {
  const d = block.data || {};
  const vagasNum = parseNum(d.vagas) || parseNum(d.rateioPessoas) || 0;
  const custoUnit = parseNum(d.custoUnitario);
  const custoTotal =
    parseNum(d.custoTotal) || (vagasNum > 0 && custoUnit > 0 ? custoUnit * vagasNum : 0);
  const netUnit = parseNum(d.valorNetUnitario);
  const netTotal =
    parseNum(d.valorNetTotal ?? d.valorNet) || (vagasNum > 0 && netUnit > 0 ? netUnit * vagasNum : 0);
  const sinalUnit = parseNum(d.sinalUnitario);
  const sinalTotal =
    parseNum(d.sinalTotal ?? d.sinal) || (vagasNum > 0 && sinalUnit > 0 ? sinalUnit * vagasNum : 0);
  const saldo = Math.max(0, custoTotal - sinalTotal);
  const flights: Array<{
    cia: string;
    voo: string;
    origem: string;
    saida: string;
    chegada: string;
    destino: string;
    tipo: string;
    status: string;
    conexaoDeId?: string;
  }> = Array.isArray(d.flights) ? d.flights : [];

  return (
    <div className="bg-surface rounded-3xl border border-cyan-500/30 overflow-hidden shadow-xs space-y-4 p-5">
      {/* Header do Card Aéreo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/20">
            <Plane size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 uppercase tracking-wider">
                Transporte Aéreo
              </span>
              {d.localizador && (
                <button
                  type="button"
                  onClick={() => onCopyLoc(d.localizador)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-surface-subtle border border-border text-text-title hover:border-cyan-500 hover:text-cyan-600 transition-all cursor-pointer group"
                  title="Clique para copiar o Localizador"
                >
                  <span>LOC: {d.localizador}</span>
                  {copiedLoc === d.localizador ? (
                    <Check size={12} className="text-status-success" />
                  ) : (
                    <Copy size={11} className="text-text-muted group-hover:text-cyan-500 transition-colors" />
                  )}
                </button>
              )}
            </div>
            <h4 className="text-base font-black text-text-title mt-1">
              {block.title || "Voo Regular / Fretamento Aéreo"}
            </h4>
          </div>
        </div>

        {/* Metadados do Voo */}
        <div className="flex items-center gap-2 flex-wrap">
          {vagasNum > 0 && (
            <span className="px-3 py-1 rounded-xl bg-surface-subtle border border-border text-xs font-semibold text-text-title flex items-center gap-1.5">
              <Users size={13} className="text-cyan-500" />
              <span>{vagasNum} vagas / bilhetes</span>
            </span>
          )}
          {d.portal && (
            <span className="px-3 py-1 rounded-xl bg-surface-subtle border border-border text-xs font-medium text-text-muted">
              Portal: <strong className="text-text-title">{d.portal}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Itinerário de Voos (Tabela Operacional) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-title uppercase tracking-wider flex items-center gap-1.5">
            <Ticket size={14} className="text-cyan-500" />
            Itinerário Operacional dos Voos
          </span>
          <span className="text-[11px] text-text-muted font-medium">
            {flights.length} {flights.length === 1 ? "trecho registrado" : "trechos registrados"}
          </span>
        </div>

        {flights.length === 0 ? (
          <div className="p-5 rounded-2xl bg-surface-subtle/50 border border-border text-xs text-text-muted text-center">
            Nenhum trecho de voo detalhado adicionado na tabela deste bloco aéreo.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-surface-subtle text-[11px] font-bold text-text-muted uppercase tracking-wider border-b border-border">
                  <th className="py-2.5 px-3">Cia Aérea</th>
                  <th className="py-2.5 px-3">Voo</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Origem</th>
                  <th className="py-2.5 px-3 text-center">Horário Saída</th>
                  <th className="py-2.5 px-3 text-center">Horário Chegada</th>
                  <th className="py-2.5 px-3">Destino</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {flights.map((f, i) => (
                  <tr key={i} className="hover:bg-surface-subtle/40 transition-colors">
                    <td className="py-2.5 px-3 font-extrabold text-cyan-600 dark:text-cyan-400">
                      {f.cia || "AZUL"}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-text-title">
                      {f.voo || "-"}
                    </td>
                    <td className="py-2.5 px-3">
                      {f.conexaoDeId ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          ↳ Conexão
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-surface-subtle border border-border text-[11px] font-medium text-text-body">
                          {f.tipo || "Ida"}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-text-title">
                      {f.origem || "-"}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-text-title">
                      {f.saida || "-"}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-text-title">
                      {f.chegada || "-"}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-text-title">
                      {f.destino || "-"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          f.status === "CONFIRMADO"
                            ? "bg-status-success/15 text-status-success border border-status-success/30"
                            : f.status === "CANCELADO"
                            ? "bg-status-danger/15 text-status-danger border border-status-danger/30 line-through"
                            : "bg-status-warning/15 text-status-warning border border-status-warning/30"
                        }`}
                      >
                        {f.status || "CONFIRMADO"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grid Financeiro do Card Aéreo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-2xl border border-border bg-surface-subtle/40">
        <div>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
            Valor das Passagens
          </span>
          <span className="text-base font-black text-text-title font-mono block mt-0.5">
            {fmt(custoTotal)}
          </span>
          <span className="text-[11px] text-text-muted font-medium block mt-0.5">
            Unitário: {fmt(custoUnit)} / pax
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            Valor NET (Tarifa Líquida)
          </span>
          <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono block mt-0.5">
            {fmt(netTotal)}
          </span>
          <span className="text-[11px] text-text-muted font-medium block mt-0.5">
            Unitário: {fmt(netUnit)} / pax
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">
            Sinal Pago
          </span>
          <span className="text-base font-black text-amber-500 font-mono block mt-0.5">
            {fmt(sinalTotal)}
          </span>
          <span className="text-[11px] text-text-muted font-medium block mt-0.5">
            {d.prazoSinal ? `Prazo: ${fmtDate(d.prazoSinal)}` : "Sem sinal pendente"}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-status-danger uppercase tracking-wider block">
            Saldo Restante a Pagar
          </span>
          <span className="text-base font-black text-status-danger font-mono block mt-0.5">
            {fmt(saldo)}
          </span>
          <span className="text-[11px] text-text-muted font-medium block mt-0.5">
            {saldo === 0 ? "✓ 100% Quitado" : "A liquidar com fornecedor"}
          </span>
        </div>
      </div>

      {/* Prazos Críticos Operacionais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="p-3 rounded-2xl border border-border bg-surface flex items-center justify-between">
          <span className="text-text-muted font-medium">Prazo Pagamento Sinal:</span>
          <strong className="text-text-title font-mono font-bold">{fmtDate(d.prazoSinal)}</strong>
        </div>
        <div className="p-3 rounded-2xl border border-border bg-surface flex items-center justify-between">
          <span className="text-text-muted font-medium">Prazo Emissão / Bilhetes:</span>
          <strong className="text-text-title font-mono font-bold">{fmtDate(d.prazoEmissao)}</strong>
        </div>
        <div className="p-3 rounded-2xl border border-border bg-surface flex items-center justify-between">
          <span className="text-text-muted font-medium">Prazo Liquidação Total:</span>
          <strong className="text-text-title font-mono font-bold">{fmtDate(d.prazoPagamentoTotal)}</strong>
        </div>
      </div>

      {/* Parcelas Finais de Pagamento (se houver) */}
      {Array.isArray(d.prazosPagamentoFinal) &&
        d.prazosPagamentoFinal.filter((p: any) => p?.data?.trim()).length > 1 && (
          <div className="p-3.5 rounded-2xl border border-border bg-surface space-y-2 text-xs">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
              Cronograma de Parcelas ao Fornecedor:
            </span>
            <div className="flex flex-wrap gap-2">
              {d.prazosPagamentoFinal
                .filter((p: any) => p?.data?.trim())
                .map((p: any, idx: number) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 font-medium"
                  >
                    <span className="font-bold">{idx + 1}ª Parcela:</span>
                    <span>{fmtDate(p.data)}</span>
                    {p.valor && <strong className="font-mono">({fmt(parseNum(p.valor))})</strong>}
                  </span>
                ))}
            </div>
          </div>
        )}

      {/* Observações Operacionais */}
      {d.observation && (
        <div className="p-3.5 rounded-2xl bg-surface-subtle/80 border border-border text-xs text-text-body flex items-start gap-2.5">
          <Info size={15} className="text-cyan-500 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-text-title font-semibold mb-0.5">
              Observações Operacionais:
            </strong>
            <p className="whitespace-pre-line text-text-muted leading-relaxed">{d.observation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function HospedagemOperationalCard({
  block,
  fmt,
  fmtDate,
  copiedLoc,
  onCopyLoc,
}: {
  block: EditorBlock;
  fmt: (v: number) => string;
  fmtDate: (d?: string | null) => string;
  copiedLoc: string | null;
  onCopyLoc: (loc: string) => void;
}) {
  const d = block.data || {};
  const hotelName = d.hotel || block.title || "Hotel / Pousada";
  let totalReserva = parseNum(d.totalReserva);
  const rooms: Array<{ tipo: string; qtd: string | number; diaria: string | number; totalPeriodo: string | number }> =
    Array.isArray(d.rooms) ? d.rooms : [];

  if (totalReserva === 0 && rooms.length > 0) {
    rooms.forEach((r) => {
      const totPer = parseNum(r.totalPeriodo);
      const qtd = parseNum(r.qtd) || 1;
      const diaria = parseNum(r.diaria);
      if (totPer > 0) totalReserva += totPer;
      else if (diaria > 0) totalReserva += diaria * (parseNum(d.diarias) || 1) * qtd;
    });
  }

  const sinalTotal = parseNum(d.sinalTotal ?? d.sinal);
  const saldo = Math.max(0, totalReserva - sinalTotal);

  return (
    <div className="bg-surface rounded-3xl border border-orange-500/30 overflow-hidden shadow-xs space-y-4 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/20">
            <Building2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 uppercase tracking-wider">
                Hospedagem
              </span>
              {d.localizador && (
                <button
                  type="button"
                  onClick={() => onCopyLoc(d.localizador)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-surface-subtle border border-border text-text-title hover:border-orange-500 hover:text-orange-600 transition-all cursor-pointer group"
                >
                  <span>LOC: {d.localizador}</span>
                  {copiedLoc === d.localizador ? (
                    <Check size={12} className="text-status-success" />
                  ) : (
                    <Copy size={11} className="text-text-muted group-hover:text-orange-500 transition-colors" />
                  )}
                </button>
              )}
            </div>
            <h4 className="text-base font-black text-text-title mt-1">{hotelName}</h4>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {d.checkin && (
            <span className="px-3 py-1 rounded-xl bg-surface-subtle border border-border text-text-muted font-medium">
              Check-in: <strong className="text-text-title">{fmtDate(d.checkin)}</strong>
            </span>
          )}
          {d.checkout && (
            <span className="px-3 py-1 rounded-xl bg-surface-subtle border border-border text-text-muted font-medium">
              Check-out: <strong className="text-text-title">{fmtDate(d.checkout)}</strong>
            </span>
          )}
          {d.diarias && (
            <span className="px-3 py-1 rounded-xl bg-orange-500/10 text-orange-600 border border-orange-500/20 font-bold">
              {d.diarias} {d.diarias === 1 || d.diarias === "1" ? "diária" : "diárias"}
            </span>
          )}
        </div>
      </div>

      {/* Tabela de Quartos */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-text-title uppercase tracking-wider flex items-center gap-1.5">
          <BedDouble size={14} className="text-orange-500" />
          Quartos & Acomodações Reservadas
        </span>

        {rooms.length === 0 ? (
          <div className="p-5 rounded-2xl bg-surface-subtle/50 border border-border text-xs text-text-muted text-center">
            Nenhuma configuração de quartos cadastrada para este hotel.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-surface-subtle text-[11px] font-bold text-text-muted uppercase tracking-wider border-b border-border">
                  <th className="py-2.5 px-3">Tipo de Quarto</th>
                  <th className="py-2.5 px-3 text-center">Qtd Quartos</th>
                  <th className="py-2.5 px-3 text-right">Diária (R$)</th>
                  <th className="py-2.5 px-3 text-right">Total Período</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rooms.map((rm, i) => (
                  <tr key={i} className="hover:bg-surface-subtle/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-text-title">{rm.tipo}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-text-title">
                      {rm.qtd}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-text-muted">
                      {fmt(parseNum(rm.diaria))}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-text-title">
                      {fmt(
                        parseNum(rm.totalPeriodo) ||
                          parseNum(rm.diaria) * (parseNum(d.diarias) || 1) * (parseNum(rm.qtd) || 1)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grid Financeiro */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl border border-border bg-surface-subtle/40">
        <div>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
            Total da Reserva Hotel
          </span>
          <span className="text-base font-black text-text-title font-mono block mt-0.5">
            {fmt(totalReserva)}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">
            Sinal Pago
          </span>
          <span className="text-base font-black text-amber-500 font-mono block mt-0.5">
            {fmt(sinalTotal)}
          </span>
          <span className="text-[11px] text-text-muted font-medium block mt-0.5">
            {d.prazoSinal ? `Prazo: ${fmtDate(d.prazoSinal)}` : "Sem sinal pendente"}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-status-danger uppercase tracking-wider block">
            Saldo a Liquidar
          </span>
          <span className="text-base font-black text-status-danger font-mono block mt-0.5">
            {fmt(saldo)}
          </span>
          <span className="text-[11px] text-text-muted font-medium block mt-0.5">
            {d.prazoPagamentoTotal ? `Prazo: ${fmtDate(d.prazoPagamentoTotal)}` : "Sem prazo"}
          </span>
        </div>
      </div>

      {d.observation && (
        <div className="p-3.5 rounded-2xl bg-surface-subtle/80 border border-border text-xs text-text-body flex items-start gap-2.5">
          <Info size={15} className="text-orange-500 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-text-title font-semibold mb-0.5">
              Observações da Hospedagem:
            </strong>
            <p className="whitespace-pre-line text-text-muted leading-relaxed">{d.observation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function RodoviarioOperationalCard({
  block,
  fmt,
  fmtDate,
}: {
  block: EditorBlock;
  fmt: (v: number) => string;
  fmtDate: (d?: string | null) => string;
}) {
  const d = block.data || {};
  const empresa = d.empresa || block.title || "Empresa de Ônibus";
  const vagasNum = parseNum(d.vagas) || parseNum(d.rateioPessoas) || 0;
  const valorContrato =
    parseNum(d.valorContrato ?? d.valorNetTotal ?? d.valorNet) ||
    parseNum(d.rateioPorPessoa) * vagasNum;
  const sinalTotal = parseNum(d.sinalTotal ?? d.sinal);
  const saldo = Math.max(0, valorContrato - sinalTotal);

  return (
    <div className="bg-surface rounded-3xl border border-blue-500/30 overflow-hidden shadow-xs space-y-4 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
            <Bus size={20} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase tracking-wider">
              Transporte Rodoviário
            </span>
            <h4 className="text-base font-black text-text-title mt-1">{empresa}</h4>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {d.veiculo && (
            <span className="px-3 py-1 rounded-xl bg-surface-subtle border border-border font-medium text-text-title">
              Veículo: <strong>{d.veiculo}</strong>
            </span>
          )}
          {vagasNum > 0 && (
            <span className="px-3 py-1 rounded-xl bg-surface-subtle border border-border text-xs font-semibold text-text-title flex items-center gap-1.5">
              <Users size={13} className="text-blue-500" />
              <span>{vagasNum} vagas</span>
            </span>
          )}
          {d.atendente && (
            <span className="px-3 py-1 rounded-xl bg-surface-subtle border border-border text-text-muted">
              Contato: <strong className="text-text-title">{d.atendente}</strong>{" "}
              {d.telefone ? `(${d.telefone})` : ""}
            </span>
          )}
        </div>
      </div>

      {/* Itinerário e Comodidades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {d.itinerario && (
          <div className="p-3.5 rounded-2xl border border-border bg-surface-subtle/50 space-y-1">
            <span className="font-bold text-text-title uppercase text-[10px] tracking-wider block">
              Itinerário Previsto:
            </span>
            <p className="text-text-body whitespace-pre-line leading-relaxed">{d.itinerario}</p>
          </div>
        )}

        <div className="p-3.5 rounded-2xl border border-border bg-surface-subtle/50 space-y-1.5">
          <span className="font-bold text-text-title uppercase text-[10px] tracking-wider block">
            Comodidades a Bordo:
          </span>
          <div className="flex flex-wrap gap-2 pt-0.5">
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${
                d.ar
                  ? "bg-status-success/10 text-status-success border-status-success/30 font-semibold"
                  : "bg-surface text-text-muted border-border"
              }`}
            >
              <Wind size={13} /> Ar Condicionado
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${
                d.agua
                  ? "bg-status-success/10 text-status-success border-status-success/30 font-semibold"
                  : "bg-surface text-text-muted border-border"
              }`}
            >
              <Droplets size={13} /> Água Mineral
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${
                d.wifi
                  ? "bg-status-success/10 text-status-success border-status-success/30 font-semibold"
                  : "bg-surface text-text-muted border-border"
              }`}
            >
              <Wifi size={13} /> Wi-Fi a Bordo
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${
                d.banheiro
                  ? "bg-status-success/10 text-status-success border-status-success/30 font-semibold"
                  : "bg-surface text-text-muted border-border"
              }`}
            >
              Sanitário
            </span>
          </div>
        </div>
      </div>

      {/* Grid Financeiro */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl border border-border bg-surface-subtle/40">
        <div>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
            Valor do Contrato
          </span>
          <span className="text-base font-black text-text-title font-mono block mt-0.5">
            {fmt(valorContrato)}
          </span>
          {vagasNum > 0 && (
            <span className="text-[11px] text-text-muted font-medium block mt-0.5">
              Rateio: {fmt(valorContrato / vagasNum)} / vaga
            </span>
          )}
        </div>
        <div>
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">
            Sinal Pago
          </span>
          <span className="text-base font-black text-amber-500 font-mono block mt-0.5">
            {fmt(sinalTotal)}
          </span>
          <span className="text-[11px] text-text-muted font-medium block mt-0.5">
            {d.prazoSinal ? `Prazo: ${fmtDate(d.prazoSinal)}` : "-"}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-status-danger uppercase tracking-wider block">
            Saldo a Pagar
          </span>
          <span className="text-base font-black text-status-danger font-mono block mt-0.5">
            {fmt(saldo)}
          </span>
          <span className="text-[11px] text-text-muted font-medium block mt-0.5">
            {d.prazoPagamentoTotal ? `Prazo: ${fmtDate(d.prazoPagamentoTotal)}` : "-"}
          </span>
        </div>
      </div>

      {d.observation && (
        <div className="p-3.5 rounded-2xl bg-surface-subtle/80 border border-border text-xs text-text-body flex items-start gap-2.5">
          <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-text-title font-semibold mb-0.5">Observações:</strong>
            <p className="whitespace-pre-line text-text-muted leading-relaxed">{d.observation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function GuiasOperationalCard({
  block,
  fmt,
  fmtDate,
}: {
  block: EditorBlock;
  fmt: (v: number) => string;
  fmtDate: (d?: string | null) => string;
}) {
  const d = block.data || {};
  const guias: Array<{
    nome: string;
    funcao?: string;
    telefone?: string;
    diarias?: string | number;
    valorDiaria?: string | number;
    valorTotal?: string | number;
  }> = Array.isArray(d.guias) ? d.guias : [];
  const despesas: Array<{ descricao: string; valor: string | number }> = Array.isArray(d.despesas)
    ? d.despesas
    : [];

  let totalCost = parseNum(d.totalDespesas);
  if (totalCost === 0) {
    let gTot = 0;
    for (const g of guias) {
      const vTot = parseNum(g.valorTotal);
      const dNum = parseNum(g.diarias);
      const vDiaria = parseNum(g.valorDiaria);
      gTot += vTot > 0 ? vTot : dNum > 0 && vDiaria > 0 ? dNum * vDiaria : 0;
    }
    for (const desp of despesas) {
      gTot += parseNum(desp.valor);
    }
    totalCost = gTot;
  }

  const sinal = parseNum(d.sinal);
  const saldo = Math.max(0, totalCost - sinal);

  return (
    <div className="bg-surface rounded-3xl border border-teal-500/30 overflow-hidden shadow-xs space-y-4 p-5">
      <div className="flex items-center justify-between border-b border-border/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20">
            <Users size={20} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 uppercase tracking-wider">
              Guias & Monitores
            </span>
            <h4 className="text-base font-black text-text-title mt-1">
              {block.title || "Equipe de Apoio e Guias"}
            </h4>
          </div>
        </div>

        <span className="text-xs font-semibold px-3 py-1 rounded-xl bg-surface-subtle border border-border text-text-title">
          {guias.length} {guias.length === 1 ? "guia cadastrado" : "guias cadastrados"}
        </span>
      </div>

      {guias.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface-subtle text-[11px] font-bold text-text-muted uppercase tracking-wider border-b border-border">
                <th className="py-2.5 px-3">Profissional</th>
                <th className="py-2.5 px-3">Função</th>
                <th className="py-2.5 px-3">Telefone</th>
                <th className="py-2.5 px-3 text-center">Diárias</th>
                <th className="py-2.5 px-3 text-right">Valor Diária</th>
                <th className="py-2.5 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {guias.map((g, i) => (
                <tr key={i} className="hover:bg-surface-subtle/40 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-text-title">{g.nome}</td>
                  <td className="py-2.5 px-3 text-text-muted">{g.funcao || "Guia de Turismo"}</td>
                  <td className="py-2.5 px-3 text-text-muted">{g.telefone || "-"}</td>
                  <td className="py-2.5 px-3 text-center font-mono">{g.diarias || 1}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-text-muted">
                    {fmt(parseNum(g.valorDiaria))}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-text-title">
                    {fmt(parseNum(g.valorTotal) || parseNum(g.valorDiaria) * (parseNum(g.diarias) || 1))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grid Financeiro */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl border border-border bg-surface-subtle/40">
        <div>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
            Custo Total Guias & Despesas
          </span>
          <span className="text-base font-black text-text-title font-mono block mt-0.5">
            {fmt(totalCost)}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">
            Sinal Pago
          </span>
          <span className="text-base font-black text-amber-500 font-mono block mt-0.5">
            {fmt(sinal)}
          </span>
          <span className="text-[11px] text-text-muted font-medium block mt-0.5">
            {d.prazoSinal ? `Prazo: ${fmtDate(d.prazoSinal)}` : "-"}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-status-danger uppercase tracking-wider block">
            Saldo a Liquidar
          </span>
          <span className="text-base font-black text-status-danger font-mono block mt-0.5">
            {fmt(saldo)}
          </span>
        </div>
      </div>
    </div>
  );
}

function PersonalizadosOperationalCard({
  block,
  fmt,
}: {
  block: EditorBlock;
  fmt: (v: number) => string;
}) {
  const d = block.data || {};
  const rows: Array<{ desc?: string; descricao?: string; tipo?: string; valor?: string | number; total?: string | number; qtd?: string | number }> =
    Array.isArray(d.rows) ? d.rows : [];
  let totalCost = parseNum(d.totalDespesas);
  if (totalCost === 0 && rows.length > 0) {
    totalCost = rows.reduce((sum, r) => sum + parseNum(r.total || r.valor), 0);
  }

  return (
    <div className="bg-surface rounded-3xl border border-amber-500/30 overflow-hidden shadow-xs space-y-4 p-5">
      <div className="flex items-center justify-between border-b border-border/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Package size={20} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider">
              Personalizados & Brindes
            </span>
            <h4 className="text-base font-black text-text-title mt-1">
              {block.title || "Itens Personalizados"}
            </h4>
          </div>
        </div>

        <span className="text-base font-black text-text-title font-mono">{fmt(totalCost)}</span>
      </div>

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface-subtle text-[11px] font-bold text-text-muted uppercase tracking-wider border-b border-border">
                <th className="py-2.5 px-3">Item / Descrição</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3 text-center">Quantidade</th>
                <th className="py-2.5 px-3 text-right">Valor Unitário</th>
                <th className="py-2.5 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-surface-subtle/40 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-text-title">
                    {r.desc || r.descricao || `Item ${i + 1}`}
                  </td>
                  <td className="py-2.5 px-3 text-text-muted">{r.tipo || "Brinde"}</td>
                  <td className="py-2.5 px-3 text-center font-mono">{r.qtd || 1}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-text-muted">
                    {fmt(parseNum(r.valor))}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-text-title">
                    {fmt(parseNum(r.total || r.valor))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AddonsCostOperationalCard({
  addons,
  fmt,
}: {
  addons: ExcursionAddon[];
  fmt: (v: number) => string;
}) {
  return (
    <div className="bg-surface rounded-3xl border border-pink-500/30 overflow-hidden shadow-xs space-y-4 p-5">
      <div className="flex items-center justify-between border-b border-border/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-600 flex items-center justify-center shrink-0 border border-pink-500/20">
            <Sparkles size={20} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-600 border border-pink-500/20 uppercase tracking-wider">
              Custos Operacionais dos Extras
            </span>
            <h4 className="text-base font-black text-text-title mt-1">
              Fornecedores de Adicionais & Opcionais
            </h4>
          </div>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-xl bg-pink-500/10 text-pink-600 border border-pink-500/20">
          {addons.length} {addons.length === 1 ? "adicional" : "adicionais"}
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-surface-subtle text-[11px] font-bold text-text-muted uppercase tracking-wider border-b border-border">
              <th className="py-2.5 px-3">Adicional / Serviço</th>
              <th className="py-2.5 px-3">Categoria</th>
              <th className="py-2.5 px-3 text-center">Adesões</th>
              <th className="py-2.5 px-3 text-right">Custo Fornec. Unit.</th>
              <th className="py-2.5 px-3 text-right">Preço Venda Unit.</th>
              <th className="py-2.5 px-3 text-right">Custo Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {addons.map((a) => {
              const adesões = (a.assignedGuestIds ?? []).length;
              const custoUnit = parseNum(a.cost);
              const precoUnit = parseNum(a.price);
              const totalCost = custoUnit * adesões;
              return (
                <tr key={a.id} className="hover:bg-surface-subtle/40 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-text-title">{a.title}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-md bg-surface-subtle border border-border text-[11px] font-medium text-text-muted">
                      {a.location || a.canalVendaNome || "Opcional"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-text-title">
                    {adesões} pax
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-status-danger font-medium">
                    {fmt(custoUnit)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-text-title">
                    {fmt(precoUnit)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-status-danger">
                    {fmt(totalCost)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GenericOperationalCard({
  block,
  fmt,
  fmtDate,
}: {
  block: EditorBlock;
  fmt: (v: number) => string;
  fmtDate: (d?: string | null) => string;
}) {
  const d = block.data || {};
  const cost = parseNum(d.totalDespesas ?? d.custoTotal ?? d.valorContrato ?? d.valorNetTotal);
  const sinal = parseNum(d.sinalTotal ?? d.sinal);
  const saldo = Math.max(0, cost - sinal);

  return (
    <div className="bg-surface rounded-3xl border border-border overflow-hidden shadow-xs space-y-4 p-5">
      <div className="flex items-center justify-between border-b border-border/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <Package size={20} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
              {block.categoryId || (block as any).category || "Bloco Operacional"}
            </span>
            <h4 className="text-base font-black text-text-title mt-1">{block.title}</h4>
          </div>
        </div>
        <span className="text-base font-black text-text-title font-mono">{fmt(cost)}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl border border-border bg-surface-subtle/40">
        <div>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
            Custo Total
          </span>
          <span className="text-base font-black text-text-title font-mono block mt-0.5">
            {fmt(cost)}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">
            Sinal Pago
          </span>
          <span className="text-base font-black text-amber-500 font-mono block mt-0.5">
            {fmt(sinal)}
          </span>
          <span className="text-[11px] text-text-muted font-medium block mt-0.5">
            {d.prazoSinal ? `Prazo: ${fmtDate(d.prazoSinal)}` : "-"}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-status-danger uppercase tracking-wider block">
            Saldo Restante
          </span>
          <span className="text-base font-black text-status-danger font-mono block mt-0.5">
            {fmt(saldo)}
          </span>
        </div>
      </div>

      {d.observation && (
        <div className="p-3.5 rounded-2xl bg-surface-subtle/80 border border-border text-xs text-text-body flex items-start gap-2.5">
          <Info size={15} className="text-primary shrink-0 mt-0.5" />
          <p className="whitespace-pre-line text-text-muted leading-relaxed">{d.observation}</p>
        </div>
      )}
    </div>
  );
}

function BlockOperationalCard({
  block,
  fmt,
  fmtDate,
  copiedLoc,
  onCopyLoc,
}: {
  block: EditorBlock;
  fmt: (v: number) => string;
  fmtDate: (d?: string | null) => string;
  copiedLoc: string | null;
  onCopyLoc: (loc: string) => void;
}) {
  const cat = block.categoryId || (block as any).category || (block as any).type;
  if (cat === "aereo") {
    return (
      <AereoOperationalCard
        block={block}
        fmt={fmt}
        fmtDate={fmtDate}
        copiedLoc={copiedLoc}
        onCopyLoc={onCopyLoc}
      />
    );
  }
  if (cat === "hospedagem") {
    return (
      <HospedagemOperationalCard
        block={block}
        fmt={fmt}
        fmtDate={fmtDate}
        copiedLoc={copiedLoc}
        onCopyLoc={onCopyLoc}
      />
    );
  }
  if (cat === "rodoviario") {
    return (
      <RodoviarioOperationalCard
        block={block}
        fmt={fmt}
        fmtDate={fmtDate}
      />
    );
  }
  if (cat === "guias") {
    return (
      <GuiasOperationalCard
        block={block}
        fmt={fmt}
        fmtDate={fmtDate}
      />
    );
  }
  if (cat === "personalizados") {
    return (
      <PersonalizadosOperationalCard
        block={block}
        fmt={fmt}
      />
    );
  }
  return (
    <GenericOperationalCard
      block={block}
      fmt={fmt}
      fmtDate={fmtDate}
    />
  );
}

// =========================================================================
// COMPONENTE PRINCIPAL
// =========================================================================

export function ExcursionFinancialCharts({
  excursionName,
  passengerReport,
  suppliersReport,
  addons,
  blocks,
  rooms,
  slots,
  profitMargin,
  summary,
  initialChartMode = "entradas",
}: ExcursionFinancialChartsProps) {
  const [mounted, setMounted] = useState(false);
  const [drilldown, setDrilldown] = useState<SelectedDrilldown>(null);
  const [tableSearch, setTableSearch] = useState("");
  const [chartMode, setChartMode] = useState<
    "entradas" | "lucro" | "saidas" | "comparativo" | "extras"
  >(initialChartMode);
  const [lucroSubView, setLucroSubView] = useState<"origem" | "acomodacao" | "passageiros">(
    "origem"
  );
  const [costViewMode, setCostViewMode] = useState<"card" | "pax">("card");
  const [copiedLoc, setCopiedLoc] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Ao alterar o drilldown, se for de custo, ativa por padrão a visualização de cards operacionais
  useEffect(() => {
    if (drilldown?.type === "cost_category" || drilldown?.type === "cost_supplier") {
      setCostViewMode("card");
    } else {
      setCostViewMode("pax");
    }
  }, [drilldown]);

  const handleCopyLoc = (loc: string) => {
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(loc);
    setCopiedLoc(loc);
    setTimeout(() => setCopiedLoc(null), 2000);
  };

  // 1. DADOS DE ENTRADAS (RECEITAS DESTRINCHADAS)
  const entradasData = useMemo(() => {
    const list: {
      id: string;
      name: string;
      type: "package_base" | "addon_single";
      addonId?: string;
      value: number;
      cost: number;
      profit: number;
      paxCount: number;
      color: string;
      category: string;
    }[] = [];

    // Pacotes Base
    const packageRevenue = summary.totalPackageRevenue;
    const packageCost = summary.totalBlocksCost;
    const packageProfit = packageRevenue - packageCost;
    list.push({
      id: "pkg_base",
      name: "Pacotes Base (Viagem)",
      type: "package_base",
      value: packageRevenue,
      cost: packageCost,
      profit: packageProfit,
      paxCount: passengerReport.length,
      color: "#205375",
      category: "Pacote Base",
    });

    // Cada Adicional/Extra específico
    const ADDON_COLORS = ["#EC4899", "#8B5CF6", "#F66B0E", "#06B6D4", "#10B981", "#F59E0B"];
    addons.forEach((addon, idx) => {
      let addonRevenue = 0;
      let addonCost = 0;
      let addonProfit = 0;
      let paxCount = 0;

      passengerReport.forEach((p) => {
        const match = p.passengerAddonsDetailed.find((d) => d.addon.id === addon.id);
        if (match) {
          addonRevenue += match.price;
          addonCost += match.cost;
          addonProfit += match.profit;
          paxCount += 1;
        }
      });

      if (addonRevenue > 0 || paxCount > 0) {
        list.push({
          id: `addon_${addon.id}`,
          name: addon.title || "Adicional",
          type: "addon_single",
          addonId: addon.id,
          value: addonRevenue,
          cost: addonCost,
          profit: addonProfit,
          paxCount,
          color: ADDON_COLORS[idx % ADDON_COLORS.length],
          category: "Opcional / Extra",
        });
      }
    });

    return list;
  }, [summary, addons, passengerReport]);

  // 2. DADOS DE SAÍDAS (CUSTOS DESTRINCHADOS POR CATEGORIA E EXTRAS)
  const saidasData = useMemo(() => {
    const map: Record<
      string,
      {
        id: string;
        name: string;
        category: string;
        value: number;
        color: string;
        blocksCount: number;
      }
    > = {
      hospedagem: {
        id: "cat_hospedagem",
        name: "Hospedagem & Hotéis",
        category: "hospedagem",
        value: 0,
        color: "#F66B0E",
        blocksCount: 0,
      },
      rodoviario: {
        id: "cat_rodoviario",
        name: "Transporte Rodoviário",
        category: "rodoviario",
        value: 0,
        color: "#205375",
        blocksCount: 0,
      },
      aereo: {
        id: "cat_aereo",
        name: "Transporte Aéreo",
        category: "aereo",
        value: 0,
        color: "#06B6D4",
        blocksCount: 0,
      },
      servicos_inclusos: {
        id: "cat_servicos_inclusos",
        name: "Serviços & Inclusões",
        category: "servicos_inclusos",
        value: 0,
        color: "#10B981",
        blocksCount: 0,
      },
      guias: {
        id: "cat_guias",
        name: "Guias & Monitores",
        category: "guias",
        value: 0,
        color: "#14B8A6",
        blocksCount: 0,
      },
      personalizados: {
        id: "cat_personalizados",
        name: "Personalizados & Brindes",
        category: "personalizados",
        value: 0,
        color: "#F59E0B",
        blocksCount: 0,
      },
      outros: {
        id: "cat_outros",
        name: "Outros Fornecedores",
        category: "outros",
        value: 0,
        color: "#8B5CF6",
        blocksCount: 0,
      },
    };

    suppliersReport.forEach((s) => {
      const catKey = map[s.category] ? s.category : "outros";
      map[catKey].value += s.totalCost;
      map[catKey].blocksCount += 1;
    });

    // Custos dos Adicionais / Extras
    if (summary.totalAddonsCost > 0) {
      map["addons_cost"] = {
        id: "cat_addons_cost",
        name: "Custos de Extras / Opcionais",
        category: "addons_cost",
        value: summary.totalAddonsCost,
        color: "#EC4899",
        blocksCount: addons.length,
      };
    }

    return Object.values(map).filter((item) => item.value > 0);
  }, [suppliersReport, summary.totalAddonsCost, addons.length]);

  // 3. DADOS DE EXTRAS (DESTRINCHAMENTO PROFUNDO DE CADA EXTRA)
  const extrasDetailedData = useMemo(() => {
    return addons.map((addon) => {
      let revenue = 0;
      let cost = 0;
      let profit = 0;
      let paxCount = 0;

      passengerReport.forEach((p) => {
        const item = p.passengerAddonsDetailed.find((d) => d.addon.id === addon.id);
        if (item) {
          revenue += item.price;
          cost += item.cost;
          profit += item.profit;
          paxCount += 1;
        }
      });

      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        id: addon.id,
        title: addon.title || "Adicional",
        revenue,
        cost,
        profit,
        paxCount,
        margin,
      };
    });
  }, [addons, passengerReport]);

  // 4. COMPARATIVO DRE VISUAL
  const comparativoData = useMemo(() => {
    return [
      {
        name: "Pacotes Base",
        Entrada: summary.totalPackageRevenue,
        Saida: summary.totalBlocksCost,
        Lucro: summary.totalPackageRevenue - summary.totalBlocksCost,
      },
      {
        name: "Extras & Opcionais",
        Entrada: summary.totalAddonsRevenue,
        Saida: summary.totalAddonsCost,
        Lucro: summary.totalAddonsRevenue - summary.totalAddonsCost,
      },
      {
        name: "Consolidado Geral",
        Entrada: summary.grossRevenue,
        Saida: summary.totalOperatingCost,
        Lucro: summary.netProfit,
      },
    ];
  }, [summary]);

  // 5. STATUS DE RECEBIMENTO & MODOS DE PAGAMENTO
  const paymentStats = useMemo(() => {
    const statusMap: Record<string, { count: number; total: number; label: string; color: string }> = {
      pago: { count: 0, total: 0, label: "Quitado", color: "#10B981" },
      parcial: { count: 0, total: 0, label: "Parcial", color: "#F59E0B" },
      pendente: { count: 0, total: 0, label: "Pendente", color: "#EF4444" },
    };

    const modeMap: Record<string, { count: number; total: number; label: string; color: string }> = {
      vista: { count: 0, total: 0, label: "À Vista", color: "#10B981" },
      prazo: { count: 0, total: 0, label: "A Prazo (Cartão)", color: "#F66B0E" },
      personalizado: { count: 0, total: 0, label: "Personalizado", color: "#8B5CF6" },
    };

    passengerReport.forEach((p) => {
      if (statusMap[p.status]) {
        statusMap[p.status].count += 1;
        statusMap[p.status].total += p.totalReceivable;
      }
      if (modeMap[p.paymentMode]) {
        modeMap[p.paymentMode].count += 1;
        modeMap[p.paymentMode].total += p.totalReceivable;
      }
    });

    return {
      status: Object.entries(statusMap).map(([key, v]) => ({
        key: key as "pago" | "parcial" | "pendente",
        ...v,
      })),
      modes: Object.entries(modeMap).map(([key, v]) => ({
        key: key as "vista" | "prazo" | "personalizado",
        ...v,
      })),
    };
  }, [passengerReport]);

  // 6. DADOS DO DESTRINCHAMENTO DO LUCRO LÍQUIDO & MARGENS
  const lucroBreakdownData = useMemo(() => {
    const list: {
      id: string;
      name: string;
      type: "package_base" | "addon_single";
      addonId?: string;
      profit: number;
      revenue: number;
      cost: number;
      paxCount: number;
      color: string;
      marginPercent: number;
    }[] = [];

    // Pacote Base
    const baseRevenue = summary.totalPackageRevenue;
    const baseCost = summary.totalBlocksCost;
    const baseProfit = baseRevenue - baseCost;
    const baseMargin = baseRevenue > 0 ? (baseProfit / baseRevenue) * 100 : 0;

    list.push({
      id: "pkg_base_profit",
      name: "Pacotes Base (Viagem)",
      type: "package_base",
      profit: baseProfit,
      revenue: baseRevenue,
      cost: baseCost,
      paxCount: passengerReport.length,
      color: "#F66B0E",
      marginPercent: baseMargin,
    });

    // Adicionais com Lucro
    const ADDON_COLORS = ["#EC4899", "#8B5CF6", "#10B981", "#06B6D4", "#F59E0B", "#6366F1"];
    addons.forEach((addon, idx) => {
      let addonRevenue = 0;
      let addonCost = 0;
      let addonProfit = 0;
      let paxCount = 0;

      passengerReport.forEach((p) => {
        const match = p.passengerAddonsDetailed.find((d) => d.addon.id === addon.id);
        if (match) {
          addonRevenue += match.price;
          addonCost += match.cost;
          addonProfit += match.profit;
          paxCount += 1;
        }
      });

      if (addonProfit > 0 || paxCount > 0) {
        const addonMargin = addonRevenue > 0 ? (addonProfit / addonRevenue) * 100 : 0;
        list.push({
          id: `addon_profit_${addon.id}`,
          name: addon.title || "Adicional",
          type: "addon_single",
          addonId: addon.id,
          profit: addonProfit,
          revenue: addonRevenue,
          cost: addonCost,
          paxCount,
          color: ADDON_COLORS[idx % ADDON_COLORS.length],
          marginPercent: addonMargin,
        });
      }
    });

    return list;
  }, [summary, addons, passengerReport]);

  // Lucro detalhado por Acomodação / Tipo de Quarto
  const lucroPorQuartoData = useMemo(() => {
    const map: Record<
      string,
      { roomName: string; paxCount: number; revenue: number; cost: number; profit: number }
    > = {};

    passengerReport.forEach((p) => {
      const r = p.roomName || "Não atribuído";
      if (!map[r]) {
        map[r] = { roomName: r, paxCount: 0, revenue: 0, cost: 0, profit: 0 };
      }
      map[r].paxCount += 1;
      map[r].revenue += p.totalReceivable;
      map[r].cost += p.basePackageCost + p.totalAddonsCost;
      map[r].profit += p.agencyProfit + p.totalAddonsProfit;
    });

    return Object.values(map)
      .map((item) => ({
        ...item,
        marginPercent: item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0,
        avgProfitPax: item.paxCount > 0 ? item.profit / item.paxCount : 0,
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [passengerReport]);

  // Realização do Lucro em Caixa (Quitado vs Pendente)
  const lucroRealizacao = useMemo(() => {
    let quitado = 0;
    let pendente = 0;
    let quitadoCount = 0;
    let pendenteCount = 0;

    passengerReport.forEach((p) => {
      const pLucro = p.agencyProfit + p.totalAddonsProfit;
      if (p.status === "pago") {
        quitado += pLucro;
        quitadoCount += 1;
      } else if (p.status === "parcial") {
        const ratio =
          p.totalReceivable > 0 ? Math.min(1, Math.max(0, p.amountPaid / p.totalReceivable)) : 0;
        const pagoPart = pLucro * ratio;
        const pendPart = pLucro - pagoPart;
        quitado += pagoPart;
        pendente += pendPart;
        if (pagoPart > 0) quitadoCount += 1;
        if (pendPart > 0) pendenteCount += 1;
      } else {
        pendente += pLucro;
        pendenteCount += 1;
      }
    });

    const total = summary.netProfit > 0 ? summary.netProfit : quitado + pendente || 1;
    const percentQuitado = total > 0 ? (quitado / total) * 100 : 0;
    const percentPendente = total > 0 ? (pendente / total) * 100 : 0;

    return {
      quitado,
      pendente,
      quitadoCount,
      pendenteCount,
      percentQuitado,
      percentPendente,
    };
  }, [passengerReport, summary.netProfit]);

  // Ranking de Passageiros por Lucro Gerado
  const topPassageirosLucro = useMemo(() => {
    return [...passengerReport]
      .map((p) => {
        const totalProfit = p.agencyProfit + p.totalAddonsProfit;
        const margin = p.totalReceivable > 0 ? (totalProfit / p.totalReceivable) * 100 : 0;
        return {
          id: p.id,
          name: p.name,
          roomName: p.roomName,
          totalReceivable: p.totalReceivable,
          totalCost: p.basePackageCost + p.totalAddonsCost,
          totalProfit,
          margin,
          addonsCount: p.passengerAddonsDetailed?.length || 0,
          status: p.status,
          paymentMode: p.paymentMode,
        };
      })
      .sort((a, b) => b.totalProfit - a.totalProfit);
  }, [passengerReport]);

  const isCostDrilldown =
    drilldown?.type === "cost_category" || drilldown?.type === "cost_supplier";

  // Blocos correspondentes ao drilldown de custo selecionado
  const matchingBlocks = useMemo(() => {
    if (!drilldown || !isCostDrilldown) return [];
    if (drilldown.type === "cost_category") {
      if (drilldown.category === "addons_cost") return [];
      return blocks.filter((b) => {
        const cat = b.categoryId || (b as any).category || (b as any).type;
        return cat === drilldown.category;
      });
    }
    if (drilldown.type === "cost_supplier") {
      return blocks.filter((b) => b.id === drilldown.blockId);
    }
    return [];
  }, [drilldown, isCostDrilldown, blocks]);

  // Métricas do Drilldown de Custos para os 4 Cards
  const costDrilldownMetrics = useMemo(() => {
    if (!isCostDrilldown || !drilldown) return null;

    let totalCost = 0;
    let totalSinal = 0;
    let totalVagas = 0;
    let prazoSinal: string | null = null;
    let prazoPagamento: string | null = null;

    if (drilldown.type === "cost_category" && drilldown.category === "addons_cost") {
      totalCost = summary.totalAddonsCost;
      return {
        totalCost,
        totalSinal: 0,
        balanceToPay: totalCost,
        totalVagas: addons.length,
        vagasLabel: "adicionais",
        prazoSinal: null,
        prazoPagamento: null,
      };
    }

    matchingBlocks.forEach((b) => {
      const d = b.data || {};
      const vNum = parseNum(d.vagas) || parseNum(d.rateioPessoas) || 0;
      totalVagas += vNum;
      const cat = b.categoryId || (b as any).category || (b as any).type;

      if (cat === "aereo") {
        const cTot =
          parseNum(d.custoTotal) ||
          (vNum > 0 && parseNum(d.custoUnitario) > 0 ? parseNum(d.custoUnitario) * vNum : 0);
        const sTot =
          parseNum(d.sinalTotal ?? d.sinal) ||
          (vNum > 0 && parseNum(d.sinalUnitario) > 0 ? parseNum(d.sinalUnitario) * vNum : 0);
        totalCost += cTot;
        totalSinal += sTot;
        if (d.prazoSinal && !prazoSinal) prazoSinal = d.prazoSinal;
        if (d.prazoPagamentoTotal && !prazoPagamento) prazoPagamento = d.prazoPagamentoTotal;
      } else if (cat === "hospedagem") {
        let hCost = parseNum(d.totalReserva);
        if (hCost === 0 && Array.isArray(d.rooms)) {
          for (const rm of d.rooms) {
            const totPer = parseNum(rm.totalPeriodo);
            const qtd = parseNum(rm.qtd) || 1;
            const diaria = parseNum(rm.diaria);
            if (totPer > 0) hCost += totPer;
            else if (diaria > 0) hCost += diaria * (parseNum(d.diarias) || 1) * qtd;
          }
        }
        totalCost += hCost;
        totalSinal += parseNum(d.sinalTotal ?? d.sinal);
        if (d.prazoSinal && !prazoSinal) prazoSinal = d.prazoSinal;
        if (d.prazoPagamentoTotal && !prazoPagamento) prazoPagamento = d.prazoPagamentoTotal;
      } else if (cat === "rodoviario") {
        const rCost =
          parseNum(d.valorContrato ?? d.valorNetTotal ?? d.valorNet) ||
          parseNum(d.rateioPorPessoa) * vNum;
        totalCost += rCost;
        totalSinal += parseNum(d.sinalTotal ?? d.sinal);
        if (d.prazoSinal && !prazoSinal) prazoSinal = d.prazoSinal;
        if (d.prazoPagamentoTotal && !prazoPagamento) prazoPagamento = d.prazoPagamentoTotal;
      } else if (cat === "guias") {
        let gCost = parseNum(d.totalDespesas);
        if (gCost === 0) {
          for (const g of d.guias ?? []) {
            const dNum = parseNum(g.diarias);
            const vDiaria = parseNum(g.valorDiaria);
            const vTot = parseNum(g.valorTotal);
            gCost += vTot > 0 ? vTot : dNum > 0 && vDiaria > 0 ? dNum * vDiaria : 0;
          }
          for (const desp of d.despesas ?? []) {
            gCost += parseNum(desp.valor);
          }
        }
        totalCost += gCost;
        totalSinal += parseNum(d.sinal);
        if (d.prazoSinal && !prazoSinal) prazoSinal = d.prazoSinal;
      } else if (cat === "personalizados") {
        let pCost = parseNum(d.totalDespesas);
        if (pCost === 0 && Array.isArray(d.rows)) {
          pCost = d.rows.reduce(
            (sum: number, r: any) => sum + parseNum(r.total || r.custo || r.valor),
            0
          );
        }
        totalCost += pCost;
        totalSinal += parseNum(d.sinal);
      } else {
        totalCost += parseNum(d.totalDespesas ?? d.custoTotal ?? d.valorContrato);
        totalSinal += parseNum(d.sinalTotal ?? d.sinal);
      }
    });

    const balanceToPay = Math.max(0, totalCost - totalSinal);

    return {
      totalCost,
      totalSinal,
      balanceToPay,
      totalVagas: totalVagas > 0 ? totalVagas : matchingBlocks.length,
      vagasLabel: totalVagas > 0 ? "vagas / bilhetes" : "blocos contratados",
      prazoSinal,
      prazoPagamento,
    };
  }, [drilldown, isCostDrilldown, matchingBlocks, summary.totalAddonsCost, addons.length]);

  // 6. PROCESSAMENTO DO RAIO-X / DRILL-DOWN SELECIONADO (PARA PASSAGEIROS)
  const drilldownDetails = useMemo(() => {
    if (!drilldown) return null;

    let title = drilldown.title;
    let badgeLabel = "Raio-X";
    let badgeColor = "bg-primary/10 text-primary border-primary/20";
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    let paxList: {
      id: string;
      name: string;
      roomName: string;
      age: number | null;
      tipo: string;
      itemPrice: number;
      itemCost: number;
      itemProfit: number;
      status: "pago" | "parcial" | "pendente" | string;
      paymentMode: "vista" | "prazo" | "personalizado";
      detailNote?: string;
    }[] = [];

    if (drilldown.type === "addon_single") {
      const addon = addons.find((a) => a.id === drilldown.addonId);
      title = addon?.title || drilldown.title;
      badgeLabel = "Opcional / Extra Individual";
      badgeColor = "bg-pink-500/10 text-pink-500 border-pink-500/20";

      passengerReport.forEach((p) => {
        const item = p.passengerAddonsDetailed.find((d) => d.addon.id === drilldown.addonId);
        if (item) {
          totalRevenue += item.price;
          totalCost += item.cost;
          totalProfit += item.profit;
          paxList.push({
            id: p.id,
            name: p.name,
            roomName: p.roomName,
            age: p.age,
            tipo: p.tipo,
            itemPrice: item.price,
            itemCost: item.cost,
            itemProfit: item.profit,
            status: p.status,
            paymentMode: p.paymentMode,
            detailNote: item.tierLabel || "Adesão confirmada",
          });
        }
      });
    } else if (drilldown.type === "addon_all") {
      badgeLabel = "Todos os Extras & Opcionais";
      badgeColor = "bg-pink-500/10 text-pink-500 border-pink-500/20";
      totalRevenue = summary.totalAddonsRevenue;
      totalCost = summary.totalAddonsCost;
      totalProfit = totalRevenue - totalCost;

      passengerReport.forEach((p) => {
        if (p.passengerAddonsDetailed.length > 0) {
          const addonTitles = p.passengerAddonsDetailed.map((d) => d.addon.title).join(", ");
          paxList.push({
            id: p.id,
            name: p.name,
            roomName: p.roomName,
            age: p.age,
            tipo: p.tipo,
            itemPrice: p.totalAddonsPrice,
            itemCost: p.totalAddonsCost,
            itemProfit: p.totalAddonsProfit,
            status: p.status,
            paymentMode: p.paymentMode,
            detailNote: `${p.passengerAddonsDetailed.length} adicionais: ${addonTitles}`,
          });
        }
      });
    } else if (drilldown.type === "package_base") {
      badgeLabel = "Pacotes Base da Viagem";
      badgeColor = "bg-blue-500/10 text-blue-500 border-blue-500/20";
      totalRevenue = summary.totalPackageRevenue;
      totalCost = summary.totalBlocksCost;
      totalProfit = totalRevenue - totalCost;

      passengerReport.forEach((p) => {
        paxList.push({
          id: p.id,
          name: p.name,
          roomName: p.roomName,
          age: p.age,
          tipo: p.tipo,
          itemPrice: p.packageFinalPrice,
          itemCost: p.basePackageCost,
          itemProfit: p.agencyProfit,
          status: p.status,
          paymentMode: p.paymentMode,
          detailNote: p.roomMatchedTierLabel || `Acomodação: ${p.roomName}`,
        });
      });
    } else if (drilldown.type === "package_room") {
      badgeLabel = "Acomodação / Quarto";
      badgeColor = "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20";
      title = drilldown.title;

      passengerReport
        .filter((p) => (p.roomName || "Não atribuído") === drilldown.roomType)
        .forEach((p) => {
          const pLucro = p.agencyProfit + p.totalAddonsProfit;
          const pCusto = p.basePackageCost + p.totalAddonsCost;
          totalRevenue += p.totalReceivable;
          totalCost += pCusto;
          totalProfit += pLucro;
          paxList.push({
            id: p.id,
            name: p.name,
            roomName: p.roomName,
            age: p.age,
            tipo: p.tipo,
            itemPrice: p.totalReceivable,
            itemCost: pCusto,
            itemProfit: pLucro,
            status: p.status,
            paymentMode: p.paymentMode,
            detailNote: p.roomMatchedTierLabel || `Acomodação: ${p.roomName}`,
          });
        });
    } else if (drilldown.type === "cost_category") {
      badgeLabel = "Saída / Despesa por Categoria";
      badgeColor = "bg-amber-500/10 text-amber-500 border-amber-500/20";

      if (drilldown.category === "addons_cost") {
        totalCost = summary.totalAddonsCost;
        totalRevenue = summary.totalAddonsRevenue;
        totalProfit = totalRevenue - totalCost;

        passengerReport.forEach((p) => {
          if (p.passengerAddonsDetailed.length > 0) {
            paxList.push({
              id: p.id,
              name: p.name,
              roomName: p.roomName,
              age: p.age,
              tipo: p.tipo,
              itemPrice: p.totalAddonsPrice,
              itemCost: p.totalAddonsCost,
              itemProfit: p.totalAddonsProfit,
              status: p.status,
              paymentMode: p.paymentMode,
              detailNote: `Custo total de extras repassado: ${fmt(p.totalAddonsCost)}`,
            });
          }
        });
      } else {
        const catBlocks = suppliersReport.filter((s) => s.category === drilldown.category);
        totalCost = catBlocks.reduce((sum, s) => sum + s.totalCost, 0);

        passengerReport.forEach((p) => {
          const matchedBlocks = p.blockBreakdown.filter(
            (b) => b.category === drilldown.category
          );
          if (matchedBlocks.length > 0) {
            const pCost = matchedBlocks.reduce((sum, b) => sum + b.cost, 0);
            totalProfit += p.agencyProfit;
            totalRevenue += pCost;
            paxList.push({
              id: p.id,
              name: p.name,
              roomName: p.roomName,
              age: p.age,
              tipo: p.tipo,
              itemPrice: p.packageFinalPrice,
              itemCost: pCost,
              itemProfit: p.agencyProfit,
              status: p.status,
              paymentMode: p.paymentMode,
              detailNote: matchedBlocks.map((b) => `${b.blockTitle}: ${fmt(b.cost)}`).join(" | "),
            });
          }
        });
      }
    } else if (drilldown.type === "cost_supplier") {
      const block = suppliersReport.find((s) => s.blockId === drilldown.blockId);
      title = block?.title || drilldown.title;
      badgeLabel = "Fornecedor / Bloco Operacional";
      badgeColor = "bg-orange-500/10 text-orange-500 border-orange-500/20";
      totalCost = block?.totalCost || 0;

      passengerReport.forEach((p) => {
        const bItem = p.blockBreakdown.find((b) => b.blockId === drilldown.blockId);
        if (bItem) {
          totalProfit += p.agencyProfit;
          totalRevenue += bItem.cost;
          paxList.push({
            id: p.id,
            name: p.name,
            roomName: p.roomName,
            age: p.age,
            tipo: p.tipo,
            itemPrice: p.packageFinalPrice,
            itemCost: bItem.cost,
            itemProfit: p.agencyProfit,
            status: p.status,
            paymentMode: p.paymentMode,
            detailNote: `${block?.supplierName || "Fornecedor"} (${bItem.tierLabel || "Padrão"})`,
          });
        }
      });
    } else if (drilldown.type === "payment_status") {
      badgeLabel = "Status de Pagamento";
      badgeColor =
        drilldown.status === "pago"
          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
          : drilldown.status === "parcial"
          ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
          : "bg-red-500/10 text-red-500 border-red-500/20";

      passengerReport
        .filter((p) => p.status === drilldown.status)
        .forEach((p) => {
          totalRevenue += p.totalReceivable;
          totalCost += p.basePackageCost + p.totalAddonsCost;
          totalProfit += p.agencyProfit + p.totalAddonsProfit;
          paxList.push({
            id: p.id,
            name: p.name,
            roomName: p.roomName,
            age: p.age,
            tipo: p.tipo,
            itemPrice: p.totalReceivable,
            itemCost: p.basePackageCost + p.totalAddonsCost,
            itemProfit: p.agencyProfit + p.totalAddonsProfit,
            status: p.status,
            paymentMode: p.paymentMode,
            detailNote: `Pago: ${fmt(p.amountPaid)} | Pendente: ${fmt(p.pendingAmount)}`,
          });
        });
    } else if (drilldown.type === "payment_mode") {
      badgeLabel = "Modalidade de Pagamento";
      badgeColor = "bg-violet-500/10 text-violet-500 border-violet-500/20";

      passengerReport
        .filter((p) => p.paymentMode === drilldown.mode)
        .forEach((p) => {
          totalRevenue += p.totalReceivable;
          totalCost += p.basePackageCost + p.totalAddonsCost;
          totalProfit += p.agencyProfit + p.totalAddonsProfit;
          paxList.push({
            id: p.id,
            name: p.name,
            roomName: p.roomName,
            age: p.age,
            tipo: p.tipo,
            itemPrice: p.totalReceivable,
            itemCost: p.basePackageCost + p.totalAddonsCost,
            itemProfit: p.agencyProfit + p.totalAddonsProfit,
            status: p.status,
            paymentMode: p.paymentMode,
            detailNote: `Modo: ${p.paymentMode.toUpperCase()}`,
          });
        });
    }

    const marginPercent = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      title,
      badgeLabel,
      badgeColor,
      totalRevenue,
      totalCost,
      totalProfit,
      marginPercent,
      paxCount: paxList.length,
      paxList,
    };
  }, [drilldown, addons, passengerReport, summary, suppliersReport]);

  // Filtro de passageiros na tabela do Raio-X
  const filteredPaxList = useMemo(() => {
    if (!drilldownDetails) return [];
    if (!tableSearch.trim()) return drilldownDetails.paxList;
    const s = tableSearch.toLowerCase();
    return drilldownDetails.paxList.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.roomName.toLowerCase().includes(s) ||
        (p.detailNote && p.detailNote.toLowerCase().includes(s))
    );
  }, [drilldownDetails, tableSearch]);

  // Exportar CSV específico da fatia selecionada
  const handleExportDrilldownCSV = () => {
    if (!drilldownDetails) return;
    const headers = [
      "Passageiro",
      "Quarto",
      "Idade",
      "Tipo",
      "Preço Cobrado (R$)",
      "Custo Direto (R$)",
      "Lucro Gerado (R$)",
      "Forma de Pagamento",
      "Status Pagamento",
      "Detalhes / Faixa",
    ];

    const rows = drilldownDetails.paxList.map((p) => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.roomName.replace(/"/g, '""')}"`,
      p.age !== null ? p.age : '""',
      `"${p.tipo || ""}"`,
      p.itemPrice.toFixed(2),
      p.itemCost.toFixed(2),
      p.itemProfit.toFixed(2),
      `"${p.paymentMode.toUpperCase()}"`,
      `"${p.status.toUpperCase()}"`,
      `"${(p.detailNote || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `raio_x_${drilldownDetails.title.toLowerCase().replace(/\s+/g, "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!mounted) {
    return (
      <div className="p-8 text-center text-text-muted text-xs">
        Carregando gráficos financeiros interativos...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CSS para eliminar o contorno/quadrado preto de foco nos gráficos SVG */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .recharts-wrapper,
        .recharts-wrapper:focus,
        .recharts-surface,
        .recharts-surface:focus,
        .recharts-pie,
        .recharts-pie:focus,
        .recharts-pie-sector,
        .recharts-pie-sector:focus,
        .recharts-sector,
        .recharts-sector:focus,
        .recharts-layer:focus,
        svg:focus,
        path:focus,
        g:focus,
        *:focus {
          outline: none !important;
          box-shadow: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
      `,
        }}
      />

      {/* 1. SELETOR DE MODO DE GRÁFICOS */}
      <div className="bg-surface rounded-2xl border border-border p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-surface-subtle rounded-2xl border border-border/80 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setChartMode("entradas");
              setDrilldown(null);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              chartMode === "entradas"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-text-muted hover:text-text-title hover:bg-surface/80"
            }`}
          >
            <PieIcon size={14} className={chartMode === "entradas" ? "text-white" : "text-emerald-600 dark:text-emerald-400"} />
            <span>Faturamento (Entradas)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setChartMode("lucro");
              setDrilldown(null);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              chartMode === "lucro"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-text-muted hover:text-text-title hover:bg-surface/80"
            }`}
          >
            <TrendingUp size={14} className={chartMode === "lucro" ? "text-white" : "text-amber-600 dark:text-amber-400"} />
            <span>Destrinchamento do Lucro</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setChartMode("saidas");
              setDrilldown(null);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              chartMode === "saidas"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-text-muted hover:text-text-title hover:bg-surface/80"
            }`}
          >
            <PieIcon size={14} className={chartMode === "saidas" ? "text-white" : "text-rose-600 dark:text-rose-400"} />
            <span>Custos & Fornecedores (Saídas)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setChartMode("extras");
              setDrilldown(null);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              chartMode === "extras"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-text-muted hover:text-text-title hover:bg-surface/80"
            }`}
          >
            <Sparkles size={14} className={chartMode === "extras" ? "text-white" : "text-purple-600 dark:text-purple-400"} />
            <span>Adicionais & Opcionais ({addons.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setChartMode("comparativo");
              setDrilldown(null);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              chartMode === "comparativo"
                ? "bg-primary text-white shadow-xs"
                : "text-text-muted hover:text-text-title hover:bg-surface/80"
            }`}
          >
            <BarChart3 size={14} className={chartMode === "comparativo" ? "text-white" : "text-primary"} />
            <span>Comparativo DRE Visual</span>
          </button>
        </div>

        {drilldown && (
          <button
            type="button"
            onClick={() => setDrilldown(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border hover:bg-surface-subtle text-xs font-semibold text-text-muted hover:text-text-title transition-all cursor-pointer shadow-2xs"
          >
            <X size={13} />
            <span>Limpar Seleção do Raio-X</span>
          </button>
        )}
      </div>

      {/* 2. DASHBOARD DE GRÁFICOS INTERATIVOS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ======================================================== */}
        {/* GRÁFICO PRINCIPAL */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 bg-surface rounded-3xl border border-border p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-text-title flex items-center gap-2">
                {chartMode === "entradas" && (
                  <>
                    <PieIcon size={18} className="text-status-success" />
                    Destrinchamento de Entradas (Faturamento)
                  </>
                )}
                {chartMode === "lucro" && (
                  <>
                    <TrendingUp size={18} className="text-amber-500" />
                    Destrinchamento do Lucro Líquido & Margens
                  </>
                )}
                {chartMode === "saidas" && (
                  <>
                    <PieIcon size={18} className="text-status-danger" />
                    Destrinchamento de Saídas (Custos & Fornecedores)
                  </>
                )}
                {chartMode === "extras" && (
                  <>
                    <Sparkles size={18} className="text-pink-500" />
                    Desempenho dos Adicionais & Opcionais
                  </>
                )}
                {chartMode === "comparativo" && (
                  <>
                    <BarChart3 size={18} className="text-primary" />
                    DRE Visual: Receitas x Custos x Lucro Líquido
                  </>
                )}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                💡 Clique em qualquer fatia ou barra para abrir a ficha operacional do serviço ou lista de passageiros
              </p>
            </div>

            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              Interativo
            </span>
          </div>

          {/* MODO 1: ENTRADAS */}
          {chartMode === "entradas" && (
            <div className="space-y-4">
              <div className="h-[300px] w-full relative outline-none focus:outline-none select-none [&_*]:focus:outline-none [&_*]:outline-none [&_svg]:outline-none [&_path]:outline-none">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart style={{ outline: "none" }}>
                    <Pie
                      data={entradasData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      tabIndex={-1}
                      style={{ outline: "none" }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      onClick={(entry: any) => {
                        const data = entry?.payload || entry;
                        if (!data) return;
                        if (data.type === "package_base") {
                          setDrilldown({
                            type: "package_base",
                            title: "Pacotes Base da Viagem",
                          });
                        } else if (data.addonId) {
                          setDrilldown({
                            type: "addon_single",
                            addonId: String(data.addonId),
                            title: String(data.name || "Adicional"),
                          });
                        }
                      }}
                      cursor="pointer"
                    >
                      {entradasData.map((entry, index) => {
                        const isSelected =
                          (drilldown?.type === "package_base" && entry.type === "package_base") ||
                          (drilldown?.type === "addon_single" &&
                            drilldown.addonId === entry.addonId);
                        return (
                          <Cell
                            key={`entry-${index}`}
                            fill={entry.color}
                            stroke={isSelected ? "#ffffff" : "transparent"}
                            strokeWidth={isSelected ? 4 : 1}
                            tabIndex={-1}
                            style={{
                              outline: "none",
                              filter: isSelected
                                ? "drop-shadow(0px 0px 8px rgba(246, 107, 14, 0.6))"
                                : "none",
                              transition: "all 0.3s ease",
                            }}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip
                      wrapperStyle={{ zIndex: 100, pointerEvents: "none", outline: "none" }}
                      offset={20}
                      formatter={(val, name, item) => [
                        `${fmt(Number(val))} (${item.payload.paxCount} pax)`,
                        item.payload.name,
                      ]}
                      contentStyle={{
                        borderRadius: "14px",
                        fontSize: "12px",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                        outline: "none",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Centro do Donut com badge circular opaco para nunca misturar com o balão */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="w-[124px] h-[124px] rounded-full bg-surface dark:bg-card border border-border shadow-2xs flex flex-col items-center justify-center text-center p-2">
                    <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider leading-tight">
                      Receita Total
                    </span>
                    <span className="text-base font-black text-text-title font-mono mt-0.5 leading-tight">
                      {fmt(summary.grossRevenue)}
                    </span>
                    <span className="text-[10px] text-status-success font-bold mt-0.5 leading-tight">
                      {summary.confirmedCount} passageiros
                    </span>
                  </div>
                </div>
              </div>

              {/* Legenda Interativa com Chips Clicáveis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {entradasData.map((item) => {
                  const isSelected =
                    (drilldown?.type === "package_base" && item.type === "package_base") ||
                    (drilldown?.type === "addon_single" && drilldown.addonId === item.addonId);
                  const percent =
                    summary.grossRevenue > 0 ? (item.value / summary.grossRevenue) * 100 : 0;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.type === "package_base") {
                          setDrilldown({
                            type: "package_base",
                            title: "Pacotes Base da Viagem",
                          });
                        } else if (item.addonId) {
                          setDrilldown({
                            type: "addon_single",
                            addonId: item.addonId,
                            title: item.name,
                          });
                        }
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary/10 border-primary text-text-title font-bold shadow-xs scale-[1.02]"
                          : "bg-surface-subtle/60 border-border/70 hover:bg-surface-subtle hover:border-border text-text-body"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-text-title">{fmt(item.value)}</div>
                        <div className="text-[10px] text-text-muted">
                          {percent.toFixed(1)}% · {item.paxCount} pax
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODO NOVO: DESTRINCHAMENTO DO LUCRO */}
          {chartMode === "lucro" && (
            <div className="space-y-4">
              {/* Sub-navegador de visão do lucro */}
              <div className="flex items-center justify-between gap-2 p-1.5 bg-surface-subtle rounded-2xl border border-border/70 flex-wrap">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setLucroSubView("origem")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      lucroSubView === "origem"
                        ? "bg-surface text-amber-600 dark:text-amber-400 shadow-xs border border-border/80"
                        : "text-text-muted hover:text-text-title"
                    }`}
                  >
                    <PieIcon size={13} />
                    <span>Origem do Lucro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLucroSubView("acomodacao")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      lucroSubView === "acomodacao"
                        ? "bg-surface text-amber-600 dark:text-amber-400 shadow-xs border border-border/80"
                        : "text-text-muted hover:text-text-title"
                    }`}
                  >
                    <BedDouble size={13} />
                    <span>Por Acomodação</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLucroSubView("passageiros")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      lucroSubView === "passageiros"
                        ? "bg-surface text-amber-600 dark:text-amber-400 shadow-xs border border-border/80"
                        : "text-text-muted hover:text-text-title"
                    }`}
                  >
                    <Users size={13} />
                    <span>Ranking Passageiros</span>
                  </button>
                </div>
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  Margem Líquida: {summary.netMarginPercent.toFixed(1)}%
                </span>
              </div>

              {/* Sub-Visão 1: Donut de Origem do Lucro */}
              {lucroSubView === "origem" && (
                <div className="space-y-4">
                  <div className="h-[300px] w-full relative outline-none focus:outline-none select-none [&_*]:focus:outline-none [&_*]:outline-none [&_svg]:outline-none [&_path]:outline-none">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart style={{ outline: "none" }}>
                        <Pie
                          data={lucroBreakdownData}
                          dataKey="profit"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={110}
                          tabIndex={-1}
                          style={{ outline: "none" }}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          onClick={(entry: any) => {
                            const data = entry?.payload || entry;
                            if (!data) return;
                            if (data.type === "package_base") {
                              setDrilldown({
                                type: "package_base",
                                title: "Lucro nos Pacotes Base da Viagem",
                              });
                            } else if (data.addonId) {
                              setDrilldown({
                                type: "addon_single",
                                addonId: String(data.addonId),
                                title: `Lucro no Opcional: ${data.name}`,
                              });
                            }
                          }}
                          cursor="pointer"
                        >
                          {lucroBreakdownData.map((entry, index) => {
                            const isSelected =
                              (drilldown?.type === "package_base" && entry.type === "package_base") ||
                              (drilldown?.type === "addon_single" && drilldown.addonId === entry.addonId);
                            return (
                              <Cell
                                key={`lucro-entry-${index}`}
                                fill={entry.color}
                                stroke={isSelected ? "#ffffff" : "transparent"}
                                strokeWidth={isSelected ? 4 : 1}
                                tabIndex={-1}
                                style={{
                                  outline: "none",
                                  filter: isSelected
                                    ? "drop-shadow(0px 0px 8px rgba(245, 158, 11, 0.7))"
                                    : "none",
                                  transition: "all 0.3s ease",
                                }}
                              />
                            );
                          })}
                        </Pie>
                        <Tooltip
                          wrapperStyle={{ zIndex: 100, pointerEvents: "none", outline: "none" }}
                          offset={20}
                          formatter={(val, name, item) => [
                            `${fmt(Number(val))} (${item.payload.marginPercent.toFixed(1)}% margem | ${item.payload.paxCount} pax)`,
                            item.payload.name,
                          ]}
                          contentStyle={{
                            borderRadius: "14px",
                            fontSize: "12px",
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                            outline: "none",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Centro do Donut */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      <div className="w-[128px] h-[128px] rounded-full bg-surface dark:bg-card border border-border shadow-2xs flex flex-col items-center justify-center text-center p-2">
                        <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider leading-tight">
                          Lucro Líquido
                        </span>
                        <span className="text-base font-black text-text-title font-mono mt-0.5 leading-tight">
                          {fmt(summary.netProfit)}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 leading-tight">
                          {summary.netMarginPercent.toFixed(1)}% margem
                        </span>
                        <span className="text-[9px] text-text-muted mt-0.5 leading-tight font-mono">
                          {fmt(summary.netProfit / (summary.confirmedCount || 1))}/pax
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Legenda com Cards Interativos de Cada Fonte de Lucro */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {lucroBreakdownData.map((item) => {
                      const isSelected =
                        (drilldown?.type === "package_base" && item.type === "package_base") ||
                        (drilldown?.type === "addon_single" && drilldown.addonId === item.addonId);
                      const percentOfProfit =
                        summary.netProfit > 0 ? (item.profit / summary.netProfit) * 100 : 0;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (item.type === "package_base") {
                              setDrilldown({
                                type: "package_base",
                                title: "Lucro nos Pacotes Base da Viagem",
                              });
                            } else if (item.addonId) {
                              setDrilldown({
                                type: "addon_single",
                                addonId: item.addonId,
                                title: `Lucro no Opcional: ${item.name}`,
                              });
                            }
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                            isSelected
                              ? "bg-amber-500/10 border-amber-500 text-text-title font-bold shadow-xs scale-[1.02]"
                              : "bg-surface-subtle/60 border-border/70 hover:bg-surface-subtle hover:border-border text-text-body"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <div className="truncate">
                              <span className="truncate block font-semibold">{item.name}</span>
                              <span className="text-[10px] text-text-muted block">
                                Receita: {fmt(item.revenue)} · Custo: {fmt(item.cost)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-mono font-bold text-amber-600 dark:text-amber-400">
                              +{fmt(item.profit)}
                            </div>
                            <div className="text-[10px] text-text-muted">
                              {percentOfProfit.toFixed(1)}% do lucro · {item.marginPercent.toFixed(1)}% margem
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-Visão 2: Lucro por Acomodação (Quartos) */}
              {lucroSubView === "acomodacao" && (
                <div className="space-y-4">
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={lucroPorQuartoData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="roomName" tick={{ fontSize: 10 }} />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          wrapperStyle={{ zIndex: 100, pointerEvents: "none", outline: "none" }}
                          formatter={(val, name) => [fmt(Number(val)), String(name)]}
                          contentStyle={{
                            borderRadius: "14px",
                            fontSize: "12px",
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                            outline: "none",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <Bar dataKey="revenue" name="Receita" fill="#10B981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="cost" name="Custo Operacional" fill="#EF4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="profit" name="Lucro Líquido" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Cards por Acomodação */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {lucroPorQuartoData.map((room) => {
                      const isSelected =
                        drilldown?.type === "package_room" && drilldown.roomType === room.roomName;
                      return (
                        <button
                          key={room.roomName}
                          type="button"
                          onClick={() => {
                            setDrilldown({
                              type: "package_room",
                              roomType: room.roomName,
                              title: `Passageiros em ${room.roomName}`,
                            });
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? "bg-teal-500/10 border-teal-500 font-bold shadow-xs scale-[1.01]"
                              : "bg-surface-subtle/50 border-border/70 hover:bg-surface-subtle"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <BedDouble size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
                              <span className="font-bold text-xs text-text-title truncate">{room.roomName}</span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400">
                              {room.paxCount} pax
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-text-muted">Lucro Líquido:</span>
                            <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                              {fmt(room.profit)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-text-muted mt-1 pt-1 border-t border-border/40">
                            <span>
                              Margem: <strong className="text-text-title">{room.marginPercent.toFixed(1)}%</strong>
                            </span>
                            <span>
                              Média: <strong className="text-text-title font-mono">{fmt(room.avgProfitPax)}/pax</strong>
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-Visão 3: Ranking de Passageiros por Lucro */}
              {lucroSubView === "passageiros" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-text-muted px-1">
                    <span>Top passageiros com maior margem de contribuição líquida</span>
                    <span className="font-bold">{passengerReport.length} passageiros</span>
                  </div>

                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {topPassageirosLucro.slice(0, 10).map((p, idx) => {
                      const medalColor =
                        idx === 0
                          ? "bg-amber-500 text-white"
                          : idx === 1
                          ? "bg-slate-400 text-white"
                          : idx === 2
                          ? "bg-amber-700 text-white"
                          : "bg-surface-subtle text-text-muted border border-border";

                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 bg-surface-subtle/40 hover:bg-surface-subtle transition-all"
                        >
                          <div className="flex items-center gap-2.5 truncate pr-2">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${medalColor}`}>
                              {idx + 1}
                            </span>
                            <div className="truncate">
                              <span className="font-bold text-xs text-text-title block truncate">{p.name}</span>
                              <span className="text-[10px] text-text-muted block truncate">
                                {p.roomName} · {p.addonsCount} opcional(is)
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-mono font-black text-xs text-amber-600 dark:text-amber-400">
                              +{fmt(p.totalProfit)}
                            </div>
                            <div className="text-[10px] text-text-muted">
                              {p.margin.toFixed(1)}% margem · {fmt(p.totalReceivable)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODO 2: SAÍDAS */}
          {chartMode === "saidas" && (
            <div className="space-y-4">
              <div className="h-[300px] w-full relative outline-none focus:outline-none select-none [&_*]:focus:outline-none [&_*]:outline-none [&_svg]:outline-none [&_path]:outline-none">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart style={{ outline: "none" }}>
                    <Pie
                      data={saidasData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                      tabIndex={-1}
                      style={{ outline: "none" }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      onClick={(entry: any) => {
                        const data = entry?.payload || entry;
                        if (data?.category) {
                          setDrilldown({
                            type: "cost_category",
                            category: String(data.category),
                            title: String(data.name || "Categoria de Custo"),
                          });
                        }
                      }}
                      cursor="pointer"
                    >
                      {saidasData.map((entry, index) => {
                        const isSelected =
                          drilldown?.type === "cost_category" &&
                          drilldown.category === entry.category;
                        return (
                          <Cell
                            key={`saida-${index}`}
                            fill={entry.color}
                            stroke={isSelected ? "#ffffff" : "transparent"}
                            strokeWidth={isSelected ? 4 : 1}
                            tabIndex={-1}
                            style={{
                              outline: "none",
                              filter: isSelected
                                ? "drop-shadow(0px 0px 8px rgba(239, 68, 68, 0.6))"
                                : "none",
                              transition: "all 0.3s ease",
                            }}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip
                      wrapperStyle={{ zIndex: 100, pointerEvents: "none", outline: "none" }}
                      offset={20}
                      formatter={(val, name, item) => [
                        `${fmt(Number(val))} (${item.payload.blocksCount} ${
                          item.payload.blocksCount === 1 ? "bloco" : "blocos"
                        })`,
                        item.payload.name,
                      ]}
                      contentStyle={{
                        borderRadius: "14px",
                        fontSize: "12px",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                        outline: "none",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Centro do Donut com badge circular opaco para nunca misturar com o balão */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="w-[124px] h-[124px] rounded-full bg-surface dark:bg-card border border-border shadow-2xs flex flex-col items-center justify-center text-center p-2">
                    <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider leading-tight">
                      Custos Totais
                    </span>
                    <span className="text-base font-black text-status-danger font-mono mt-0.5 leading-tight">
                      {fmt(summary.totalOperatingCost)}
                    </span>
                    <span className="text-[10px] text-text-muted font-medium mt-0.5 leading-tight">
                      {blocks.length} blocos
                    </span>
                  </div>
                </div>
              </div>

              {/* Legenda Interativa de Saídas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {saidasData.map((item) => {
                  const isSelected =
                    drilldown?.type === "cost_category" && drilldown.category === item.category;
                  const percent =
                    summary.totalOperatingCost > 0
                      ? (item.value / summary.totalOperatingCost) * 100
                      : 0;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setDrilldown({
                          type: "cost_category",
                          category: item.category,
                          title: item.name,
                        });
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-status-danger/10 border-status-danger text-text-title font-bold shadow-xs scale-[1.02]"
                          : "bg-surface-subtle/60 border-border/70 hover:bg-surface-subtle hover:border-border text-text-body"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-status-danger">{fmt(item.value)}</div>
                        <div className="text-[10px] text-text-muted">
                          {percent.toFixed(1)}% · {item.blocksCount} {item.blocksCount === 1 ? "bloco" : "blocos"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODO 3: EXTRAS DETALHADOS (GRÁFICO DE BARRAS DE CADA EXTRA) */}
          {chartMode === "extras" && (
            <div className="space-y-4">
              {extrasDetailedData.length === 0 ? (
                <div className="py-12 text-center text-xs text-text-muted">
                  Nenhum adicional ou opcional cadastrado nesta excursão.
                </div>
              ) : (
                <>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={extrasDetailedData}
                        margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
                        style={{ outline: "none" }}
                        onClick={(state) => {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const activePayload = (state as any)?.activePayload;
                          if (activePayload && activePayload.length > 0) {
                            const data = activePayload[0].payload;
                            setDrilldown({
                              type: "addon_single",
                              addonId: data.id,
                              title: data.title,
                            });
                          }
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis
                          dataKey="title"
                          angle={-15}
                          textAnchor="end"
                          interval={0}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          wrapperStyle={{ zIndex: 100, pointerEvents: "none", outline: "none" }}
                          formatter={(val, name) => [fmt(Number(val)), String(name)]}
                          contentStyle={{
                            borderRadius: "14px",
                            fontSize: "12px",
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                            outline: "none",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <Bar
                          dataKey="revenue"
                          name="Receita Bruta (Entrada)"
                          fill="#10B981"
                          radius={[4, 4, 0, 0]}
                          cursor="pointer"
                        />
                        <Bar
                          dataKey="cost"
                          name="Custo Fornecedor (Saída)"
                          fill="#EF4444"
                          radius={[4, 4, 0, 0]}
                          cursor="pointer"
                        />
                        <Bar
                          dataKey="profit"
                          name="Lucro Líquido Real"
                          fill="#F66B0E"
                          radius={[4, 4, 0, 0]}
                          cursor="pointer"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Cards de cada adicional */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    {extrasDetailedData.map((item) => {
                      const isSelected =
                        drilldown?.type === "addon_single" && drilldown.addonId === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setDrilldown({
                              type: "addon_single",
                              addonId: item.id,
                              title: item.title,
                            });
                          }}
                          className={`p-3 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                            isSelected
                              ? "bg-pink-500/10 border-pink-500 text-text-title font-bold shadow-xs scale-[1.02]"
                              : "bg-surface-subtle/60 border-border/70 hover:bg-surface-subtle hover:border-border text-text-body"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-text-title truncate pr-2">
                              {item.title}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/10 text-primary">
                              {item.paxCount} adesões
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-text-muted">
                              Receita: <strong className="text-text-title">{fmt(item.revenue)}</strong>
                            </span>
                            <span className="text-status-success font-bold font-mono">
                              +{fmt(item.profit)} ({item.margin.toFixed(0)}%)
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* MODO 4: COMPARATIVO GERAL DRE */}
          {chartMode === "comparativo" && (
            <div className="space-y-4">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparativoData}
                    margin={{ top: 15, right: 15, left: 10, bottom: 10 }}
                    style={{ outline: "none" }}
                    onClick={(state) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const activePayload = (state as any)?.activePayload;
                      if (activePayload && activePayload.length > 0) {
                        const name = activePayload[0].payload.name;
                        if (name === "Pacotes Base") {
                          setDrilldown({
                            type: "package_base",
                            title: "Pacotes Base da Viagem",
                          });
                        } else if (name === "Extras & Opcionais") {
                          setDrilldown({
                            type: "addon_all",
                            title: "Todos os Extras & Opcionais",
                          });
                        }
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      wrapperStyle={{ zIndex: 100, pointerEvents: "none", outline: "none" }}
                      formatter={(val, name) => [fmt(Number(val)), String(name)]}
                      contentStyle={{
                        borderRadius: "14px",
                        fontSize: "12px",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                        outline: "none",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar
                      dataKey="Entrada"
                      name="Entradas (Receitas)"
                      fill="#10B981"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                    />
                    <Bar
                      dataKey="Saida"
                      name="Saídas (Custos)"
                      fill="#EF4444"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                    />
                    <Bar
                      dataKey="Lucro"
                      name="Lucro Líquido"
                      fill="#F66B0E"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Resumo Sintético em 3 Blocos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setDrilldown({
                      type: "package_base",
                      title: "Pacotes Base da Viagem",
                    })
                  }
                  className="p-3.5 rounded-2xl bg-surface-subtle border border-border/80 text-left hover:border-primary transition-all cursor-pointer shadow-2xs"
                >
                  <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                    Pacotes Base
                  </span>
                  <span className="text-base font-extrabold text-text-title font-mono mt-1 block">
                    {fmt(summary.totalPackageRevenue)}
                  </span>
                  <span className="text-[11px] text-status-success font-semibold mt-0.5 block">
                    Lucro: +{fmt(summary.totalPackageRevenue - summary.totalBlocksCost)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDrilldown({
                      type: "addon_all",
                      title: "Todos os Extras & Opcionais",
                    })
                  }
                  className="p-3.5 rounded-2xl bg-surface-subtle border border-border/80 text-left hover:border-primary transition-all cursor-pointer shadow-2xs"
                >
                  <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                    Extras & Adicionais
                  </span>
                  <span className="text-base font-extrabold text-text-title font-mono mt-1 block">
                    {fmt(summary.totalAddonsRevenue)}
                  </span>
                  <span className="text-[11px] text-pink-500 font-semibold mt-0.5 block">
                    Lucro: +{fmt(summary.totalAddonsRevenue - summary.totalAddonsCost)}
                  </span>
                </button>

                <div className="p-3.5 rounded-2xl bg-status-success/10 border border-status-success/30 text-left shadow-2xs">
                  <span className="text-[11px] font-bold text-status-success uppercase tracking-wider block">
                    Rentabilidade Final
                  </span>
                  <span className="text-base font-black text-status-success font-mono mt-1 block">
                    {fmt(summary.netProfit)}
                  </span>
                  <span className="text-[11px] text-status-success font-bold mt-0.5 block">
                    {summary.netMarginPercent.toFixed(1)}% de margem líquida
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* PAINEL LATERAL: STATUS DE RECEBIMENTO & LIQUIDAÇÃO */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 space-y-4">
          {chartMode === "lucro" ? (
            <div className="space-y-4">
              {/* Card 1: Saúde do Lucro & Margens */}
              <div className="bg-surface rounded-3xl border border-border p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                  <h4 className="text-xs font-extrabold text-text-title uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp size={15} className="text-amber-500" />
                    Saúde do Lucro &amp; Margens
                  </h4>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {summary.netMarginPercent.toFixed(1)}% Margem
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/30">
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                    Lucro Líquido Projetado
                  </span>
                  <span className="text-2xl font-black text-text-title font-mono mt-1 block">
                    {fmt(summary.netProfit)}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-text-muted">
                    <span className="font-bold text-text-title font-mono">
                      {fmt(summary.netProfit / (summary.confirmedCount || 1))}
                    </span>
                    <span>de lucro médio por passageiro</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-surface-subtle border border-border/70">
                    <span className="text-[10px] font-bold text-text-muted uppercase block">Markup sobre o custo</span>
                    <span className="text-sm font-extrabold text-text-title font-mono mt-0.5 block">
                      +{summary.totalOperatingCost > 0 ? ((summary.netProfit / summary.totalOperatingCost) * 100).toFixed(1) : "0"}%
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-subtle border border-border/70">
                    <span className="text-[10px] font-bold text-text-muted uppercase block">Faturamento Bruto</span>
                    <span className="text-sm font-extrabold text-status-success font-mono mt-0.5 block">
                      {fmt(summary.grossRevenue)}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-surface-subtle/50 border border-border/60 text-xs space-y-1">
                  <div className="flex justify-between items-center text-text-muted text-[11px]">
                    <span>Lucro dos Pacotes Base:</span>
                    <span className="font-mono font-bold text-text-title">
                      {fmt(summary.totalPackageRevenue - summary.totalBlocksCost)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-text-muted text-[11px]">
                    <span>Lucro dos Adicionais/Extras:</span>
                    <span className="font-mono font-bold text-pink-500">
                      +{fmt(summary.totalAddonsRevenue - summary.totalAddonsCost)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Realização do Lucro em Caixa */}
              <div className="bg-surface rounded-3xl border border-border p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                  <h4 className="text-xs font-extrabold text-text-title uppercase tracking-wider flex items-center gap-2">
                    <DollarSign size={15} className="text-status-success" />
                    Realização do Lucro em Caixa
                  </h4>
                  <span className="text-[11px] text-text-muted font-bold">
                    {lucroRealizacao.percentQuitado.toFixed(0)}% Realizado
                  </span>
                </div>

                {/* Barra de progresso */}
                <div className="space-y-1.5">
                  <div className="w-full h-2.5 bg-surface-muted rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${lucroRealizacao.percentQuitado}%` }}
                      title={`Lucro em Caixa: ${fmt(lucroRealizacao.quitado)}`}
                    />
                    <div
                      className="h-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${lucroRealizacao.percentPendente}%` }}
                      title={`Lucro Pendente: ${fmt(lucroRealizacao.pendente)}`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-text-muted font-medium">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {lucroRealizacao.percentQuitado.toFixed(1)}% Quitado/Caixa
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      {lucroRealizacao.percentPendente.toFixed(1)}% Pendente
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setDrilldown({
                        type: "payment_status",
                        status: "pago",
                        title: "Passageiros com Pagamento Quitado (Lucro em Caixa)",
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-border/70 bg-surface-subtle/50 hover:bg-surface-subtle text-left transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-text-title block">Lucro Realizado (Em Caixa)</span>
                        <span className="text-[10px] text-text-muted">
                          {lucroRealizacao.quitadoCount} pax quitados
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-black text-status-success">
                      {fmt(lucroRealizacao.quitado)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setDrilldown({
                        type: "payment_status",
                        status: "pendente",
                        title: "Passageiros com Pagamento Pendente (Lucro a Receber)",
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-border/70 bg-surface-subtle/50 hover:bg-surface-subtle text-left transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-text-title block">Lucro Futuro (A Receber)</span>
                        <span className="text-[10px] text-text-muted">
                          {lucroRealizacao.pendenteCount} pax pendentes
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400">
                      {fmt(lucroRealizacao.pendente)}
                    </span>
                  </button>
                </div>
              </div>

              {/* Card 3: Ponto de Equilíbrio & Alavancagem */}
              <div className="bg-surface rounded-3xl border border-border p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                  <h4 className="text-xs font-extrabold text-text-title uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck size={15} className="text-status-success" />
                    Alavancagem do Lucro
                  </h4>
                  <span className="text-[10px] font-bold text-status-success px-2 py-0.5 rounded-full bg-status-success/10 border border-status-success/20">
                    {summary.confirmedCount >= summary.breakEvenPax ? "✓ Acima do Break-even" : "Captação"}
                  </span>
                </div>

                <div className="text-xs text-text-muted space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span>Passageiros para cobrir custos fixos:</span>
                    <strong className="text-text-title font-mono">{summary.breakEvenPax} pax</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Passageiros de puro lucro líquido:</span>
                    <strong className="text-status-success font-bold font-mono">
                      +{Math.max(0, summary.confirmedCount - summary.breakEvenPax)} pax
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total de custos operacionais totais:</span>
                    <strong className="text-text-title font-mono">{fmt(summary.totalOperatingCost)}</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Card: Status de Recebimentos */}
              <div className="bg-surface rounded-3xl border border-border p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                  <h4 className="text-xs font-extrabold text-text-title uppercase tracking-wider flex items-center gap-2">
                    <DollarSign size={15} className="text-status-success" />
                    Recebimentos dos Passageiros
                  </h4>
                  <span className="text-[11px] font-bold text-text-muted">
                    Total: {fmt(summary.grossRevenue)}
                  </span>
                </div>

                <div className="space-y-2">
                  {paymentStats.status.map((st) => {
                    const percent =
                      summary.grossRevenue > 0 ? (st.total / summary.grossRevenue) * 100 : 0;
                    const isSelected =
                      drilldown?.type === "payment_status" && drilldown.status === st.key;

                    return (
                      <button
                        key={st.key}
                        type="button"
                        onClick={() => {
                          setDrilldown({
                            type: "payment_status",
                            status: st.key,
                            title: `Passageiros com Pagamento: ${st.label}`,
                          });
                        }}
                        className={`w-full p-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary/10 border-primary font-bold shadow-xs scale-[1.02]"
                            : "bg-surface-subtle/50 border-border/60 hover:bg-surface-subtle"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="flex items-center gap-1.5 font-bold text-text-title">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: st.color }}
                            />
                            {st.label} ({st.count} pax)
                          </span>
                          <span className="font-mono font-black text-text-title">{fmt(st.total)}</span>
                        </div>
                        <div className="w-full h-1.5 bg-surface-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: st.color,
                            }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Card: Modalidades de Pagamento */}
              <div className="bg-surface rounded-3xl border border-border p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                  <h4 className="text-xs font-extrabold text-text-title uppercase tracking-wider flex items-center gap-2">
                    <CreditCard size={15} className="text-tertiary" />
                    Mix de Modalidades
                  </h4>
                  <span className="text-[11px] text-text-muted font-semibold">
                    {passengerReport.length} contratos
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {paymentStats.modes.map((m) => {
                    const isSelected =
                      drilldown?.type === "payment_mode" && drilldown.mode === m.key;

                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => {
                          setDrilldown({
                            type: "payment_mode",
                            mode: m.key,
                            title: `Passageiros no Modo: ${m.label}`,
                          });
                        }}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? "bg-violet-500/10 border-violet-500 text-text-title font-bold shadow-xs scale-[1.02]"
                            : "bg-surface-subtle/50 border-border/60 hover:bg-surface-subtle text-text-body"
                        }`}
                      >
                        <span className="text-[10px] font-bold text-text-muted uppercase block truncate">
                          {m.label}
                        </span>
                        <span className="text-sm font-extrabold text-text-title font-mono block mt-1">
                          {m.count} pax
                        </span>
                        <span className="text-[10px] text-text-muted font-mono block mt-0.5 truncate">
                          {fmt(m.total)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Card: Ponto de Equilíbrio & Fornecedores */}
              <div className="bg-surface rounded-3xl border border-border p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                  <h4 className="text-xs font-extrabold text-text-title uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck size={15} className="text-status-success" />
                    Segurança Operacional
                  </h4>
                  <span className="text-[10px] font-bold text-status-success px-2 py-0.5 rounded-full bg-status-success/10 border border-status-success/20">
                    {summary.confirmedCount >= summary.breakEvenPax ? "✓ Lucrativo" : "Captação"}
                  </span>
                </div>

                <div className="text-xs text-text-muted space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span>Passageiros para cobrir custos fixos:</span>
                    <strong className="text-text-title">{summary.breakEvenPax} pax</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Passageiros atuais no grupo:</span>
                    <strong className="text-status-success font-bold">{summary.confirmedCount} pax</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total de custos fixos dos blocos:</span>
                    <strong className="text-text-title font-mono">{fmt(summary.fixedBlocksTotal)}</strong>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. PAINEL DE RAIO-X INTERATIVO (DRILL-DOWN DETALHADO)     */}
      {/* ======================================================== */}
      <AnimatePresence>
        {drilldown && drilldownDetails && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="bg-surface rounded-3xl border-2 border-primary/40 p-6 shadow-xl space-y-5 relative overflow-hidden"
          >
            {/* Linha decorativa de topo */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-tertiary to-pink-500" />

            {/* Cabeçalho do Raio-X */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider border ${drilldownDetails.badgeColor}`}
                  >
                    {drilldownDetails.badgeLabel}
                  </span>
                  <span className="text-xs text-text-muted">
                    • Raio-X Operacional & Financeiro
                  </span>
                </div>
                <h3 className="text-xl font-black text-text-title mt-1 flex items-center gap-2">
                  {drilldownDetails.title}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {isCostDrilldown
                    ? "Ficha operacional dos blocos contratados, localizadores, prazos de emissão/sinal e valores negociados com o fornecedor."
                    : "Lista detalhada de passageiros alocados a esta parte do pacote, com seus custos, receitas e lucros individuais."}
                </p>
              </div>

              {/* Ações da Seleção & Seletor de Visão (Card vs Passageiros) */}
              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                {isCostDrilldown && (
                  <div className="flex items-center rounded-xl bg-surface-subtle p-1 border border-border shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setCostViewMode("card")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        costViewMode === "card"
                          ? "bg-surface text-primary shadow-xs border border-border/80"
                          : "text-text-muted hover:text-text-title"
                      }`}
                    >
                      <FileText size={13} />
                      <span>Card Operacional ({matchingBlocks.length || 1})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCostViewMode("pax")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        costViewMode === "pax"
                          ? "bg-surface text-primary shadow-xs border border-border/80"
                          : "text-text-muted hover:text-text-title"
                      }`}
                    >
                      <Users size={13} />
                      <span>Rateio por Passageiro ({drilldownDetails.paxCount})</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleExportDrilldownCSV}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-surface-subtle text-text-body text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  <Download size={14} className="text-text-muted" />
                  <span>Exportar CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDrilldown(null)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-subtle hover:bg-surface-muted text-text-title text-xs font-bold transition-all cursor-pointer"
                >
                  <X size={14} />
                  <span>Fechar</span>
                </button>
              </div>
            </div>

            {/* 4 Cards de Resumo da Seleção */}
            {isCostDrilldown && costDrilldownMetrics ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Capacidade / Volume */}
                <div className="p-3.5 rounded-2xl bg-surface-subtle/70 border border-border/80">
                  <div className="flex items-center justify-between text-text-muted text-xs">
                    <span className="font-bold uppercase tracking-wider">Capacidade / Contratos</span>
                    <Ticket size={16} className="text-primary" />
                  </div>
                  <div className="text-2xl font-black text-text-title mt-1 font-mono">
                    {costDrilldownMetrics.totalVagas}{" "}
                    <span className="text-xs text-text-muted font-normal">
                      {costDrilldownMetrics.vagasLabel}
                    </span>
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5">
                    {costDrilldownMetrics.totalVagas > 0
                      ? `Custo médio: ${fmt(
                          costDrilldownMetrics.totalCost / costDrilldownMetrics.totalVagas
                        )} / un.`
                      : "Volume contratado"}
                  </div>
                </div>

                {/* Custo Total Contratado */}
                <div className="p-3.5 rounded-2xl bg-surface-subtle/70 border border-border/80">
                  <div className="flex items-center justify-between text-text-muted text-xs">
                    <span className="font-bold uppercase tracking-wider text-status-danger">
                      Custo Total Fornecedor
                    </span>
                    <ArrowDownRight size={16} className="text-status-danger" />
                  </div>
                  <div className="text-2xl font-black text-status-danger mt-1 font-mono">
                    {fmt(costDrilldownMetrics.totalCost)}
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5">
                    {summary.totalOperatingCost > 0
                      ? `${(
                          (costDrilldownMetrics.totalCost / summary.totalOperatingCost) *
                          100
                        ).toFixed(1)}% dos custos da viagem`
                      : "Custo direto"}
                  </div>
                </div>

                {/* Sinal Pago */}
                <div className="p-3.5 rounded-2xl bg-surface-subtle/70 border border-border/80">
                  <div className="flex items-center justify-between text-text-muted text-xs">
                    <span className="font-bold uppercase tracking-wider text-amber-500">
                      Sinal / Entrada Pago
                    </span>
                    <CheckCircle2 size={16} className="text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-amber-500 mt-1 font-mono">
                    {fmt(costDrilldownMetrics.totalSinal)}
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5">
                    {costDrilldownMetrics.prazoSinal
                      ? `Prazo sinal: ${fmtDate(costDrilldownMetrics.prazoSinal)}`
                      : "Sem sinal pendente"}
                  </div>
                </div>

                {/* Saldo Restante a Liquidar */}
                <div className="p-3.5 rounded-2xl bg-status-danger/10 border border-status-danger/30">
                  <div className="flex items-center justify-between text-status-danger text-xs">
                    <span className="font-bold uppercase tracking-wider">Saldo a Liquidar</span>
                    <Clock size={16} className="text-status-danger" />
                  </div>
                  <div className="text-2xl font-black text-status-danger mt-1 font-mono">
                    {fmt(costDrilldownMetrics.balanceToPay)}
                  </div>
                  <div className="text-[11px] font-bold text-status-danger mt-0.5">
                    {costDrilldownMetrics.balanceToPay === 0
                      ? "✓ 100% Quitado"
                      : costDrilldownMetrics.prazoPagamento
                      ? `Prazo: ${fmtDate(costDrilldownMetrics.prazoPagamento)}`
                      : "Saldo em aberto"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Adesões / Pessoas */}
                <div className="p-3.5 rounded-2xl bg-surface-subtle/70 border border-border/80">
                  <div className="flex items-center justify-between text-text-muted text-xs">
                    <span className="font-bold uppercase tracking-wider">Adesões / Passageiros</span>
                    <Users size={16} className="text-primary" />
                  </div>
                  <div className="text-2xl font-black text-text-title mt-1 font-mono">
                    {drilldownDetails.paxCount}{" "}
                    <span className="text-xs text-text-muted font-normal">
                      ({slots > 0 ? ((drilldownDetails.paxCount / slots) * 100).toFixed(0) : 100}% do grupo)
                    </span>
                  </div>
                </div>

                {/* Receita Faturada */}
                <div className="p-3.5 rounded-2xl bg-surface-subtle/70 border border-border/80">
                  <div className="flex items-center justify-between text-text-muted text-xs">
                    <span className="font-bold uppercase tracking-wider text-status-success">
                      Entradas (Faturamento)
                    </span>
                    <ArrowUpRight size={16} className="text-status-success" />
                  </div>
                  <div className="text-2xl font-black text-status-success mt-1 font-mono">
                    {fmt(drilldownDetails.totalRevenue)}
                  </div>
                </div>

                {/* Custos Diretos */}
                <div className="p-3.5 rounded-2xl bg-surface-subtle/70 border border-border/80">
                  <div className="flex items-center justify-between text-text-muted text-xs">
                    <span className="font-bold uppercase tracking-wider text-status-danger">
                      Saídas (Custos Fornecedor)
                    </span>
                    <ArrowDownRight size={16} className="text-status-danger" />
                  </div>
                  <div className="text-2xl font-black text-status-danger mt-1 font-mono">
                    {fmt(drilldownDetails.totalCost)}
                  </div>
                </div>

                {/* Lucro Líquido Real */}
                <div className="p-3.5 rounded-2xl bg-status-success/10 border border-status-success/30">
                  <div className="flex items-center justify-between text-status-success text-xs">
                    <span className="font-bold uppercase tracking-wider">Lucro Líquido Gerado</span>
                    <Sparkles size={16} className="text-status-success" />
                  </div>
                  <div className="text-2xl font-black text-status-success mt-1 font-mono">
                    {fmt(drilldownDetails.totalProfit)}
                  </div>
                  <div className="text-[11px] font-bold text-status-success mt-0.5">
                    {drilldownDetails.marginPercent.toFixed(1)}% de margem líquida
                  </div>
                </div>
              </div>
            )}

            {/* CORPO DO RAIO-X: CARDS OPERACIONAIS OU TABELA DE PASSAGEIROS */}
            {isCostDrilldown && costViewMode === "card" ? (
              <div className="space-y-4 pt-1">
                {drilldown.type === "cost_category" && drilldown.category === "addons_cost" ? (
                  <AddonsCostOperationalCard addons={addons} fmt={fmt} />
                ) : matchingBlocks.length === 0 ? (
                  <div className="p-8 text-center text-text-muted text-xs bg-surface-subtle/40 rounded-3xl border border-border">
                    Nenhum bloco cadastrado diretamente para esta categoria de custo.
                  </div>
                ) : (
                  matchingBlocks.map((b) => (
                    <BlockOperationalCard
                      key={b.id}
                      block={b}
                      fmt={fmt}
                      fmtDate={fmtDate}
                      copiedLoc={copiedLoc}
                      onCopyLoc={handleCopyLoc}
                    />
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                {/* Barra de Busca dentro do Raio-X */}
                <div className="flex items-center justify-between gap-3">
                  <div className="relative w-full sm:w-80">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                    />
                    <input
                      type="text"
                      placeholder="Filtrar passageiro, quarto ou detalhe..."
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-border bg-surface text-xs text-text-body focus:outline-none focus:border-primary"
                    />
                  </div>

                  <span className="text-xs text-text-muted font-semibold shrink-0">
                    Exibindo {filteredPaxList.length} de {drilldownDetails.paxCount} pessoas
                  </span>
                </div>

                {/* Tabela dos Passageiros daquela Seleção */}
                <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-surface-subtle border-b border-border text-[11px] font-bold text-text-muted uppercase tracking-wider">
                          <th className="py-3 px-4">Passageiro</th>
                          <th className="py-3 px-3">Quarto / Acomodação</th>
                          <th className="py-3 px-3">Faixa / Detalhes</th>
                          <th className="py-3 px-3 text-right">Preço Cobrado</th>
                          <th className="py-3 px-3 text-right">Custo Direto</th>
                          <th className="py-3 px-3 text-right">Lucro Líquido</th>
                          <th className="py-3 px-3 text-center">Modo</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {filteredPaxList.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-text-muted text-xs">
                              Nenhum passageiro encontrado nesta seleção com os filtros atuais.
                            </td>
                          </tr>
                        ) : (
                          filteredPaxList.map((p) => (
                            <tr key={p.id} className="hover:bg-surface-subtle/50 transition-colors">
                              <td className="py-2.5 px-4">
                                <div className="font-bold text-text-title">{p.name}</div>
                                <div className="text-[11px] text-text-muted">
                                  {p.age !== null ? `${p.age} anos` : "Idade não informada"} · {p.tipo}
                                </div>
                              </td>

                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded-md bg-surface-subtle border border-border text-[11px] font-medium text-text-body inline-block">
                                  {p.roomName}
                                </span>
                              </td>

                              <td className="py-2.5 px-3 text-text-body text-[11px]">
                                {p.detailNote ? (
                                  <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-semibold inline-block max-w-xs truncate">
                                    {p.detailNote}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </td>

                              <td className="py-2.5 px-3 text-right font-mono font-bold text-text-title">
                                {fmt(p.itemPrice)}
                              </td>

                              <td className="py-2.5 px-3 text-right font-mono text-status-danger">
                                {fmt(p.itemCost)}
                              </td>

                              <td className="py-2.5 px-3 text-right font-mono font-black text-status-success">
                                +{fmt(p.itemProfit)}
                              </td>

                              <td className="py-2.5 px-3 text-center">
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-surface-subtle border border-border text-text-muted">
                                  {p.paymentMode}
                                </span>
                              </td>

                              <td className="py-2.5 px-4 text-center">
                                {p.status === "pago" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-status-success/15 text-status-success border border-status-success/30">
                                    <CheckCircle2 size={11} />
                                    Quitado
                                  </span>
                                ) : p.status === "parcial" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-status-warning/15 text-status-warning border border-status-warning/30">
                                    <Clock size={11} />
                                    Parcial
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-status-danger/15 text-status-danger border border-status-danger/30">
                                    <Clock size={11} />
                                    Pendente
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot className="bg-surface-subtle font-bold border-t border-border">
                        <tr>
                          <td
                            colSpan={3}
                            className="py-3 px-4 text-right text-text-muted uppercase text-[11px]"
                          >
                            Totais da Seleção ({filteredPaxList.length} pessoas):
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-text-title">
                            {fmt(filteredPaxList.reduce((sum, p) => sum + p.itemPrice, 0))}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-status-danger">
                            {fmt(filteredPaxList.reduce((sum, p) => sum + p.itemCost, 0))}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-status-success text-sm">
                            +{fmt(filteredPaxList.reduce((sum, p) => sum + p.itemProfit, 0))}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
