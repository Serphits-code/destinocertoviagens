"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/cockpit";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("E-mail ou senha inválidos.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Erro ao fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-surface rounded-2xl shadow-shadow-card border border-border p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Image
              src="/logo-color.svg"
              alt="Destino Certo"
              width={180}
              height={60}
              className="h-14 w-auto dark:hidden"
              priority
            />
            <Image
              src="/logo-white.svg"
              alt="Destino Certo"
              width={180}
              height={60}
              className="h-14 w-auto hidden dark:block"
              priority
            />
          </div>

          <h1 className="text-2xl font-bold text-text-title text-center mb-2">
            Bem-vindo de volta
          </h1>
          <p className="text-text-muted text-center mb-8">
            Acesse o sistema de gestão de excursões
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text-title mb-1.5"
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface-subtle text-text-body focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text-title mb-1.5"
              >
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface-subtle text-text-body focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-status-danger bg-status-danger-bg px-3 py-2 rounded-lg"
              >
                {error}
              </motion.p>
            )}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-contrast font-semibold hover:bg-primary-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Entrando..." : "Entrar"}
            </motion.button>
          </form>
        </div>

        <p className="text-center text-text-muted text-sm mt-6">
          Agência Destino Certo • Gestão de Excursões
        </p>
      </motion.div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background">Carregando...</div>}>
      <LoginForm />
    </Suspense>
  );
}
