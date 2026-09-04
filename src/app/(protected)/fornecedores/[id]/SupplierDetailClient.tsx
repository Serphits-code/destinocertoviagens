"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Save,
  Check,
  MessageSquare,
  DollarSign,
  Clock,
  CheckCircle2,
  CreditCard,
  Hotel,
  Plane,
  Briefcase,
  Car,
  Landmark,
  History,
} from "lucide-react";
import { updateSupplier } from "../actions";

interface SupplierDetailProps {
  initialSupplier: any;
  financialSummary: {
    totalInvoiced: number;
    totalPaid: number;
    totalPending: number;
    entriesCount: number;
  };
}

function formatCnpj(cnpj: string | null) {
  if (!cnpj) return "-";
  const c = cnpj.replace(/\D/g, "");
  if (c.length === 14) {
    return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
  }
  return cnpj;
}

function formatPhone(phone: string | null) {
  if (!phone) return "-";
  const p = phone.replace(/\D/g, "");
  if (p.length === 11) return `(${p.slice(0, 2)}) ${p.slice(2, 7)}-${p.slice(7)}`;
  if (p.length === 10) return `(${p.slice(0, 2)}) ${p.slice(2, 6)}-${p.slice(6)}`;
  return phone;
}

function formatDate(iso: string | null) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "-";
  }
}

