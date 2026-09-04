"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Building2 } from "lucide-react";

interface CategoryData {
  category: string;
  amount: number;
  count: number;
}

interface SupplierCategoryChartProps {
  data: CategoryData[];
}

const formatBRL = (val: number) =>
  val.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const COLORS = ["#F66B0E", "#205375", "#112B3C", "#10B981", "#6366F1", "#EC4899"];

export function SupplierCategoryChart({ data }: SupplierCategoryChartProps) {
  return (
    <div className="p-6 rounded-3xl bg-(--surface) border border-(--border) shadow-(--shadow-card) space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center">
          <Building2 size={20} />
        </div>
        <div>
          <h3 className="font-bold text-base text-(--text-title)">
            Faturamento por Categoria de Parceiro
          </h3>
          <p className="text-xs text-(--text-muted)">
            Despesas e faturas consolidadas por tipo de fornecedor
          </p>
        </div>
      </div>

      <div className="h-64 w-full">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-(--text-muted)">
            Nenhum dado por categoria disponível
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis
                type="number"
                stroke="var(--text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                type="category"
                dataKey="category"
                stroke="var(--text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <Tooltip
                formatter={(value) => [formatBRL(Number(value)), "Total"]}
                contentStyle={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.75rem",
                  color: "var(--text-body)",
                  fontSize: "0.8rem",
                }}
              />
              <Bar dataKey="amount" radius={[0, 8, 8, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
