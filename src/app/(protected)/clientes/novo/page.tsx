"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, Save, Check } from "lucide-react";
import { createClient } from "../actions";

export default function NewClientPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    cpf: "",
    rg: "",
    passport: "",
    gender: "F",
    birthDate: "",
    mobile: "",
    phone: "",
    email: "",
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
      setErrorMessage("O nome do cliente é obrigatório.");
      return;
    }

    setSaveStatus("saving");
    setErrorMessage("");

    const res = await createClient(form);
    if (res.success && res.client) {
      setSaveStatus("saved");
      setTimeout(() => {
        router.push(`/clientes/${res.client.id}`);
      }, 700);
    } else {
      setSaveStatus("error");
      setErrorMessage(res.error || "Erro ao cadastrar cliente");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <Link
          href="/clientes"
          className="inline-flex items-center gap-2 text-sm font-medium text-(--text-muted) hover:text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Voltar para Lista de Clientes</span>
        </Link>
      </div>

      <div className="p-6 rounded-3xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
        <div className="flex items-center gap-4 pb-6 border-b border-(--border)">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <UserPlus size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-(--text-title)">
              Cadastrar Novo Cliente & Passageiro
            </h1>
            <p className="text-xs text-(--text-muted) mt-0.5">
              Insira as informações completas para registro no banco de dados
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
              Dados Pessoais
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-(--text-title) mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Maria das Graças Oliveira"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-sm text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-(--text-title) mb-1">
                  CPF
                </label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-sm text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-(--text-title) mb-1">
                  RG
                </label>
                <input
                  type="text"
                  placeholder="Número do documento"
                  value={form.rg}
                  onChange={(e) => setForm({ ...form, rg: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-sm text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-(--text-title) mb-1">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-sm text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-(--text-title) mb-1">
                  Passaporte
                </label>
                <input
                  type="text"
                  placeholder="Passaporte (se houver)"
                  value={form.passport}
                  onChange={(e) => setForm({ ...form, passport: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-sm text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-(--border)">
            <h2 className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider mb-3">
              Contato
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-(--text-title) mb-1">
                  Celular / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="(81) 90000-0000"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-sm text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-(--text-title) mb-1">
                  Telefone Fixo
                </label>
                <input
                  type="text"
                  placeholder="(81) 3000-0000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-sm text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-(--text-title) mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  placeholder="cliente@exemplo.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-sm text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-(--border)">
            <h2 className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider mb-3">
              Endereço
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-(--text-title) mb-1">
                  Rua / Logradouro
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
                  placeholder="Caruaru"
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
              Observações
            </label>
            <textarea
              rows={3}
              placeholder="Anotações gerais..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-sm text-(--text-title) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="pt-4 border-t border-(--border) flex items-center justify-end gap-3">
            <Link
              href="/clientes"
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
                  <span>Salvar Cliente</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
