"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";
import bcrypt from "bcryptjs";
import { z } from "zod";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória."),
  newPassword: z.string().min(8, "A nova senha deve ter no mínimo 8 caracteres."),
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória."),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "A nova senha e a confirmação não coincidem.",
  path: ["confirmPassword"],
});

export async function getUserProfile() {
  const authUser = await requireAuth();

  const user = await db.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function changePassword(formData: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const authUser = await requireAuth();

    const parsed = passwordSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const user = await db.user.findUnique({
      where: { id: authUser.id },
    });

    if (!user) {
      return { success: false, error: "Usuário não encontrado." };
    }

    const isCurrentValid = await bcrypt.compare(
      parsed.data.currentPassword,
      user.passwordHash
    );

    if (!isCurrentValid) {
      return { success: false, error: "A senha atual informada está incorreta." };
    }

    // Não permitir reutilização imediata da mesma senha
    const isSamePassword = await bcrypt.compare(
      parsed.data.newPassword,
      user.passwordHash
    );

    if (isSamePassword) {
      return {
        success: false,
        error: "A nova senha não pode ser idêntica à senha atual.",
      };
    }

    const newHash = await bcrypt.hash(parsed.data.newPassword, 10);

    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Erro inesperado ao alterar a senha.",
    };
  }
}

export async function getSystemInfo() {
  await requireAuth();

  const [
    usersCount,
    customersCount,
    suppliersCount,
    financialEntriesCount,
    excursionsCount,
  ] = await Promise.all([
    db.user.count(),
    db.customer.count(),
    db.supplier.count(),
    db.financialEntry.count(),
    db.excursion.count(),
  ]);

  return {
    environment: process.env.NODE_ENV || "development",
    nodeVersion: process.version,
    counts: {
      users: usersCount,
      customers: customersCount,
      suppliers: suppliersCount,
      financialEntries: financialEntriesCount,
      excursions: excursionsCount,
    },
  };
}
