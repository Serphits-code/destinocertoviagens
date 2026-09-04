import { auth } from "@/lib/auth";

export interface AuthenticatedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: "ADMIN" | "ATENDENTE" | "VISUALIZADOR" | string;
}

/**
 * Obtém a sessão atual ou retorna null se não autenticado.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: (session.user as any).role || "ATENDENTE",
  };
}

/**
 * Garante que o usuário está autenticado. Lança erro ou retorna o usuário autenticado.
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Acesso negado: você precisa estar autenticado para realizar esta ação.");
  }
  return user;
}

/**
 * Garante que o usuário autenticado possui o papel de ADMIN.
 */
export async function requireAdmin(): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    throw new Error("Acesso não autorizado: esta operação exige privilégios de administrador.");
  }
  return user;
}

/**
 * Garante que o usuário autenticado não possui papel de apenas VISUALIZADOR para operações de escrita.
 */
export async function requireWritePermission(): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (user.role === "VISUALIZADOR") {
    throw new Error("Acesso não autorizado: perfil de visualização não possui permissão de escrita.");
  }
  return user;
}
