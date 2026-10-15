"use client";

import { useState, useMemo } from "react";
import type { EditorBlock } from "@/lib/editor-types";
import { Users, Calculator } from "lucide-react";
import { calculatePackageFinancialSummary } from "@/lib/package-calc";

interface SummaryWidgetProps {
  blocks: EditorBlock[];
  slots: number;
  testPeople?: string;
  onTestPeopleChange?: (val: string) => void;
}

export function SummaryWidget({
  blocks,
  slots,
  testPeople: controlledTestPeople,
  onTestPeopleChange,
}: SummaryWidgetProps) {
  // Campo de simulação de quantidade de pessoas para teste de rateio/lucro
  const [internalTestPeople, setInternalTestPeople] = useState<string>("");
  const testPeople = controlledTestPeople !== undefined ? controlledTestPeople : internalTestPeople;
  const setTestPeople = onTestPeopleChange ?? setInternalTestPeople;

  const summary = useMemo(
    () =>
      calculatePackageFinancialSummary(
        blocks,
        slots,
        0,
        testPeople,
        null,
        null
      ),
    [blocks, slots, testPeople]
  );

  const {
    defaultCardVagas,
    activePeople,
    isSimulationActive,
    totalGroupCost,
    costPerPerson,
  } = summary;

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });

  return (
    <div className="bg-secondary rounded-2xl shadow-shadow-card p-5 text-white space-y-4">
      {/* 1. Header com ícone */}
      <div className="flex items-center justify-between text-white/90">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Calculator size={18} className="text-primary-contrast" />
          <span>Resumo Financeiro</span>
        </div>
      </div>

      {/* 2. Campo de Simulação de Passageiros para Teste */}
      <div className="bg-white/10 rounded-xl p-3 space-y-1.5 border border-white/10">
        <div className="flex items-center justify-between">
          <label className="text-xs text-white/80 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Users size={14} className="text-primary-contrast" />
            <span>Simular Passageiros / Vagas</span>
          </label>
          {isSimulationActive && (
            <button
              type="button"
              onClick={() => setTestPeople("")}
              className="text-[10px] text-white/60 hover:text-white underline cursor-pointer"
            >
              Resetar
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            value={testPeople}
            onChange={(e) => setTestPeople(e.target.value)}
            placeholder={`${defaultCardVagas} vagas`}
            className="w-full px-3 py-1.5 rounded-lg bg-black/25 border border-white/20 text-white placeholder:text-white/40 text-sm font-bold focus:outline-none focus:border-green-400 transition-all"
          />
          <span className="text-xs text-white/70 font-medium shrink-0">
            pessoas
          </span>
        </div>
        <p className="text-[10px] text-white/60">
          {isSimulationActive ? (
            <span className="text-green-300 font-semibold">
              ⚡ Simulação ativa para {activePeople} pessoas
            </span>
          ) : (
            <span>Calculando com as {defaultCardVagas} vagas configuradas nos cards</span>
          )}
        </p>
      </div>

      {/* 3. Valor Total dos Custos Estimados */}
      <div className="pt-1">
        <p className="text-xs text-white/60 uppercase tracking-wider font-medium">
          Valor total dos custos estimados
        </p>
        <p className="text-2xl font-extrabold text-white tracking-tight">
          {fmt(totalGroupCost)}
        </p>
        <p className="text-[11px] text-white/60 mt-0.5">
          Custo base: <span className="font-semibold text-white/90">{fmt(costPerPerson)}</span> / pessoa ({activePeople} {activePeople === 1 ? "vaga" : "vagas"}{isSimulationActive ? " simuladas" : ""})
        </p>
      </div>
    </div>
  );
}
