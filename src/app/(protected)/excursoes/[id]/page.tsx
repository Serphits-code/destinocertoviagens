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

  const rawAddons = (excursion.addonsJson as any) ?? [];
  const initialAddons = Array.isArray(rawAddons)
    ? rawAddons
    : Array.isArray(rawAddons?.addons)
    ? rawAddons.addons
    : [];
  const initialGuestPayments = Array.isArray(rawAddons)
    ? {}
    : rawAddons?.guestPayments || {};
  const initialInterestedLeads = Array.isArray(rawAddons)
    ? []
    : Array.isArray(rawAddons?.interestedLeads)
    ? rawAddons.interestedLeads
    : [];
  const initialRoomPricing = Array.isArray(rawAddons)
    ? {}
    : rawAddons?.roomPricing || {};
  const initialGuestPaymentModes = Array.isArray(rawAddons)
    ? {}
    : rawAddons?.guestPaymentModes || {};

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
      initialAddons={initialAddons}
      initialGuestPayments={initialGuestPayments}
      initialInterestedLeads={initialInterestedLeads}
      initialRoomPricing={initialRoomPricing}
      initialGuestPaymentModes={initialGuestPaymentModes}
      initialProfitMargin={excursion.profitMargin ?? 0}
      initialCustomProfitAmount={excursion.customProfitAmount ?? null}
      initialCustomPackagePrice={excursion.customPackagePrice ?? null}
      currentUser={{
        id: session.user.id,
        name: session.user.name || session.user.email?.split("@")[0] || "Usuário",
        email: session.user.email || null,
      }}
    />
  );
}
