"use client";

import { useState } from "react";
import {
  Target,
  Users,
  DollarSign,
  Award,
  Search,
  Phone,
  Mail,
  TrendingUp,
  Percent,
} from "lucide-react";
import { SellerMetricItem } from "@/lib/actions/sellers";

interface Props {
  sellers: SellerMetricItem[];
}

export function SellersContent({ sellers }: Props) {
  const [search, setSearch] = useState("");

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const totalVolume = sellers.reduce((acc, s) => acc + s.totalVolume, 0);
  const totalSales = sellers.reduce((acc, s) => acc + s.salesCount, 0);
  const totalCommissions = sellers.reduce((acc, s) => acc + s.estimatedCommission, 0);

  const filtered = sellers
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.totalVolume - a.totalVolume);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-(--surface) p-5 rounded-2xl border border-(--border) shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-(--text-title)">
              Vendedores & Desempenho Comercial
            </h1>
            <p className="text-xs text-(--text-muted)">
              Acompanhamento de vendas, taxas de comissão e volume faturado da equipe
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-(--surface) p-4 rounded-2xl border border-(--border) shadow-xs">
          <div className="text-[11px] font-semibold text-(--text-muted) uppercase">Vendedores Ativos</div>
          <div className="text-2xl font-extrabold text-(--text-title) mt-1">{sellers.length}</div>
          <p className="text-[11px] text-(--text-muted) mt-1">Consultores cadastrados</p>
        </div>

        <div className="bg-(--surface) p-4 rounded-2xl border border-(--border) shadow-xs">
          <div className="text-[11px] font-semibold text-emerald-600 uppercase">Faturamento da Equipe</div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{formatCurrency(totalVolume)}</div>
          <p className="text-[11px] text-(--text-muted) mt-1">Volume total comercializado</p>
        </div>

        <div className="bg-(--surface) p-4 rounded-2xl border border-(--border) shadow-xs">
          <div className="text-[11px] font-semibold text-primary uppercase">Total de Contratos</div>
          <div className="text-2xl font-extrabold text-primary mt-1">{totalSales.toLocaleString("pt-BR")}</div>
          <p className="text-[11px] text-(--text-muted) mt-1">Vendas fechadas</p>
        </div>

        <div className="bg-(--surface) p-4 rounded-2xl border border-(--border) shadow-xs">
          <div className="text-[11px] font-semibold text-blue-600 uppercase">Comissões Apuradas</div>
          <div className="text-2xl font-extrabold text-blue-600 mt-1">{formatCurrency(totalCommissions)}</div>
          <p className="text-[11px] text-(--text-muted) mt-1">Estimativa de repasse comercial</p>
        </div>
      </div>

      {/* Busca */}
      <div className="bg-(--surface) p-4 rounded-2xl border border-(--border) shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
          <input
            type="text"
            placeholder="Pesquisar vendedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-(--border) bg-(--background) text-(--text-body) focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <span className="text-xs text-(--text-muted) whitespace-nowrap">
          {filtered.length} vendedores listados
        </span>
      </div>

      {/* Grid de Cards de Vendedores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((seller, idx) => (
          <div
            key={seller.id}
            className="bg-(--surface) rounded-2xl border border-(--border) p-5 shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {seller.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-(--text-title) leading-tight">
                      {seller.name}
                    </h3>
                    <span className="text-[11px] text-(--text-muted)">
                      {idx === 0 ? "🏆 Top Vendedor" : `Classificação #${idx + 1}`}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-(--surface-muted) text-(--text-title) border border-(--border) flex items-center gap-1">
                  <Percent className="w-3 h-3 text-primary" />
                  {seller.commissionRate}%
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-(--border) space-y-2 text-xs">
                {seller.email && (
                  <div className="flex items-center gap-2 text-(--text-muted) truncate">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{seller.email}</span>
                  </div>
                )}
                {seller.phone && (
                  <div className="flex items-center gap-2 text-(--text-muted)">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{seller.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-(--border) grid grid-cols-2 gap-2 bg-(--surface-subtle) p-3 rounded-xl">
              <div>
                <span className="text-[10px] text-(--text-muted) block">Volume Vendido</span>
                <span className="text-xs font-bold text-(--text-title)">
                  {formatCurrency(seller.totalVolume)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-(--text-muted) block">Contratos</span>
                <span className="text-xs font-bold text-primary">
                  {seller.salesCount} vendas
                </span>
              </div>
              <div className="col-span-2 pt-1 border-t border-(--border)/50 flex items-center justify-between text-[11px]">
                <span className="text-(--text-muted)">Comissão Estimada:</span>
                <span className="font-mono font-bold text-emerald-600">
                  {formatCurrency(seller.estimatedCommission)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
