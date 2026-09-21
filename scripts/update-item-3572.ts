import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const item3572 = await prisma.saleItem.updateMany({
    where: { sale: { saleNumber: "3572" } },
    data: {
      type: "AEREO",
      description: "Passagem Aérea / Fornecedor CVC",
    },
  });
  console.log("Updated item for Sale 3572:", item3572);
}

main().finally(() => prisma.$disconnect());
