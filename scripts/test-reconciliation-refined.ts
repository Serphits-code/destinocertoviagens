import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const dates = ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-22"];

  for (const dateStr of dates) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));

    const receivables = await prisma.financialEntry.findMany({
      where: {
        paidAt: { gte: startOfDay, lte: endOfDay },
        kind: "RECEBIMENTO",
      },
      include: {
        customer: true,
        sale: true,
        bankTransactions: {
          include: { account: true },
        },
      },
    });

    let dinRec = 0;
    let pixRec = 0;
    let boletoRec = 0;
    let cartaoRec = 0;

    for (const r of receivables) {
      const val = Number(r.amount);
      const desc = (r.description || "").toUpperCase();
      if (desc.includes("RENDIMENTO") || desc.includes("APLICAÇÃO")) continue;

      const doc = (r.document || "").toUpperCase().trim();
      const meth = (r.paymentMethod || "").toUpperCase().trim();
      if (doc === "STONE" || doc.includes("SUMUP")) continue;

      const issueDateStr = r.issueDate ? r.issueDate.toISOString().slice(0, 10) : "";
      const isVendaDoDia = Boolean(r.saleId) && issueDateStr === dateStr;
      if (isVendaDoDia) continue;

      // Check if deposited to CAIXA / Dinheiro
      const isPhysicalCash =
        doc === "DINHEIRO" ||
        meth === "DINHEIRO" ||
        r.bankTransactions.some(
          (bt) => bt.account?.type === "CAIXA" || (bt.account?.name || "").toUpperCase().includes("DINHEIRO")
        );

      if (isPhysicalCash) {
        dinRec += val;
      } else if (doc === "BOLETO" || meth === "BOLETO") {
        boletoRec += val;
      } else if (doc === "CARTAO" || meth === "CARTAO") {
        cartaoRec += val;
      } else {
        pixRec += val;
      }
    }

    console.log(`\n=== ${dateStr} ===`);
    console.log(`Recebimentos Dinheiro: ${dinRec.toFixed(2)}`);
    console.log(`Recebimentos PIX:      ${pixRec.toFixed(2)}`);
    console.log(`Recebimentos Boleto:   ${boletoRec.toFixed(2)}`);
    console.log(`Recebimentos Cartão:   ${cartaoRec.toFixed(2)}`);
    console.log(`Total Recebimentos:    ${(dinRec + pixRec + boletoRec + cartaoRec).toFixed(2)}`);
  }
}

main().finally(() => prisma.$disconnect());
