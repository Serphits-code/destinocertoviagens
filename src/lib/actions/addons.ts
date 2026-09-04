"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireWritePermission } from "@/lib/auth-guards";

export interface ExcursionAddon {
  id: string;
  title: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  observation?: string;
  price: number;
  assignedGuestIds: string[];
}

export async function updateExcursionAddons(
  excursionId: string,
  addons: ExcursionAddon[]
) {
  await requireWritePermission();

  await db.excursion.update({
    where: { id: excursionId },
    data: {
      addonsJson: addons as any,
    },
  });

  revalidatePath(`/excursoes/${excursionId}`);
  return { success: true };
}

export async function updateExcursionProfitMargin(
  excursionId: string,
  profitMargin: number
) {
  await requireWritePermission();

  await db.excursion.update({
    where: { id: excursionId },
    data: {
      profitMargin: Number(profitMargin) || 0,
    },
  });

  revalidatePath(`/excursoes/${excursionId}`);
  return { success: true };
}
