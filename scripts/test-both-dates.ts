import { db } from "../src/lib/db";

async function testFinalPrecision() {
  for (const dateStr of ["2026-07-01", "2026-07-22"]) {
    console.log(`\n=======================================================`);
    console.log(`  TESTANDO DATA: ${dateStr}`);
    console.log(`=======================================================`);

    const [y, m, d] = dateStr.split("-").map(Number);
    const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));

    const sales = await db.sale.findMany({
      where: {
        saleDate: { gte: startOfDay, lte: endOfDay },
        status: { not: "CANCELADA" },
      },
      include: {
        items: true,
        financialEntries: true,
        customer: { select: { name: true } },
      },
    });

    const operations = { pacotes: 0, passagens: 0, hoteis: 0, outros: 0, subtotal: 0 };
    const salesPayments = { atendimentos: sales.length, dinheiro: 0, crediario: 0, cartao: 0, cartaoFornecedor: 0, pix: 0, boleto: 0, subtotal: 0 };

    for (const s of sales) {
      const val = Number(s.finalAmount);
      const desc = (s.notes || "" + " " + s.items.map(i => i.description).join(" ")).toUpperCase();
      const isPacote =
        desc.includes("PACOTE") ||
        desc.includes("GRAMADO") ||
        desc.includes("EXCURS") ||
        desc.includes("CHILE") ||
        desc.includes("FOZ") ||
        desc.includes("JATIUCA") ||
        desc.includes("NORONHA") ||
        desc.includes("LENÇOIS") ||
        (desc.includes("HOTEL") && (desc.includes("VOO") || desc.includes("PASSEIO") || desc.includes("TRANSFER") || desc.includes("GUIA")));

      if (isPacote) operations.pacotes += val;
      else if (desc.includes("HOTEL") || desc.includes("POUSADA")) operations.hoteis += val;
      else operations.passagens += val;

      // Classificação financeira da venda
      if (s.financialEntries.length === 0) {
        salesPayments.cartaoFornecedor += val;
      } else {
        const primaryMethod = (s.primaryPaymentMethod || "").toUpperCase();
        const firstEntry = s.financialEntries[0];
        const firstDoc = (firstEntry?.document || "").toUpperCase();
        const firstMeth = (firstEntry?.paymentMethod || "").toUpperCase();

        const isSaleCard =
          primaryMethod.includes("CARD") ||
          primaryMethod.includes("CARTAO") ||
          firstDoc.includes("STONE") ||
          firstDoc.includes("SUMUP") ||
          firstDoc.includes("CARTAO") ||
          firstMeth.includes("CARD") ||
          firstMeth.includes("CARTAO");

        if (isSaleCard) {
          salesPayments.cartao += val;
        } else {
          // Checar se teve entrada paga no dia
          const paidTodayEntries = s.financialEntries.filter(
            (e) => e.paidAt && e.paidAt.toISOString().slice(0, 10) === dateStr
          );
          let paidTodayAmount = 0;
          for (const pe of paidTodayEntries) {
            const pVal = Number(pe.amount);
            const pDoc = (pe.document || "").toUpperCase();
            const pMeth = (pe.paymentMethod || "").toUpperCase();
            if (pDoc === "DINHEIRO" || pMeth === "DINHEIRO") salesPayments.dinheiro += pVal;
            else if (pDoc === "PIX" || pMeth === "PIX") salesPayments.pix += pVal;
            else salesPayments.crediario += pVal;
            paidTodayAmount += pVal;
          }

          const futureBalance = val - paidTodayAmount;
          if (futureBalance > 0.01) {
            salesPayments.crediario += futureBalance;
          }
        }
      }
    }

    operations.subtotal = sales.reduce((sum, s) => sum + Number(s.finalAmount), 0);
    salesPayments.subtotal = operations.subtotal;

    console.log(`Atendimentos: ${salesPayments.atendimentos}`);
    console.log(`Subtotal Vendas / Operações: R$ ${operations.subtotal.toFixed(2)}`);
    console.log(`   - Pacotes:           R$ ${operations.pacotes.toFixed(2)}`);
    console.log(`   - Passagens:         R$ ${operations.passagens.toFixed(2)}`);
    console.log(`   - Dinheiro:          R$ ${salesPayments.dinheiro.toFixed(2)}`);
    console.log(`   - Crediário:         R$ ${salesPayments.crediario.toFixed(2)}`);
    console.log(`   - Cartão Agência:    R$ ${salesPayments.cartao.toFixed(2)}`);
    console.log(`   - Cartão Fornecedor: R$ ${salesPayments.cartaoFornecedor.toFixed(2)}`);
    console.log(`   - PIX:               R$ ${salesPayments.pix.toFixed(2)}`);
  }

  await db.$disconnect();
}

testFinalPrecision().catch(console.error);
