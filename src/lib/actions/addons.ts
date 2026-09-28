"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireWritePermission } from "@/lib/auth-guards";

export interface AddonAgeTier {
  id: string;
  label?: string; // Ex: "0 a 3 anos (Bebê)"
  minAge: number; // Ex: 0
  maxAge: number; // Ex: 3
  cost: number;   // Custo
  profit: number; // Lucro
  price: number;  // Custo + Lucro
}

export interface AddonGuestPayment {
  paymentMethod?: string;
  paid?: boolean;
  paidAt?: string;
}

export interface ExcursionAddon {
  id: string;
  title: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  observation?: string;
  price: number;
  cost?: number;
  profit?: number;
  ageTiers?: AddonAgeTier[];
  assignedGuestIds: string[];
}

export type ExcursionAddonsPayload =
  | ExcursionAddon[]
  | {
      addons: ExcursionAddon[];
      guestPayments?: Record<string, AddonGuestPayment>;
    };

export async function updateExcursionAddons(
  excursionId: string,
  payload: ExcursionAddonsPayload
) {
  await requireWritePermission();

  await db.excursion.update({
    where: { id: excursionId },
    data: {
      addonsJson: payload as any,
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
