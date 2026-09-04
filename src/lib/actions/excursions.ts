"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  requireAuth,
  requireWritePermission,
  requireAdmin,
} from "@/lib/auth-guards";

const excursionSchema = z.object({
  name: z.string().min(3, "Nome deve ter ao menos 3 caracteres"),
  destination: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  slots: z.coerce.number().int().min(0).default(0),
  status: z.enum(["RASCUNHO", "ATIVA", "ENCERRADA"]).default("RASCUNHO"),
});

export type ExcursionFormState = {
  error?: string;
  success?: boolean;
  excursionId?: string;
};

export async function createExcursion(
  _prev: ExcursionFormState,
  formData: FormData
): Promise<ExcursionFormState> {
  const user = await requireWritePermission();

  const parsed = excursionSchema.safeParse({
    name: formData.get("name"),
    destination: formData.get("destination") || undefined,
    latitude: formData.get("latitude") ? Number(formData.get("latitude")) : undefined,
    longitude: formData.get("longitude") ? Number(formData.get("longitude")) : undefined,
    periodStart: formData.get("periodStart") || undefined,
    periodEnd: formData.get("periodEnd") || undefined,
    slots: formData.get("slots") || 0,
    status: formData.get("status") || "RASCUNHO",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, destination, latitude, longitude, periodStart, periodEnd, slots, status } =
    parsed.data;

  const created = await db.excursion.create({
    data: {
      name,
      destination: destination || null,
      latitude: latitude !== undefined ? latitude : null,
      longitude: longitude !== undefined ? longitude : null,
      periodStart: periodStart ? new Date(periodStart + "T12:00:00") : null,
      periodEnd: periodEnd ? new Date(periodEnd + "T12:00:00") : null,
      slots,
      status,
      createdById: user.id,
    },
  });

  revalidatePath("/excursoes");
  return { success: true, excursionId: created.id };
}

export async function createExcursionDirect(data: {
  name: string;
  destination?: string;
  destinations?: Array<{ name: string; latitude: number; longitude: number }>;
  latitude?: number;
  longitude?: number;
  periodStart?: string;
  periodEnd?: string;
  slots?: number;
  status?: "RASCUNHO" | "ATIVA" | "ENCERRADA";
}): Promise<{ success: boolean; excursionId?: string; error?: string }> {
  const user = await requireWritePermission();

  const parsed = excursionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { name, destination, latitude, longitude, periodStart, periodEnd, slots, status } =
    parsed.data;

  try {
    const created = await db.excursion.create({
      data: {
        name,
        destination: destination || null,
        destinationsJson: data.destinations ? (data.destinations as any) : null,
        latitude: latitude !== undefined ? latitude : null,
        longitude: longitude !== undefined ? longitude : null,
        periodStart: periodStart ? new Date(periodStart + "T12:00:00") : null,
        periodEnd: periodEnd ? new Date(periodEnd + "T12:00:00") : null,
        slots,
        status,
        createdById: user.id,
      } as any,
    });

    revalidatePath("/excursoes");
    return { success: true, excursionId: created.id };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao criar excursão." };
  }
}

export async function updateExcursionStatus(
  id: string,
  status: "RASCUNHO" | "ATIVA" | "ENCERRADA"
) {
  await requireWritePermission();

  await db.excursion.update({ where: { id }, data: { status } });
  revalidatePath("/excursoes");
  return { success: true };
}

export async function deleteExcursion(id: string) {
  try {
    await requireAdmin();

    await db.excursion.delete({ where: { id } });
    revalidatePath("/excursoes");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao excluir excursão." };
  }
}

export async function duplicateExcursion(
  id: string
): Promise<{ success: boolean; newExcursionId?: string; error?: string }> {
  const user = await requireWritePermission();

  try {
    const original = await db.excursion.findUnique({
      where: { id },
      include: { blocks: { orderBy: { order: "asc" } } },
    });

    if (!original) {
      return { success: false, error: "Excursão não encontrada." };
    }

    const duplicated = await db.excursion.create({
      data: {
        name: `${original.name} (Cópia)`,
        destination: original.destination,
        destinationsJson: (original as any).destinationsJson,
        latitude: original.latitude,
        longitude: original.longitude,
        periodStart: original.periodStart,
        periodEnd: original.periodEnd,
        slots: original.slots,
        status: "RASCUNHO",
        itineraryJson: original.itineraryJson as any,
        createdById: user.id,
        blocks: {
          create: original.blocks.map((b) => ({
            type: b.type,
            title: b.title,
            order: b.order,
            collapsed: b.collapsed,
            configJson: b.configJson as any,
          })),
        },
      } as any,
    });

    revalidatePath("/excursoes");
    return { success: true, newExcursionId: duplicated.id };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Erro ao duplicar excursão.",
    };
  }
}

export async function updateExcursionBasicData(
  id: string,
  data: {
    name: string;
    destination?: string;
    destinations?: Array<{ name: string; latitude: number; longitude: number }>;
    latitude?: number;
    longitude?: number;
    periodStart?: string;
    periodEnd?: string;
    slots?: number;
    status?: "RASCUNHO" | "ATIVA" | "ENCERRADA";
  }
): Promise<{ success: boolean; error?: string }> {
  await requireWritePermission();

  try {
    await db.excursion.update({
      where: { id },
      data: {
        name: data.name,
        destination: data.destination || null,
        destinationsJson: data.destinations ? (data.destinations as any) : null,
        latitude: data.latitude !== undefined ? data.latitude : null,
        longitude: data.longitude !== undefined ? data.longitude : null,
        periodStart: data.periodStart
          ? new Date(data.periodStart + "T12:00:00")
          : null,
        periodEnd: data.periodEnd
          ? new Date(data.periodEnd + "T12:00:00")
          : null,
        slots: data.slots !== undefined ? data.slots : 0,
        status: data.status || "RASCUNHO",
      } as any,
    });

    revalidatePath("/excursoes");
    revalidatePath(`/excursoes/${id}`);
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Erro ao atualizar dados da excursão.",
    };
  }
}
