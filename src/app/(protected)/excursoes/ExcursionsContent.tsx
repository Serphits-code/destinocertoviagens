"use client";

import { useState, useActionState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Map,
  Calendar,
  Users,
  Layers,
  Trash2,
  X,
  Pencil,
  Copy,
  Loader2,
} from "lucide-react";
import {
  createExcursion,
  deleteExcursion,
  duplicateExcursion,
  updateExcursionStatus,
  type ExcursionFormState,
} from "@/lib/actions/excursions";

interface Excursion {
  id: string;
  name: string;
  periodStart: string | null;
  periodEnd: string | null;
  slots: number;
  status: "RASCUNHO" | "ATIVA" | "ENCERRADA";
  blocksCount: number;
}

const STATUS_LABEL: Record<Excursion["status"], string> = {
  RASCUNHO: "Rascunho",
  ATIVA: "Ativa",
  ENCERRADA: "Encerrada",
};

const STATUS_STYLE: Record<Excursion["status"], string> = {
  RASCUNHO: "bg-status-info-bg text-status-info",
  ATIVA: "bg-status-success-bg text-status-success",
  ENCERRADA: "bg-status-danger-bg text-status-danger",
};

function formatPeriod(start: string | null, end: string | null) {
  if (!start) return "Período a definir";
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const cardItem = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35 } },
};

