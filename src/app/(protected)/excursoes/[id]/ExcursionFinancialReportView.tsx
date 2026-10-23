"use client";

import React, { useMemo, useState, useEffect } from "react";
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
  PieChart as PieIcon,
  Check,
  AlertCircle,
  AlertTriangle,
  LayoutGrid,
  ListFilter,
  CreditCard,
  CheckSquare,
  Square,
  Hotel,
  Pencil,
} from "lucide-react";
import type { EditorBlock, PrazoPagamentoItem } from "@/lib/editor-types";
import { toggleBlockDeadlinePaid } from "@/lib/actions/blocks";
import {
  type ExcursionAddon,
  type AddonGuestPayment,
  type RoomTypePricing,
  type CustomGuestPayment,
  savePassengerPayment,
} from "@/lib/actions/addons";
import {
  PassengerPaymentModal,
  type PassengerPaymentModalData,
} from "./PassengerPaymentModal";
import type { RoomGuest, RoomEntry } from "./RoomListView";
import type { PackageFinancialSummary } from "@/lib/package-calc";
import { ExcursionFinancialCharts } from "./ExcursionFinancialCharts";
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
  guestPackagePayments?: Record<string, AddonGuestPayment>;
  profitMargin?: number;
  customProfitAmount?: number | null;
  customPackagePrice?: number | null;
  financialSummary: PackageFinancialSummary;
  roomPricing?: Record<string, RoomTypePricing>;
  guestPaymentModes?: Record<string, "vista" | "prazo" | "personalizado">;
  guestCustomPayments?: Record<string, CustomGuestPayment>;
  onUpdatePayments?: (
    payments: Record<string, AddonGuestPayment>,
    customPayments?: Record<string, CustomGuestPayment>,
    paymentModes?: Record<string, "vista" | "prazo" | "personalizado">
  ) => void;
}

