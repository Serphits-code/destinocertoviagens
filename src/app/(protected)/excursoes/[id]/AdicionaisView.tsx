"use client";

import { useState, useEffect, useMemo } from "react";
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
  Search,
  Sliders,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  Layers,
  Info,
} from "lucide-react";
import type {
  ExcursionAddon,
  AddonAgeTier,
  AddonGuestPayment,
} from "@/lib/actions/addons";
import type { RoomGuest } from "./RoomListView";
import { AddonMapDrawer } from "./AddonMapDrawer";
import { getCustomersBirthdays } from "@/lib/actions/customers";

interface AdicionaisViewProps {
  addons: ExcursionAddon[];
  onUpdateAddons: (
    newAddons: ExcursionAddon[],
    newPayments?: Record<string, AddonGuestPayment>
  ) => void;
  guests: RoomGuest[];
  guestPayments?: Record<string, AddonGuestPayment>;
  onUpdateGuestPayments?: (newPayments: Record<string, AddonGuestPayment>) => void;
  periodStart?: string | null;
  periodEnd?: string | null;
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function parseNum(val: unknown): number {
  if (typeof val === "number") return val;
  if (!val) return 0;
  const clean = String(val).replace(/[^\d.,-]/g, "").replace(",", ".");
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

function calculateAge(birthDateStr?: string | null): number | null {
  if (!birthDateStr) return null;
  const d = new Date(birthDateStr);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

export function getAddonPriceForGuest(
  addon: ExcursionAddon,
  guestAge: number | null
): { price: number; cost: number; profit: number; tierLabel?: string } {
  if (addon.ageTiers && addon.ageTiers.length > 0 && guestAge !== null) {
    const matchedTier = addon.ageTiers.find(
      (t) => guestAge >= t.minAge && guestAge <= t.maxAge
    );
    if (matchedTier) {
      return {
        price: Number(matchedTier.price) || 0,
        cost: Number(matchedTier.cost) || 0,
        profit: Number(matchedTier.profit) || 0,
        tierLabel: matchedTier.label || `${matchedTier.minAge} a ${matchedTier.maxAge} anos`,
      };
    }
  }

  const price = Number(addon.price) || 0;
  const cost = Number(addon.cost) || 0;
  const profit = Number(addon.profit) || (price - cost > 0 ? price - cost : 0);
  return { price, cost, profit };
}

const PAYMENT_METHODS = [
  "PIX",
  "Cartão de Crédito",
  "Cartão de Débito",
  "Boleto",
  "Dinheiro",
  "Transferência",
  "A Combinar",
];

export function AdicionaisView({
  addons,
  onUpdateAddons,
  guests,
  guestPayments = {},
  onUpdateGuestPayments,
}: AdicionaisViewProps) {
  // Sub-telas: Adesão (padrão ao abrir) e Config
  const [subTab, setSubTab] = useState<"adesao" | "config">("adesao");

  const [selectedAddonForMap, setSelectedAddonForMap] = useState<ExcursionAddon | null>(null);
  const [guestSearchFilter, setGuestSearchFilter] = useState("");
  const [birthdaysMap, setBirthdaysMap] = useState<Record<string, string>>({});

  // Carrega aniversários dos clientes da Room List caso não estejam no objeto do hóspede
  useEffect(() => {
    const toQuery = guests.filter(
      (g) => g.nome && !g.birthDate && !birthdaysMap[g.customerId || g.nome]
    );
    if (toQuery.length > 0) {
      getCustomersBirthdays(
        toQuery.map((g) => ({
          customerId: g.customerId,
          name: g.nome,
          document: g.documento,
        }))
      ).then((map) => {
        setBirthdaysMap((prev) => ({ ...prev, ...map }));
      });
    }
  }, [guests, birthdaysMap]);

  // Resolucão de data de nascimento de cada hóspede
  const getGuestBDate = (g: RoomGuest): string | null => {
    return (
      g.birthDate ||
      (g.customerId ? birthdaysMap[g.customerId] : null) ||
      (g.nome ? birthdaysMap[g.nome.trim().toLowerCase()] : null) ||
      (g.documento ? birthdaysMap[g.documento.replace(/\D/g, "")] : null) ||
      null
    );
  };

  // ---- Handlers de Adicionais (Config) ----
  const handleAddAddon = () => {
    const newAddon: ExcursionAddon = {
      id: `addon_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: "Novo Adicional Opcional",
      location: "",
      observation: "",
      price: 0,
      cost: 0,
      profit: 0,
      ageTiers: [
        {
          id: `tier_${Date.now()}_1`,
          label: "Adulto",
          minAge: 15,
          maxAge: 99,
          cost: 0,
          profit: 0,
          price: 0,
        },
      ],
      assignedGuestIds: [],
    };
    onUpdateAddons([...addons, newAddon]);
  };

  const handleUpdateAddon = (id: string, patch: Partial<ExcursionAddon>) => {
    const next = addons.map((a) => (a.id === id ? { ...a, ...patch } : a));
    onUpdateAddons(next);
  };

  const handleDeleteAddon = (id: string) => {
    if (!confirm("Deseja realmente excluir este adicional?")) return;
    onUpdateAddons(addons.filter((a) => a.id !== id));
  };

  // Faixas etárias de um adicional
  const handleAddAgeTier = (addonId: string) => {
    const addon = addons.find((a) => a.id === addonId);
    if (!addon) return;

    const tiers = addon.ageTiers ? [...addon.ageTiers] : [];
    const newTier: AddonAgeTier = {
      id: `tier_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: "Nova Faixa",
      minAge: 0,
      maxAge: 12,
      cost: 0,
      profit: 0,
      price: 0,
    };
    handleUpdateAddon(addonId, { ageTiers: [...tiers, newTier] });
  };

  const handleUpdateAgeTier = (
    addonId: string,
    tierId: string,
    patch: Partial<AddonAgeTier>
  ) => {
    const addon = addons.find((a) => a.id === addonId);
    if (!addon || !addon.ageTiers) return;

    const nextTiers = addon.ageTiers.map((t) => {
      if (t.id !== tierId) return t;
      const updated = { ...t, ...patch };

      // Se atualizou custo ou lucro, recalcula preço = custo + lucro
      if (patch.cost !== undefined || patch.profit !== undefined) {
        const c = patch.cost !== undefined ? parseNum(patch.cost) : t.cost;
        const p = patch.profit !== undefined ? parseNum(patch.profit) : t.profit;
        updated.price = c + p;
      } else if (patch.price !== undefined) {
        // Se digitou preço diretamente, ajusta lucro mantendo o custo
        const pr = parseNum(patch.price);
        updated.profit = Math.max(0, pr - t.cost);
      }

      return updated;
    });

    handleUpdateAddon(addonId, { ageTiers: nextTiers });
  };

  const handleDeleteAgeTier = (addonId: string, tierId: string) => {
    const addon = addons.find((a) => a.id === addonId);
    if (!addon || !addon.ageTiers) return;
    handleUpdateAddon(addonId, {
      ageTiers: addon.ageTiers.filter((t) => t.id !== tierId),
    });
  };

  // ---- Handlers de Adesão dos Passageiros (Adesão) ----
  const handleToggleGuestAddon = (addonId: string, guestId: string) => {
    const addon = addons.find((a) => a.id === addonId);
    if (!addon) return;

    const exists = addon.assignedGuestIds?.includes(guestId);
    const newIds = exists
      ? addon.assignedGuestIds.filter((id) => id !== guestId)
      : [...(addon.assignedGuestIds || []), guestId];

    handleUpdateAddon(addonId, { assignedGuestIds: newIds });
  };

  const handleUpdatePaymentMethod = (guestId: string, method: string) => {
    const next = {
      ...guestPayments,
      [guestId]: {
        ...(guestPayments[guestId] || {}),
        paymentMethod: method,
      },
    };
    if (onUpdateGuestPayments) {
      onUpdateGuestPayments(next);
    } else {
      onUpdateAddons(addons, next);
    }
  };

  const handleTogglePaid = (guestId: string) => {
    const current = !!guestPayments[guestId]?.paid;
    const next = {
      ...guestPayments,
      [guestId]: {
        ...(guestPayments[guestId] || {}),
        paid: !current,
        paidAt: !current ? new Date().toISOString() : undefined,
      },
    };
    if (onUpdateGuestPayments) {
      onUpdateGuestPayments(next);
    } else {
      onUpdateAddons(addons, next);
    }
  };

  // Passageiros filtrados pela busca
  const filteredGuests = useMemo(() => {
    if (!guestSearchFilter.trim()) return guests;
    const q = guestSearchFilter.toLowerCase();
    return guests.filter(
      (g) =>
        g.nome.toLowerCase().includes(q) ||
        g.documento?.toLowerCase().includes(q)
    );
  }, [guests, guestSearchFilter]);

  // Totais consolidados de Adesão
  const stats = useMemo(() => {
    let grandTotal = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalGuestOptIns = 0;

    for (const guest of guests) {
      const bDate = getGuestBDate(guest);
      const age = calculateAge(bDate);
      const isPaid = !!guestPayments[guest.id]?.paid;

      let guestSubtotal = 0;
      let hasAny = false;

      for (const addon of addons) {
        if (addon.assignedGuestIds?.includes(guest.id)) {
          hasAny = true;
          const { price } = getAddonPriceForGuest(addon, age);
          guestSubtotal += price;
        }
      }

      if (hasAny) totalGuestOptIns++;
      grandTotal += guestSubtotal;
      if (isPaid) {
        totalPaid += guestSubtotal;
      } else {
        totalPending += guestSubtotal;
      }
    }

    return { grandTotal, totalPaid, totalPending, totalGuestOptIns };
  }, [guests, addons, guestPayments, birthdaysMap]);

  return (
    <div className="space-y-6">
      {/* Barra de Navegação Superior e Alternância entre Adesão e Config */}
      <div className="bg-surface rounded-2xl border border-border shadow-shadow-card p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-text-title">Adicionais</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface-subtle text-text-muted border border-border font-medium">
                {addons.length} {addons.length === 1 ? "item" : "itens"}
              </span>
            </div>
            <p className="text-xs text-text-muted">
              {subTab === "adesao"
                ? "Controle de adesão por passageiro, valores por idade e status de pagamento."
                : "Cadastre e configure itens adicionais, faixas etárias, custos e margem de lucro."}
            </p>
          </div>
        </div>

        {/* Toggle de Sub-Telas (Adesão vs Config) */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center p-1 rounded-xl bg-surface-subtle border border-border">
            <button
              type="button"
              onClick={() => setSubTab("adesao")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subTab === "adesao"
                  ? "bg-primary text-white shadow-xs"
                  : "text-text-muted hover:text-text-body hover:bg-surface"
              }`}
            >
              <Users size={14} />
              <span>Adesão</span>
              {stats.totalGuestOptIns > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    subTab === "adesao"
                      ? "bg-white/20 text-white"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {stats.totalGuestOptIns}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSubTab("config")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subTab === "config"
                  ? "bg-primary text-white shadow-xs"
                  : "text-text-muted hover:text-text-body hover:bg-surface"
              }`}
            >
              <Sliders size={14} />
              <span>Config</span>
            </button>
          </div>

          {subTab === "config" && (
            <button
              type="button"
              onClick={handleAddAddon}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0"
            >
              <Plus size={15} />
              <span>Novo Adicional</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUB-TELA 1: ADESÃO (Tabela de Passageiros x Adicionais)  */}
      {/* ======================================================== */}
      {subTab === "adesao" && (
        <div className="space-y-4">
          {/* Cards de Resumo Financeiro da Adesão */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-surface rounded-xl border border-border p-3.5 space-y-1">
              <span className="text-[11px] font-semibold text-text-muted uppercase block">
                Total Contratado
              </span>
              <span className="text-lg font-bold text-text-title tabular-nums">
                {fmt(stats.grandTotal)}
              </span>
            </div>

            <div className="bg-surface rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-1">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1">
                <CheckCircle2 size={13} /> Já Pago
              </span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {fmt(stats.totalPaid)}
              </span>
            </div>

            <div className="bg-surface rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-1">
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1">
                <Clock size={13} /> Pendente
              </span>
              <span className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {fmt(stats.totalPending)}
              </span>
            </div>

            <div className="bg-surface rounded-xl border border-border p-3.5 space-y-1">
              <span className="text-[11px] font-semibold text-text-muted uppercase block">
                Adesão dos Passageiros
              </span>
              <span className="text-lg font-bold text-primary tabular-nums">
                {stats.totalGuestOptIns} de {guests.length}
              </span>
            </div>
          </div>

          {/* Barra de Filtro e Info */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                value={guestSearchFilter}
                onChange={(e) => setGuestSearchFilter(e.target.value)}
                placeholder="Buscar passageiro por nome ou doc..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-border bg-surface text-xs text-text-body placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span className="inline-block w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500" />
              <span>Linha em verde = Pagamento Confirmado</span>
            </div>
          </div>

          {/* Estado sem adicionais configurados */}
          {addons.length === 0 ? (
            <div className="bg-surface rounded-2xl border border-dashed border-border p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Sliders size={24} />
              </div>
              <h3 className="text-sm font-bold text-text-title">
                Nenhum adicional configurado
              </h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Crie primeiro os adicionais na aba <strong>Config</strong> para poder
                marcar as opções e gerenciar os pagamentos dos passageiros.
              </p>
              <button
                type="button"
                onClick={() => setSubTab("config")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors cursor-pointer"
              >
                <Sliders size={14} /> Ir para Configuração
              </button>
            </div>
          ) : guests.length === 0 ? (
            <div className="bg-surface rounded-2xl border border-dashed border-border p-10 text-center space-y-2">
              <AlertCircle size={28} className="text-amber-500 mx-auto" />
              <h3 className="text-sm font-bold text-text-title">
                Nenhum hóspede na Room List
              </h3>
              <p className="text-xs text-text-muted max-w-md mx-auto">
                Adicione passageiros aos quartos na aba <strong>Room List</strong> para
                que eles apareçam nesta tabela de adicionais.
              </p>
            </div>
          ) : (
            /* Tabela de Adesão */
            <div className="bg-surface rounded-2xl border border-border shadow-shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-subtle border-b border-border text-[11px] font-semibold text-text-muted uppercase">
                      <th className="py-3 px-4 min-w-[220px]">Passageiro</th>
                      <th className="py-3 px-3 text-center min-w-[90px]">Idade</th>
                      {addons.map((addon) => {
                        const optCount = addon.assignedGuestIds?.length || 0;
                        return (
                          <th
                            key={addon.id}
                            className="py-3 px-3 text-center min-w-[130px] border-l border-border/60"
                          >
                            <div className="truncate font-bold text-text-title">
                              {addon.title || "Adicional"}
                            </div>
                            <span className="text-[10px] font-normal text-text-muted">
                              ({optCount} {optCount === 1 ? "vaga" : "vagas"})
                            </span>
                          </th>
                        );
                      })}
                      <th className="py-3 px-4 text-right min-w-[110px] border-l border-border/60">
                        Subtotal
                      </th>
                      <th className="py-3 px-4 min-w-[160px]">Forma Pagamento</th>
                      <th className="py-3 px-4 text-center min-w-[100px]">Já Pagou?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredGuests.map((guest) => {
                      const bDate = getGuestBDate(guest);
                      const age = calculateAge(bDate);
                      const paymentInfo = guestPayments[guest.id] || {};
                      const isPaid = !!paymentInfo.paid;

                      // Calcula subtotal para o passageiro
                      let guestSubtotal = 0;
                      addons.forEach((addon) => {
                        if (addon.assignedGuestIds?.includes(guest.id)) {
                          const { price } = getAddonPriceForGuest(addon, age);
                          guestSubtotal += price;
                        }
                      });

                      return (
                        <tr
                          key={guest.id}
                          className={`transition-colors ${
                            isPaid
                              ? "bg-emerald-500/10 dark:bg-emerald-950/25 border-l-4 border-l-emerald-500 text-emerald-950 dark:text-emerald-100"
                              : "hover:bg-surface-subtle"
                          }`}
                        >
                          {/* Nome e documento do Passageiro */}
                          <td className="py-2.5 px-4 font-medium">
                            <div className="truncate">
                              <span
                                className={`text-xs font-semibold ${
                                  isPaid
                                    ? "text-emerald-900 dark:text-emerald-200"
                                    : "text-text-title"
                                }`}
                              >
                                {guest.nome || "Hóspede sem nome"}
                              </span>
                              {guest.documento && (
                                <span className="block text-[10px] text-text-muted/70">
                                  Doc: {guest.documento}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Idade calculada */}
                          <td className="py-2.5 px-3 text-center">
                            {age !== null ? (
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                  isPaid
                                    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                    : "bg-surface-subtle border border-border text-text-title"
                                }`}
                              >
                                {age} {age === 1 ? "ano" : "anos"}
                              </span>
                            ) : (
                              <span className="text-[10px] text-text-muted font-normal">
                                {guest.tipo || "Adulto"}
                              </span>
                            )}
                          </td>

                          {/* Colunas dos Adicionais com Check e Preço por Idade */}
                          {addons.map((addon) => {
                            const isChecked = addon.assignedGuestIds?.includes(
                              guest.id
                            );
                            const { price, tierLabel } = getAddonPriceForGuest(
                              addon,
                              age
                            );

                            return (
                              <td
                                key={addon.id}
                                className="py-2 px-3 text-center border-l border-border/40"
                              >
                                <label className="inline-flex flex-col items-center justify-center cursor-pointer p-1 rounded-lg hover:bg-surface/60 transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() =>
                                      handleToggleGuestAddon(addon.id, guest.id)
                                    }
                                    className="w-4 h-4 rounded text-primary focus:ring-primary focus:ring-1 border-border cursor-pointer transition-all"
                                  />
                                  {isChecked && (
                                    <span
                                      className={`text-[10px] font-bold mt-0.5 tabular-nums ${
                                        isPaid
                                          ? "text-emerald-700 dark:text-emerald-300"
                                          : "text-primary"
                                      }`}
                                      title={tierLabel ? `Faixa: ${tierLabel}` : ""}
                                    >
                                      {fmt(price)}
                                    </span>
                                  )}
                                </label>
                              </td>
                            );
                          })}

                          {/* Subtotal da linha */}
                          <td className="py-2.5 px-4 text-right font-bold text-xs tabular-nums border-l border-border/40">
                            <span
                              className={
                                isPaid
                                  ? "text-emerald-700 dark:text-emerald-300 font-extrabold"
                                  : guestSubtotal > 0
                                  ? "text-primary"
                                  : "text-text-muted"
                              }
                            >
                              {fmt(guestSubtotal)}
                            </span>
                          </td>

                          {/* Método de Pagamento */}
                          <td className="py-2 px-4">
                            <select
                              value={paymentInfo.paymentMethod || "PIX"}
                              onChange={(e) =>
                                handleUpdatePaymentMethod(
                                  guest.id,
                                  e.target.value
                                )
                              }
                              className={`w-full px-2.5 py-1 rounded-lg border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-all ${
                                isPaid
                                  ? "bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-500/40 text-emerald-900 dark:text-emerald-200"
                                  : "bg-surface border-border text-text-body"
                              }`}
                            >
                              {PAYMENT_METHODS.map((method) => (
                                <option key={method} value={method}>
                                  {method}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Já Pagou? (Checkbox que deixa a linha verde) */}
                          <td className="py-2 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePaid(guest.id)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                isPaid
                                  ? "bg-emerald-500 text-white shadow-xs hover:bg-emerald-600"
                                  : "bg-surface-subtle hover:bg-surface border border-border text-text-muted hover:text-text-title"
                              }`}
                              title={
                                isPaid
                                  ? "Clique para marcar como Pendente"
                                  : "Clique para confirmar que já foi pago"
                              }
                            >
                              <div
                                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                                  isPaid
                                    ? "bg-white text-emerald-600 border-white"
                                    : "border-text-muted/60"
                                }`}
                              >
                                {isPaid && <Check size={10} strokeWidth={3} />}
                              </div>
                              <span>{isPaid ? "Pago" : "Pendente"}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Rodapé com Totais Consolidados */}
                  <tfoot>
                    <tr className="bg-surface-subtle/80 border-t-2 border-border font-bold text-xs text-text-title">
                      <td className="py-3 px-4" colSpan={2}>
                        Total ({filteredGuests.length} passageiros)
                      </td>
                      {addons.map((addon) => {
                        const optCount = addon.assignedGuestIds?.length || 0;
                        let addonColTotal = 0;
                        for (const g of filteredGuests) {
                          if (addon.assignedGuestIds?.includes(g.id)) {
                            const bDate = getGuestBDate(g);
                            const age = calculateAge(bDate);
                            addonColTotal += getAddonPriceForGuest(addon, age).price;
                          }
                        }

                        return (
                          <td
                            key={addon.id}
                            className="py-3 px-3 text-center border-l border-border/60"
                          >
                            <span className="text-[11px] block tabular-nums">
                              {fmt(addonColTotal)}
                            </span>
                            <span className="text-[10px] text-text-muted font-normal">
                              {optCount} {optCount === 1 ? "adesão" : "adesões"}
                            </span>
                          </td>
                        );
                      })}
                      <td className="py-3 px-4 text-right border-l border-border/60 tabular-nums font-extrabold text-sm text-primary">
                        {fmt(stats.grandTotal)}
                      </td>
                      <td className="py-3 px-4" colSpan={2}>
                        <div className="flex items-center justify-end gap-3 text-[11px]">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            Pago: {fmt(stats.totalPaid)}
                          </span>
                          <span className="text-border">|</span>
                          <span className="text-amber-600 dark:text-amber-400 font-bold">
                            Pendente: {fmt(stats.totalPending)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TELA 2: CONFIG (Cards de Configuração de Adicionais) */}
      {/* ======================================================== */}
      {subTab === "config" && (
        <div className="space-y-4">
          {addons.length === 0 ? (
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
                  Defina valores por faixas de idade (Custo e Lucro).
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
          ) : (
            <div className="space-y-4">
              {addons.map((addon, index) => {
                const optInCount = addon.assignedGuestIds?.length || 0;
                const tiers = addon.ageTiers || [];

                return (
                  <motion.div
                    key={addon.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-surface rounded-2xl border border-border shadow-shadow-card overflow-hidden hover:shadow-shadow-hover transition-all"
                  >
                    {/* Header do Card */}
                    <div className="p-4 sm:p-5 border-b border-border bg-surface-subtle flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs shrink-0">
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          value={addon.title}
                          onChange={(e) =>
                            handleUpdateAddon(addon.id, {
                              title: e.target.value,
                            })
                          }
                          placeholder="Título do Adicional (ex: Macuco Safari)"
                          className="text-base font-bold text-text-title bg-transparent border-none outline-none focus:ring-0 w-full placeholder:text-text-muted/60"
                        />
                      </div>

                      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                        <span className="text-xs text-text-muted font-medium px-2.5 py-1 rounded-lg bg-surface border border-border">
                          {optInCount} {optInCount === 1 ? "adesão" : "adesões"}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDeleteAddon(addon.id)}
                          className="p-2 rounded-xl text-text-muted hover:text-status-danger hover:bg-status-danger-bg transition-colors cursor-pointer"
                          title="Excluir Adicional"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Corpo do Card */}
                    <div className="p-4 sm:p-5 space-y-4">
                      {/* Localização e Observações */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                            <MapPin size={13} className="text-primary" />
                            <span>Localização no Mapa</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setSelectedAddonForMap(addon)}
                            className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                              addon.location
                                ? "bg-primary/5 border-primary/30 text-text-title hover:bg-primary/10"
                                : "bg-surface-subtle border-dashed border-border hover:border-primary text-text-muted hover:text-primary"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate pr-2">
                              <MapPin
                                size={14}
                                className={
                                  addon.location
                                    ? "text-primary shrink-0"
                                    : "text-text-muted shrink-0"
                                }
                              />
                              <span className="truncate">
                                {addon.location ||
                                  "Definir endereço / local no mapa"}
                              </span>
                            </div>
                            <span className="text-[11px] text-primary font-bold shrink-0">
                              {addon.location ? "Alterar Mapa" : "Abrir Mapa"}
                            </span>
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                            <FileText size={13} className="text-primary" />
                            <span>Observações / Instruções</span>
                          </label>
                          <input
                            type="text"
                            value={addon.observation || ""}
                            onChange={(e) =>
                              handleUpdateAddon(addon.id, {
                                observation: e.target.value,
                              })
                            }
                            placeholder="Ex: Saída às 14h do saguão. Não inclui almoço."
                            className="w-full px-3 py-2 rounded-xl border border-border bg-surface-subtle text-xs text-text-body placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface"
                          />
                        </div>
                      </div>

                      {/* Seção de Faixas de Idade e Valores (Custo e Lucro) */}
                      <div className="pt-3 border-t border-border/70 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-primary" />
                            <span className="text-xs font-bold text-text-title uppercase tracking-wide">
                              Configuração por Faixa de Idade (Custo e Lucro)
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddAgeTier(addon.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-primary text-text-title text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Plus size={13} className="text-primary" />
                            <span>Adicionar Faixa Etária</span>
                          </button>
                        </div>

                        <p className="text-[11px] text-text-muted">
                          Configure valores específicos por faixa etária (ex: 0 a 3 anos, 12 a 14 anos). Cada faixa calcula o Custo + Lucro = Preço para o passageiro.
                        </p>

                        {tiers.length === 0 ? (
                          <div className="p-4 rounded-xl bg-surface-subtle border border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="text-xs text-text-muted">
                              Nenhuma faixa etária configurada. O valor padrão será aplicado a todos os passageiros.
                            </div>
                            <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-xl border border-border">
                              <span className="text-xs font-bold text-text-muted">
                                Preço Padrão R$
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={addon.price || ""}
                                onChange={(e) =>
                                  handleUpdateAddon(addon.id, {
                                    price: parseFloat(e.target.value) || 0,
                                  })
                                }
                                placeholder="0,00"
                                className="w-24 text-sm font-bold text-text-title bg-transparent border-none outline-none text-right focus:ring-0"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-surface-subtle border-b border-border text-[11px] font-semibold text-text-muted uppercase">
                                  <th className="py-2.5 px-3 min-w-[140px]">
                                    Faixa Etária (Idade)
                                  </th>
                                  <th className="py-2.5 px-3 min-w-[140px]">
                                    Rótulo / Descrição
                                  </th>
                                  <th className="py-2.5 px-3 text-right min-w-[100px]">
                                    Valor de Custo (R$)
                                  </th>
                                  <th className="py-2.5 px-3 text-right min-w-[100px]">
                                    Valor de Lucro (R$)
                                  </th>
                                  <th className="py-2.5 px-3 text-right min-w-[120px]">
                                    Preço Final (R$)
                                  </th>
                                  <th className="py-2.5 px-2 text-center w-10"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/60">
                                {tiers.map((tier) => (
                                  <tr key={tier.id} className="hover:bg-surface-subtle/50">
                                    {/* Intervalo de idade */}
                                    <td className="py-2 px-3">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] text-text-muted">De</span>
                                        <input
                                          type="number"
                                          min="0"
                                          max="120"
                                          value={tier.minAge}
                                          onChange={(e) =>
                                            handleUpdateAgeTier(addon.id, tier.id, {
                                              minAge: parseInt(e.target.value) || 0,
                                            })
                                          }
                                          className="w-12 px-1.5 py-1 rounded-md border border-border bg-surface text-center font-bold text-xs"
                                        />
                                        <span className="text-[11px] text-text-muted">até</span>
                                        <input
                                          type="number"
                                          min="0"
                                          max="120"
                                          value={tier.maxAge}
                                          onChange={(e) =>
                                            handleUpdateAgeTier(addon.id, tier.id, {
                                              maxAge: parseInt(e.target.value) || 0,
                                            })
                                          }
                                          className="w-12 px-1.5 py-1 rounded-md border border-border bg-surface text-center font-bold text-xs"
                                        />
                                        <span className="text-[11px] text-text-muted">anos</span>
                                      </div>
                                    </td>

                                    {/* Rótulo */}
                                    <td className="py-2 px-3">
                                      <input
                                        type="text"
                                        value={tier.label || ""}
                                        placeholder="Ex: 0 a 3 anos (Bebê)"
                                        onChange={(e) =>
                                          handleUpdateAgeTier(addon.id, tier.id, {
                                            label: e.target.value,
                                          })
                                        }
                                        className="w-full px-2 py-1 rounded-md border border-border bg-surface text-xs text-text-body focus:outline-none focus:border-primary"
                                      />
                                    </td>

                                    {/* Custo */}
                                    <td className="py-2 px-3 text-right">
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={tier.cost ?? 0}
                                        onChange={(e) =>
                                          handleUpdateAgeTier(addon.id, tier.id, {
                                            cost: parseFloat(e.target.value) || 0,
                                          })
                                        }
                                        className="w-24 px-2 py-1 rounded-md border border-border bg-surface text-right text-xs font-semibold text-text-body focus:outline-none focus:border-primary"
                                      />
                                    </td>

                                    {/* Lucro */}
                                    <td className="py-2 px-3 text-right">
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={tier.profit ?? 0}
                                        onChange={(e) =>
                                          handleUpdateAgeTier(addon.id, tier.id, {
                                            profit: parseFloat(e.target.value) || 0,
                                          })
                                        }
                                        className="w-24 px-2 py-1 rounded-md border border-border bg-surface text-right text-xs font-semibold text-amber-600 dark:text-amber-400 focus:outline-none focus:border-primary"
                                      />
                                    </td>

                                    {/* Preço de Venda = Custo + Lucro */}
                                    <td className="py-2 px-3 text-right">
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={tier.price ?? 0}
                                        onChange={(e) =>
                                          handleUpdateAgeTier(addon.id, tier.id, {
                                            price: parseFloat(e.target.value) || 0,
                                          })
                                        }
                                        className="w-24 px-2 py-1 rounded-md border border-border bg-surface text-right text-xs font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-primary"
                                      />
                                    </td>

                                    {/* Botão de remover faixa */}
                                    <td className="py-2 px-2 text-center">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteAgeTier(addon.id, tier.id)
                                        }
                                        className="p-1 rounded-md text-text-muted hover:text-status-danger hover:bg-status-danger-bg transition-colors cursor-pointer"
                                        title="Remover faixa etária"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Drawer do Mapa Leaflet */}
      <AddonMapDrawer
        isOpen={!!selectedAddonForMap}
        addon={selectedAddonForMap}
        onClose={() => setSelectedAddonForMap(null)}
        onUpdateLocation={(addonId, locData) => {
          handleUpdateAddon(addonId, locData);
          if (selectedAddonForMap) {
            setSelectedAddonForMap({ ...selectedAddonForMap, ...locData });
          }
        }}
      />
    </div>
  );
}
