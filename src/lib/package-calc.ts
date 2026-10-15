// src/lib/package-calc.ts
// Cálculos financeiros consolidados e compartilhados entre SummaryWidget, PackageEditor e CheckoutView

import type { EditorBlock, CustomAgeTier } from "./editor-types";

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

export type AgeBracket = "adulto" | "crianca" | "bebe";

export const AGE_BRACKET_LABELS: Record<AgeBracket, string> = {
  adulto: "Adulto (12+ anos)",
  crianca: "Criança (2 a 11 anos)",
  bebe: "Bebê / Colo (0 a 1 ano)",
};

/**
 * Calcula a idade do hóspede na data de início da viagem ou data atual
 */
export function getGuestAge(
  guest: { birthDate?: string | null },
  tripDateStr?: string | null
): number | null {
  if (!guest.birthDate) return null;
  const targetDate = tripDateStr ? new Date(tripDateStr + "T00:00:00") : new Date();
  const cleanBirth = guest.birthDate.split("T")[0];
  const [bYear, bMonth, bDay] = cleanBirth.split("-").map(Number);
  if (!bYear || !bMonth || !bDay || isNaN(targetDate.getTime())) return null;

  let age = targetDate.getFullYear() - bYear;
  const m = targetDate.getMonth() - (bMonth - 1);
  if (m < 0 || (m === 0 && targetDate.getDate() < bDay)) {
    age--;
  }
  return age >= 0 ? age : null;
}

/**
 * Identifica a faixa etária do hóspede pela data de nascimento ou tipo selecionado
 */
export function getGuestAgeBracket(
  guest: { birthDate?: string | null; tipo?: string },
  tripDateStr?: string | null
): AgeBracket {
  const age = getGuestAge(guest, tripDateStr);
  if (age !== null) {
    if (age < 2) return "bebe";
    if (age < 12) return "crianca";
    return "adulto";
  }

  const tipo = (guest.tipo || "").toLowerCase();
  if (tipo.includes("bebê") || tipo.includes("bebe") || tipo.includes("colo")) return "bebe";
  if (tipo.includes("criança") || tipo.includes("crianca")) return "crianca";
  return "adulto";
}

/**
 * Retorna o custo base unitário estimado de um bloco por pessoa
 */
export function getBlockBaseUnitCost(block: EditorBlock, defaultVagas: number): number {
  const d = block.data || {};
  const vagas = parseNum(d.vagas) || defaultVagas || 1;

  if (block.categoryId === "aereo") {
    const netUnit = parseNum(d.valorNetUnitario);
    if (netUnit > 0) return netUnit;
    const custoUnit = parseNum(d.custoUnitario ?? d.custoPassagem);
    if (custoUnit > 0) return custoUnit;
    const netTotal = parseNum(d.valorNetTotal ?? d.valorNet);
    if (netTotal > 0 && vagas > 0) return netTotal / vagas;
    const custoTotal = parseNum(d.custoTotal);
    if (custoTotal > 0 && vagas > 0) return custoTotal / vagas;
  }

  if (block.categoryId === "hospedagem") {
    const netUnit = parseNum(d.valorNetUnitario);
    if (netUnit > 0) return netUnit;
    if (Array.isArray(d.rooms) && d.rooms.length > 0) {
      let sumRooms = 0;
      const dDiarias = parseNum(d.diarias) || 1;
      let totalPessoasQuartos = 0;
      for (const r of d.rooms) {
        if (String(r.totalPeriodo || "").toLowerCase().includes("cortesia")) continue;
        const totPer = parseNum(r.totalPeriodo);
        const totQ = parseNum(r.totalQuarto);
        const diaria = parseNum(r.diaria);
        const qtd = parseNum(r.qtd) || 1;
        const cap = r.tipo?.toLowerCase().includes("single")
          ? 1
          : r.tipo?.toLowerCase().includes("triplo")
          ? 3
          : r.tipo?.toLowerCase().includes("quadr")
          ? 4
          : 2;
        totalPessoasQuartos += cap * qtd;
        if (totPer > 0) sumRooms += totPer;
        else if (totQ > 0) sumRooms += totQ * qtd;
        else if (diaria > 0) sumRooms += diaria * dDiarias * qtd;
      }
      if (sumRooms > 0) {
        return totalPessoasQuartos > 0 ? sumRooms / totalPessoasQuartos : sumRooms / vagas;
      }
    }
    const netTotal = parseNum(d.valorNetTotal ?? d.valorNet);
    if (netTotal > 0 && vagas > 0) return netTotal / vagas;
    const totalReserva = parseNum(d.totalReserva);
    if (totalReserva > 0 && vagas > 0) return totalReserva / vagas;
  }

  if (block.categoryId === "rodoviario") {
    const netUnit = parseNum(d.valorNetUnitario);
    if (netUnit > 0) return netUnit;
    const rateio = parseNum(d.rateioPorPessoa);
    if (rateio > 0) return rateio;
    const vContrato = parseNum(d.valorContrato);
    if (vContrato > 0 && vagas > 0) return vContrato / vagas;
    const netTotal = parseNum(d.valorNetTotal ?? d.valorNet);
    if (netTotal > 0 && vagas > 0) return netTotal / vagas;
  }

  if (block.categoryId === "guias") {
    const rateio = parseNum(d.rateioPorPessoa);
    if (rateio > 0) return rateio;
    const totalDesp = parseNum(d.totalDespesas);
    if (totalDesp > 0 && vagas > 0) return totalDesp / vagas;
  }

  if (block.categoryId === "personalizados") {
    const totalDesp = parseNum(d.totalDespesas);
    if (totalDesp > 0 && vagas > 0) return totalDesp / vagas;
  }

  if (block.categoryId === "servicos_inclusos") {
    const tot = parseNum(d.totalGeral || d.valorContrato);
    if (tot > 0 && vagas > 0) return tot / vagas;
  }

  return 0;
}

