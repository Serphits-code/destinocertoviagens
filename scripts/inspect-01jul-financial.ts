import { db } from "../src/lib/db";

async function inspect01JulFinancial() {
  const startOfDay = new Date("2026-07-01T00:00:00.000Z");
  const endOfDay = new Date("2026-07-01T23:59:59.999Z");

  console.log("=== 1. TÍTULOS LIQUIDADOS (RECEBIMENTOS) EM 01/07/2026 ===");
  const receivables = await db.financialEntry.findMany({
    where: {
      paidAt: { gte: startOfDay, lte: endOfDay },
      kind: "RECEBIMENTO",
    },
    include: {
      customer: true,
      sale: true,
    },
    orderBy: { amount: "desc" },
  });

  console.log(`Total de recebimentos: ${receivables.length}\n`);
  for (const r of receivables) {
    const val = Number(r.amount);
    const doc = r.document || "";
    const meth = r.paymentMethod || "";
    const issueDateStr = r.issueDate ? r.issueDate.toISOString().slice(0, 10) : "";
    const isVendaDoDia = issueDateStr === "2026-07-01";

    console.log(`- R$ ${val.toFixed(2).padStart(9)} | Doc: ${doc.padEnd(16)} | Metodo: ${meth.padEnd(14)} | Emissao: ${issueDateStr} | Tipo: ${isVendaDoDia ? 'VENDA' : 'RECEBIMENTO'} | Cliente: ${r.customer?.name} | Desc: ${r.description}`);
  }

  console.log("\n=== 2. TÍTULOS PAGOS (SAÍDAS / PAGAMENTOS) EM 01/07/2026 ===");
  const payables = await db.financialEntry.findMany({
    where: {
      paidAt: { gte: startOfDay, lte: endOfDay },
      kind: "PAGAMENTO",
    },
    include: {
      supplier: true,
    },
    orderBy: { amount: "desc" },
  });

  console.log(`Total de saídas/pagamentos: ${payables.length}\n`);
  for (const p of payables) {
    const val = Number(p.amount);
    const doc = p.document || "";
    const meth = p.paymentMethod || "";
    console.log(`- R$ ${val.toFixed(2).padStart(9)} | Doc: ${doc.padEnd(16)} | Metodo: ${meth.padEnd(14)} | Fornecedor: ${p.supplier?.name} | Desc: ${p.description}`);
  }

  await db.$disconnect();
}

inspect01JulFinancial().catch(console.error);
