"use client";

import React, { useMemo, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Percent,
  Users,
  Printer,
  Download,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  Building2,
  Plane,
  Bus,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Package,
  Layers,
  FileSpreadsheet,
} from "lucide-react";
import type { EditorBlock, PrazoPagamentoItem } from "@/lib/editor-types";
import type { ExcursionAddon, AddonGuestPayment, RoomTypePricing, CustomGuestPayment } from "@/lib/actions/addons";
import type { RoomGuest, RoomEntry } from "./RoomListView";
import type { PackageFinancialSummary } from "@/lib/package-calc";
import {
  getGuestAge,
  getBlockUnitPriceForGuest,
  getAddonPriceForGuest,
  getRoomPricingForGuest,
  parseNum,
  getGuestAgeBracket,
} from "@/lib/package-calc";

interface ExcursionFinancialReportViewProps {
  excursionId: string;
  excursionName: string;
  destination?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  slots: number;
  blocks: EditorBlock[];
  rooms: RoomEntry[];
  guests: RoomGuest[];
  addons: ExcursionAddon[];
  guestPayments?: Record<string, AddonGuestPayment>;
  profitMargin?: number;
  customProfitAmount?: number | null;
  customPackagePrice?: number | null;
  financialSummary: PackageFinancialSummary;
  roomPricing?: Record<string, RoomTypePricing>;
  guestPaymentModes?: Record<string, "vista" | "prazo" | "personalizado">;
  guestCustomPayments?: Record<string, CustomGuestPayment>;
}

