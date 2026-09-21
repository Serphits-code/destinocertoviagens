import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const startOfDay = new Date("2026-07-03T00:00:00.000Z");
  const endOfDay = new Date("2026-07-03T23:59:59.999Z");

  const receivables = await prisma.financialEntry.findMany({
    where: {
      paidAt: { gte: startOfDay, lte: endOfDay },
      kind: "RECEBIMENTO",
    },
    include: {
      customer: true,
      sale: true,
    },
  });

  console.log(`Receivables paid on 03/07/2026: ${receivables.length}`);
  for (const r of receivables) {
    console.log(`ID: ${r.id} | Amount: ${r.amount} | Doc: ${r.document} | Meth: ${r.paymentMethod} | MethName: ${r.paymentMethodName} | Customer: ${r.customer?.name} | Sale: ${r.sale?.saleNumber} | Desc: ${r.description}`);
  }

  const bankTrans = await prisma.bankTransaction.findMany({
    where: {
      date: { gte: startOfDay, lte: endOfDay },
    },
    include: { account: true },
  });

  console.log(`\nBank transactions on 03/07/2026: ${bankTrans.length}`);
  for (const bt of bankTrans) {
    console.log(`ID: ${bt.id} | Amount: ${bt.amount} | Account: ${bt.account?.name} (${bt.account?.type}) | Desc: ${bt.description} | EntryId: ${bt.financialEntryId}`);
  }
}

main().finally(() => prisma.$disconnect());
