"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  User,
  Package,
  Receipt,
  Users,
  Search,
  BedDouble,
  Building2,
  Plane,
  Bus,
  Compass,
  CheckCircle2,
  Sparkles,
  Coins,
  CreditCard,
  Percent,
} from "lucide-react";
import type { ExcursionAddon, RoomTypePricing } from "@/lib/actions/addons";
import type { EditorBlock } from "@/lib/editor-types";
import type { RoomGuest, RoomEntry } from "./RoomListView";
import {
  getGuestAgeBracket,
  getGuestAge,
  getBlockUnitPriceForTier,
  type AgeBracket,
  parseNum,
} from "@/lib/package-calc";

interface CheckoutViewProps {
  guests: RoomGuest[];
  rooms: RoomEntry[];
  blocks?: EditorBlock[];
  addons: ExcursionAddon[];
  totalBaseCostPerPerson: number;
  profitMargin: number;
  slots: number;
  isSimulationActive?: boolean;
  periodStart?: string | null;
  roomPricing?: Record<string, RoomTypePricing>;
  guestPaymentModes?: Record<string, "vista" | "prazo">;
  onUpdateCheckoutConfig?: (config: {
    roomPricing?: Record<string, RoomTypePricing>;
    guestPaymentModes?: Record<string, "vista" | "prazo">;
    profitMargin?: number;
  }) => void;
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function getCategoryIcon(categoryId: string) {
  switch (categoryId) {
    case "aereo":
      return <Plane size={13} className="text-sky-500 shrink-0" />;
    case "hospedagem":
      return <Building2 size={13} className="text-amber-500 shrink-0" />;
    case "rodoviario":
      return <Bus size={13} className="text-indigo-500 shrink-0" />;
    case "guias":
      return <Compass size={13} className="text-emerald-500 shrink-0" />;
    case "servicos_inclusos":
    case "itens_inclusos":
      return <CheckCircle2 size={13} className="text-teal-500 shrink-0" />;
    default:
      return <Package size={13} className="text-primary shrink-0" />;
  }
}

export function CheckoutView({
  guests,
  rooms,
  blocks = [],
  addons,
  totalBaseCostPerPerson,
  profitMargin,
  slots,
  isSimulationActive = false,
  periodStart = null,
  roomPricing = {},
  guestPaymentModes = {},
  onUpdateCheckoutConfig,
}: CheckoutViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [tempMargin, setTempMargin] = useState(String(profitMargin || 0));

  // 1. Custo Base do Adulto (sempre a referência de cálculo)
  const adultBaseCost = useMemo(() => {
    const sum = blocks.reduce((acc, b) => {
      return acc + getBlockUnitPriceForTier(b, "adulto", slots || 20);
    }, 0);
    return sum > 0 ? sum : totalBaseCostPerPerson;
  }, [blocks, slots, totalBaseCostPerPerson]);

  const marginNum = Number(profitMargin) || 0;
  const suggestedProfitAdult = adultBaseCost * (marginNum / 100);
  const suggestedPriceAdult = adultBaseCost + suggestedProfitAdult;

  // 2. Detecção automática de todos os tipos de quarto configurados nos cards de hospedagem
  const detectedRoomTypes = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number }>();

