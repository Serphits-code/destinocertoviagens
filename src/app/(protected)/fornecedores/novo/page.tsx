"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Save, Check } from "lucide-react";
import { createSupplier } from "../actions";

export default function NewSupplierPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    tradeName: "",
    cnpj: "",
    ie: "",
    category: "Hotéis",
    phone: "",
    mobile: "",
    email: "",
    website: "",
    address: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "PE",
    zipCode: "",
    notes: "",
  });
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrorMessage("O nome do fornecedor é obrigatório.");
      return;
    }

    setSaveStatus("saving");
    setErrorMessage("");

    const res = await createSupplier(form);
    if (res.success && res.supplier) {
      setSaveStatus("saved");
      setTimeout(() => {
        router.push(`/fornecedores/${res.supplier.id}`);
      }, 700);
    } else {
      setSaveStatus("error");
      setErrorMessage(res.error || "Erro ao cadastrar fornecedor");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <Link
          href="/fornecedores"
          className="inline-flex items-center gap-2 text-sm font-medium text-(--text-muted) hover:text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Voltar para Lista de Fornecedores</span>
        </Link>
      </div>

      <div className="p-6 rounded-3xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
        <div className="flex items-center gap-4 pb-6 border-b border-(--border)">
          <div className="w-12 h-12 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-(--text-title)">
              Cadastrar Novo Fornecedor & Parceiro
            </h1>
            <p className="text-xs text-(--text-muted) mt-0.5">
              Registre hotéis, companhias aéreas, operadoras ou prestadores de serviços
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {errorMessage}
            </div>
          )}

          <div>
            <h2 className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider mb-3">
              Dados da Empresa
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-(--text-title) mb-1">
                  Nome / Razão Social *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pousada Solar dos Ventos Ltda"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-sm text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-(--text-title) mb-1">
                  Nome Fantasia
                </label>
                <input
                  type="text"
                  placeholder="Ex: Solar dos Ventos"
                  value={form.tradeName}
                  onChange={(e) => setForm({ ...form, tradeName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-sm text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-(--text-title) mb-1">
                  Categoria
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-sm text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
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
                <label className="block text-xs font-medium text-(--text-title) mb-1">
                  CNPJ
                </label>
                <input
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={form.cnpj}
                  onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-sm text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-(--text-title) mb-1">
                  Inscrição Estadual (IE)
                </label>
                <input
                  type="text"
                  placeholder="Inscrição Estadual"
                  value={form.ie}
                  onChange={(e) => setForm({ ...form, ie: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-sm text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-(--border)">
            <h2 className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider mb-3">
              Contatos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-(--text-title) mb-1">
                  Telefone Principal
                </label>
                <input
                  type="text"
                  placeholder="(00) 0000-0000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-sm text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-(--text-title) mb-1">
                  Celular / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-sm text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-(--text-title) mb-1">
                  E-mail de Contato / Reservas
                </label>
                <input
                  type="email"
                  placeholder="reservas@fornecedor.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-sm text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-(--text-title) mb-1">
                  Website
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-sm text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-(--border)">
            <h2 className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider mb-3">
              Localização
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-(--text-title) mb-1">
                  Endereço
                </label>
                <input
                  type="text"
                  placeholder="Rua ou Avenida"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-sm text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-(--text-title) mb-1">
                  Número
                </label>
                <input
                  type="text"
                  placeholder="123"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-sm text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-(--text-title) mb-1">
                  Bairro
                </label>
                <input
                  type="text"
                  placeholder="Bairro"
                  value={form.neighborhood}
                  onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-sm text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-(--text-title) mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  placeholder="Recife"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-sm text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-(--text-title) mb-1">
                  UF
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-sm text-(--text-title) uppercase focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-(--border)">
            <label className="block text-xs font-medium text-(--text-title) mb-1">
              Observações / Condições Comerciais
            </label>
            <textarea
              rows={3}
              placeholder="Contratos, comissão, regras de cancelamento..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-sm text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="pt-4 border-t border-(--border) flex items-center justify-end gap-3">
            <Link
              href="/fornecedores"
              className="px-4 py-2.5 rounded-xl border border-(--border) text-sm font-medium text-(--text-title) hover:bg-(--surface-subtle) transition-colors cursor-pointer"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saveStatus === "saving"}
              className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-strong transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              {saveStatus === "saving" ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Cadastrando...</span>
                </>
              ) : saveStatus === "saved" ? (
                <>
                  <Check size={16} />
                  <span>Cadastrado!</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Salvar Fornecedor</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
