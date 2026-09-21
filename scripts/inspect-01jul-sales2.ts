import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const s = await prisma.sale.findMany({
    where: {
      saleDate: {
        gte: new Date("2026-07-01T00:00:00.000Z"),
        lte: new Date("2026-07-01T23:59:59.999Z"),
      },
      status: { not: "CANCELADA" },
    },
    include: { items: true },
  });
  console.log("Sales on 01/07/2026:", JSON.stringify(s, null, 2));
}

main().finally(() => prisma.$disconnect());
