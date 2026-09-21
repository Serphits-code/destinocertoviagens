import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const sale70 = await prisma.sale.findUnique({
    where: { saleNumber: "3570" },
    include: { items: true },
  });
  console.log("Sale 3570:", JSON.stringify(sale70, null, 2));
}

main().finally(() => prisma.$disconnect());
