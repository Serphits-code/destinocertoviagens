import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PackageEditor } from "./PackageEditor";
import type { EditorBlock, BlockCategoryId, BlockData } from "@/lib/editor-types";

export default async function ExcursionEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const excursion = await db.excursion.findUnique({
    where: { id },
    include: { blocks: { orderBy: { order: "asc" } } },
  });

  if (!excursion) notFound();

  const blocks: EditorBlock[] = excursion.blocks.map((b) => ({
    id: b.id,
    categoryId: b.type as BlockCategoryId,
    title: b.title,
    order: b.order,
    collapsed: b.collapsed,
    data: b.configJson as BlockData,
  }));

  return (
    <PackageEditor
      excursionId={excursion.id}
      initialName={excursion.name}
      initialDestination={excursion.destination}
      initialDestinations={(excursion as any).destinationsJson || []}
      initialLatitude={excursion.latitude}
      initialLongitude={excursion.longitude}
      initialPeriodStart={excursion.periodStart?.toISOString().slice(0, 10) ?? null}
      initialPeriodEnd={excursion.periodEnd?.toISOString().slice(0, 10) ?? null}
      initialSlots={excursion.slots}
      initialBlocks={blocks}
      initialItinerary={(excursion.itineraryJson as any) ?? []}
    />
  );
}
