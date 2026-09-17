import { db } from "../src/lib/db";

async function importMissingSales() {
  console.log("Importing missing customers and sales (3571 and 3573)...");

  // 1. Customers
  const cMirandiba = await db.customer.upsert({
    where: { mondeId: "371c0bf4-3bc5-4350-9466-05491362f4ec" },
    update: {},
    create: {
      mondeId: "371c0bf4-3bc5-4350-9466-05491362f4ec",
      name: "MUNICIPIO DE MIRANDIBA",
      cpf: "11043312000107",
      city: "Mirandiba",
      state: "PE",
      address: "AV JOSE DA S T ARAQUAN, 00, CENTRO",
    },
  });
  console.log("Customer Mirandiba created/found:", cMirandiba.id);

  const cJoseCarlos = await db.customer.upsert({
    where: { mondeId: "20813bed-81d9-4414-81ab-e6790b1fefb7" },
    update: {},
    create: {
      mondeId: "20813bed-81d9-4414-81ab-e6790b1fefb7",
      name: "JOSE CARLOS DOS SANTOS",
      cpf: "19609214000198",
    },
  });
  console.log("Customer Jose Carlos created/found:", cJoseCarlos.id);

  // 2. Sale 3571 (Hotel - R$ 829,37)
  const s3571 = await db.sale.upsert({
    where: { saleNumber: "3571" },
    update: {
      saleDate: new Date("2026-07-02T10:46:37.000Z"),
      finalAmount: 829.37,
      totalProducts: 829.37,
      status: "CONFIRMADA",
      customerId: cMirandiba.id,
      notes: "Hospedagem / Hotel Mirandiba",
      primaryPaymentMethod: "PIX",
    },
    create: {
      mondeId: "0f7baccd-68fa-43fd-9e1c-5a2dceaa25df",
      saleNumber: "3571",
      saleDate: new Date("2026-07-02T10:46:37.000Z"),
      finalAmount: 829.37,
      totalProducts: 829.37,
      status: "CONFIRMADA",
      customerId: cMirandiba.id,
      notes: "Hospedagem / Hotel Mirandiba",
      primaryPaymentMethod: "PIX",
    },
  });
  console.log("Sale 3571 created/updated:", s3571.id);

  // Add Item for 3571
  const existingItem3571 = await db.saleItem.findFirst({
    where: { saleId: s3571.id },
  });
  if (!existingItem3571) {
    await db.saleItem.create({
      data: {
        saleId: s3571.id,
        type: "HOSPEDAGEM",
        description: "Hotel / Hospedagem",
        startDate: new Date("2026-07-02T00:00:00Z"),
        endDate: new Date("2026-07-03T00:00:00Z"),
        quantity: 1,
        unitPrice: 829.37,
        totalAmount: 829.37,
      },
    });
    console.log("Item for 3571 created.");
  }

  // Link FinancialEntry to Sale 3571
  const fe3571 = await db.financialEntry.findFirst({
    where: { mondeId: "a4764ccd-cab1-4f22-bb92-463f2b53c6fe" },
  });
  if (fe3571) {
    await db.financialEntry.update({
      where: { id: fe3571.id },
      data: {
        saleId: s3571.id,
        customerId: cMirandiba.id,
      },
    });
    console.log("Linked financial entry to Sale 3571.");
  }

  // 3. Sale 3573 (Passagem LATAM - R$ 536,13)
  const s3573 = await db.sale.upsert({
    where: { saleNumber: "3573" },
    update: {
      saleDate: new Date("2026-07-02T16:49:38.000Z"),
      finalAmount: 536.13,
      totalProducts: 432.35,
      totalTaxes: 60.54,
      serviceFee: 43.24,
      status: "CONFIRMADA",
      customerId: cJoseCarlos.id,
      notes: "Passagem Aérea Azul / Flytour",
      primaryPaymentMethod: "CARTAO_FORNECEDOR",
    },
    create: {
      mondeId: "6bfa6dae-7937-4fd1-b616-e1856592593a",
      saleNumber: "3573",
      saleDate: new Date("2026-07-02T16:49:38.000Z"),
      finalAmount: 536.13,
      totalProducts: 432.35,
      totalTaxes: 60.54,
      serviceFee: 43.24,
      status: "CONFIRMADA",
      customerId: cJoseCarlos.id,
      notes: "Passagem Aérea Azul / Flytour",
      primaryPaymentMethod: "CARTAO_FORNECEDOR",
    },
  });
  console.log("Sale 3573 created/updated:", s3573.id);

  // Add Item for 3573
  const existingItem3573 = await db.saleItem.findFirst({
    where: { saleId: s3573.id },
  });
  if (!existingItem3573) {
    await db.saleItem.create({
      data: {
        saleId: s3573.id,
        type: "AEREO",
        description: "Passagem Aérea",
        startDate: new Date("2026-08-01T00:00:00Z"),
        endDate: new Date("2026-08-01T00:00:00Z"),
        quantity: 1,
        unitPrice: 432.35,
        taxAmount: 60.54,
        totalAmount: 536.13,
      },
    });
    console.log("Item for 3573 created.");
  }

  await db.$disconnect();
}

importMissingSales().catch(console.error);
