"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireWritePermission } from "@/lib/auth-guards";

export interface ItineraryItem {
  id: string;
  day?: number; // 1, 2, 3...
  time: string;
  title: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export async function updateExcursionItinerary(
  excursionId: string,
  itinerary: ItineraryItem[]
) {
  await requireWritePermission();

  await db.excursion.update({
    where: { id: excursionId },
    data: {
      itineraryJson: itinerary as any,
    },
  });

  revalidatePath(`/excursoes/${excursionId}`);
  return { success: true };
}
