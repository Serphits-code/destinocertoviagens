import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const sale69 = await prisma.sale.findUnique({
    where: { saleNumber: "3569" },
    include: { financialEntries: true },
  });
  console.log("Sale 3569:", JSON.stringify(sale69, null, 2));
}

main().finally(() => prisma.$disconnect());
