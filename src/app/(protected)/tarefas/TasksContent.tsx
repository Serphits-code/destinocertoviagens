"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  Circle,
  X,
  Loader2,
  RotateCcw,
} from "lucide-react";
import {
  TaskItem,
  updateTaskStatus,
  createTask,
  getTasks,
} from "@/lib/actions/crm-tasks";

interface Props {
  initialData: {
    tasks: TaskItem[];
    total: number;
    pendentes: number;
    emAndamento: number;
    concluidas: number;
  };
  initialStatus: string;
  initialPriority: string;
  initialSearch: string;
}

export function TasksContent({
  initialData,
  initialStatus,
  initialPriority,
  initialSearch,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [data, setData] = useState(initialData);
  const [status, setStatus] = useState(initialStatus);
  const [priority, setPriority] = useState(initialPriority);
  const [search, setSearch] = useState(initialSearch);

  const isFirstMount = useRef(true);

  // Sincroniza se servidor reenviar
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Modal Nova Tarefa
  const [modalOpen, setModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("Atendimento");
  const [newPriority, setNewPriority] = useState("MEDIA");
  const [newDueDate, setNewDueDate] = useState("");
  const [creating, setCreating] = useState(false);

  // Busca em tempo real
  const fetchTasks = useCallback(
    (currentSearch = search, currentStatus = status, currentPriority = priority) => {
      startTransition(async () => {
        try {
          const res = await getTasks({
            search: currentSearch.trim(),
            status: currentStatus,
            priority: currentPriority,
          });
          setData(res);

          const p = new URLSearchParams();
          if (currentStatus !== "ALL") p.set("status", currentStatus);
          if (currentPriority !== "ALL") p.set("priority", currentPriority);
          if (currentSearch.trim()) p.set("search", currentSearch.trim());
          const q = p.toString();
          window.history.replaceState(null, "", q ? `/tarefas?${q}` : "/tarefas");
        } catch (err) {
          console.error("Erro ao buscar tarefas:", err);
        }
      });
    },
    [search, status, priority]
  );

  // Debounce de 250ms ao digitar na pesquisa
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetchTasks(search, status, priority);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    fetchTasks(search, newStatus, priority);
  };

  const handlePriorityChange = (newPriority: string) => {
    setPriority(newPriority);
    fetchTasks(search, status, newPriority);
  };

  const handleClearSearch = () => {
    setSearch("");
    fetchTasks("", status, priority);
  };

  const handleClearAll = () => {
    setSearch("");
    setStatus("ALL");
    setPriority("ALL");
    fetchTasks("", "ALL", "ALL");
  };

  const handleToggleStatus = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "CONCLUIDA" ? "PENDENTE" : "CONCLUIDA";
    // Atualização otimista imediata na interface
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId ? { ...t, status: nextStatus } : t
      ),
      concluidas: nextStatus === "CONCLUIDA" ? prev.concluidas + 1 : Math.max(0, prev.concluidas - 1),
      pendentes: nextStatus === "PENDENTE" ? prev.pendentes + 1 : Math.max(0, prev.pendentes - 1),
    }));

    try {
      await updateTaskStatus(taskId, nextStatus);
    } catch (err: any) {
      alert("Erro ao alterar tarefa: " + err.message);
      fetchTasks(search, status, priority);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createTask({
        title: newTitle,
        description: newDesc,
        category: newCategory,
        priority: newPriority,
        dueDate: newDueDate || undefined,
      });
      setModalOpen(false);
      setNewTitle("");
      setNewDesc("");
      fetchTasks(search, status, priority);
    } catch (err: any) {
      alert("Erro ao criar tarefa: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const formatDateBR = (iso: string | null) => {
    if (!iso) return "-";
    const parts = iso.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return iso;
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "ALTA":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600">ALTA</span>;
      case "BAIXA":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600">BAIXA</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600">MÉDIA</span>;
    }
  };

  const hasActiveFilters = Boolean(search.trim() || status !== "ALL" || priority !== "ALL");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-(--surface) p-5 rounded-2xl border border-(--border) shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-(--text-title)">
              Tarefas, CRM & Pendências
            </h1>
            <p className="text-xs text-(--text-muted)">
              Acompanhamento operacional, contatos com passageiros e tarefas internas
            </p>
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-primary text-white hover:bg-primary-strong transition-all flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nova Tarefa
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-(--surface) p-4 rounded-2xl border border-(--border) shadow-xs">
          <div className="text-[11px] font-semibold text-(--text-muted) uppercase">Total de Tarefas</div>
          <div className="text-2xl font-extrabold text-(--text-title) mt-1">{data.total}</div>
          <p className="text-[11px] text-(--text-muted) mt-1">Registradas no sistema</p>
        </div>

        <div className="bg-(--surface) p-4 rounded-2xl border border-(--border) shadow-xs">
          <div className="text-[11px] font-semibold text-amber-600 uppercase">Pendentes</div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">{data.pendentes}</div>
          <p className="text-[11px] text-(--text-muted) mt-1">Aguardando atendimento</p>
        </div>

        <div className="bg-(--surface) p-4 rounded-2xl border border-(--border) shadow-xs">
          <div className="text-[11px] font-semibold text-blue-600 uppercase">Em Andamento</div>
          <div className="text-2xl font-extrabold text-blue-600 mt-1">{data.emAndamento}</div>
          <p className="text-[11px] text-(--text-muted) mt-1">Em execução agora</p>
        </div>

        <div className="bg-(--surface) p-4 rounded-2xl border border-(--border) shadow-xs">
          <div className="text-[11px] font-semibold text-emerald-600 uppercase">Concluídas</div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{data.concluidas}</div>
          <p className="text-[11px] text-(--text-muted) mt-1">Finalizadas com sucesso</p>
        </div>
      </div>

      {/* Filtros em Tempo Real */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-(--surface) p-4 rounded-2xl border border-(--border) shadow-xs items-center">
        <div className="md:col-span-5 relative">
          {isPending ? (
            <Loader2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary animate-spin" />
          ) : (
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
          )}
          <input
            type="text"
            placeholder="Pesquisar por título, cliente, descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-(--border) bg-(--background) text-(--text-body) focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-(--text-muted) hover:text-(--text-title) p-0.5 rounded-full cursor-pointer transition-colors"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="md:col-span-3">
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full py-2 px-3 text-xs rounded-xl border border-(--border) bg-(--background) text-(--text-body) focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
          >
            <option value="ALL">Todos os Status</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="EM_ANDAMENTO">Em Andamento</option>
            <option value="CONCLUIDA">Concluídas</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <select
            value={priority}
            onChange={(e) => handlePriorityChange(e.target.value)}
            className="w-full py-2 px-3 text-xs rounded-xl border border-(--border) bg-(--background) text-(--text-body) focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
          >
            <option value="ALL">Todas Prioridades</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Média</option>
            <option value="BAIXA">Baixa</option>
          </select>
        </div>

        <div className="md:col-span-2 flex items-center justify-end">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-(--border) text-(--text-muted) hover:text-rose-500 hover:border-rose-500/30 hover:bg-rose-500/5 transition-colors flex items-center gap-1.5 cursor-pointer w-full justify-center"
              title="Limpar todos os filtros"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Lista de Tarefas */}
      <div className="space-y-3">
        {data.tasks.length === 0 ? (
          <div className="p-12 text-center text-xs text-(--text-muted) bg-(--surface) rounded-2xl border border-(--border)">
            {isPending ? "Pesquisando tarefas..." : "Nenhuma tarefa encontrada com os filtros atuais."}
          </div>
        ) : (
          data.tasks.map((task) => {
            const isDone = task.status === "CONCLUIDA";
            return (
              <div
                key={task.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
                  isDone
                    ? "bg-(--surface-subtle)/50 border-(--border) opacity-70"
                    : "bg-(--surface) border-(--border) hover:border-primary/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleStatus(task.id, task.status)}
                    className="mt-0.5 text-(--text-muted) hover:text-primary transition-colors cursor-pointer"
                    title={isDone ? "Marcar como pendente" : "Concluir tarefa"}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <div className="w-5 h-5 rounded-md border-2 border-(--border) hover:border-primary" />
                    )}
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className={`text-sm font-bold text-(--text-title) ${isDone ? "line-through text-(--text-muted)" : ""}`}>
                        {task.title}
                      </span>
                      {getPriorityBadge(task.priority)}
                      <span className="text-[10px] px-2 py-0.5 rounded bg-(--surface-muted) text-(--text-muted) font-semibold">
                        {task.category}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-xs text-(--text-body) max-w-2xl">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center flex-wrap gap-3 text-[11px] text-(--text-muted) pt-1">
                      {task.customerName && (
                        <span className="flex items-center gap-1 font-medium text-primary">
                          <User className="w-3.5 h-3.5" />
                          {task.customerName}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Prazo: {formatDateBR(task.dueDate)}
                        </span>
                      )}
                      <span>Criado em {formatDateBR(task.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    task.status === "CONCLUIDA"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : task.status === "EM_ANDAMENTO"
                      ? "bg-blue-500/10 text-blue-600"
                      : "bg-amber-500/10 text-amber-600"
                  }`}>
                    {task.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Nova Tarefa */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-(--surface) rounded-2xl border border-(--border) w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-(--border) pb-3">
              <h3 className="font-bold text-sm text-(--text-title)">
                Nova Tarefa / Chamado
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-(--text-muted) hover:text-(--text-title)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-(--text-muted) mb-1">Título:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Entrar em contato para confirmação de voo"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-(--border) bg-(--background) text-(--text-body) focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block font-medium text-(--text-muted) mb-1">Descrição:</label>
                <textarea
                  rows={3}
                  placeholder="Detalhes do chamado ou atendimento..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-(--border) bg-(--background) text-(--text-body) focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-(--text-muted) mb-1">Prioridade:</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-(--border) bg-(--background) text-(--text-body)"
                  >
                    <option value="BAIXA">Baixa</option>
                    <option value="MEDIA">Média</option>
                    <option value="ALTA">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-(--text-muted) mb-1">Prazo Limite:</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-(--border) bg-(--background) text-(--text-body)"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-(--border) text-(--text-muted)"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-primary text-white font-bold hover:bg-primary-strong transition-colors"
                >
                  {creating ? "Salvando..." : "Salvar Tarefa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
