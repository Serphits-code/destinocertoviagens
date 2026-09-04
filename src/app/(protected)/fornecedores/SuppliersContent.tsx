"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Building2,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  ShieldCheck,
  Hotel,
  Plane,
  Briefcase,
  Car,
  Landmark,
  ArrowRight,
} from "lucide-react";
import { searchSuppliers } from "./actions";

interface Supplier {
  id: string;
  name: string;
  tradeName: string | null;
  cnpj: string | null;
  ie: string | null;
  category: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SuppliersContentProps {
  initialSuppliers: Supplier[];
  initialTotal: number;
  initialTotalPages: number;
  stats: {
    total: number;
    withCnpj: number;
    withPhone: number;
    withEmail: number;
    categories: { name: string; count: number }[];
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

export function SuppliersContent({
  initialSuppliers,
  initialTotal,
  initialTotalPages,
  stats,
}: SuppliersContentProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [total, setTotal] = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [isPending, startTransition] = useTransition();

  const handleSearch = (newQuery: string, newCat: string, newPage: number) => {
    startTransition(async () => {
      const res = await searchSuppliers({
        query: newQuery,
        category: newCat,
        page: newPage,
        pageSize: 20,
      });
      setSuppliers(res.suppliers);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setPage(res.page);
    });
  };

  const onSearchChange = (val: string) => {
    setSearchQuery(val);
    handleSearch(val, selectedCategory, 1);
  };

  const onCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    handleSearch(searchQuery, cat, 1);
  };

  return (
    <div className="space-y-6">
      {/* Topo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-(--text-title)">
              Fornecedores & Parceiros
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-tertiary/10 text-tertiary border border-tertiary/20">
              {stats.total.toLocaleString("pt-BR")} parceiros
            </span>
          </div>
          <p className="text-sm text-(--text-muted) mt-1">
            Rede de hotéis, companhias aéreas, operadoras e prestadores de serviços turísticos.
          </p>
        </div>

        <Link
          href="/fornecedores/novo"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-medium text-sm shadow-md hover:bg-primary-strong transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <Plus size={18} />
          <span>Novo Fornecedor</span>
        </Link>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card) flex items-center gap-4 transition-all hover:shadow-(--shadow-hover)">
          <div className="w-12 h-12 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center shrink-0">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-(--text-muted) uppercase tracking-wider">
              Total de Fornecedores
            </p>
            <p className="text-2xl font-bold text-(--text-title)">
              {stats.total.toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-tertiary font-medium mt-0.5">Parceiros cadastrados</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card) flex items-center gap-4 transition-all hover:shadow-(--shadow-hover)">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
            <Hotel size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-(--text-muted) uppercase tracking-wider">
              Hotéis & Pousadas
            </p>
            <p className="text-2xl font-bold text-(--text-title)">
              {stats.categories.find((c) => c.name === "Hotéis")?.count || 0}
            </p>
            <p className="text-xs text-indigo-600 font-medium mt-0.5">Hospedagem</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card) flex items-center gap-4 transition-all hover:shadow-(--shadow-hover)">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-(--text-muted) uppercase tracking-wider">
              Com CNPJ
            </p>
            <p className="text-2xl font-bold text-(--text-title)">
              {stats.withCnpj.toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">
              {((stats.withCnpj / stats.total) * 100).toFixed(1)}% validados
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card) flex items-center gap-4 transition-all hover:shadow-(--shadow-hover)">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Briefcase size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-(--text-muted) uppercase tracking-wider">
              Operadoras & Agências
            </p>
            <p className="text-2xl font-bold text-(--text-title)">
              {stats.categories.find((c) => c.name === "Operadoras")?.count || 0}
            </p>
            <p className="text-xs text-primary font-medium mt-0.5">Operações turísticas</p>
          </div>
        </div>
      </div>

      {/* Barra de Pesquisa e Filtros */}
      <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-muted)"
          />
          <input
            type="text"
            placeholder="Pesquisar por nome, razão social, CNPJ, cidade ou categoria..."
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
            <span>Categoria:</span>
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="bg-transparent text-(--text-title) font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todas ({stats.total})</option>
              {stats.categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.count})
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

      {/* Tabela de Fornecedores */}
      <div className="rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card) overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-(--surface-subtle) border-b border-(--border) text-(--text-muted) text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Fornecedor / Razão Social</th>
                <th className="py-3.5 px-4">Categoria</th>
                <th className="py-3.5 px-4">CNPJ</th>
                <th className="py-3.5 px-4">Contato Principal</th>
                <th className="py-3.5 px-4">Localização</th>
                <th className="py-3.5 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border)">
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-(--text-muted)">
                    <Building2 size={36} className="mx-auto mb-2 opacity-40" />
                    <p className="font-medium">Nenhum fornecedor encontrado</p>
                    <p className="text-xs mt-1">Tente outros termos de busca ou categoria</p>
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => {
                  const badge = getCategoryBadge(supplier.category);
                  const BadgeIcon = badge.icon;
                  const cleanMobile = supplier.mobile ? supplier.mobile.replace(/\D/g, "") : null;
                  const hasWa = cleanMobile && cleanMobile.length >= 10;

                  return (
                    <tr
                      key={supplier.id}
                      className="hover:bg-(--surface-subtle)/70 transition-colors group cursor-pointer"
                    >
                      {/* Nome e Razão Social */}
                      <td className="py-3.5 px-4">
                        <Link href={`/fornecedores/${supplier.id}`} className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-tertiary group-hover:text-white transition-colors">
                            {supplier.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-(--text-title) group-hover:text-primary transition-colors truncate max-w-[260px]">
                              {supplier.name}
                            </p>
                            {supplier.tradeName && supplier.tradeName !== supplier.name && (
                              <p className="text-xs text-(--text-muted) truncate max-w-[260px]">
                                {supplier.tradeName}
                              </p>
                            )}
                          </div>
                        </Link>
                      </td>

                      {/* Categoria */}
                      <td className="py-3.5 px-4">
                        <Link href={`/fornecedores/${supplier.id}`}>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badge.bg}`}
                          >
                            <BadgeIcon size={12} />
                            <span>{supplier.category || "Parceiro Geral"}</span>
                          </span>
                        </Link>
                      </td>

                      {/* CNPJ */}
                      <td className="py-3.5 px-4">
                        <Link href={`/fornecedores/${supplier.id}`}>
                          <span className="font-mono text-xs text-(--text-title)">
                            {formatCnpj(supplier.cnpj)}
                          </span>
                        </Link>
                      </td>

                      {/* Contato */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 text-xs">
                          {(supplier.phone || supplier.mobile) && (
                            <div className="flex items-center gap-1.5 text-(--text-title)">
                              <Phone size={12} className="text-(--text-muted)" />
                              <span className="font-mono">
                                {formatPhone(supplier.phone || supplier.mobile)}
                              </span>
                              {hasWa && (
                                <a
                                  href={`https://wa.me/55${cleanMobile}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-600 hover:text-emerald-700"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MessageSquare size={13} />
                                </a>
                              )}
                            </div>
                          )}
                          {supplier.email && (
                            <div className="flex items-center gap-1.5 text-(--text-muted) truncate max-w-[200px]">
                              <Mail size={12} />
                              <span className="truncate">{supplier.email}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Localização */}
                      <td className="py-3.5 px-4">
                        <Link href={`/fornecedores/${supplier.id}`}>
                          {supplier.city ? (
                            <div className="flex items-center gap-1.5 text-xs text-(--text-title)">
                              <MapPin size={13} className="text-(--text-muted) shrink-0" />
                              <span className="truncate max-w-[140px]">
                                {supplier.city}
                                {supplier.state ? ` - ${supplier.state}` : ""}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-(--text-muted)">-</span>
                          )}
                        </Link>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/fornecedores/${supplier.id}`}
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
            Mostrando <span className="font-semibold text-(--text-title)">{suppliers.length}</span>{" "}
            de <span className="font-semibold text-(--text-title)">{total.toLocaleString("pt-BR")}</span> parceiros
            {searchQuery && ` (filtrado de ${stats.total.toLocaleString("pt-BR")})`}
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || isPending}
              onClick={() => handleSearch(searchQuery, selectedCategory, page - 1)}
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
              onClick={() => handleSearch(searchQuery, selectedCategory, page + 1)}
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