export function ExcursionFinancialReportView({
  excursionId,
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
  guestPackagePayments,
  profitMargin = 0,
  financialSummary,
  roomPricing,
  guestPaymentModes = {},
  guestCustomPayments = {},
  onUpdatePayments,
}: ExcursionFinancialReportViewProps) {
  const [activeTab, setActiveTab] = useState<"graficos" | "dre" | "passageiros" | "fornecedores">("graficos");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  // Estado local dos blocos para suporte a atualização otimista dos prazos pagos
  const [localBlocks, setLocalBlocks] = useState<EditorBlock[]>(blocks);
  const [fornecedoresViewMode, setFornecedoresViewMode] = useState<"cards" | "tabela">("cards");
  const [fornecedoresSearch, setFornecedoresSearch] = useState("");
  const [fornecedoresCategoryFilter, setFornecedoresCategoryFilter] = useState<string>("todos");
  const [fornecedoresStatusFilter, setFornecedoresStatusFilter] = useState<"todos" | "pendentes" | "quitados" | "vencidos">("todos");

  // Estado local para pagamentos com atualização otimista
  const [localGuestPayments, setLocalGuestPayments] = useState<Record<string, AddonGuestPayment>>(guestPayments);
  const [localGuestPackagePayments, setLocalGuestPackagePayments] = useState<Record<string, AddonGuestPayment>>(
    guestPackagePayments || guestPayments || {}
  );
  const [localCustomPayments, setLocalCustomPayments] = useState<Record<string, CustomGuestPayment>>(guestCustomPayments);
  const [localGuestPaymentModes, setLocalGuestPaymentModes] = useState<Record<string, "vista" | "prazo" | "personalizado">>(guestPaymentModes);
  const [paymentModalPassenger, setPaymentModalPassenger] = useState<PassengerPaymentModalData | null>(null);

  useEffect(() => {
    setLocalBlocks(blocks);
  }, [blocks]);

  useEffect(() => {
    setLocalGuestPayments(guestPayments);
  }, [guestPayments]);

  useEffect(() => {
    setLocalGuestPackagePayments(guestPackagePayments || guestPayments || {});
  }, [guestPackagePayments, guestPayments]);

  useEffect(() => {
    setLocalCustomPayments(guestCustomPayments);
  }, [guestCustomPayments]);

  useEffect(() => {
    setLocalGuestPaymentModes(guestPaymentModes);
  }, [guestPaymentModes]);

  const fmt = (v: number) =>
    (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const fmtDate = (d?: string | null) => {
    if (!d) return "-";
    const date = new Date(d);
    return isNaN(date.getTime())
      ? d
      : date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  };

  const isOverdue = (dateStr?: string | null) => {
    if (!dateStr) return false;
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const target = new Date(parts[0], parts[1] - 1, parts[2]);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return target < today;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  };

  const handleToggleDeadline = async ({
    blockId,
    deadlineType,
    prazoId,
    paid,
  }: {
    blockId: string;
    deadlineType: "sinal" | "emissao" | "final" | "parcela";
    prazoId?: string;
    paid: boolean;
  }) => {
    setLocalBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== blockId) return b;
        const d = { ...(b.data || {}) };
        if (deadlineType === "sinal") {
          d.sinalPago = paid;
        } else if (deadlineType === "emissao") {
          d.prazoEmissaoPago = paid;
        } else if (deadlineType === "final") {
          d.prazoPagamentoTotalPago = paid;
        } else if (deadlineType === "parcela") {
          if (Array.isArray(d.prazosPagamentoFinal)) {
            d.prazosPagamentoFinal = d.prazosPagamentoFinal.map((p: PrazoPagamentoItem) =>
              p.id === prazoId
                ? { ...p, pago: paid, dataPagamento: paid ? new Date().toISOString() : undefined }
                : p
            );
          }
        }
        return { ...b, data: d };
      })
    );

    try {
      await toggleBlockDeadlinePaid({ blockId, deadlineType, prazoId, paid });
    } catch (err) {
      console.error("Erro ao alternar pagamento do prazo:", err);
      setLocalBlocks(blocks);
    }
  };

  const handleSavePassengerPayment = async (params: {
    guestId: string;
    status: "pago" | "parcial" | "pendente";
    amountPaid: number;
    paymentMethod?: string;
    paidAt?: string;
    notes?: string;
    customPayment?: CustomGuestPayment;
    paymentMode?: "vista" | "prazo" | "personalizado";
  }) => {
    const nextPackagePayments: Record<string, AddonGuestPayment> = {
      ...localGuestPackagePayments,
      [params.guestId]: {
        ...(localGuestPackagePayments[params.guestId] || {}),
        status: params.status,
        paid: params.status === "pago",
        amountPaid: params.amountPaid,
        paymentMethod: params.paymentMethod,
        paidAt: params.paidAt,
        notes: params.notes,
      },
    };

    const nextCustom: Record<string, CustomGuestPayment> = {
      ...localCustomPayments,
    };
    if (params.customPayment) {
      nextCustom[params.guestId] = params.customPayment;
    }

    const nextModes = {
      ...localGuestPaymentModes,
    };
    if (params.paymentMode) {
      nextModes[params.guestId] = params.paymentMode;
    }

    // Atualização otimista imediata na interface
    setLocalGuestPackagePayments(nextPackagePayments);
    if (params.customPayment) setLocalCustomPayments(nextCustom);
    if (params.paymentMode) setLocalGuestPaymentModes(nextModes);

    if (onUpdatePayments) {
      onUpdatePayments(
        nextPackagePayments,
        params.customPayment ? nextCustom : undefined,
        params.paymentMode ? nextModes : undefined
      );
    }

    try {
      await savePassengerPayment({
        excursionId,
        ...params,
      });
    } catch (err) {
      console.error("Erro ao salvar pagamento do passageiro:", err);
      setLocalGuestPackagePayments(guestPackagePayments || guestPayments || {});
      setLocalCustomPayments(guestCustomPayments);
      setLocalGuestPaymentModes(guestPaymentModes);
    }
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
      const paymentMode: "vista" | "prazo" | "personalizado" = (localGuestPaymentModes && localGuestPaymentModes[g.id]) || "vista";
      const customPayment = localCustomPayments?.[g.id];

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

      if (g.isCortesia || g.billingType === "cortesia") {
        packageFinalPrice = 0;
        cardFeeApplied = 0;
      } else if ((g.billingType === "personalizado" || parseNum(g.customValor) > 0) && !customPayment) {
        packageFinalPrice = parseNum(g.customValor);
        cardFeeApplied = 0;
      } else if (isPersonalizado && customPayment) {
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

      // Status e valores de pagamento do PACOTE (sem adicionais)
      const paymentInfo = (localGuestPackagePayments[g.id] || localGuestPayments[g.id]) as (AddonGuestPayment & { status?: string; amountPaid?: number }) | undefined;
      const customMetodos = Array.isArray(customPayment?.metodos) ? customPayment.metodos : [];
      const hasCustomInstallments = customMetodos.length > 0;

      const paidInstallments = customMetodos.filter((m) => m.pago);
      const paidInstallmentsSum = paidInstallments.reduce((sum, m) => sum + parseNum(m.valor), 0);
      const allInstallmentsPaid = hasCustomInstallments && paidInstallments.length === customMetodos.length;
      const someInstallmentsPaid = paidInstallments.length > 0;

      let status: "pago" | "parcial" | "pendente" = "pendente";
      let amountPaid = 0;

      if (paymentInfo?.status) {
        status = paymentInfo.status as "pago" | "parcial" | "pendente";
        if (status === "pago") {
          amountPaid = packageFinalPrice;
        } else if (status === "parcial") {
          amountPaid = paymentInfo.amountPaid !== undefined
            ? Math.min(packageFinalPrice, paymentInfo.amountPaid)
            : (hasCustomInstallments ? paidInstallmentsSum : 0);
        } else {
          amountPaid = 0;
        }
      } else if (hasCustomInstallments) {
        if (allInstallmentsPaid) {
          status = "pago";
          amountPaid = packageFinalPrice;
        } else if (someInstallmentsPaid) {
          status = "parcial";
          amountPaid = Math.min(packageFinalPrice, paidInstallmentsSum);
        } else {
          status = "pendente";
          amountPaid = 0;
        }
      } else if (paymentInfo?.paid) {
        status = "pago";
        amountPaid = packageFinalPrice;
      } else {
        status = "pendente";
        amountPaid = 0;
      }

      const pendingAmount = Math.max(0, packageFinalPrice - amountPaid);

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
        paymentInfo,
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
        status,
      };
    });
  }, [guests, blocks, rooms, periodStart, slots, financialSummary, addons, localGuestPackagePayments, localGuestPayments, roomPricing, localGuestPaymentModes, localCustomPayments]);

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
      const net = parseNum(
        d?.totalReserva ??
        d?.valorContrato ??
        d?.totalDespesas ??
        d?.valorNetTotal ??
        d?.valorNet ??
        d?.custoTotal ??
        d?.total
      );
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
    return localBlocks.map((b) => {
      const d = b.data || {};
      const vagasNum = slots > 0 ? slots : 20;

      let supplierName = "-";
      let totalCost = 0;
      let sinalCost = 0;
      const prazoSinal = d?.prazoSinal || null;
      const prazoPagamentoTotal = d?.prazoPagamentoTotal || null;
      const prazoEmissao = d?.prazoEmissao || null;
      const prazosPagamentoFinal: PrazoPagamentoItem[] = Array.isArray(d?.prazosPagamentoFinal)
        ? d.prazosPagamentoFinal.filter((p: any) => p && (p.data?.trim() || p.valor))
        : [];

      switch (b.categoryId) {
        case "aereo":
          supplierName = d?.fornecedor || d?.cia || d?.portal || "Cia Aérea";
          totalCost =
            parseNum(d?.valorNetTotal ?? d?.valorNet) ||
            parseNum(d?.custoTotal) ||
            (parseNum(d?.custoUnitario) * vagasNum);
          sinalCost = parseNum(d?.sinalTotal ?? d?.sinal);
          break;
        case "hospedagem":
          supplierName = d?.fornecedor || d?.hotel || "Hotel / Pousada";
          totalCost = parseNum(d?.totalReserva ?? d?.valorNetTotal ?? d?.valorNet);
          if (totalCost === 0 && Array.isArray(d?.rooms)) {
            for (const r of d.rooms) {
              if (String(r.totalPeriodo || "").toLowerCase().includes("cortesia")) continue;
              const totPer = parseNum(r.totalPeriodo);
              const totQ = parseNum(r.totalQuarto);
              const diaria = parseNum(r.diaria);
              const qtd = parseNum(r.qtd) || 1;
              const porPessoa = parseNum(r.porPessoa);
              const cap = r.tipo?.toLowerCase().includes("single")
                ? 1
                : r.tipo?.toLowerCase().includes("triplo")
                ? 3
                : r.tipo?.toLowerCase().includes("quadr")
                ? 4
                : 2;
              if (totPer > 0) totalCost += totPer;
              else if (totQ > 0) totalCost += totQ * qtd;
              else if (diaria > 0) totalCost += diaria * (parseNum(d.diarias) || 1) * qtd;
              else if (porPessoa > 0) totalCost += porPessoa * cap * qtd;
            }
          }
          sinalCost = parseNum(d?.sinalTotal ?? d?.sinal);
          break;
        case "rodoviario":
          supplierName = d?.fornecedor || d?.empresa || "Empresa de Ônibus";
          totalCost =
            parseNum(d?.valorContrato ?? d?.valorNetTotal ?? d?.valorNet) ||
            (parseNum(d?.rateioPorPessoa) * vagasNum);
          sinalCost = parseNum(d?.sinalTotal ?? d?.sinal);
          break;
        case "guias":
          supplierName = d?.fornecedor || (d?.guias && d.guias[0]?.nome) || "Guias e Monitores";
          totalCost = parseNum(d?.totalDespesas);
          if (totalCost === 0) {
            let gTot = 0;
            for (const g of d?.guias ?? []) {
              const dNum = parseNum(g.diarias);
              const vDiaria = parseNum(g.valorDiaria);
              const vTot = parseNum(g.valorTotal);
              gTot += vTot > 0 ? vTot : (dNum > 0 && vDiaria > 0 ? dNum * vDiaria : 0);
            }
            for (const desp of d?.despesas ?? []) {
              gTot += parseNum(desp.valor);
            }
            totalCost = gTot > 0 ? gTot : (parseNum(d?.rateioPorPessoa) * vagasNum);
          }
          sinalCost = parseNum(d?.sinal);
          break;
        case "personalizados":
          supplierName = d?.fornecedor || "Personalizados / Brindes";
          totalCost = parseNum(d?.totalDespesas);
          if (totalCost === 0 && Array.isArray(d?.rows)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            totalCost = d.rows.reduce((sum: number, r: any) => sum + parseNum(r.total || r.custo), 0);
          }
          sinalCost = parseNum(d?.sinal);
          break;
        default:
          supplierName = d?.fornecedor || d?.prestador || "Fornecedor de Serviços";
          totalCost = parseNum(d?.totalDespesas ?? d?.custoTotal ?? d?.total ?? d?.valorNet);
          sinalCost = parseNum(d?.sinal);
          break;
      }

      // Verificação se o sinal está pago
      const isSinalPaid = d?.sinalPago !== undefined ? !!d.sinalPago : sinalCost > 0 && !prazoSinal;
      const isEmissaoPaid = !!d?.prazoEmissaoPago;
      const isPagamentoTotalPaid = !!d?.prazoPagamentoTotalPago;

      // Monta cronograma estruturado de todos os prazos do bloco
      interface DeadlineDetail {
        id: string;
        type: "sinal" | "emissao" | "final" | "parcela";
        prazoId?: string;
        label: string;
        data?: string | null;
        valor?: number;
        pago: boolean;
        isOverdue: boolean;
      }

      const deadlines: DeadlineDetail[] = [];

      // 1. Prazo do Sinal
      if (prazoSinal || sinalCost > 0) {
        deadlines.push({
          id: `sinal-${b.id}`,
          type: "sinal",
          label: "Sinal da Reserva",
          data: prazoSinal,
          valor: sinalCost > 0 ? sinalCost : undefined,
          pago: isSinalPaid,
          isOverdue: !isSinalPaid && isOverdue(prazoSinal),
        });
      }

      // 2. Prazo de Emissão (se aéreo)
      if (prazoEmissao) {
        deadlines.push({
          id: `emissao-${b.id}`,
          type: "emissao",
          label: "Emissão de Bilhetes",
          data: prazoEmissao,
          valor: undefined,
          pago: isEmissaoPaid,
          isOverdue: !isEmissaoPaid && isOverdue(prazoEmissao),
        });
      }

      // 3. Prazos Finais / Parcelas
      if (prazosPagamentoFinal.length > 0) {
        prazosPagamentoFinal.forEach((p, pIdx) => {
          const pVal = parseNum(p.valor);
          deadlines.push({
            id: p.id || `parcela-${b.id}-${pIdx}`,
            type: "parcela",
            prazoId: p.id,
            label: p.descricao?.trim() || (prazosPagamentoFinal.length > 1 ? `${pIdx + 1}ª Parcela do Saldo` : "Liquidação do Saldo"),
            data: p.data,
            valor: pVal > 0 ? pVal : undefined,
            pago: !!p.pago,
            isOverdue: !p.pago && isOverdue(p.data),
          });
        });
      } else if (prazoPagamentoTotal) {
        const saldoFinal = Math.max(0, totalCost - (isSinalPaid ? sinalCost : 0));
        deadlines.push({
          id: `final-${b.id}`,
          type: "final",
          label: "Liquidação do Saldo",
          data: prazoPagamentoTotal,
          valor: saldoFinal > 0 ? saldoFinal : undefined,
          pago: isPagamentoTotalPaid,
          isOverdue: !isPagamentoTotalPaid && isOverdue(prazoPagamentoTotal),
        });
      }

      // Cálculo do total já liquidado / pago
      let totalPaid = 0;
      if (isSinalPaid && sinalCost > 0) {
        totalPaid += sinalCost;
      }
      if (prazosPagamentoFinal.length > 0) {
        prazosPagamentoFinal.forEach((p) => {
          if (p.pago) {
            totalPaid += parseNum(p.valor);
          }
        });
      } else if (isPagamentoTotalPaid) {
        totalPaid += Math.max(0, totalCost - (isSinalPaid ? sinalCost : 0));
      }

      const balanceToPay = Math.max(0, totalCost - totalPaid);
      const percentPaid = totalCost > 0 ? Math.min(100, Math.round((totalPaid / totalCost) * 100)) : 100;
      const hasOverdue = deadlines.some((dl) => dl.isOverdue);
      const isCompleted = balanceToPay === 0 || (deadlines.length > 0 && deadlines.every((dl) => dl.pago));

      return {
        blockId: b.id,
        category: b.categoryId,
        title: b.title,
        supplierName,
        totalCost,
        sinalCost,
        isSinalPaid,
        totalPaid,
        balanceToPay,
        percentPaid,
        prazoSinal,
        prazoPagamentoTotal,
        prazoEmissao,
        prazosPagamentoFinal,
        deadlines,
        hasOverdue,
        isCompleted,
        rawBlock: b,
      };
    });
  }, [localBlocks, slots]);

  // Totais Gerais de Fornecedores e Prazos
  const suppliersTotals = useMemo(() => {
    const totalCost = suppliersReport.reduce((sum, s) => sum + s.totalCost, 0);
    const totalPaid = suppliersReport.reduce((sum, s) => sum + s.totalPaid, 0);
    const balanceToPay = suppliersReport.reduce((sum, s) => sum + s.balanceToPay, 0);
    const totalDeadlines = suppliersReport.reduce((sum, s) => sum + s.deadlines.length, 0);
    const paidDeadlines = suppliersReport.reduce(
      (sum, s) => sum + s.deadlines.filter((dl) => dl.pago).length,
      0
    );
    const overdueDeadlines = suppliersReport.reduce(
      (sum, s) => sum + s.deadlines.filter((dl) => dl.isOverdue).length,
      0
    );

    return {
      totalCost,
      totalPaid,
      balanceToPay,
      totalDeadlines,
      paidDeadlines,
      overdueDeadlines,
    };
  }, [suppliersReport]);

  // Fornecedores Filtrados por Busca, Categoria e Status
  const filteredSuppliers = useMemo(() => {
    return suppliersReport.filter((s) => {
      if (fornecedoresSearch.trim()) {
        const query = fornecedoresSearch.toLowerCase();
        const matchTitle = s.title?.toLowerCase().includes(query);
        const matchSupplier = s.supplierName?.toLowerCase().includes(query);
        const matchCategory = s.category?.toLowerCase().includes(query);
        if (!matchTitle && !matchSupplier && !matchCategory) return false;
      }

      if (fornecedoresCategoryFilter !== "todos" && s.category !== fornecedoresCategoryFilter) {
        return false;
      }

      if (fornecedoresStatusFilter === "quitados" && !s.isCompleted) {
        return false;
      }
      if (fornecedoresStatusFilter === "pendentes" && s.isCompleted) {
        return false;
      }
      if (fornecedoresStatusFilter === "vencidos" && !s.hasOverdue) {
        return false;
      }

      return true;
    });
  }, [suppliersReport, fornecedoresSearch, fornecedoresCategoryFilter, fornecedoresStatusFilter]);

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
      <div className="flex items-center gap-2 border-b border-border pb-2 print:hidden overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("graficos")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "graficos"
              ? "bg-primary text-white shadow-xs"
              : "text-text-muted hover:text-text-title hover:bg-surface-subtle"
          }`}
        >
          <PieIcon size={15} />
          <span>Gráficos &amp; Raio-X Interativo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("dre")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "dre"
              ? "bg-primary text-white shadow-xs"
              : "text-text-muted hover:text-text-title hover:bg-surface-subtle"
          }`}
        >
          <FileSpreadsheet size={15} />
          <span>Visão Executiva &amp; DRE Sintético</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("passageiros")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "passageiros"
              ? "bg-primary text-white shadow-xs"
              : "text-text-muted hover:text-text-title hover:bg-surface-subtle"
          }`}
        >
          <Users size={15} />
          <span>Passageiros &amp; Recebimentos ({passengerReport.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("fornecedores")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "fornecedores"
              ? "bg-primary text-white shadow-xs"
              : "text-text-muted hover:text-text-title hover:bg-surface-subtle"
          }`}
        >
          <Building2 size={15} />
          <span>Fornecedores &amp; Contas a Pagar ({blocks.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* ABA 0: GRÁFICOS & RAIO-X INTERATIVO                      */}
      {/* ======================================================== */}
      {activeTab === "graficos" && (
        <ExcursionFinancialCharts
          excursionName={excursionName}
          passengerReport={passengerReport}
          suppliersReport={suppliersReport}
          addons={addons}
          blocks={blocks}
          rooms={rooms}
          slots={slots}
          profitMargin={profitMargin}
          summary={summary}
        />
      )}

      {/* ======================================================== */}
      {/* ABA 1: DRE SINTÉTICO E VISÃO EXECUTIVA */}
      {/* ======================================================== */}
      {(activeTab === "dre" || typeof window === "undefined") && (
        <div className="space-y-6">
          {/* Banner de atalho para os gráficos */}
          <div className="bg-gradient-to-r from-primary/10 via-tertiary/10 to-transparent p-4 rounded-2xl border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary text-white shadow-xs">
                <PieIcon size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-text-title">
                  Novo: Destrinchamento Visual e Raio-X de Entradas &amp; Saídas
                </h4>
                <p className="text-[11px] text-text-muted">
                  Veja gráficos interativos e clique em qualquer adicional, custo ou forma de pagamento para listar quem aderiu com lucro e custo individual.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("graficos")}
              className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
            >
              Abrir Gráficos &amp; Raio-X →
            </button>
          </div>
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
                          <button
                            type="button"
                            onClick={() => setPaymentModalPassenger(p)}
                            title="Clique para alterar status ou dar baixa nos pagamentos"
                            className="group inline-flex flex-col items-center gap-0.5 p-1 rounded-xl transition-all hover:bg-surface-subtle/80 border border-transparent hover:border-border cursor-pointer"
                          >
                            {p.status === "pago" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-status-success/15 text-status-success border border-status-success/30 group-hover:scale-105 transition-transform shadow-2xs">
                                <CheckCircle2 size={12} />
                                Quitado
                                <Pencil size={10} className="opacity-0 group-hover:opacity-80 transition-opacity ml-0.5" />
                              </span>
                            ) : p.status === "parcial" ? (
                              <div className="flex flex-col items-center">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-status-warning/15 text-status-warning border border-status-warning/30 group-hover:scale-105 transition-transform shadow-2xs">
                                  <Clock size={12} />
                                  Parcial
                                  <Pencil size={10} className="opacity-0 group-hover:opacity-80 transition-opacity ml-0.5" />
                                </span>
                                <span className="text-[10px] font-mono text-text-muted mt-0.5">
                                  {fmt(p.amountPaid)} / {fmt(p.packageFinalPrice)}
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-status-danger/15 text-status-danger border border-status-danger/30 group-hover:scale-105 transition-transform shadow-2xs">
                                <Clock size={12} />
                                Pendente
                                <Pencil size={10} className="opacity-0 group-hover:opacity-80 transition-opacity ml-0.5" />
                              </span>
                            )}
                          </button>
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
        <div className="space-y-5">
          {/* 1. Header do Relatório de Fornecedores */}
          <div className="bg-surface rounded-3xl border border-border p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
                  <Building2 size={18} />
                </span>
                <h3 className="text-base font-black text-text-title">
                  Contas a Pagar por Fornecedor & Cronograma de Prazos
                </h3>
              </div>
              <p className="text-xs text-text-muted mt-1">
                Acompanhe todos os prazos negociados nos cards do pacote, controle múltiplos vencimentos por fornecedor e marque liquidações realizadas.
              </p>
            </div>

            {/* Alternador de Visualização: Cards vs Tabela */}
            <div className="flex items-center gap-1.5 p-1 bg-surface-subtle rounded-2xl border border-border/80 self-start md:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setFornecedoresViewMode("cards")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  fornecedoresViewMode === "cards"
                    ? "bg-primary text-white shadow-xs"
                    : "text-text-muted hover:text-text-title hover:bg-surface/80"
                }`}
              >
                <LayoutGrid size={14} />
                <span>Visualização em Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setFornecedoresViewMode("tabela")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  fornecedoresViewMode === "tabela"
                    ? "bg-primary text-white shadow-xs"
                    : "text-text-muted hover:text-text-title hover:bg-surface/80"
                }`}
              >
                <ListFilter size={14} />
                <span>Tabela Sintética</span>
              </button>
            </div>
          </div>

          {/* 2. Grid de Métricas Gerais de Contas a Pagar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-surface rounded-2xl border border-border p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                Total Negociado
              </span>
              <span className="text-xl font-black text-text-title font-mono block mt-1">
                {fmt(suppliersTotals.totalCost)}
              </span>
              <span className="text-xs text-text-muted mt-0.5 block">
                {suppliersReport.length} fornecedores contratados
              </span>
            </div>

            <div className="bg-surface rounded-2xl border border-border p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                Total Pago / Liquidado
              </span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono block mt-1">
                {fmt(suppliersTotals.totalPaid)}
              </span>
              <span className="text-xs text-text-muted mt-0.5 block">
                {suppliersTotals.totalCost > 0
                  ? `${Math.round((suppliersTotals.totalPaid / suppliersTotals.totalCost) * 100)}% do custo total quitado`
                  : "0% quitado"}
              </span>
            </div>

            <div className="bg-surface rounded-2xl border border-border p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                Saldo Pendente a Pagar
              </span>
              <span className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono block mt-1">
                {fmt(suppliersTotals.balanceToPay)}
              </span>
              <span className="text-xs text-text-muted mt-0.5 block">
                {suppliersTotals.balanceToPay === 0 ? "✓ 100% dos fornecedores quitados" : "Aguardando liquidação"}
              </span>
            </div>

            <div className="bg-surface rounded-2xl border border-border p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                  Prazos Quitados
                </span>
                {suppliersTotals.overdueDeadlines > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-600 border border-rose-500/30">
                    {suppliersTotals.overdueDeadlines} vencidos
                  </span>
                )}
              </div>
              <span className="text-xl font-black text-text-title font-mono block mt-1">
                {suppliersTotals.paidDeadlines} <span className="text-sm font-semibold text-text-muted">/ {suppliersTotals.totalDeadlines} prazos</span>
              </span>
              <span className="text-xs text-text-muted mt-0.5 block">
                {suppliersTotals.totalDeadlines > 0
                  ? `${Math.round((suppliersTotals.paidDeadlines / suppliersTotals.totalDeadlines) * 100)}% das parcelas pagas`
                  : "Nenhum prazo cadastrado"}
              </span>
            </div>
          </div>

          {/* 3. Barra de Filtros e Busca */}
          <div className="bg-surface rounded-2xl border border-border p-3.5 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Buscar por fornecedor, serviço ou categoria..."
                value={fornecedoresSearch}
                onChange={(e) => setFornecedoresSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-border bg-surface-subtle text-xs text-text-title placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
              {fornecedoresSearch && (
                <button
                  type="button"
                  onClick={() => setFornecedoresSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-title text-xs font-bold"
                >
                  ×
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              {/* Filtro de Status */}
              <div className="flex items-center gap-1 p-1 bg-surface-subtle rounded-xl border border-border/80 text-xs shrink-0">
                {(
                  [
                    { id: "todos", label: "Todos" },
                    { id: "pendentes", label: "Pendentes" },
                    { id: "quitados", label: "Quitados" },
                    { id: "vencidos", label: "Com Vencidos" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFornecedoresStatusFilter(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      fornecedoresStatusFilter === f.id
                        ? "bg-surface text-primary shadow-2xs font-bold"
                        : "text-text-muted hover:text-text-title"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Filtro de Categoria */}
              <select
                value={fornecedoresCategoryFilter}
                onChange={(e) => setFornecedoresCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-border bg-surface-subtle text-xs font-semibold text-text-body focus:outline-none focus:border-primary cursor-pointer shrink-0"
              >
                <option value="todos">Todas as Categorias</option>
                <option value="aereo">Transporte Aéreo</option>
                <option value="hospedagem">Hospedagem</option>
                <option value="rodoviario">Transporte Rodoviário</option>
                <option value="guias">Guias & Monitores</option>
                <option value="personalizados">Personalizados / Brindes</option>
              </select>
            </div>
          </div>

          {/* 4. MODO CARDS: Visualização em Cards com Prazos e Checkbox de Pago */}
          {fornecedoresViewMode === "cards" && (
            <div>
              {filteredSuppliers.length === 0 ? (
                <div className="bg-surface rounded-3xl border border-border p-12 text-center space-y-2">
                  <Building2 size={32} className="mx-auto text-text-muted opacity-40" />
                  <h4 className="text-sm font-bold text-text-title">Nenhum fornecedor encontrado</h4>
                  <p className="text-xs text-text-muted max-w-sm mx-auto">
                    Não foram encontrados fornecedores com os termos de busca ou filtros selecionados.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5 items-stretch">
                  {filteredSuppliers.map((s) => {
                    const isAereo = s.category === "aereo";
                    const isHotel = s.category === "hospedagem";
                    const isBus = s.category === "rodoviario";
                    const isGuias = s.category === "guias";
                    const isBrindes = s.category === "personalizados";

                    const badgeColor = isAereo
                      ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
                      : isHotel
                      ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
                      : isBus
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                      : isGuias
                      ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
                      : isBrindes
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";

                    return (
                      <div
                        key={s.blockId}
                        className="bg-surface rounded-3xl border border-border hover:border-primary/40 transition-all p-5 shadow-xs flex flex-col justify-between space-y-4"
                      >
                        {/* Topo do Card: Categoria, Título e Fornecedor */}
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${badgeColor}`}
                              >
                                {isAereo ? (
                                  <Plane size={17} />
                                ) : isHotel ? (
                                  <Building2 size={17} />
                                ) : isBus ? (
                                  <Bus size={17} />
                                ) : isGuias ? (
                                  <Users size={17} />
                                ) : isBrindes ? (
                                  <Sparkles size={17} />
                                ) : (
                                  <Package size={17} />
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted block truncate">
                                  {isAereo
                                    ? "Transporte Aéreo"
                                    : isHotel
                                    ? "Hospedagem"
                                    : isBus
                                    ? "Transporte Rodoviário"
                                    : isGuias
                                    ? "Guias e Monitores"
                                    : isBrindes
                                    ? "Personalizados / Brindes"
                                    : "Serviço"}
                                </span>
                                <h4 className="text-sm font-black text-text-title truncate" title={s.title}>
                                  {s.title}
                                </h4>
                              </div>
                            </div>

                            {/* Badge Geral de Status do Fornecedor */}
                            <div className="shrink-0">
                              {s.isCompleted ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                  <CheckCircle2 size={12} />
                                  <span>Quitado</span>
                                </span>
                              ) : s.hasOverdue ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
                                  <AlertCircle size={12} />
                                  <span>Vencido</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                  <Clock size={12} />
                                  <span>Pendente</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Nome do Fornecedor em Destaque */}
                          <div className="flex items-center justify-between text-xs px-1">
                            <span className="text-text-muted font-medium">Fornecedor Contratado:</span>
                            <span className="font-extrabold text-primary text-sm truncate max-w-[200px]" title={s.supplierName}>
                              {s.supplierName}
                            </span>
                          </div>

                          {/* Grid Financeiro do Card */}
                          <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-surface-subtle/80 border border-border/80 text-xs">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-text-muted block">
                                Custo Total
                              </span>
                              <span className="font-mono font-black text-text-title text-xs sm:text-sm mt-0.5 block truncate">
                                {fmt(s.totalCost)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
                                Liquidado
                              </span>
                              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm mt-0.5 block truncate">
                                {fmt(s.totalPaid)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block">
                                Saldo
                              </span>
                              <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-xs sm:text-sm mt-0.5 block truncate">
                                {fmt(s.balanceToPay)}
                              </span>
                            </div>
                          </div>

                          {/* Barra de Progresso de Quitação */}
                          <div className="space-y-1 px-1">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-text-muted">
                              <span>Progresso da Liquidação</span>
                              <span className="font-mono font-bold text-text-title">{s.percentPaid}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-surface-subtle overflow-hidden border border-border/80">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  s.isCompleted
                                    ? "bg-emerald-500"
                                    : s.percentPaid > 50
                                    ? "bg-primary"
                                    : "bg-amber-500"
                                }`}
                                style={{ width: `${Math.max(0, Math.min(100, s.percentPaid))}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Seção Central: Todos os Prazos do Card do Pacote com Checkbox de Pago */}
                        <div className="space-y-2 border-t border-border/70 pt-3">
                          <div className="flex items-center justify-between text-xs px-1">
                            <span className="flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider text-text-muted">
                              <Calendar size={13} className="text-primary" />
                              Prazos & Parcelas ({s.deadlines.length})
                            </span>
                            {s.deadlines.filter((d) => d.pago).length > 0 && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold">
                                {s.deadlines.filter((d) => d.pago).length} de {s.deadlines.length} quitados
                              </span>
                            )}
                          </div>

                          {s.deadlines.length === 0 ? (
                            <div className="p-3.5 rounded-2xl bg-surface-subtle/50 border border-border text-center text-xs text-text-muted">
                              Nenhum prazo limite registrado para este bloco no pacote.
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                              {s.deadlines.map((dl) => (
                                <div
                                  key={dl.id}
                                  className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2.5 text-xs transition-all ${
                                    dl.pago
                                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100"
                                      : dl.isOverdue
                                      ? "bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100"
                                      : "bg-surface-subtle/80 border-border text-text-body hover:border-primary/40"
                                  }`}
                                >
                                  {/* Checkbox e Detalhes do Prazo */}
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleToggleDeadline({
                                          blockId: s.blockId,
                                          deadlineType: dl.type,
                                          prazoId: dl.prazoId,
                                          paid: !dl.pago,
                                        })
                                      }
                                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
                                        dl.pago
                                          ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs"
                                          : "bg-surface border-border hover:border-primary text-transparent"
                                      }`}
                                      title={dl.pago ? "Clique para desmarcar pagamento" : "Clique para marcar como pago"}
                                    >
                                      <Check size={13} className={dl.pago ? "opacity-100" : "opacity-0"} />
                                    </button>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span
                                          className={`font-bold truncate text-xs ${
                                            dl.pago ? "line-through opacity-70" : "text-text-title"
                                          }`}
                                          title={dl.label}
                                        >
                                          {dl.label}
                                        </span>
                                        {dl.pago ? (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-600 text-white tracking-wider">
                                            PAGO
                                          </span>
                                        ) : dl.isOverdue ? (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-rose-600 text-white tracking-wider animate-pulse">
                                            VENCIDO
                                          </span>
                                        ) : (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 tracking-wider">
                                            A VENCER
                                          </span>
                                        )}
                                      </div>

                                      <div className="text-[11px] text-text-muted mt-0.5 flex items-center gap-2 flex-wrap font-mono">
                                        <span>
                                          Vencimento: <strong className="text-text-title font-bold">{fmtDate(dl.data)}</strong>
                                        </span>
                                        {dl.valor !== undefined && dl.valor > 0 && (
                                          <span>
                                            • Valor: <strong className="text-text-title font-bold">{fmt(dl.valor)}</strong>
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Botão Rápido de Ação */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleToggleDeadline({
                                        blockId: s.blockId,
                                        deadlineType: dl.type,
                                        prazoId: dl.prazoId,
                                        paid: !dl.pago,
                                      })
                                    }
                                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                                      dl.pago
                                        ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600/25 border border-emerald-500/30"
                                        : "bg-surface hover:bg-emerald-600 hover:text-white border border-border text-text-title shadow-2xs"
                                    }`}
                                  >
                                    {dl.pago ? "✓ Pago" : "Pagar"}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Rodapé do Card: Metadados Operacionais adicionais */}
                        {s.rawBlock?.data?.localizador && (
                          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-text-muted">
                            <span>Localizador / Reserva:</span>
                            <span className="font-mono font-bold text-text-title px-2 py-0.5 rounded-md bg-surface-subtle border border-border">
                              {s.rawBlock.data.localizador}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 5. MODO TABELA: Visualização em Tabela com Prazos e Checkbox */}
          {fornecedoresViewMode === "tabela" && (
            <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-surface-subtle/80 border-b border-border text-[11px] font-bold text-text-muted uppercase tracking-wider">
                      <th className="py-3 px-4">Bloco / Serviço</th>
                      <th className="py-3 px-4">Fornecedor Contratado</th>
                      <th className="py-3 px-3 text-right">Custo Total</th>
                      <th className="py-3 px-3 text-right">Já Liquidado</th>
                      <th className="py-3 px-4 text-center">Todos os Prazos & Parcelas</th>
                      <th className="py-3 px-4 text-right">Saldo a Pagar</th>
                      <th className="py-3 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredSuppliers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-text-muted text-xs">
                          Nenhum fornecedor encontrado com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredSuppliers.map((s) => (
                        <tr key={s.blockId} className="hover:bg-surface-subtle/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-text-title">
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

                          <td className="py-3.5 px-4 text-text-body font-semibold">
                            {s.supplierName}
                          </td>

                          <td className="py-3.5 px-3 text-right font-mono font-bold text-text-title">
                            {fmt(s.totalCost)}
                          </td>

                          <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {fmt(s.totalPaid)}
                          </td>

                          {/* Prazos da Tabela com Checkbox Rápido */}
                          <td className="py-3 px-4 text-left">
                            {s.deadlines.length === 0 ? (
                              <span className="text-text-muted text-[11px] italic">Sem prazos definidos</span>
                            ) : (
                              <div className="flex flex-col gap-1.5">
                                {s.deadlines.map((dl) => (
                                  <div
                                    key={dl.id}
                                    className={`inline-flex items-center justify-between gap-2 px-2.5 py-1 rounded-xl border text-[11px] font-medium ${
                                      dl.pago
                                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                                        : dl.isOverdue
                                        ? "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200"
                                        : "bg-surface-subtle border-border text-text-body"
                                    }`}
                                  >
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={dl.pago}
                                        onChange={() =>
                                          handleToggleDeadline({
                                            blockId: s.blockId,
                                            deadlineType: dl.type,
                                            prazoId: dl.prazoId,
                                            paid: !dl.pago,
                                          })
                                        }
                                        className="w-3.5 h-3.5 rounded accent-emerald-600 cursor-pointer"
                                      />
                                      <span className={dl.pago ? "line-through opacity-70" : "font-bold"}>
                                        {dl.label}:
                                      </span>
                                      <span className="font-mono">{fmtDate(dl.data)}</span>
                                      {dl.valor !== undefined && dl.valor > 0 && (
                                        <span className="font-mono font-bold">({fmt(dl.valor)})</span>
                                      )}
                                    </label>

                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
                                        dl.pago
                                          ? "bg-emerald-600 text-white"
                                          : dl.isOverdue
                                          ? "bg-rose-600 text-white"
                                          : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                      }`}
                                    >
                                      {dl.pago ? "PAGO" : dl.isOverdue ? "VENCIDO" : "PENDENTE"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                            {fmt(s.balanceToPay)}
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            {s.isCompleted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                                <CheckCircle2 size={11} />
                                Quitado
                              </span>
                            ) : s.hasOverdue ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-600 border border-rose-500/30">
                                <AlertCircle size={11} />
                                Vencido
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
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
                      <td colSpan={2} className="py-3.5 px-4 text-right text-text-muted uppercase text-[11px]">
                        Totais Fornecedores ({filteredSuppliers.length} itens):
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-text-title font-black text-sm">
                        {fmt(filteredSuppliers.reduce((sum, s) => sum + s.totalCost, 0))}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-black text-sm">
                        {fmt(filteredSuppliers.reduce((sum, s) => sum + s.totalPaid, 0))}
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs font-semibold text-text-muted">
                        {filteredSuppliers.reduce((sum, s) => sum + s.deadlines.filter((dl) => dl.pago).length, 0)} de{" "}
                        {filteredSuppliers.reduce((sum, s) => sum + s.deadlines.length, 0)} prazos quitados
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-rose-600 dark:text-rose-400 font-black text-sm">
                        {fmt(filteredSuppliers.reduce((sum, s) => sum + s.balanceToPay, 0))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Gerenciamento de Status e Pagamentos do Passageiro */}
      {paymentModalPassenger && (
        <PassengerPaymentModal
          open={!!paymentModalPassenger}
          onClose={() => setPaymentModalPassenger(null)}
          passenger={paymentModalPassenger}
          onSavePayment={handleSavePassengerPayment}
        />
      )}
    </div>
  );
}
