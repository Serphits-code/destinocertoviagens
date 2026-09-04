"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

interface CashFlowChartProps {
  data: {
    month: string;
    recebido: number;
    pago: number;
    aReceber: number;
  }[];
}

const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function CashFlowChart({ data }: CashFlowChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-(--surface) rounded-3xl p-6 shadow-(--shadow-card) border border-(--border)"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-(--text-title) flex items-center gap-2">
          <TrendingUp size={20} className="text-primary" />
          <span>Fluxo de Caixa (Entradas vs Saídas)</span>
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span className="text-(--text-muted)">Recebido</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-(--text-muted)">Pago</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-tertiary" />
            <span className="text-(--text-muted)">A Receber</span>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradRecebido" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F66B0E" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#F66B0E" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradPago" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradAReceber" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#205375" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#205375" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="month"
              stroke="var(--text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value) => formatBRL(Number(value))}
              contentStyle={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "0.75rem",
                color: "var(--text-title)",
                fontSize: "0.8rem",
              }}
            />
            <Area
              type="monotone"
              dataKey="recebido"
              name="Recebido"
              stroke="#F66B0E"
              strokeWidth={2.5}
              fill="url(#gradRecebido)"
            />
            <Area
              type="monotone"
              dataKey="pago"
              name="Pago a Fornecedores"
              stroke="#EF4444"
              strokeWidth={2}
              fill="url(#gradPago)"
            />
            <Area
              type="monotone"
              dataKey="aReceber"
              name="A Receber"
              stroke="#205375"
              strokeWidth={2}
              fill="url(#gradAReceber)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
