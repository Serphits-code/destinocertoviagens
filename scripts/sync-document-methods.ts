import { db } from '../src/lib/db';

async function syncDocumentMethods() {
  console.log('🔄 Sincronizando formas de pagamento com base no campo Documento do Monde...');

  const pix = await db.financialEntry.updateMany({
    where: { document: { contains: 'PIX', mode: 'insensitive' } },
    data: { paymentMethod: 'PIX', paymentMethodName: 'PIX' },
  });

  const dep = await db.financialEntry.updateMany({
    where: {
      OR: [
        { document: { contains: 'DEPOS', mode: 'insensitive' } },
        { document: { contains: 'DEPOD', mode: 'insensitive' } },
      ],
    },
    data: { paymentMethod: 'DEPOSITO_CONTA', paymentMethodName: 'Depósito em Conta' },
  });

  const bol = await db.financialEntry.updateMany({
    where: { document: { contains: 'BOLETO', mode: 'insensitive' } },
    data: { paymentMethod: 'BOLETO', paymentMethodName: 'Boleto' },
  });

  const din = await db.financialEntry.updateMany({
    where: { document: { contains: 'DINHEIRO', mode: 'insensitive' } },
    data: { paymentMethod: 'DINHEIRO', paymentMethodName: 'Dinheiro' },
  });

  const card = await db.financialEntry.updateMany({
    where: {
      OR: [
        { document: { contains: 'STONE', mode: 'insensitive' } },
        { document: { contains: 'SUMUP', mode: 'insensitive' } },
      ],
    },
    data: { paymentMethod: 'CARTAO_CREDITO', paymentMethodName: 'Cartão de Crédito' },
  });

  const fat = await db.financialEntry.updateMany({
    where: { document: { contains: 'FATURA', mode: 'insensitive' } },
    data: { paymentMethod: 'FATURADO', paymentMethodName: 'Faturado' },
  });

  console.log('✅ Atualizações concluídas:');
  console.log(`- PIX: ${pix.count}`);
  console.log(`- Depósito em Conta: ${dep.count}`);
  console.log(`- Boleto: ${bol.count}`);
  console.log(`- Dinheiro: ${din.count}`);
  console.log(`- Cartão (Stone / SumUp): ${card.count}`);
  console.log(`- Faturado: ${fat.count}`);

  // Testar contagem de PIX no dia 22/07/2026
  const pixDay = await db.financialEntry.findMany({
    where: {
      kind: 'RECEBIMENTO',
      paidAt: {
        gte: new Date('2026-07-22T00:00:00.000Z'),
        lte: new Date('2026-07-22T23:59:59.999Z'),
      },
      paymentMethod: 'PIX',
    },
    select: {
      id: true,
      amount: true,
      document: true,
      paymentMethod: true,
      customer: { select: { name: true } },
    },
  });

  console.log(`\n🔍 Verificação em 22/07/2026 (esperado = 7): ${pixDay.length} registros`);
  for (const r of pixDay) {
    console.log(`  - ${r.customer?.name}: R$ ${r.amount} (Doc: ${r.document})`);
  }
}

syncDocumentMethods()
  .catch((err) => console.error(err))
  .finally(() => db.$disconnect());
