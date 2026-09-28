"use client";

import { useState, useTransition, useMemo } from "react";
import {
  User,
  Shield,
  KeyRound,
  Server,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Database,
  Users,
  Building2,
  Map,
  DollarSign,
  Lock,
  Sparkles,
  Loader2,
  UserPlus,
  Search,
  Headset,
  Trash2,
  Key,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Role } from "@prisma/client";
import {
  changePassword,
  updateUserRole,
  resetUserPassword,
  deleteUser,
  type UserListItem,
} from "./actions";
import { CreateUserModal } from "./CreateUserModal";

interface UserProfileData {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface SystemInfoData {
  environment: string;
  nodeVersion: string;
  counts: {
    users: number;
    customers: number;
    suppliers: number;
    financialEntries: number;
    excursions: number;
  };
}

interface SettingsContentProps {
  profile: UserProfileData;
  systemInfo: SystemInfoData;
  initialUsers: UserListItem[];
}

export function SettingsContent({
  profile,
  systemInfo,
  initialUsers,
}: SettingsContentProps) {
  const [activeTab, setActiveTab] = useState<
    "profile" | "security" | "users" | "system"
  >("profile");

  // Lista de Usuários e Modais
  const [users, setUsers] = useState<UserListItem[]>(initialUsers || []);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal de Redefinição de Senha de Colaborador
  const [resetModalUser, setResetModalUser] = useState<UserListItem | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState("");
  const [resetConfirmVal, setResetConfirmVal] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isResetPending, startResetTransition] = useTransition();
  const [resetError, setResetError] = useState<string | null>(null);

