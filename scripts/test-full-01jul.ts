import { db } from "../src/lib/db";

async function testFull01Jul() {
  const dateStr = "2026-07-01";
  const [y, m, d] = dateStr.split("-").map(Number);
  const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));

  const sales = await db.sale.findMany({
    where: {
      saleDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: { not: "CANCELADA" },
    },
    include: {
      items: true,
      financialEntries: true,
      customer: { select: { name: true } },
    },
  });

  console.log("=== VENDAS ATIVAS (SEM CANCELADAS) ===");
  console.log(`Total atendimentos: ${sales.length} (Planilha: 2)`);

  let pacotes = 0;
  let passagens = 0;
  let hoteis = 0;
  let outros = 0;

  let cartaoProprio = 0;
  let cartaoFornecedor = 0;
  let crediario = 0;
  let pix = 0;
  let dinheiro = 0;

  for (const s of sales) {
    const val = Number(s.finalAmount);
    console.log(`Venda #${s.saleNumber}: R$ ${val.toFixed(2)} | Cliente: ${s.customer?.name} | Metodo: ${s.primaryPaymentMethod} | Entradas: ${s.financialEntries.length}`);

    // Categorização de produto
    const desc = (s.notes || "" + s.items.map(i => i.description).join(" ")).toUpperCase();
    const isPacote = desc.includes("PACOTE") || desc.includes("GRAMADO") || desc.includes("EXCURS") || (desc.includes("HOTEL") && (desc.includes("VOO") || desc.includes("PASSEIO") || desc.includes("TRANSFER") || desc.includes("GUIA")));
    
    if (isPacote) {
      pacotes += val;
    } else if (desc.includes("HOTEL") || desc.includes("POUSADA")) {
      hoteis += val;
    } else {
      // Venda aérea / passagem
      passagens += val;
    }

    // Formas de pagamento da venda
    if (s.financialEntries.length === 0) {
      // Quando a venda não gera financeiro de cobrança na agência, foi paga direto no fornecedor (ex: cartão da cia aérea/operadora)
      cartaoFornecedor += val;
    } else {
      // Tem títulos no financeiro da agência
      const firstMeth = (s.financialEntries[0].paymentMethod || s.primaryPaymentMethod || "").toUpperCase();
      const firstDoc = (s.financialEntries[0].document || "").toUpperCase();
      if (firstDoc === "DINHEIRO" || firstMeth === "DINHEIRO") dinheiro += val;
      else if (firstDoc === "PIX" || firstMeth === "PIX") pix += val;
      else if (firstDoc.includes("CARTAO") || firstDoc.includes("STONE") || firstDoc.includes("SUMUP") || firstMeth.includes("CARD")) cartaoProprio += val;
      else crediario += val;
    }
  }

  console.log("\n--- RESULTADO DAS OPERAÇÕES ---");
  console.log(`PACOTES:   R$ ${pacotes.toFixed(2)} (Planilha: R$ 4.310,00) -> ${pacotes === 4310 ? "✅" : "❌"}`);
  console.log(`PASSAGENS: R$ ${passagens.toFixed(2)} (Planilha: R$ 2.040,72) -> ${passagens === 2040.72 ? "✅" : "❌"}`);
  console.log(`SUBTOTAL:  R$ ${(pacotes + passagens).toFixed(2)} (Planilha: R$ 6.350,72) -> ${pacotes + passagens === 6350.72 ? "✅" : "❌"}`);

  console.log("\n--- RESULTADO DAS FORMAS DE PAGAMENTO DA VENDA ---");
  console.log(`CARTÃO:            R$ ${cartaoProprio.toFixed(2)} (Planilha: R$ 4.310,00) -> ${cartaoProprio === 4310 ? "✅" : "❌"}`);
  console.log(`CARTÃO FORNECEDOR: R$ ${cartaoFornecedor.toFixed(2)} (Planilha: R$ 2.040,72) -> ${cartaoFornecedor === 2040.72 ? "✅" : "❌"}`);
  console.log(`SUBTOTAL VENDAS:   R$ ${(cartaoProprio + cartaoFornecedor).toFixed(2)} (Planilha: R$ 6.350,72) -> ${cartaoProprio + cartaoFornecedor === 6350.72 ? "✅" : "❌"}`);

  await db.$disconnect();
}

testFull01Jul().catch(console.error);
