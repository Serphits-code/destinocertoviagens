"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  User,
  UserPlus,
  Phone,
  Calendar,
  MapPin,
  AlertTriangle,
  Check,
  Loader2,
  FileText,
} from "lucide-react";
import {
  searchCustomersForRoomList,
  quickCreateCustomer,
  type CustomerSearchResult,
} from "@/lib/actions/customers";

interface GuestSelectorModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (guestData: {
    nome: string;
    documento: string;
    tipo: string;
    observacao: string;
    customerId?: string;
    birthDate?: string | null;
  }) => void;
  roomTitle: string;
  slotNumber: number;
  existingAllocations?: Map<string, string>; // normalized name/cpf -> Room number
}

export function GuestSelectorModal({
  open,
  onClose,
  onSelect,
  roomTitle,
  slotNumber,
  existingAllocations = new Map(),
}: GuestSelectorModalProps) {
  const [activeTab, setActiveTab] = useState<"search" | "new">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Form de novo cliente
  const [newName, setNewName] = useState("");
  const [newCpf, setNewCpf] = useState("");
  const [newRg, setNewRg] = useState("");
  const [newBirthDate, setNewBirthDate] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Foca no input ao abrir e busca iniciais
  useEffect(() => {
    if (open) {
      setActiveTab("search");
      setQuery("");
      setCreateError("");
      setTimeout(() => inputRef.current?.focus(), 80);

      // Carga inicial dos primeiros clientes cadastrados
      setLoading(true);
      searchCustomersForRoomList("").then((res) => {
        setResults(res);
        setLoading(false);
      });
    }
  }, [open]);

  // Busca debounced
  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setLoading(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await searchCustomersForRoomList(val);
        setResults(res);
      } finally {
        setLoading(false);
      }
    }, 200);
  };

  const handleSelectCustomer = (c: CustomerSearchResult) => {
    const doc = c.cpf || c.rg || "";
    onSelect({
      nome: c.name,
      documento: doc,
      tipo: c.suggestedType,
      observacao: c.notes || "",
      customerId: c.id,
      birthDate: c.birthDate || null,
    });
    onClose();
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setCreateError("Nome do passageiro é obrigatório.");
      return;
    }

    setCreating(true);
    setCreateError("");

    const res = await quickCreateCustomer({
      name: newName,
      cpf: newCpf,
      rg: newRg,
      birthDate: newBirthDate,
      mobile: newMobile,
      notes: newNotes,
    });

    setCreating(false);

    if (res.success && res.customer) {
      handleSelectCustomer(res.customer);
    } else {
      setCreateError(res.error || "Erro ao cadastrar.");
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl bg-surface rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-subtle">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {roomTitle}
                </span>
                <span className="text-xs text-text-muted">
                  Espaço #{slotNumber}
                </span>
              </div>
              <h3 className="text-lg font-bold text-text-title mt-1">
                Adicionar Hóspede ao Quarto
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-title hover:bg-surface transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border px-6 pt-3 gap-4 bg-surface-subtle/50">
            <button
              onClick={() => setActiveTab("search")}
              className={`flex items-center gap-2 pb-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === "search"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text-title"
              }`}
            >
              <Search size={16} />
              <span>Buscar Passageiro Cadastrado</span>
            </button>
            <button
              onClick={() => setActiveTab("new")}
              className={`flex items-center gap-2 pb-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === "new"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text-title"
              }`}
            >
              <UserPlus size={16} />
              <span>+ Novo Cadastro Rápido</span>
            </button>
          </div>

          {/* Conteúdo */}
          {activeTab === "search" ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Barra de Pesquisa */}
              <div className="p-4 border-b border-border">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                  />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    placeholder="Digite o nome, CPF ou celular do cliente..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-surface text-text-title placeholder:text-text-muted text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  {loading && (
                    <Loader2
                      size={18}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary animate-spin"
                    />
                  )}
                  {query && !loading && (
                    <button
                      onClick={() => handleQueryChange("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-title p-1"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Lista de Resultados */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-border/40">
                {results.length === 0 && !loading && (
                  <div className="py-12 text-center text-text-muted">
                    <User size={36} className="mx-auto opacity-30 mb-2" />
                    <p className="font-semibold text-text-title">
                      Nenhum passageiro encontrado
                    </p>
                    <p className="text-xs mt-1">
                      {query
                        ? `Não encontramos resultados para "${query}".`
                        : "Nenhum cadastro de passageiro disponível."}
                    </p>
                    <button
                      onClick={() => {
                        setNewName(query.trim());
                        setActiveTab("new");
                      }}
                      className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                    >
                      <UserPlus size={14} /> Cadastrar &quot;{query}&quot; agora
                    </button>
                  </div>
                )}

                {results.map((c) => {
                  const normalizedName = c.name.trim().toLowerCase();
                  const allocatedIn =
                    existingAllocations.get(normalizedName) ||
                    (c.cpf ? existingAllocations.get(c.cpf.replace(/\D/g, "")) : null);

                  return (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      className="pt-2 first:pt-0 group flex items-center justify-between p-3 rounded-xl hover:bg-surface-subtle transition-all cursor-pointer border border-transparent hover:border-border"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                          {c.name.slice(0, 2)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm text-text-title truncate group-hover:text-primary transition-colors">
                              {c.name}
                            </h4>

                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-surface-muted text-text-muted border border-border">
                              {c.suggestedType}
                              {c.age !== null ? ` (${c.age}a)` : ""}
                            </span>

                            {allocatedIn && (
                              <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                <AlertTriangle size={11} />
                                <span>Já em: {allocatedIn}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-text-muted mt-1 flex-wrap">
                            {c.cpf && (
                              <span className="flex items-center gap-1">
                                <FileText size={12} />
                                CPF: {c.cpf}
                              </span>
                            )}
                            {c.rg && !c.cpf && (
                              <span className="flex items-center gap-1">
                                <FileText size={12} />
                                RG: {c.rg}
                              </span>
                            )}
                            {c.mobile && (
                              <span className="flex items-center gap-1">
                                <Phone size={12} />
                                {c.mobile}
                              </span>
                            )}
                            {(c.city || c.state) && (
                              <span className="flex items-center gap-1">
                                <MapPin size={12} />
                                {[c.city, c.state].filter(Boolean).join(" - ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="ml-3 shrink-0 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold group-hover:bg-primary group-hover:text-white transition-all flex items-center gap-1"
                      >
                        <Check size={13} />
                        <span>Selecionar</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Tab de Novo Cadastro Rápido */
            <form onSubmit={handleCreateCustomer} className="flex-1 overflow-y-auto p-6 space-y-4">
              {createError && (
                <div className="p-3 rounded-xl bg-status-danger-bg text-status-danger text-xs flex items-center gap-2 border border-status-danger/20">
                  <AlertTriangle size={15} />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text-title mb-1.5">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: MARIA SILVA DOS SANTOS"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-title text-sm focus:outline-none focus:border-primary uppercase"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-title mb-1.5">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={newCpf}
                    onChange={(e) => setNewCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-title text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-title mb-1.5">
                    RG
                  </label>
                  <input
                    type="text"
                    value={newRg}
                    onChange={(e) => setNewRg(e.target.value)}
                    placeholder="Número do RG"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-title text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-title mb-1.5">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={newBirthDate}
                    onChange={(e) => setNewBirthDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-title text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-title mb-1.5">
                    Celular / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={newMobile}
                    onChange={(e) => setNewMobile(e.target.value)}
                    placeholder="(81) 99999-9999"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-title text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-title mb-1.5">
                  Observações Especiais (Alergias, restrições, preferências)
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Ex: Alérgica a camarão, precisa de cama baixa, etc."
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-title text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setActiveTab("search")}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text-title hover:bg-surface-subtle transition-colors cursor-pointer"
                >
                  Voltar para a Busca
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-strong disabled:opacity-50 transition-all cursor-pointer"
                >
                  {creating ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <UserPlus size={14} />
                  )}
                  <span>Cadastrar e Alocar no Quarto</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