    for (const b of blocks) {
      if (b.categoryId === "hospedagem") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hRooms = (b.data as any)?.rooms || [];
        for (const hr of hRooms) {
          const raw = hr?.tipo?.trim();
          if (raw) {
            const key = raw.toLowerCase();
            if (!map.has(key)) {
              map.set(key, { key, label: raw, count: 0 });
            }
          }
        }
      }
    }

    for (const r of rooms) {
      const raw = r?.tipo?.trim();
      if (raw) {
        const key = raw.toLowerCase();
        const guestCount = (r.hospedes || []).length;
        const existing = map.get(key);
        if (existing) {
          existing.count += guestCount;
        } else {
          map.set(key, { key, label: raw, count: guestCount });
        }
      }
    }

    if (map.size === 0) {
      map.set("duplo", { key: "duplo", label: "Duplo", count: 0 });
    }

    return Array.from(map.values());
  }, [blocks, rooms]);

  // Mapa de quarto por hóspede
  const guestRoomMap = useMemo(() => {
    const map: Record<string, { roomNumber: string; roomType: string }> = {};
    for (const r of rooms) {
      for (const g of r.hospedes) {
        map[g.id] = {
          roomNumber: r.numero || "Quarto",
          roomType: r.tipo || "Duplo",
        };
      }
    }
    return map;
  }, [rooms]);

  // Auxiliar para obter a precificação configurada de um tipo de quarto
  const getPricingForRoomType = (roomTypeRaw: string): RoomTypePricing => {
    const key = (roomTypeRaw || "duplo").trim().toLowerCase();
    const found = roomPricing[key] || roomPricing[roomTypeRaw];
    if (found && found.cashPrice > 0) {
      return found;
    }
    // Valor padrão baseado no preço sugerido para adulto
    return {
      cashPrice: suggestedPriceAdult > 0 ? Math.round(suggestedPriceAdult) : Math.round(adultBaseCost),
      installmentExtra: found?.installmentExtra ?? 0,
      cardFee: found?.cardFee ?? 0,
    };
  };

  // Handlers de configuração
  const handleMarginChange = (val: number) => {
    setTempMargin(String(val));
    onUpdateCheckoutConfig?.({ profitMargin: val });
  };

  const handleRoomPriceChange = (
    roomKey: string,
    field: "cashPrice" | "installmentExtra" | "cardFee",
    value: number
  ) => {
    const current = getPricingForRoomType(roomKey);
    const updated = {
      ...current,
      [field]: Math.max(0, value),
    };
    const nextPricing = {
      ...roomPricing,
      [roomKey.toLowerCase()]: updated,
    };
    onUpdateCheckoutConfig?.({ roomPricing: nextPricing });
  };

  const handleApplySuggested = (roomKey: string) => {
    const rounded = Math.round(suggestedPriceAdult);
    handleRoomPriceChange(roomKey, "cashPrice", rounded);
  };

  const handleTogglePaymentMode = (guestId: string, mode: "vista" | "prazo") => {
    const nextModes = {
      ...guestPaymentModes,
      [guestId]: mode,
    };
    onUpdateCheckoutConfig?.({ guestPaymentModes: nextModes });
  };

  // 3. Cálculos individuais para cada passageiro
  const passengerCalculations = guests.map((guest) => {
    const ageBracket: AgeBracket = getGuestAgeBracket(guest, periodStart);
    const guestAge = getGuestAge(guest, periodStart);
    const guestRoom = guestRoomMap[guest.id];
    const roomType = guestRoom?.roomType || "Duplo";
    const pricing = getPricingForRoomType(roomType);
    const paymentMode: "vista" | "prazo" = guestPaymentModes[guest.id] || "vista";

    // Valores discriminados dos blocos para a idade deste hóspede
    const blockBreakdown = blocks.map((b) => {
      const unitCost = getBlockUnitPriceForTier(b, ageBracket, slots || 20);
      return {
        id: b.id,
        title: b.title || "Item do Pacote",
        categoryId: b.categoryId,
        cost: unitCost,
      };
    });

    const guestBaseCost = blockBreakdown.reduce((sum, item) => sum + item.cost, 0);

    // Preço do pacote base (fixo por quarto, independentemente da faixa etária)
    const baseRoomCashPrice = pricing.cashPrice;
    const isPrazo = paymentMode === "prazo";
    const guestPackagePrice = isPrazo
      ? baseRoomCashPrice + pricing.installmentExtra
      : baseRoomCashPrice;

    // Custos efetivos: custos da idade + taxa de cartão se a prazo
    const cardFeeApplied = isPrazo ? pricing.cardFee : 0;
    const guestEffectiveCost = guestBaseCost + cardFeeApplied;

    // Lucro da agência:
    // À vista: Preço Quarto - Custos da Idade
    // A prazo: (Preço Quarto + Extra) - (Custos da Idade + Taxa Cartão)
    const guestProfitTotal = Math.max(0, guestPackagePrice - guestEffectiveCost);
    const extraPrazoLucro = isPrazo ? pricing.installmentExtra - pricing.cardFee : 0;

    // Adicionais contratados
    const guestAddons = addons.filter((a) => a.assignedGuestIds?.includes(guest.id));
    const totalGuestAddons = guestAddons.reduce((sum, a) => sum + (a.price || 0), 0);
    const guestTotalPrice = guestPackagePrice + totalGuestAddons;

    return {
      guest,
      ageBracket,
      guestAge,
      guestRoom,
      roomType,
      pricing,
      paymentMode,
      blockBreakdown,
      guestBaseCost,
      cardFeeApplied,
      guestEffectiveCost,
      guestPackagePrice,
      guestProfitTotal,
      extraPrazoLucro,
      guestAddons,
      totalGuestAddons,
      guestTotalPrice,
    };
  });

  // 4. Totais consolidados
  let grandTotalAereo = 0;
  let grandTotalHospedagem = 0;
  let grandTotalRodoviario = 0;
  let grandTotalOutros = 0;
  let grandTotalCardFees = 0;
  let grandTotalLucroAgencia = 0;
  let grandTotalBasePackages = 0;
  let grandTotalAddons = 0;
  let grandTotalGeral = 0;

  for (const p of passengerCalculations) {
    for (const b of p.blockBreakdown) {
      if (b.categoryId === "aereo") grandTotalAereo += b.cost;
      else if (b.categoryId === "hospedagem") grandTotalHospedagem += b.cost;
      else if (b.categoryId === "rodoviario") grandTotalRodoviario += b.cost;
      else grandTotalOutros += b.cost;
    }
    grandTotalCardFees += p.cardFeeApplied;
    grandTotalLucroAgencia += p.guestProfitTotal;
    grandTotalBasePackages += p.guestPackagePrice;
    grandTotalAddons += p.totalGuestAddons;
    grandTotalGeral += p.guestTotalPrice;
  }

  // Filtragem de passageiros para busca
  const filteredPassengers = passengerCalculations.filter((p) =>
    searchTerm
      ? p.guest.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.guest.documento.includes(searchTerm)
      : true
  );

  return (
    <div className="space-y-6">
      {/* 1. TOPO: Painel de Precificação e Margem Sugerida */}
      <div className="bg-surface rounded-2xl border border-border shadow-shadow-card p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 text-primary mb-1">
              <Receipt size={22} />
              <h2 className="text-xl font-bold text-text-title">
                Checkout &amp; Precificação por Quarto
              </h2>
              {isSimulationActive && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-status-success/15 text-status-success flex items-center gap-1 border border-status-success/30">
                  ⚡ Simulação ativa ({slots} vagas)
                </span>
              )}
            </div>
            <p className="text-sm text-text-muted max-w-2xl leading-relaxed">
              Estime a porcentagem de margem sugerida baseada no custo de um <strong>adulto</strong> e configure o valor de venda de cada tipo de quarto configurado na hospedagem.
            </p>
          </div>

          {/* Controle da Margem Sugerida */}
          <div className="bg-surface-subtle border border-border p-3.5 rounded-2xl flex items-center gap-3 shrink-0">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Percent size={20} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                Margem Sugerida (Base Adulto)
              </span>
              <div className="flex items-center gap-2 mt-1">
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={tempMargin}
                    onChange={(e) => setTempMargin(e.target.value)}
                    onBlur={() => handleMarginChange(parseNum(tempMargin))}
                    onKeyDown={(e) => e.key === "Enter" && handleMarginChange(parseNum(tempMargin))}
                    className="w-20 px-2 py-1 text-sm font-bold bg-surface border border-primary rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-text-title tabular-nums"
                  />
                  <span className="ml-1 text-xs font-bold text-text-muted">%</span>
                </div>
                <div className="flex items-center gap-1">
                  {[10, 15, 20, 30].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleMarginChange(pct)}
                      className={`px-2 py-0.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                        marginNum === pct
                          ? "bg-primary text-white"
                          : "bg-surface border border-border hover:border-primary text-text-body"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Métricas da Sugestão Base Adulto */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-1">
          <div className="bg-surface-subtle p-3.5 rounded-xl border border-border/70">
            <span className="text-[11px] font-semibold text-text-muted uppercase block">
              Custo Estimado Base / Adulto
            </span>
            <span className="text-base font-bold text-text-title mt-0.5 block">
              {fmt(adultBaseCost)}
            </span>
          </div>

          <div className="bg-surface-subtle p-3.5 rounded-xl border border-border/70">
            <span className="text-[11px] font-semibold text-text-muted uppercase block">
              Lucro Sugerido ({marginNum}%)
            </span>
            <span className="text-base font-bold text-status-success mt-0.5 block">
              +{fmt(suggestedProfitAdult)}
            </span>
          </div>

          <div className="bg-primary/5 p-3.5 rounded-xl border border-primary/20 col-span-2 md:col-span-1">
            <span className="text-[11px] font-bold text-primary uppercase block">
              Preço Sugerido / Adulto
            </span>
            <span className="text-base font-black text-primary mt-0.5 block">
              {fmt(suggestedPriceAdult)}
            </span>
          </div>
        </div>

        {/* 2. CONFIGURAÇÃO DOS QUARTOS CONFIGURADOS NA HOSPEDAGEM */}
        <div className="space-y-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BedDouble size={18} className="text-primary" />
              <h3 className="text-sm font-bold text-text-title uppercase tracking-wide">
                Configuração de Valores por Tipo de Quarto ({detectedRoomTypes.length})
              </h3>
            </div>
            <span className="text-xs text-text-muted">
              Valores fixos por passageiro no quarto ocupado
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {detectedRoomTypes.map((rt) => {
              const pricing = getPricingForRoomType(rt.key);
              const extraLucroPrazo = pricing.installmentExtra - pricing.cardFee;

              return (
                <div
                  key={rt.key}
                  className="bg-surface-subtle p-4 rounded-2xl border border-border/80 space-y-3 hover:border-primary/40 transition-all shadow-sm"
                >
                  {/* Cabeçalho do Quarto */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                        <BedDouble size={16} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-text-title capitalize">
                          Quarto {rt.label}
                        </h4>
                        <span className="text-[11px] text-text-muted block">
                          {rt.count} {rt.count === 1 ? "passageiro alocado" : "passageiros alocados"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApplySuggested(rt.key)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all cursor-pointer"
                      title="Preenche o valor à vista com o preço sugerido do adulto"
                    >
                      <Sparkles size={12} />
                      <span>Sugerido ({fmt(Math.round(suggestedPriceAdult))})</span>
                    </button>
                  </div>

                  {/* 3 Campos: À Vista, Acréscimo a Prazo, Taxa Cartão */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    {/* 1. Valor Base (À Vista) */}
                    <div>
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                        Valor (À Vista)
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-xs font-bold text-text-muted">R$</span>
                        <input
                          type="number"
                          step="1"
                          placeholder={Math.round(suggestedPriceAdult).toFixed(2)}
                          value={pricing.cashPrice || ""}
                          onChange={(e) =>
                            handleRoomPriceChange(rt.key, "cashPrice", parseNum(e.target.value))
                          }
                          className="w-full pl-8 pr-2 py-1.5 text-sm font-bold bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-text-title tabular-nums"
                        />
                      </div>
                      <span className="text-[10px] text-text-muted mt-0.5 block">
                        Base por pessoa
                      </span>
                    </div>

                    {/* 2. Acréscimo a Prazo */}
                    <div>
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                        Acréscimo Prazo
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-xs font-bold text-text-muted">R$</span>
                        <input
                          type="number"
                          step="1"
                          placeholder="0.00"
                          value={pricing.installmentExtra || ""}
                          onChange={(e) =>
                            handleRoomPriceChange(rt.key, "installmentExtra", parseNum(e.target.value))
                          }
                          className="w-full pl-8 pr-2 py-1.5 text-sm font-bold bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-text-title tabular-nums"
                        />
                      </div>
                      <span className="text-[10px] text-primary font-semibold mt-0.5 block">
                        Total: {fmt(pricing.cashPrice + pricing.installmentExtra)}
                      </span>
                    </div>

                    {/* 3. Taxa do Cartão */}
                    <div>
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                        Taxa Cartão
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-xs font-bold text-text-muted">R$</span>
                        <input
                          type="number"
                          step="1"
                          placeholder="0.00"
                          value={pricing.cardFee || ""}
                          onChange={(e) =>
                            handleRoomPriceChange(rt.key, "cardFee", parseNum(e.target.value))
                          }
                          className="w-full pl-8 pr-2 py-1.5 text-sm font-bold bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-text-title tabular-nums"
                        />
                      </div>
                      <span className="text-[10px] text-status-success font-semibold mt-0.5 block">
                        Extra prazo: +{fmt(extraLucroPrazo)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. FILTRO E CONTADOR DE PASSAGEIROS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-primary" />
          <h3 className="font-bold text-text-title text-sm">
            Passageiros na Room List ({guests.length})
          </h3>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou documento..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border bg-surface text-xs text-text-body placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Search size={14} className="absolute left-2.5 top-2.5 text-text-muted pointer-events-none" />
        </div>
      </div>

      {/* ESTADO VAZIO */}
      {guests.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-dashed border-border p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-surface-subtle flex items-center justify-center mx-auto text-text-muted">
            <Users size={24} />
          </div>
          <h4 className="text-sm font-bold text-text-title">
            Nenhum passageiro encontrado na Room List
          </h4>
          <p className="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
            Acesse a aba <strong>Room List</strong> e aloque os hóspedes nos quartos para visualizar os cálculos individuais de cada quarto e faixa etária.
          </p>
        </div>
      ) : (
        /* 4. GRID DE CARDS DOS PASSAGEIROS */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPassengers.map((p, idx) => {
            const {
              guest,
              ageBracket,
              guestAge,
              guestRoom,
              roomType,
              pricing,
              paymentMode,
              blockBreakdown,
              guestBaseCost,
              cardFeeApplied,
              guestPackagePrice,
              guestProfitTotal,
              guestAddons,
              guestTotalPrice,
            } = p;

            const bracketLabel =
              ageBracket === "bebe"
                ? `Bebê / Colo ${guestAge !== null ? `(${guestAge}a)` : ""}`
                : ageBracket === "crianca"
                ? `Criança ${guestAge !== null ? `(${guestAge}a)` : ""}`
                : `Adulto ${guestAge !== null ? `(${guestAge}a)` : ""}`;

            const isPrazo = paymentMode === "prazo";

            return (
              <motion.div
                key={guest.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className="bg-surface rounded-2xl border border-border shadow-shadow-card p-5 space-y-4 hover:shadow-shadow-hover transition-all flex flex-col justify-between"
              >
                {/* Header do Passageiro */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      <User size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-text-title leading-snug">
                        {guest.nome || "Hóspede sem nome"}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5 flex-wrap">
                        {guest.documento && <span>Doc: {guest.documento}</span>}
                        <span>·</span>
                        <span className="font-semibold text-text-title">{bracketLabel}</span>
                      </div>
                    </div>
                  </div>

                  {guestRoom && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-surface-subtle border border-border text-text-muted shrink-0 flex items-center gap-1">
                      <BedDouble size={12} className="text-primary" />
                      <span>
                        {guestRoom.roomNumber} ({guestRoom.roomType})
                      </span>
                    </span>
                  )}
                </div>

                {/* Seletor Toggle À Vista / A Prazo */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-surface-subtle/80 border border-border/80">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-text-title">
                    <CreditCard size={14} className="text-primary" />
                    <span>Pagamento:</span>
                  </div>

                  <div className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => handleTogglePaymentMode(guest.id, "vista")}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        !isPrazo
                          ? "bg-primary text-white shadow-sm"
                          : "text-text-muted hover:text-text-title"
                      }`}
                    >
                      💵 À Vista ({fmt(pricing.cashPrice)})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTogglePaymentMode(guest.id, "prazo")}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        isPrazo
                          ? "bg-primary text-white shadow-sm"
                          : "text-text-muted hover:text-text-title"
                      }`}
                    >
                      💳 A Prazo ({fmt(pricing.cashPrice + pricing.installmentExtra)})
                    </button>
                  </div>
                </div>

                {/* Discriminação de TODOS os Blocos Individuais */}
                <div className="space-y-2 pt-1 border-t border-border/70 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-text-muted uppercase tracking-wide block">
                      Valores Discriminados por Bloco ({ageBracket}):
                    </span>
                    <span className="text-[10px] text-text-muted">
                      Tarifas da idade aplicada
                    </span>
                  </div>

                  <div className="space-y-1 bg-surface-subtle/60 rounded-xl p-2.5 border border-border/60">
                    {blockBreakdown.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-0.5 text-text-body"
                      >
                        <div className="flex items-center gap-1.5 truncate pr-2">
                          {getCategoryIcon(item.categoryId)}
                          <span className="truncate">{item.title}</span>
                        </div>
                        <span className="font-semibold text-text-title tabular-nums shrink-0">
                          {fmt(item.cost)}
                        </span>
                      </div>
                    ))}

                    {/* Subtotal Custos Base do Passageiro */}
                    <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-border/50 font-semibold text-text-muted">
                      <span>Subtotal Custos Base ({ageBracket})</span>
                      <span className="text-text-title">{fmt(guestBaseCost)}</span>
                    </div>

                    {/* Taxa de Cartão se a prazo */}
                    {isPrazo && pricing.cardFee > 0 && (
                      <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 font-semibold text-xs">
                        <span>+ Taxa do Cartão (Custo Operadora)</span>
                        <span>+{fmt(pricing.cardFee)}</span>
                      </div>
                    )}

                    {/* Lucro da Agência com Arredondamento */}
                    <div className="flex items-center justify-between text-status-success font-bold pt-0.5 border-t border-border/30">
                      <div>
                        <span>+ Lucro Agência</span>
                        {isPrazo && (
                          <span className="text-[10px] text-text-muted block font-normal">
                            (Base: +{fmt(pricing.cashPrice - guestBaseCost)} | Prazo líq: +{fmt(pricing.installmentExtra - pricing.cardFee)})
                          </span>
                        )}
                      </div>
                      <span className="text-sm">+{fmt(guestProfitTotal)}</span>
                    </div>
                  </div>

                  {/* Preço do Pacote Base */}
                  <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div>
                      <div className="flex items-center gap-1.5 text-primary font-bold text-xs">
                        <Package size={13} />
                        <span>Preço Pacote Base (Quarto {roomType})</span>
                      </div>
                      <span className="text-[10px] text-text-muted">
                        {isPrazo ? "Valor a prazo configurado" : "Valor à vista configurado"}
                      </span>
                    </div>
                    <span className="font-black text-primary text-base">
                      {fmt(guestPackagePrice)}
                    </span>
                  </div>

                  {/* Lista de Adicionais Contratados */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-bold text-text-muted uppercase tracking-wide block">
                      Adicionais Contratados ({guestAddons.length}):
                    </span>

                    {guestAddons.length === 0 ? (
                      <div className="text-[11px] text-text-muted/70 italic py-0.5 px-1">
                        Nenhum adicional selecionado para este passageiro.
                      </div>
                    ) : (
                      guestAddons.map((addon) => (
                        <div
                          key={addon.id}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded-md bg-surface-subtle"
                        >
                          <span className="text-text-body truncate pr-2">
                            + {addon.title}
                          </span>
                          <span className="font-semibold text-status-success shrink-0">
                            +{fmt(addon.price || 0)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Total Final a Pagar do Passageiro */}
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-text-muted uppercase block">
                      Total do Passageiro
                    </span>
                    <span className="text-[11px] text-text-muted/70">
                      Pacote ({bracketLabel}) + Adicionais
                    </span>
                  </div>

                  <span className="text-xl font-black text-primary">
                    {fmt(guestTotalPrice)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 5. RESUMO CONSOLIDADO NO RODAPÉ */}
      {guests.length > 0 && (
        <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-base text-text-title">
                Consolidado Geral da Excursão ({guests.length} passageiros na Room List)
              </h4>
              <p className="text-xs text-text-muted mt-0.5">
                Cálculo em tempo real considerando o quarto ocupado, custos da faixa etária e pagamento à vista / a prazo.
              </p>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-bold text-text-muted uppercase block">
                Faturamento Geral Previsto
              </span>
              <span className="text-2xl font-black text-status-success">
                {fmt(grandTotalGeral)}
              </span>
            </div>
          </div>

          {/* Cards dos Totais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-2 border-t border-border/70 text-xs">
            <div className="p-2.5 rounded-xl bg-surface-subtle border border-border/60">
              <span className="text-[10px] font-bold text-text-muted uppercase block flex items-center gap-1">
                <Plane size={11} className="text-sky-500" /> Aéreo
              </span>
              <span className="font-bold text-text-title text-sm mt-0.5 block">
                {fmt(grandTotalAereo)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-subtle border border-border/60">
              <span className="text-[10px] font-bold text-text-muted uppercase block flex items-center gap-1">
                <Building2 size={11} className="text-amber-500" /> Hospedagem
              </span>
              <span className="font-bold text-text-title text-sm mt-0.5 block">
                {fmt(grandTotalHospedagem)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-subtle border border-border/60">
              <span className="text-[10px] font-bold text-text-muted uppercase block flex items-center gap-1">
                <Bus size={11} className="text-indigo-500" /> Rodoviário
              </span>
              <span className="font-bold text-text-title text-sm mt-0.5 block">
                {fmt(grandTotalRodoviario)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-subtle border border-border/60">
              <span className="text-[10px] font-bold text-text-muted uppercase block flex items-center gap-1">
                <Compass size={11} className="text-emerald-500" /> Outros
              </span>
              <span className="font-bold text-text-title text-sm mt-0.5 block">
                {fmt(grandTotalOutros)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-subtle border border-border/60">
              <span className="text-[10px] font-bold text-text-muted uppercase block flex items-center gap-1">
                <CreditCard size={11} className="text-amber-500" /> Taxas Cartão
              </span>
              <span className="font-bold text-text-title text-sm mt-0.5 block">
                {fmt(grandTotalCardFees)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-subtle border border-border/60">
              <span className="text-[10px] font-bold text-text-muted uppercase block flex items-center gap-1">
                <Package size={11} className="text-primary" /> Adicionais
              </span>
              <span className="font-bold text-text-title text-sm mt-0.5 block">
                {fmt(grandTotalAddons)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-status-success/10 border border-status-success/30 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-status-success uppercase block flex items-center gap-1">
                <Coins size={11} /> Lucro Agência
              </span>
              <span className="font-black text-status-success text-sm mt-0.5 block">
                {fmt(grandTotalLucroAgencia)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