export function ExcursionsContent({ excursions }: { excursions: Excursion[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("TODAS");
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = excursions.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "TODAS" || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-title">Excursões</h1>
          <p className="text-text-muted text-sm mt-1">
            Gerencie as excursões e pacotes da agência
          </p>
        </div>
        <motion.a
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          href="/excursoes/novo"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-contrast font-semibold hover:bg-primary-strong transition-colors w-fit"
        >
          <Plus size={18} />
          Nova Excursão
        </motion.a>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar excursão..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-surface text-text-body focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>
        <div className="flex gap-2">
          {["TODAS", "ATIVA", "RASCUNHO", "ENCERRADA"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s
                  ? "bg-primary text-primary-contrast"
                  : "bg-surface-muted text-text-muted hover:bg-surface-subtle"
              }`}
            >
              {s === "TODAS" ? "Todas" : STATUS_LABEL[s as Excursion["status"]]}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Cards */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-surface rounded-2xl border border-border p-12 text-center"
        >
          <Map size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-text-title">
            Nenhuma excursão encontrada
          </h3>
          <p className="text-text-muted mt-1">
            {excursions.length === 0
              ? "Comece criando sua primeira excursão."
              : "Tente ajustar os filtros de busca."}
          </p>
        </motion.div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {filtered.map((excursion) => (
            <ExcursionCard key={excursion.id} excursion={excursion} />
          ))}
        </motion.div>
      )}

      {/* Modal Nova Excursão */}
      <NewExcursionModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

function ExcursionCard({ excursion }: { excursion: Excursion }) {
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  async function handleDelete() {
    if (!confirm(`Excluir a excursão "${excursion.name}"?`)) return;
    setDeleting(true);
    await deleteExcursion(excursion.id);
  }

  async function handleDuplicate() {
    setDuplicating(true);
    const res = await duplicateExcursion(excursion.id);
    if (res.success && res.newExcursionId) {
      window.location.href = `/excursoes/${res.newExcursionId}`;
    } else {
      alert(res.error || "Erro ao duplicar excursão.");
      setDuplicating(false);
    }
  }

  async function handleStatusChange(status: Excursion["status"]) {
    await updateExcursionStatus(excursion.id, status);
  }

  return (
    <motion.div
      variants={cardItem}
      whileHover={{ y: -4 }}
      className="bg-surface rounded-2xl shadow-shadow-card border border-border hover:shadow-shadow-hover transition-all overflow-hidden group"
    >
      {/* Capa do card com botões de ação discretos no topo */}
      <div className="h-28 bg-secondary relative flex items-end p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-tertiary/60 to-secondary" />
        <span
          className={`relative z-10 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[excursion.status]}`}
        >
          {STATUS_LABEL[excursion.status]}
        </span>

        {/* Grupo de Ações no Topo do Card */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          {/* Botão de Lápis (Editar dados básicos da excursão) */}
          <a
            href={`/excursoes/${excursion.id}/editar`}
            className="p-1.5 rounded-lg bg-black/30 backdrop-blur-xs text-white/80 hover:bg-white hover:text-primary transition-all shadow-xs cursor-pointer"
            title="Editar dados da excursão (nome, mapa, datas e vagas)"
          >
            <Pencil size={14} />
          </a>

          {/* Botão de Duplicar Discreto */}
          <button
            type="button"
            onClick={handleDuplicate}
            disabled={duplicating}
            className="p-1.5 rounded-lg bg-black/30 backdrop-blur-xs text-white/80 hover:bg-white hover:text-primary transition-all shadow-xs cursor-pointer disabled:opacity-50"
            title="Duplicar este pacote e todos os seus blocos"
          >
            {duplicating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Copy size={14} />
            )}
          </button>

          {/* Botão de Excluir */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg bg-black/30 backdrop-blur-xs text-white/60 hover:bg-status-danger hover:text-white opacity-0 group-hover:opacity-100 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            title="Excluir excursão"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <h3 className="font-bold text-text-title leading-snug line-clamp-2">
          {excursion.name}
        </h3>

        <div className="space-y-1.5 text-sm text-text-muted">
          <div className="flex items-center gap-2">
            <Calendar size={14} />
            {formatPeriod(excursion.periodStart, excursion.periodEnd)}
          </div>
          <div className="flex items-center gap-2">
            <Users size={14} />
            {excursion.slots} vagas
          </div>
          <div className="flex items-center gap-2">
            <Layers size={14} />
            {excursion.blocksCount} bloco{excursion.blocksCount !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <a
            href={`/excursoes/${excursion.id}`}
            className="flex-1 text-center px-3 py-2 rounded-lg bg-primary text-primary-contrast text-sm font-semibold hover:bg-primary-strong transition-colors"
          >
            Abrir Editor
          </a>
          <select
            value={excursion.status}
            onChange={(e) =>
              handleStatusChange(e.target.value as Excursion["status"])
            }
            className="px-2 py-2 rounded-lg border border-border bg-surface-subtle text-text-body text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="RASCUNHO">Rascunho</option>
            <option value="ATIVA">Ativa</option>
            <option value="ENCERRADA">Encerrada</option>
          </select>
        </div>
      </div>
    </motion.div>
  );
}

function NewExcursionModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<ExcursionFormState, FormData>(
    createExcursion,
    {}
  );

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md bg-surface rounded-2xl shadow-shadow-hover border border-border p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text-title">Nova Excursão</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-muted hover:bg-surface-muted transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form action={formAction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-title mb-1.5">
                  Nome da excursão
                </label>
                <input
                  name="name"
                  required
                  placeholder="Ex: Pacote Foz do Iguaçu"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface-subtle text-text-body focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-title mb-1.5">
                    Início
                  </label>
                  <input
                    name="periodStart"
                    type="date"
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface-subtle text-text-body focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-title mb-1.5">
                    Fim
                  </label>
                  <input
                    name="periodEnd"
                    type="date"
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface-subtle text-text-body focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-title mb-1.5">
                    Vagas
                  </label>
                  <input
                    name="slots"
                    type="number"
                    min={0}
                    defaultValue={20}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface-subtle text-text-body focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-title mb-1.5">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue="RASCUNHO"
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface-subtle text-text-body focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  >
                    <option value="RASCUNHO">Rascunho</option>
                    <option value="ATIVA">Ativa</option>
                    <option value="ENCERRADA">Encerrada</option>
                  </select>
                </div>
              </div>

              {state.error && (
                <p className="text-sm text-status-danger bg-status-danger-bg px-3 py-2 rounded-lg">
                  {state.error}
                </p>
              )}

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={pending}
                className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-contrast font-semibold hover:bg-primary-strong transition-colors disabled:opacity-50"
              >
                {pending ? "Criando..." : "Criar Excursão"}
              </motion.button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
