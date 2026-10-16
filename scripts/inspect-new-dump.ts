import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [
    customers,
    suppliers,
    financialEntries,
    finPaid,
    finPending,
    trips,
    bankAccounts,
    bankTransactions,
    sellers,
    sales,
    salesConf,
    salesCanc,
    salesOrc,
    saleItems,
    salePassengers,
    tasks,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.supplier.count(),
    prisma.financialEntry.count(),
    prisma.financialEntry.count({ where: { status: 'PAGO' } }),
    prisma.financialEntry.count({ where: { status: 'PENDENTE' } }),
    prisma.customerTrip.count(),
    prisma.bankAccount.count(),
    prisma.bankTransaction.count(),
    prisma.seller.count(),
    prisma.sale.count(),
    prisma.sale.count({ where: { status: 'CONFIRMADA' } }),
    prisma.sale.count({ where: { status: 'CANCELADA' } }),
    prisma.sale.count({ where: { status: 'ORCAMENTO' } }),
    prisma.saleItem.count(),
    prisma.salePassenger.count(),
    prisma.task.count(),
  ]);

  console.log('\n📊 ESTADO FINAL DO BANCO DE DADOS (PÓS-IMPORTAÇÃO):');
  console.log(`  👥 Clientes (PF):                  ${customers}`);
  console.log(`  🏢 Fornecedores (PJ):              ${suppliers}`);
  console.log(`  💳 Lançamentos Financeiros:        ${financialEntries} (Pagos: ${finPaid} | Pendentes: ${finPending})`);
  console.log(`  ✈️  Histórico de Viagens:           ${trips}`);
  console.log(`  🏦 Contas Bancárias:               ${bankAccounts}`);
  console.log(`  📑 Extratos / Movimentações:       ${bankTransactions}`);
  console.log(`  💼 Vendedores:                     ${sellers}`);
  console.log(`  🛒 Vendas:                         ${sales} (Confirmadas: ${salesConf} | Canceladas: ${salesCanc} | Orçamentos: ${salesOrc})`);
  console.log(`  📦 Itens / Serviços Vendidos:      ${saleItems}`);
  console.log(`  👥 Vínculos de Passageiros:        ${salePassengers}`);
  console.log(`  📝 Tarefas de CRM:                 ${tasks}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
