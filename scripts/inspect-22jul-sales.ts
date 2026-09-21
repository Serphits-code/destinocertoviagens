import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const sales22 = await prisma.sale.findMany({
    where: {
      saleDate: {
        gte: new Date("2026-07-22T00:00:00.000Z"),
        lte: new Date("2026-07-22T23:59:59.999Z"),
      },
      status: { not: "CANCELADA" },
    },
    include: { financialEntries: true, customer: true },
  });

  console.log(`Sales on 22/07/2026: ${sales22.length}`);
  for (const s of sales22) {
    console.log(`Sale #${s.saleNumber} | Customer: ${s.customer?.name} | Final: ${s.finalAmount} | primaryMethod: ${s.primaryPaymentMethod}`);
    for (const fe of s.financialEntries) {
      console.log(`   FE amount: ${fe.amount} | doc: ${fe.document} | meth: ${fe.paymentMethod} | paidAt: ${fe.paidAt?.toISOString()}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
