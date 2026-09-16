"use client";

import { useState, useMemo } from "react";
import type { EditorBlock } from "@/lib/editor-types";
import { Users, Calculator, Percent, Check, Edit2 } from "lucide-react";

interface SummaryWidgetProps {
  blocks: EditorBlock[];
  slots: number;
  profitMargin?: number;
  onUpdateProfitMargin?: (newMargin: number) => void;
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
  onUpdateProfitMargin,
}: SummaryWidgetProps) {
  // Campo de simulação de quantidade de pessoas para teste de rateio/lucro
  const [testPeople, setTestPeople] = useState<string>("");

  // Edição inline da margem de lucro
  const [isEditingMargin, setIsEditingMargin] = useState(false);
  const [tempMargin, setTempMargin] = useState(String(profitMargin || 0));

  // Quantidade de pessoas ativa: do campo de simulação se informado; caso contrário, quantidade oficial de vagas
  const testPeopleNum = parseNum(testPeople);
  const isSimulationActive = testPeople.trim() !== "" && testPeopleNum > 0;
  const officialVagas = slots > 0 ? slots : 20;
  const activePeople = isSimulationActive ? testPeopleNum : officialVagas;

  // 1. Cálculo do Valor Total dos Custos Estimados de acordo com activePeople (simulada ou total de vagas oficial)
  const totalGroupCost = useMemo(() => {
    let total = 0;

    for (const block of blocks) {
      const d = block.data;

      // Aéreo: Valor Total NET ou Passagens
      if (block.categoryId === "aereo") {
        const netTotal = parseNum(d.valorNetTotal ?? d.valorNet);
        const netUnit = parseNum(d.valorNetUnitario);
        const blockVagas = parseNum(d.vagas) || officialVagas;
        const custoTotal = parseNum(d.custoTotal);
        const custoUnit = parseNum(d.custoUnitario ?? d.custoPassagem);

        if (netUnit > 0) {
          total += netUnit * activePeople;
        } else if (netTotal > 0) {
          total += (netTotal / blockVagas) * activePeople;
        } else if (custoUnit > 0) {
          total += custoUnit * activePeople;
        } else if (custoTotal > 0) {
          total += (custoTotal / blockVagas) * activePeople;
        }
      }

      // Hospedagem: Total dos quartos ou Total da Reserva
      else if (block.categoryId === "hospedagem") {
        let sumRooms = 0;
        const dDiarias = parseNum(d.diarias) || 1;
        if (Array.isArray(d.rooms) && d.rooms.length > 0) {
          for (const r of d.rooms) {
            if (String(r.totalPeriodo || "").toLowerCase().includes("cortesia")) continue;
            const totPer = parseNum(r.totalPeriodo);
            const totQ = parseNum(r.totalQuarto);
            const diaria = parseNum(r.diaria);
            const qtd = parseNum(r.qtd) || 1;
            const porPessoa = parseNum(r.porPessoa);
            const cap = r.tipo?.toLowerCase().includes("single")
              ? 1
              : r.tipo?.toLowerCase().includes("triplo")
              ? 3
              : r.tipo?.toLowerCase().includes("quadr")
              ? 4
              : 2;

            if (totPer > 0) {
              sumRooms += totPer;
            } else if (totQ > 0) {
              sumRooms += totQ * qtd;
            } else if (diaria > 0) {
              sumRooms += diaria * dDiarias * qtd;
            } else if (porPessoa > 0) {
              sumRooms += porPessoa * cap * qtd;
            }
          }
        }
        const totalHospedagem = sumRooms > 0 ? sumRooms : parseNum(d.totalReserva);
        if (totalHospedagem > 0) {
          total += (totalHospedagem / officialVagas) * activePeople;
        }
      }

      // Rodoviário: Valor do Contrato ou Rateio por Pessoa
      else if (block.categoryId === "rodoviario") {
        const vContrato = parseNum(d.valorContrato);
        const blockVagas = parseNum(d.vagas) || officialVagas;
        const rateio = parseNum(d.rateioPorPessoa);
        if (rateio > 0 && (vContrato === 0 || parseNum((vContrato / blockVagas).toFixed(2)) !== rateio)) {
          total += rateio * activePeople;
        } else if (vContrato > 0) {
          total += (vContrato / blockVagas) * activePeople;
        } else if (rateio > 0) {
          total += rateio * activePeople;
        }
      }

      // Guias e Monitores: Diárias dos Guias + Despesas Adicionais em tempo real
      else if (block.categoryId === "guias") {
        let gTot = 0;
        for (const g of d.guias ?? []) {
          const dNum = parseNum(g.diarias);
          const vDiaria = parseNum(g.valorDiaria);
          const vTot = parseNum(g.valorTotal);
          gTot += vTot > 0 ? vTot : (dNum > 0 && vDiaria > 0 ? dNum * vDiaria : 0);
        }
        for (const desp of d.despesas ?? []) {
          gTot += parseNum(desp.valor);
        }
        const blockVagas = parseNum(d.vagas) || officialVagas;
        const totalGuias = gTot > 0 ? gTot : parseNum(d.totalDespesas);
        if (totalGuias > 0) {
          total += (totalGuias / blockVagas) * activePeople;
        } else if (parseNum(d.rateioPorPessoa) > 0) {
          total += parseNum(d.rateioPorPessoa) * activePeople;
        }
      }

      // Personalizados: Despesas Personalizadas em tempo real
      else if (block.categoryId === "personalizados") {
        const blockVagas = parseNum(d.vagas) || officialVagas;
        if (Array.isArray(d.rows) && d.rows.length > 0) {
          let rTot = 0;
          for (const r of d.rows) {
            const unit = parseNum(r.valor ?? r.custo);
            const rTotal = parseNum(r.total);
            if (unit > 0) {
              rTot += unit * activePeople;
            } else if (rTotal > 0) {
              rTot += (rTotal / blockVagas) * activePeople;
            }
          }
          total += rTot;
        } else {
          const totalDesp = parseNum(d.totalDespesas);
          total += (totalDesp / blockVagas) * activePeople;
        }
      }

      // Itens Inclusos (caso existam)
      else if (block.categoryId === "itens_inclusos" && Array.isArray(d.rows)) {
        for (const r of d.rows) {
          total += parseNum(r.custo) * activePeople;
        }
      }

      // Outros personalizados genéricos
      else if (block.categoryId === "personalizada" && Array.isArray(d.rows)) {
        for (const r of d.rows) {
          total += parseNum(r.valor ?? r.custo) * activePeople;
        }
      }

      // Serviços Inclusos
      else if (block.categoryId === "servicos_inclusos") {
        const tot = parseNum(d.totalGeral || d.valorContrato);
        if (tot > 0) total += (tot / officialVagas) * activePeople;
      }
    }

    return total;
  }, [blocks, activePeople, officialVagas]);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });

  // Custo por passageiro rateado
  const costPerPerson = activePeople > 0 ? totalGroupCost / activePeople : 0;

  // Margem e lucro da agência
  const marginNum = Number(profitMargin) || 0;
  const agencyProfitPerPerson = marginNum > 0 ? costPerPerson * (marginNum / 100) : 0;
  const totalAgencyProfit = agencyProfitPerPerson * activePeople;

  // Preço por passageiro e Faturamento total da viagem
  const pricePerPerson = costPerPerson + agencyProfitPerPerson;
  const grandTotalRevenue = pricePerPerson * activePeople;

  const handleSaveMargin = () => {
    const val = parseNum(tempMargin);
    onUpdateProfitMargin?.(val);
    setIsEditingMargin(false);
  };

  return (
    <div className="bg-secondary rounded-2xl shadow-shadow-card p-5 text-white space-y-4">
      {/* 1. Header com ícone e controle da margem de lucro */}
      <div className="flex items-center justify-between text-white/90">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Calculator size={18} className="text-primary-contrast" />
          <span>Resumo Financeiro</span>
        </div>

        {/* Badge / Edição da Margem de Lucro */}
        {isEditingMargin ? (
          <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-lg">
            <input
              type="number"
              className="w-12 bg-transparent text-xs font-bold text-green-300 outline-none text-right"
              value={tempMargin}
              onChange={(e) => setTempMargin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveMargin()}
              autoFocus
            />
            <span className="text-[10px] text-green-300 font-bold">%</span>
            <button
              onClick={handleSaveMargin}
              className="p-0.5 text-green-400 hover:text-green-300 cursor-pointer"
              title="Confirmar"
            >
              <Check size={12} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setTempMargin(String(profitMargin || 0));
              setIsEditingMargin(true);
            }}
            className="group flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-green-500/20 hover:bg-green-500/30 text-green-300 transition-colors cursor-pointer"
            title="Clique para editar a margem de lucro"
          >
            <Percent size={11} />
            <span>{marginNum}%</span>
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
            placeholder={`${officialVagas} vagas`}
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
            <span>Calculando com as {officialVagas} vagas oficiais do pacote</span>
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
          {marginNum > 0 && (
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-green-500/20 text-green-300">
              {marginNum}%
            </span>
          )}
        </div>
        <p className="text-xl font-extrabold text-green-300">
          {fmt(agencyProfitPerPerson)}
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
