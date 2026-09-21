import { db } from "../src/lib/db";

async function inspectStoneEntries() {
  const startOfDay = new Date("2026-07-01T00:00:00.000Z");
  const endOfDay = new Date("2026-07-01T23:59:59.999Z");

  const entries = await db.financialEntry.findMany({
    where: {
      paidAt: { gte: startOfDay, lte: endOfDay },
      kind: "RECEBIMENTO",
      document: { contains: "STONE" },
    },
    include: {
      customer: true,
      sale: true,
    },
  });

  console.log(`Stone entries on 01/07/2026: ${entries.length}`);
  for (const e of entries) {
    console.log(`ID: ${e.id} | MondeID: ${e.mondeId} | Valor: R$ ${Number(e.amount).toFixed(2)} | Venc: ${e.dueDate.toISOString().slice(0,10)} | Pago: ${e.paidAt?.toISOString().slice(0,10)} | Emissao: ${e.issueDate?.toISOString().slice(0,10)} | Cliente: ${e.customer?.name} | Venda #${e.sale?.saleNumber}`);
  }

  await db.$disconnect();
}

inspectStoneEntries().catch(console.error);
