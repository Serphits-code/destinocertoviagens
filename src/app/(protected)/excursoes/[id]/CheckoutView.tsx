"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Percent,
  DollarSign,
  TrendingUp,
  User,
  Package,
  PlusCircle,
  Receipt,
  CheckCircle2,
  Users,
  Search,
  BedDouble,
  FileCheck,
  Building2,
  AlertCircle,
  Pencil,
} from "lucide-react";
import type { ExcursionAddon } from "@/lib/actions/addons";
import type { RoomGuest, RoomEntry } from "./RoomListView";

interface CheckoutViewProps {
  guests: RoomGuest[];
  rooms: RoomEntry[];
  addons: ExcursionAddon[];
  totalBaseCostPerPerson: number;
  profitMargin: number;
  onUpdateProfitMargin: (margin: number) => void;
  slots: number;
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export function CheckoutView({
  guests,
  rooms,
  addons,
  totalBaseCostPerPerson,
  profitMargin,
  onUpdateProfitMargin,
  slots,
}: CheckoutViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditingMargin, setIsEditingMargin] = useState(false);
  const [tempMargin, setTempMargin] = useState(String(profitMargin || 0));

  // Cálculos de Lucro da Agência
  const marginPercent = Number(profitMargin) || 0;
  const profitPerPerson = totalBaseCostPerPerson * (marginPercent / 100);
  const basePackagePrice = totalBaseCostPerPerson + profitPerPerson;
  const totalAgencyProfit = profitPerPerson * slots;

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

  // Passageiros filtrados
  const filteredGuests = searchTerm
    ? guests.filter(
        (g) =>
          g.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          g.documento.includes(searchTerm)
      )
    : guests;

  const handleSaveMargin = () => {
    const parsed = parseFloat(tempMargin.replace(",", "."));
    const finalVal = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    onUpdateProfitMargin(finalVal);
    setIsEditingMargin(false);
  };

  // Totais consolidados
  const totalAddonsAllPassengers = guests.reduce((acc, g) => {
    const guestAddons = addons.filter((a) => a.assignedGuestIds?.includes(g.id));
    return acc + guestAddons.reduce((sum, a) => sum + (a.price || 0), 0);
  }, 0);

  const grandTotalAllPassengers =
    basePackagePrice * guests.length + totalAddonsAllPassengers;

