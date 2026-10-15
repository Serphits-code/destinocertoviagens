"use client";

import { useState, useMemo } from "react";
import type { EditorBlock } from "@/lib/editor-types";
import { Users, Calculator, Percent, Check, Edit2 } from "lucide-react";
import { calculatePackageFinancialSummary, parseNum } from "@/lib/package-calc";

interface SummaryWidgetProps {
  blocks: EditorBlock[];
  slots: number;
  profitMargin?: number;
  customProfitAmount?: number | null;
  customPackagePrice?: number | null;
  onUpdatePricing?: (pricing: {
    profitMargin?: number;
    customProfitAmount?: number | null;
    customPackagePrice?: number | null;
  }) => void;
  onUpdateProfitMargin?: (newMargin: number) => void;
  testPeople?: string;
  onTestPeopleChange?: (val: string) => void;
}

export function SummaryWidget({
  blocks,
  slots,
  profitMargin = 0,
  customProfitAmount = null,
  customPackagePrice = null,
  onUpdatePricing,
  onUpdateProfitMargin,
  testPeople: controlledTestPeople,
  onTestPeopleChange,
}: SummaryWidgetProps) {
  // Campo de simulação de quantidade de pessoas para teste de rateio/lucro
  const [internalTestPeople, setInternalTestPeople] = useState<string>("");
  const testPeople = controlledTestPeople !== undefined ? controlledTestPeople : internalTestPeople;
  const setTestPeople = onTestPeopleChange ?? setInternalTestPeople;

  // Edição inline da margem e valores cheios
  const [isEditing, setIsEditing] = useState(false);
  const [editMode, setEditMode] = useState<"percent" | "profit" | "price">("percent");
  const [tempVal, setTempVal] = useState(String(profitMargin || 0));

  const summary = useMemo(
    () =>
      calculatePackageFinancialSummary(
        blocks,
        slots,
        profitMargin,
        testPeople,
        customProfitAmount,
        customPackagePrice
      ),
    [blocks, slots, profitMargin, testPeople, customProfitAmount, customPackagePrice]
  );

  const {
    defaultCardVagas,
    activePeople,
    isSimulationActive,
    totalGroupCost,
    costPerPerson,
    marginPercent: marginNum,
    agencyProfitPerPerson,
    effectiveProfitPerPerson,
    roundingDifference,
    totalAgencyProfit,
    pricePerPerson,
    grandTotalRevenue,
  } = summary;

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });

  const handleSave = () => {
    const parsed = parseNum(tempVal);
    if (editMode === "percent") {
      if (onUpdatePricing) {
        onUpdatePricing({ profitMargin: parsed, customProfitAmount: null, customPackagePrice: null });
      } else {
        onUpdateProfitMargin?.(parsed);
      }
    } else if (editMode === "profit") {
      if (onUpdatePricing) {
        onUpdatePricing({ customProfitAmount: parsed, customPackagePrice: null });
      }
    } else if (editMode === "price") {
      if (onUpdatePricing) {
        onUpdatePricing({ customPackagePrice: parsed, customProfitAmount: null });
      }
    }
    setIsEditing(false);
  };

  return (
    <div className="bg-secondary rounded-2xl shadow-shadow-card p-5 text-white space-y-4">
      {/* 1. Header com ícone e controle da margem de lucro */}
      <div className="flex items-center justify-between text-white/90">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Calculator size={18} className="text-primary-contrast" />
          <span>Resumo Financeiro</span>
        </div>

        {/* Badge / Edição da Margem de Lucro e Valor Cheio */}
        {isEditing ? (
          <div className="flex flex-col gap-2 bg-black/40 p-2.5 rounded-xl border border-white/20 text-xs">
            <div className="flex items-center gap-1.5 pb-1 border-b border-white/10">
              <button
                type="button"
                onClick={() => { setEditMode("percent"); setTempVal(String(marginNum)); }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${editMode === "percent" ? "bg-green-500 text-black" : "bg-white/10 text-white/70"}`}
              >
                % Margem
              </button>
              <button
                type="button"
                onClick={() => { setEditMode("profit"); setTempVal(effectiveProfitPerPerson > 0 ? effectiveProfitPerPerson.toFixed(2) : ""); }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${editMode === "profit" ? "bg-green-500 text-black" : "bg-white/10 text-white/70"}`}
              >
                R$ Lucro
              </button>
              <button
                type="button"
                onClick={() => { setEditMode("price"); setTempVal(pricePerPerson > 0 ? pricePerPerson.toFixed(2) : ""); }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${editMode === "price" ? "bg-green-500 text-black" : "bg-white/10 text-white/70"}`}
              >
                R$ Preço
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-white/60 font-semibold text-[11px]">
                {editMode === "percent" ? "%" : "R$"}
              </span>
              <input
                type="number"
                step={editMode === "percent" ? "0.5" : "1"}
                className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded-md text-xs font-bold text-green-300 outline-none"
                value={tempVal}
                onChange={(e) => setTempVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                autoFocus
              />
              <button
                onClick={handleSave}
                className="p-1 rounded bg-green-500 text-black font-bold hover:bg-green-400 cursor-pointer"
                title="Salvar"
              >
                <Check size={12} />
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-1.5 py-1 text-white/60 hover:text-white text-[10px] cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditMode("percent");
              setTempVal(String(marginNum));
              setIsEditing(true);
            }}
            className="group flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 transition-colors cursor-pointer border border-green-500/30"
            title="Clique para editar % de lucro ou valor cheio arredondado"
          >
            <Percent size={11} />
            <span>{marginNum}% ({fmt(effectiveProfitPerPerson)})</span>
            <Edit2 size={10} className="opacity-60 group-hover:opacity-100 ml-0.5" />
          </button>
        )}
      </div>

      {/* 2. Campo de Simulação de Passageiros para Teste - LOGO APÓS RESUMO FINANCEIRO */}
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

      {/* 4. Lucro Estimado Líquido */}
      <div className="bg-white/10 rounded-xl p-3.5 space-y-1 border border-white/10">
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/60 uppercase tracking-wider font-medium">
            Lucro estimado líquido
          </p>
          <div className="flex items-center gap-1.5">
            {roundingDifference > 0 && (
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300" title="Diferença de arredondamento incorporada ao lucro">
                +{fmt(roundingDifference)} arr.
              </span>
            )}
            {marginNum > 0 && (
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-green-500/20 text-green-300">
                {marginNum}%
              </span>
            )}
          </div>
        </div>
        <p className="text-xl font-extrabold text-green-300">
          {fmt(effectiveProfitPerPerson)}
          <span className="text-xs text-white/60 font-normal ml-1.5">/ passageiro</span>
        </p>
        <p className="text-[11px] text-white/70 font-medium">
          Total agência ({activePeople} {activePeople === 1 ? "vaga" : "vagas"}):{" "}
          <span className="text-green-200 font-bold">{fmt(totalAgencyProfit)}</span>
        </p>
      </div>

      {/* 5. Preço de Venda Por Passageiro & Faturamento Total */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
          <p className="text-[11px] text-white/50 uppercase tracking-wider font-medium">
            Por passageiro
          </p>
          <p className="text-base font-bold text-white mt-0.5">
            {fmt(pricePerPerson)}
          </p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
          <p className="text-[11px] text-white/50 uppercase tracking-wider font-medium">
            Faturamento total
          </p>
          <p className="text-base font-extrabold text-green-300 mt-0.5">
            {fmt(grandTotalRevenue)}
          </p>
        </div>
      </div>
    </div>
  );
}
