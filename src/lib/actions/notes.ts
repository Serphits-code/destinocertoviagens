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

export type NoteType = "sticky" | "text";

export interface NoteItem {
  id: string;
  userId: string;
  type: NoteType;
  fontSize?: string | null;
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

export interface DrawingItem {
  id: string;
  userId: string;
  pathData: string;
  color: string;
  strokeWidth: number;
  createdAt: Date;
}

export async function getUserNotes(): Promise<NoteItem[]> {
  const user = await requireAuth();

  const notes = await db.note.findMany({
    where: { userId: user.id },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });

  return notes.map((n) => ({
    ...n,
    type: (n.type as NoteType) || "sticky",
    color: (n.color as NoteColor) || "yellow",
  }));
}

export async function createNote(data?: {
  type?: NoteType;
  fontSize?: string;
  title?: string;
  content?: string;
  color?: NoteColor;
  posX?: number;
  posY?: number;
  sticker?: string;
}): Promise<NoteItem> {
  const user = await requireAuth();

  const isText = data?.type === "text";
  const randomRotation = isText ? 0 : Number(((Math.random() - 0.5) * 4).toFixed(1));

  const note = await db.note.create({
    data: {
      userId: user.id,
      type: data?.type || "sticky",
      fontSize: data?.fontSize || (isText ? "xl" : "base"),
      title: data?.title || "",
      content: data?.content || "",
      color: data?.color || (isText ? "white" : "yellow"),
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
    type: (note.type as NoteType) || "sticky",
    color: (note.color as NoteColor) || "yellow",
  };
}

export async function updateNote(
  id: string,
  data: Partial<{
    title: string | null;
    content: string;
    color: NoteColor;
    fontSize: string | null;
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

// ---- Canvas Drawings (Rabisco e Desenhos à mão livre estilo Miro) ----

export async function getUserDrawings(): Promise<DrawingItem[]> {
  const user = await requireAuth();

  const drawings = await db.canvasDrawing.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return drawings;
}

export async function saveDrawing(
  pathData: string,
  color: string = "#F59E0B",
  strokeWidth: number = 3
): Promise<DrawingItem> {
  const user = await requireAuth();

  const drawing = await db.canvasDrawing.create({
    data: {
      userId: user.id,
      pathData,
      color,
      strokeWidth,
    },
  });

  return drawing;
}

export async function undoLastDrawing(): Promise<{ success: boolean }> {
  const user = await requireAuth();

  const lastDrawing = await db.canvasDrawing.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  if (lastDrawing) {
    await db.canvasDrawing.delete({
      where: { id: lastDrawing.id },
    });
  }

  return { success: true };
}

export async function clearUserDrawings(): Promise<{ success: boolean }> {
  const user = await requireAuth();

  await db.canvasDrawing.deleteMany({
    where: { userId: user.id },
  });

  return { success: true };
}