  // Estado de alteração de role inline
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Form de alteração da própria senha
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setFeedback({
        type: "error",
        message: "Preencha todos os campos obrigatórios.",
      });
      return;
    }

    if (newPassword.length < 8) {
      setFeedback({
        type: "error",
        message: "A nova senha deve ter no mínimo 8 caracteres.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({
        type: "error",
        message: "A nova senha e a confirmação não coincidem.",
      });
      return;
    }

    startTransition(async () => {
      const result = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (result.success) {
        setFeedback({
          type: "success",
          message:
            "Senha atualizada com sucesso! Suas próximas sessões exigirão a nova credencial.",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setFeedback({
          type: "error",
          message:
            result.error ||
            "Falha ao alterar senha. Verifique os dados informados.",
        });
      }
    });
  };

  // Callback ao criar um novo usuário
  const handleUserCreated = (newUser: UserListItem) => {
    setUsers((prev) => [newUser, ...prev]);
    setActionFeedback({
      type: "success",
      message: `Colaborador "${newUser.name}" cadastrado com sucesso como ${newUser.role}!`,
    });
    setTimeout(() => setActionFeedback(null), 5000);
  };

  // Alterar função de um usuário
  const handleRoleChange = async (userId: string, newRole: Role) => {
    setUpdatingRoleId(userId);
    setActionFeedback(null);

    const res = await updateUserRole({ userId, role: newRole });
    setUpdatingRoleId(null);

    if (res.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      setActionFeedback({
        type: "success",
        message: "Função do colaborador atualizada com sucesso!",
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } else {
      setActionFeedback({
        type: "error",
        message: res.error || "Erro ao atualizar função.",
      });
    }
  };

  // Excluir usuário
  const handleDeleteUser = async (user: UserListItem) => {
    if (user.id === profile.id) {
      alert("Você não pode excluir sua própria conta conectada.");
      return;
    }

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o acesso de "${user.name}" (${user.email})? Esta ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    setDeletingUserId(user.id);
    setActionFeedback(null);

    const res = await deleteUser({ userId: user.id });
    setDeletingUserId(null);

    if (res.success) {
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setActionFeedback({
        type: "success",
        message: `Usuário "${user.name}" removido com sucesso.`,
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } else {
      setActionFeedback({
        type: "error",
        message: res.error || "Erro ao excluir usuário.",
      });
    }
  };

  // Submeter redefinição de senha
  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;
    setResetError(null);

    if (!resetPasswordVal || resetPasswordVal.length < 6) {
      setResetError("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (resetPasswordVal !== resetConfirmVal) {
      setResetError("A nova senha e a confirmação não coincidem.");
      return;
    }

    startResetTransition(async () => {
      const res = await resetUserPassword({
        userId: resetModalUser.id,
        newPassword: resetPasswordVal,
      });

      if (res.success) {
        setActionFeedback({
          type: "success",
          message: `Senha de "${resetModalUser.name}" redefinida com sucesso!`,
        });
        setResetModalUser(null);
        setResetPasswordVal("");
        setResetConfirmVal("");
        setTimeout(() => setActionFeedback(null), 4000);
      } else {
        setResetError(res.error || "Falha ao redefinir a senha.");
      }
    });
  };

  // Filtro de usuários
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase());

      const matchesRole =
        roleFilter === "ALL" ? true : u.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, userSearch, roleFilter]);

  // Contadores de funções
  const stats = useMemo(() => {
    const admins = users.filter((u) => u.role === "ADMIN").length;
    const financeiros = users.filter((u) => u.role === "FINANCEIRO").length;
    const operadores = users.filter((u) => u.role === "OPERADOR").length;
    return {
      total: users.length,
      admins,
      financeiros,
      operadores,
    };
  }, [users]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            <Shield size={12} />
            Administrador
          </span>
        );
      case "FINANCEIRO":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <DollarSign size={12} />
            Financeiro
          </span>
        );
      case "OPERADOR":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <Headset size={12} />
            Operador
          </span>
        );
      case "ATENDENTE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
            Atendente
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-(--text-muted) mb-1">
            <span>Painel</span>
            <span>/</span>
            <span className="text-primary font-semibold">Configurações</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-orange-400 text-white flex items-center justify-center shadow-md shadow-primary/20">
              <Shield size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-(--text-title)">
                Configurações & Governança
              </h1>
              <p className="text-xs text-(--text-muted)">
                Gerencie credenciais, equipe, funções e parâmetros do sistema
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Abas com Transição Suave */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card) overflow-x-auto">
        <button
          onClick={() => {
            setActiveTab("profile");
            setFeedback(null);
          }}
          className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer overflow-hidden shrink-0 ${
            activeTab === "profile"
              ? "text-white"
              : "text-(--text-muted) hover:text-(--text-title)"
          }`}
        >
          {activeTab === "profile" && (
            <motion.div
              layoutId="active-settings-tab"
              className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-orange-500 shadow-md shadow-primary/25 z-0"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <User size={15} className="relative z-10" />
          <span className="relative z-10">Meu Perfil</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("users");
            setFeedback(null);
          }}
          className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer overflow-hidden shrink-0 ${
            activeTab === "users"
              ? "text-white"
              : "text-(--text-muted) hover:text-(--text-title)"
          }`}
        >
          {activeTab === "users" && (
            <motion.div
              layoutId="active-settings-tab"
              className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-orange-500 shadow-md shadow-primary/25 z-0"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <Users size={15} className="relative z-10" />
          <span className="relative z-10">Colaboradores & Acessos</span>
          <span className="relative z-10 text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-bold">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("security");
            setFeedback(null);
          }}
          className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer overflow-hidden shrink-0 ${
            activeTab === "security"
              ? "text-white"
              : "text-(--text-muted) hover:text-(--text-title)"
          }`}
        >
          {activeTab === "security" && (
            <motion.div
              layoutId="active-settings-tab"
              className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-orange-500 shadow-md shadow-primary/25 z-0"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <KeyRound size={15} className="relative z-10" />
          <span className="relative z-10">Segurança & Senha</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("system");
            setFeedback(null);
          }}
          className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer overflow-hidden shrink-0 ${
            activeTab === "system"
              ? "text-white"
              : "text-(--text-muted) hover:text-(--text-title)"
          }`}
        >
          {activeTab === "system" && (
            <motion.div
              layoutId="active-settings-tab"
              className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-orange-500 shadow-md shadow-primary/25 z-0"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <Server size={15} className="relative z-10" />
          <span className="relative z-10">Diagnóstico do Sistema</span>
        </button>
      </div>

      {/* Feedback de Ação Flutuante */}
      {actionFeedback && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`flex items-center gap-2.5 p-3.5 rounded-2xl text-xs font-semibold shadow-md ${
            actionFeedback.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400"
          }`}
        >
          {actionFeedback.type === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          <span>{actionFeedback.message}</span>
        </motion.div>
      )}

      {/* Conteúdo da Aba Ativa */}
      <AnimatePresence mode="wait">
        {/* ABA: MEU PERFIL */}
        {activeTab === "profile" && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Card de Identidade */}
            <div className="md:col-span-1 rounded-2xl bg-(--surface) border border-(--border) p-6 shadow-(--shadow-card) flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-primary to-orange-400 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-primary/25 mb-4">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-base font-bold text-(--text-title)">
                {profile.name}
              </h2>
              <p className="text-xs text-(--text-muted) mt-0.5 mb-3">
                {profile.email}
              </p>
              <div className="mb-4">{getRoleBadge(profile.role)}</div>
              <div className="w-full pt-4 border-t border-(--border) text-left space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-(--text-muted)">Membro desde</span>
                  <span className="font-semibold text-(--text-title)">
                    {new Date(profile.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            </div>

            {/* Detalhes do Perfil */}
            <div className="md:col-span-2 rounded-2xl bg-(--surface) border border-(--border) p-6 shadow-(--shadow-card) space-y-6">
              <div>
                <h3 className="text-sm font-bold text-(--text-title) flex items-center gap-2">
                  <User size={16} className="text-primary" />
                  <span>Dados Cadastrais</span>
                </h3>
                <p className="text-xs text-(--text-muted) mt-1">
                  Suas credenciais e informações de conta na agência
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-(--surface-subtle) border border-(--border)">
                  <span className="text-[11px] text-(--text-muted) font-semibold uppercase tracking-wider block">
                    Nome Completo
                  </span>
                  <span className="text-sm font-bold text-(--text-title) mt-1 block">
                    {profile.name}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-(--surface-subtle) border border-(--border)">
                  <span className="text-[11px] text-(--text-muted) font-semibold uppercase tracking-wider block">
                    E-mail de Acesso
                  </span>
                  <span className="text-sm font-bold text-(--text-title) mt-1 block">
                    {profile.email}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-(--surface-subtle) border border-(--border)">
                  <span className="text-[11px] text-(--text-muted) font-semibold uppercase tracking-wider block">
                    Nível de Acesso
                  </span>
                  <div className="mt-1.5">{getRoleBadge(profile.role)}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-(--surface-subtle) border border-(--border)">
                  <span className="text-[11px] text-(--text-muted) font-semibold uppercase tracking-wider block">
                    ID do Usuário
                  </span>
                  <span className="text-xs font-mono text-(--text-muted) mt-1 block truncate">
                    {profile.id}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs flex items-start gap-3">
                <Shield size={18} className="shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">Controle de Privilégios</span>
                  <span className="text-[11px] leading-relaxed block text-blue-600 dark:text-blue-400">
                    O nível de acesso define as ferramentas liberadas. Como{" "}
                    <strong>{profile.role}</strong>, você possui controle sobre as operações do sistema.
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ABA: COLABORADORES & ACESSOS (GESTÃO DE USUÁRIOS) */}
        {activeTab === "users" && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="space-y-6"
          >
            {/* Header da Seção de Usuários */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
              <div>
                <h2 className="text-base font-bold text-(--text-title) flex items-center gap-2">
                  <Users size={18} className="text-primary" />
                  <span>Gestão de Colaboradores & Funções</span>
                </h2>
                <p className="text-xs text-(--text-muted) mt-1">
                  Cadastre novos membros da equipe e defina o perfil de atuação
                  (Administrador, Financeiro ou Operador)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-orange-500 hover:from-primary-strong hover:to-orange-600 text-white text-xs font-bold shadow-md shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <UserPlus size={16} />
                <span>+ Novo Colaborador</span>
              </button>
            </div>

            {/* Cards de Métricas Rápidas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-(--text-muted)">
                    Total Equipe
                  </span>
                  <Users size={16} className="text-(--text-muted)" />
                </div>
                <div className="mt-2 text-2xl font-black text-(--text-title)">
                  {stats.total}
                </div>
                <span className="text-[10px] text-(--text-muted)">
                  contas cadastradas
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                    Administrador
                  </span>
                  <Shield size={16} className="text-purple-500" />
                </div>
                <div className="mt-2 text-2xl font-black text-(--text-title)">
                  {stats.admins}
                </div>
                <span className="text-[10px] text-(--text-muted)">
                  acesso irrestrito
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Financeiro
                  </span>
                  <DollarSign size={16} className="text-emerald-500" />
                </div>
                <div className="mt-2 text-2xl font-black text-(--text-title)">
                  {stats.financeiros}
                </div>
                <span className="text-[10px] text-(--text-muted)">
                  caixa e receitas
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    Operador
                  </span>
                  <Headset size={16} className="text-blue-500" />
                </div>
                <div className="mt-2 text-2xl font-black text-(--text-title)">
                  {stats.operadores}
                </div>
                <span className="text-[10px] text-(--text-muted)">
                  pacotes e viagens
                </span>
              </div>
            </div>

            {/* Barra de Filtros e Busca */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
              <div className="relative w-full sm:w-80">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-muted)"
                />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Pesquisar por nome ou e-mail..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-(--border) bg-(--surface-muted) text-(--text-title) text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-(--text-muted)"
                />
              </div>

              {/* Filtro de Papel */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {[
                  { id: "ALL", label: `Todos (${users.length})` },
                  { id: "ADMIN", label: `Admin (${stats.admins})` },
                  { id: "FINANCEIRO", label: `Financeiro (${stats.financeiros})` },
                  { id: "OPERADOR", label: `Operador (${stats.operadores})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setRoleFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      roleFilter === f.id
                        ? "bg-primary text-white shadow-xs"
                        : "bg-(--surface-muted) text-(--text-muted) hover:text-(--text-title)"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabela de Colaboradores */}
            <div className="rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card) overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-(--border) bg-(--surface-subtle) text-(--text-muted) text-[11px] uppercase tracking-wider font-semibold">
                      <th className="py-3.5 px-6">Colaborador</th>
                      <th className="py-3.5 px-4">Função / Cargo</th>
                      <th className="py-3.5 px-4">Data de Cadastro</th>
                      <th className="py-3.5 px-6 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border)">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-12 text-center text-(--text-muted)"
                        >
                          <Users size={32} className="mx-auto mb-2 opacity-40" />
                          <p className="text-sm font-semibold text-(--text-title)">
                            Nenhum colaborador encontrado
                          </p>
                          <p className="text-xs text-(--text-muted) mt-0.5">
                            Tente ajustar seus termos de busca ou filtros
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => {
                        const isSelf = user.id === profile.id;
                        const isUpdating = updatingRoleId === user.id;
                        const isDeleting = deletingUserId === user.id;

                        return (
                          <tr
                            key={user.id}
                            className="hover:bg-(--surface-subtle) transition-colors"
                          >
                            {/* Colaborador */}
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0 ${
                                    user.role === "ADMIN"
                                      ? "bg-purple-600"
                                      : user.role === "FINANCEIRO"
                                      ? "bg-emerald-600"
                                      : "bg-blue-600"
                                  }`}
                                >
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-(--text-title) truncate">
                                      {user.name}
                                    </span>
                                    {isSelf && (
                                      <span className="px-1.5 py-0.2 rounded-md bg-primary/15 text-primary text-[10px] font-bold">
                                        Você
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-(--text-muted) truncate block">
                                    {user.email}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Função com Seletor Rápido */}
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <select
                                  disabled={isUpdating}
                                  value={user.role}
                                  onChange={(e) =>
                                    handleRoleChange(
                                      user.id,
                                      e.target.value as Role
                                    )
                                  }
                                  className="px-2.5 py-1.5 rounded-xl border border-(--border) bg-(--surface-muted) text-(--text-title) text-xs font-semibold focus:outline-none focus:border-primary cursor-pointer disabled:opacity-50"
                                >
                                  <option value="ADMIN">👑 Administrador</option>
                                  <option value="FINANCEIRO">💰 Financeiro</option>
                                  <option value="OPERADOR">🎧 Operador</option>
                                </select>
                                {isUpdating && (
                                  <Loader2
                                    size={14}
                                    className="animate-spin text-primary shrink-0"
                                  />
                                )}
                              </div>
                            </td>

                            {/* Data */}
                            <td className="py-4 px-4 text-(--text-muted) text-[11px]">
                              {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                            </td>

                            {/* Ações */}
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Botão Redefinir Senha */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setResetModalUser(user);
                                    setResetPasswordVal("");
                                    setResetConfirmVal("");
                                    setResetError(null);
                                  }}
                                  title="Redefinir senha deste colaborador"
                                  className="p-1.5 rounded-lg text-(--text-muted) hover:text-primary hover:bg-(--surface-muted) transition-colors cursor-pointer"
                                >
                                  <Key size={15} />
                                </button>

                                {/* Botão Excluir */}
                                <button
                                  type="button"
                                  disabled={isSelf || isDeleting}
                                  onClick={() => handleDeleteUser(user)}
                                  title={
                                    isSelf
                                      ? "Você não pode excluir sua própria conta"
                                      : "Excluir colaborador"
                                  }
                                  className="p-1.5 rounded-lg text-(--text-muted) hover:text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  {isDeleting ? (
                                    <Loader2 size={15} className="animate-spin" />
                                  ) : (
                                    <Trash2 size={15} />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ABA: SEGURANÇA & SENHA */}
        {activeTab === "security" && (
          <motion.div
            key="security"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div className="md:col-span-2 rounded-2xl bg-(--surface) border border-(--border) p-6 shadow-(--shadow-card) space-y-6">
              <div>
                <h3 className="text-sm font-bold text-(--text-title) flex items-center gap-2">
                  <KeyRound size={16} className="text-primary" />
                  <span>Alteração de Senha Pessoal</span>
                </h3>
                <p className="text-xs text-(--text-muted) mt-1">
                  Recomendamos utilizar senhas fortes com números e símbolos
                </p>
              </div>

              {feedback && (
                <div
                  className={`p-4 rounded-xl text-xs flex items-start gap-2.5 ${
                    feedback.type === "success"
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      : "bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300"
                  }`}
                >
                  {feedback.type === "success" ? (
                    <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-(--text-title) mb-1.5">
                    Senha Atual *
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-(--border) bg-(--surface-muted) text-(--text-title) text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-(--text-muted) pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-muted) hover:text-(--text-title)"
                    >
                      {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-(--text-title) mb-1.5">
                      Nova Senha *
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-(--border) bg-(--surface-muted) text-(--text-title) text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-(--text-muted) pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-muted) hover:text-(--text-title)"
                      >
                        {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-(--text-title) mb-1.5">
                      Confirmar Nova Senha *
                    </label>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-(--border) bg-(--surface-muted) text-(--text-title) text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-(--text-muted)"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-orange-500 hover:from-primary-strong hover:to-orange-600 text-white text-xs font-bold shadow-md shadow-primary/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  >
                    {isPending ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Atualizando...</span>
                      </>
                    ) : (
                      <>
                        <Lock size={14} />
                        <span>Atualizar Senha</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            <div className="md:col-span-1 rounded-2xl bg-(--surface) border border-(--border) p-6 shadow-(--shadow-card) space-y-4">
              <h4 className="text-xs font-bold text-(--text-title) uppercase tracking-wider">
                Diretrizes de Segurança
              </h4>
              <ul className="space-y-3 text-xs text-(--text-muted)">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <span>Nunca compartilhe sua senha de acesso com terceiros.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <span>Use no mínimo 8 caracteres para proteção das credenciais.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <span>A senha é criptografada com algoritmo seguro bcrypt.</span>
                </li>
              </ul>
            </div>
          </motion.div>
        )}

        {/* ABA: DIAGNÓSTICO DO SISTEMA */}
        {activeTab === "system" && (
          <motion.div
            key="system"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="space-y-6"
          >
            {/* Contadores Gerais */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-(--text-muted)">
                    Usuários
                  </span>
                  <Users size={16} className="text-primary" />
                </div>
                <div className="mt-2 text-2xl font-black text-(--text-title)">
                  {systemInfo.counts.users}
                </div>
                <span className="text-[10px] text-(--text-muted)">
                  contas no sistema
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-(--text-muted)">
                    Clientes
                  </span>
                  <User size={16} className="text-blue-500" />
                </div>
                <div className="mt-2 text-2xl font-black text-(--text-title)">
                  {systemInfo.counts.customers}
                </div>
                <span className="text-[10px] text-(--text-muted)">
                  passageiros / cadastros
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-(--text-muted)">
                    Fornecedores
                  </span>
                  <Building2 size={16} className="text-emerald-500" />
                </div>
                <div className="mt-2 text-2xl font-black text-(--text-title)">
                  {systemInfo.counts.suppliers}
                </div>
                <span className="text-[10px] text-(--text-muted)">
                  parceiros comerciais
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-(--text-muted)">
                    Financeiro
                  </span>
                  <DollarSign size={16} className="text-amber-500" />
                </div>
                <div className="mt-2 text-2xl font-black text-(--text-title)">
                  {systemInfo.counts.financialEntries}
                </div>
                <span className="text-[10px] text-(--text-muted)">
                  títulos registrados
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-(--text-muted)">
                    Excursões
                  </span>
                  <Map size={16} className="text-purple-500" />
                </div>
                <div className="mt-2 text-2xl font-black text-(--text-title)">
                  {systemInfo.counts.excursions}
                </div>
                <span className="text-[10px] text-(--text-muted)">
                  pacotes criados
                </span>
              </div>
            </div>

            {/* Diagnóstico Técnico */}
            <div className="rounded-2xl bg-(--surface) border border-(--border) p-6 shadow-(--shadow-card) space-y-4">
              <h3 className="text-sm font-bold text-(--text-title) flex items-center gap-2">
                <Database size={16} className="text-primary" />
                <span>Parâmetros de Ambiente & Banco de Dados</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-(--surface-subtle) border border-(--border)">
                  <span className="text-[11px] text-(--text-muted) font-semibold uppercase tracking-wider block">
                    Ambiente de Execução
                  </span>
                  <span className="text-sm font-bold text-(--text-title) mt-1 block uppercase">
                    {systemInfo.environment}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-(--surface-subtle) border border-(--border)">
                  <span className="text-[11px] text-(--text-muted) font-semibold uppercase tracking-wider block">
                    Versão do Node.js
                  </span>
                  <span className="text-sm font-mono font-bold text-(--text-title) mt-1 block">
                    {systemInfo.nodeVersion}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-(--surface-subtle) border border-(--border)">
                  <span className="text-[11px] text-(--text-muted) font-semibold uppercase tracking-wider block">
                    Banco de Dados Conectado
                  </span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 block flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    PostgreSQL 16 (Ativo)
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Cadastrar Colaborador */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onUserCreated={handleUserCreated}
      />

      {/* Modal de Redefinir Senha de Colaborador */}
      <AnimatePresence>
        {resetModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setResetModalUser(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-md rounded-3xl bg-(--surface) border border-(--border) shadow-2xl overflow-hidden z-10 p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
                    <Key size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-(--text-title)">
                      Redefinir Senha
                    </h3>
                    <p className="text-xs text-(--text-muted)">
                      {resetModalUser.name} ({resetModalUser.email})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="text-(--text-muted) hover:text-(--text-title)"
                >
                  <X size={18} />
                </button>
              </div>

              {resetError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{resetError}</span>
                </div>
              )}

              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-(--text-title) mb-1.5">
                    Nova Senha de Acesso *
                  </label>
                  <div className="relative">
                    <input
                      type={showResetPassword ? "text" : "password"}
                      required
                      value={resetPasswordVal}
                      onChange={(e) => setResetPasswordVal(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-(--border) bg-(--surface-muted) text-(--text-title) text-xs focus:outline-none focus:border-primary pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-muted)"
                    >
                      {showResetPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-(--text-title) mb-1.5">
                    Confirmar Nova Senha *
                  </label>
                  <input
                    type={showResetPassword ? "text" : "password"}
                    required
                    value={resetConfirmVal}
                    onChange={(e) => setResetConfirmVal(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-(--border) bg-(--surface-muted) text-(--text-title) text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setResetModalUser(null)}
                    className="px-4 py-2 rounded-xl border border-(--border) text-xs font-semibold text-(--text-muted) hover:text-(--text-title)"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isResetPending}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary-strong disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isResetPending && <Loader2 size={13} className="animate-spin" />}
                    <span>Salvar Nova Senha</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
