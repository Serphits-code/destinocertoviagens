"use client";

import { useState, useTransition } from "react";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { changePassword } from "./actions";

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
}

export function SettingsContent({ profile, systemInfo }: SettingsContentProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "system">("profile");

  // Form de alteração de senha
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setFeedback({ type: "error", message: "Preencha todos os campos obrigatórios." });
      return;
    }

    if (newPassword.length < 8) {
      setFeedback({ type: "error", message: "A nova senha deve ter no mínimo 8 caracteres." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({ type: "error", message: "A nova senha e a confirmação não coincidem." });
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
          message: "Senha atualizada com sucesso! Suas próximas sessões exigirão a nova credencial.",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setFeedback({
          type: "error",
          message: result.error || "Falha ao alterar senha. Verifique os dados informados.",
        });
      }
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
            Administrador
          </span>
        );
      case "ATENDENTE":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            Atendente
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30">
            Visualizador
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
              <Shield size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-(--text-title)">
                Configurações & Perfil
              </h1>
              <p className="text-xs text-(--text-muted)">
                Gerencie sua conta, credenciais de acesso e visualize o status operacional do sistema
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Abas com Transição Suave */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
        <button
          onClick={() => {
            setActiveTab("profile");
            setFeedback(null);
          }}
          className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer overflow-hidden ${
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
            setActiveTab("security");
            setFeedback(null);
          }}
          className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer overflow-hidden ${
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
          className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer overflow-hidden ${
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

      {/* Conteúdo da Aba Ativa */}
      <AnimatePresence mode="wait">
        {activeTab === "profile" && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Card de Identidade do Usuário */}
            <div className="md:col-span-1 rounded-2xl bg-(--surface) border border-(--border) p-6 shadow-(--shadow-card) flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-primary to-orange-400 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-primary/25 mb-4">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-base font-bold text-(--text-title)">
                {profile.name}
              </h2>
              <p className="text-xs text-(--text-muted) mt-0.5 font-mono">
                {profile.email}
              </p>
              <div className="mt-4">
                {getRoleBadge(profile.role)}
              </div>
              <div className="w-full border-t border-(--border) mt-6 pt-4 text-left space-y-2.5 text-xs text-(--text-muted)">
                <div className="flex items-center justify-between">
                  <span>ID do Usuário:</span>
                  <span className="font-mono text-[11px] text-(--text-title) truncate max-w-[120px]">
                    {profile.id}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Membro desde:</span>
                  <span className="text-(--text-title) font-medium">
                    {new Date(profile.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            </div>

            {/* Informações da Conta e Privilégios */}
            <div className="md:col-span-2 rounded-2xl bg-(--surface) border border-(--border) p-6 shadow-(--shadow-card) space-y-5">
              <div className="border-b border-(--border) pb-4">
                <h3 className="text-sm font-bold text-(--text-title)">
                  Dados da Conta & Permissões
                </h3>
                <p className="text-xs text-(--text-muted) mt-0.5">
                  Informações de autenticação e escopo de atuação no sistema Destino Certo
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-(--surface-subtle) border border-(--border)">
                  <span className="text-[11px] font-semibold text-(--text-muted) uppercase tracking-wider block">
                    Nome Completo
                  </span>
                  <p className="text-sm font-semibold text-(--text-title) mt-1">
                    {profile.name}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-(--surface-subtle) border border-(--border)">
                  <span className="text-[11px] font-semibold text-(--text-muted) uppercase tracking-wider block">
                    E-mail Corporativo
                  </span>
                  <p className="text-sm font-mono text-(--text-title) mt-1">
                    {profile.email}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-(--surface-subtle) border border-(--border)">
                  <span className="text-[11px] font-semibold text-(--text-muted) uppercase tracking-wider block">
                    Nível de Acesso (RBAC)
                  </span>
                  <div className="mt-1.5 flex items-center gap-2">
                    {getRoleBadge(profile.role)}
                    <span className="text-xs text-(--text-muted)">
                      {profile.role === "ADMIN" ? "Acesso Total" : "Operacional"}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-(--surface-subtle) border border-(--border)">
                  <span className="text-[11px] font-semibold text-(--text-muted) uppercase tracking-wider block">
                    Status da Sessão
                  </span>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Autenticado via JWT Seguro</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs text-orange-700 dark:text-orange-300 flex items-start gap-3">
                <Sparkles size={18} className="shrink-0 text-primary mt-0.5" />
                <div>
                  <strong className="font-semibold block text-primary">Controle de Segurança Ativo</strong>
                  <span>
                    Todas as ações críticas (criação, edição e exclusão) são auditadas e protegidas por barreiras de controle de acesso por papel (RBAC).
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "security" && (
          <motion.div
            key="security"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="rounded-2xl bg-(--surface) border border-(--border) p-6 shadow-(--shadow-card) max-w-2xl mx-auto space-y-6"
          >
            <div>
              <h2 className="text-base font-bold text-(--text-title) flex items-center gap-2">
                <Lock size={18} className="text-primary" />
                <span>Alterar Senha de Acesso</span>
              </h2>
              <p className="text-xs text-(--text-muted) mt-1">
                Defina uma nova senha forte para manter sua conta protegida. Mínimo de 8 caracteres.
              </p>
            </div>

            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl text-xs flex items-start gap-2.5 border ${
                  feedback.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                    : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                )}
                <span>{feedback.message}</span>
              </motion.div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Senha Atual */}
              <div>
                <label className="block text-xs font-semibold text-(--text-title) mb-1.5">
                  Senha Atual
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Digite sua senha atual"
                    required
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-xs text-(--text-title) placeholder:text-(--text-muted) focus:outline-none focus:border-primary/60 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-muted) hover:text-(--text-title) transition-colors"
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Nova Senha */}
              <div>
                <label className="block text-xs font-semibold text-(--text-title) mb-1.5">
                  Nova Senha (mínimo 8 caracteres)
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite a nova senha segura"
                    required
                    minLength={8}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-xs text-(--text-title) placeholder:text-(--text-muted) focus:outline-none focus:border-primary/60 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-muted) hover:text-(--text-title) transition-colors"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirmar Nova Senha */}
              <div>
                <label className="block text-xs font-semibold text-(--text-title) mb-1.5">
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  required
                  minLength={8}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-subtle) border border-(--border) text-xs text-(--text-title) placeholder:text-(--text-muted) focus:outline-none focus:border-primary/60 transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-primary to-orange-500 hover:from-primary-strong hover:to-primary text-white text-xs font-bold shadow-md shadow-primary/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Atualizando senha com bcrypt...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Salvar Nova Senha</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {activeTab === "system" && (
          <motion.div
            key="system"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="space-y-6"
          >
            {/* Cards de Métricas da Base de Dados */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
              <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
                <div className="flex items-center justify-between text-primary mb-2">
                  <span className="text-xs font-semibold text-(--text-muted)">Clientes</span>
                  <Users size={16} />
                </div>
                <p className="text-2xl font-bold text-(--text-title)">
                  {systemInfo.counts.customers.toLocaleString("pt-BR")}
                </p>
                <span className="text-[11px] text-(--text-muted)">Cadastrados</span>
              </div>

              <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
                <div className="flex items-center justify-between text-indigo-500 mb-2">
                  <span className="text-xs font-semibold text-(--text-muted)">Viagens</span>
                  <Map size={16} />
                </div>
                <p className="text-2xl font-bold text-(--text-title)">
                  {systemInfo.counts.excursions.toLocaleString("pt-BR")}
                </p>
                <span className="text-[11px] text-(--text-muted)">Excursões ativas</span>
              </div>

              <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
                <div className="flex items-center justify-between text-blue-500 mb-2">
                  <span className="text-xs font-semibold text-(--text-muted)">Parceiros</span>
                  <Building2 size={16} />
                </div>
                <p className="text-2xl font-bold text-(--text-title)">
                  {systemInfo.counts.suppliers.toLocaleString("pt-BR")}
                </p>
                <span className="text-[11px] text-(--text-muted)">Fornecedores</span>
              </div>

              <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
                <div className="flex items-center justify-between text-emerald-500 mb-2">
                  <span className="text-xs font-semibold text-(--text-muted)">Financeiro</span>
                  <DollarSign size={16} />
                </div>
                <p className="text-2xl font-bold text-(--text-title)">
                  {systemInfo.counts.financialEntries.toLocaleString("pt-BR")}
                </p>
                <span className="text-[11px] text-(--text-muted)">Lançamentos</span>
              </div>

              <div className="p-4 rounded-2xl bg-(--surface) border border-(--border) shadow-(--shadow-card)">
                <div className="flex items-center justify-between text-amber-500 mb-2">
                  <span className="text-xs font-semibold text-(--text-muted)">Equipe</span>
                  <User size={16} />
                </div>
                <p className="text-2xl font-bold text-(--text-title)">
                  {systemInfo.counts.users.toLocaleString("pt-BR")}
                </p>
                <span className="text-[11px] text-(--text-muted)">Usuários do sistema</span>
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
    </div>
  );
}
