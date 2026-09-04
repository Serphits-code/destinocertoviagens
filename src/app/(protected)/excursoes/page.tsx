import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ExcursionsContent } from "./ExcursionsContent";

export default async function ExcursionsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const excursions = await db.excursion.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { blocks: true } } },
  });

  const serialized = excursions.map((e) => ({
    id: e.id,
    name: e.name,
    periodStart: e.periodStart?.toISOString() ?? null,
    periodEnd: e.periodEnd?.toISOString() ?? null,
    slots: e.slots,
    status: e.status,
    blocksCount: e._count.blocks,
  }));

  return <ExcursionsContent excursions={serialized} />;
}