export function ExcursionFinancialReportView({
  excursionName,
  destination,
  periodStart,
  periodEnd,
  slots,
  blocks = [],
  rooms = [],
  guests,
  addons,
  guestPayments = {},
  profitMargin = 0,
  financialSummary,
  roomPricing,
  guestPaymentModes = {},
  guestCustomPayments = {},
}: ExcursionFinancialReportViewProps) {
  const [activeTab, setActiveTab] = useState<"dre" | "passageiros" | "fornecedores">("dre");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  const fmt = (v: number) =>
    (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const fmtDate = (d?: string | null) => {
    if (!d) return "-";
    const date = new Date(d);
    return isNaN(date.getTime())
      ? d
      : date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  };

  // 1. ANÁLISE DETALHADA POR PASSAGEIRO
  const passengerReport = useMemo(() => {
    return guests.map((g) => {
      const age = getGuestAge(g, periodStart);

      // Encontrar quarto e hotel do hóspede
      const guestRoom = rooms.find((r) => r.hospedes?.some((gItem) => gItem.id === g.id));
      const roomType = guestRoom?.tipo || "Duplo";
      const roomBlockId = guestRoom?.blockId;
      const hospedagemBlocks = blocks.filter((b) => b.categoryId === "hospedagem");

      // Discriminação dos blocos de acordo com a faixa etária e alocação de hospedagem
      const blockBreakdown: {
        blockId: string;
        blockTitle: string;
        category: string;
        cost: number;
        tierLabel: string;
      }[] = [];

      for (const b of blocks) {
        if (b.categoryId === "hospedagem") {
          if (hospedagemBlocks.length > 1) {
            // Se o passageiro está alocado em um quarto de hotel específico, calcula APENAS esse hotel!
            if (roomBlockId && b.id !== roomBlockId) {
              continue;
            }
            if (!roomBlockId && b.id !== hospedagemBlocks[0].id) {
              continue;
            }
          }

          let hotelCost = getBlockUnitPriceForGuest(b, g, periodStart, slots || 20).unitCost;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const bRooms = (b.data as any)?.rooms;
          if (Array.isArray(bRooms)) {
            const matchedRoom = bRooms.find(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (hr: any) => hr.tipo?.trim().toLowerCase() === roomType.trim().toLowerCase()
            );
            if (matchedRoom && parseNum(matchedRoom.porPessoa) > 0) {
              const ageBracket = getGuestAgeBracket(g, periodStart);
              hotelCost = ageBracket === "bebe" ? 0 : parseNum(matchedRoom.porPessoa);
            }
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const hotelName = (b.data as any)?.hotel || b.title || "Hospedagem";
          blockBreakdown.push({
            blockId: b.id,
            blockTitle: (b.data as any)?.hotel ? `Hospedagem (${(b.data as any).hotel})` : hotelName,
            category: b.categoryId,
            cost: hotelCost,
            tierLabel: (b.data as any)?.hotel || "Hospedagem",
          });
        } else {
          const pricing = getBlockUnitPriceForGuest(b, g, periodStart, slots || 20);
          blockBreakdown.push({
            blockId: b.id,
            blockTitle: b.title,
            category: b.categoryId,
            cost: pricing.unitCost,
            tierLabel: pricing.matchedTierLabel,
          });
        }
      }

      const basePackageCost = blockBreakdown.reduce((sum, b) => sum + b.cost, 0);
      const paymentMode: "vista" | "prazo" | "personalizado" = (guestPaymentModes && guestPaymentModes[g.id]) || "vista";
      const customPayment = guestCustomPayments?.[g.id];

      // Margem de lucro aplicada da agência e precificação do quarto por idade
      const effectiveProfit = financialSummary.effectiveProfitPerPerson || 0;
      const roundingDiff = financialSummary.roundingDifference || 0;
      const fallbackAdultPrice = financialSummary.pricePerPerson || (basePackageCost + effectiveProfit + roundingDiff);

      const roomPricingResult = getRoomPricingForGuest(
        roomPricing,
        roomType,
        age,
        g.tipo,
        fallbackAdultPrice
      );

      const isPrazo = paymentMode === "prazo";
      const isPersonalizado = paymentMode === "personalizado";

      let packageFinalPrice = roomPricingResult.cashPrice;
      let cardFeeApplied = 0;

      if (isPersonalizado && customPayment) {
        const customSum = (customPayment.metodos || []).reduce((sum, m) => sum + parseNum(m.valor), 0);
        packageFinalPrice = parseNum(customPayment.valorTotal) > 0 ? parseNum(customPayment.valorTotal) : customSum;
        cardFeeApplied = parseNum(customPayment.taxaCartao) || 0;
      } else if (isPrazo) {
        packageFinalPrice = roomPricingResult.cashPrice + roomPricingResult.installmentExtra;
        cardFeeApplied = roomPricingResult.cardFee;
      }

      const agencyProfit = packageFinalPrice - basePackageCost - cardFeeApplied;

      // Adicionais contratados
      const passengerAddons = addons.filter((a) =>
        (a.assignedGuestIds ?? []).includes(g.id)
      );
      const passengerAddonsDetailed = passengerAddons.map((a) => {
        const pricing = getAddonPriceForGuest(a, age, g.tipo);
        return {
          addon: a,
          cost: pricing.cost,
          profit: pricing.profit,
          price: pricing.price,
          tierLabel: pricing.tierLabel,
        };
      });
      const totalAddonsPrice = passengerAddonsDetailed.reduce((sum, a) => sum + a.price, 0);
      const totalAddonsCost = passengerAddonsDetailed.reduce((sum, a) => sum + a.cost, 0);
      const totalAddonsProfit = passengerAddonsDetailed.reduce((sum, a) => sum + a.profit, 0);

      const totalReceivable = packageFinalPrice + totalAddonsPrice;

      // Status de pagamento dos adicionais / pacote
      const paymentInfo = guestPayments[g.id] as (AddonGuestPayment & { status?: string; amountPaid?: number }) | undefined;
      const isPaid = paymentInfo?.status === "pago" || paymentInfo?.paid === true;
      const isPartial = paymentInfo?.status === "parcial";
      const amountPaid = isPaid
        ? totalReceivable
        : isPartial
        ? (paymentInfo?.amountPaid || 0)
        : 0;
      const pendingAmount = Math.max(0, totalReceivable - amountPaid);

      return {
        id: g.id,
        name: g.nome || (g as unknown as { name?: string }).name || "Passageiro sem nome",
        age,
        birthDate: g.birthDate,
        tipo: g.tipo,
        roomName: (g as unknown as { roomName?: string }).roomName || (guestRoom ? `Quarto ${guestRoom.numero} (${guestRoom.tipo})` : "Sem quarto"),
        roomMatchedTierLabel: roomPricingResult.matchedTierLabel,
        paymentMode,
        isPersonalizado,
        customPayment,
        blockBreakdown,
        basePackageCost,
        agencyProfit,
        packageFinalPrice,
        passengerAddons,
        passengerAddonsDetailed,
        totalAddonsPrice,
        totalAddonsCost,
        totalAddonsProfit,
        totalReceivable,
        amountPaid,
        pendingAmount,
        status: isPaid ? "pago" : isPartial ? "parcial" : "pendente",
      };
    });
  }, [guests, blocks, rooms, periodStart, slots, financialSummary, addons, guestPayments, roomPricing, guestPaymentModes, guestCustomPayments]);

  // 2. TOTAIS DE RECEITAS E CUSTOS
  const summary = useMemo(() => {
    const totalPassengers = passengerReport.length;
    const confirmedCount = totalPassengers;

    // Receita de pacotes somando cada passageiro pela faixa etária aplicada
    const totalPackageRevenue = passengerReport.reduce(
      (sum, p) => sum + p.packageFinalPrice,
      0
    );

    // Receita de adicionais
    const totalAddonsRevenue = passengerReport.reduce(
      (sum, p) => sum + p.totalAddonsPrice,
      0
    );

    const grossRevenue = totalPackageRevenue + totalAddonsRevenue;

    // Custos diretos totais dos blocos somados para todos os passageiros
    const totalBlocksCost = passengerReport.reduce(
      (sum, p) => sum + p.basePackageCost,
      0
    );

    // Custos diretos de adicionais somando os custos reais calculados por passageiro
    const totalAddonsCost = passengerReport.reduce(
      (sum, p) => sum + p.totalAddonsCost,
      0
    );

    const totalOperatingCost = totalBlocksCost + totalAddonsCost;
    const netProfit = grossRevenue - totalOperatingCost;
    const netMarginPercent = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;
    const averageTicket = confirmedCount > 0 ? grossRevenue / confirmedCount : 0;

    // Total recebido vs a receber
    const totalReceived = passengerReport.reduce((sum, p) => sum + p.amountPaid, 0);
    const totalPending = passengerReport.reduce((sum, p) => sum + p.pendingAmount, 0);

    // Ponto de equilíbrio (quantos passageiros cobrem os custos fixos dos blocos)
    const fixedBlocksTotal = blocks.reduce((sum, b) => {
      const d = b.data;
      const net = parseFloat(d?.valorNet || d?.valorNetTotal || d?.total || "0") || 0;
      return sum + net;
    }, 0);
    const avgProfitPerPerson = confirmedCount > 0 ? netProfit / confirmedCount : (financialSummary.effectiveProfitPerPerson || 1);
    const breakEvenPax = avgProfitPerPerson > 0 && fixedBlocksTotal > 0
      ? Math.ceil(fixedBlocksTotal / (financialSummary.pricePerPerson || 1))
      : 0;

    return {
      totalPassengers,
      confirmedCount,
      totalPackageRevenue,
      totalAddonsRevenue,
      grossRevenue,
      totalBlocksCost,
      totalAddonsCost,
      totalOperatingCost,
      netProfit,
      netMarginPercent,
      averageTicket,
      totalReceived,
      totalPending,
      breakEvenPax,
      fixedBlocksTotal,
    };
  }, [passengerReport, addons, blocks, financialSummary]);

  // 3. ANÁLISE DE FORNECEDORES E CONTAS A PAGAR DOS BLOCOS
  const suppliersReport = useMemo(() => {
    return blocks.map((b) => {
      const d = b.data;
      const vagasNum = slots > 0 ? slots : 20;

      let supplierName = "-";
      let totalCost = 0;
      let sinalCost = 0;
      let prazoSinal = d?.prazoSinal || null;
      let prazoPagamentoTotal = d?.prazoPagamentoTotal || null;
      let prazosPagamentoFinal: PrazoPagamentoItem[] | null = d?.prazosPagamentoFinal || null;

      switch (b.categoryId) {
        case "aereo":
          supplierName = d?.fornecedor || d?.cia || "Cia Aérea";
          totalCost =
            parseFloat(d?.valorNetTotal || d?.valorNet || "0") ||
            (parseFloat(d?.custoUnitario || "0") * vagasNum);
          sinalCost = parseFloat(d?.sinalTotal || d?.sinal || "0");
          break;
        case "hospedagem":
          supplierName = d?.fornecedor || d?.hotel || "Hotel / Pousada";
          totalCost = parseFloat(d?.totalReserva || d?.valorNetTotal || d?.valorNet || "0");
          sinalCost = parseFloat(d?.sinalTotal || d?.sinal || "0");
          break;
        case "rodoviario":
          supplierName = d?.fornecedor || d?.empresa || "Empresa de Ônibus";
          totalCost = parseFloat(d?.valorNetTotal || d?.valorNet || "0");
          sinalCost = parseFloat(d?.sinalTotal || d?.sinal || "0");
          break;
        default:
          supplierName = d?.fornecedor || d?.prestador || "Fornecedor de Serviços";
          totalCost = parseFloat(d?.custoTotal || d?.total || d?.valorNet || "0");
          sinalCost = parseFloat(d?.sinal || "0");
          break;
      }

      const balanceToPay = Math.max(0, totalCost - sinalCost);

      return {
        blockId: b.id,
        category: b.categoryId,
        title: b.title,
        supplierName,
        totalCost,
        sinalCost,
        balanceToPay,
        prazoSinal,
        prazoPagamentoTotal,
        prazosPagamentoFinal,
      };
    });
  }, [blocks, slots]);

  // 4. DISTRIBUIÇÃO DE CUSTOS POR CATEGORIA
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { label: string; cost: number; icon: React.ReactNode }> = {
      hospedagem: { label: "Hospedagem", cost: 0, icon: <Building2 size={16} /> },
      rodoviario: { label: "Transporte Rodoviário", cost: 0, icon: <Bus size={16} /> },
      aereo: { label: "Transporte Aéreo", cost: 0, icon: <Plane size={16} /> },
      servicos_inclusos: { label: "Serviços & Inclusões", cost: 0, icon: <Sparkles size={16} /> },
      outros: { label: "Outros & Personalizados", cost: 0, icon: <Package size={16} /> },
    };

    suppliersReport.forEach((s) => {
      if (map[s.category]) {
        map[s.category].cost += s.totalCost;
      } else {
        map.outros.cost += s.totalCost;
      }
    });

    return Object.entries(map).filter(([, item]) => item.cost > 0);
  }, [suppliersReport]);

  // Filtragem de passageiros
  const filteredPassengers = useMemo(() => {
    return passengerReport.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.roomName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === "todos"
          ? true
          : statusFilter === "pago"
          ? p.status === "pago"
          : statusFilter === "parcial"
          ? p.status === "parcial"
          : p.status === "pendente";

      return matchSearch && matchStatus;
    });
  }, [passengerReport, searchTerm, statusFilter]);

  // Exportação CSV
  const handleExportCSV = () => {
    const headers = [
      "Passageiro",
      "Quarto",
      "Data Nasc.",
      "Idade",
      "Tipo",
      "Custo Base Pacote (R$)",
      "Margem/Lucro Agência (R$)",
      "Valor Pacote (R$)",
      "Adicionais (R$)",
      "Total Geral (R$)",
      "Valor Pago (R$)",
      "Saldo Pendente (R$)",
      "Status Pagamento",
    ];

    const rows = passengerReport.map((p) => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.roomName.replace(/"/g, '""')}"`,
      p.birthDate ? `"${p.birthDate}"` : '""',
      p.age !== null ? p.age : '""',
      `"${p.tipo || ""}"`,
      p.basePackageCost.toFixed(2),
      p.agencyProfit.toFixed(2),
      p.packageFinalPrice.toFixed(2),
      p.totalAddonsPrice.toFixed(2),
      p.totalReceivable.toFixed(2),
      p.amountPaid.toFixed(2),
      p.pendingAmount.toFixed(2),
      `"${p.status.toUpperCase()}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `relatorio_financeiro_${excursionName.toLowerCase().replace(/\s+/g, "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const occupancyPercent = slots > 0 ? Math.min(100, Math.round((summary.confirmedCount / slots) * 100)) : 100;

  return (
    <div className="space-y-6 animate-fade-in pb-12 print:p-0 print:space-y-4">
      {/* 1. CABEÇALHO DO RELATÓRIO FINANCEIRO */}
      <div className="bg-surface rounded-2xl border border-border p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              Relatório Exclusivo do Pacote
            </span>
            {destination && (
              <span className="text-xs text-text-muted flex items-center gap-1">
                • {destination}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-extrabold text-text-title mt-1">
            {excursionName}
          </h2>
          <div className="flex items-center flex-wrap gap-3 text-xs text-text-muted mt-1.5">
            <span className="flex items-center gap-1 font-medium">
              <Calendar size={13} className="text-primary" />
              {fmtDate(periodStart)} até {fmtDate(periodEnd)}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-medium">
              <Users size={13} className="text-primary" />
              {summary.confirmedCount} passageiros registrados {slots > 0 ? `de ${slots} vagas` : ""}
            </span>
            <span>•</span>
            <span className="text-primary font-semibold">
              Margem configurada: {profitMargin}%
            </span>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2 shrink-0 print:hidden">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-surface-subtle text-text-body text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <Download size={14} className="text-text-muted" />
            <span>Exportar CSV</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:bg-primary-hover transition-all cursor-pointer"
          >
            <Printer size={14} />
            <span>Imprimir Relatório</span>
          </button>
        </div>
      </div>

      {/* 2. CARTOES DE INDICADORES EXECUTIVOS (KPIS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receita Bruta Total */}
        <div className="p-4 rounded-2xl bg-surface border border-border shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Receita Total Prevista
            </span>
            <div className="p-2 rounded-xl bg-status-info/10 text-status-info">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-text-title mt-2">
            {fmt(summary.grossRevenue)}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-text-muted mt-1.5">
            <span className="text-text-title font-semibold">
              {fmt(summary.totalPackageRevenue)}
            </span>{" "}
            em pacotes +{" "}
            <span className="text-text-title font-semibold">
              {fmt(summary.totalAddonsRevenue)}
            </span>{" "}
            opcionais
          </div>
        </div>

        {/* Custos Operacionais Totais */}
        <div className="p-4 rounded-2xl bg-surface border border-border shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Custos Operacionais
            </span>
            <div className="p-2 rounded-xl bg-status-warning/10 text-status-warning">
              <ArrowDownRight size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-status-danger mt-2">
            {fmt(summary.totalOperatingCost)}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-text-muted mt-1.5">
            <span>{blocks.length} blocos de fornecedores contratados</span>
          </div>
        </div>

        {/* Lucro Líquido da Agência */}
        <div className="p-4 rounded-2xl bg-surface border border-status-success/40 bg-gradient-to-br from-surface to-status-success/5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-status-success uppercase tracking-wider">
              Lucro Líquido Agência
            </span>
            <div className="p-2 rounded-xl bg-status-success/10 text-status-success">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-status-success mt-2">
            {fmt(summary.netProfit)}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-text-muted mt-1.5">
            <span className="font-bold text-status-success">
              {summary.netMarginPercent.toFixed(1)}%
            </span>{" "}
            de rentabilidade líquida da viagem
          </div>
        </div>

        {/* Ticket Médio & Ocupação */}
        <div className="p-4 rounded-2xl bg-surface border border-border shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Ticket Médio / Pax
            </span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-text-title mt-2">
            {fmt(summary.averageTicket)}
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between text-[11px] text-text-muted mb-1">
              <span>Ocupação: {summary.confirmedCount}/{slots || summary.confirmedCount}</span>
              <span className="font-bold text-text-title">{occupancyPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-surface-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${occupancyPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. NAVEGAÇÃO DE ABAS DO RELATÓRIO */}
      <div className="flex items-center gap-2 border-b border-border pb-2 print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab("dre")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "dre"
              ? "bg-primary text-white shadow-xs"
              : "text-text-muted hover:text-text-title hover:bg-surface-subtle"
          }`}
        >
          <FileSpreadsheet size={15} />
          <span>Visão Executiva & DRE Sintético</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("passageiros")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "passageiros"
              ? "bg-primary text-white shadow-xs"
              : "text-text-muted hover:text-text-title hover:bg-surface-subtle"
          }`}
        >
          <Users size={15} />
          <span>Passageiros & Recebimentos ({passengerReport.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("fornecedores")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "fornecedores"
              ? "bg-primary text-white shadow-xs"
              : "text-text-muted hover:text-text-title hover:bg-surface-subtle"
          }`}
        >
          <Building2 size={15} />
          <span>Fornecedores & Contas a Pagar ({blocks.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* ABA 1: DRE SINTÉTICO E VISÃO EXECUTIVA */}
      {/* ======================================================== */}
      {(activeTab === "dre" || typeof window === "undefined") && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* DRE Sintético */}
            <div className="lg:col-span-7 bg-surface rounded-2xl border border-border p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-text-title">
                    Demonstrativo de Resultado da Excursão (DRE)
                  </h3>
                  <p className="text-xs text-text-muted">
                    Visão contábil consolidada entre receitas faturadas e custos diretos
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-subtle border border-border text-text-muted">
                  Período Operacional
                </span>
              </div>

              {/* Seção 1: Receitas */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-status-success uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowUpRight size={14} />
                  <span>(+) Receitas Operacionais Brutas</span>
                </div>
                <div className="bg-surface-subtle/50 rounded-xl p-3 border border-border/50 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-text-body">
                    <span>Receita com Pacotes (discriminado por idade)</span>
                    <strong className="text-text-title font-mono">{fmt(summary.totalPackageRevenue)}</strong>
                  </div>
                  <div className="flex justify-between items-center text-text-body">
                    <span>Receita com Serviços Adicionais & Passeios</span>
                    <strong className="text-text-title font-mono">{fmt(summary.totalAddonsRevenue)}</strong>
                  </div>
                  {financialSummary.roundingDifference > 0 && (
                    <div className="flex justify-between items-center text-status-success">
                      <span>Ganho Adicional por Arredondamento Comercial</span>
                      <strong className="font-mono">
                        +{fmt(financialSummary.roundingDifference * summary.confirmedCount)}
                      </strong>
                    </div>
                  )}
                  <div className="border-t border-border pt-1.5 flex justify-between items-center font-bold text-text-title">
                    <span>Total da Receita Bruta</span>
                    <span className="text-status-success font-mono">{fmt(summary.grossRevenue)}</span>
                  </div>
                </div>
              </div>

              {/* Seção 2: Custos */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-status-danger uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowDownRight size={14} />
                  <span>(-) Custos Operacionais Diretos</span>
                </div>
                <div className="bg-surface-subtle/50 rounded-xl p-3 border border-border/50 space-y-2 text-xs">
                  {suppliersReport.map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center text-text-body">
                      <span>{s.title} ({s.supplierName})</span>
                      <span className="font-mono text-text-muted">{fmt(s.totalCost)}</span>
                    </div>
                  ))}
                  {summary.totalAddonsCost > 0 && (
                    <div className="flex justify-between items-center text-text-body">
                      <span>Custos de Adicionais / Ingressos Contratados</span>
                      <span className="font-mono text-text-muted">{fmt(summary.totalAddonsCost)}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-1.5 flex justify-between items-center font-bold text-text-title">
                    <span>Total de Custos Diretos</span>
                    <span className="text-status-danger font-mono">({fmt(summary.totalOperatingCost)})</span>
                  </div>
                </div>
              </div>

              {/* Seção 3: Resultado Líquido */}
              <div className="p-4 rounded-xl bg-status-success/10 border border-status-success/30 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-status-success uppercase tracking-wider">
                    (=) Resultado Operacional Líquido
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    Margem líquida real de rentabilidade
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-status-success font-mono">
                    {fmt(summary.netProfit)}
                  </div>
                  <div className="text-xs font-bold text-status-success">
                    {summary.netMarginPercent.toFixed(1)}% de margem líquida
                  </div>
                </div>
              </div>
            </div>

            {/* Painel Lateral: Composição de Custos e Break-Even */}
            <div className="lg:col-span-5 space-y-4">
              {/* Composição de Custos */}
              <div className="bg-surface rounded-2xl border border-border p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                  <h4 className="text-xs font-bold text-text-title uppercase tracking-wider flex items-center gap-1.5">
                    <Layers size={14} className="text-primary" />
                    Composição de Custos
                  </h4>
                  <span className="text-[11px] font-semibold text-text-muted">
                    Total: {fmt(summary.totalOperatingCost)}
                  </span>
                </div>

                <div className="space-y-3 pt-1">
                  {categoryBreakdown.map(([cat, item]) => {
                    const percent =
                      summary.totalOperatingCost > 0
                        ? (item.cost / summary.totalOperatingCost) * 100
                        : 0;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="flex items-center gap-1.5 text-text-title font-medium">
                            <span className="text-text-muted">{item.icon}</span>
                            {item.label}
                          </span>
                          <span className="font-bold text-text-title">
                            {fmt(item.cost)}{" "}
                            <span className="text-[10px] text-text-muted font-normal">
                              ({percent.toFixed(0)}%)
                            </span>
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-surface-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/70 rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ponto de Equilíbrio / Break-Even */}
              <div className="bg-surface rounded-2xl border border-border p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                  <h4 className="text-xs font-bold text-text-title uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-status-success" />
                    Ponto de Equilíbrio (Break-Even)
                  </h4>
                </div>

                <div className="p-3.5 bg-surface-subtle rounded-xl border border-border/70 space-y-2">
                  <div className="text-xs text-text-muted">
                    Para cobrir todos os custos fixos dos blocos ({fmt(summary.fixedBlocksTotal)}), a excursão necessita de:
                  </div>
                  <div className="text-xl font-extrabold text-text-title flex items-baseline gap-1.5">
                    <span>{summary.breakEvenPax} passageiros pagantes</span>
                    <span className="text-xs text-status-success font-semibold">
                      ({summary.confirmedCount >= summary.breakEvenPax ? "✓ Meta atingida!" : "Ainda em captação"})
                    </span>
                  </div>
                  <div className="text-[11px] text-text-muted">
                    Atualmente com <strong className="text-text-title">{summary.confirmedCount} passageiros</strong>, a excursão está{" "}
                    {summary.confirmedCount >= summary.breakEvenPax ? (
                      <span className="text-status-success font-bold">100% na zona de lucro!</span>
                    ) : (
                      <span>faltando {summary.breakEvenPax - summary.confirmedCount} passageiros para zerar o custo.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: PASSAGEIROS & RECEBIMENTOS */}
      {/* ======================================================== */}
      {(activeTab === "passageiros" || typeof window === "undefined") && (
        <div className="space-y-4">
          {/* Barra de Filtro e Busca */}
          <div className="bg-surface rounded-2xl border border-border p-3.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
            <div className="relative w-full sm:w-80">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                placeholder="Buscar por nome do passageiro ou quarto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-border bg-surface text-xs text-text-body focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-text-muted shrink-0">
                Status:
              </span>
              <div className="flex items-center bg-surface-subtle p-0.5 rounded-lg border border-border text-xs">
                {(["todos", "pago", "parcial", "pendente"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-md capitalize font-semibold transition-all cursor-pointer ${
                      statusFilter === st
                        ? "bg-surface text-text-title shadow-2xs"
                        : "text-text-muted hover:text-text-body"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tabela de Passageiros */}
          <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-surface-subtle/80 border-b border-border text-[11px] font-bold text-text-muted uppercase tracking-wider">
                    <th className="py-3 px-4">Passageiro</th>
                    <th className="py-3 px-3">Quarto / Acomodação</th>
                    <th className="py-3 px-3">Faixas nos Blocos</th>
                    <th className="py-3 px-3 text-right">Custo Base</th>
                    <th className="py-3 px-3 text-right">Margem Agência</th>
                    <th className="py-3 px-3 text-right">Valor Pacote</th>
                    <th className="py-3 px-3 text-right">Adicionais</th>
                    <th className="py-3 px-3 text-right">Total Geral</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPassengers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-text-muted text-xs">
                        Nenhum passageiro encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredPassengers.map((p) => (
                      <tr key={p.id} className="hover:bg-surface-subtle/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-text-title">{p.name}</div>
                          <div className="text-[11px] text-text-muted">
                            {p.age !== null ? `${p.age} anos` : "Idade não informada"}
                            {p.birthDate && ` (${fmtDate(p.birthDate)})`}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-surface-subtle border border-border text-[11px] font-medium text-text-body block w-fit">
                            {p.roomName}
                          </span>
                          {p.roomMatchedTierLabel && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                              {p.roomMatchedTierLabel}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {p.blockBreakdown.map((b) => (
                              <span
                                key={b.blockId}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20"
                                title={`${b.blockTitle}: ${fmt(b.cost)}`}
                              >
                                {b.category.slice(0, 4)}: {b.tierLabel}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-text-muted">
                          {fmt(p.basePackageCost)}
                        </td>

                        <td className={`py-3 px-3 text-right font-mono font-semibold ${
                          p.agencyProfit >= 0 ? "text-status-success" : "text-status-danger"
                        }`}>
                          {p.agencyProfit >= 0 ? `+${fmt(p.agencyProfit)}` : fmt(p.agencyProfit)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-bold text-text-title">
                          <div>{fmt(p.packageFinalPrice)}</div>
                          {p.isPersonalizado && (
                            <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 block font-sans">
                              Personalizado
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-text-body">
                          {p.totalAddonsPrice > 0 ? (
                            <span className="text-primary font-semibold">
                              +{fmt(p.totalAddonsPrice)}
                            </span>
                          ) : (
                            <span className="text-text-muted">-</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-black text-text-title">
                          {fmt(p.totalReceivable)}
                        </td>

                        <td className="py-3 px-4 text-center">
                          {p.status === "pago" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-status-success/15 text-status-success border border-status-success/30">
                              <CheckCircle2 size={12} />
                              Quitado
                            </span>
                          ) : p.status === "parcial" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-status-warning/15 text-status-warning border border-status-warning/30">
                              <Clock size={12} />
                              Parcial
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-status-danger/15 text-status-danger border border-status-danger/30">
                              <Clock size={12} />
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
                    <td colSpan={5} className="py-3 px-4 text-right text-text-muted uppercase text-[11px]">
                      Totais ({filteredPassengers.length} passageiros):
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-text-title font-black">
                      {fmt(filteredPassengers.reduce((sum, p) => sum + p.packageFinalPrice, 0))}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-primary font-bold">
                      {fmt(filteredPassengers.reduce((sum, p) => sum + p.totalAddonsPrice, 0))}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-status-success font-black text-sm">
                      {fmt(filteredPassengers.reduce((sum, p) => sum + p.totalReceivable, 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 3: FORNECEDORES & CONTAS A PAGAR DOS BLOCOS */}
      {/* ======================================================== */}
      {(activeTab === "fornecedores" || typeof window === "undefined") && (
        <div className="space-y-4">
          <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs">
            <h3 className="text-sm font-bold text-text-title">
              Contas a Pagar por Bloco de Serviço
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Valores negociados com cada fornecedor da viagem, sinais pagos e prazos limites de liquidação
            </p>
          </div>

          <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-surface-subtle/80 border-b border-border text-[11px] font-bold text-text-muted uppercase tracking-wider">
                    <th className="py-3 px-4">Bloco / Categoria</th>
                    <th className="py-3 px-4">Fornecedor Contratado</th>
                    <th className="py-3 px-3 text-right">Custo Total</th>
                    <th className="py-3 px-3 text-right">Sinal Pago</th>
                    <th className="py-3 px-3 text-center">Prazo Sinal</th>
                    <th className="py-3 px-3 text-center">Prazo Liquidação</th>
                    <th className="py-3 px-4 text-right">Saldo Restante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {suppliersReport.map((s) => (
                    <tr key={s.blockId} className="hover:bg-surface-subtle/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-text-title">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded-md bg-primary/10 text-primary">
                            {s.category === "hospedagem" ? (
                              <Building2 size={13} />
                            ) : s.category === "aereo" ? (
                              <Plane size={13} />
                            ) : s.category === "rodoviario" ? (
                              <Bus size={13} />
                            ) : (
                              <Sparkles size={13} />
                            )}
                          </span>
                          <span>{s.title}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-text-body font-medium">
                        {s.supplierName}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-text-title">
                        {fmt(s.totalCost)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-status-success">
                        {s.sinalCost > 0 ? fmt(s.sinalCost) : "-"}
                      </td>

                      <td className="py-3 px-3 text-center text-text-muted">
                        {fmtDate(s.prazoSinal)}
                      </td>

                      <td className="py-3 px-3 text-center text-text-muted font-medium">
                        {s.prazosPagamentoFinal && s.prazosPagamentoFinal.filter((p) => p.data?.trim()).length > 1 ? (
                          <div className="flex flex-col gap-1 items-center justify-center">
                            {s.prazosPagamentoFinal
                              .filter((p) => p.data?.trim())
                              .map((p, pIdx) => (
                                <span
                                  key={pIdx}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 whitespace-nowrap"
                                >
                                  <span className="text-[10px] opacity-75">{pIdx + 1}ª:</span>
                                  <span>{fmtDate(p.data)}</span>
                                  {p.valor ? (
                                    <span className="text-text-title font-mono font-bold">
                                      ({fmt(parseNum(p.valor))})
                                    </span>
                                  ) : null}
                                </span>
                              ))}
                          </div>
                        ) : (
                          fmtDate(s.prazoPagamentoTotal)
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-black text-status-danger">
                        {fmt(s.balanceToPay)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-surface-subtle font-bold border-t border-border">
                  <tr>
                    <td colSpan={2} className="py-3 px-4 text-right text-text-muted uppercase text-[11px]">
                      Totais Fornecedores:
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-text-title font-black">
                      {fmt(suppliersReport.reduce((sum, s) => sum + s.totalCost, 0))}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-status-success font-black">
                      {fmt(suppliersReport.reduce((sum, s) => sum + s.sinalCost, 0))}
                    </td>
                    <td colSpan={2} />
                    <td className="py-3 px-4 text-right font-mono text-status-danger font-black text-sm">
                      {fmt(suppliersReport.reduce((sum, s) => sum + s.balanceToPay, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
