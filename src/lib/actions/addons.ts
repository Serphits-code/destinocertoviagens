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

export interface RoomTypePricing {
  cashPrice: number;
  installmentExtra: number;
  cardFee: number;
}

export type ExcursionAddonsPayload =
  | ExcursionAddon[]
  | {
      addons: ExcursionAddon[];
      guestPayments?: Record<string, AddonGuestPayment>;
      interestedLeads?: InterestedLead[];
      roomPricing?: Record<string, RoomTypePricing>;
      guestPaymentModes?: Record<string, "vista" | "prazo">;
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
  const existingRoomPricing = Array.isArray(raw) ? {} : raw.roomPricing || {};
  const existingPaymentModes = Array.isArray(raw) ? {} : raw.guestPaymentModes || {};

  const finalPayload = Array.isArray(payload)
    ? {
        addons: payload,
        interestedLeads: existingLeads,
        roomPricing: existingRoomPricing,
        guestPaymentModes: existingPaymentModes,
      }
    : {
        ...payload,
        interestedLeads: payload.interestedLeads ?? existingLeads,
        roomPricing: payload.roomPricing ?? existingRoomPricing,
        guestPaymentModes: payload.guestPaymentModes ?? existingPaymentModes,
      };

  await db.excursion.update({
    where: { id: excursionId },
    data: {
      addonsJson: finalPayload as any,
    },
  });

  revalidatePath(`/excursoes/${excursionId}`);
  return { success: true };
}

export async function updateExcursionCheckoutConfig(
  excursionId: string,
  data: {
    roomPricing?: Record<string, RoomTypePricing>;
    guestPaymentModes?: Record<string, "vista" | "prazo">;
    profitMargin?: number;
  }
) {
  await requireWritePermission();

  const current = await db.excursion.findUnique({
    where: { id: excursionId },
    select: { addonsJson: true },
  });

  const raw = (current?.addonsJson as any) || {};
  const currentAddons = Array.isArray(raw) ? raw : raw.addons || [];
  const currentPayments = Array.isArray(raw) ? {} : raw.guestPayments || {};
  const currentLeads = Array.isArray(raw) ? [] : raw.interestedLeads || [];
  const currentRoomPricing = Array.isArray(raw) ? {} : raw.roomPricing || {};
  const currentModes = Array.isArray(raw) ? {} : raw.guestPaymentModes || {};

  const payload = {
    addons: currentAddons,
    guestPayments: currentPayments,
    interestedLeads: currentLeads,
    roomPricing: data.roomPricing ?? currentRoomPricing,
    guestPaymentModes: data.guestPaymentModes ?? currentModes,
  };

  const updateData: any = {
    addonsJson: payload as any,
  };

  if (data.profitMargin !== undefined) {
    updateData.profitMargin = Number(data.profitMargin) || 0;
  }

  await db.excursion.update({
    where: { id: excursionId },
    data: updateData,
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
  return updateExcursionPricing(excursionId, { profitMargin });
}

export async function updateExcursionPricing(
  excursionId: string,
  data: {
    profitMargin?: number;
    customProfitAmount?: number | null;
    customPackagePrice?: number | null;
  }
) {
  await requireWritePermission();

  const updateData: any = {};
  if (data.profitMargin !== undefined) {
    updateData.profitMargin = Number(data.profitMargin) || 0;
  }
  if (data.customProfitAmount !== undefined) {
    updateData.customProfitAmount = data.customProfitAmount !== null ? Number(data.customProfitAmount) : null;
  }
  if (data.customPackagePrice !== undefined) {
    updateData.customPackagePrice = data.customPackagePrice !== null ? Number(data.customPackagePrice) : null;
  }

  await db.excursion.update({
    where: { id: excursionId },
    data: updateData,
  });

  revalidatePath(`/excursoes/${excursionId}`);
  return { success: true };
}