/**
 * Retorna o preço de um bloco para um passageiro de acordo com as faixas etárias customizadas pelo usuário
 */
export function getBlockUnitPriceForGuest(
  block: EditorBlock,
  guest: { birthDate?: string | null; tipo?: string },
  tripDateStr?: string | null,
  defaultVagas: number = 20
): { unitCost: number; matchedTierLabel: string } {
  const baseCost = getBlockBaseUnitCost(block, defaultVagas);
  const agePricing = block.data?.agePricing;
  const tiers: CustomAgeTier[] = Array.isArray(agePricing?.tiers) ? agePricing.tiers : [];
  const age = getGuestAge(guest, tripDateStr);

  // 1. Prioridade: Faixas Etárias Customizadas criadas pelo usuário
  if (tiers.length > 0) {
    if (age !== null) {
      // Procura a faixa onde minAge <= age <= maxAge
      const matched = tiers.find(
        (t: CustomAgeTier) => age >= Number(t.minAge || 0) && age <= Number(t.maxAge ?? 999)
      );
      if (matched && matched.price !== "" && matched.price !== undefined) {
        return {
          unitCost: parseNum(matched.price),
          matchedTierLabel: matched.label || `Faixa (${matched.minAge}-${matched.maxAge}a)`,
        };
      }
    } else {
      // Fallback sem data de nascimento: tenta casar pelo tipo selecionado
      const tipo = (guest.tipo || "").toLowerCase();
      const matched = tiers.find(
        (t: CustomAgeTier) =>
          t.label.toLowerCase().includes(tipo) ||
          tipo.includes(t.label.toLowerCase())
      );
      if (matched && matched.price !== "" && matched.price !== undefined) {
        return {
          unitCost: parseNum(matched.price),
          matchedTierLabel: matched.label,
        };
      }
    }
  }

  // 2. Fallback: campos direto adulto / crianca / bebe se existirem
  const legacyBracket = getGuestAgeBracket(guest, tripDateStr);
  if (legacyBracket === "crianca" && agePricing?.crianca !== undefined && agePricing?.crianca !== "") {
    return { unitCost: parseNum(agePricing.crianca), matchedTierLabel: "Criança" };
  }
  if ((legacyBracket as string) === "bebe") {
    if (agePricing?.bebe !== undefined && agePricing?.bebe !== "") {
      return { unitCost: parseNum(agePricing.bebe), matchedTierLabel: "Bebê / Colo" };
    }
    return { unitCost: 0, matchedTierLabel: "Bebê / Colo" };
  }
  if (agePricing?.adulto !== undefined && agePricing?.adulto !== "") {
    const val = parseNum(agePricing.adulto);
    if (val >= 0) return { unitCost: val, matchedTierLabel: "Adulto" };
  }

  return {
    unitCost: baseCost,
    matchedTierLabel: legacyBracket === "crianca" ? "Criança" : (legacyBracket as string) === "bebe" ? "Bebê / Colo" : "Adulto",
  };
}

