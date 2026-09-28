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

export interface AddonGuestVoucher {
  voucherCode?: string;
  emitted?: boolean;
  emittedAt?: string;
  sent?: boolean;
  sentAt?: string;
  notes?: string;
}

export interface InterestedLead {
  id: string;
  name: string;
  phone: string;
  lastContactDate?: string;
  notes?: string;
  createdAt: string;
}

export interface ExcursionAddon {
  id: string;
  title: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  observation?: string;
  emiteVoucher?: boolean;
  vouchers?: Record<string, AddonGuestVoucher>;
  canalVendaNome?: string;
  canalVendaContato?: string;
  valorUnitario?: string;
  valorTotal?: string;
  sinalUnitario?: string;
  sinalTotal?: string;
  prazoSinal?: string;
  prazoPagamentoTotal?: string;
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
      interestedLeads?: InterestedLead[];
    };

export async function updateExcursionAddons(
  excursionId: string,
  payload: ExcursionAddonsPayload
) {
  await requireWritePermission();

  const current = await db.excursion.findUnique({
    where: { id: excursionId },
    select: { addonsJson: true },
  });

  const raw = (current?.addonsJson as any) || {};
  const existingLeads = Array.isArray(raw) ? [] : raw.interestedLeads || [];

  const finalPayload = Array.isArray(payload)
    ? { addons: payload, interestedLeads: existingLeads }
    : { ...payload, interestedLeads: payload.interestedLeads ?? existingLeads };

  await db.excursion.update({
    where: { id: excursionId },
    data: {
      addonsJson: finalPayload as any,
    },
  });

  revalidatePath(`/excursoes/${excursionId}`);
  return { success: true };
}

export async function updateExcursionLeads(
  excursionId: string,
  leads: InterestedLead[]
) {
  await requireWritePermission();

  const current = await db.excursion.findUnique({
    where: { id: excursionId },
    select: { addonsJson: true },
  });

  const raw = (current?.addonsJson as any) || {};
  const currentAddons = Array.isArray(raw) ? raw : raw.addons || [];
  const currentPayments = Array.isArray(raw) ? {} : raw.guestPayments || {};

  const payload = {
    addons: currentAddons,
    guestPayments: currentPayments,
    interestedLeads: leads,
  };

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
