import { db } from "../src/lib/db";

async function testCash01Jul() {
  const dateStr = "2026-07-01";
  const [y, m, d] = dateStr.split("-").map(Number);
  const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));

  const sales = await db.sale.findMany({
    where: {
      saleDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: { not: "CANCELADA" },
    },
    include: {
      items: true,
      financialEntries: true,
      customer: { select: { name: true } },
    },
  });

  console.log(`Vendas confirmadas em 01/07/2026: ${sales.length}`);
  let total = 0;
  for (const s of sales) {
    const val = Number(s.finalAmount);
    total += val;
    console.log(`- Venda #${s.saleNumber}: R$ ${val.toFixed(2)} | Cliente: ${s.customer?.name}`);
  }
  console.log(`Subtotal Vendas: R$ ${total.toFixed(2)} (Planilha: R$ 6.350,72)`);
  console.log(`Bateu? ${total === 6350.72 ? "✅ 100% EXATO!" : "❌"}`);

  await db.$disconnect();
}

testCash01Jul().catch(console.error);
