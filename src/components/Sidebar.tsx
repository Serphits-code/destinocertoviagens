"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Map,
  Users,
  Building2,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Share2,
  StickyNote,
} from "lucide-react";
import { signOut } from "next-auth/react";

const menuItems = [
  { icon: LayoutDashboard, label: "Cockpit", href: "/cockpit" },
  { icon: Map, label: "Excursões", href: "/excursoes" },
  { icon: Users, label: "Clientes & Passageiros", href: "/clientes" },
  { icon: StickyNote, label: "Quadro de Notas", href: "/notas" },
  { icon: Share2, label: "Rede Social", href: "/rede-social" },
  { icon: Building2, label: "Fornecedores & Parceiros", href: "/fornecedores" },
  { icon: Settings, label: "Configurações", href: "/configuracoes" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 76 : 260 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-0 h-screen bg-secondary text-white flex flex-col z-40 shadow-2xl border-r border-white/5 select-none"
    >
      {/* Header com Logo Ampliada e Tipografia de Marca */}
      <div className="h-20 flex items-center justify-center border-b border-white/10 px-4 shrink-0">
        <AnimatePresence mode="wait">
          {collapsed ? (
            <motion.div
              key="collapsed-logo"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-1.5 shadow-sm hover:border-primary/40 transition-colors"
              title="Destino Certo"
            >
              <Image
                src="/logo-white.svg"
                alt="Destino Certo"
                width={36}
                height={36}
                className="w-full h-full object-contain"
                priority
              />
            </motion.div>
          ) : (
            <motion.div
              key="full-logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 w-full px-1"
            >
              {/* Símbolo do Logo em Destaque Visual */}
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-1 shrink-0 shadow-sm">
                <Image
                  src="/logo-white.svg"
                  alt="Destino Certo"
                  width={44}
                  height={44}
                  className="w-full h-full object-contain drop-shadow-md"
                  priority
                />
              </div>

              {/* Tipografia de Identidade Visual */}
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-[15px] tracking-wide text-white leading-tight uppercase truncate font-sans">
                  Destino Certo
                </span>
                <span className="text-[10px] uppercase tracking-[0.22em] font-bold text-primary truncate mt-0.5">
                  Turismo & Viagens
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navegação Principal do Menu */}
      <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href} className="block group">
              <motion.div
                whileHover={{ x: collapsed ? 0 : 3 }}
                transition={{ duration: 0.15 }}
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-primary to-[#ff7a22] text-white font-bold shadow-lg shadow-primary/25 border border-primary-strong/40"
                    : "text-slate-300/75 hover:text-white bg-transparent hover:bg-white/[0.06] border border-transparent hover:border-white/10"
                }`}
              >
                {/* Indicador Branco na borda esquerda apenas quando ativo */}
                {isActive && (
                  <div className="w-1.5 h-4 rounded-full bg-white shrink-0 -ml-0.5 shadow-xs" />
                )}

                {/* Ícone com destaque: Laranja no hover inativo, Branco no ativo */}
                <Icon
                  size={19}
                  className={`shrink-0 transition-colors ${
                    isActive
                      ? "text-white drop-shadow-xs"
                      : "text-slate-400 group-hover:text-primary"
                  }`}
                />

                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className={`whitespace-nowrap overflow-hidden text-sm ${
                        isActive ? "font-bold text-white" : "font-medium"
                      }`}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Ações do Rodapé (Sair e Recolher) */}
      <div className="p-3 border-t border-white/10 space-y-1.5 shrink-0">
        {/* Sair do Sistema */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-rose-400 bg-transparent hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all text-xs font-semibold cursor-pointer group"
          title="Sair do sistema"
        >
          <LogOut size={18} className="shrink-0 group-hover:translate-x-0.5 transition-transform" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap"
              >
                Sair
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Recolher / Expandir Menu Lateral */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white bg-transparent hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition-all text-xs font-semibold cursor-pointer"
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? (
            <ChevronRight size={18} className="shrink-0" />
          ) : (
            <ChevronLeft size={18} className="shrink-0" />
          )}
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap"
              >
                Recolher
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
