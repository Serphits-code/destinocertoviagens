import { db } from "../src/lib/db";

async function main() {
  const ex = await db.excursion.findUnique({
    where: { id: "cmu4e40q00001tvc0t04mrsgy" },
    include: {
      blocks: { orderBy: { order: "asc" } },
    },
  });

  if (!ex) {
    console.log("Excursão não encontrada!");
    return;
  }

  console.log("=== EXCURSÃO ===");
  console.log("ID:", ex.id);
  console.log("Nome:", ex.name);
  console.log("Destino:", ex.destination);
  console.log("Período:", ex.periodStart, "até", ex.periodEnd);
  console.log("Slots:", ex.slots);
  console.log("Profit Margin:", ex.profitMargin);
  console.log("Custom Profit Amount:", ex.customProfitAmount);
  console.log("Custom Package Price:", ex.customPackagePrice);

  console.log("\n=== BLOCOS ===");
  for (const b of ex.blocks) {
    console.log(`\n--- Bloco [${b.type}] ${b.title} ---`);
    console.log("ConfigJson:", JSON.stringify(b.configJson, null, 2));
  }

  console.log("\n=== ADDONS JSON ===");
  console.log(JSON.stringify(ex.addonsJson, null, 2));
}

main().finally(() => db.$disconnect());
