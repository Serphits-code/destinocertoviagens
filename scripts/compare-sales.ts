import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function compare3572and3581() {
  const sales = await prisma.sale.findMany({
    where: { saleNumber: { in: ["3572", "3581"] } },
    include: {
      items: true,
      passengers: true,
      financialEntries: true,
      customer: true,
      seller: true,
    },
  });

  console.log(JSON.stringify(sales, null, 2));
  await prisma.$disconnect();
}

compare3572and3581().catch(console.error);
