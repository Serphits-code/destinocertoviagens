"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, requireWritePermission } from "@/lib/auth-guards";

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  dueDate: string | null;
  customerName: string | null;
  customerId: string | null;
  assignedToName: string | null;
  createdAt: string;
  historyCount: number;
}

export async function getTasks(params?: {
  status?: string;
  priority?: string;
  search?: string;
}) {
  await requireAuth();

  const where: any = {};

  if (params?.status && params.status !== "ALL") {
    where.status = params.status;
  }

  if (params?.priority && params.priority !== "ALL") {
    where.priority = params.priority;
  }

  if (params?.search && params.search.trim()) {
    const q = params.search.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { customer: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [total, pending, inProgress, done, rows] = await Promise.all([
    db.task.count({ where }),
    db.task.count({ where: { status: "PENDENTE" } }),
    db.task.count({ where: { status: "EM_ANDAMENTO" } }),
    db.task.count({ where: { status: "CONCLUIDA" } }),
    db.task.findMany({
      where,
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        customer: { select: { id: true, name: true } },
        assignedTo: { select: { name: true } },
        _count: { select: { history: true } },
      },
    }),
  ]);

  const tasks: TaskItem[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    priority: r.priority,
    status: r.status,
    dueDate: r.dueDate ? r.dueDate.toISOString().slice(0, 10) : null,
    customerName: r.customer?.name || null,
    customerId: r.customer?.id || null,
    assignedToName: r.assignedTo?.name || null,
    createdAt: r.createdAt.toISOString().slice(0, 10),
    historyCount: r._count.history,
  }));

  return {
    tasks,
    counts: {
      total,
      pending,
      inProgress,
      done,
    },
  };
}

export async function updateTaskStatus(taskId: string, status: string) {
  const session = await requireWritePermission();

  const task = await db.task.update({
    where: { id: taskId },
    data: { status },
  });

  await db.taskHistory.create({
    data: {
      taskId,
      actionNote: `Status alterado para ${status}`,
      authorName: session.user?.name || "Operador",
    },
  });

  revalidatePath("/tarefas");
  return { success: true, task };
}

export async function createTask(data: {
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  dueDate?: string;
  customerId?: string;
}) {
  const session = await requireWritePermission();

  if (!data.title.trim()) throw new Error("Título da tarefa é obrigatório.");

  const task = await db.task.create({
    data: {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      category: data.category || "Atendimento",
      priority: data.priority || "MEDIA",
      dueDate: data.dueDate ? new Date(`${data.dueDate}T12:00:00.000Z`) : null,
      customerId: data.customerId || null,
      assignedToId: session.user?.id || null,
    },
  });

  await db.taskHistory.create({
    data: {
      taskId: task.id,
      actionNote: "Tarefa criada no sistema",
      authorName: session.user?.name || "Operador",
    },
  });

  revalidatePath("/tarefas");
  return { success: true, task };
}
