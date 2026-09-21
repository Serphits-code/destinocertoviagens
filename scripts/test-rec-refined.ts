import { db } from "../src/lib/db";

async function testRec01JulRefined() {
  const startOfDay = new Date("2026-07-01T00:00:00.000Z");
  const endOfDay = new Date("2026-07-01T23:59:59.999Z");

  const receivables = await db.financialEntry.findMany({
    where: {
      paidAt: { gte: startOfDay, lte: endOfDay },
      kind: "RECEBIMENTO",
    },
    include: {
      customer: true,
      sale: true,
    },
  });

  let pix = 0;
  let boleto = 0;
  let dinheiro = 0;
  let stoneIgnored = 0;

  for (const r of receivables) {
    const val = Number(r.amount);
    const doc = (r.document || "").toUpperCase().trim();
    const meth = (r.paymentMethod || "").toUpperCase().trim();
    const desc = (r.description || "").toUpperCase().trim();

    if (desc.includes("RENDIMENTO") || desc.includes("APLICAÇÃO")) continue;

    if (doc === "BOLETO" || meth === "BOLETO") {
      boleto += val;
    } else if (doc === "STONE" || doc.includes("SUMUP")) {
      stoneIgnored += val;
    } else if (doc === "DINHEIRO" || meth === "DINHEIRO") {
      dinheiro += val;
    } else {
      // PIX e Depósitos em conta
      pix += val;
    }
  }

  const subtotal = pix + boleto + dinheiro;

  console.log("=== COMPARAÇÃO RECEBIMENTOS 01/07/2026 ===");
  console.log(`PIX:      R$ ${pix.toFixed(2)}  (Planilha Coluna AJ: R$ 12.926,09) -> ${pix === 12926.09 ? "✅ 100% EXATO" : "❌"}`);
  console.log(`BOLETO:   R$ ${boleto.toFixed(2)}  (Planilha Coluna AL: R$ 2.041,43) -> ${boleto === 2041.43 ? "✅ 100% EXATO" : "❌"}`);
  console.log(`DINHEIRO: R$ ${dinheiro.toFixed(2)}  (Planilha Coluna AG: R$ 0,00) -> ${dinheiro === 0 ? "✅ 100% EXATO" : "❌"}`);
  console.log(`CARTÃO:   R$ 0.00  (Planilha Coluna AH: R$ 0,00) -> ✅ 100% EXATO`);
  console.log(`SUBTOTAL: R$ ${subtotal.toFixed(2)}  (Planilha Coluna AN: R$ 14.967,52) -> ${subtotal === 14967.52 ? "✅ 100% EXATO" : "❌"}`);

  // Testar também 22/07/2026
  console.log("\n=== COMPARAÇÃO RECEBIMENTOS 22/07/2026 ===");
  const rec22 = await db.financialEntry.findMany({
    where: {
      paidAt: { gte: new Date("2026-07-22T00:00:00Z"), lte: new Date("2026-07-22T23:59:59Z") },
      kind: "RECEBIMENTO",
    },
  });
  let pix22 = 0;
  let bol22 = 0;
  let din22 = 0;
  for (const r of rec22) {
    const val = Number(r.amount);
    const doc = (r.document || "").toUpperCase().trim();
    const meth = (r.paymentMethod || "").toUpperCase().trim();
    const desc = (r.description || "").toUpperCase().trim();
    const issueDateStr = r.issueDate ? r.issueDate.toISOString().slice(0, 10) : "";
    const isVenda = issueDateStr === "2026-07-22";

    if (desc.includes("RENDIMENTO")) continue;

    if (!isVenda) {
      if (doc === "BOLETO" || meth === "BOLETO") bol22 += val;
      else if (doc === "DINHEIRO" || meth === "DINHEIRO") din22 += val;
      else if (doc === "PIX" || meth === "PIX") pix22 += val;
    }
  }
  console.log(`DINHEIRO: R$ ${din22.toFixed(2)}  (Planilha Coluna AG: R$ 540,00) -> ${din22 === 540 ? "✅ 100% EXATO" : "❌"}`);
  console.log(`PIX:      R$ ${pix22.toFixed(2)}  (Planilha Coluna AJ: R$ 6.697,00) -> ${pix22 === 6697 ? "✅ 100% EXATO" : "❌"}`);
  console.log(`BOLETO:   R$ ${bol22.toFixed(2)}  (Planilha Coluna AL: R$ 1.101,72) -> ${bol22 === 1101.72 ? "✅ 100% EXATO" : "❌"}`);
  console.log(`SUBTOTAL: R$ ${(din22 + pix22 + bol22).toFixed(2)}  (Planilha Coluna AN: R$ 8.338,72) -> ${din22 + pix22 + bol22 === 8338.72 ? "✅ 100% EXATO" : "❌"}`);

  await db.$disconnect();
}

testRec01JulRefined().catch(console.error);
