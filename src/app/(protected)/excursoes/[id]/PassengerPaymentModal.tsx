"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Trash2,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  DollarSign,
  FileText,
  RotateCcw,
  Check,
  ChevronDown,
  Sparkles,
  Layers,
  ArrowRight,
} from "lucide-react";
import type {
  CustomGuestPayment,
  CustomPaymentMethodItem,
  PaymentMethodType,
  AddonGuestPayment,
} from "@/lib/actions/addons";
import { parseNum, formatBRL } from "@/lib/package-calc";

export interface PassengerPaymentModalData {
  id: string;
  name: string;
  roomName: string;
  age: number | null;
  birthDate?: string | null;
  packageFinalPrice: number;
  totalAddonsPrice: number;
  totalReceivable: number;
  paymentMode: "vista" | "prazo" | "personalizado";
  status: "pago" | "parcial" | "pendente";
  amountPaid: number;
  pendingAmount: number;
  paymentInfo?: AddonGuestPayment;
  customPayment?: CustomGuestPayment;
}

interface PassengerPaymentModalProps {
  open: boolean;
  onClose: () => void;
  passenger: PassengerPaymentModalData | null;
  onSavePayment: (params: {
    guestId: string;
    status: "pago" | "parcial" | "pendente";
    amountPaid: number;
    paymentMethod?: string;
    paidAt?: string;
    notes?: string;
    customPayment?: CustomGuestPayment;
    paymentMode?: "vista" | "prazo" | "personalizado";
  }) => Promise<void>;
}

const AVAILABLE_PAYMENT_METHODS: PaymentMethodType[] = [
  "Boleto",
  "Dinheiro",
  "Cartão de Crédito",
  "Cartão de Débito",
  "PIX",
  "Transferência",
];

function fmt(v: unknown) {
  return formatBRL(v);
}

function fmtDateBR(dateStr?: string | null) {
  if (!dateStr) return "-";
  const parts = dateStr.slice(0, 10).split("-").map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString("pt-BR");
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("pt-BR");
}

function isDateOverdue(dateStr?: string | null) {
  if (!dateStr) return false;
  const parts = dateStr.slice(0, 10).split("-").map(Number);
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
}

