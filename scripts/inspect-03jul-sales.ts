import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const sales03 = await prisma.sale.findMany({
    where: {
      saleDate: {
        gte: new Date("2026-07-03T00:00:00.000Z"),
        lte: new Date("2026-07-03T23:59:59.999Z"),
      },
      status: { not: "CANCELADA" },
    },
    include: { items: true, financialEntries: true, customer: true },
  });

  console.log(`Found ${sales03.length} sales on 03/07/2026:`);
  for (const s of sales03) {
    console.log(
      `Sale #${s.saleNumber} | Customer: ${s.customer?.name} | Final: ${s.finalAmount} | Notes: ${s.notes} | Items:`,
      s.items.map((i) => ({ id: i.id, type: i.type, desc: i.description, price: i.salePrice }))
    );
  }
}

main().finally(() => prisma.$disconnect());
