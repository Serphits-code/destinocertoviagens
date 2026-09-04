"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Plus,
  Trash2,
  MapPin,
  Users,
  Check,
  AlertCircle,
  DollarSign,
  FileText,
  HelpCircle,
  Search,
} from "lucide-react";
import type { ExcursionAddon } from "@/lib/actions/addons";
import type { RoomGuest } from "./RoomListView";
import { AddonMapDrawer } from "./AddonMapDrawer";

interface AdicionaisViewProps {
  addons: ExcursionAddon[];
  onUpdateAddons: (newAddons: ExcursionAddon[]) => void;
  guests: RoomGuest[];
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function parseMoney(val: string): number {
  if (!val) return 0;
  const clean = val.replace(/[^\d.,]/g, "").replace(",", ".");
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

export function AdicionaisView({
  addons,
  onUpdateAddons,
  guests,
}: AdicionaisViewProps) {
  const [selectedAddonForMap, setSelectedAddonForMap] = useState<ExcursionAddon | null>(null);
  const [guestSearchFilter, setGuestSearchFilter] = useState("");

  const handleAddAddon = () => {
    const newAddon: ExcursionAddon = {
      id: `addon_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: "Novo Adicional Opcional",
      location: "",
      observation: "",
      price: 0,
      assignedGuestIds: [],
    };
    onUpdateAddons([...addons, newAddon]);
  };

  const handleUpdateItem = (id: string, patch: Partial<ExcursionAddon>) => {
    const next = addons.map((a) => (a.id === id ? { ...a, ...patch } : a));
    onUpdateAddons(next);
  };

  const handleDeleteItem = (id: string) => {
    if (!confirm("Deseja realmente excluir este adicional?")) return;
    onUpdateAddons(addons.filter((a) => a.id !== id));
  };

  const handleToggleGuest = (addonId: string, guestId: string) => {
    const addon = addons.find((a) => a.id === addonId);
    if (!addon) return;

    const exists = addon.assignedGuestIds.includes(guestId);
    const newIds = exists
      ? addon.assignedGuestIds.filter((id) => id !== guestId)
      : [...addon.assignedGuestIds, guestId];

    handleUpdateItem(addonId, { assignedGuestIds: newIds });
  };

  const handleSelectAllGuests = (addonId: string) => {
    handleUpdateItem(addonId, {
      assignedGuestIds: guests.map((g) => g.id),
    });
  };

  const handleClearAllGuests = (addonId: string) => {
    handleUpdateItem(addonId, {
      assignedGuestIds: [],
    });
  };

  const filteredGuests = guestSearchFilter
    ? guests.filter((g) =>
        g.nome.toLowerCase().includes(guestSearchFilter.toLowerCase()) ||
        g.documento.includes(guestSearchFilter)
      )
    : guests;

  const totalAddonsValue = addons.reduce(
    (acc, a) => acc + (a.price || 0) * (a.assignedGuestIds?.length || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Banner Superior */}
      <div className="bg-surface rounded-2xl border border-border shadow-shadow-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-primary mb-1">
            <Sparkles size={20} />
            <h2 className="text-xl font-bold text-text-title">
              Adicionais & Serviços Opcionais
            </h2>
          </div>
          <p className="text-sm text-text-muted max-w-2xl leading-relaxed">
            Cadastre itens extras (ingressos, seguros, jantares, passeios especiais).
            Defina o valor por pessoa, localização no mapa e vincule os passageiros da{" "}
            <strong>Room List</strong> que optaram por adquirir o adicional.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {addons.length > 0 && (
            <div className="text-right px-4 py-2 rounded-xl bg-surface-subtle border border-border">
              <span className="text-[11px] font-semibold text-text-muted uppercase block">
                Total Contratado
              </span>
              <span className="text-base font-bold text-status-success">
                {fmt(totalAddonsValue)}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleAddAddon}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-sm transition-all cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>Novo Adicional</span>
          </button>
        </div>
      </div>

      {/* Estado Vazio */}
      {addons.length === 0 && (
        <div className="bg-surface rounded-2xl border border-dashed border-border p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Sparkles size={28} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-text-title">
              Nenhum adicional cadastrado ainda
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Adicione passeios extras como Macuco Safari, almoços especiais ou seguro viagem.
              Cada passageiro poderá ter seus adicionais somados no Checkout.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddAddon}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Adicionar Primeiro Item</span>
          </button>
        </div>
      )}

      {/* Lista de Cards de Adicionais */}
      <div className="space-y-4">
        {addons.map((addon, index) => {
          const optInCount = addon.assignedGuestIds?.length || 0;
          const subtotal = (addon.price || 0) * optInCount;

          return (
            <motion.div
              key={addon.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface rounded-2xl border border-border shadow-shadow-card overflow-hidden hover:shadow-shadow-hover transition-all"
            >
              {/* Header do Card */}
              <div className="p-5 border-b border-border bg-surface-subtle flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs shrink-0">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={addon.title}
                    onChange={(e) =>
                      handleUpdateItem(addon.id, { title: e.target.value })
                    }
                    placeholder="Título do Adicional (ex: Macuco Safari)"
                    className="text-base font-bold text-text-title bg-transparent border-none outline-none focus:ring-0 w-full placeholder:text-text-muted/60"
                  />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                  {/* Campo de Valor Unitário */}
                  <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-xl border border-border">
                    <span className="text-xs font-bold text-text-muted">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={addon.price || ""}
                      onChange={(e) =>
                        handleUpdateItem(addon.id, {
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0,00"
                      className="w-24 text-sm font-bold text-text-title bg-transparent border-none outline-none text-right focus:ring-0"
                    />
                    <span className="text-[11px] text-text-muted">/ pessoa</span>
                  </div>

                  {/* Botão de Excluir */}
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(addon.id)}
                    className="p-2 rounded-xl text-text-muted hover:text-status-danger hover:bg-status-danger-bg transition-colors cursor-pointer"
                    title="Excluir Adicional"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Corpo do Card */}
              <div className="p-5 space-y-4">
                {/* Linha de Localização e Observações */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Botão e Info do Mapa */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                      <MapPin size={13} className="text-primary" />
                      <span>Localização no Mapa</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedAddonForMap(addon)}
                        className={`flex-1 flex items-center justify-between px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          addon.location
                            ? "bg-primary/5 border-primary/30 text-text-title hover:bg-primary/10"
                            : "bg-surface-subtle border-dashed border-border hover:border-primary text-text-muted hover:text-primary"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <MapPin
                            size={14}
                            className={addon.location ? "text-primary shrink-0" : "text-text-muted shrink-0"}
                          />
                          <span className="truncate">
                            {addon.location || "Definir endereço / local no mapa"}
                          </span>
                        </div>
                        <span className="text-[11px] text-primary font-bold shrink-0">
                          {addon.location ? "Alterar Mapa" : "Abrir Mapa"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Campo de Observações */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                      <FileText size={13} className="text-primary" />
                      <span>Observações / Instruções</span>
                    </label>
                    <input
                      type="text"
                      value={addon.observation || ""}
                      onChange={(e) =>
                        handleUpdateItem(addon.id, {
                          observation: e.target.value,
                        })
                      }
                      placeholder="Ex: Saída às 14h do saguão. Não inclui almoço."
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface-subtle text-xs text-text-body placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface"
                    />
                  </div>
                </div>

                {/* Seção de Atribuição aos Passageiros (Room List) */}
                <div className="pt-3 border-t border-border/70 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Users size={15} className="text-primary" />
                      <span className="text-xs font-bold text-text-title uppercase tracking-wide">
                        Passageiros que contrataram este adicional:
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {optInCount} de {guests.length}
                      </span>
                    </div>

                    {guests.length > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => handleSelectAllGuests(addon.id)}
                          className="text-primary hover:underline font-semibold cursor-pointer"
                        >
                          Marcar Todos
                        </button>
                        <span className="text-border">·</span>
                        <button
                          type="button"
                          onClick={() => handleClearAllGuests(addon.id)}
                          className="text-text-muted hover:text-text-body font-semibold cursor-pointer"
                        >
                          Desmarcar Todos
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Lista de Passageiros */}
                  {guests.length === 0 ? (
                    <div className="p-3.5 rounded-xl bg-surface-subtle border border-border/80 flex items-center gap-2.5 text-xs text-text-muted">
                      <AlertCircle size={15} className="text-amber-500 shrink-0" />
                      <span>
                        Nenhum hóspede cadastrado na Room List ainda. Adicione hóspedes nos quartos
                        para poder atribuí-los aos adicionais.
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                      {guests.map((guest) => {
                        const isSelected = addon.assignedGuestIds?.includes(guest.id);

                        return (
                          <button
                            key={guest.id}
                            type="button"
                            onClick={() => handleToggleGuest(addon.id, guest.id)}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                              isSelected
                                ? "bg-primary/10 border-primary text-text-title shadow-2xs font-semibold"
                                : "bg-surface-subtle border-border/80 text-text-muted hover:border-primary/50 hover:text-text-body"
                            }`}
                          >
                            <div className="truncate pr-2">
                              <p className="truncate">{guest.nome || "Hóspede sem nome"}</p>
                              {guest.documento && (
                                <p className="text-[10px] text-text-muted/70 truncate">
                                  Doc: {guest.documento}
                                </p>
                              )}
                            </div>

                            <div
                              className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                                isSelected
                                  ? "bg-primary border-primary text-white"
                                  : "border-border bg-surface"
                              }`}
                            >
                              {isSelected && <Check size={11} strokeWidth={3} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Subtotal do Card */}
                <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                  <span className="text-text-muted">
                    Subtotal deste adicional ({optInCount} {optInCount === 1 ? "adesão" : "adesões"} × {fmt(addon.price || 0)}):
                  </span>
                  <span className="font-bold text-sm text-text-title">
                    {fmt(subtotal)}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Drawer do Mapa Leaflet */}
      <AddonMapDrawer
        isOpen={!!selectedAddonForMap}
        addon={selectedAddonForMap}
        onClose={() => setSelectedAddonForMap(null)}
        onUpdateLocation={(addonId, locData) => {
          handleUpdateItem(addonId, locData);
          if (selectedAddonForMap) {
            setSelectedAddonForMap({ ...selectedAddonForMap, ...locData });
          }
        }}
      />
    </div>
  );
}
