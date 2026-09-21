import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Update Sale 3574 (Carro)
  const item3574 = await prisma.saleItem.updateMany({
    where: { sale: { saleNumber: "3574" } },
    data: {
      type: "CARRO",
      description: "Aluguel de Carro - Localiza / Rentcars",
    },
  });
  console.log("Updated item for Sale 3574:", item3574);

  // Update Sale 3576 (Aéreo)
  const item3576 = await prisma.saleItem.updateMany({
    where: { sale: { saleNumber: "3576" } },
    data: {
      type: "AEREO",
      description: "Passagem Aérea",
    },
  });
  console.log("Updated item for Sale 3576:", item3576);
}

main().finally(() => prisma.$disconnect());
