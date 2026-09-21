import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function testMultipleDays() {
  const daysToTest = [
    { dateStr: "2026-07-10", expectedDinheiroVenda: 0, expectedDinheiroRec: 524.00, expectedPixVenda: 0, expectedPixRec: 5167.68 },
    { dateStr: "2026-07-13", expectedDinheiroVenda: 0, expectedDinheiroRec: 100.00, expectedPixVenda: 0, expectedPixRec: 7106.61 },
    { dateStr: "2026-07-14", expectedDinheiroVenda: 0, expectedDinheiroRec: 17238.00, expectedPixVenda: 0, expectedPixRec: 0 },
    { dateStr: "2026-07-15", expectedDinheiroVenda: 0, expectedDinheiroRec: 10285.00, expectedPixVenda: 0, expectedPixRec: 12104.09 },
    { dateStr: "2026-07-21", expectedDinheiroVenda: 0, expectedDinheiroRec: 0, expectedPixVenda: 0, expectedPixRec: 0 },
    { dateStr: "2026-07-22", expectedDinheiroVenda: 460.00, expectedDinheiroRec: 540.00, expectedPixVenda: 1350.00, expectedPixRec: 6697.00 },
    { dateStr: "2026-07-23", expectedDinheiroVenda: 740.00, expectedDinheiroRec: 250.00, expectedPixVenda: 0, expectedPixRec: 740.00 },
  ];

  console.log("===============================================================================");
  console.log("  TESTE MULTI-DIAS: BANCO DE DADOS vs PLANILHA CAIXA 2026");
  console.log("===============================================================================\n");

  for (const day of daysToTest) {
    const startOfDay = new Date(`${day.dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${day.dateStr}T23:59:59.999Z`);

    const entries = await prisma.financialEntry.findMany({
      where: {
        paidAt: { gte: startOfDay, lte: endOfDay },
        kind: "RECEBIMENTO",
      },
    });

    let dinVenda = 0;
    let dinRec = 0;
    let pixVenda = 0;
    let pixRec = 0;

    for (const e of entries) {
      const val = Number(e.amount);
      const doc = (e.document || "").toUpperCase();
      const meth = (e.paymentMethod || "").toUpperCase();
      const issueDateStr = e.issueDate ? e.issueDate.toISOString().slice(0, 10) : "";
      const isVenda = issueDateStr === day.dateStr;

      if (doc === "DINHEIRO" || meth === "DINHEIRO") {
        if (isVenda) dinVenda += val;
        else dinRec += val;
      } else if (doc === "PIX" || meth === "PIX") {
        if (isVenda) pixVenda += val;
        else pixRec += val;
      }
    }

    console.log(`📅 Data: ${day.dateStr}`);
    console.log(`   - Dinheiro Venda:   R$ ${dinVenda.toFixed(2)} (Esp: R$ ${day.expectedDinheiroVenda.toFixed(2)}) -> ${dinVenda === day.expectedDinheiroVenda ? "✅" : "⚠️"}`);
    console.log(`   - Dinheiro Receb:   R$ ${dinRec.toFixed(2)} (Esp: R$ ${day.expectedDinheiroRec.toFixed(2)}) -> ${dinRec === day.expectedDinheiroRec ? "✅" : "⚠️"}`);
    console.log(`   - Total Dinheiro:   R$ ${(dinVenda + dinRec).toFixed(2)} (Esp: R$ ${(day.expectedDinheiroVenda + day.expectedDinheiroRec).toFixed(2)}) -> ${dinVenda + dinRec === day.expectedDinheiroVenda + day.expectedDinheiroRec ? "✅" : "⚠️"}`);
    console.log(`   - Pix Venda:        R$ ${pixVenda.toFixed(2)} (Esp: R$ ${day.expectedPixVenda.toFixed(2)}) -> ${pixVenda === day.expectedPixVenda ? "✅" : "⚠️"}`);
    console.log(`   - Pix Receb:        R$ ${pixRec.toFixed(2)} (Esp: R$ ${day.expectedPixRec.toFixed(2)}) -> ${pixRec === day.expectedPixRec ? "✅" : "⚠️"}`);
    console.log(`   - Total Pix:        R$ ${(pixVenda + pixRec).toFixed(2)} (Esp: R$ ${(day.expectedPixVenda + day.expectedPixRec).toFixed(2)}) -> ${pixVenda + pixRec === day.expectedPixVenda + day.expectedPixRec ? "✅" : "⚠️"}\n`);
  }

  await prisma.$disconnect();
}

testMultipleDays().catch(console.error);
