import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "almeidaestudios@outlook.com";
  const passwordHash = await bcrypt.hash("Cxz963!@", 12);

  const gustavo = await prisma.user.upsert({
    where: { email },
    update: { name: "Gustavo", passwordHash, role: "ADMIN" },
    create: {
      name: "Gustavo",
      email,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("✅ Usuário admin criado/atualizado:", gustavo.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
