"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Percent,
  DollarSign,
  TrendingUp,
  User,
  Package,
  Receipt,
  Users,
  Search,
  BedDouble,
  Building2,
  Pencil,
  Plane,
  Bus,
  Compass,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Coins,
  ArrowRight,
} from "lucide-react";
import type { ExcursionAddon } from "@/lib/actions/addons";
import type { EditorBlock } from "@/lib/editor-types";
import type { RoomGuest, RoomEntry } from "./RoomListView";
import {
  getGuestAgeBracket,
  getGuestAge,
  getBlockUnitPriceForTier,
  AGE_BRACKET_LABELS,
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
  customProfitAmount?: number | null;
  customPackagePrice?: number | null;
  onUpdatePricing?: (pricing: {
    profitMargin?: number;
    customProfitAmount?: number | null;
    customPackagePrice?: number | null;
  }) => void;
  onUpdateProfitMargin?: (margin: number) => void;
  slots: number;
  basePackagePrice?: number;
  profitPerPerson?: number;
  totalAgencyProfit?: number;
  roundingDifference?: number;
  isSimulationActive?: boolean;
  periodStart?: string | null;
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
  customProfitAmount = null,
  customPackagePrice = null,
  onUpdatePricing,
  onUpdateProfitMargin,
  slots,
  basePackagePrice: propBasePackagePrice,
  profitPerPerson: propProfitPerPerson,
  totalAgencyProfit: propTotalAgencyProfit,
  roundingDifference: propRoundingDiff = 0,
  isSimulationActive = false,
  periodStart = null,
}: CheckoutViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditingMargin, setIsEditingMargin] = useState(false);
  const [editMode, setEditMode] = useState<"percent" | "profit" | "price">("percent");
  const [tempVal, setTempVal] = useState(String(profitMargin || 0));

  // Mapa de quarto por hóspede
  const guestRoomMap: Record<string, { roomNumber: string; roomType: string }> = {};
  for (const r of rooms) {
    for (const g of r.hospedes) {
      guestRoomMap[g.id] = {
        roomNumber: r.numero || "Quarto",
        roomType: r.tipo || "Standard",
      };
    }
  }

  // Filtragem de passageiros
  const filteredGuests = searchTerm
    ? guests.filter(
        (g) =>
          g.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          g.documento.includes(searchTerm)
      )
    : guests;

  // Cálculos de Lucro e Arredondamento da Agência
  const marginPercent = Number(profitMargin) || 0;
  const calculatedProfitPerPerson = totalBaseCostPerPerson * (marginPercent / 100);

  const customProfit = customProfitAmount !== null && customProfitAmount !== undefined ? Number(customProfitAmount) : null;
  const customPrice = customPackagePrice !== null && customPackagePrice !== undefined ? Number(customPackagePrice) : null;

  let effectiveProfitPerPerson = propProfitPerPerson ?? calculatedProfitPerPerson;
  let basePackagePrice = propBasePackagePrice ?? (totalBaseCostPerPerson + effectiveProfitPerPerson);
  let roundingDifference = propRoundingDiff;

  if (customProfit !== null && !isNaN(customProfit) && customProfit > 0) {
    effectiveProfitPerPerson = customProfit;
    basePackagePrice = totalBaseCostPerPerson + customProfit;
    roundingDifference = customProfit - calculatedProfitPerPerson;
  } else if (customPrice !== null && !isNaN(customPrice) && customPrice > 0) {
    basePackagePrice = customPrice;
    effectiveProfitPerPerson = Math.max(0, customPrice - totalBaseCostPerPerson);
    roundingDifference = effectiveProfitPerPerson - calculatedProfitPerPerson;
  }

  const handleSavePricing = () => {
    const parsed = parseNum(tempVal);
    if (editMode === "percent") {
      if (onUpdatePricing) {
        onUpdatePricing({ profitMargin: parsed, customProfitAmount: null, customPackagePrice: null });
      } else {
        onUpdateProfitMargin?.(parsed);
      }
    } else if (editMode === "profit") {
      if (onUpdatePricing) {
        onUpdatePricing({ customProfitAmount: parsed, customPackagePrice: null });
      }
    } else if (editMode === "price") {
      if (onUpdatePricing) {
        onUpdatePricing({ customPackagePrice: parsed, customProfitAmount: null });
      }
    }
    setIsEditingMargin(false);
  };

  // Contabilidade individual de cada passageiro pela idade
  const passengerCalculations = guests.map((guest) => {
    const ageBracket: AgeBracket = getGuestAgeBracket(guest, periodStart);
    const guestAge = getGuestAge(guest, periodStart);

    // Valores discriminados de cada bloco para a idade deste hóspede
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

    // Margem de lucro base + diferença de arredondamento incorporada como lucro
    const guestProfitBase = guestBaseCost * (marginPercent / 100);
    const guestRoundingExtra =
      ageBracket === "adulto"
        ? Math.max(0, roundingDifference)
        : totalBaseCostPerPerson > 0
        ? Math.max(0, roundingDifference) * (guestBaseCost / totalBaseCostPerPerson)
        : 0;

    const guestProfitTotal = guestProfitBase + guestRoundingExtra;
    const guestPackagePrice = guestBaseCost + guestProfitTotal;

    // Adicionais contratados
    const guestAddons = addons.filter((a) => a.assignedGuestIds?.includes(guest.id));
    const totalGuestAddons = guestAddons.reduce((sum, a) => sum + (a.price || 0), 0);
    const guestTotalPrice = guestPackagePrice + totalGuestAddons;

    return {
      guest,
      ageBracket,
      guestAge,
      blockBreakdown,
      guestBaseCost,
      guestProfitTotal,
      guestProfitBase,
      guestRoundingExtra,
      guestPackagePrice,
      guestAddons,
      totalGuestAddons,
      guestTotalPrice,
    };
  });

  // Totais consolidados da excursão inteira
  let grandTotalAereo = 0;
  let grandTotalHospedagem = 0;
  let grandTotalRodoviario = 0;
  let grandTotalOutros = 0;
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
    grandTotalLucroAgencia += p.guestProfitTotal;
    grandTotalBasePackages += p.guestPackagePrice;
    grandTotalAddons += p.totalGuestAddons;
    grandTotalGeral += p.guestTotalPrice;
  }

  // Se não houver passageiros na room list ainda, simula com as vagas
  const activeSlots = guests.length > 0 ? guests.length : slots || 20;
  const simulatedAgencyProfit =
    guests.length > 0 ? grandTotalLucroAgencia : effectiveProfitPerPerson * activeSlots;

  return (
    <div className="space-y-6">
      {/* Topo: Painel de Configuração de Lucro & Arredondamento da Agência */}
      <div className="bg-surface rounded-2xl border border-border shadow-shadow-card p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 text-primary mb-1">
              <Receipt size={20} />
              <h2 className="text-xl font-bold text-text-title">
                Checkout &amp; Precificação por Passageiro
              </h2>
              {isSimulationActive && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-status-success/15 text-status-success flex items-center gap-1 border border-status-success/30">
                  ⚡ Simulação ativa ({slots} vagas)
                </span>
              )}
            </div>
            <p className="text-sm text-text-muted max-w-2xl leading-relaxed">
              O sistema calcula a tarifa de cada passageiro automaticamente pela faixa etária configurada nos blocos e idade do cliente na Room List.
              Ajuste a porcentagem ou edite o valor cheio do lucro/pacote para arredondar — qualquer diferença entra <strong>integralmente como lucro da agência</strong>.
            </p>
          </div>

          {/* Botão / Controle de Margem e Arredondamento */}
          <div className="bg-surface-subtle border border-border p-3.5 rounded-2xl flex items-center gap-3 shrink-0">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <TrendingUp size={20} />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                  Lucro &amp; Arredondamento
                </span>
                {roundingDifference > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    +{fmt(roundingDifference)} arr.
                  </span>
                )}
              </div>

              {isEditingMargin ? (
                <div className="flex flex-col gap-2 mt-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => { setEditMode("percent"); setTempVal(String(marginPercent)); }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                        editMode === "percent" ? "bg-primary text-white" : "bg-surface border border-border text-text-muted"
                      }`}
                    >
                      % Margem
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditMode("profit"); setTempVal(effectiveProfitPerPerson > 0 ? effectiveProfitPerPerson.toFixed(2) : ""); }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                        editMode === "profit" ? "bg-primary text-white" : "bg-surface border border-border text-text-muted"
                      }`}
                    >
                      R$ Lucro
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditMode("price"); setTempVal(basePackagePrice > 0 ? basePackagePrice.toFixed(2) : ""); }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                        editMode === "price" ? "bg-primary text-white" : "bg-surface border border-border text-text-muted"
                      }`}
                    >
                      R$ Arredondar Preço
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center">
                      <span className="absolute left-2 text-xs font-bold text-text-muted">
                        {editMode === "percent" ? "%" : "R$"}
                      </span>
                      <input
                        type="number"
                        step={editMode === "percent" ? "0.5" : "1"}
                        value={tempVal}
                        onChange={(e) => setTempVal(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSavePricing()}
                        className="w-28 pl-7 pr-2 py-1 text-sm font-bold bg-surface border border-primary rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-text-title"
                        autoFocus
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSavePricing}
                      className="px-2.5 py-1 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-hover transition-colors cursor-pointer"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingMargin(false)}
                      className="px-2 py-1 text-text-muted text-xs hover:text-text-body transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-lg font-black text-primary">
                    {marginPercent}% ({fmt(effectiveProfitPerPerson)})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode("percent");
                      setTempVal(String(marginPercent));
                      setIsEditingMargin(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-muted hover:text-primary transition-colors cursor-pointer px-2 py-0.5 rounded-md hover:bg-surface"
                    title="Editar porcentagem ou arredondar valor do pacote"
                  >
                    <Pencil size={11} />
                    <span>Arredondar / Ajustar</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Métricas e Detalhamento da Precificação */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="bg-surface-subtle p-3.5 rounded-xl border border-border/70">
            <span className="text-[11px] font-semibold text-text-muted uppercase block">
              Custo Estimado Base / Adulto
            </span>
            <span className="text-base font-bold text-text-title">
              {fmt(totalBaseCostPerPerson)}
            </span>
          </div>

          <div className="bg-surface-subtle p-3.5 rounded-xl border border-border/70">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-text-muted uppercase block">
                Lucro Líquido / Adulto
              </span>
              {roundingDifference > 0 && (
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  +{fmt(roundingDifference)}
                </span>
              )}
            </div>
            <span className="text-base font-bold text-status-success">
              +{fmt(effectiveProfitPerPerson)}
            </span>
            <span className="text-[10px] text-text-muted block">
              Base: {fmt(calculatedProfitPerPerson)} {roundingDifference > 0 ? `+ ${fmt(roundingDifference)} arredondamento` : ""}
            </span>
          </div>

          <div className="bg-primary/5 p-3.5 rounded-xl border border-primary/20">
            <span className="text-[11px] font-bold text-primary uppercase block">
              Preço Venda Pacote / Adulto
            </span>
            <span className="text-base font-black text-primary">
              {fmt(basePackagePrice)}
            </span>
            <span className="text-[10px] text-primary/70 block font-medium">
              Custo + Lucro total agência
            </span>
          </div>

          <div className="bg-surface-subtle p-3.5 rounded-xl border border-border/70">
            <span className="text-[11px] font-semibold text-text-muted uppercase block">
              Lucro Total ({activeSlots} {activeSlots === 1 ? "Pax" : "Passageiros"})
            </span>
            <span className="text-base font-bold text-status-success">
              {fmt(simulatedAgencyProfit)}
            </span>
            <span className="text-[10px] text-text-muted block">
              {guests.length > 0 ? "Calculado pelos passageiros na Room List" : "Estimado pelas vagas"}
            </span>
          </div>
        </div>

        {/* Atalhos Rápidos de Margem */}
        <div className="flex items-center gap-2 pt-1 text-xs text-text-muted flex-wrap">
          <span className="font-semibold">Margens sugeridas:</span>
          {[10, 15, 20, 25, 30].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => {
                if (onUpdatePricing) {
                  onUpdatePricing({ profitMargin: pct, customProfitAmount: null, customPackagePrice: null });
                } else {
                  onUpdateProfitMargin?.(pct);
                }
              }}
              className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                marginPercent === pct && !customProfit && !customPrice
                  ? "bg-primary text-white"
                  : "bg-surface-subtle border border-border hover:border-primary text-text-body"
              }`}
            >
              {pct}%
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              // Sugestão de arredondamento para a próxima dezena/centena
              const nextRound = Math.ceil(basePackagePrice / 50) * 50;
              if (onUpdatePricing) {
                onUpdatePricing({ customPackagePrice: nextRound, customProfitAmount: null });
              }
            }}
            className="ml-auto inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30 cursor-pointer text-[11px]"
            title="Arredonda o preço do pacote para o múltiplo de R$ 50 mais próximo e adiciona a diferença ao lucro"
          >
            <Sparkles size={11} />
            <span>Arredondar p/ {fmt(Math.ceil(basePackagePrice / 50) * 50)}</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtro e Contadores de Passageiros */}
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

      {/* Estado Vazio de Passageiros */}
      {guests.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-dashed border-border p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-surface-subtle flex items-center justify-center mx-auto text-text-muted">
            <Users size={24} />
          </div>
          <h4 className="text-sm font-bold text-text-title">
            Nenhum passageiro encontrado na Room List
          </h4>
          <p className="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
            Acesse a aba <strong>Room List</strong> e adicione hóspedes aos quartos para visualizar o espelho com cada bloco discriminado e contabilidade automática por idade.
          </p>
        </div>
      ) : (
        /* Grid de Cards dos Passageiros com Discriminação dos Blocos */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {passengerCalculations
            .filter((p) =>
              searchTerm
                ? p.guest.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  p.guest.documento.includes(searchTerm)
                : true
            )
            .map((p, idx) => {
              const {
                guest,
                ageBracket,
                guestAge,
                blockBreakdown,
                guestBaseCost,
                guestProfitTotal,
                guestRoundingExtra,
                guestPackagePrice,
                guestAddons,
                guestTotalPrice,
              } = p;
              const guestRoom = guestRoomMap[guest.id];

              const bracketLabel =
                ageBracket === "bebe"
                  ? `Bebê / Colo ${guestAge !== null ? `(${guestAge}a)` : ""}`
                  : ageBracket === "crianca"
                  ? `Criança ${guestAge !== null ? `(${guestAge}a)` : ""}`
                  : `Adulto ${guestAge !== null ? `(${guestAge}a)` : ""}`;

              return (
                <motion.div
                  key={guest.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
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
                          {guest.documento && (
                            <span>Doc: {guest.documento}</span>
                          )}
                          <span>·</span>
                          <span className="font-semibold text-text-title">{bracketLabel}</span>
                        </div>
                      </div>
                    </div>

                    {guestRoom && (
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-surface-subtle border border-border text-text-muted shrink-0 flex items-center gap-1">
                        <BedDouble size={12} className="text-primary" />
                        <span>{guestRoom.roomNumber} ({guestRoom.roomType})</span>
                      </span>
                    )}
                  </div>

                  {/* Discriminação de TODOS os Blocos Individuais */}
                  <div className="space-y-2 pt-2 border-t border-border/70 text-xs">
                    <span className="text-[11px] font-bold text-text-muted uppercase tracking-wide block">
                      Valores Discriminados por Bloco ({ageBracket}):
                    </span>

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
                        <span>Subtotal Custos Base</span>
                        <span className="text-text-title">{fmt(guestBaseCost)}</span>
                      </div>

                      {/* Lucro da Agência com Arredondamento */}
                      <div className="flex items-center justify-between text-status-success font-semibold">
                        <div className="flex items-center gap-1">
                          <span>+ Lucro Agência</span>
                          {guestRoundingExtra > 0 && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                              (inclui arredondamento)
                            </span>
                          )}
                        </div>
                        <span>+{fmt(guestProfitTotal)}</span>
                      </div>
                    </div>

                    {/* Preço do Pacote Base */}
                    <div className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-1.5 text-primary font-bold text-xs">
                        <Package size={13} />
                        <span>Preço Pacote Base</span>
                      </div>
                      <span className="font-black text-primary text-sm">
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

      {/* Resumo Consolidado do Checkout no Rodapé */}
      {guests.length > 0 && (
        <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-base text-text-title">
                Consolidado Geral da Excursão ({guests.length} passageiros na Room List)
              </h4>
              <p className="text-xs text-text-muted mt-0.5">
                Valores calculados em tempo real pela idade de cada hóspede em cada bloco.
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

          {/* Cards dos Totais por Bloco */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-2 border-t border-border/70 text-xs">
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
                <Compass size={11} className="text-emerald-500" /> Outros / Guias
              </span>
              <span className="font-bold text-text-title text-sm mt-0.5 block">
                {fmt(grandTotalOutros)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-status-success/10 border border-status-success/30">
              <span className="text-[10px] font-bold text-status-success uppercase block flex items-center gap-1">
                <Coins size={11} /> Lucro Agência
              </span>
              <span className="font-black text-status-success text-sm mt-0.5 block">
                {fmt(grandTotalLucroAgencia)}
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
          </div>
        </div>
      )}
    </div>
  );
}
