"use client";

import { useMemo } from "react";
import type { EditorBlock } from "@/lib/editor-types";

interface SummaryWidgetProps {
  blocks: EditorBlock[];
  slots: number;
  profitMargin?: number;
}

function parseNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
}

export function SummaryWidget({
  blocks,
  slots,
  profitMargin = 0,
}: SummaryWidgetProps) {
  const { totalCost, totalProfit } = useMemo(() => {
    let cost = 0;
    let profit = 0;

    for (const block of blocks) {
      const d = block.data;

      if (block.categoryId === "itens_inclusos" && Array.isArray(d.rows)) {
        for (const r of d.rows) cost += parseNum(r.custo);
      }
      if (block.categoryId === "personalizados" && Array.isArray(d.rows)) {
        for (const r of d.rows) {
          cost += parseNum(r.custo);
          profit += parseNum(r.lucro);
        }
      }
      if (block.categoryId === "aereo") {
        cost += parseNum(d.custoUnitario);
      }
      if (block.categoryId === "hospedagem" && Array.isArray(d.rooms)) {
        for (const r of d.rooms) {
          const p = parseNum(r.porPessoa);
          if (p > 0) cost += p;
        }
      }
      if (block.categoryId === "rodoviario") {
        cost += parseNum(d.rateioPorPessoa);
      }
      if (block.categoryId === "guias") {
        cost += parseNum(d.rateioPorPessoa);
      }
      if (block.categoryId === "personalizada" && Array.isArray(d.rows)) {
        for (const r of d.rows) cost += parseNum(r.valor ?? r.custo);
      }
    }

    return { totalCost: cost, totalProfit: profit };
  }, [blocks]);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });

  const marginNum = Number(profitMargin) || 0;
  const agencyProfitPerPerson =
    marginNum > 0 ? totalCost * (marginNum / 100) : totalProfit;
  const pricePerPerson = totalCost + agencyProfitPerPerson;
  const grandTotal = pricePerPerson * slots;

  return (
    <div className="bg-secondary rounded-2xl shadow-shadow-card p-5 text-white space-y-4">
      <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
        <span>🧮</span>
        <span>Resumo Financeiro</span>
      </div>

      <div>
        <p className="text-xs text-white/50 uppercase tracking-wide">
          Valor total dos custos estimados
        </p>
        <p className="text-xl font-bold">{fmt(totalCost)}</p>
      </div>

      <div className="bg-white/10 rounded-xl p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/50 uppercase tracking-wide">
            Lucro estimado líquido
          </p>
          {marginNum > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-green-500/20 text-green-300">
              {marginNum}%
            </span>
          )}
        </div>
        <p className="text-lg font-bold text-green-300">
          {fmt(agencyProfitPerPerson)}
        </p>
        {slots > 1 && (
          <p className="text-[11px] text-white/60 mt-1">
            Total agência ({slots} vagas): {fmt(agencyProfitPerPerson * slots)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-white/50 uppercase tracking-wide">Por passageiro</p>
          <p className="text-sm font-bold">{fmt(pricePerPerson)}</p>
        </div>
        <div>
          <p className="text-xs text-white/50 uppercase tracking-wide">Faturamento total</p>
          <p className="text-sm font-bold">{fmt(grandTotal)}</p>
        </div>
      </div>
    </div>
  );
}
