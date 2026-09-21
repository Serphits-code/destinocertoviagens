import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const days = ["2026-07-06", "2026-07-07", "2026-07-08", "2026-07-10"];
  for (const d of days) {
    const s = await prisma.sale.findMany({
      where: {
        saleDate: {
          gte: new Date(`${d}T00:00:00.000Z`),
          lte: new Date(`${d}T23:59:59.999Z`),
        },
        status: { not: "CANCELADA" },
      },
      select: { saleNumber: true, finalAmount: true, primaryPaymentMethod: true },
    });
    console.log(`Day ${d}:`, s);
  }
}

main().finally(() => prisma.$disconnect());