  return (
    <div className="space-y-6">
      {/* Topo: Painel de Configuração de Lucro da Agência */}
      <div className="bg-surface rounded-2xl border border-border shadow-shadow-card p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 text-primary mb-1">
              <Receipt size={20} />
              <h2 className="text-xl font-bold text-text-title">
                Checkout & Precificação por Passageiro
              </h2>
            </div>
            <p className="text-sm text-text-muted max-w-2xl leading-relaxed">
              Configure a porcentagem de lucro da agência para calcular o valor base de venda.
              Abaixo, confira o espelho individual de cada passageiro com o pacote base e seus adicionais particulares.
            </p>
          </div>

          {/* Botão / Controle de Margem de Lucro */}
          <div className="bg-surface-subtle border border-border p-3.5 rounded-2xl flex items-center gap-3 shrink-0">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <TrendingUp size={20} />
            </div>

            <div>
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                Margem de Lucro da Agência
              </span>

              {isEditingMargin ? (
                <div className="flex items-center gap-2 mt-1">
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={tempMargin}
                      onChange={(e) => setTempMargin(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveMargin()}
                      className="w-20 px-2 py-1 text-sm font-bold bg-surface border border-primary rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-text-title"
                      autoFocus
                    />
                    <span className="absolute right-2 text-xs font-bold text-text-muted">
                      %
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveMargin}
                    className="px-2.5 py-1 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-hover transition-colors cursor-pointer"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTempMargin(String(profitMargin || 0));
                      setIsEditingMargin(false);
                    }}
                    className="px-2 py-1 text-text-muted text-xs hover:text-text-body transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-lg font-black text-primary">
                    {marginPercent}%
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTempMargin(String(profitMargin || 0));
                      setIsEditingMargin(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-muted hover:text-primary transition-colors cursor-pointer px-2 py-0.5 rounded-md hover:bg-surface"
                  >
                    <Pencil size={11} />
                    <span>Configurar</span>
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
              Custo Estimado / Pax
            </span>
            <span className="text-base font-bold text-text-title">
              {fmt(totalBaseCostPerPerson)}
            </span>
          </div>

          <div className="bg-surface-subtle p-3.5 rounded-xl border border-border/70">
            <span className="text-[11px] font-semibold text-text-muted uppercase block">
              Lucro Agência ({marginPercent}%) / Pax
            </span>
            <span className="text-base font-bold text-status-success">
              +{fmt(profitPerPerson)}
            </span>
          </div>

          <div className="bg-primary/5 p-3.5 rounded-xl border border-primary/20">
            <span className="text-[11px] font-bold text-primary uppercase block">
              Preço Base / Passageiro
            </span>
            <span className="text-base font-black text-primary">
              {fmt(basePackagePrice)}
            </span>
          </div>

          <div className="bg-surface-subtle p-3.5 rounded-xl border border-border/70">
            <span className="text-[11px] font-semibold text-text-muted uppercase block">
              Lucro Total ({slots} Vagas)
            </span>
            <span className="text-base font-bold text-status-success">
              {fmt(totalAgencyProfit)}
            </span>
          </div>
        </div>

        {/* Atalhos Rápidos de Margem */}
        <div className="flex items-center gap-2 pt-1 text-xs text-text-muted">
          <span className="font-semibold">Margens sugeridas:</span>
          {[10, 15, 20, 25, 30].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => {
                onUpdateProfitMargin(pct);
                setTempMargin(String(pct));
              }}
              className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                marginPercent === pct
                  ? "bg-primary text-white"
                  : "bg-surface-subtle border border-border hover:border-primary text-text-body"
              }`}
            >
              {pct}%
            </button>
          ))}
        </div>
      </div>

      {/* Barra de Filtro e Contadores de Passageiros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-primary" />
          <h3 className="font-bold text-text-title text-sm">
            Passageiros Confirmados ({guests.length})
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
            Acesse a aba <strong>Room List</strong> e adicione hóspedes aos quartos para visualizar os cards individuais de checkout e seus adicionais.
          </p>
        </div>
      ) : (
        /* Grid de Cards dos Passageiros */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGuests.map((guest, idx) => {
            const guestRoom = guestRoomMap[guest.id];
            const guestAddons = addons.filter((a) =>
              a.assignedGuestIds?.includes(guest.id)
            );
            const totalGuestAddons = guestAddons.reduce(
              (acc, a) => acc + (a.price || 0),
              0
            );
            const totalGuestPrice = basePackagePrice + totalGuestAddons;

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
                      <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                        {guest.documento && (
                          <span>Doc: {guest.documento}</span>
                        )}
                        {guest.tipo && (
                          <>
                            <span>·</span>
                            <span>{guest.tipo}</span>
                          </>
                        )}
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

                {/* Discriminação Financeira do Passageiro */}
                <div className="space-y-2.5 pt-3 border-t border-border/70 text-xs">
                  {/* Pacote Base */}
                  <div className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-surface-subtle">
                    <div className="flex items-center gap-2 text-text-body">
                      <Package size={13} className="text-primary" />
                      <span>Pacote Excursão Base</span>
                    </div>
                    <span className="font-bold text-text-title">
                      {fmt(basePackagePrice)}
                    </span>
                  </div>

                  {/* Lista de Adicionais Contratados */}
                  <div className="space-y-1.5 pl-1">
                    <span className="text-[11px] font-bold text-text-muted uppercase tracking-wide block">
                      Adicionais Contratados ({guestAddons.length}):
                    </span>

                    {guestAddons.length === 0 ? (
                      <div className="text-[11px] text-text-muted/70 italic py-1">
                        Nenhum adicional selecionado para este passageiro.
                      </div>
                    ) : (
                      guestAddons.map((addon) => (
                        <div
                          key={addon.id}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded-md hover:bg-surface-subtle transition-colors"
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

                {/* Total do Passageiro */}
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-text-muted uppercase block">
                      Total a Pagar
                    </span>
                    <span className="text-[11px] text-text-muted/70">
                      Base + Adicionais
                    </span>
                  </div>

                  <span className="text-xl font-black text-primary">
                    {fmt(totalGuestPrice)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Resumo Consolidado do Checkout no Rodapé */}
      {guests.length > 0 && (
        <div className="bg-surface rounded-2xl border border-border p-5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="font-bold text-sm text-text-title">
              Consolidado Geral da Excursão ({guests.length} passageiros na Room List)
            </h4>
            <p className="text-text-muted">
              Faturamento dos pacotes base: <strong>{fmt(basePackagePrice * guests.length)}</strong> | Total adicionais: <strong>{fmt(totalAddonsAllPassengers)}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] font-bold text-text-muted uppercase block">
                Faturamento Geral Previsto
              </span>
              <span className="text-xl font-black text-status-success">
                {fmt(grandTotalAllPassengers)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
