import { db } from "../src/lib/db";

async function checkJuazeiro() {
  const sales = await db.sale.findMany({
    where: {
      saleDate: {
        gte: new Date("2026-07-02T00:00:00Z"),
        lte: new Date("2026-07-02T23:59:59Z"),
      },
      saleNumber: { notIn: ["3571", "3573"] },
    },
    include: { items: true },
  });

  console.log(`Found ${sales.length} package sales on 02/07.`);
  for (const s of sales) {
    console.log(`Venda #${s.saleNumber} | Amount: ${Number(s.finalAmount)} | Items: ${s.items.map(i => `${i.type}: ${i.description}`).join("; ")} | Notes: ${s.notes}`);
  }

  // Update sale 3574 (Car Rental) on 03/07
  const s3574 = await db.sale.findUnique({
    where: { saleNumber: "3574" },
    include: { items: true },
  });
  console.log("\nSale 3574:", s3574 ? {
    number: s3574.saleNumber,
    amount: Number(s3574.finalAmount),
    items: s3574.items.map(i => `${i.type}: ${i.description}`),
    notes: s3574.notes,
  } : "NOT FOUND");

  await db.$disconnect();
}

checkJuazeiro().catch(console.error);
