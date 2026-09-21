import { execSync } from "child_process";
import { db } from "../src/lib/db";

const pgRestore = "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe";
const dumpPath = "c:/geo/data/database_20260917103253.dump";

async function main() {
  console.log("Checking dump lines for items of 3571 and 3573...");
  const raw = execSync(`"${pgRestore}" -f - -a "${dumpPath}"`, {
    maxBuffer: 100 * 1024 * 1024,
    encoding: "utf-8",
  });

  const lines = raw.split("\n");
  for (const line of lines) {
    if (line.includes("0f7baccd-68fa-43fd-9e1c-5a2dceaa25df") || line.includes("6bfa6dae-7937-4fd1-b616-e1856592593a")) {
      console.log(line.slice(0, 250));
    }
  }

  await db.$disconnect();
}

main().catch(console.error);
