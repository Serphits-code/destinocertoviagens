import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const trans = await prisma.bankTransaction.findMany({
    where: {
      account: { type: "CAIXA" },
      date: {
        gte: new Date("2026-07-01T00:00:00.000Z"),
        lte: new Date("2026-07-05T23:59:59.999Z"),
      },
    },
    orderBy: { date: "asc" },
  });

  console.log(`BankTransaction for CAIXA (01 to 05 July): ${trans.length}`);
  for (const t of trans) {
    console.log(`Date: ${t.date.toISOString().slice(0, 10)} | Amount: ${t.amount} | Desc: ${t.description}`);
  }
}

main().finally(() => prisma.$disconnect());
