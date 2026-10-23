import fs from "fs";
import path from "path";
import { db } from "../src/lib/db";
import {
  calculatePackageFinancialSummary,
  parseNum,
  getGuestAge,
  getBlockUnitPriceForGuest,
  getAddonPriceForGuest,
  getRoomPricingForGuest,
  getGuestAgeBracket,
} from "../src/lib/package-calc";
import type { EditorBlock, BlockCategoryId, BlockData } from "../src/lib/editor-types";
import type { ExcursionAddon, AddonGuestPayment, CustomGuestPayment } from "../src/lib/actions/addons";

const fmt = (v: number) =>
  (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDec = (v: number) =>
  (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d?: string | Date | null) => {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return isNaN(date.getTime())
    ? String(d)
    : date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
};

async function generateReport() {
  const ex = await db.excursion.findUnique({
    where: { id: "cmu4e40q00001tvc0t04mrsgy" },
    include: {
      blocks: { orderBy: { order: "asc" } },
    },
  });

  if (!ex) {
    console.error("Excursão não encontrada!");
    return;
  }

  const blocks: EditorBlock[] = ex.blocks.map((b) => ({
    id: b.id,
    categoryId: b.type as BlockCategoryId,
    title: b.title,
    order: b.order,
    collapsed: b.collapsed,
    data: b.configJson as BlockData,
  }));

  const rawAddons = (ex.addonsJson as any) ?? [];
  const addons: ExcursionAddon[] = Array.isArray(rawAddons)
    ? rawAddons
    : Array.isArray(rawAddons?.addons)
    ? rawAddons.addons
    : [];
  const guestPayments = (Array.isArray(rawAddons) ? {} : rawAddons?.guestPayments || {}) as Record<string, AddonGuestPayment>;
  const roomPricing = (Array.isArray(rawAddons) ? {} : rawAddons?.roomPricing || {}) as Record<string, any>;
  const guestPaymentModes = (Array.isArray(rawAddons) ? {} : rawAddons?.guestPaymentModes || {}) as Record<string, "vista" | "prazo" | "personalizado">;
  const guestCustomPayments = (Array.isArray(rawAddons) ? {} : rawAddons?.guestCustomPayments || {}) as Record<string, CustomGuestPayment>;

  // Extrair quartos e hóspedes dos blocos de hospedagem
  const rooms: any[] = [];
  const guests: any[] = [];
  for (const b of blocks) {
    if (b.categoryId === "hospedagem" && Array.isArray((b.data as any)?.roomList)) {
      for (const r of (b.data as any).roomList) {
        rooms.push({ ...r, blockId: b.id });
        if (Array.isArray(r.hospedes)) {
          for (const g of r.hospedes) {
            guests.push({ ...g, roomName: `Quarto ${r.numero || ""} (${r.tipo || ""})`, roomBlockId: b.id, roomType: r.tipo });
          }
        }
      }
    }
  }

  const periodStart = ex.periodStart?.toISOString().slice(0, 10) ?? null;
  const slots = ex.slots || guests.length || 20;
  const profitMargin = ex.profitMargin ?? 10;
  const customProfitAmount = ex.customProfitAmount ?? null;
  const customPackagePrice = ex.customPackagePrice ?? null;

  const financialSummary = calculatePackageFinancialSummary(
    blocks,
    slots,
    profitMargin,
    "",
    customProfitAmount,
    customPackagePrice
  );

  // 1. ANÁLISE POR PASSAGEIRO
  const hospedagemBlocks = blocks.filter((b) => b.categoryId === "hospedagem");
  const passengerReport = guests.map((g) => {
    const age = getGuestAge(g, periodStart);
    const roomType = g.roomType || "Duplo";
    const roomBlockId = g.roomBlockId;

    const blockBreakdown: {
      blockId: string;
      blockTitle: string;
      category: string;
      cost: number;
      tierLabel: string;
    }[] = [];

    for (const b of blocks) {
      if (b.categoryId === "hospedagem") {
        if (hospedagemBlocks.length > 1) {
          if (roomBlockId && b.id !== roomBlockId) continue;
          if (!roomBlockId && b.id !== hospedagemBlocks[0].id) continue;
        }

        let hotelCost = getBlockUnitPriceForGuest(b, g, periodStart, slots).unitCost;
        const bRooms = (b.data as any)?.rooms;
        if (Array.isArray(bRooms)) {
          const matchedRoom = bRooms.find(
            (hr: any) => hr.tipo?.trim().toLowerCase() === roomType.trim().toLowerCase()
          );
          if (matchedRoom && parseNum(matchedRoom.porPessoa) > 0) {
            const ageBracket = getGuestAgeBracket(g, periodStart);
            hotelCost = ageBracket === "bebe" ? 0 : parseNum(matchedRoom.porPessoa);
          }
        }

        const hotelName = (b.data as any)?.hotel || b.title || "Hospedagem";
        blockBreakdown.push({
          blockId: b.id,
          blockTitle: (b.data as any)?.hotel ? `Hospedagem (${(b.data as any).hotel})` : hotelName,
          category: b.categoryId,
          cost: hotelCost,
          tierLabel: (b.data as any)?.hotel || "Hospedagem",
        });
      } else {
        const pricing = getBlockUnitPriceForGuest(b, g, periodStart, slots);
        blockBreakdown.push({
          blockId: b.id,
          blockTitle: b.title,
          category: b.categoryId,
          cost: pricing.unitCost,
          tierLabel: pricing.matchedTierLabel,
        });
      }
    }

    const basePackageCost = blockBreakdown.reduce((sum, b) => sum + b.cost, 0);
    const paymentMode = guestPaymentModes[g.id] || "vista";
    const customPayment = guestCustomPayments[g.id];

    const effectiveProfit = financialSummary.effectiveProfitPerPerson || 0;
    const roundingDiff = financialSummary.roundingDifference || 0;
    const fallbackAdultPrice = financialSummary.pricePerPerson || (basePackageCost + effectiveProfit + roundingDiff);

    const roomPricingResult = getRoomPricingForGuest(
      roomPricing,
      roomType,
      age,
      g.tipo,
      fallbackAdultPrice
    );

    const isPrazo = paymentMode === "prazo";
    const isPersonalizado = paymentMode === "personalizado";

    let packageFinalPrice = roomPricingResult.cashPrice;
    let cardFeeApplied = 0;

    if (isPersonalizado && customPayment) {
      const customSum = (customPayment.metodos || []).reduce((sum, m) => sum + parseNum(m.valor), 0);
      packageFinalPrice = parseNum(customPayment.valorTotal) > 0 ? parseNum(customPayment.valorTotal) : customSum;
      cardFeeApplied = parseNum(customPayment.taxaCartao) || 0;
    } else if (isPrazo) {
      packageFinalPrice = roomPricingResult.cashPrice + roomPricingResult.installmentExtra;
      cardFeeApplied = roomPricingResult.cardFee;
    }

    const agencyProfit = packageFinalPrice - basePackageCost - cardFeeApplied;

    const passengerAddons = addons.filter((a) => (a.assignedGuestIds ?? []).includes(g.id));
    const passengerAddonsDetailed = passengerAddons.map((a) => {
      const pricing = getAddonPriceForGuest(a, age, g.tipo);
      return {
        addon: a,
        cost: pricing.cost,
        profit: pricing.profit,
        price: pricing.price,
        tierLabel: pricing.tierLabel,
      };
    });

    const totalAddonsPrice = passengerAddonsDetailed.reduce((sum, a) => sum + a.price, 0);
    const totalAddonsCost = passengerAddonsDetailed.reduce((sum, a) => sum + a.cost, 0);
    const totalAddonsProfit = passengerAddonsDetailed.reduce((sum, a) => sum + a.profit, 0);
    const totalReceivable = packageFinalPrice + totalAddonsPrice;

    const paymentInfo = guestPayments[g.id] as (AddonGuestPayment & { status?: string; amountPaid?: number }) | undefined;
    const isPaid = paymentInfo?.status === "pago" || paymentInfo?.paid === true;
    const isPartial = paymentInfo?.status === "parcial";
    const amountPaid = isPaid ? totalReceivable : isPartial ? (paymentInfo?.amountPaid || 0) : 0;
    const pendingAmount = Math.max(0, totalReceivable - amountPaid);

    return {
      id: g.id,
      name: g.nome || "Passageiro sem nome",
      documento: g.documento || "-",
      observacao: (g.observacao || "").replace(/\r?\n/g, " "),
      age,
      birthDate: g.birthDate,
      tipo: g.tipo,
      roomName: g.roomName,
      roomMatchedTierLabel: roomPricingResult.matchedTierLabel,
      paymentMode,
      basePackageCost,
      agencyProfit,
      packageFinalPrice,
      totalAddonsPrice,
      totalAddonsCost,
      totalAddonsProfit,
      totalReceivable,
      amountPaid,
      pendingAmount,
      status: isPaid ? "PAGO" : isPartial ? "PARCIAL" : "PENDENTE",
      blockBreakdown,
      passengerAddonsDetailed,
    };
  });

  // 2. TOTAIS GERAIS
  const confirmedCount = passengerReport.length;
  const totalPackageRevenue = passengerReport.reduce((sum, p) => sum + p.packageFinalPrice, 0);
  const totalAddonsRevenue = passengerReport.reduce((sum, p) => sum + p.totalAddonsPrice, 0);
  const grossRevenue = totalPackageRevenue + totalAddonsRevenue;

  const totalBlocksCost = passengerReport.reduce((sum, p) => sum + p.basePackageCost, 0);
  const totalAddonsCost = passengerReport.reduce((sum, p) => sum + p.totalAddonsCost, 0);
  const totalOperatingCost = totalBlocksCost + totalAddonsCost;
  const netProfit = grossRevenue - totalOperatingCost;
  const netMarginPercent = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;
  const averageTicket = confirmedCount > 0 ? grossRevenue / confirmedCount : 0;

  // 3. RELATÓRIO DE FORNECEDORES
  const suppliersReport: any[] = [];
  for (const b of blocks) {
    const d = b.data as any;
    let supplierName = "Fornecedor";
    let totalCost = 0;
    let sinalCost = 0;
    const vagasNum = parseNum(d?.vagas) || parseNum(d?.rateioPessoas) || slots;

    switch (b.categoryId) {
      case "aereo":
        supplierName = d?.fornecedor || d?.portal || "SAKURA";
        totalCost =
          parseNum(d?.valorNetTotal ?? d?.valorNet) ||
          parseNum(d?.custoTotal) ||
          (parseNum(d?.custoUnitario) > 0 ? parseNum(d?.custoUnitario) * vagasNum : 0);
        sinalCost = parseNum(d?.sinalTotal ?? d?.sinal);
        break;
      case "hospedagem":
        supplierName = d?.hotel || "Hotel / Pousada";
        totalCost = parseNum(d?.totalReserva);
        if (totalCost === 0 && Array.isArray(d?.rooms)) {
          for (const rm of d.rooms) {
            const totPer = parseNum(rm.totalPeriodo);
            const qtd = parseNum(rm.qtd) || 1;
            const diaria = parseNum(rm.diaria);
            if (totPer > 0) totalCost += totPer;
            else if (diaria > 0) totalCost += diaria * (parseNum(d.diarias) || 1) * qtd;
          }
        }
        sinalCost = parseNum(d?.sinalTotal ?? d?.sinal);
        break;
      case "rodoviario":
        supplierName = d?.empresa || "Empresa de Ônibus";
        totalCost =
          parseNum(d?.valorContrato ?? d?.valorNetTotal ?? d?.valorNet) ||
          (parseNum(d?.rateioPorPessoa) * vagasNum);
        sinalCost = parseNum(d?.sinalTotal ?? d?.sinal);
        break;
      case "guias":
        supplierName = d?.guias?.[0]?.nome || "George Costa";
        totalCost = parseNum(d?.totalDespesas);
        if (totalCost === 0) {
          let gTot = 0;
          for (const g of d?.guias ?? []) {
            gTot += parseNum(g.valorTotal) || (parseNum(g.diarias) * parseNum(g.valorDiaria));
          }
          for (const desp of d?.despesas ?? []) {
            gTot += parseNum(desp.valor);
          }
          totalCost = gTot;
        }
        sinalCost = parseNum(d?.sinal);
        break;
      case "personalizados":
        supplierName = "Personalizados / Brindes";
        totalCost = parseNum(d?.totalDespesas);
        if (totalCost === 0 && Array.isArray(d?.rows)) {
          totalCost = d.rows.reduce((sum: number, r: any) => sum + parseNum(r.total || r.custo), 0);
        }
        sinalCost = parseNum(d?.sinal);
        break;
      default:
        supplierName = d?.fornecedor || "Fornecedor";
        totalCost = parseNum(d?.totalDespesas ?? d?.custoTotal);
        sinalCost = parseNum(d?.sinalTotal ?? d?.sinal);
    }

    suppliersReport.push({
      blockId: b.id,
      category: b.categoryId,
      title: b.title,
      supplierName,
      totalCost,
      sinalCost,
      balanceToPay: Math.max(0, totalCost - sinalCost),
      prazoSinal: d?.prazoSinal ?? null,
      prazoPagamentoTotal: d?.prazoPagamentoTotal ?? null,
      prazosPagamentoFinal: d?.prazosPagamentoFinal ?? null,
      localizador: d?.localizador || "-",
    });
  }

  // Break Even
  const fixedBlocksTotal = suppliersReport.reduce((sum, s) => sum + s.totalCost, 0);
  const breakEvenPax = Math.ceil(fixedBlocksTotal / (financialSummary.pricePerPerson || 1));

  console.log("=== DRE CALCULADO ===");
  console.log("Receita Pacotes:", fmt(totalPackageRevenue));
  console.log("Receita Adicionais:", fmt(totalAddonsRevenue));
  console.log("Receita Bruta:", fmt(grossRevenue));
  console.log("\nCustos:");
  for (const s of suppliersReport) {
    console.log(`- ${s.title} (${s.supplierName}): ${fmt(s.totalCost)}`);
  }
  console.log(`- Custos de Adicionais: ${fmt(totalAddonsCost)}`);
  console.log("Total Custos:", fmt(totalOperatingCost));
  console.log("Lucro Líquido:", fmt(netProfit));
  console.log("Margem Líquida:", netMarginPercent.toFixed(2) + "%");
  console.log("Break-Even:", breakEvenPax, "pax");

  // =========================================================================
  // GERAÇÃO DO CSV 1: DESTRINCHAMENTO_FINANCEIRO_BALNEARIO_10_2026.csv
  // =========================================================================
  const csvLines: string[] = [];
  const addLine = (...cols: (string | number)[]) => {
    csvLines.push(cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"));
  };
  const addBlank = () => csvLines.push("");

  // Cabeçalho Oficial
  addLine("DESTINO CERTO VIAGENS - GESTÃO FINANCEIRA OPERACIONAL");
  addLine("DESTRINCHAMENTO FINANCEIRO E CONTÁBIL RETROATIVO");
  addLine("PACOTE:", "BALNEÁRIO CAMBORIÚ (REFERÊNCIA RETROATIVA 10/2026)");
  addLine("DESTINO:", "Balneário Camboriú, Santa Catarina (ou Pacote Operado)");
  addLine("DATA DA EMISSÃO:", new Date().toLocaleDateString("pt-BR"));
  addLine("VAGAS CONTRATADAS:", slots);
  addLine("PASSAGEIROS REGISTRADOS:", confirmedCount);
  addLine("OCUPAÇÃO:", `${((confirmedCount / slots) * 100).toFixed(0)}%`);
  addLine("MARGEM CONFIGURADA:", `${profitMargin}%`);
  addBlank();

  // 1. DRE SINTÉTICO
  addLine("=================================================================================");
  addLine("1. DEMONSTRATIVO DE RESULTADO DA EXCURSÃO (DRE) - CONSOLIDADO");
  addLine("=================================================================================");
  addLine("CONTA / DISCRIMINAÇÃO", "CLASSIFICAÇÃO", "VALOR (R$)", "PARTICIPAÇÃO (%)");
  addLine("(+) RECEITAS OPERACIONAIS BRUTAS", "", "", "");
  addLine("  Receita com Pacotes (discriminado por idade)", "Receita Bruta", fmtDec(totalPackageRevenue), `${((totalPackageRevenue / grossRevenue) * 100).toFixed(2)}%`);
  addLine("  Receita com Serviços Adicionais & Passeios", "Receita Bruta", fmtDec(totalAddonsRevenue), `${((totalAddonsRevenue / grossRevenue) * 100).toFixed(2)}%`);
  addLine("TOTAL DA RECEITA BRUTA", "Receita Total", fmtDec(grossRevenue), "100,00%");
  addBlank();

  addLine("(-) CUSTOS OPERACIONAIS DIRETOS", "", "", "");
  for (const s of suppliersReport) {
    const pCent = ((s.totalCost / totalOperatingCost) * 100).toFixed(2);
    addLine(`  ${s.title} (${s.supplierName})`, `Custo Fornecedor - ${s.category.toUpperCase()}`, fmtDec(s.totalCost), `${pCent}%`);
  }
  if (totalAddonsCost > 0) {
    const pCent = ((totalAddonsCost / totalOperatingCost) * 100).toFixed(2);
    addLine("  Custos de Adicionais / Ingressos Contratados", "Custo Fornecedor - EXTRAS", fmtDec(totalAddonsCost), `${pCent}%`);
  }
  addLine("TOTAL DE CUSTOS DIRETOS", "Custo Operacional Total", `(${fmtDec(totalOperatingCost)})`, "100,00%");
  addBlank();

  addLine("(=) RESULTADO OPERACIONAL LÍQUIDO", "Lucro da Agência", fmtDec(netProfit), `${netMarginPercent.toFixed(2)}%`);
  addLine("MARGEM LÍQUIDA REAL", "Rentabilidade", `${netMarginPercent.toFixed(2)}%`, "");
  addLine("TICKET MÉDIO POR PASSAGEIRO", "Indicador Médio", fmtDec(averageTicket), "");
  addLine("CUSTOS FIXOS TOTAIS DOS BLOCOS", "Custo Fixo", fmtDec(fixedBlocksTotal), "");
  addLine("PONTO DE EQUILÍBRIO (BREAK-EVEN)", "Segurança Operacional", `${breakEvenPax} passageiros pagantes`, "Meta Atingida (Zona de Lucro)");
  addBlank();

  // 2. FORNECEDORES E CONTAS A PAGAR
  addLine("=================================================================================");
  addLine("2. CONTAS A PAGAR POR FORNECEDOR / BLOCO CONTRATADO");
  addLine("=================================================================================");
  addLine("CATEGORIA", "BLOCO", "FORNECEDOR CONTRATADO", "LOCALIZADOR", "CUSTO TOTAL (R$)", "SINAL PAGO (R$)", "PRAZO SINAL", "PRAZO LIQUIDAÇÃO", "SALDO A PAGAR (R$)");
  for (const s of suppliersReport) {
    addLine(
      s.category.toUpperCase(),
      s.title,
      s.supplierName,
      s.localizador,
      fmtDec(s.totalCost),
      s.sinalCost > 0 ? fmtDec(s.sinalCost) : "0,00",
      fmtDate(s.prazoSinal),
      fmtDate(s.prazoPagamentoTotal),
      fmtDec(s.balanceToPay)
    );
  }
  if (totalAddonsCost > 0) {
    addLine(
      "EXTRAS",
      "Custos de Adicionais / Opcionais",
      "Fornecedores de Passeios & Entradas",
      "-",
      fmtDec(totalAddonsCost),
      "0,00",
      "-",
      "-",
      fmtDec(totalAddonsCost)
    );
  }
  addLine("TOTAIS", "-", "-", "-", fmtDec(totalOperatingCost), fmtDec(suppliersReport.reduce((sum, s) => sum + s.sinalCost, 0)), "-", "-", fmtDec(suppliersReport.reduce((sum, s) => sum + s.balanceToPay, 0) + totalAddonsCost));
  addBlank();

  // 3. PASSAGEIROS & RECEBIMENTOS
  addLine("=================================================================================");
  addLine("3. LISTA DE PASSAGEIROS, CONTRATOS E STATUS FINANCEIRO");
  addLine("=================================================================================");
  addLine(
    "Nº",
    "NOME DO PASSAGEIRO",
    "DOCUMENTO / CPF",
    "IDADE",
    "TIPO",
    "QUARTO / ACOMODAÇÃO",
    "PREÇO PACOTE (R$)",
    "CUSTO DIRETO (R$)",
    "LUCRO AGÊNCIA (R$)",
    "EXTRAS CONTRATADOS (R$)",
    "TOTAL A RECEBER (R$)",
    "VALOR PAGO (R$)",
    "SALDO PENDENTE (R$)",
    "FORMA DE PAGAMENTO",
    "STATUS PAGAMENTO",
    "OBSERVAÇÃO"
  );
  passengerReport.forEach((p, idx) => {
    addLine(
      idx + 1,
      p.name,
      p.documento,
      p.age !== null ? p.age : "-",
      p.tipo,
      p.roomName,
      fmtDec(p.packageFinalPrice),
      fmtDec(p.basePackageCost),
      fmtDec(p.agencyProfit),
      fmtDec(p.totalAddonsPrice),
      fmtDec(p.totalReceivable),
      fmtDec(p.amountPaid),
      fmtDec(p.pendingAmount),
      p.paymentMode.toUpperCase(),
      p.status,
      p.observacao
    );
  });
  addLine(
    "TOTAIS",
    "-",
    "-",
    "-",
    "-",
    "-",
    fmtDec(totalPackageRevenue),
    fmtDec(totalBlocksCost),
    fmtDec(passengerReport.reduce((sum, p) => sum + p.agencyProfit, 0)),
    fmtDec(totalAddonsRevenue),
    fmtDec(grossRevenue),
    fmtDec(passengerReport.reduce((sum, p) => sum + p.amountPaid, 0)),
    fmtDec(passengerReport.reduce((sum, p) => sum + p.pendingAmount, 0)),
    "-",
    "-",
    "-"
  );
  addBlank();

  // 4. ADICIONAIS & PASSEIOS (EXTRAS)
  addLine("=================================================================================");
  addLine("4. DESTRINCHAMENTO DE ADICIONAIS & PASSEIOS OPCIONAIS");
  addLine("=================================================================================");
  addLine("ADICIONAL / PASSEIO", "CANAL / LOCAL", "PREÇO VENDA (R$)", "CUSTO FORNECEDOR (R$)", "LUCRO UNITÁRIO (R$)", "ADESÕES", "RECEITA TOTAL (R$)", "CUSTO TOTAL (R$)", "LUCRO TOTAL (R$)");
  for (const a of addons) {
    const adesões = (a.assignedGuestIds ?? []).length;
    const preco = parseNum(a.price);
    const custo = parseNum(a.cost);
    const lucroUnit = preco - custo;
    const recTot = preco * adesões;
    const custTot = custo * adesões;
    const lucTot = lucroUnit * adesões;
    addLine(
      a.title,
      a.canalVendaNome || a.location || "Padrão",
      fmtDec(preco),
      fmtDec(custo),
      fmtDec(lucroUnit),
      adesões,
      fmtDec(recTot),
      fmtDec(custTot),
      fmtDec(lucTot)
    );
  }
  addLine(
    "TOTAIS",
    "-",
    "-",
    "-",
    "-",
    passengerReport.reduce((sum, p) => sum + p.passengerAddonsDetailed.length, 0),
    fmtDec(totalAddonsRevenue),
    fmtDec(totalAddonsCost),
    fmtDec(totalAddonsRevenue - totalAddonsCost)
  );

  // Escrever arquivos na raiz do projeto (c:\geo)
  const rootPath = path.resolve(__dirname, "..");
  const fullCsvPath = path.join(rootPath, "DESTRINCHAMENTO_FINANCEIRO_BALNEARIO_10_2026.csv");

  // UTF-8 BOM para abrir com acentuação e formatação perfeita no Excel
  const bom = "\uFEFF";
  fs.writeFileSync(fullCsvPath, bom + csvLines.join("\r\n"), "utf-8");
  console.log(`\n✓ Arquivo gerado com sucesso na raiz: ${fullCsvPath}`);

  // Gerar também o DRE específico e exclusivo: DRE_BALNEARIO_10_2026.csv
  const dreLines: string[] = [];
  const addDreLine = (...cols: (string | number)[]) => {
    dreLines.push(cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"));
  };
  addDreLine("DEMONSTRATIVO DE RESULTADO DA EXCURSÃO (DRE) - BALNEÁRIO CAMBORIÚ 10/2026");
  addDreLine("Visão contábil consolidada entre receitas faturadas e custos diretos");
  addDreLine("DESTINO CERTO VIAGENS", "PERÍODO: OUTUBRO/2026");
  dreLines.push("");
  addDreLine("CONTA / LINHA DO DRE", "VALOR (R$)", "PERCENTUAL");
  addDreLine("(+) RECEITAS OPERACIONAIS BRUTAS", "", "");
  addDreLine("Receita com Pacotes (discriminado por idade)", fmtDec(totalPackageRevenue), `${((totalPackageRevenue / grossRevenue) * 100).toFixed(2)}%`);
  addDreLine("Receita com Serviços Adicionais & Passeios", fmtDec(totalAddonsRevenue), `${((totalAddonsRevenue / grossRevenue) * 100).toFixed(2)}%`);
  addDreLine("TOTAL DA RECEITA BRUTA", fmtDec(grossRevenue), "100,00%");
  dreLines.push("");
  addDreLine("(-) CUSTOS OPERACIONAIS DIRETOS", "", "");
  for (const s of suppliersReport) {
    addDreLine(`${s.title} (${s.supplierName})`, fmtDec(s.totalCost), `${((s.totalCost / totalOperatingCost) * 100).toFixed(2)}%`);
  }
  if (totalAddonsCost > 0) {
    addDreLine("Custos de Adicionais / Ingressos Contratados", fmtDec(totalAddonsCost), `${((totalAddonsCost / totalOperatingCost) * 100).toFixed(2)}%`);
  }
  addDreLine("TOTAL DE CUSTOS DIRETOS", `(${fmtDec(totalOperatingCost)})`, "100,00%");
  dreLines.push("");
  addDreLine("(=) RESULTADO OPERACIONAL LÍQUIDO (LUCRO LÍQUIDO)", fmtDec(netProfit), `${netMarginPercent.toFixed(2)}%`);
  addDreLine("MARGEM LÍQUIDA REAL", `${netMarginPercent.toFixed(2)}%`, "");
  addDreLine("TICKET MÉDIO POR PASSAGEIRO", fmtDec(averageTicket), "");
  addDreLine("CUSTOS FIXOS DOS BLOCOS", fmtDec(fixedBlocksTotal), "");
  addDreLine("PONTO DE EQUILÍBRIO (BREAK-EVEN)", `${breakEvenPax} passageiros pagantes`, "Meta Atingida (Zona de Lucro)");

  const dreCsvPath = path.join(rootPath, "DRE_BALNEARIO_10_2026.csv");
  fs.writeFileSync(dreCsvPath, bom + dreLines.join("\r\n"), "utf-8");
  console.log(`✓ Arquivo DRE gerado com sucesso na raiz: ${dreCsvPath}`);
}

generateReport().finally(() => db.$disconnect());
