"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { CATEGORY_DEFINITIONS } from "@/lib/categories";
import type { BlockCategoryId, BlockData } from "@/lib/editor-types";

async function requireAuth() {
  const session = await auth();
  if (!session) throw new Error("Não autenticado.");
  return session;
}

// ---- Cabeçalho do pacote ----

export async function updateExcursionHeader(
  excursionId: string,
  data: {
    name?: string;
    periodStart?: string | null;
    periodEnd?: string | null;
    slots?: number;
  }
) {
  await requireAuth();

  await db.excursion.update({
    where: { id: excursionId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.periodStart !== undefined && {
        periodStart: data.periodStart ? new Date(data.periodStart + "T12:00:00") : null,
      }),
      ...(data.periodEnd !== undefined && {
        periodEnd: data.periodEnd ? new Date(data.periodEnd + "T12:00:00") : null,
      }),
      ...(data.slots !== undefined && { slots: data.slots }),
    },
  });

  revalidatePath(`/excursoes/${excursionId}`);
  revalidatePath("/excursoes");
  return { success: true };
}

// ---- CRUD de blocos ----

export async function addBlock(
  excursionId: string,
  categoryId: BlockCategoryId,
  insertIndex?: number
) {
  await requireAuth();
  const catDef = CATEGORY_DEFINITIONS[categoryId] ?? CATEGORY_DEFINITIONS.personalizada;
  const data = JSON.parse(JSON.stringify(catDef.defaultData)) as BlockData;

  const count = await db.block.count({ where: { excursionId } });
  const order = insertIndex !== undefined ? insertIndex : count;

  if (insertIndex !== undefined) {
    await db.block.updateMany({
      where: { excursionId, order: { gte: insertIndex } },
      data: { order: { increment: 1 } },
    });
  }

  const block = await db.block.create({
    data: {
      excursionId,
      type: categoryId,
      title: data.title as string,
      order,
      configJson: data,
    },
  });

  revalidatePath(`/excursoes/${excursionId}`);
  return { success: true, blockId: block.id };
}

export async function addBlockFromPreset(
  excursionId: string,
  presetId: string,
  insertIndex?: number
) {
  await requireAuth();
  const preset = await db.preset.findUnique({ where: { id: presetId } });
  if (!preset) return { error: "Preset não encontrado." };

  const payload = preset.payloadJson as { categoryId: BlockCategoryId; data: BlockData };
  const count = await db.block.count({ where: { excursionId } });
  const order = insertIndex !== undefined ? insertIndex : count;

  if (insertIndex !== undefined) {
    await db.block.updateMany({
      where: { excursionId, order: { gte: insertIndex } },
      data: { order: { increment: 1 } },
    });
  }

  const block = await db.block.create({
    data: {
      excursionId,
      type: payload.categoryId,
      title: (payload.data.title as string) ?? preset.name,
      order,
      configJson: payload.data,
    },
  });

  revalidatePath(`/excursoes/${excursionId}`);
  return { success: true, blockId: block.id };
}

export async function updateBlockData(
  blockId: string,
  data: BlockData,
  title?: string
) {
  await requireAuth();

  const block = await db.block.update({
    where: { id: blockId },
    data: {
      configJson: data,
      ...(title !== undefined && { title }),
    },
  });

  revalidatePath(`/excursoes/${block.excursionId}`);
  return { success: true };
}

export async function deleteBlock(blockId: string) {
  await requireAuth();
  const block = await db.block.delete({ where: { id: blockId } });

  // Reordena os blocos restantes
  await db.$executeRaw`
    UPDATE "Block" SET "order" = "order" - 1
    WHERE "excursionId" = ${block.excursionId} AND "order" > ${block.order}
  `;

  revalidatePath(`/excursoes/${block.excursionId}`);
  return { success: true };
}

export async function duplicateBlock(blockId: string) {
  await requireAuth();
  const original = await db.block.findUnique({ where: { id: blockId } });
  if (!original) return { error: "Bloco não encontrado." };

  await db.block.updateMany({
    where: { excursionId: original.excursionId, order: { gt: original.order } },
    data: { order: { increment: 1 } },
  });

  const data = JSON.parse(JSON.stringify(original.configJson)) as BlockData;
  data.title = `${original.title} (Cópia)`;

  const block = await db.block.create({
    data: {
      excursionId: original.excursionId,
      type: original.type,
      title: data.title as string,
      order: original.order + 1,
      configJson: data,
    },
  });

  revalidatePath(`/excursoes/${original.excursionId}`);
  return { success: true, blockId: block.id };
}

export async function reorderBlocks(excursionId: string, orderedIds: string[]) {
  await requireAuth();

  await db.$transaction(
    orderedIds.map((id, index) =>
      db.block.update({ where: { id }, data: { order: index } })
    )
  );

  revalidatePath(`/excursoes/${excursionId}`);
  return { success: true };
}

export async function toggleBlockCollapsed(blockId: string, collapsed: boolean) {
  await requireAuth();
  const block = await db.block.update({
    where: { id: blockId },
    data: { collapsed },
  });
  revalidatePath(`/excursoes/${block.excursionId}`);
  return { success: true };
}

// ---- Presets ----

export async function saveBlockPreset(blockId: string, name: string) {
  const session = await requireAuth();
  const block = await db.block.findUnique({ where: { id: blockId } });
  if (!block) return { error: "Bloco não encontrado." };

  await db.preset.create({
    data: {
      name,
      type: "BLOCO",
      payloadJson: {
        categoryId: block.type,
        data: block.configJson as BlockData,
      },
      createdById: session.user.id,
    },
  });

  return { success: true };
}

export async function listBlockPresets() {
  await requireAuth();
  const presets = await db.preset.findMany({
    where: { type: "BLOCO" },
    orderBy: { createdAt: "desc" },
  });

  return presets.map((p) => ({
    id: p.id,
    name: p.name,
    categoryId: (p.payloadJson as { categoryId: string }).categoryId,
  }));
}
