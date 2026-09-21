import { db } from "../src/lib/db";

async function inspectSalesPayments02() {
  const sales = await db.sale.findMany({
    where: {
      saleDate: {
        gte: new Date("2026-07-02T00:00:00Z"),
        lte: new Date("2026-07-02T23:59:59Z"),
      },
    },
    include: { financialEntries: true },
  });

  console.log(`Total sales on 02/07: ${sales.length}`);
  let pix = 0;
  let crediario = 0;
  let cartao = 0;
  let cartaoFornec = 0;

  for (const s of sales) {
    const val = Number(s.finalAmount);
    if (s.financialEntries.length === 0) {
      cartaoFornec += val;
      console.log(`Sale #${s.saleNumber}: R$ ${val} -> CARTAO FORNECEDOR`);
    } else {
      for (const e of s.financialEntries) {
        const ev = Number(e.amount);
        const doc = (e.document || "").toUpperCase();
        const meth = (e.paymentMethod || "").toUpperCase();
        const paidToday = e.paidAt && e.paidAt.toISOString().slice(0, 10) === "2026-07-02";
        console.log(`Sale #${s.saleNumber}: Entry R$ ${ev} | doc: ${doc} | meth: ${meth} | paidAt: ${e.paidAt?.toISOString().slice(0, 10)} | paidToday: ${paidToday}`);
      }
    }
  }

  await db.$disconnect();
}

inspectSalesPayments02().catch(console.error);
