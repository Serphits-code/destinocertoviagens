"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Trash2,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Percent,
  Sparkles,
  Receipt,
  RotateCcw,
} from "lucide-react";
import type {
  CustomGuestPayment,
  CustomPaymentMethodItem,
  PaymentMethodType,
} from "@/lib/actions/addons";
import { parseNum } from "@/lib/package-calc";

interface CustomPaymentModalProps {
  open: boolean;
  onClose: () => void;
  passengerName: string;
  passengerDoc?: string;
  passengerAgeBracket: string;
  roomType: string;
  defaultCashPrice: number;
  defaultPrazoPrice: number;
  guestBaseCost: number;
  initialData?: CustomGuestPayment;
  onSave: (payment: CustomGuestPayment) => void;
  onResetToStandard?: () => void;
}

const AVAILABLE_PAYMENT_METHODS: PaymentMethodType[] = [
  "Boleto",
  "Dinheiro",
  "Cartão de Crédito",
  "Cartão de Débito",
  "PIX",
  "Transferência",
];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function generateInstallmentId() {
  return `inst_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function CustomPaymentModal({
  open,
  onClose,
  passengerName,
  passengerDoc,
  passengerAgeBracket,
  roomType,
  defaultCashPrice,
  defaultPrazoPrice,
  guestBaseCost,
  initialData,
  onSave,
  onResetToStandard,
}: CustomPaymentModalProps) {
  // Valor total personalizado a pagar
  const [totalVal, setTotalVal] = useState<string>("");
  // Taxa de cartão / operadora
  const [taxaCartao, setTaxaCartao] = useState<string>("");
  // Formas de pagamento
  const [metodos, setMetodos] = useState<CustomPaymentMethodItem[]>([]);

  // Inicializa quando abre
  useEffect(() => {
    if (open) {
      if (initialData && (initialData.valorTotal !== undefined || initialData.metodos?.length > 0)) {
        setTotalVal(
          initialData.valorTotal !== undefined && initialData.valorTotal !== ""
            ? String(initialData.valorTotal)
            : String(
                initialData.metodos?.reduce(
                  (sum, m) => sum + parseNum(m.valor),
                  0
                ) || defaultCashPrice
              )
        );
        setTaxaCartao(initialData.taxaCartao ? String(initialData.taxaCartao) : "");
        setMetodos(
          Array.isArray(initialData.metodos) && initialData.metodos.length > 0
            ? initialData.metodos
            : [
                {
                  id: generateInstallmentId(),
                  metodo: "Boleto",
                  valor: String(defaultCashPrice),
                  descricao: "Pagamento Integral",
                },
              ]
        );
      } else {
        // Inicializa com valor padrão à vista
        setTotalVal(String(defaultCashPrice));
        setTaxaCartao("");
        setMetodos([
          {
            id: generateInstallmentId(),
            metodo: "Boleto",
            valor: String(defaultCashPrice),
            descricao: "1ª Parcela",
          },
        ]);
      }
    }
  }, [open, initialData, defaultCashPrice]);

  const numTotal = parseNum(totalVal);
  const numTaxa = parseNum(taxaCartao);

  // Soma de todos os métodos informados
  const sumMetodos = useMemo(() => {
    return metodos.reduce((acc, m) => acc + parseNum(m.valor), 0);
  }, [metodos]);

  const diff = Math.round((numTotal - sumMetodos) * 100) / 100;
  const isPerfectMatch = Math.abs(diff) < 0.01 && numTotal > 0;
  const isMissing = diff > 0.01;
  const isExceeding = diff < -0.01;

  // Lucro estimado para este passageiro
  const effectiveCost = guestBaseCost + numTaxa;
  const estimatedProfit = numTotal - effectiveCost;

  // Handlers
  const handleAddMethod = (initialValue?: number) => {
    const valToAdd = initialValue !== undefined ? initialValue : (diff > 0 ? diff : 0);
    const nextNumber = metodos.length + 1;
    setMetodos((prev) => [
      ...prev,
      {
        id: generateInstallmentId(),
        metodo: "Boleto",
        valor: valToAdd > 0 ? valToAdd.toFixed(2) : "",
        descricao: `${nextNumber}ª Parcela`,
      },
    ]);
  };

  const handleUpdateMethod = (
    id: string,
    field: keyof CustomPaymentMethodItem,
    value: string
  ) => {
    setMetodos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleRemoveMethod = (id: string) => {
    setMetodos((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSplitEvenly = (numInstallments: number) => {
    if (numInstallments < 1 || numTotal <= 0) return;
    const part = Math.floor((numTotal / numInstallments) * 100) / 100;
    const remainder = Math.round((numTotal - part * numInstallments) * 100) / 100;

    const newItems: CustomPaymentMethodItem[] = [];
    for (let i = 0; i < numInstallments; i++) {
      const val = i === 0 ? part + remainder : part;
      newItems.push({
        id: generateInstallmentId(),
        metodo: "Boleto",
        valor: val.toFixed(2),
        descricao: `${i + 1}ª Parcela`,
      });
    }
    setMetodos(newItems);
  };

  const handleSave = () => {
    onSave({
      valorTotal: numTotal,
      taxaCartao: numTaxa,
      metodos: metodos.map((m) => ({
        ...m,
        valor: parseNum(m.valor),
      })),
    });
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl bg-surface rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-subtle">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/20 shrink-0">
                ⚙️
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-text-title leading-tight">
                  Pagamento Personalizado
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  <span className="font-semibold text-text-title">{passengerName}</span>
                  {passengerDoc && <span> · Doc: {passengerDoc}</span>}
                  <span> · Quarto: {roomType}</span>
                  <span> · {passengerAgeBracket}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-text-muted hover:text-text-title hover:bg-surface transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Conteúdo com Scroll */}
          <div className="p-6 overflow-y-auto space-y-6">
            {/* Bloco 1: Valor Total Personalizado */}
            <div className="p-4 rounded-2xl border border-border bg-surface-subtle/50 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold text-text-title flex items-center gap-1.5">
                  <DollarSign size={15} className="text-primary" />
                  <span>Valor Total a Pagar pelo Pacote (R$):</span>
                </label>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-text-muted">Sugestões rápidas:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTotalVal(String(defaultCashPrice));
                      if (metodos.length === 1) {
                        setMetodos([{ ...metodos[0], valor: String(defaultCashPrice) }]);
                      }
                    }}
                    className="px-2 py-0.5 rounded-md bg-surface border border-border hover:border-primary text-text-title font-semibold transition-all cursor-pointer"
                  >
                    À Vista ({fmt(defaultCashPrice)})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTotalVal(String(defaultPrazoPrice));
                      if (metodos.length === 1) {
                        setMetodos([{ ...metodos[0], valor: String(defaultPrazoPrice) }]);
                      }
                    }}
                    className="px-2 py-0.5 rounded-md bg-surface border border-border hover:border-primary text-text-title font-semibold transition-all cursor-pointer"
                  >
                    A Prazo ({fmt(defaultPrazoPrice)})
                  </button>
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-text-muted">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={totalVal}
                  onChange={(e) => setTotalVal(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-surface text-text-title text-lg font-black tracking-tight focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono shadow-2xs"
                />
              </div>

              <p className="text-[11px] text-text-muted leading-relaxed">
                Este valor substituirá o preço padrão do quarto ({roomType}) para este passageiro e será a referência final para cálculo de receita e lucro da agência.
              </p>
            </div>

            {/* Bloco 2: Divisão em Formas de Pagamento */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-bold text-text-title flex items-center gap-1.5">
                    <Receipt size={15} className="text-primary" />
                    <span>Divisão das Formas de Pagamento e Parcelas</span>
                  </h4>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Adicione formas de pagamento (boleto, dinheiro, cartão, etc.) até abater o valor total.
                  </p>
                </div>

                {/* Divisão Rápida */}
                {numTotal > 0 && (
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-text-muted">Dividir:</span>
                    {[2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleSplitEvenly(n)}
                        className="px-2 py-0.5 rounded-md bg-surface-subtle border border-border hover:border-primary text-text-title font-semibold transition-all cursor-pointer"
                        title={`Dividir igualmente em ${n} parcelas`}
                      >
                        {n}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Barra de Status do Rateio */}
              <div className={`p-3 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 transition-all ${
                isPerfectMatch
                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300"
                  : isMissing
                  ? "bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300"
                  : "bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-300"
              }`}>
                <div className="flex items-center gap-2">
                  {isPerfectMatch ? (
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle size={16} className={isMissing ? "text-amber-500 shrink-0" : "text-rose-500 shrink-0"} />
                  )}
                  <div>
                    <span className="font-bold">
                      Soma das formas: {fmt(sumMetodos)}
                    </span>
                    <span className="opacity-80"> de {fmt(numTotal)}</span>
                  </div>
                </div>

                <div>
                  {isPerfectMatch ? (
                    <span className="font-extrabold text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30">
                      ✓ 100% Abatido
                    </span>
                  ) : isMissing ? (
                    <button
                      type="button"
                      onClick={() => handleAddMethod(diff)}
                      className="font-bold text-[11px] px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30 transition-colors cursor-pointer"
                    >
                      + Abater restante de {fmt(diff)}
                    </button>
                  ) : (
                    <span className="font-bold text-[11px] px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/30">
                      Excede o total em {fmt(Math.abs(diff))}
                    </span>
                  )}
                </div>
              </div>

              {/* Lista de Formas de Pagamento */}
              <div className="space-y-2.5">
                {metodos.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl border border-border bg-surface hover:border-primary/40 transition-all shadow-2xs space-y-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                      {/* Método */}
                      <div className="sm:col-span-4">
                        <label className="text-[10px] text-text-muted font-medium block mb-1">
                          Forma de Pagamento
                        </label>
                        <select
                          value={item.metodo}
                          onChange={(e) =>
                            handleUpdateMethod(
                              item.id,
                              "metodo",
                              e.target.value as PaymentMethodType
                            )
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface-subtle text-text-title text-xs font-semibold focus:outline-none focus:border-primary transition-colors cursor-pointer"
                        >
                          {AVAILABLE_PAYMENT_METHODS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Valor */}
                      <div className="sm:col-span-3">
                        <label className="text-[10px] text-text-muted font-medium block mb-1">
                          Valor da Parcela (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.valor}
                          onChange={(e) =>
                            handleUpdateMethod(item.id, "valor", e.target.value)
                          }
                          placeholder="0.00"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-title text-xs font-bold text-right font-mono focus:outline-none focus:border-primary transition-all"
                        />
                      </div>

                      {/* Descrição / Rótulo */}
                      <div className="sm:col-span-4">
                        <label className="text-[10px] text-text-muted font-medium block mb-1">
                          Rótulo / Descrição
                        </label>
                        <input
                          type="text"
                          value={item.descricao ?? ""}
                          onChange={(e) =>
                            handleUpdateMethod(item.id, "descricao", e.target.value)
                          }
                          placeholder={`Ex: ${idx + 1}ª Parcela, Entrada`}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-title text-xs focus:outline-none focus:border-primary transition-all"
                        />
                      </div>

                      {/* Botão Remover */}
                      <div className="sm:col-span-1 flex items-end justify-center pt-3 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => handleRemoveMethod(item.id)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-status-danger hover:bg-status-danger-bg transition-colors cursor-pointer"
                          title="Remover esta forma de pagamento"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botão Adicionar Forma */}
              <button
                type="button"
                onClick={() => handleAddMethod()}
                className="w-full py-2.5 rounded-xl border border-dashed border-border hover:border-primary text-text-muted hover:text-primary bg-surface hover:bg-primary/5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus size={14} />
                <span>Adicionar Outra Forma de Pagamento / Parcela</span>
              </button>
            </div>

            {/* Bloco 3: Taxas de Máquina / Encargos (Opcional) */}
            <div className="p-4 rounded-2xl border border-border bg-surface-subtle/40 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-text-title flex items-center gap-1.5">
                  <Percent size={14} className="text-amber-500" />
                  <span>Taxa Financeira / Custo de Máquina de Cartão (R$):</span>
                </label>
                <span className="text-[10px] text-text-muted">(Opcional)</span>
              </div>
              <input
                type="number"
                step="0.01"
                value={taxaCartao}
                onChange={(e) => setTaxaCartao(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-title text-xs font-bold font-mono focus:outline-none focus:border-primary transition-all max-w-xs"
              />
              <p className="text-[10px] text-text-muted">
                Se o passageiro pagar no cartão com custo da operadora, informe o valor da taxa para abater do lucro da agência.
              </p>
            </div>

            {/* Bloco 4: Demonstração do Lucro em Tempo Real */}
            <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <TrendingUp size={14} />
                <span>Resultado Financeiro Estimado para Este Passageiro:</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                <div className="p-2.5 rounded-xl bg-surface border border-border/80">
                  <span className="text-[10px] text-text-muted block">Preço Pacote</span>
                  <span className="text-sm font-extrabold text-primary font-mono">
                    {fmt(numTotal)}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-surface border border-border/80">
                  <span className="text-[10px] text-text-muted block">Despesas Base</span>
                  <span className="text-sm font-extrabold text-text-title font-mono">
                    -{fmt(guestBaseCost)}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-surface border border-border/80">
                  <span className="text-[10px] text-text-muted block">Taxa Cartão</span>
                  <span className="text-sm font-extrabold text-amber-600 font-mono">
                    {numTaxa > 0 ? `-${fmt(numTaxa)}` : "R$ 0,00"}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-surface border border-border/80">
                  <span className="text-[10px] text-text-muted block">Lucro Agência</span>
                  <span className={`text-sm font-black font-mono ${
                    estimatedProfit >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}>
                    {estimatedProfit >= 0 ? `+${fmt(estimatedProfit)}` : fmt(estimatedProfit)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface-subtle gap-3 flex-wrap">
            {onResetToStandard && (
              <button
                type="button"
                onClick={() => {
                  onResetToStandard();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text-title hover:bg-surface border border-transparent hover:border-border transition-all cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Voltar ao Padrão (Quarto)</span>
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:text-text-title bg-surface hover:bg-surface-subtle border border-border transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-strong shadow-xs transition-all cursor-pointer"
              >
                <Sparkles size={14} />
                <span>Salvar Pagamento Personalizado</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
