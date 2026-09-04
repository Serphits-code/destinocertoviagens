import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const blocks = await prisma.block.findMany({ where: { type: "hospedagem" } });
for (const b of blocks) {
  const cfg = b.configJson;
  delete cfg.roomList;
  await prisma.block.update({ where: { id: b.id }, data: { configJson: cfg } });
  console.log("roomList limpa no bloco", b.id);
}
await prisma.$disconnect();