function generateId() {
  return `inst_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function PassengerPaymentModal({
  open,
  onClose,
  passenger,
  onSavePayment,
}: PassengerPaymentModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<"pago" | "parcial" | "pendente">("pendente");
  const [standardAmountPaid, setStandardAmountPaid] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("PIX");
  const [paidAt, setPaidAt] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<"vista" | "prazo" | "personalizado">("vista");
  const [installments, setInstallments] = useState<CustomPaymentMethodItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Inicializa o estado com base no passageiro ao abrir
  useEffect(() => {
    if (!open || !passenger) return;

    const currentMode = passenger.paymentMode || "vista";
    setPaymentMode(currentMode);

    const initialStatus = passenger.status || "pendente";
    setSelectedStatus(initialStatus);

    const initialAmount = passenger.amountPaid || 0;
    setStandardAmountPaid(initialAmount > 0 ? formatBRL(initialAmount, false) : "");

    const pInfo = passenger.paymentInfo;
    setPaymentMethod(pInfo?.paymentMethod || "PIX");
    setPaidAt(pInfo?.paidAt ? pInfo.paidAt.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setNotes(pInfo?.notes || "");

    // Parcelas personalizadas
    const cPayment = passenger.customPayment;
    if (cPayment && Array.isArray(cPayment.metodos) && cPayment.metodos.length > 0) {
      setInstallments(
        cPayment.metodos.map((m) => ({
          ...m,
          valor: formatBRL(m.valor, false),
        }))
      );
    } else {
      setInstallments([]);
    }
  }, [open, passenger]);

  const hasInstallments = installments.length > 0;

  // Cálculos dinâmicos com base APENAS no valor do pacote (sem adicionais)
  const packagePrice = passenger?.packageFinalPrice || 0;

  // Calcula valores caso haja parcelas
  const installmentCalculations = useMemo(() => {
    if (!hasInstallments) {
      return { totalPlanned: 0, totalPaid: 0, totalPending: 0, allPaid: false, somePaid: false };
    }

    let totalPlanned = 0;
    let totalPaid = 0;

    for (const item of installments) {
      const val = parseNum(item.valor);
      totalPlanned += val;
      if (item.pago) {
        totalPaid += val;
      }
    }

    const totalPending = Math.max(0, totalPlanned - totalPaid);
    const allPaid = installments.length > 0 && installments.every((m) => m.pago);
    const somePaid = installments.some((m) => m.pago);

    return { totalPlanned, totalPaid, totalPending, allPaid, somePaid };
  }, [installments, hasInstallments]);

  // Valor pago e saldo pendente efetivos para exibição (apenas do pacote)
  const effectiveAmountPaid = useMemo(() => {
    if (hasInstallments) {
      return installmentCalculations.totalPaid;
    }
    if (selectedStatus === "pago") {
      return packagePrice;
    }
    if (selectedStatus === "parcial") {
      const parsed = parseNum(standardAmountPaid);
      return Math.min(packagePrice, parsed);
    }
    return 0;
  }, [hasInstallments, installmentCalculations.totalPaid, selectedStatus, packagePrice, standardAmountPaid]);

  const effectivePendingAmount = Math.max(0, packagePrice - effectiveAmountPaid);
  const paidPercentage = packagePrice > 0 ? Math.min(100, Math.round((effectiveAmountPaid / packagePrice) * 100)) : 0;

  // Alteração manual do Status Geral
  const handleSelectStatus = (newStatus: "pago" | "parcial" | "pendente") => {
    setSelectedStatus(newStatus);

    if (newStatus === "pago") {
      setStandardAmountPaid(formatBRL(packagePrice, false));
      // Se houver parcelas, pode dar baixa em todas
      if (hasInstallments) {
        setInstallments((prev) =>
          prev.map((item) => ({
            ...item,
            pago: true,
            paidAt: item.paidAt || new Date().toISOString(),
          }))
        );
      }
    } else if (newStatus === "pendente") {
      setStandardAmountPaid("");
      if (hasInstallments) {
        setInstallments((prev) =>
          prev.map((item) => ({
            ...item,
            pago: false,
            paidAt: undefined,
          }))
        );
      }
    } else if (newStatus === "parcial") {
      if (!standardAmountPaid && packagePrice > 0) {
        setStandardAmountPaid(formatBRL(packagePrice / 2, false));
      }
    }
  };

  // Alternar pagamento ("Dar baixa" / "Desfazer baixa") em uma parcela individual
  const handleToggleInstallmentPaid = (id: string) => {
    const nextInstallments = installments.map((m) => {
      if (m.id !== id) return m;
      const nextPaid = !m.pago;
      return {
        ...m,
        pago: nextPaid,
        paidAt: nextPaid ? new Date().toISOString() : undefined,
      };
    });

    setInstallments(nextInstallments);

    // Recalcula o status geral automaticamente
    const allPaid = nextInstallments.every((m) => m.pago);
    const somePaid = nextInstallments.some((m) => m.pago);

    if (allPaid) {
      setSelectedStatus("pago");
    } else if (somePaid) {
      setSelectedStatus("parcial");
    } else {
      setSelectedStatus("pendente");
    }
  };

  // Dar baixa em todas as parcelas
  const handleMarkAllInstallmentsPaid = () => {
    setInstallments((prev) =>
      prev.map((item) => ({
        ...item,
        pago: true,
        paidAt: item.paidAt || new Date().toISOString(),
      }))
    );
    setSelectedStatus("pago");
  };

  // Marcar todas as parcelas como pendentes
  const handleMarkAllInstallmentsPending = () => {
    setInstallments((prev) =>
      prev.map((item) => ({
        ...item,
        pago: false,
        paidAt: undefined,
      }))
    );
    setSelectedStatus("pendente");
  };

  // Adicionar nova parcela
  const handleAddInstallment = () => {
    const currentSum = installments.reduce((sum, m) => sum + parseNum(m.valor), 0);
    const remaining = Math.max(0, packagePrice - currentSum);

    const newItem: CustomPaymentMethodItem = {
      id: generateId(),
      metodo: "PIX",
      valor: formatBRL(remaining > 0 ? remaining : packagePrice / (installments.length + 1 || 1), false),
      descricao: `${installments.length + 1}ª Parcela`,
      dataVencimento: new Date().toISOString().slice(0, 10),
      pago: false,
    };

    setInstallments((prev) => [...prev, newItem]);
    setPaymentMode("personalizado");
  };

  // Remover parcela
  const handleRemoveInstallment = (id: string) => {
    const next = installments.filter((m) => m.id !== id);
    setInstallments(next);
    if (next.length === 0) {
      setPaymentMode("vista");
    } else {
      const allPaid = next.every((m) => m.pago);
      const somePaid = next.some((m) => m.pago);
      if (allPaid) setSelectedStatus("pago");
      else if (somePaid) setSelectedStatus("parcial");
      else setSelectedStatus("pendente");
    }
  };

  // Atualizar campo de uma parcela
  const handleUpdateInstallment = (
    id: string,
    field: keyof CustomPaymentMethodItem,
    val: unknown
  ) => {
    setInstallments((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: val } : m))
    );
  };

  // Ativar parcelamento personalizado para passageiro padrão
  const handleConvertToInstallments = () => {
    const half = packagePrice / 2;
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const initialItems: CustomPaymentMethodItem[] = [
      {
        id: generateId(),
        metodo: "PIX",
        valor: formatBRL(half, false),
        descricao: "1ª Parcela (Entrada)",
        dataVencimento: today.toISOString().slice(0, 10),
        pago: selectedStatus === "pago" || selectedStatus === "parcial",
        paidAt: selectedStatus === "pago" || selectedStatus === "parcial" ? today.toISOString() : undefined,
      },
      {
        id: generateId(),
        metodo: "Boleto",
        valor: formatBRL(half, false),
        descricao: "2ª Parcela (Saldo)",
        dataVencimento: nextMonth.toISOString().slice(0, 10),
        pago: selectedStatus === "pago",
        paidAt: selectedStatus === "pago" ? today.toISOString() : undefined,
      },
    ];

    setInstallments(initialItems);
    setPaymentMode("personalizado");

    if (selectedStatus === "pago") {
      setSelectedStatus("pago");
    } else if (selectedStatus === "parcial") {
      setSelectedStatus("parcial");
    } else {
      setSelectedStatus("pendente");
    }
  };

  // Salvar
  const handleSave = async () => {
    if (!passenger) return;
    setIsSaving(true);

    try {
      let finalStatus = selectedStatus;
      let finalAmountPaid = effectiveAmountPaid;
      let finalCustomPayment: CustomGuestPayment | undefined = undefined;

      if (hasInstallments) {
        const parsedMetodos = installments.map((m) => ({
          ...m,
          valor: parseNum(m.valor),
        }));
        finalCustomPayment = {
          valorTotal: packagePrice,
          taxaCartao: passenger.customPayment?.taxaCartao || 0,
          metodos: parsedMetodos,
        };

        const allPaid = parsedMetodos.every((m) => m.pago);
        const somePaid = parsedMetodos.some((m) => m.pago);

        if (allPaid) {
          finalStatus = "pago";
          finalAmountPaid = packagePrice;
        } else if (somePaid) {
          finalStatus = "parcial";
          finalAmountPaid = parsedMetodos.filter((m) => m.pago).reduce((sum, m) => sum + m.valor, 0);
        } else {
          finalStatus = "pendente";
          finalAmountPaid = 0;
        }
      } else {
        if (finalStatus === "pago") {
          finalAmountPaid = packagePrice;
        } else if (finalStatus === "pendente") {
          finalAmountPaid = 0;
        } else {
          finalAmountPaid = parseNum(standardAmountPaid);
        }
      }

      await onSavePayment({
        guestId: passenger.id,
        status: finalStatus,
        amountPaid: finalAmountPaid,
        paymentMethod: paymentMethod,
        paidAt: finalStatus === "pago" || finalAmountPaid > 0 ? (paidAt || new Date().toISOString()) : undefined,
        notes: notes.trim() || undefined,
        customPayment: hasInstallments ? finalCustomPayment : undefined,
        paymentMode: hasInstallments ? "personalizado" : paymentMode,
      });

      onClose();
    } catch (err) {
      console.error("Erro ao salvar pagamento do passageiro:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!open || !passenger) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-subtle/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <DollarSign size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-title">
                  Gerenciar Recebimento & Status
                </h3>
                <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                  <span className="font-semibold text-text-body">{passenger.name}</span>
                  <span>•</span>
                  <span>{passenger.roomName}</span>
                  {passenger.age !== null && (
                    <>
                      <span>•</span>
                      <span>{passenger.age} anos</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-title hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-5 max-h-[calc(85vh-130px)] overflow-y-auto">
            {/* Cards de Resumo Financeiro */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-surface-subtle/70 border border-border rounded-xl p-3">
                <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  Valor do Pacote
                </div>
                <div className="text-base font-bold text-text-title mt-1 font-mono">
                  {fmt(packagePrice)}
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  Pacote Contratado (sem adicionais)
                </div>
              </div>

              <div className="bg-status-success/10 border border-status-success/20 rounded-xl p-3">
                <div className="text-[11px] font-semibold text-status-success uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Total Quitado
                </div>
                <div className="text-base font-bold text-status-success mt-1 font-mono">
                  {fmt(effectiveAmountPaid)}
                </div>
                <div className="text-[10px] text-status-success/80 mt-0.5 font-semibold">
                  {paidPercentage}% do pacote quitado
                </div>
              </div>

              <div className={`rounded-xl p-3 border ${
                effectivePendingAmount > 0
                  ? "bg-status-danger/10 border-status-danger/20"
                  : "bg-surface-subtle/40 border-border"
              }`}>
                <div className={`text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1 ${
                  effectivePendingAmount > 0 ? "text-status-danger" : "text-text-muted"
                }`}>
                  <Clock size={12} />
                  Saldo Pendente
                </div>
                <div className={`text-base font-bold mt-1 font-mono ${
                  effectivePendingAmount > 0 ? "text-status-danger" : "text-text-muted"
                }`}>
                  {fmt(effectivePendingAmount)}
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  {effectivePendingAmount > 0 ? "Aguardando baixa do pacote" : "Pacote 100% quitado"}
                </div>
              </div>
            </div>

            {/* Barra de Progresso Visual */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-text-body">Progresso da Quitação</span>
                <span className="font-mono font-bold text-text-title">{paidPercentage}%</span>
              </div>
              <div className="h-2 w-full bg-surface-subtle rounded-full overflow-hidden border border-border">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    paidPercentage === 100
                      ? "bg-status-success"
                      : paidPercentage > 0
                      ? "bg-status-warning"
                      : "bg-status-danger/40"
                  }`}
                  style={{ width: `${paidPercentage}%` }}
                />
              </div>
            </div>

            {/* SELETOR PRINCIPAL DE STATUS */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-title uppercase tracking-wider block">
                Status Geral do Passageiro
              </label>
              <div className="grid grid-cols-3 gap-2">
                {/* PENDENTE */}
                <button
                  type="button"
                  onClick={() => handleSelectStatus("pendente")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedStatus === "pendente"
                      ? "bg-status-danger/15 border-status-danger text-status-danger shadow-sm ring-1 ring-status-danger"
                      : "bg-surface-subtle/60 border-border text-text-muted hover:border-border/80 hover:text-text-body"
                  }`}
                >
                  <Clock size={18} className="mb-1" />
                  <span className="text-xs font-bold">Pendente</span>
                  <span className="text-[10px] opacity-80 mt-0.5">Nenhum valor pago</span>
                </button>

                {/* PARCIAL */}
                <button
                  type="button"
                  onClick={() => handleSelectStatus("parcial")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedStatus === "parcial"
                      ? "bg-status-warning/15 border-status-warning text-status-warning shadow-sm ring-1 ring-status-warning"
                      : "bg-surface-subtle/60 border-border text-text-muted hover:border-border/80 hover:text-text-body"
                  }`}
                >
                  <AlertCircle size={18} className="mb-1" />
                  <span className="text-xs font-bold">Parcial</span>
                  <span className="text-[10px] opacity-80 mt-0.5">Parte do valor quitado</span>
                </button>

                {/* PAGO / QUITADO */}
                <button
                  type="button"
                  onClick={() => handleSelectStatus("pago")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedStatus === "pago"
                      ? "bg-status-success/15 border-status-success text-status-success shadow-sm ring-1 ring-status-success"
                      : "bg-surface-subtle/60 border-border text-text-muted hover:border-border/80 hover:text-text-body"
                  }`}
                >
                  <CheckCircle2 size={18} className="mb-1" />
                  <span className="text-xs font-bold">Pago (Quitado)</span>
                  <span className="text-[10px] opacity-80 mt-0.5">100% recebido</span>
                </button>
              </div>
            </div>

            {/* SEÇÃO: PARCELAS E PRAZOS (PERSONALIZADO DO CHECKOUT OU ADICIONADO) */}
            {hasInstallments ? (
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-text-title uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard size={14} className="text-primary" />
                      Prazos & Formas de Pagamento ({installments.length})
                    </h4>
                    <p className="text-[11px] text-text-muted">
                      Dê baixa em cada parcela individualmente. O status geral é atualizado automaticamente.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleMarkAllInstallmentsPaid}
                      className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-status-success/15 text-status-success border border-status-success/30 hover:bg-status-success/25 transition-colors cursor-pointer"
                    >
                      ✓ Quitar Todas
                    </button>
                    <button
                      type="button"
                      onClick={handleMarkAllInstallmentsPending}
                      className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-surface-subtle text-text-muted border border-border hover:text-text-body transition-colors cursor-pointer"
                    >
                      Pendente
                    </button>
                    <button
                      type="button"
                      onClick={handleAddInstallment}
                      className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={11} /> Parcela
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {installments.map((inst, idx) => {
                    const isPaid = !!inst.pago;
                    const overdue = !isPaid && isDateOverdue(inst.dataVencimento);

                    return (
                      <div
                        key={inst.id}
                        className={`p-3 rounded-xl border transition-all ${
                          isPaid
                            ? "bg-status-success/5 border-status-success/30"
                            : overdue
                            ? "bg-status-danger/5 border-status-danger/30"
                            : "bg-surface-subtle/50 border-border"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Info da parcela */}
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-text-title">
                                {inst.descricao || `${idx + 1}ª Parcela`}
                              </span>

                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface border border-border text-text-body">
                                {inst.metodo}
                              </span>

                              {isPaid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-success/15 text-status-success border border-status-success/30">
                                  <Check size={10} />
                                  Baixa Realizada
                                </span>
                              ) : overdue ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-danger/15 text-status-danger border border-status-danger/30">
                                  <AlertCircle size={10} />
                                  Vencido
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface text-text-muted border border-border">
                                  <Clock size={10} />
                                  A Vencer
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
                              <div className="flex items-center gap-1">
                                <Calendar size={12} className="text-text-muted" />
                                <span>Vencimento:</span>
                                <input
                                  type="date"
                                  value={inst.dataVencimento || ""}
                                  onChange={(e) =>
                                    handleUpdateInstallment(inst.id, "dataVencimento", e.target.value)
                                  }
                                  className="px-1.5 py-0.5 rounded bg-surface border border-border text-xs text-text-body focus:outline-none focus:border-primary"
                                />
                              </div>

                              {isPaid && inst.paidAt && (
                                <span className="text-[11px] text-status-success font-medium">
                                  (Pago em {fmtDateBR(inst.paidAt)})
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Valor e Ação de Baixa */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                            <div className="text-right">
                              <div className="text-xs text-text-muted font-medium">Valor:</div>
                              <input
                                type="text"
                                value={inst.valor}
                                onChange={(e) =>
                                  handleUpdateInstallment(inst.id, "valor", e.target.value)
                                }
                                className="w-24 text-right px-2 py-1 rounded-lg bg-surface border border-border text-xs font-mono font-bold text-text-title focus:outline-none focus:border-primary"
                              />
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Botão de Dar Baixa */}
                              <button
                                type="button"
                                onClick={() => handleToggleInstallmentPaid(inst.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                                  isPaid
                                    ? "bg-status-success text-white hover:bg-status-success/90"
                                    : "bg-primary text-white hover:bg-primary/90"
                                }`}
                              >
                                <Check size={13} />
                                {isPaid ? "Dar Baixa Feita" : "Dar Baixa"}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRemoveInstallment(inst.id)}
                                title="Remover parcela"
                                className="p-1.5 rounded-lg text-text-muted hover:text-status-danger hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* SEÇÃO: PAGAMENTO DIRETO (SEM PARCELAS CONFIGURADAS) */
              <div className="space-y-4 pt-2 border-t border-border">
                {selectedStatus === "parcial" && (
                  <div className="p-3.5 bg-status-warning/10 border border-status-warning/20 rounded-xl space-y-2">
                    <label className="text-xs font-bold text-status-warning uppercase tracking-wider block">
                      Valor Recebido até o Momento (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">
                        R$
                      </span>
                      <input
                        type="text"
                        placeholder="0,00"
                        value={standardAmountPaid}
                        onChange={(e) => setStandardAmountPaid(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface border border-border text-sm font-mono font-bold text-text-title focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-text-muted pt-1">
                      <span>Valor do Pacote: {fmt(packagePrice)}</span>
                      <span className="font-semibold text-status-danger">
                        Falta receber: {fmt(effectivePendingAmount)}
                      </span>
                    </div>
                  </div>
                )}

                {selectedStatus !== "pendente" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-text-title uppercase tracking-wider block mb-1.5">
                        Forma de Pagamento
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-text-body font-medium focus:outline-none focus:border-primary"
                      >
                        {AVAILABLE_PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-text-title uppercase tracking-wider block mb-1.5">
                        Data do Pagamento
                      </label>
                      <input
                        type="date"
                        value={paidAt}
                        onChange={(e) => setPaidAt(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-text-body font-medium focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                )}

                {/* Botão para desmembrar em parcelas com prazos */}
                <div className="p-3 bg-surface-subtle/50 border border-dashed border-border rounded-xl flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-text-title flex items-center gap-1.5">
                      <Sparkles size={13} className="text-primary" />
                      Múltiplas formas ou prazos de pagamento?
                    </span>
                    <p className="text-[11px] text-text-muted">
                      Desmembre este passageiro em parcelas (Boleto, PIX, Cartão) com datas de vencimento específicas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleConvertToInstallments}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    + Criar Parcelas
                  </button>
                </div>
              </div>
            )}

            {/* Observações / Anotações */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-title uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={13} className="text-text-muted" />
                Observações do Pagamento (Opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Comprovante de PIX enviado no WhatsApp, 2ª parcela prometida para o dia 10..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-text-body focus:outline-none focus:border-primary resize-none"
              />
            </div>
          </div>

          {/* Footer com Ações */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-surface-subtle/50">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text-body hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/90 transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check size={14} />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
