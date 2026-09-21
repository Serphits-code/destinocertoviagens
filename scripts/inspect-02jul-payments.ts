import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const sales = await prisma.sale.findMany({
    where: {
      saleDate: {
        gte: new Date("2026-07-02T00:00:00.000Z"),
        lte: new Date("2026-07-02T23:59:59.999Z"),
      },
      status: { not: "CANCELADA" },
    },
    include: { financialEntries: true, customer: true },
  });

  for (const s of sales) {
    console.log(`\nSale #${s.saleNumber} (${s.customer?.name}) - Final: ${s.finalAmount}`);
    console.log(`  primaryMethod: ${s.primaryPaymentMethod}, notes: ${s.notes}`);
    for (const fe of s.financialEntries) {
      console.log(`    FE #${fe.id} | amount: ${fe.amount} | doc: ${fe.document} | meth: ${fe.paymentMethod} | paidAt: ${fe.paidAt?.toISOString()} | due: ${fe.dueDate.toISOString()}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
