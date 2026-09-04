"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Filter,
  Phone,
  MapPin,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  ShieldCheck,
  History,
  ArrowRight,
} from "lucide-react";
import { searchClients } from "./actions";

interface Client {
  id: string;
  name: string;
  cpf: string | null;
  rg: string | null;
  passport: string | null;
  birthDate: string | null;
  gender: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  notes: string | null;
  firstSaleDate: string | null;
  lastSaleDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ClientsContentProps {
  initialClients: Client[];
  initialTotal: number;
  initialTotalPages: number;
  stats: {
    total: number;
    withCpf: number;
    withMobile: number;
    withSales: number;
    states: { state: string; count: number }[];
  };
}

function formatCpf(cpf: string | null) {
  if (!cpf) return "-";
  const c = cpf.replace(/\D/g, "");
  if (c.length === 11) {
    return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`;
  }
  return cpf;
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

export function ClientsContent({
  initialClients,
  initialTotal,
  initialTotalPages,
  stats,
}: ClientsContentProps) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [total, setTotal] = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState("ALL");
  const [isPending, startTransition] = useTransition();

  const handleSearch = (newQuery: string, newState: string, newPage: number) => {
    startTransition(async () => {
      const res = await searchClients({
        query: newQuery,
        state: newState,
        page: newPage,
        pageSize: 20,
      });
      setClients(res.clients);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setPage(res.page);
    });
  };

  const onSearchChange = (val: string) => {
    setSearchQuery(val);
    handleSearch(val, selectedState, 1);
  };

  const onStateChange = (st: string) => {
    setSelectedState(st);
    handleSearch(searchQuery, st, 1);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-(--text-title)">
              Clientes & Passageiros
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              {stats.total.toLocaleString("pt-BR")} cadastros
            </span>
          </div>
          <p className="text-sm text-(--text-muted) mt-1">
            Gestão unificada da base de passageiros e clientes da Destino Certo.
          </p>
        </div>

        <Link
          href="/clientes/novo"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-medium text-sm shadow-md hover:bg-primary-strong transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <Plus size={18} />
          <span>Novo Cliente</span>
        </Link>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card) flex items-center gap-4 transition-all hover:shadow-(--shadow-hover)">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-(--text-muted) uppercase tracking-wider">
              Total de Clientes
            </p>
            <p className="text-2xl font-bold text-(--text-title)">
              {stats.total.toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-primary font-medium mt-0.5">Base ativa importada</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card) flex items-center gap-4 transition-all hover:shadow-(--shadow-hover)">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-(--text-muted) uppercase tracking-wider">
              Com CPF
            </p>
            <p className="text-2xl font-bold text-(--text-title)">
              {stats.withCpf.toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">
              {((stats.withCpf / stats.total) * 100).toFixed(1)}% do total
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card) flex items-center gap-4 transition-all hover:shadow-(--shadow-hover)">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center shrink-0">
            <Phone size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-(--text-muted) uppercase tracking-wider">
              Com WhatsApp / Tel
            </p>
            <p className="text-2xl font-bold text-(--text-title)">
              {stats.withMobile.toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-green-600 font-medium mt-0.5">
              Prontos para contato
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card) flex items-center gap-4 transition-all hover:shadow-(--shadow-hover)">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <History size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-(--text-muted) uppercase tracking-wider">
              Com Histórico
            </p>
            <p className="text-2xl font-bold text-(--text-title)">
              {stats.withSales.toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-blue-600 font-medium mt-0.5">
              Viagens registradas
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Pesquisa */}
      <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-muted)"
          />
          <input
            type="text"
            placeholder="Pesquisar por nome, CPF, telefone, cidade ou e-mail..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-sm text-(--text-title) placeholder:text-(--text-muted) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-muted) hover:text-(--text-title)"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-(--surface-subtle) border border-(--border) text-xs font-medium text-(--text-muted) shrink-0">
            <Filter size={14} />
            <span>Estado:</span>
            <select
              value={selectedState}
              onChange={(e) => onStateChange(e.target.value)}
              className="bg-transparent text-(--text-title) font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todos ({stats.total})</option>
              {stats.states.map((s) => (
                <option key={s.state} value={s.state}>
                  {s.state} ({s.count})
                </option>
              ))}
            </select>
          </div>

          {isPending && (
            <div className="flex items-center gap-1.5 text-xs text-primary font-medium animate-pulse px-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              <span>Buscando...</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabela de Clientes */}
      <div className="rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card) overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-(--surface-subtle) border-b border-(--border) text-(--text-muted) text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Cliente / Passageiro</th>
                <th className="py-3.5 px-4">CPF / Documento</th>
                <th className="py-3.5 px-4">Contato / WhatsApp</th>
                <th className="py-3.5 px-4">Cidade / UF</th>
                <th className="py-3.5 px-4">Nascimento</th>
                <th className="py-3.5 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border)">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-(--text-muted)">
                    <Users size={36} className="mx-auto mb-2 opacity-40" />
                    <p className="font-medium">Nenhum cliente encontrado</p>
                    <p className="text-xs mt-1">Tente ajustar os termos de pesquisa ou filtros</p>
                  </td>
                </tr>
              ) : (
                clients.map((client) => {
                  const cleanMobile = client.mobile ? client.mobile.replace(/\D/g, "") : null;
                  const hasWa = cleanMobile && cleanMobile.length >= 10;

                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-(--surface-subtle)/70 transition-colors group cursor-pointer"
                    >
                      {/* Nome e Avatar */}
                      <td className="py-3.5 px-4">
                        <Link href={`/clientes/${client.id}`} className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-(--text-title) group-hover:text-primary transition-colors truncate max-w-[240px]">
                              {client.name}
                            </p>
                            {client.email && (
                              <p className="text-xs text-(--text-muted) truncate max-w-[240px]">
                                {client.email}
                              </p>
                            )}
                          </div>
                        </Link>
                      </td>

                      {/* CPF / RG */}
                      <td className="py-3.5 px-4">
                        <Link href={`/clientes/${client.id}`} className="block text-xs">
                          <span className="font-mono font-medium text-(--text-title)">
                            {formatCpf(client.cpf)}
                          </span>
                          {client.rg && (
                            <p className="text-(--text-muted) text-[11px]">RG: {client.rg}</p>
                          )}
                        </Link>
                      </td>

                      {/* Contato e WhatsApp */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-(--text-title)">
                            {formatPhone(client.mobile || client.phone)}
                          </span>
                          {hasWa && (
                            <a
                              href={`https://wa.me/55${cleanMobile}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Abrir WhatsApp"
                              className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MessageSquare size={15} />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Cidade / UF */}
                      <td className="py-3.5 px-4">
                        <Link href={`/clientes/${client.id}`} className="block">
                          {client.city ? (
                            <div className="flex items-center gap-1.5 text-xs text-(--text-title)">
                              <MapPin size={13} className="text-(--text-muted) shrink-0" />
                              <span className="truncate max-w-[140px]">
                                {client.city}
                                {client.state ? ` - ${client.state}` : ""}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-(--text-muted)">-</span>
                          )}
                        </Link>
                      </td>

                      {/* Data de Nascimento */}
                      <td className="py-3.5 px-4 text-xs text-(--text-title)">
                        <Link href={`/clientes/${client.id}`} className="block">
                          {formatDate(client.birthDate)}
                        </Link>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/clientes/${client.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                        >
                          <span>Acessar Perfil</span>
                          <ArrowRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé e Paginação */}
        <div className="p-4 border-t border-(--border) flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-(--text-muted)">
          <div>
            Mostrando <span className="font-semibold text-(--text-title)">{clients.length}</span>{" "}
            de <span className="font-semibold text-(--text-title)">{total.toLocaleString("pt-BR")}</span> clientes
            {searchQuery && ` (filtrado de ${stats.total.toLocaleString("pt-BR")})`}
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || isPending}
              onClick={() => handleSearch(searchQuery, selectedState, page - 1)}
              className="px-3 py-1.5 rounded-lg border border-(--border) bg-(--surface-subtle) hover:bg-(--surface) text-(--text-title) disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft size={14} />
              <span>Anterior</span>
            </button>

            <span className="px-2 font-medium text-(--text-title)">
              Página {page} de {totalPages || 1}
            </span>

            <button
              disabled={page >= totalPages || isPending}
              onClick={() => handleSearch(searchQuery, selectedState, page + 1)}
              className="px-3 py-1.5 rounded-lg border border-(--border) bg-(--surface-subtle) hover:bg-(--surface) text-(--text-title) disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Próxima</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
