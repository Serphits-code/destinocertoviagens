import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const sale74 = await prisma.sale.findUnique({
    where: { saleNumber: "3574" },
    include: { items: true, financialEntries: true },
  });
  console.log("Sale 3574:", JSON.stringify(sale74, null, 2));

  const sale76 = await prisma.sale.findUnique({
    where: { saleNumber: "3576" },
    include: { items: true, financialEntries: true },
  });
  console.log("Sale 3576:", JSON.stringify(sale76, null, 2));
}

main().finally(() => prisma.$disconnect());
