import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function inspectSales01Jul() {
  const startOfDay = new Date("2026-07-01T00:00:00.000Z");
  const endOfDay = new Date("2026-07-01T23:59:59.999Z");

  console.log("=== VENDAS NO BANCO DE DADOS EM 01/07/2026 ===");
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
      customer: true,
    },
  });

  console.log(`Total de Vendas encontradas: ${sales.length}\n`);

  for (const s of sales) {
    console.log(`Venda #${s.saleNumber || s.id}:`);
    console.log(`  - Data: ${s.saleDate.toISOString()}`);
    console.log(`  - Status: ${s.status}`);
    console.log(`  - Cliente: ${s.customer?.name}`);
    console.log(`  - Final Amount: R$ ${Number(s.finalAmount).toFixed(2)}`);
    console.log(`  - Total Products: R$ ${Number(s.totalProducts).toFixed(2)}`);
    console.log(`  - Items (${s.items.length}):`);
    for (const item of s.items) {
      console.log(`      * Tipo: ${item.type} | Desc: ${item.description} | Total: R$ ${Number(item.totalAmount).toFixed(2)}`);
    }
    console.log(`  - Financeiro (${s.financialEntries.length}):`);
    for (const f of s.financialEntries) {
      console.log(`      * ${f.kind} | R$ ${Number(f.amount).toFixed(2)} | Doc: ${f.document} | Status: ${f.status} | Metodo: ${f.paymentMethod} | Venc: ${f.dueDate.toISOString().slice(0, 10)} | Pago: ${f.paidAt ? f.paidAt.toISOString().slice(0, 10) : 'NÃO'}`);
    }
    console.log("");
  }

  await prisma.$disconnect();
}

inspectSales01Jul().catch(console.error);
