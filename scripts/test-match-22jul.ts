import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function testMatch22Jul() {
  console.log("===============================================================================");
  console.log("  TESTE DE CONCILIAÇÃO: BANCO DE DADOS vs PLANILHA CAIXA 2026 (22/07/2026)");
  console.log("===============================================================================\n");

  const startOfDay = new Date("2026-07-22T00:00:00.000Z");
  const endOfDay = new Date("2026-07-22T23:59:59.999Z");

  // 1. Títulos Liquidados em 22/07/2026
  const entries = await prisma.financialEntry.findMany({
    where: {
      paidAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      kind: "RECEBIMENTO",
    },
    include: {
      customer: { select: { name: true } },
      sale: { select: { saleNumber: true } },
    },
    orderBy: { paidAt: "asc" },
  });

  console.log(`Total de títulos liquidados em 22/07/2026: ${entries.length}\n`);

  let vendasDinheiro = 0;
  let recebimentosDinheiro = 0;
  let vendasPix = 0;
  let recebimentosPix = 0;
  let vendasCartao = 0;
  let recebimentosCartao = 0;
  let vendasBoleto = 0;
  let recebimentosBoleto = 0;
  let vendasOutros = 0;
  let recebimentosOutros = 0;

  for (const e of entries) {
    const val = Number(e.amount);
    const doc = (e.document || "").toUpperCase().trim();
    const method = (e.paymentMethod || "").toUpperCase().trim();
    const issueDateStr = e.issueDate ? e.issueDate.toISOString().slice(0, 10) : "";
    const isVendaDoDia = issueDateStr === "2026-07-22";
    const tipo = isVendaDoDia ? "🛒 VENDA DO DIA" : "📥 RECEBIMENTO";

    console.log(`- R$ ${val.toFixed(2).padStart(8)} | Doc: ${doc.padEnd(18)} | Metodo: ${method.padEnd(12)} | Emissão: ${issueDateStr} | Tipo: ${tipo} | Cliente: ${e.customer?.name}`);

    // Classificação por documento/método
    if (doc === "DINHEIRO" || method === "DINHEIRO") {
      if (isVendaDoDia) vendasDinheiro += val;
      else recebimentosDinheiro += val;
    } else if (doc === "PIX" || method === "PIX") {
      if (isVendaDoDia) vendasPix += val;
      else recebimentosPix += val;
    } else if (doc === "BOLETO" || method === "BOLETO") {
      if (isVendaDoDia) vendasBoleto += val;
      else recebimentosBoleto += val;
    } else if (doc.includes("CARTAO") || doc.includes("STONE") || doc.includes("SUMUP") || method.includes("CARD")) {
      if (isVendaDoDia) vendasCartao += val;
      else recebimentosCartao += val;
    } else {
      if (isVendaDoDia) vendasOutros += val;
      else recebimentosOutros += val;
    }
  }

  console.log("\n===============================================================================");
  console.log("  COMPARAÇÃO DIRETA COM A PLANILHA CAIXA (JUL) - LINHA 24 (22/07/2026)");
  console.log("===============================================================================");
  console.log(`1. VENDAS DO DIA (DINHEIRO):`);
  console.log(`   - Calculado no Sistema: R$ ${vendasDinheiro.toFixed(2)}`);
  console.log(`   - Valor na Planilha:    R$ 460.00 (Coluna 18 - Vendas Dinheiro)`);
  console.log(`   - Bateu? ${vendasDinheiro === 460 ? "✅ SIM! 100% EXATO" : "❌ DIFERENÇA"}`);

  console.log(`\n2. RECEBIMENTOS PASSADOS (DINHEIRO):`);
  console.log(`   - Calculado no Sistema: R$ ${recebimentosDinheiro.toFixed(2)}`);
  console.log(`   - Valor na Planilha:    R$ 540.00 (Coluna 33 - Recebimentos Dinheiro)`);
  console.log(`   - Bateu? ${recebimentosDinheiro === 540 ? "✅ SIM! 100% EXATO" : "❌ DIFERENÇA"}`);

  console.log(`\n3. SOMA TOTAL EM DINHEIRO QUE ENTROU NO CAIXA:`);
  console.log(`   - Calculado no Sistema: R$ ${(vendasDinheiro + recebimentosDinheiro).toFixed(2)}`);
  console.log(`   - Soma Planilha:        R$ 1000.00 (460 + 540)`);
  console.log(`   - Bateu? ${vendasDinheiro + recebimentosDinheiro === 1000 ? "✅ SIM! 100% EXATO" : "❌ DIFERENÇA"}`);

  console.log(`\n4. VENDAS DO DIA (PIX):`);
  console.log(`   - Calculado no Sistema: R$ ${vendasPix.toFixed(2)}`);
  console.log(`   - Valor na Planilha:    R$ 1350.00 (Coluna 22 - Vendas PIX)`);
  console.log(`   - Bateu? ${vendasPix === 1350 ? "✅ SIM! 100% EXATO" : "❌ DIFERENÇA"}`);

  console.log(`\n5. RECEBIMENTOS PASSADOS (PIX):`);
  console.log(`   - Calculado no Sistema: R$ ${recebimentosPix.toFixed(2)}`);
  console.log(`   - Valor na Planilha:    R$ 6697.00 (Coluna 36 - Recebimentos PIX)`);
  console.log(`   - Bateu? ${recebimentosPix === 6697 ? "✅ SIM! 100% EXATO" : "❌ DIFERENÇA"}`);

  console.log(`\n6. TOTAL GERAL DE PIX NO DIA:`);
  console.log(`   - Calculado no Sistema: R$ ${(vendasPix + recebimentosPix).toFixed(2)}`);
  console.log(`   - Soma Planilha:        R$ 8047.00 (1350 + 6697)`);
  console.log(`   - Bateu? ${vendasPix + recebimentosPix === 8047 ? "✅ SIM! 100% EXATO" : "❌ DIFERENÇA"}`);

  console.log(`\n7. RECEBIMENTOS (BOLETO):`);
  console.log(`   - Calculado no Sistema: R$ ${recebimentosBoleto.toFixed(2)}`);
  console.log(`   - Valor na Planilha:    R$ 1101.72 (Coluna 38 - Recebimentos Boleto)`);
  console.log(`   - Bateu? ${Math.abs(recebimentosBoleto - 1101.72) < 0.01 ? "✅ SIM! 100% EXATO" : "❌ DIFERENÇA"}`);

  // 2. VENDAS EMITIDAS NO DIA 22/07/2026
  const sales = await prisma.sale.findMany({
    where: {
      saleDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      items: true,
      financialEntries: true,
    },
  });

  console.log("\n===============================================================================");
  console.log("  OPERAÇÕES E VENDAS EMITIDAS NO DIA 22/07/2026");
  console.log("===============================================================================");
  console.log(`Total de vendas emitidas: ${sales.length}`);
  let totalVendasEmitidas = 0;
  for (const s of sales) {
    const val = Number(s.finalAmount);
    totalVendasEmitidas += val;
    console.log(`- Venda #${s.saleNumber || s.id}: R$ ${val.toFixed(2)} | Itens: ${s.items.map(i => `${i.productType}: R$ ${Number(i.totalAmount).toFixed(2)}`).join(", ")}`);
  }
  console.log(`\nTotal de Vendas Emitidas: R$ ${totalVendasEmitidas.toFixed(2)}`);
  console.log(`Planilha Coluna 11/15/26: R$ 8.402,96`);
  console.log(`Bateu Vendas Totais? ${Math.abs(totalVendasEmitidas - 8402.96) < 0.01 ? "✅ SIM! 100% EXATO" : "Diferença: " + (totalVendasEmitidas - 8402.96)}`);

  await prisma.$disconnect();
}

testMatch22Jul().catch(console.error);
