"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";

export type NoteColor =
  | "yellow"
  | "blue"
  | "green"
  | "pink"
  | "purple"
  | "orange"
  | "white";

export interface NoteItem {
  id: string;
  userId: string;
  title: string | null;
  content: string;
  color: NoteColor;
  posX: number;
  posY: number;
  rotation: number;
  sticker: string | null;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function getUserNotes(): Promise<NoteItem[]> {
  const user = await requireAuth();

  const notes = await db.note.findMany({
    where: { userId: user.id },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });

  return notes.map((n) => ({
    ...n,
    color: (n.color as NoteColor) || "yellow",
  }));
}

export async function createNote(data?: {
  title?: string;
  content?: string;
  color?: NoteColor;
  posX?: number;
  posY?: number;
  sticker?: string;
}): Promise<NoteItem> {
  const user = await requireAuth();

  // Gera uma leve rotação orgânica aleatória entre -2.5 e +2.5 graus (estilo post-it Miro)
  const randomRotation = Number(((Math.random() - 0.5) * 5).toFixed(1));

  const note = await db.note.create({
    data: {
      userId: user.id,
      title: data?.title || "",
      content: data?.content || "",
      color: data?.color || "yellow",
      posX: data?.posX ?? Math.floor(Math.random() * 300 + 80),
      posY: data?.posY ?? Math.floor(Math.random() * 200 + 80),
      rotation: randomRotation,
      sticker: data?.sticker || null,
      pinned: false,
    },
  });

  revalidatePath("/notas");
  return {
    ...note,
    color: (note.color as NoteColor) || "yellow",
  };
}

export async function updateNote(
  id: string,
  data: Partial<{
    title: string | null;
    content: string;
    color: NoteColor;
    sticker: string | null;
    pinned: boolean;
    posX: number;
    posY: number;
    rotation: number;
  }>
) {
  const user = await requireAuth();

  await db.note.updateMany({
    where: { id, userId: user.id },
    data,
  });

  revalidatePath("/notas");
  return { success: true };
}

export async function updateNotePosition(id: string, posX: number, posY: number) {
  const user = await requireAuth();

  await db.note.updateMany({
    where: { id, userId: user.id },
    data: { posX, posY },
  });

  return { success: true };
}

export async function deleteNote(id: string) {
  const user = await requireAuth();

  await db.note.deleteMany({
    where: { id, userId: user.id },
  });

  revalidatePath("/notas");
  return { success: true };
}
