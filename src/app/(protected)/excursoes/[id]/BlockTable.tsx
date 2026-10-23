"use client";

import { useState } from "react";
import { Plus, Trash2, Plane, DollarSign, Calendar, Users, ChevronDown, ChevronUp } from "lucide-react";
import type { EditorBlock, BlockData, RowStatus, BlockAgePricing, CustomAgeTier, PrazoPagamentoItem } from "@/lib/editor-types";
import { getBlockBaseUnitCost, parseNum, formatBRL } from "@/lib/package-calc";
import { AereoFlightSection } from "./AereoFlightSection";

interface BlockTableProps {
  block: EditorBlock;
  onUpdate: (data: BlockData) => void;
}

const inputCls =
  "w-full px-2 py-1.5 rounded-md border border-transparent bg-transparent text-text-body text-sm focus:outline-none focus:border-primary focus:bg-surface transition-all";
const numCls = `${inputCls} text-right tabular-nums`;
const thCls = "px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide";
const tdCls = "px-2 py-1 border-t border-border-soft";

function StatusSelect({
  value,
  onChange,
}: {
  value: RowStatus;
  onChange: (v: RowStatus) => void;
}) {
  const styles: Record<RowStatus, string> = {
    PENDENTE: "bg-status-danger-bg text-status-danger",
    COTADO: "bg-status-info-bg text-status-info",
    CONFIRMADO: "bg-status-success-bg text-status-success",
    CANCELADO: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  };

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as RowStatus)}
      className={`px-2 py-1 rounded-full text-xs font-semibold border-none outline-none cursor-pointer transition-all ${styles[value] || styles.COTADO}`}
    >
      <option value="PENDENTE" className="bg-surface text-text-title py-1">PENDENTE</option>
      <option value="COTADO" className="bg-surface text-text-title py-1">COTADO</option>
      <option value="CONFIRMADO" className="bg-surface text-text-title py-1">CONFIRMADO</option>
      <option value="CANCELADO" className="bg-surface text-text-title py-1">CANCELADO</option>
    </select>
  );
}

function DeleteRowBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-1 rounded text-text-muted hover:text-status-danger hover:bg-status-danger-bg transition-colors"
      title="Remover linha"
    >
      <Trash2 size={14} />
    </button>
  );
}

function toInputDate(val: unknown): string {
  if (!val || typeof val !== "string") return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const match = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return "";
}

