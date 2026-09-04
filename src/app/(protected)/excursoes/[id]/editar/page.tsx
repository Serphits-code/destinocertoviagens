import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { EditExcursionContent } from "./EditExcursionContent";

export default async function EditExcursionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const excursion = await db.excursion.findUnique({
    where: { id },
  });

  if (!excursion) notFound();

  return (
    <EditExcursionContent
      excursion={{
        id: excursion.id,
        name: excursion.name,
        destination: excursion.destination,
        destinationsJson: (excursion as any).destinationsJson,
        latitude: excursion.latitude,
        longitude: excursion.longitude,
        periodStart: excursion.periodStart?.toISOString().slice(0, 10) ?? null,
        periodEnd: excursion.periodEnd?.toISOString().slice(0, 10) ?? null,
        slots: excursion.slots,
        status: excursion.status as any,
      }}
    />
  );
}
