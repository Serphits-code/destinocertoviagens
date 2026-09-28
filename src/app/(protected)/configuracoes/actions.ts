"use server";

import { db } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth-guards";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";

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

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

/**
 * Retorna todos os colaboradores cadastrados no sistema
 */
export async function getUsersList(): Promise<UserListItem[]> {
  await requireAuth();

  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }));
}

const createUserSchema = z.object({
  name: z.string().trim().min(2, "O nome deve conter no mínimo 2 caracteres."),
  email: z.string().trim().email("Formato de e-mail inválido.").toLowerCase(),
  password: z.string().min(6, "A senha provisória deve ter no mínimo 6 caracteres."),
  role: z.enum(["ADMIN", "FINANCEIRO", "OPERADOR", "ATENDENTE", "VISUALIZADOR"] as const),
});

/**
 * Cadastra um novo usuário com função definida (Administrador, Financeiro ou Operador)
 */
export async function createUser(formData: {
  name: string;
  email: string;
  password: string;
  role: Role;
}): Promise<{ success: boolean; user?: UserListItem; error?: string }> {
  try {
    await requireAdmin();

    const parsed = createUserSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const existing = await db.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (existing) {
      return {
        success: false,
        error: "Já existe um usuário cadastrado com este endereço de e-mail.",
      };
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    const newUser = await db.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: parsed.data.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    revalidatePath("/configuracoes");

    return {
      success: true,
      user: {
        ...newUser,
        createdAt: newUser.createdAt.toISOString(),
        updatedAt: newUser.updatedAt.toISOString(),
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Falha ao cadastrar colaborador.",
    };
  }
}

/**
 * Atualiza o cargo / função de um colaborador existente
 */
export async function updateUserRole(data: {
  userId: string;
  role: Role;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await requireAdmin();

    if (!data.userId || !data.role) {
      return { success: false, error: "Parâmetros obrigatórios ausentes." };
    }

    const targetUser = await db.user.findUnique({
      where: { id: data.userId },
    });

    if (!targetUser) {
      return { success: false, error: "Usuário não encontrado." };
    }

    // Se o próprio administrador logado está alterando seu cargo para algo que não seja ADMIN,
    // verifica se existe pelo menos mais um administrador ativo no sistema
    if (targetUser.id === currentUser.id && data.role !== "ADMIN") {
      const adminCount = await db.user.count({
        where: { role: "ADMIN" },
      });
      if (adminCount <= 1) {
        return {
          success: false,
          error: "Você é o único Administrador ativo no sistema e não pode rebaixar seu próprio perfil.",
        };
      }
    }

    await db.user.update({
      where: { id: data.userId },
      data: { role: data.role },
    });

    revalidatePath("/configuracoes");
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Falha ao atualizar o cargo do usuário.",
    };
  }
}

/**
 * Redefine a senha de um colaborador pelo Administrador
 */
export async function resetUserPassword(data: {
  userId: string;
  newPassword: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();

    if (!data.userId || !data.newPassword || data.newPassword.length < 6) {
      return {
        success: false,
        error: "A nova senha deve ter no mínimo 6 caracteres.",
      };
    }

    const targetUser = await db.user.findUnique({
      where: { id: data.userId },
    });

    if (!targetUser) {
      return { success: false, error: "Usuário não encontrado." };
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 10);

    await db.user.update({
      where: { id: data.userId },
      data: { passwordHash },
    });

    revalidatePath("/configuracoes");
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Falha ao redefinir a senha do colaborador.",
    };
  }
}

/**
 * Exclui um colaborador do sistema
 */
export async function deleteUser(data: {
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await requireAdmin();

    if (data.userId === currentUser.id) {
      return {
        success: false,
        error: "Você não pode excluir sua própria conta enquanto estiver conectado a ela.",
      };
    }

    const targetUser = await db.user.findUnique({
      where: { id: data.userId },
    });

    if (!targetUser) {
      return { success: false, error: "Usuário não encontrado." };
    }

    if (targetUser.role === "ADMIN") {
      const adminCount = await db.user.count({
        where: { role: "ADMIN" },
      });
      if (adminCount <= 1) {
        return {
          success: false,
          error: "Não é possível excluir o único administrador do sistema.",
        };
      }
    }

    await db.user.delete({
      where: { id: data.userId },
    });

    revalidatePath("/configuracoes");
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Falha ao excluir o colaborador.",
    };
  }
}
