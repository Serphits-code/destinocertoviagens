"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";

interface ExcursionsChartProps {
  data: { name: string; ocupacao: number; vagas: number }[];
}

const COLORS = ["#F66B0E", "#205375", "#112B3C", "#4D8AB5", "#D65A05", "#8B93A1"];

export function ExcursionsChart({ data }: ExcursionsChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="bg-surface rounded-2xl p-6 shadow-shadow-card border border-border"
    >
      <h3 className="text-lg font-semibold text-text-title mb-4 flex items-center gap-2">
        <Calendar size={20} className="text-tertiary" />
        Excursões Ativas — Ocupação
      </h3>
      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center bg-surface-subtle rounded-xl">
          <p className="text-text-muted">Nenhuma excursão ativa no momento</p>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                stroke="var(--text-muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--text-muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                unit="%"
              />
              <Tooltip
                formatter={(value, name) =>
                  name === "ocupacao" ? [`${value}%`, "Ocupação"] : [value, "Vagas"]
                }
                contentStyle={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.75rem",
                  color: "var(--text-body)",
                  fontSize: "0.875rem",
                }}
              />
              <Bar dataKey="ocupacao" name="Ocupação" radius={[6, 6, 0, 0]}>
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
