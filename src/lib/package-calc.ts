// src/lib/package-calc.ts
// Cálculos financeiros consolidados e compartilhados entre SummaryWidget, PackageEditor e CheckoutView

import type { EditorBlock } from "./editor-types";

export function parseNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
}

/**
 * Obtém a quantidade base de vagas configurada nos cards ou nos slots da excursão
 */
export function getDefaultCardVagas(blocks: EditorBlock[], slots: number): number {
  for (const b of blocks) {
    if (b.categoryId === "aereo" && parseNum(b.data?.vagas) > 0) return parseNum(b.data?.vagas);
    if (b.categoryId === "personalizados" && parseNum(b.data?.vagas) > 0) return parseNum(b.data?.vagas);
    if (b.categoryId === "guias" && parseNum(b.data?.vagas) > 0) return parseNum(b.data?.vagas);
    if (b.categoryId === "rodoviario" && parseNum(b.data?.vagas) > 0) return parseNum(b.data?.vagas);
  }
  return slots > 0 ? slots : 20;
}

/**
 * Calcula a soma dos custos totais de todos os cards da excursão
 */
export function calculateBaseCardsCost(blocks: EditorBlock[], defaultCardVagas: number): number {
  let total = 0;

  for (const block of blocks) {
    const d = block.data || {};

    // Aéreo: Valor Total NET ou Passagens
    if (block.categoryId === "aereo") {
      const netTotal = parseNum(d.valorNetTotal ?? d.valorNet);
      const netUnit = parseNum(d.valorNetUnitario);
      const blockVagas = parseNum(d.vagas) || defaultCardVagas;
      const custoTotal = parseNum(d.custoTotal);
      const custoUnit = parseNum(d.custoUnitario ?? d.custoPassagem);

      if (netTotal > 0) {
        total += netTotal;
      } else if (netUnit > 0) {
        total += netUnit * blockVagas;
      } else if (custoTotal > 0) {
        total += custoTotal;
      } else if (custoUnit > 0) {
        total += custoUnit * blockVagas;
      }
    }

    // Hospedagem: Valor NET, Total da Reserva ou soma dos quartos
    else if (block.categoryId === "hospedagem") {
      const netTotal = parseNum(d.valorNetTotal ?? d.valorNet);
      const netUnit = parseNum(d.valorNetUnitario);
      const blockVagas = parseNum(d.vagas) || defaultCardVagas;
      const totalReserva = parseNum(d.totalReserva);
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
      if (netTotal > 0) {
        total += netTotal;
      } else if (netUnit > 0) {
        total += netUnit * blockVagas;
      } else if (totalReserva > 0) {
        total += totalReserva;
      } else if (sumRooms > 0) {
        total += sumRooms;
      }
    }

    // Rodoviário: Valor NET, Valor do Contrato ou rateio * vagas
    else if (block.categoryId === "rodoviario") {
      const netTotal = parseNum(d.valorNetTotal ?? d.valorNet);
      const netUnit = parseNum(d.valorNetUnitario);
      const vContrato = parseNum(d.valorContrato);
      const blockVagas = parseNum(d.vagas) || defaultCardVagas;
      const rateio = parseNum(d.rateioPorPessoa);
      if (netTotal > 0) {
        total += netTotal;
      } else if (netUnit > 0) {
        total += netUnit * blockVagas;
      } else if (vContrato > 0) {
        total += vContrato;
      } else if (rateio > 0) {
        total += rateio * blockVagas;
      }
    }

    // Guias e Monitores: Diárias dos Guias + Despesas Adicionais
    else if (block.categoryId === "guias") {
      const totalDesp = parseNum(d.totalDespesas);
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
      if (totalDesp > 0) {
        total += totalDesp;
      } else if (gTot > 0) {
        total += gTot;
      } else if (parseNum(d.rateioPorPessoa) > 0) {
        const blockVagas = parseNum(d.vagas) || defaultCardVagas;
        total += parseNum(d.rateioPorPessoa) * blockVagas;
      }
    }

    // Personalizados: Despesas Personalizadas
    else if (block.categoryId === "personalizados") {
      const totalDesp = parseNum(d.totalDespesas);
      const blockVagas = parseNum(d.vagas) || defaultCardVagas;
      if (totalDesp > 0) {
        total += totalDesp;
      } else if (Array.isArray(d.rows) && d.rows.length > 0) {
        let rTot = 0;
        for (const r of d.rows) {
          const unit = parseNum(r.valor ?? r.custo);
          const rTotal = parseNum(r.total);
          if (rTotal > 0) {
            rTot += rTotal;
          } else if (unit > 0) {
            rTot += unit * blockVagas;
          }
        }
        total += rTot;
      }
    }

    // Itens Inclusos (caso existam)
    else if (block.categoryId === "itens_inclusos" && Array.isArray(d.rows)) {
      for (const r of d.rows) {
        total += parseNum(r.custo) * defaultCardVagas;
      }
    }

    // Outros personalizados genéricos
    else if (block.categoryId === "personalizada" && Array.isArray(d.rows)) {
      for (const r of d.rows) {
        total += parseNum(r.valor ?? r.custo) * defaultCardVagas;
      }
    }

    // Serviços Inclusos
    else if (block.categoryId === "servicos_inclusos") {
      const tot = parseNum(d.totalGeral || d.valorContrato);
      if (tot > 0) total += tot;
    }
  }

  return total;
}

export interface PackageFinancialSummary {
  defaultCardVagas: number;
  testPeople: string;
  isSimulationActive: boolean;
  activePeople: number;
  baseTotalCardsCost: number;
  totalGroupCost: number;
  costPerPerson: number;
  marginPercent: number;
  agencyProfitPerPerson: number;
  totalAgencyProfit: number;
  pricePerPerson: number;
  grandTotalRevenue: number;
}

export function calculatePackageFinancialSummary(
  blocks: EditorBlock[],
  slots: number,
  profitMargin: number,
  testPeople: string = ""
): PackageFinancialSummary {
  const defaultCardVagas = getDefaultCardVagas(blocks, slots);
  const testPeopleNum = parseNum(testPeople);
  const isSimulationActive = testPeople.trim() !== "" && testPeopleNum > 0;
  const activePeople = isSimulationActive ? testPeopleNum : defaultCardVagas;

  const baseTotalCardsCost = calculateBaseCardsCost(blocks, defaultCardVagas);

  const baseCostPerPerson = defaultCardVagas > 0 ? baseTotalCardsCost / defaultCardVagas : 0;
  const totalGroupCost = isSimulationActive ? baseCostPerPerson * activePeople : baseTotalCardsCost;
  const costPerPerson = baseCostPerPerson;

  const marginPercent = Number(profitMargin) || 0;
  const agencyProfitPerPerson = marginPercent > 0 ? costPerPerson * (marginPercent / 100) : 0;
  const totalAgencyProfit = agencyProfitPerPerson * activePeople;

  const pricePerPerson = costPerPerson + agencyProfitPerPerson;
  const grandTotalRevenue = pricePerPerson * activePeople;

  return {
    defaultCardVagas,
    testPeople,
    isSimulationActive,
    activePeople,
    baseTotalCardsCost,
    totalGroupCost,
    costPerPerson,
    marginPercent,
    agencyProfitPerPerson,
    totalAgencyProfit,
    pricePerPerson,
    grandTotalRevenue,
  };
}