/**
 * Retorna o preço de um bloco para uma faixa etária específica
 */
export function getBlockUnitPriceForTier(
  block: EditorBlock,
  tier: AgeBracket,
  defaultVagas: number
): number {
  const baseCost = getBlockBaseUnitCost(block, defaultVagas);
  const agePricing = block.data?.agePricing;
  const tiers: CustomAgeTier[] = Array.isArray(agePricing?.tiers) ? agePricing.tiers : [];

  if (tiers.length > 0) {
    if (tier === "bebe") {
      const bTier = tiers.find((t: CustomAgeTier) => Number(t.minAge) === 0 || t.label.toLowerCase().includes("bebê") || t.label.toLowerCase().includes("bebe"));
      if (bTier && bTier.price !== undefined && bTier.price !== "") return parseNum(bTier.price);
    } else if (tier === "crianca") {
      const cTier = tiers.find((t: CustomAgeTier) => (Number(t.minAge) >= 2 && Number(t.minAge) < 12) || t.label.toLowerCase().includes("criança") || t.label.toLowerCase().includes("crianca"));
      if (cTier && cTier.price !== undefined && cTier.price !== "") return parseNum(cTier.price);
    } else {
      const aTier = tiers.find((t: CustomAgeTier) => Number(t.minAge) >= 12 || t.label.toLowerCase().includes("adulto"));
      if (aTier && aTier.price !== undefined && aTier.price !== "") return parseNum(aTier.price);
    }
  }

  if (tier === "adulto") {
    if (agePricing && agePricing.adulto !== undefined && agePricing.adulto !== "") {
      const val = parseNum(agePricing.adulto);
      if (val >= 0) return val;
    }
    return baseCost;
  }

  if (tier === "crianca") {
    if (agePricing && agePricing.crianca !== undefined && agePricing.crianca !== "") {
      return parseNum(agePricing.crianca);
    }
    return agePricing && agePricing.adulto !== undefined && agePricing.adulto !== ""
      ? parseNum(agePricing.adulto)
      : baseCost;
  }

  if (tier === "bebe") {
    if (agePricing && agePricing.bebe !== undefined && agePricing.bebe !== "") {
      return parseNum(agePricing.bebe);
    }
    return 0;
  }

  return baseCost;
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
  customProfitAmount?: number | null;
  customPackagePrice?: number | null;
  effectiveProfitPerPerson: number;
  roundingDifference: number;
  totalAgencyProfit: number;
  pricePerPerson: number;
  grandTotalRevenue: number;
}

export function calculatePackageFinancialSummary(
  blocks: EditorBlock[],
  slots: number,
  profitMargin: number,
  testPeople: string = "",
  customProfitAmount?: number | null,
  customPackagePrice?: number | null
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
  const calculatedProfitPerPerson = marginPercent > 0 ? costPerPerson * (marginPercent / 100) : 0;

  // Lógica de Lucro Cheio e Arredondamento
  const customProfit = customProfitAmount !== undefined && customProfitAmount !== null ? Number(customProfitAmount) : null;
  const customPrice = customPackagePrice !== undefined && customPackagePrice !== null ? Number(customPackagePrice) : null;

  let effectiveProfitPerPerson = calculatedProfitPerPerson;
  let pricePerPerson = costPerPerson + calculatedProfitPerPerson;
  let roundingDifference = 0;

  if (customProfit !== null && !isNaN(customProfit) && customProfit > 0) {
    effectiveProfitPerPerson = customProfit;
    pricePerPerson = costPerPerson + customProfit;
    roundingDifference = customProfit - calculatedProfitPerPerson;
  } else if (customPrice !== null && !isNaN(customPrice) && customPrice > 0) {
    pricePerPerson = customPrice;
    effectiveProfitPerPerson = Math.max(0, customPrice - costPerPerson);
    roundingDifference = effectiveProfitPerPerson - calculatedProfitPerPerson;
  }

  const totalAgencyProfit = effectiveProfitPerPerson * activePeople;
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
    agencyProfitPerPerson: calculatedProfitPerPerson,
    customProfitAmount: customProfit,
    customPackagePrice: customPrice,
    effectiveProfitPerPerson,
    roundingDifference,
    totalAgencyProfit,
    pricePerPerson,
    grandTotalRevenue,
  };
}