function formatCurrency(val: number) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getCategoryBadge(cat: string | null) {
  switch (cat) {
    case "Hotéis":
      return { bg: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20", icon: Hotel };
    case "Cias Aéreas":
      return { bg: "bg-sky-500/10 text-sky-600 border-sky-500/20", icon: Plane };
    case "Operadoras":
      return { bg: "bg-primary/10 text-primary border-primary/20", icon: Briefcase };
    case "Locadora de Veículos":
      return { bg: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Car };
    case "Financeiro / Banco":
      return { bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: Landmark };
    default:
      return { bg: "bg-slate-500/10 text-slate-600 border-slate-500/20", icon: Building2 };
  }
}

export function SupplierDetailClient({
  initialSupplier,
  financialSummary,
}: SupplierDetailProps) {
  const [supplier, setSupplier] = useState(initialSupplier);
  const [form, setForm] = useState({ ...initialSupplier });
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const badge = getCategoryBadge(form.category);
  const BadgeIcon = badge.icon;
  const cleanMobile = form.mobile ? form.mobile.replace(/\D/g, "") : null;
  const hasWa = cleanMobile && cleanMobile.length >= 10;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus("saving");
    setErrorMessage("");

    const res = await updateSupplier(supplier.id, form);
    if (res.success) {
      setSaveStatus("saved");
      setSupplier({ ...supplier, ...form });
      setTimeout(() => setSaveStatus("idle"), 2000);
    } else {
      setSaveStatus("error");
      setErrorMessage(res.error || "Erro ao salvar alterações");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div>
        <Link
          href="/fornecedores"
          className="inline-flex items-center gap-2 text-sm font-medium text-(--text-muted) hover:text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Voltar para Lista de Fornecedores</span>
        </Link>
      </div>

      {/* Header do Fornecedor */}
      <div className="p-6 rounded-3xl bg-(--surface) border border-(--border) shadow-(--shadow-card) flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center font-bold text-2xl shrink-0 shadow-inner">
            {supplier.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-(--text-title)">
                {supplier.name}
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg}`}
              >
                <BadgeIcon size={12} />
                <span>{form.category || "Parceiro Geral"}</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-(--text-muted)">
              {supplier.tradeName && supplier.tradeName !== supplier.name && (
                <span>Fantasia: {supplier.tradeName}</span>
              )}
              {supplier.cnpj && (
                <span className="font-mono">CNPJ: {formatCnpj(supplier.cnpj)}</span>
              )}
              {supplier.city && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {supplier.city} - {supplier.state}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasWa && (
            <a
              href={`https://wa.me/55${cleanMobile}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-all shadow-md cursor-pointer"
            >
              <MessageSquare size={16} />
              <span>Conversar no WhatsApp</span>
            </a>
          )}
          {supplier.website && (
            <a
              href={supplier.website.startsWith("http") ? supplier.website : `https://${supplier.website}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-(--border) text-sm font-medium text-(--text-title) hover:bg-(--surface-subtle) transition-colors cursor-pointer"
            >
              <Globe size={15} />
              <span>Website</span>
            </a>
          )}
        </div>
      </div>

      {/* Cards de Resumo Financeiro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
              Total Faturado
            </span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-(--text-title) mt-2">
            {formatCurrency(financialSummary.totalInvoiced)}
          </p>
          <p className="text-xs text-(--text-muted) mt-0.5">Lançamentos na agência</p>
        </div>

        <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
              Total Pago
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            {formatCurrency(financialSummary.totalPaid)}
          </p>
          <p className="text-xs text-emerald-600/80 mt-0.5">Pagamentos liquidados</p>
        </div>

        <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
              Pendente a Pagar
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">
            {formatCurrency(financialSummary.totalPending)}
          </p>
          <p className="text-xs text-amber-600/80 mt-0.5">Contas a pagar</p>
        </div>

        <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
              Lançamentos
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <History size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-(--text-title) mt-2">
            {financialSummary.entriesCount}
          </p>
          <p className="text-xs text-blue-600 font-medium mt-0.5">Operações registradas</p>
        </div>
      </div>

      {/* Grid de 2 Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Dados Cadastrais & Edição (5 colunas) */}
        <div className="lg:col-span-5 space-y-6">
          <form
            onSubmit={handleSave}
            className="p-6 rounded-3xl bg-(--surface) border border-(--border) shadow-(--shadow-card) space-y-5"
          >
            <div className="flex items-center justify-between border-b border-(--border) pb-4">
              <h2 className="font-bold text-base text-(--text-title) flex items-center gap-2">
                <Building2 size={18} className="text-primary" />
                <span>Dados do Fornecedor</span>
              </h2>
              <button
                type="submit"
                disabled={saveStatus === "saving"}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-strong transition-all shadow cursor-pointer disabled:opacity-50"
              >
                {saveStatus === "saving" ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : saveStatus === "saved" ? (
                  <>
                    <Check size={14} />
                    <span>Salvo!</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Salvar</span>
                  </>
                )}
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {errorMessage}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-(--text-title) mb-1">
                  Nome / Razão Social *
                </label>
                <input
                  type="text"
                  required
                  value={form.name || ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                />
              </div>

              <div>
                <label className="block font-medium text-(--text-title) mb-1">
                  Nome Fantasia
                </label>
                <input
                  type="text"
                  value={form.tradeName || ""}
                  onChange={(e) => setForm({ ...form, tradeName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-(--text-title) mb-1">
                    Categoria
                  </label>
                  <select
                    value={form.category || "Hotéis"}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                  >
                    <option value="Hotéis">Hotéis & Hospedagem</option>
                    <option value="Cias Aéreas">Cias Aéreas</option>
                    <option value="Operadoras">Operadoras & Turismo</option>
                    <option value="Locadora de Veículos">Locadora de Veículos</option>
                    <option value="Financeiro / Banco">Financeiro / Banco</option>
                    <option value="Seguros & Assistência">Seguros & Assistência</option>
                    <option value="Parceiro Geral">Parceiro Geral</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-(--text-title) mb-1">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    value={form.cnpj || ""}
                    onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-(--text-title) mb-1">
                    Inscrição Estadual (IE)
                  </label>
                  <input
                    type="text"
                    value={form.ie || ""}
                    onChange={(e) => setForm({ ...form, ie: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-medium text-(--text-title) mb-1">
                    Website
                  </label>
                  <input
                    type="text"
                    value={form.website || ""}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-(--text-title) mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={form.phone || ""}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-(--text-title) mb-1">
                    Celular / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={form.mobile || ""}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-(--text-title) mb-1">
                  E-mail de Contato / Reservas
                </label>
                <input
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="pt-2 border-t border-(--border)">
                <h3 className="font-semibold text-(--text-muted) mb-3 flex items-center gap-1.5">
                  <MapPin size={13} className="text-primary" />
                  <span>Localização</span>
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block font-medium text-(--text-title) mb-1">
                        Endereço
                      </label>
                      <input
                        type="text"
                        value={form.address || ""}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-(--text-title) mb-1">
                        Número
                      </label>
                      <input
                        type="text"
                        value={form.number || ""}
                        onChange={(e) => setForm({ ...form, number: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block font-medium text-(--text-title) mb-1">
                        Cidade
                      </label>
                      <input
                        type="text"
                        value={form.city || ""}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-(--text-title) mb-1">
                        UF
                      </label>
                      <input
                        type="text"
                        maxLength={2}
                        value={form.state || ""}
                        onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) uppercase focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-(--text-title) mb-1">
                  Observações / Condições Comerciais
                </label>
                <textarea
                  rows={3}
                  value={form.notes || ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Contratos, taxas, faturamento..."
                  className="w-full px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Coluna Direita: Faturas e Lançamentos (7 colunas) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-3xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
            <div className="flex items-center justify-between pb-4 border-b border-(--border)">
              <div>
                <h2 className="font-bold text-base text-(--text-title) flex items-center gap-2">
                  <CreditCard size={18} className="text-primary" />
                  <span>Faturas & Pagamentos da Agência</span>
                </h2>
                <p className="text-xs text-(--text-muted) mt-0.5">
                  Histórico de contas pagas e a pagar a este fornecedor
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-tertiary/10 text-tertiary font-semibold text-xs">
                {supplier.financialEntries.length} registros
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-(--surface-subtle) border-b border-(--border) text-(--text-muted) font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Descrição / Fatura</th>
                    <th className="py-2.5 px-3">Vencimento</th>
                    <th className="py-2.5 px-3">Liquidação</th>
                    <th className="py-2.5 px-3">Valor</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border)">
                  {supplier.financialEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-(--text-muted)">
                        <History size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="font-medium">Nenhum lançamento financeiro registrado</p>
                      </td>
                    </tr>
                  ) : (
                    supplier.financialEntries.map((entry: any) => {
                      const isPaid = entry.status === "PAGO";

                      return (
                        <tr
                          key={entry.id}
                          className="hover:bg-(--surface-subtle)/70 transition-colors"
                        >
                          <td className="py-3 px-3">
                            <p className="font-semibold text-(--text-title) max-w-[240px] truncate">
                              {entry.description}
                            </p>
                            {entry.document && (
                              <p className="text-[11px] text-(--text-muted) font-mono">
                                Doc: {entry.document}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-3 text-(--text-title) font-mono">
                            {formatDate(entry.dueDate)}
                          </td>
                          <td className="py-3 px-3 text-(--text-title) font-mono">
                            {formatDate(entry.paidAt)}
                          </td>
                          <td className="py-3 px-3 font-semibold text-(--text-title) font-mono">
                            {formatCurrency(entry.amount)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                isPaid
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              }`}
                            >
                              {isPaid ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                              <span>{isPaid ? "Pago" : "Pendente"}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