function BlockObservation({
  value,
  onChange,
  placeholder = "Observações...",
}: {
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mt-4 pt-3 border-t border-border/40">
      <label className="block text-xs text-text-muted">
        <span className="block mb-1 font-medium text-text-title">Observação</span>
        <input
          className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}

function BlockAgePricingSection({
  agePricing,
  defaultBaseCost = 0,
  onChange,
}: {
  agePricing?: BlockAgePricing;
  defaultBaseCost?: number;
  onChange: (v: BlockAgePricing) => void;
}) {
  const tiers: CustomAgeTier[] = Array.isArray(agePricing?.tiers) ? agePricing.tiers : [];
  const [isOpen, setIsOpen] = useState(false);

  const saveTiers = (newTiers: CustomAgeTier[]) => {
    onChange({
      ...(agePricing || {}),
      tiers: newTiers,
    });
  };

  const handleAddTier = (template?: { label: string; minAge: number; maxAge: number; price?: string }) => {
    const newTier: CustomAgeTier = {
      id: `tier_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: template?.label || (tiers.length === 0 ? "Criança" : `Faixa ${tiers.length + 1}`),
      minAge: template?.minAge ?? 2,
      maxAge: template?.maxAge ?? 11,
      price: template?.price ?? (defaultBaseCost > 0 ? formatBRL(defaultBaseCost * 0.5, false) : "0,00"),
    };
    saveTiers([...tiers, newTier]);
    setIsOpen(true);
  };

  const handleUpdateTier = (idx: number, patch: Partial<CustomAgeTier>) => {
    const next = [...tiers];
    next[idx] = { ...next[idx], ...patch };
    saveTiers(next);
  };

  const handleRemoveTier = (idx: number) => {
    const next = tiers.filter((_, i) => i !== idx);
    saveTiers(next);
  };

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="mt-4 pt-3 border-t border-border/40">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-xs font-bold text-text-title hover:text-primary transition-colors cursor-pointer group"
        >
          <div className="p-1 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
            <Users size={13} />
          </div>
          <span>
            Precificação por Faixa Etária{" "}
            {tiers.length > 0 ? (
              <span className="text-primary font-semibold">
                ({tiers.length} {tiers.length === 1 ? "faixa criada" : "faixas criadas"})
              </span>
            ) : (
              <span className="text-text-muted font-normal text-[11px]">(opcional)</span>
            )}
          </span>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {/* Resumo compacto de todas as faixas configuradas */}
        <div className="flex items-center flex-wrap gap-1.5 text-[11px] font-medium text-text-muted">
          {tiers.length === 0 ? (
            <span className="px-2 py-0.5 rounded-md bg-surface-subtle border border-border/50 text-text-muted italic text-[11px]">
              Sem faixas adicionais (valor padrão do bloco aplicado)
            </span>
          ) : (
            tiers.map((t, idx) => (
              <span
                key={t.id || idx}
                className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[11px] font-semibold"
              >
                {t.label || "Sem nome"} ({t.minAge} a {t.maxAge >= 999 ? "+" : `${t.maxAge}a`}):{" "}
                <strong className="text-text-title">{fmt(parseNum(t.price))}</strong>
              </span>
            ))
          )}
        </div>
      </div>

      {isOpen && (
        <div className="mt-3 p-4 bg-surface-subtle/70 rounded-xl border border-border/70 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-text-title">
                Faixas Etárias Personalizadas deste Bloco
              </h4>
              <p className="text-[11px] text-text-muted mt-0.5">
                Crie livremente as faixas de idade que desejar (ex: Bebê 0 a 1 ano, Criança 2 a 5 anos, etc.). Ao registrar o passageiro na Room List com a data de nascimento, o sistema detecta a idade e aplica o valor deste bloco no Checkout automaticamente.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleAddTier()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-hover shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus size={13} />
              <span>+ Criar Faixa Etária</span>
            </button>
          </div>

          {/* Lista de Faixas Customizáveis */}
          <div className="space-y-2.5">
            {tiers.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-border/80 rounded-xl bg-surface/70 space-y-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                  <Users size={18} />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-text-title">
                    Nenhuma faixa etária criada para este bloco
                  </h5>
                  <p className="text-[11px] text-text-muted max-w-md mx-auto mt-0.5">
                    Todos os passageiros pagarão a tarifa base padrão deste bloco. Caso queira cobrar valores diferenciados por idade, crie suas próprias faixas abaixo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddTier()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-hover shadow-xs transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Criar Minha Primeira Faixa Etária</span>
                </button>
              </div>
            ) : (
              tiers.map((tier, idx) => (
                <div
                  key={tier.id || idx}
                  className="p-3 bg-surface rounded-xl border border-border/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 flex-1 items-center">
                    {/* Nome da Faixa */}
                    <div className="sm:col-span-5">
                      <label className="text-[10px] font-bold text-text-muted uppercase block mb-0.5">
                        Nome da Faixa Etária
                      </label>
                      <input
                        type="text"
                        value={tier.label}
                        onChange={(e) => handleUpdateTier(idx, { label: e.target.value })}
                        placeholder="Ex: Criança 02 a 05 anos, Bebê, Adulto..."
                        className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-border bg-surface text-text-title focus:outline-none focus:border-primary"
                      />
                    </div>

                    {/* Idade De */}
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-text-muted uppercase block mb-0.5">
                        De (idade)
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min={0}
                          max={120}
                          value={tier.minAge}
                          onChange={(e) => handleUpdateTier(idx, { minAge: parseInt(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 text-xs font-bold rounded-lg border border-border bg-surface text-text-title text-center focus:outline-none focus:border-primary"
                        />
                        <span className="text-[10px] text-text-muted ml-1 shrink-0">anos</span>
                      </div>
                    </div>

                    {/* Idade Até */}
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-text-muted uppercase block mb-0.5">
                        Até (idade)
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min={0}
                          max={999}
                          value={tier.maxAge >= 999 ? "" : tier.maxAge}
                          placeholder="Sem limite"
                          onChange={(e) => handleUpdateTier(idx, { maxAge: e.target.value === "" ? 999 : parseInt(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 text-xs font-bold rounded-lg border border-border bg-surface text-text-title text-center focus:outline-none focus:border-primary"
                        />
                        <span className="text-[10px] text-text-muted ml-1 shrink-0">anos</span>
                      </div>
                    </div>

                    {/* Valor do Bloco */}
                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-bold text-text-muted uppercase block mb-0.5">
                        Valor neste Bloco
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-xs text-text-muted font-bold">R$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={tier.price}
                          onChange={(e) => handleUpdateTier(idx, { price: e.target.value })}
                          onBlur={(e) => {
                            if (e.target.value) {
                              handleUpdateTier(idx, { price: formatBRL(e.target.value, false) });
                            }
                          }}
                          placeholder="0,00"
                          className="w-full pl-8 pr-2.5 py-1.5 text-xs font-bold rounded-lg border border-border bg-surface text-text-title focus:outline-none focus:border-primary tabular-nums"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Ação de Remoção */}
                  <div className="flex items-center justify-end shrink-0 pt-1 md:pt-0">
                    <button
                      type="button"
                      onClick={() => handleRemoveTier(idx)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-status-danger hover:bg-status-danger/10 transition-colors cursor-pointer"
                      title="Excluir esta faixa etária"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sugestões de Faixas Comuns para Adicionar Rápido */}
          <div className="pt-2 border-t border-border/50 flex items-center gap-1.5 flex-wrap text-xs text-text-muted">
            <span className="font-semibold text-[11px]">Sugestões rápidas:</span>
            <button
              type="button"
              onClick={() => handleAddTier({ label: "Adulto", minAge: 12, maxAge: 999, price: defaultBaseCost > 0 ? formatBRL(defaultBaseCost, false) : "0,00" })}
              className="text-[11px] px-2 py-0.5 rounded-md bg-surface border border-border hover:border-primary text-text-body transition-colors cursor-pointer"
            >
              + Adulto (12+ anos)
            </button>
            <button
              type="button"
              onClick={() => handleAddTier({ label: "Criança 02 a 05 anos", minAge: 2, maxAge: 5, price: defaultBaseCost > 0 ? formatBRL(defaultBaseCost * 0.5, false) : "0,00" })}
              className="text-[11px] px-2 py-0.5 rounded-md bg-surface border border-border hover:border-primary text-text-body transition-colors cursor-pointer"
            >
              + Criança (2 a 5 anos)
            </button>
            <button
              type="button"
              onClick={() => handleAddTier({ label: "Criança 06 a 11 anos", minAge: 6, maxAge: 11, price: defaultBaseCost > 0 ? formatBRL(defaultBaseCost * 0.75, false) : "0,00" })}
              className="text-[11px] px-2 py-0.5 rounded-md bg-surface border border-border hover:border-primary text-text-body transition-colors cursor-pointer"
            >
              + Criança (6 a 11 anos)
            </button>
            <button
              type="button"
              onClick={() => handleAddTier({ label: "Bebê / Colo", minAge: 0, maxAge: 1, price: "0,00" })}
              className="text-[11px] px-2 py-0.5 rounded-md bg-status-success/10 hover:bg-status-success/20 text-status-success border border-status-success/30 font-semibold transition-colors cursor-pointer"
            >
              + Bebê / Colo (0 a 1 ano)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BlockFinalPaymentDeadlines({
  prazos,
  legacyPrazoTotal,
  balanceToPay,
  onChange,
}: {
  prazos?: PrazoPagamentoItem[];
  legacyPrazoTotal?: string;
  balanceToPay?: number;
  onChange: (prazos: PrazoPagamentoItem[], primaryDate: string) => void;
}) {
  const rawList: PrazoPagamentoItem[] =
    Array.isArray(prazos) && prazos.length > 0
      ? prazos
      : legacyPrazoTotal
      ? [{ id: "prazo-1", data: toInputDate(legacyPrazoTotal), valor: "" }]
      : [{ id: "prazo-1", data: "", valor: "" }];

  const updateList = (newList: PrazoPagamentoItem[]) => {
    const firstDate = newList.find((p) => p.data?.trim())?.data || newList[0]?.data || "";
    onChange(newList, firstDate);
  };

  const handleDateChange = (idx: number, dateVal: string) => {
    const next = [...rawList];
    next[idx] = { ...next[idx], data: dateVal };
    updateList(next);
  };

  const handleValorChange = (idx: number, valorVal: string) => {
    const next = [...rawList];
    next[idx] = { ...next[idx], valor: valorVal };
    updateList(next);
  };

  const handlePagoChange = (idx: number, pagoVal: boolean) => {
    const next = [...rawList];
    next[idx] = {
      ...next[idx],
      pago: pagoVal,
      dataPagamento: pagoVal ? new Date().toISOString() : undefined,
    };
    updateList(next);
  };

  const handleAddPrazo = () => {
    const nextId = "prazo-" + Math.random().toString(36).substring(2, 9);
    const next = [...rawList, { id: nextId, data: "", valor: "", pago: false }];
    updateList(next);
  };

  const handleRemovePrazo = (idx: number) => {
    if (rawList.length <= 1) {
      updateList([{ id: "prazo-1", data: "", valor: "", pago: false }]);
      return;
    }
    const next = rawList.filter((_, i) => i !== idx);
    updateList(next);
  };

  const isDivided = rawList.length > 1;
  const totalInformado = rawList.reduce((acc, curr) => acc + (parseNum(curr.valor) || 0), 0);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-title">
            {isDivided ? "Prazos de Pagamento Final (Dividido)" : "Prazo Pagamento Final"}
          </span>
          {isDivided ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary border border-primary/30">
              Dividido em {rawList.length} parcelas
            </span>
          ) : (
            <span className="text-[11px] text-text-muted">(parcela única ou dividida)</span>
          )}
        </div>

        {balanceToPay !== undefined && balanceToPay > 0 && (
          <div className="text-[11px] text-text-muted">
            Saldo a quitar: <span className="font-mono font-bold text-text-title">{formatBRL(balanceToPay)}</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {rawList.map((item, idx) => (
          <div
            key={item.id || idx}
            className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 rounded-lg border transition-all ${
              item.pago
                ? "bg-emerald-500/10 border-emerald-500/30"
                : isDivided
                ? "bg-surface border-border shadow-xs"
                : "bg-surface/60 border-border/80"
            }`}
          >
            <div className="flex items-center gap-1.5 shrink-0 min-w-[95px]">
              <span className="text-[11px] font-bold text-text-title px-2 py-1 rounded-md bg-surface-subtle border border-border/80">
                {isDivided ? `${idx + 1}º Prazo` : "Vencimento"}
              </span>
            </div>

            <div className="flex-1">
              <input
                type="date"
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-xs font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                value={toInputDate(item.data)}
                onChange={(e) => handleDateChange(idx, e.target.value)}
              />
            </div>

            <div className="w-full sm:w-44 relative flex items-center">
              <span className="absolute left-2.5 text-xs text-text-muted font-bold">R$</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Valor (opcional)"
                className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-xs font-semibold text-right tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={item.valor ?? ""}
                onChange={(e) => handleValorChange(idx, e.target.value)}
                onBlur={(e) => {
                  if (e.target.value) {
                    handleValorChange(idx, formatBRL(e.target.value, false));
                  }
                }}
              />
            </div>

            <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-surface text-xs font-semibold cursor-pointer shrink-0 transition-colors select-none hover:bg-surface-subtle">
              <input
                type="checkbox"
                checked={!!item.pago}
                onChange={(e) => handlePagoChange(idx, e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-emerald-600 cursor-pointer"
              />
              <span className={item.pago ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-text-muted"}>
                {item.pago ? "Pago" : "Pagar"}
              </span>
            </label>

            {isDivided && (
              <button
                type="button"
                onClick={() => handleRemovePrazo(idx)}
                className="p-1.5 rounded-lg text-text-muted hover:text-status-danger hover:bg-status-danger/10 transition-colors cursor-pointer shrink-0 self-end sm:self-center"
                title="Remover este prazo"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={handleAddPrazo}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-strong px-2.5 py-1 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer"
        >
          <Plus size={13} />
          {isDivided ? "Adicionar outro prazo final" : "Dividir pagamento em mais prazos"}
        </button>

        {isDivided && totalInformado > 0 && (
          <div className="text-[11px] font-semibold text-text-muted">
            Soma informada:{" "}
            <span className="font-mono font-bold text-primary">
              {formatBRL(totalInformado)}
            </span>
            {balanceToPay !== undefined && balanceToPay > 0 && (
              <span className={`ml-1.5 font-bold ${Math.abs(balanceToPay - totalInformado) < 0.01 ? "text-status-success" : "text-amber-500"}`}>
                ({Math.abs(balanceToPay - totalInformado) < 0.01 ? "✓ Quitado exato" : `Diferença: ${formatBRL(balanceToPay - totalInformado)}`})
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function BlockTable({ block, onUpdate }: BlockTableProps) {
  const d = block.data;

  const set = (key: string, value: unknown) => onUpdate({ ...d, [key]: value });

  const setRow = (listKey: string, idx: number, key: string, value: unknown) => {
    const list = [...(d[listKey] ?? [])];
    list[idx] = { ...list[idx], [key]: value };
    onUpdate({ ...d, [listKey]: list });
  };

  const addRow = (listKey: string, template: Record<string, unknown>) =>
    onUpdate({ ...d, [listKey]: [...(d[listKey] ?? []), template] });

  const removeRow = (listKey: string, idx: number) => {
    const nextList = (d[listKey] ?? []).filter((_: unknown, i: number) => i !== idx);
    const patch: Record<string, unknown> = { [listKey]: nextList };

    if (listKey === "rooms" && Array.isArray(d.roomList)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const remainingTypes = new Set(nextList.map((r: any) => r.tipo?.trim().toLowerCase()));
      // Limpa do roomList quartos vazios cujos tipos foram removidos do card
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cleanedRoomList = d.roomList.filter((r: any) => {
        const isConfigured = remainingTypes.has(r.tipo?.trim().toLowerCase());
        const hasGuests = (r.hospedes || []).length > 0;
        return isConfigured || hasGuests;
      });
      patch.roomList = cleanedRoomList;
    }

    onUpdate({
      ...d,
      ...patch,
    });
  };

  switch (block.categoryId) {
    // ---- Itens Inclusos ----
    case "itens_inclusos":
      return (
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={`${thCls} text-left w-[25%]`}>Tipo de Item</th>
                <th className={`${thCls} text-left w-[35%]`}>Fornecedor / Descrição</th>
                <th className={`${thCls} text-right w-[18%]`}>Custo Estimado (R$)</th>
                <th className={`${thCls} text-center w-[16%]`}>Status</th>
                <th className="w-[6%]" />
              </tr>
            </thead>
            <tbody>
              {(d.rows ?? []).map(
                (
                  r: { type: string; icon: string; color: string; fornecedor: string; custo: string; status: RowStatus },
                  i: number
                ) => (
                  <tr key={i} style={{ borderLeft: `4px solid ${r.color || "#D97706"}` }}>
                    <td className={tdCls}>
                      <div className="flex items-center gap-1.5">
                        <span>{r.icon || "📦"}</span>
                        <input className={inputCls} value={r.type} onChange={(e) => setRow("rows", i, "type", e.target.value)} />
                      </div>
                    </td>
                    <td className={tdCls}>
                      <input className={inputCls} value={r.fornecedor} placeholder="Fornecedor..." onChange={(e) => setRow("rows", i, "fornecedor", e.target.value)} />
                    </td>
                    <td className={tdCls}>
                      <input className={numCls} value={r.custo} onChange={(e) => setRow("rows", i, "custo", e.target.value)} />
                    </td>
                    <td className={`${tdCls} text-center`}>
                      <StatusSelect value={r.status} onChange={(v) => setRow("rows", i, "status", v)} />
                    </td>
                    <td className={`${tdCls} text-center`}>
                      <DeleteRowBtn onClick={() => removeRow("rows", i)} />
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          <button
            onClick={() =>
              addRow("rows", { type: "Novo Item", icon: "📦", color: "#D97706", fornecedor: "", custo: "0.00", status: "PENDENTE" })
            }
            className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors cursor-pointer"
          >
            <Plus size={14} /> Adicionar Item
          </button>
          <BlockObservation
            value={d.observation}
            onChange={(v) => set("observation", v)}
            placeholder="Observações sobre itens inclusos..."
          />
        </div>
      );

    // ---- Personalizados ----
    case "personalizados": {
      const vagasNum = parseNum(d.vagas) || 20;

      const handleVagasChange = (newVagas: string) => {
        const vNum = parseNum(newVagas) || 1;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = (d.rows ?? []).map((r: any) => {
          const unit = parseNum(r.valor ?? r.custo);
          return {
            ...r,
            total: unit > 0 ? formatBRL(unit * vNum, false) : r.total,
          };
        });

        let totalGeral = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const r of rows) {
          totalGeral += parseNum(r.total ?? (parseNum(r.valor ?? r.custo) * vNum));
        }

        onUpdate({
          ...d,
          vagas: newVagas,
          rows,
          totalDespesas: formatBRL(totalGeral, false),
        });
      };

      const handleRowValorChange = (idx: number, newVal: string) => {
        const rows = [...(d.rows ?? [])];
        const vNum = parseNum(newVal);
        const total = vNum > 0 ? formatBRL(vNum * vagasNum, false) : (newVal ? "0,00" : "");
        rows[idx] = {
          ...rows[idx],
          valor: newVal,
          custo: newVal,
          total,
        };

        let totalGeral = 0;
        for (const r of rows) {
          totalGeral += parseNum(r.total);
        }

        onUpdate({
          ...d,
          rows,
          totalDespesas: formatBRL(totalGeral, false),
        });
      };

      const handleRowTotalChange = (idx: number, newTotal: string) => {
        const rows = [...(d.rows ?? [])];
        const tNum = parseNum(newTotal);
        const unit = vagasNum > 0 && tNum > 0 ? formatBRL(tNum / vagasNum, false) : rows[idx].valor;
        rows[idx] = {
          ...rows[idx],
          total: newTotal,
          valor: unit,
          custo: unit,
        };

        let totalGeral = 0;
        for (const r of rows) {
          totalGeral += parseNum(r.total);
        }

        onUpdate({
          ...d,
          rows,
          totalDespesas: formatBRL(totalGeral, false),
        });
      };

      const handleAddRow = () => {
        const newRow = { nome: "Nova Despesa", valor: "0,00", custo: "0,00", total: "0,00" };
        const rows = [...(d.rows ?? []), newRow];
        onUpdate({ ...d, rows });
      };

      const handleRemoveRow = (idx: number) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = (d.rows ?? []).filter((_: any, i: number) => i !== idx);
        let totalGeral = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const r of rows) {
          totalGeral += parseNum(r.total ?? (parseNum(r.valor ?? r.custo) * vagasNum));
        }
        onUpdate({
          ...d,
          rows,
          totalDespesas: formatBRL(totalGeral, false),
        });
      };

      let totalGeralCalc = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const r of d.rows ?? []) {
        totalGeralCalc += parseNum(
          r.total !== undefined && r.total !== "" ? r.total : parseNum(r.valor ?? r.custo) * vagasNum
        );
      }

      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <span className="text-xs text-text-muted">
              Preencha o valor unitário de cada despesa personalizada por passageiro.
            </span>
            <label className="flex items-center gap-2 text-xs text-text-muted">
              <span className="font-medium">Total de Vagas:</span>
              <input
                className="w-20 px-2.5 py-1 rounded-lg border border-border bg-surface text-text-body text-sm font-semibold text-right tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={d.vagas ?? "20"}
                placeholder="20"
                onChange={(e) => handleVagasChange(e.target.value)}
              />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={`${thCls} text-left w-[50%]`}>Nome do Item</th>
                  <th className={`${thCls} text-right w-[24%]`}>Valor Unitário (R$)</th>
                  <th className={`${thCls} text-right w-[20%]`}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Valor Total (R$)</span>
                      <span className="text-[10px] text-text-muted font-normal">({vagasNum}x)</span>
                    </div>
                  </th>
                  <th className="w-[6%]" />
                </tr>
              </thead>
              <tbody>
                {(d.rows ?? []).map(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (r: any, i: number) => {
                    const unitVal = r.valor ?? r.custo ?? "";
                    const totalVal =
                      r.total !== undefined && r.total !== ""
                        ? r.total
                        : parseNum(unitVal) > 0
                        ? formatBRL(parseNum(unitVal) * vagasNum, false)
                        : "";

                    return (
                      <tr key={i}>
                        <td className={tdCls}>
                          <input
                            className={inputCls}
                            value={r.nome ?? ""}
                            placeholder="Nome do item..."
                            onChange={(e) => setRow("rows", i, "nome", e.target.value)}
                          />
                        </td>
                        <td className={tdCls}>
                          <input
                            className={numCls}
                            value={unitVal}
                            placeholder="0,00"
                            onChange={(e) => handleRowValorChange(i, e.target.value)}
                            onBlur={(e) => {
                              if (e.target.value) {
                                handleRowValorChange(i, formatBRL(e.target.value, false));
                              }
                            }}
                          />
                        </td>
                        <td className={tdCls}>
                          <input
                            className={`${numCls} font-semibold text-primary`}
                            value={totalVal}
                            placeholder="0,00"
                            onChange={(e) => handleRowTotalChange(i, e.target.value)}
                            onBlur={(e) => {
                              if (e.target.value) {
                                handleRowTotalChange(i, formatBRL(e.target.value, false));
                              }
                            }}
                          />
                        </td>
                        <td className={`${tdCls} text-center`}>
                          <DeleteRowBtn onClick={() => handleRemoveRow(i)} />
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleAddRow}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors cursor-pointer"
          >
            <Plus size={14} /> Adicionar Item
          </button>

          {/* Valor total no fim do card */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface-subtle/50">
            <span className="text-xs font-semibold text-text-title uppercase tracking-wide">
              Valor Total de Despesas Personalizadas
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted font-medium">({vagasNum} vagas):</span>
              <span className="text-base font-bold text-primary tabular-nums">
                {formatBRL(totalGeralCalc)}
              </span>
            </div>
          </div>

          <BlockAgePricingSection
            agePricing={d.agePricing}
            defaultBaseCost={vagasNum > 0 ? totalGeralCalc / vagasNum : 0}
            onChange={(val) => set("agePricing", val)}
          />

          <BlockObservation
            value={d.observation}
            onChange={(v) => set("observation", v)}
            placeholder="Observações sobre itens personalizados..."
          />
        </div>
      );
    }

    // ---- Aéreo ----
    case "aereo": {
      const vagasNum = parseNum(d.vagas);

      const custoTotalDisplay =
        d.custoTotal !== undefined && d.custoTotal !== ""
          ? d.custoTotal
          : vagasNum > 0 && parseNum(d.custoUnitario) > 0
          ? formatBRL(parseNum(d.custoUnitario) * vagasNum, false)
          : "";

      const sinalUnitarioDisplay =
        d.sinalUnitario !== undefined && d.sinalUnitario !== ""
          ? d.sinalUnitario
          : vagasNum > 0 && parseNum(d.sinal) > 0
          ? formatBRL(parseNum(d.sinal) / vagasNum, false)
          : "";

      const sinalTotalDisplay =
        d.sinalTotal !== undefined && d.sinalTotal !== ""
          ? d.sinalTotal
          : d.sinal !== undefined && d.sinal !== ""
          ? d.sinal
          : vagasNum > 0 && parseNum(d.sinalUnitario) > 0
          ? formatBRL(parseNum(d.sinalUnitario) * vagasNum, false)
          : "";

      const valorNetUnitarioDisplay =
        d.valorNetUnitario !== undefined
          ? d.valorNetUnitario
          : d.valorNet && vagasNum > 0
          ? formatBRL(parseNum(d.valorNet) / vagasNum, false)
          : "";

      const valorNetTotalDisplay =
        d.valorNetTotal !== undefined
          ? d.valorNetTotal
          : d.valorNet !== undefined && d.valorNet !== ""
          ? d.valorNet
          : vagasNum > 0 && parseNum(d.valorNetUnitario) > 0
          ? formatBRL(parseNum(d.valorNetUnitario) * vagasNum, false)
          : "";

      const handleVagasChange = (newVagas: string) => {
        const vNum = parseNum(newVagas);
        const unitPassagem = parseNum(d.custoUnitario);
        const currentUnitSinal = parseNum(
          d.sinalUnitario !== undefined && d.sinalUnitario !== ""
            ? d.sinalUnitario
            : d.sinal && parseNum(d.vagas) > 0
            ? parseNum(d.sinal) / parseNum(d.vagas)
            : 0
        );
        const currentUnitNet = parseNum(
          d.valorNetUnitario !== undefined && d.valorNetUnitario !== ""
            ? d.valorNetUnitario
            : d.valorNet && parseNum(d.vagas) > 0
            ? parseNum(d.valorNet) / parseNum(d.vagas)
            : 0
        );

        const updated: Record<string, unknown> = {
          ...d,
          vagas: newVagas,
        };

        if (unitPassagem > 0 && vNum > 0) {
          updated.custoTotal = formatBRL(unitPassagem * vNum, false);
        }
        if (currentUnitSinal > 0 && vNum > 0) {
          const st = formatBRL(currentUnitSinal * vNum, false);
          updated.sinalTotal = st;
          updated.sinal = st;
          if (!d.sinalUnitario) {
            updated.sinalUnitario = formatBRL(currentUnitSinal, false);
          }
        }
        if (currentUnitNet > 0 && vNum > 0) {
          const nt = formatBRL(currentUnitNet * vNum, false);
          updated.valorNetTotal = nt;
          updated.valorNet = nt;
          if (!d.valorNetUnitario) {
            updated.valorNetUnitario = formatBRL(currentUnitNet, false);
          }
        }
        onUpdate(updated);
      };

      const handleUnitPassagemChange = (val: string) => {
        const u = parseNum(val);
        const vNum = parseNum(d.vagas);
        const total = vNum > 0 && u > 0 ? formatBRL(u * vNum, false) : (vNum > 0 && !val ? "" : d.custoTotal);
        onUpdate({
          ...d,
          custoUnitario: val,
          custoTotal: total,
        });
      };

      const handleTotalPassagemChange = (val: string) => {
        const t = parseNum(val);
        const vNum = parseNum(d.vagas);
        const unit = vNum > 0 && t > 0 ? formatBRL(t / vNum, false) : d.custoUnitario;
        onUpdate({
          ...d,
          custoTotal: val,
          custoUnitario: unit,
        });
      };

      const handleUnitValorNetChange = (val: string) => {
        const u = parseNum(val);
        const vNum = parseNum(d.vagas);
        const total = vNum > 0 && u > 0 ? formatBRL(u * vNum, false) : (vNum > 0 && !val ? "" : (d.valorNetTotal ?? d.valorNet));
        onUpdate({
          ...d,
          valorNetUnitario: val,
          valorNetTotal: total,
          valorNet: total,
        });
      };

      const handleTotalValorNetChange = (val: string) => {
        const t = parseNum(val);
        const vNum = parseNum(d.vagas);
        const unit = vNum > 0 && t > 0 ? formatBRL(t / vNum, false) : d.valorNetUnitario;
        onUpdate({
          ...d,
          valorNetTotal: val,
          valorNet: val,
          valorNetUnitario: unit,
        });
      };

      const handleUnitSinalChange = (val: string) => {
        const u = parseNum(val);
        const vNum = parseNum(d.vagas);
        const total = vNum > 0 && u > 0 ? formatBRL(u * vNum, false) : (vNum > 0 && !val ? "" : (d.sinalTotal ?? d.sinal));
        onUpdate({
          ...d,
          sinalUnitario: val,
          sinalTotal: total,
          sinal: total,
        });
      };

      const handleTotalSinalChange = (val: string) => {
        const t = parseNum(val);
        const vNum = parseNum(d.vagas);
        const unit = vNum > 0 && t > 0 ? formatBRL(t / vNum, false) : d.sinalUnitario;
        onUpdate({
          ...d,
          sinalTotal: val,
          sinal: val,
          sinalUnitario: unit,
        });
      };

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-text-muted">
              <span className="block mb-1 font-medium">Localizador</span>
              <input
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm uppercase font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={d.localizador ?? ""}
                placeholder="Ex: GRP832582"
                onChange={(e) => set("localizador", e.target.value.toUpperCase())}
              />
            </label>
            <label className="text-xs text-text-muted">
              <span className="block mb-1 font-medium">Vagas</span>
              <input
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={d.vagas ?? ""}
                placeholder="Ex: 20"
                onChange={(e) => handleVagasChange(e.target.value)}
              />
            </label>
          </div>

          {/* Gerenciador Dinâmico de Voos com Conexões e Arraste */}
          <AereoFlightSection
            flights={d.flights ?? []}
            onChange={(updatedFlights) => set("flights", updatedFlights)}
          />

          {/* Valores das Passagens, Valor NET e Sinal com cálculo por vagas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 p-3.5 rounded-xl border border-border bg-surface-subtle/50">
            {/* Bloco Passagens */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-title">
                <Plane size={14} className="text-primary" />
                <span>Valor das Passagens</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-text-muted">
                  <span className="block mb-1 font-medium">Unitário (R$)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="0,00"
                    value={d.custoUnitario ?? ""}
                    onChange={(e) => handleUnitPassagemChange(e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value) {
                        handleUnitPassagemChange(formatBRL(e.target.value, false));
                      }
                    }}
                  />
                </label>
                <label className="text-xs text-text-muted">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Total (R$)</span>
                    {vagasNum > 0 && (
                      <span className="text-[10px] text-text-muted font-normal">
                        ({vagasNum}v)
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums font-semibold text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="0,00"
                    value={custoTotalDisplay}
                    onChange={(e) => handleTotalPassagemChange(e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value) {
                        handleTotalPassagemChange(formatBRL(e.target.value, false));
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Bloco Valor NET */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-title">
                <DollarSign size={14} className="text-emerald-500" />
                <span>Valor NET (Custo Líquido)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-text-muted">
                  <span className="block mb-1 font-medium">NET Unitário (R$)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="0,00"
                    value={valorNetUnitarioDisplay}
                    onChange={(e) => handleUnitValorNetChange(e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value) {
                        handleUnitValorNetChange(formatBRL(e.target.value, false));
                      }
                    }}
                  />
                </label>
                <label className="text-xs text-text-muted">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">NET Total (R$)</span>
                    {vagasNum > 0 && (
                      <span className="text-[10px] text-text-muted font-normal">
                        ({vagasNum}v)
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="0,00"
                    value={valorNetTotalDisplay}
                    onChange={(e) => handleTotalValorNetChange(e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value) {
                        handleTotalValorNetChange(formatBRL(e.target.value, false));
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Bloco Sinal */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-title">
                <DollarSign size={14} className="text-amber-500" />
                <span>Sinal / Entrada</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-text-muted">
                  <span className="block mb-1 font-medium">Sinal Unit. (R$)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="0,00"
                    value={sinalUnitarioDisplay}
                    onChange={(e) => handleUnitSinalChange(e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value) {
                        handleUnitSinalChange(formatBRL(e.target.value, false));
                      }
                    }}
                  />
                </label>
                <label className="text-xs text-text-muted">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Sinal Total (R$)</span>
                    {vagasNum > 0 && (
                      <span className="text-[10px] text-text-muted font-normal">
                        ({vagasNum}v)
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums font-semibold text-text-title focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="0,00"
                    value={sinalTotalDisplay}
                    onChange={(e) => handleTotalSinalChange(e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value) {
                        handleTotalSinalChange(formatBRL(e.target.value, false));
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Prazos / Datas Limite */}
          <div className="p-3.5 rounded-xl border border-border bg-surface-subtle/50 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-title">
              <Calendar size={14} className="text-primary" />
              <span>Prazos e Datas Limite</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-xs text-text-muted">
                <span className="block mb-1 font-medium">Prazo Pagamento do Sinal</span>
                <input
                  type="date"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                  value={toInputDate(d.prazoSinal)}
                  onChange={(e) => set("prazoSinal", e.target.value)}
                />
              </label>
              <label className="text-xs text-text-muted">
                <span className="block mb-1 font-medium">Prazo Nomeação / Emissão</span>
                <input
                  type="date"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                  value={toInputDate(d.prazoEmissao)}
                  onChange={(e) => set("prazoEmissao", e.target.value)}
                />
              </label>
            </div>

            {/* Prazos de Pagamento Final / Dividido */}
            <div className="pt-2 border-t border-border/50">
              <BlockFinalPaymentDeadlines
                prazos={d.prazosPagamentoFinal}
                legacyPrazoTotal={d.prazoPagamentoTotal}
                balanceToPay={Math.max(0, (parseNum(d.valorNetTotal) || parseNum(d.valorNet) || parseNum(custoTotalDisplay)) - parseNum(sinalTotalDisplay))}
                onChange={(prazos, primaryDate) =>
                  onUpdate({
                    ...d,
                    prazosPagamentoFinal: prazos,
                    prazoPagamentoTotal: primaryDate,
                  })
                }
              />
            </div>
          </div>

          <BlockAgePricingSection
            agePricing={d.agePricing}
            defaultBaseCost={parseNum(d.custoUnitario) || parseNum(d.valorNetUnitario) || (vagasNum > 0 ? parseNum(d.custoTotal) / vagasNum : 0)}
            onChange={(val) => set("agePricing", val)}
          />

          {/* Observações */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-muted flex items-center justify-between">
              <span>Observações do Aéreo</span>
              <span className="text-[11px] font-normal text-text-muted">(regras de cancelamento, franquia de bagagem, RAV, etc.)</span>
            </label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-y"
              placeholder="Ex: * Sem RAV. Franquia de 1 bagagem despachada 23kg por passageiro..."
              value={d.observation ?? ""}
              onChange={(e) => set("observation", e.target.value)}
            />
          </div>
        </div>
      );
    }

    // ---- Hospedagem ----
    case "hospedagem": {
      const getRoomCapacity = (tipo: string): number => {
        const lower = (tipo || "").trim().toLowerCase();
        if (lower.includes("single")) return 1;
        if (lower.includes("duplo")) return 2;
        if (lower.includes("triplo")) return 3;
        if (lower.includes("quadruplo") || lower.includes("quádruplo")) return 4;
        if (lower.includes("quintuplo") || lower.includes("quíntuplo")) return 5;
        return 2;
      };

      const handleDiariasChange = (newDiarias: string) => {
        const dNum = parseNum(newDiarias);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rooms = (d.rooms ?? []).map((r: any) => {
          const diariaNum = parseNum(r.diaria);
          if (diariaNum <= 0) return r;
          const effectiveDiarias = dNum > 0 ? dNum : 1;
          const totalQuarto = formatBRL(diariaNum * effectiveDiarias, false);
          const cap = getRoomCapacity(r.tipo);
          const porPessoa = formatBRL(parseNum(totalQuarto) / cap, false);
          const qtdNum = parseNum(r.qtd);
          const totalPeriodo =
            qtdNum > 0 && !String(r.totalPeriodo || "").toLowerCase().includes("cortesia")
              ? formatBRL(parseNum(totalQuarto) * qtdNum, false)
              : r.totalPeriodo;
          return {
            ...r,
            totalQuarto,
            porPessoa,
            totalPeriodo,
          };
        });

        let sumReserva = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const rm of rooms) {
          sumReserva += parseNum(rm.totalPeriodo);
        }

        onUpdate({
          ...d,
          diarias: newDiarias,
          rooms,
          totalReserva: sumReserva > 0 ? formatBRL(sumReserva, false) : d.totalReserva,
        });
      };

      const handleRoomTypeChange = (idx: number, newTipo: string) => {
        const rooms = [...(d.rooms ?? [])];
        const r = { ...rooms[idx], tipo: newTipo };
        const cap = getRoomCapacity(newTipo);
        const totalQuartoNum = parseNum(r.totalQuarto);
        const diariaNum = parseNum(r.diaria);
        const dNum = parseNum(d.diarias) || 1;

        if (totalQuartoNum > 0) {
          r.porPessoa = formatBRL(totalQuartoNum / cap, false);
        } else if (diariaNum > 0) {
          const tq = formatBRL(diariaNum * dNum, false);
          r.totalQuarto = tq;
          r.porPessoa = formatBRL(parseNum(tq) / cap, false);
        }
        rooms[idx] = r;
        onUpdate({ ...d, rooms });
      };

      const handleRoomDiariaChange = (idx: number, newDiaria: string) => {
        const rooms = [...(d.rooms ?? [])];
        const r = { ...rooms[idx], diaria: newDiaria };
        const diariaNum = parseNum(newDiaria);
        const dNum = parseNum(d.diarias) || 1;
        const cap = getRoomCapacity(r.tipo);

        if (diariaNum > 0) {
          const totalQuarto = formatBRL(diariaNum * dNum, false);
          r.totalQuarto = totalQuarto;
          r.porPessoa = formatBRL(parseNum(totalQuarto) / cap, false);
          const qtdNum = parseNum(r.qtd);
          if (qtdNum > 0 && !String(r.totalPeriodo || "").toLowerCase().includes("cortesia")) {
            r.totalPeriodo = formatBRL(parseNum(totalQuarto) * qtdNum, false);
          }
        } else if (!newDiaria) {
          r.totalQuarto = "";
          r.porPessoa = "";
        }

        rooms[idx] = r;

        let sumReserva = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const rm of rooms) {
          sumReserva += parseNum(rm.totalPeriodo);
        }

        onUpdate({
          ...d,
          rooms,
          totalReserva: sumReserva > 0 ? formatBRL(sumReserva, false) : d.totalReserva,
        });
      };

      const handleRoomTotalQuartoChange = (idx: number, newTotalQuarto: string) => {
        const rooms = [...(d.rooms ?? [])];
        const r = { ...rooms[idx], totalQuarto: newTotalQuarto };
        const tNum = parseNum(newTotalQuarto);
        const cap = getRoomCapacity(r.tipo);
        const qtdNum = parseNum(r.qtd);

        if (tNum > 0) {
          r.porPessoa = formatBRL(tNum / cap, false);
          if (qtdNum > 0 && !String(r.totalPeriodo || "").toLowerCase().includes("cortesia")) {
            r.totalPeriodo = formatBRL(tNum * qtdNum, false);
          }
        }

        rooms[idx] = r;

        let sumReserva = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const rm of rooms) {
          sumReserva += parseNum(rm.totalPeriodo);
        }

        onUpdate({
          ...d,
          rooms,
          totalReserva: sumReserva > 0 ? formatBRL(sumReserva, false) : d.totalReserva,
        });
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const getCapacityFromRooms = (roomsList: any[]) => {
        let cap = 0;
        for (const r of roomsList ?? []) {
          if (String(r.totalPeriodo || "").toLowerCase().includes("cortesia")) continue;
          cap += getRoomCapacity(r.tipo) * (parseNum(r.qtd) || 0);
        }
        return cap;
      };

      const handleRoomQtdChange = (idx: number, newQtd: string) => {
        const rooms = [...(d.rooms ?? [])];
        const r = { ...rooms[idx], qtd: newQtd };
        const qtdNum = parseNum(newQtd);
        const totalQuartoNum = parseNum(r.totalQuarto);

        if (qtdNum > 0 && totalQuartoNum > 0 && !String(r.totalPeriodo || "").toLowerCase().includes("cortesia")) {
          r.totalPeriodo = formatBRL(totalQuartoNum * qtdNum, false);
        }

        rooms[idx] = r;

        let sumReserva = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const rm of rooms) {
          sumReserva += parseNum(rm.totalPeriodo);
        }

        const newVagasNum = parseNum(d.vagas) > 0 ? parseNum(d.vagas) : getCapacityFromRooms(rooms);
        const uNet = parseNum(d.valorNetUnitario);
        const uSinal = parseNum(d.sinalUnitario);

        onUpdate({
          ...d,
          rooms,
          totalReserva: sumReserva > 0 ? formatBRL(sumReserva, false) : d.totalReserva,
          ...(uNet > 0 && newVagasNum > 0 ? { valorNetTotal: formatBRL(uNet * newVagasNum, false), valorNet: formatBRL(uNet * newVagasNum, false) } : {}),
          ...(uSinal > 0 && newVagasNum > 0 ? { sinalTotal: formatBRL(uSinal * newVagasNum, false), sinal: formatBRL(uSinal * newVagasNum, false) } : {}),
        });
      };

      const handleRoomTotalPeriodoChange = (idx: number, newTotalPeriodo: string) => {
        const rooms = [...(d.rooms ?? [])];
        rooms[idx] = { ...rooms[idx], totalPeriodo: newTotalPeriodo };

        let sumReserva = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const rm of rooms) {
          sumReserva += parseNum(rm.totalPeriodo);
        }

        onUpdate({
          ...d,
          rooms,
          totalReserva: sumReserva > 0 ? formatBRL(sumReserva, false) : d.totalReserva,
        });
      };

      const vagasNum = parseNum(d.vagas) > 0 ? parseNum(d.vagas) : getCapacityFromRooms(d.rooms);

      const sinalUnitarioDisplay =
        d.sinalUnitario !== undefined && d.sinalUnitario !== ""
          ? d.sinalUnitario
          : vagasNum > 0 && parseNum(d.sinal) > 0
          ? formatBRL(parseNum(d.sinal) / vagasNum, false)
          : "";

      const sinalTotalDisplay =
        d.sinalTotal !== undefined && d.sinalTotal !== ""
          ? d.sinalTotal
          : d.sinal !== undefined && d.sinal !== ""
          ? d.sinal
          : vagasNum > 0 && parseNum(d.sinalUnitario) > 0
          ? formatBRL(parseNum(d.sinalUnitario) * vagasNum, false)
          : "";

      const valorNetUnitarioDisplay =
        d.valorNetUnitario !== undefined
          ? d.valorNetUnitario
          : d.valorNet && parseNum(d.valorNet) > 0 && vagasNum > 0
          ? formatBRL(parseNum(d.valorNet) / vagasNum, false)
          : "";

      const valorNetTotalDisplay =
        d.valorNetTotal !== undefined
          ? d.valorNetTotal
          : d.valorNet !== undefined && d.valorNet !== ""
          ? d.valorNet
          : vagasNum > 0 && parseNum(d.valorNetUnitario) > 0
          ? formatBRL(parseNum(d.valorNetUnitario) * vagasNum, false)
          : "";

      const handleUnitValorNetChange = (val: string) => {
        const u = parseNum(val);
        const total = vagasNum > 0 && u > 0 ? formatBRL(u * vagasNum, false) : (vagasNum > 0 && !val ? "" : (d.valorNetTotal ?? d.valorNet));
        onUpdate({
          ...d,
          valorNetUnitario: val,
          valorNetTotal: total,
          valorNet: total,
        });
      };

      const handleTotalValorNetChange = (val: string) => {
        const t = parseNum(val);
        const unit = vagasNum > 0 && t > 0 ? formatBRL(t / vagasNum, false) : d.valorNetUnitario;
        onUpdate({
          ...d,
          valorNetTotal: val,
          valorNet: val,
          valorNetUnitario: unit,
        });
      };

      const handleUnitSinalChange = (val: string) => {
        const u = parseNum(val);
        const total = vagasNum > 0 && u > 0 ? formatBRL(u * vagasNum, false) : (vagasNum > 0 && !val ? "" : (d.sinalTotal ?? d.sinal));
        onUpdate({
          ...d,
          sinalUnitario: val,
          sinalTotal: total,
          sinal: total,
        });
      };

      const handleTotalSinalChange = (val: string) => {
        const t = parseNum(val);
        const unit = vagasNum > 0 && t > 0 ? formatBRL(t / vagasNum, false) : d.sinalUnitario;
        onUpdate({
          ...d,
          sinalTotal: val,
          sinal: val,
          sinalUnitario: unit,
        });
      };

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs text-text-muted">
              <span className="block mb-1 font-medium">Hotel / Pousada</span>
              <input
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={d.hotel ?? ""}
                placeholder="Ex: Tarobá Hotel, Pousada Alvorada"
                onChange={(e) => set("hotel", e.target.value)}
              />
            </label>
            <label className="text-xs text-text-muted">
              <span className="block mb-1 font-medium">Cidade</span>
              <input
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={d.cidade ?? ""}
                placeholder="Ex: Foz do Iguaçu, Noronha"
                onChange={(e) => set("cidade", e.target.value)}
              />
            </label>
            <label className="text-xs text-text-muted">
              <span className="block mb-1 font-medium">Diárias</span>
              <input
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={d.diarias ?? ""}
                placeholder="Ex: 3"
                onChange={(e) => handleDiariasChange(e.target.value)}
              />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Tipo", "Diária (R$)", "Total Quarto", "Por Pessoa", "Qtd", "Total Período", ""].map((h) => (
                    <th key={h} className={`${thCls} text-left`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(d.rooms ?? []).map(
                  (
                    r: { tipo: string; diaria: string; totalQuarto: string; porPessoa: string; qtd: string; totalPeriodo: string },
                    i: number
                  ) => {
                    const normalizedTipo =
                      ["single", "duplo", "triplo", "quádruplo", "quadruplo"].includes(String(r.tipo || "").toLowerCase())
                        ? (r.tipo.charAt(0).toUpperCase() + r.tipo.slice(1).toLowerCase()).replace(/quadruplo/i, "Quádruplo")
                        : r.tipo || "Duplo";

                    return (
                      <tr key={i}>
                        <td className={tdCls}>
                          <select
                            value={normalizedTipo}
                            onChange={(e) => handleRoomTypeChange(i, e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer transition-all"
                          >
                            <option value="Single">Single (1 pessoa)</option>
                            <option value="Duplo">Duplo (2 pessoas)</option>
                            <option value="Triplo">Triplo (3 pessoas)</option>
                            <option value="Quádruplo">Quádruplo (4 pessoas)</option>
                            {!["Single", "Duplo", "Triplo", "Quádruplo"].includes(normalizedTipo) && normalizedTipo && (
                              <option value={normalizedTipo}>{normalizedTipo}</option>
                            )}
                          </select>
                        </td>
                        <td className={tdCls}>
                          <input
                            className="w-full px-2 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            value={r.diaria ?? ""}
                            placeholder="0,00"
                            onChange={(e) => handleRoomDiariaChange(i, e.target.value)}
                            onBlur={(e) => {
                              if (e.target.value) {
                                handleRoomDiariaChange(i, formatBRL(e.target.value, false));
                              }
                            }}
                          />
                        </td>
                        <td className={tdCls}>
                          <input
                            className="w-full px-2 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            value={r.totalQuarto ?? ""}
                            placeholder="0,00"
                            onChange={(e) => handleRoomTotalQuartoChange(i, e.target.value)}
                            onBlur={(e) => {
                              if (e.target.value) {
                                handleRoomTotalQuartoChange(i, formatBRL(e.target.value, false));
                              }
                            }}
                          />
                        </td>
                        <td className={tdCls}>
                          <input
                            className="w-full px-2 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums font-semibold text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            value={r.porPessoa ?? ""}
                            placeholder="0,00"
                            onChange={(e) => setRow("rooms", i, "porPessoa", e.target.value)}
                            onBlur={(e) => {
                              if (e.target.value) {
                                setRow("rooms", i, "porPessoa", formatBRL(e.target.value, false));
                              }
                            }}
                          />
                        </td>
                        <td className={tdCls}>
                          <input
                            className="w-full px-2 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            value={r.qtd ?? ""}
                            placeholder="1"
                            onChange={(e) => handleRoomQtdChange(i, e.target.value)}
                          />
                        </td>
                        <td className={tdCls}>
                          <input
                            className="w-full px-2 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            value={r.totalPeriodo ?? ""}
                            placeholder="0,00"
                            onChange={(e) => handleRoomTotalPeriodoChange(i, e.target.value)}
                            onBlur={(e) => {
                              if (e.target.value && !e.target.value.toLowerCase().includes("cortesia")) {
                                handleRoomTotalPeriodoChange(i, formatBRL(e.target.value, false));
                              }
                            }}
                          />
                        </td>
                        <td className={`${tdCls} text-center`}>
                          <DeleteRowBtn onClick={() => removeRow("rooms", i)} />
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => {
              addRow("rooms", {
                tipo: "Duplo",
                diaria: "0,00",
                totalQuarto: "0,00",
                porPessoa: "0,00",
                qtd: "1",
                totalPeriodo: "0,00",
              });
            }}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors cursor-pointer"
          >
            <Plus size={14} /> Adicionar Quarto
          </button>

          <div className="p-3.5 rounded-xl border border-border bg-surface-subtle/50">
            <label className="text-xs text-text-muted block">
              <span className="block mb-1 font-medium text-text-title">Total Reserva (R$)</span>
              <input
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums font-bold text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={d.totalReserva ?? ""}
                placeholder="0,00"
                onChange={(e) => set("totalReserva", e.target.value)}
                onBlur={(e) => {
                  if (e.target.value) {
                    set("totalReserva", formatBRL(e.target.value, false));
                  }
                }}
              />
            </label>
          </div>

          {/* Valor NET e Sinal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 p-3.5 rounded-xl border border-border bg-surface-subtle/50">
            {/* Bloco Valor NET */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-title">
                <DollarSign size={14} className="text-emerald-500" />
                <span>Valor NET (Custo Líquido)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-text-muted">
                  <span className="block mb-1 font-medium">NET Unitário (R$)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="0,00"
                    value={valorNetUnitarioDisplay}
                    onChange={(e) => handleUnitValorNetChange(e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value) {
                        handleUnitValorNetChange(formatBRL(e.target.value, false));
                      }
                    }}
                  />
                </label>
                <label className="text-xs text-text-muted">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">NET Total (R$)</span>
                    {vagasNum > 0 && (
                      <span className="text-[10px] text-text-muted font-normal">
                        ({vagasNum}v)
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="0,00"
                    value={valorNetTotalDisplay}
                    onChange={(e) => handleTotalValorNetChange(e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value) {
                        handleTotalValorNetChange(formatBRL(e.target.value, false));
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Bloco Sinal */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-title">
                <DollarSign size={14} className="text-amber-500" />
                <span>Sinal / Entrada</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-text-muted">
                  <span className="block mb-1 font-medium">Sinal Unit. (R$)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="0,00"
                    value={sinalUnitarioDisplay}
                    onChange={(e) => handleUnitSinalChange(e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value) {
                        handleUnitSinalChange(formatBRL(e.target.value, false));
                      }
                    }}
                  />
                </label>
                <label className="text-xs text-text-muted">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Sinal Total (R$)</span>
                    {vagasNum > 0 && (
                      <span className="text-[10px] text-text-muted font-normal">
                        ({vagasNum}v)
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums font-semibold text-text-title focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="0,00"
                    value={sinalTotalDisplay}
                    onChange={(e) => handleTotalSinalChange(e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value) {
                        handleTotalSinalChange(formatBRL(e.target.value, false));
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Prazos / Datas Limite */}
          <div className="p-3.5 rounded-xl border border-border bg-surface-subtle/50 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-title">
              <Calendar size={14} className="text-primary" />
              <span>Prazos e Datas Limite</span>
            </div>
            <div>
              <label className="text-xs text-text-muted max-w-sm block">
                <span className="block mb-1 font-medium">Prazo Pagamento do Sinal</span>
                <input
                  type="date"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                  value={toInputDate(d.prazoSinal)}
                  onChange={(e) => set("prazoSinal", e.target.value)}
                />
              </label>
            </div>

            {/* Prazos de Pagamento Final / Dividido */}
            <div className="pt-2 border-t border-border/50">
              <BlockFinalPaymentDeadlines
                prazos={d.prazosPagamentoFinal}
                legacyPrazoTotal={d.prazoPagamentoTotal}
                balanceToPay={Math.max(0, (parseNum(d.totalReserva) || parseNum(d.valorNetTotal) || parseNum(d.valorNet)) - parseNum(sinalTotalDisplay))}
                onChange={(prazos, primaryDate) =>
                  onUpdate({
                    ...d,
                    prazosPagamentoFinal: prazos,
                    prazoPagamentoTotal: primaryDate,
                  })
                }
              />
            </div>
          </div>

          <BlockAgePricingSection
            agePricing={d.agePricing}
            defaultBaseCost={getBlockBaseUnitCost(block, vagasNum)}
            onChange={(val) => set("agePricing", val)}
          />

          <BlockObservation
            value={d.observation}
            onChange={(v) => set("observation", v)}
            placeholder="Ex: Cortesia concedida no quarto duplo solteiro..."
          />
        </div>
      );
    }

    // ---- Rodoviário ----
    case "rodoviario": {
      const vagasNum = parseNum(d.vagas);

      const sinalUnitarioDisplay =
        d.sinalUnitario !== undefined && d.sinalUnitario !== ""
          ? d.sinalUnitario
          : vagasNum > 0 && parseNum(d.sinal) > 0
          ? formatBRL(parseNum(d.sinal) / vagasNum, false)
          : "";

      const sinalTotalDisplay =
        d.sinalTotal !== undefined && d.sinalTotal !== ""
          ? d.sinalTotal
          : d.sinal !== undefined && d.sinal !== ""
          ? d.sinal
          : vagasNum > 0 && parseNum(d.sinalUnitario) > 0
          ? formatBRL(parseNum(d.sinalUnitario) * vagasNum, false)
          : "";

      const valorNetUnitarioDisplay =
        d.valorNetUnitario !== undefined
          ? d.valorNetUnitario
          : d.valorNet && parseNum(d.valorNet) > 0 && vagasNum > 0
          ? formatBRL(parseNum(d.valorNet) / vagasNum, false)
          : "";

      const valorNetTotalDisplay =
        d.valorNetTotal !== undefined
          ? d.valorNetTotal
          : d.valorNet !== undefined && d.valorNet !== ""
          ? d.valorNet
          : vagasNum > 0 && parseNum(d.valorNetUnitario) > 0
          ? formatBRL(parseNum(d.valorNetUnitario) * vagasNum, false)
          : "";

      const handleUnitValorNetChange = (val: string) => {
        const u = parseNum(val);
        const total = vagasNum > 0 && u > 0 ? formatBRL(u * vagasNum, false) : (vagasNum > 0 && !val ? "" : (d.valorNetTotal ?? d.valorNet));
        onUpdate({
          ...d,
          valorNetUnitario: val,
          valorNetTotal: total,
          valorNet: total,
        });
      };

      const handleTotalValorNetChange = (val: string) => {
        const t = parseNum(val);
        const unit = vagasNum > 0 && t > 0 ? formatBRL(t / vagasNum, false) : d.valorNetUnitario;
        onUpdate({
          ...d,
          valorNetTotal: val,
          valorNet: val,
          valorNetUnitario: unit,
        });
      };

      const handleUnitSinalChange = (val: string) => {
        const u = parseNum(val);
        const total = vagasNum > 0 && u > 0 ? formatBRL(u * vagasNum, false) : (vagasNum > 0 && !val ? "" : (d.sinalTotal ?? d.sinal));
        onUpdate({
          ...d,
          sinalUnitario: val,
          sinalTotal: total,
          sinal: total,
        });
      };

      const handleTotalSinalChange = (val: string) => {
        const t = parseNum(val);
        const unit = vagasNum > 0 && t > 0 ? formatBRL(t / vagasNum, false) : d.sinalUnitario;
        onUpdate({
          ...d,
          sinalTotal: val,
          sinal: val,
          sinalUnitario: unit,
        });
      };

      const handleVagasChange = (newVagas: string) => {
        const vNum = parseNum(newVagas);
        const vContrato = parseNum(d.valorContrato);
        const rateio = vNum > 0 && vContrato > 0 ? formatBRL(vContrato / vNum, false) : d.rateioPorPessoa;

        const currentUnitSinal = parseNum(
          d.sinalUnitario !== undefined && d.sinalUnitario !== ""
            ? d.sinalUnitario
            : d.sinal && parseNum(d.vagas) > 0
            ? parseNum(d.sinal) / parseNum(d.vagas)
            : 0
        );
        const currentUnitNet = parseNum(
          d.valorNetUnitario !== undefined && d.valorNetUnitario !== ""
            ? d.valorNetUnitario
            : d.valorNet && parseNum(d.vagas) > 0
            ? parseNum(d.valorNet) / parseNum(d.vagas)
            : 0
        );

        const updated: Record<string, unknown> = {
          ...d,
          vagas: newVagas,
          ...(rateio ? { rateioPorPessoa: rateio } : {}),
        };

        if (currentUnitSinal > 0 && vNum > 0) {
          const st = formatBRL(currentUnitSinal * vNum, false);
          updated.sinalTotal = st;
          updated.sinal = st;
          if (!d.sinalUnitario) {
            updated.sinalUnitario = formatBRL(currentUnitSinal, false);
          }
        }
        if (currentUnitNet > 0 && vNum > 0) {
          const nt = formatBRL(currentUnitNet * vNum, false);
          updated.valorNetTotal = nt;
          updated.valorNet = nt;
          if (!d.valorNetUnitario) {
            updated.valorNetUnitario = formatBRL(currentUnitNet, false);
          }
        }
        onUpdate(updated);
      };

      const handleValorContratoChange = (newVal: string) => {
        const vNum = parseNum(newVal);
        const rateio = vagasNum > 0 && vNum > 0 ? formatBRL(vNum / vagasNum, false) : d.rateioPorPessoa;
        onUpdate({
          ...d,
          valorContrato: newVal,
          ...(rateio ? { rateioPorPessoa: rateio } : {}),
        });
      };

      const handleRateioChange = (newRateio: string) => {
        const rNum = parseNum(newRateio);
        const vNum = vagasNum || 20;
        const vContrato = rNum > 0 && vNum > 0 ? formatBRL(rNum * vNum, false) : (newRateio === "" ? "" : d.valorContrato);
        onUpdate({
          ...d,
          rateioPorPessoa: newRateio,
          ...(vContrato !== undefined ? { valorContrato: vContrato } : {}),
        });
      };

      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["empresa", "Empresa"],
                ["atendente", "Atendente"],
                ["veiculo", "Veículo"],
                ["vagas", "Vagas"],
                ["wifi", "Wi-Fi"],
                ["banheiro", "Banheiro"],
                ["ar", "Ar-condicionado"],
                ["agua", "Água"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-xs text-text-muted">
                <span className="block mb-1 font-medium">{label}</span>
                <input
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  value={d[key] ?? ""}
                  onChange={(e) => {
                    if (key === "vagas") {
                      handleVagasChange(e.target.value);
                    } else {
                      set(key, e.target.value);
                    }
                  }}
                />
              </label>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="md:col-span-2 block text-xs text-text-muted">
              <span className="block mb-1 font-medium">Itinerário</span>
              <input
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={d.itinerario ?? ""}
                placeholder="Ex: Saída de Cachoeirinha até Aeroporto / Destino"
                onChange={(e) => set("itinerario", e.target.value)}
              />
            </label>
            <label className="block text-xs text-text-muted">
              <span className="block mb-1 font-medium">Sentido / Trajeto</span>
              <select
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer transition-all"
                value={d.trajeto || d.tipoTrajeto || "Ida e Volta"}
                onChange={(e) => {
                  set("trajeto", e.target.value);
                  set("tipoTrajeto", e.target.value);
                }}
              >
                <option value="Ida e Volta">Ida e Volta</option>
                <option value="Só Ida">Só Ida</option>
                <option value="Só Volta">Só Volta</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs text-text-muted">
              <span className="block mb-1 font-medium">Valor Contrato (R$)</span>
              <input
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={d.valorContrato ?? ""}
                placeholder="0,00"
                onChange={(e) => handleValorContratoChange(e.target.value)}
                onBlur={(e) => {
                  if (e.target.value) {
                    handleValorContratoChange(formatBRL(e.target.value, false));
                  }
                }}
              />
            </label>
            <label className="text-xs text-text-muted">
              <span className="block mb-1 font-medium">Rateio por Pessoa (R$)</span>
              <input
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums font-semibold text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={d.rateioPorPessoa ?? ""}
                placeholder="0,00"
                onChange={(e) => handleRateioChange(e.target.value)}
                onBlur={(e) => {
                  if (e.target.value) {
                    handleRateioChange(formatBRL(e.target.value, false));
                  }
                }}
              />
            </label>
            <label className="text-xs text-text-muted">
              <span className="block mb-1 font-medium">Status</span>
              <div className="mt-0.5">
                <StatusSelect value={(d.status as RowStatus) ?? "COTADO"} onChange={(v) => set("status", v)} />
              </div>
            </label>
          </div>

          {/* Valor NET e Sinal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 p-3.5 rounded-xl border border-border bg-surface-subtle/50">
            {/* Bloco Valor NET */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-title">
                <DollarSign size={14} className="text-emerald-500" />
                <span>Valor NET (Custo Líquido)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-text-muted">
                  <span className="block mb-1 font-medium">NET Unitário (R$)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="0,00"
                    value={valorNetUnitarioDisplay}
                    onChange={(e) => handleUnitValorNetChange(e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value) {
                        handleUnitValorNetChange(formatBRL(e.target.value, false));
                      }
                    }}
                  />
                </label>
                <label className="text-xs text-text-muted">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">NET Total (R$)</span>
                    {vagasNum > 0 && (
                      <span className="text-[10px] text-text-muted font-normal">
                        ({vagasNum}v)
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="0,00"
                    value={valorNetTotalDisplay}
                    onChange={(e) => handleTotalValorNetChange(e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value) {
                        handleTotalValorNetChange(formatBRL(e.target.value, false));
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Bloco Sinal */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-title">
                <DollarSign size={14} className="text-amber-500" />
                <span>Sinal / Entrada</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-text-muted">
                  <span className="block mb-1 font-medium">Sinal Unit. (R$)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="0,00"
                    value={sinalUnitarioDisplay}
                    onChange={(e) => handleUnitSinalChange(e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value) {
                        handleUnitSinalChange(formatBRL(e.target.value, false));
                      }
                    }}
                  />
                </label>
                <label className="text-xs text-text-muted">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Sinal Total (R$)</span>
                    {vagasNum > 0 && (
                      <span className="text-[10px] text-text-muted font-normal">
                        ({vagasNum}v)
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums font-semibold text-text-title focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="0,00"
                    value={sinalTotalDisplay}
                    onChange={(e) => handleTotalSinalChange(e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value) {
                        handleTotalSinalChange(formatBRL(e.target.value, false));
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Prazos / Datas Limite */}
          <div className="p-3.5 rounded-xl border border-border bg-surface-subtle/50 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-title">
              <Calendar size={14} className="text-primary" />
              <span>Prazos e Datas Limite</span>
            </div>
            <div>
              <label className="text-xs text-text-muted max-w-sm block">
                <span className="block mb-1 font-medium">Prazo Pagamento do Sinal</span>
                <input
                  type="date"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                  value={toInputDate(d.prazoSinal)}
                  onChange={(e) => set("prazoSinal", e.target.value)}
                />
              </label>
            </div>

            {/* Prazos de Pagamento Final / Dividido */}
            <div className="pt-2 border-t border-border/50">
              <BlockFinalPaymentDeadlines
                prazos={d.prazosPagamentoFinal}
                legacyPrazoTotal={d.prazoPagamentoTotal}
                balanceToPay={Math.max(0, (parseNum(d.valorContrato) || parseNum(d.valorNetTotal) || parseNum(d.valorNet)) - parseNum(sinalTotalDisplay))}
                onChange={(prazos, primaryDate) =>
                  onUpdate({
                    ...d,
                    prazosPagamentoFinal: prazos,
                    prazoPagamentoTotal: primaryDate,
                  })
                }
              />
            </div>
          </div>

          <BlockAgePricingSection
            agePricing={d.agePricing}
            defaultBaseCost={parseNum(d.rateioPorPessoa) || parseNum(d.valorNetUnitario) || (vagasNum > 0 ? parseNum(d.valorContrato) / vagasNum : 0)}
            onChange={(val) => set("agePricing", val)}
          />

          <BlockObservation
            value={d.observation}
            onChange={(v) => set("observation", v)}
            placeholder="Observações sobre transporte rodoviário..."
          />
        </div>
      );
    }

    // ---- Guias ----
    case "guias": {
      const vagasNum = parseNum(d.vagas) || 20;

      // Helper to calculate totals
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let sumGuias = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const g of d.guias ?? []) {
        const dNum = parseNum(g.diarias);
        const vDiaria = parseNum(g.valorDiaria);
        const total =
          g.valorTotal !== undefined && g.valorTotal !== ""
            ? parseNum(g.valorTotal)
            : dNum > 0 && vDiaria > 0
            ? dNum * vDiaria
            : 0;
        sumGuias += total;
      }

      let sumDespesas = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const desp of d.despesas ?? []) {
        sumDespesas += parseNum(desp.valor);
      }

      const totalGeralDespesas = sumGuias + sumDespesas;

      // Rateio por pessoa calculado automaticamente dividindo o total de despesas pelas vagas
      const rateioCalculado = vagasNum > 0 ? formatBRL(totalGeralDespesas / vagasNum, false) : "0,00";

      const handleVagasChange = (newVagas: string) => {
        const vNum = parseNum(newVagas);
        const rateio = vNum > 0 ? formatBRL(totalGeralDespesas / vNum, false) : "0,00";
        onUpdate({
          ...d,
          vagas: newVagas,
          rateioPorPessoa: rateio,
        });
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateGuiasAndTotals = (newGuias: any[], newDespesas: any[]) => {
        let sG = 0;
        for (const g of newGuias) {
          sG += parseNum(g.valorTotal);
        }
        let sD = 0;
        for (const dp of newDespesas) {
          sD += parseNum(dp.valor);
        }
        const tot = sG + sD;
        const rateio = vagasNum > 0 ? formatBRL(tot / vagasNum, false) : "0,00";
        onUpdate({
          ...d,
          guias: newGuias,
          despesas: newDespesas,
          totalDiarias: formatBRL(sG, false),
          totalOutrasDespesas: formatBRL(sD, false),
          totalDespesas: formatBRL(tot, false),
          rateioPorPessoa: rateio,
        });
      };

      const handleGuiaDiariasChange = (idx: number, diariasVal: string) => {
        const guias = [...(d.guias ?? [])];
        const g = { ...guias[idx], diarias: diariasVal };
        const dNum = parseNum(diariasVal);
        const currentDiaria =
          g.valorDiaria !== undefined
            ? g.valorDiaria
            : parseNum(g.valorTotal) > 0 && parseNum(guias[idx].diarias) > 0
            ? formatBRL(parseNum(g.valorTotal) / parseNum(guias[idx].diarias), false)
            : "";
        const vDiariaNum = parseNum(currentDiaria);
        g.valorDiaria = currentDiaria;
        if (diariasVal === "" || currentDiaria === "") {
          g.valorTotal = "";
        } else {
          g.valorTotal = formatBRL(dNum * vDiariaNum, false);
        }
        guias[idx] = g;
        updateGuiasAndTotals(guias, d.despesas ?? []);
      };

      const handleGuiaValorDiariaChange = (idx: number, vDiariaVal: string) => {
        const guias = [...(d.guias ?? [])];
        const dNum = parseNum(guias[idx].diarias);
        const vDiariaNum = parseNum(vDiariaVal);
        const g = {
          ...guias[idx],
          valorDiaria: vDiariaVal,
          valorTotal: vDiariaVal === "" ? "" : formatBRL(dNum * vDiariaNum, false),
        };
        guias[idx] = g;
        updateGuiasAndTotals(guias, d.despesas ?? []);
      };

      const handleGuiaValorTotalChange = (idx: number, vTotalVal: string) => {
        const guias = [...(d.guias ?? [])];
        const dNum = parseNum(guias[idx].diarias);
        const vTotalNum = parseNum(vTotalVal);
        const g = {
          ...guias[idx],
          valorTotal: vTotalVal,
          valorDiaria: vTotalVal === "" ? "" : (dNum > 0 ? formatBRL(vTotalNum / dNum, false) : guias[idx].valorDiaria ?? ""),
        };
        guias[idx] = g;
        updateGuiasAndTotals(guias, d.despesas ?? []);
      };

      const handleAddGuia = () => {
        const newGuia = {
          nome: "",
          tipo: "Acompanhante",
          telefone: "",
          diarias: "1",
          valorDiaria: "0,00",
          valorTotal: "0,00",
          status: "PENDENTE",
        };
        const guias = [...(d.guias ?? []), newGuia];
        updateGuiasAndTotals(guias, d.despesas ?? []);
      };

      const handleRemoveGuia = (idx: number) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const guias = (d.guias ?? []).filter((_: any, i: number) => i !== idx);
        updateGuiasAndTotals(guias, d.despesas ?? []);
      };

      // Despesas handlers
      const handleDespesaDescricaoChange = (idx: number, desc: string) => {
        const despesas = [...(d.despesas ?? [])];
        despesas[idx] = { ...despesas[idx], descricao: desc };
        updateGuiasAndTotals(d.guias ?? [], despesas);
      };

      const handleDespesaValorChange = (idx: number, val: string) => {
        const despesas = [...(d.despesas ?? [])];
        despesas[idx] = { ...despesas[idx], valor: val };
        updateGuiasAndTotals(d.guias ?? [], despesas);
      };

      const handleAddDespesa = () => {
        const newDesp = { descricao: "", valor: "0,00" };
        const despesas = [...(d.despesas ?? []), newDesp];
        updateGuiasAndTotals(d.guias ?? [], despesas);
      };

      const handleRemoveDespesa = (idx: number) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const despesas = (d.despesas ?? []).filter((_: any, i: number) => i !== idx);
        updateGuiasAndTotals(d.guias ?? [], despesas);
      };

      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <span className="text-xs text-text-muted">
              Preencha os honorários, diárias e despesas adicionais dos guias com rateio automático por vagas.
            </span>
            <label className="flex items-center gap-2 text-xs text-text-muted">
              <span className="font-medium">Total de Vagas:</span>
              <input
                className="w-20 px-2.5 py-1 rounded-lg border border-border bg-surface text-text-body text-sm font-semibold text-right tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={d.vagas ?? "20"}
                placeholder="20"
                onChange={(e) => handleVagasChange(e.target.value)}
              />
            </label>
          </div>

          {/* Tabela de Guias */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={`${thCls} text-left`}>Nome</th>
                  <th className={`${thCls} text-left`}>Tipo</th>
                  <th className={`${thCls} text-left`}>Telefone</th>
                  <th className={`${thCls} text-right w-20`}>Diárias</th>
                  <th className={`${thCls} text-right w-28`}>Valor Diária (R$)</th>
                  <th className={`${thCls} text-right w-28`}>Valor Total (R$)</th>
                  <th className={`${thCls} text-center w-28`}>Status</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {(d.guias ?? []).map(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (g: any, i: number) => {
                    const dNum = parseNum(g.diarias);
                    const tNum = parseNum(g.valorTotal);
                    const vDiariaDisplay =
                      g.valorDiaria !== undefined
                        ? g.valorDiaria
                        : dNum > 0 && tNum > 0
                        ? formatBRL(tNum / dNum, false)
                        : "";

                    const vTotalDisplay = g.valorTotal ?? "";

                    return (
                      <tr key={i}>
                        <td className={tdCls}>
                          <input
                            className={inputCls}
                            value={g.nome ?? ""}
                            placeholder="Nome do guia..."
                            onChange={(e) => setRow("guias", i, "nome", e.target.value)}
                          />
                        </td>
                        <td className={tdCls}>
                          <input
                            className={inputCls}
                            value={g.tipo ?? ""}
                            placeholder="Ex: Acompanhante, Local..."
                            onChange={(e) => setRow("guias", i, "tipo", e.target.value)}
                          />
                        </td>
                        <td className={tdCls}>
                          <input
                            className={inputCls}
                            value={g.telefone ?? ""}
                            placeholder="(00) 00000-0000"
                            onChange={(e) => setRow("guias", i, "telefone", e.target.value)}
                          />
                        </td>
                        <td className={tdCls}>
                          <input
                            className={numCls}
                            value={g.diarias ?? ""}
                            placeholder="1"
                            onChange={(e) => handleGuiaDiariasChange(i, e.target.value)}
                          />
                        </td>
                        <td className={tdCls}>
                          <input
                            className={numCls}
                            value={vDiariaDisplay}
                            placeholder="0,00"
                            onChange={(e) => handleGuiaValorDiariaChange(i, e.target.value)}
                            onBlur={(e) => {
                              if (e.target.value) {
                                handleGuiaValorDiariaChange(i, formatBRL(e.target.value, false));
                              }
                            }}
                          />
                        </td>
                        <td className={tdCls}>
                          <input
                            className={`${numCls} font-semibold text-primary`}
                            value={vTotalDisplay}
                            placeholder="0,00"
                            onChange={(e) => handleGuiaValorTotalChange(i, e.target.value)}
                            onBlur={(e) => {
                              if (e.target.value) {
                                handleGuiaValorTotalChange(i, formatBRL(e.target.value, false));
                              }
                            }}
                          />
                        </td>
                        <td className={`${tdCls} text-center`}>
                          <StatusSelect value={g.status ?? "CONFIRMADO"} onChange={(v) => setRow("guias", i, "status", v)} />
                        </td>
                        <td className={`${tdCls} text-center`}>
                          <DeleteRowBtn onClick={() => handleRemoveGuia(i)} />
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
          <button
            onClick={handleAddGuia}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors cursor-pointer"
          >
            <Plus size={14} /> Adicionar Guia
          </button>

          {/* Seção de Despesas Extras do Guia (substituindo Roteiro) */}
          <div className="space-y-2 pt-3 border-t border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-title">
                <DollarSign size={14} className="text-primary" />
                <span>Despesas Adicionais do Guia</span>
              </div>
              <span className="text-xs text-text-muted font-medium">
                Total Despesas Extras: {formatBRL(sumDespesas)}
              </span>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={`${thCls} text-left w-[70%]`}>Descrição da Despesa</th>
                  <th className={`${thCls} text-right w-[24%]`}>Valor (R$)</th>
                  <th className="w-[6%]" />
                </tr>
              </thead>
              <tbody>
                {(d.despesas ?? []).map(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (desp: any, i: number) => (
                    <tr key={i}>
                      <td className={tdCls}>
                        <input
                          className={inputCls}
                          value={desp.descricao ?? ""}
                          placeholder="Ex: Alimentação, Transfer, Hospedagem do guia..."
                          onChange={(e) => handleDespesaDescricaoChange(i, e.target.value)}
                        />
                      </td>
                      <td className={tdCls}>
                        <input
                          className={numCls}
                          value={desp.valor ?? ""}
                          placeholder="0,00"
                          onChange={(e) => handleDespesaValorChange(i, e.target.value)}
                          onBlur={(e) => {
                            if (e.target.value) {
                              handleDespesaValorChange(i, formatBRL(e.target.value, false));
                            }
                          }}
                        />
                      </td>
                      <td className={`${tdCls} text-center`}>
                        <DeleteRowBtn onClick={() => handleRemoveDespesa(i)} />
                      </td>
                    </tr>
                  )
                )}
                {(!d.despesas || d.despesas.length === 0) && (
                  <tr>
                    <td colSpan={3} className="py-2.5 text-center text-xs text-text-muted italic">
                      Nenhuma despesa extra adicionada. Clique abaixo para incluir alimentação, transporte, etc.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <button
              onClick={handleAddDespesa}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors cursor-pointer"
            >
              <Plus size={14} /> Adicionar Despesa
            </button>
          </div>

          {/* Resumo Financeiro de Guias e Despesas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3.5 rounded-xl border border-border bg-surface-subtle/50">
            <label className="text-xs text-text-muted">
              <span className="block mb-1 font-medium">Total Diárias Guias (R$)</span>
              <input
                readOnly
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface/70 text-text-body text-sm text-right tabular-nums font-medium focus:outline-none"
                value={formatBRL(sumGuias, false)}
              />
            </label>
            <label className="text-xs text-text-muted">
              <span className="block mb-1 font-medium">Outras Despesas (R$)</span>
              <input
                readOnly
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface/70 text-text-body text-sm text-right tabular-nums font-medium focus:outline-none"
                value={formatBRL(sumDespesas, false)}
              />
            </label>
            <label className="text-xs text-text-muted">
              <span className="block mb-1 font-medium">Valor Total de Despesas (R$)</span>
              <input
                readOnly
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums font-bold text-primary focus:outline-none"
                value={formatBRL(totalGeralDespesas, false)}
              />
            </label>
            <label className="text-xs text-text-muted">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">Rateio por Pessoa (R$)</span>
                {vagasNum > 0 && (
                  <span className="text-[10px] text-text-muted font-normal">
                    ({vagasNum} {vagasNum === 1 ? "vaga" : "vagas"})
                  </span>
                )}
              </div>
              <input
                readOnly
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface/70 text-text-body text-sm text-right tabular-nums font-bold text-primary focus:outline-none"
                value={rateioCalculado}
              />
            </label>
          </div>

          <BlockObservation
            value={d.observation}
            onChange={(v) => set("observation", v)}
            placeholder="Observações sobre guias e monitores..."
          />
        </div>
      );
    }

    // ---- Serviços Inclusos (Duplo/Triplo) ----
    case "servicos_inclusos": {
      const extraCols: string[] = d.extraColumns ?? [];
      const rows: { servico: string; [k: string]: string }[] = d.rows ?? [];
      const summaryRows: { label: string; [k: string]: string }[] = d.summaryRows ?? [];
      const valueKeys = ["duplo", "triplo", ...extraCols.map((_, i) => `extra_${i}`)];
      const headers = ["DUPLO", "TRIPLO", ...extraCols];

      return (
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={`${thCls} text-left`}>Serviço</th>
                {headers.map((h, hi) => (
                  <th key={hi} className={`${thCls} text-right`}>
                    {hi < 2 ? (
                      h
                    ) : (
                      <input
                        className={`${inputCls} text-right uppercase text-xs`}
                        value={h}
                        placeholder={`Coluna ${hi + 1}`}
                        onChange={(e) => {
                          const next = [...extraCols];
                          next[hi - 2] = e.target.value;
                          set("extraColumns", next);
                        }}
                      />
                    )}
                  </th>
                ))}
                <th className="w-[6%]" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className={tdCls}>
                    <input className={inputCls} value={r.servico} onChange={(e) => setRow("rows", i, "servico", e.target.value)} />
                  </td>
                  {valueKeys.map((k) => (
                    <td key={k} className={tdCls}>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        className={numCls}
                        value={r[k] ?? ""}
                        onChange={(e) => setRow("rows", i, k, e.target.value)}
                        onBlur={(e) => {
                          if (e.target.value.trim()) {
                            setRow("rows", i, k, formatBRL(e.target.value, false));
                          }
                        }}
                      />
                    </td>
                  ))}
                  <td className={`${tdCls} text-center`}>
                    <DeleteRowBtn onClick={() => removeRow("rows", i)} />
                  </td>
                </tr>
              ))}
              {/* Linhas de totalização */}
              {summaryRows.map((r, i) => (
                <tr key={`sum-${i}`} className="bg-surface-subtle font-semibold">
                  <td className={tdCls}>
                    <input className={`${inputCls} font-semibold`} value={r.label} onChange={(e) => setRow("summaryRows", i, "label", e.target.value)} />
                  </td>
                  {valueKeys.map((k) => (
                    <td key={k} className={tdCls}>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        className={`${numCls} font-semibold`}
                        value={r[k] ?? ""}
                        onChange={(e) => setRow("summaryRows", i, k, e.target.value)}
                        onBlur={(e) => {
                          if (e.target.value.trim()) {
                            setRow("summaryRows", i, k, formatBRL(e.target.value, false));
                          }
                        }}
                      />
                    </td>
                  ))}
                  <td className={`${tdCls} text-center`}>
                    <DeleteRowBtn onClick={() => removeRow("summaryRows", i)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-4 mt-2">
            <button
              onClick={() => addRow("rows", { servico: "Novo Serviço", duplo: "0,00", triplo: "0,00" })}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors"
            >
              <Plus size={14} /> Adicionar Serviço
            </button>
            <button
              onClick={() => addRow("summaryRows", { label: "Nova Linha", duplo: "0,00", triplo: "0,00" })}
              className="flex items-center gap-1.5 text-sm text-tertiary hover:text-primary font-medium transition-colors"
            >
              <Plus size={14} /> Adicionar Totalizador
            </button>
            <button
              onClick={() => set("extraColumns", [...extraCols, `QUÁDRUPLO`])}
              className="flex items-center gap-1.5 text-sm text-text-muted hover:text-primary font-medium transition-colors cursor-pointer"
            >
              <Plus size={14} /> Adicionar Coluna
            </button>
          </div>
          <BlockAgePricingSection
            agePricing={d.agePricing}
            defaultBaseCost={getBlockBaseUnitCost(block, 20)}
            onChange={(val) => set("agePricing", val)}
          />

          <BlockObservation
            value={d.observation}
            onChange={(v) => set("observation", v)}
            placeholder="Observações sobre serviços inclusos..."
          />
        </div>
      );
    }

    // ---- Tabela para Crianças ----
    case "criancas":
      return (
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={`${thCls} text-left w-[15%]`}>Idade</th>
                <th className={`${thCls} text-left w-[45%]`}>Inclusos</th>
                <th className={`${thCls} text-right w-[18%]`}>Valor à vista</th>
                <th className={`${thCls} text-right w-[18%]`}>Valor a prazo</th>
                <th className="w-[4%]" />
              </tr>
            </thead>
            <tbody>
              {(d.rows ?? []).map(
                (r: { idade: string; inclusos: string; valor: string; valor2: string }, i: number) => (
                  <tr key={i}>
                    <td className={tdCls}>
                      <input className={inputCls} value={r.idade} onChange={(e) => setRow("rows", i, "idade", e.target.value)} />
                    </td>
                    <td className={tdCls}>
                      <input className={inputCls} value={r.inclusos} onChange={(e) => setRow("rows", i, "inclusos", e.target.value)} />
                    </td>
                    <td className={tdCls}>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        className={numCls}
                        value={r.valor}
                        onChange={(e) => setRow("rows", i, "valor", e.target.value)}
                        onBlur={(e) => {
                          if (e.target.value.trim()) {
                            setRow("rows", i, "valor", formatBRL(e.target.value, false));
                          }
                        }}
                      />
                    </td>
                    <td className={tdCls}>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        className={numCls}
                        value={r.valor2}
                        onChange={(e) => setRow("rows", i, "valor2", e.target.value)}
                        onBlur={(e) => {
                          if (e.target.value.trim()) {
                            setRow("rows", i, "valor2", formatBRL(e.target.value, false));
                          }
                        }}
                      />
                    </td>
                    <td className={`${tdCls} text-center`}>
                      <DeleteRowBtn onClick={() => removeRow("rows", i)} />
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          <button
            onClick={() => addRow("rows", { idade: "", inclusos: "", valor: "0,00", valor2: "0,00" })}
            className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors cursor-pointer"
          >
            <Plus size={14} /> Adicionar Faixa Etária
          </button>
          <BlockObservation
            value={d.observation}
            onChange={(v) => set("observation", v)}
            placeholder="Observações sobre tabela de crianças..."
          />
        </div>
      );

    // ---- Roteiro por Dias ----
    case "roteiro_dias":
      return (
        <div className="space-y-2">
          {(d.days ?? []).map((day: { dia: string; descricao: string }, i: number) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-surface-subtle">
              <input
                className="w-20 shrink-0 px-2 py-1.5 rounded-md bg-surface border border-border text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                value={day.dia}
                onChange={(e) => setRow("days", i, "dia", e.target.value)}
              />
              <textarea
                className="flex-1 px-2 py-1.5 rounded-md border border-transparent bg-transparent text-text-body text-sm focus:outline-none focus:border-primary focus:bg-surface transition-all resize-none"
                rows={2}
                value={day.descricao}
                placeholder="Atividades do dia..."
                onChange={(e) => setRow("days", i, "descricao", e.target.value)}
              />
              <DeleteRowBtn onClick={() => removeRow("days", i)} />
            </div>
          ))}
          <button
            onClick={() => addRow("days", { dia: `DIA ${(d.days?.length ?? 0) + 1}`, descricao: "" })}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors cursor-pointer"
          >
            <Plus size={14} /> Adicionar Dia
          </button>
          <BlockObservation
            value={d.observation}
            onChange={(v) => set("observation", v)}
            placeholder="Observações gerais do roteiro..."
          />
        </div>
      );

    // ---- Tabela Customizada ----
    case "personalizada":
    default:
      return (
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={`${thCls} text-left w-[35%]`}>Item</th>
                <th className={`${thCls} text-left w-[30%]`}>Fornecedor</th>
                <th className={`${thCls} text-right w-[20%]`}>Valor (R$)</th>
                <th className={`${thCls} text-center w-[15%]`}>Status</th>
                <th className="w-[6%]" />
              </tr>
            </thead>
            <tbody>
              {(d.rows ?? []).map(
                (
                  r: { item: string; fornecedor: string; valor: string; status: RowStatus },
                  i: number
                ) => (
                  <tr key={i}>
                    <td className={tdCls}>
                      <input className={inputCls} value={r.item} onChange={(e) => setRow("rows", i, "item", e.target.value)} />
                    </td>
                    <td className={tdCls}>
                      <input className={inputCls} value={r.fornecedor} onChange={(e) => setRow("rows", i, "fornecedor", e.target.value)} />
                    </td>
                    <td className={tdCls}>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        className={numCls}
                        value={r.valor}
                        onChange={(e) => setRow("rows", i, "valor", e.target.value)}
                        onBlur={(e) => {
                          if (e.target.value.trim()) {
                            setRow("rows", i, "valor", formatBRL(e.target.value, false));
                          }
                        }}
                      />
                    </td>
                    <td className={`${tdCls} text-center`}>
                      <StatusSelect value={r.status ?? "CONFIRMADO"} onChange={(v) => setRow("rows", i, "status", v)} />
                    </td>
                    <td className={`${tdCls} text-center`}>
                      <DeleteRowBtn onClick={() => removeRow("rows", i)} />
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          <button
            onClick={() => addRow("rows", { item: "Novo Item", fornecedor: "", valor: "0,00", status: "PENDENTE" })}
            className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors cursor-pointer"
          >
            <Plus size={14} /> Adicionar Linha
          </button>
          <BlockObservation
            value={d.observation}
            onChange={(v) => set("observation", v)}
            placeholder="Observações da tabela..."
          />
        </div>
      );
  }
}
