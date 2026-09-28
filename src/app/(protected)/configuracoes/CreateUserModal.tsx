"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  UserPlus,
  Shield,
  DollarSign,
  Headset,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Mail,
  User as UserIcon,
} from "lucide-react";
import type { Role } from "@prisma/client";
import { createUser, type UserListItem } from "./actions";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: (user: UserListItem) => void;
}

export function CreateUserModal({
  isOpen,
  onClose,
  onUserCreated,
}: CreateUserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>("OPERADOR");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setRole("OPERADOR");
    setShowPassword(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !password) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }

    if (password.length < 6) {
      setError("A senha provisória deve conter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("A senha e a confirmação não coincidem.");
      return;
    }

    startTransition(async () => {
      const result = await createUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });

      if (result.success && result.user) {
        onUserCreated(result.user);
        handleClose();
      } else {
        setError(result.error || "Falha ao cadastrar o usuário.");
      }
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop com blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="relative w-full max-w-xl rounded-3xl bg-(--surface) border border-(--border) shadow-2xl overflow-hidden z-10 my-8"
          >
            {/* Header com gradiente sutil */}
            <div className="px-6 py-5 border-b border-(--border) flex items-center justify-between bg-(--surface-subtle)">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-orange-500 text-white flex items-center justify-center shadow-md shadow-primary/25">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-(--text-title)">
                    Cadastrar Novo Colaborador
                  </h3>
                  <p className="text-xs text-(--text-muted)">
                    Crie a conta de acesso e atribua o nível de permissão
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-(--text-muted) hover:text-(--text-title) hover:bg-(--surface-muted) transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Alerta de erro */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs"
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Nome e E-mail */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-(--text-title) mb-1.5">
                    Nome Completo *
                  </label>
                  <div className="relative">
                    <UserIcon
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-muted)"
                    />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="ex: Mariana Souza"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-(--border) bg-(--surface-muted) text-(--text-title) text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-(--text-muted)"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-(--text-title) mb-1.5">
                    E-mail Corporativo *
                  </label>
                  <div className="relative">
                    <Mail
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-muted)"
                    />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ex: mariana@destinocerto.com"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-(--border) bg-(--surface-muted) text-(--text-title) text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-(--text-muted)"
                    />
                  </div>
                </div>
              </div>

              {/* Senhas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-(--text-title) mb-1.5">
                    Senha de Acesso *
                  </label>
                  <div className="relative">
                    <Lock
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-muted)"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-(--border) bg-(--surface-muted) text-(--text-title) text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-(--text-muted)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-muted) hover:text-(--text-title)"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-(--text-title) mb-1.5">
                    Confirmar Senha *
                  </label>
                  <div className="relative">
                    <Lock
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-muted)"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a senha"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-(--border) bg-(--surface-muted) text-(--text-title) text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-(--text-muted)"
                    />
                  </div>
                </div>
              </div>

              {/* Seleção do Nível / Função */}
              <div>
                <label className="block text-xs font-bold text-(--text-title) mb-2">
                  Função / Nível de Acesso do Colaborador *
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Administrador */}
                  <div
                    onClick={() => setRole("ADMIN")}
                    className={`cursor-pointer rounded-2xl border p-3.5 transition-all flex flex-col justify-between ${
                      role === "ADMIN"
                        ? "border-purple-500 bg-purple-500/10 shadow-sm"
                        : "border-(--border) bg-(--surface-muted) hover:border-(--border-strong)"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <Shield size={16} />
                      </div>
                      {role === "ADMIN" && (
                        <CheckCircle2 size={16} className="text-purple-600 dark:text-purple-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-(--text-title) mb-0.5">
                        Administrador
                      </h4>
                      <p className="text-[10px] text-(--text-muted) leading-relaxed">
                        Acesso irrestrito a configurações, dados e equipe.
                      </p>
                    </div>
                  </div>

                  {/* Financeiro */}
                  <div
                    onClick={() => setRole("FINANCEIRO")}
                    className={`cursor-pointer rounded-2xl border p-3.5 transition-all flex flex-col justify-between ${
                      role === "FINANCEIRO"
                        ? "border-emerald-500 bg-emerald-500/10 shadow-sm"
                        : "border-(--border) bg-(--surface-muted) hover:border-(--border-strong)"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <DollarSign size={16} />
                      </div>
                      {role === "FINANCEIRO" && (
                        <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-(--text-title) mb-0.5">
                        Financeiro
                      </h4>
                      <p className="text-[10px] text-(--text-muted) leading-relaxed">
                        Acesso ao fluxo de caixa, contas e conciliações.
                      </p>
                    </div>
                  </div>

                  {/* Operador */}
                  <div
                    onClick={() => setRole("OPERADOR")}
                    className={`cursor-pointer rounded-2xl border p-3.5 transition-all flex flex-col justify-between ${
                      role === "OPERADOR"
                        ? "border-blue-500 bg-blue-500/10 shadow-sm"
                        : "border-(--border) bg-(--surface-muted) hover:border-(--border-strong)"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Headset size={16} />
                      </div>
                      {role === "OPERADOR" && (
                        <CheckCircle2 size={16} className="text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-(--text-title) mb-0.5">
                        Operador
                      </h4>
                      <p className="text-[10px] text-(--text-muted) leading-relaxed">
                        Gestão de pacotes, passageiros e excursões.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ações do Rodapé */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="px-4 py-2.5 rounded-xl border border-(--border) bg-(--surface-muted) text-(--text-body) hover:bg-(--surface-subtle) text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-orange-500 hover:from-primary-strong hover:to-orange-600 text-white text-xs font-bold shadow-md shadow-primary/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} />
                      <span>Cadastrar Colaborador</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
