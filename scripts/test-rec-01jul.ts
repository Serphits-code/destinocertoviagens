import { execSync } from 'child_process';
import { db } from "../src/lib/db";

async function testRec01JulWithAccounts() {
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

  console.log("=== RECEBIMENTOS 01/07/2026 ===");
  let pix = 0;
  let boleto = 0;
  let dinheiro = 0;
  let cartaoStone = 0;

  for (const r of receivables) {
    const val = Number(r.amount);
    const doc = (r.document || "").toUpperCase().trim();
    const meth = (r.paymentMethod || "").toUpperCase().trim();

    if (doc === "BOLETO" || meth === "BOLETO") {
      boleto += val;
      console.log(`[BOLETO] R$ ${val.toFixed(2)} - ${r.customer?.name}`);
    } else if (doc === "STONE" || doc.includes("CARTAO")) {
      cartaoStone += val;
      console.log(`[STONE/CARTAO] R$ ${val.toFixed(2)} - ${r.customer?.name}`);
    } else if (doc === "DINHEIRO" || meth === "DINHEIRO") {
      dinheiro += val;
      console.log(`[DINHEIRO] R$ ${val.toFixed(2)} - ${r.customer?.name}`);
    } else {
      // PIX ou Depósito em Conta (crédito em conta bancária)
      pix += val;
      console.log(`[PIX/CONTA] R$ ${val.toFixed(2)} - ${r.customer?.name} (Doc: ${doc})`);
    }
  }

  console.log("\n--- TOTAIS CALCULADOS ---");
  console.log(`PIX / BANCO: R$ ${pix.toFixed(2)} (Planilha Coluna AJ: R$ 12.926,09) -> ${pix === 12926.09 ? "✅ 100% EXATO!" : "Diferença: " + (pix - 12926.09)}`);
  console.log(`BOLETO:      R$ ${boleto.toFixed(2)} (Planilha Coluna AL: R$ 2.041,43) -> ${boleto === 2041.43 ? "✅ 100% EXATO!" : "Diferença: " + (boleto - 2041.43)}`);
  console.log(`SUBTOTAL (SEM STONE): R$ ${(pix + boleto).toFixed(2)} (Planilha Coluna AN: R$ 14.967,52) -> ${pix + boleto === 14967.52 ? "✅ 100% EXATO!" : "Diferença: " + (pix + boleto - 14967.52)}`);
  console.log(`STONE (CONTA OPERADORA): R$ ${cartaoStone.toFixed(2)} (Não transita no Banco do Brasil no dia)`);

  await db.$disconnect();
}

testRec01JulWithAccounts().catch(console.error);
