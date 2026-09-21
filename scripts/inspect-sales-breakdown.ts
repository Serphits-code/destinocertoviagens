import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function inspectSalesBreakdown() {
  const startOfDay = new Date("2026-07-22T00:00:00.000Z");
  const endOfDay = new Date("2026-07-22T23:59:59.999Z");

  const sales = await prisma.sale.findMany({
    where: {
      saleDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      items: true,
      financialEntries: true,
    },
  });

  console.log("=== ANÁLISE DOS ITENS DAS 10 VENDAS DE 22/07/2026 ===");
  const productsByType: Record<string, number> = {};
  for (const s of sales) {
    console.log(`\nVenda #${s.saleNumber} (R$ ${Number(s.finalAmount).toFixed(2)}):`);
    for (const item of s.items) {
      const ptype = item.productType || "DESCONHECIDO";
      const val = Number(item.totalAmount);
      productsByType[ptype] = (productsByType[ptype] || 0) + val;
      console.log(`   Item: ${item.description} | Tipo: ${ptype} | Valor: R$ ${val.toFixed(2)}`);
    }
    for (const f of s.financialEntries) {
      console.log(`   Financeiro da Venda: ${f.kind} | R$ ${Number(f.amount).toFixed(2)} | Doc: ${f.document} | Metodo: ${f.paymentMethod} | Status: ${f.status} | Vencimento: ${f.dueDate.toISOString().slice(0, 10)} | Pago: ${f.paidAt ? f.paidAt.toISOString().slice(0, 10) : 'NÃO'}`);
    }
  }

  console.log("\n--- TOTAIS POR TIPO DE PRODUTO ---");
  for (const [k, v] of Object.entries(productsByType)) {
    console.log(`${k}: R$ ${v.toFixed(2)}`);
  }
  console.log("Planilha:");
  console.log("PACOTES:   R$ 5.270,00");
  console.log("PASSAGENS: R$ 3.132,96");

  await prisma.$disconnect();
}

inspectSalesBreakdown().catch(console.error);
