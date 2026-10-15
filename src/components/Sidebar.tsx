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
  ChevronDown,
  Share2,
  StickyNote,
  Cake,
  Landmark,
  Receipt,
  CreditCard,
  Coins,
  CheckSquare,
  Target,
  Code2,
  BarChart3,
} from "lucide-react";
import { signOut } from "next-auth/react";

interface SubMenuItem {
  icon: any;
  label: string;
  href: string;
}

interface MenuItem {
  icon: any;
  label: string;
  href: string;
  isGroupOnly?: boolean;
  badge?: string;
  subItems?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  { icon: Map, label: "Excursões", href: "/excursoes" },
  {
    icon: Users,
    label: "Clientes & Passageiros",
    href: "/clientes",
    subItems: [
      { icon: Cake, label: "Aniversariantes", href: "/clientes/aniversariantes" },
    ],
  },
  { icon: Building2, label: "Fornecedores & Parceiros", href: "/fornecedores" },
  { icon: StickyNote, label: "Quadro de Notas", href: "/notas" },
  { icon: Share2, label: "Rede Social", href: "/rede-social" },
  {
    icon: Code2,
    label: "(EM DEV)",
    href: "#dev",
    isGroupOnly: true,
    badge: "DEV",
    subItems: [
      { icon: LayoutDashboard, label: "Cockpit", href: "/cockpit" },
      { icon: Landmark, label: "Extrato Bancário", href: "/financeiro/extrato" },
      { icon: Coins, label: "Livro Caixa", href: "/financeiro/caixa" },
      { icon: CreditCard, label: "Recebimento por Tipo", href: "/financeiro/recebimentos" },
      { icon: Receipt, label: "Vendas & Emissões", href: "/vendas" },
      { icon: CheckSquare, label: "Tarefas & CRM", href: "/tarefas" },
      { icon: Target, label: "Vendedores & Metas", href: "/vendedores" },
    ],
  },
  { icon: Settings, label: "Configurações", href: "/configuracoes" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    "/clientes": true,
  });
  const pathname = usePathname();

  const toggleSubmenu = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenSubmenus((prev) => {
      const current =
        prev[href] !== undefined
          ? prev[href]
          : menuItems.find((m) => m.href === href)?.subItems?.some((sub) => pathname === sub.href) ||
            (href !== "#dev" && pathname.startsWith(href));
      return { ...prev, [href]: !current };
    });
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 76 : 268 }}
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
      <nav className="flex-1 py-4 px-2.5 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const hasSubItems = Boolean(item.subItems && item.subItems.length > 0);
          const isSubActive = hasSubItems && item.subItems?.some((sub) => pathname === sub.href);
          const isParentActive =
            !item.isGroupOnly && (pathname === item.href || (pathname.startsWith(item.href) && !isSubActive));
          const isSubmenuOpen =
            openSubmenus[item.href] !== undefined
              ? openSubmenus[item.href]
              : isSubActive || (item.href !== "#dev" && pathname.startsWith(item.href));
          const Icon = item.icon;
          const isGroupOnly = Boolean(item.isGroupOnly);

          return (
            <div key={item.href} className="space-y-1">
              {item.isGroupOnly && (
                <div className="pt-2 pb-1 px-2">
                  <div className="h-px bg-white/10 w-full" />
                </div>
              )}

              {isGroupOnly ? (
                <button
                  type="button"
                  onClick={(e) => toggleSubmenu(item.href, e)}
                  className="w-full text-left block group relative"
                  title={collapsed ? item.label : undefined}
                >
                  <motion.div
                    whileHover={{ x: collapsed ? 0 : 2 }}
                    whileTap={{ scale: 0.985 }}
                    transition={{ duration: 0.15 }}
                    className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors duration-200 cursor-pointer overflow-hidden ${
                      isSubActive
                        ? "text-amber-300 bg-amber-500/10 border border-amber-500/25 font-semibold"
                        : "text-slate-300/80 hover:text-amber-200 hover:bg-amber-500/5 border border-transparent"
                    }`}
                  >
                    {/* Cápsula Indicadora Âmbar na borda esquerda quando subitem ativo */}
                    {isSubActive && (
                      <motion.div
                        layoutId="active-dev-capsule"
                        className="w-1.5 h-4 rounded-full bg-amber-400 shrink-0 -ml-0.5 shadow-sm z-10"
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30,
                        }}
                      />
                    )}

                    {/* Ícone com destaque */}
                    <Icon
                      size={19}
                      className={`shrink-0 transition-colors z-10 ${
                        isSubActive
                          ? "text-amber-400 drop-shadow-xs"
                          : "text-amber-400/80 group-hover:text-amber-300"
                      }`}
                    />

                    <AnimatePresence>
                      {!collapsed && (
                        <motion.div
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          className="flex-1 flex items-center justify-between min-w-0 z-10"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`truncate text-[13px] tracking-tight ${
                                isSubActive
                                  ? "font-bold text-amber-300"
                                  : "font-semibold text-amber-400/90 group-hover:text-amber-200"
                              }`}
                            >
                              {item.label}
                            </span>
                            {item.badge && (
                              <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                {item.badge}
                              </span>
                            )}
                          </div>

                          <div className="p-1 rounded-md text-amber-400/70 group-hover:text-amber-300 transition-colors shrink-0 ml-1">
                            <ChevronDown
                              size={14}
                              className={`transition-transform duration-200 ${
                                isSubmenuOpen ? "rotate-180 text-amber-300" : ""
                              }`}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </button>
              ) : (
                <Link
                  href={item.href}
                  className="block group relative"
                  title={collapsed ? item.label : undefined}
                >
                  <motion.div
                    whileHover={{ x: collapsed ? 0 : 2 }}
                    whileTap={{ scale: 0.985 }}
                    transition={{ duration: 0.15 }}
                    className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors duration-200 cursor-pointer overflow-hidden ${
                      isParentActive
                        ? "text-white font-bold"
                        : isSubActive
                        ? "text-white bg-white/[0.08] border border-white/10 font-semibold"
                        : "text-slate-300/75 hover:text-white"
                    }`}
                  >
                    {/* Transição Suave de Fundo Ativo (Shared Layout Animation entre botões) */}
                    {isParentActive && (
                      <motion.div
                        layoutId="active-sidebar-pill"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary via-[#ff7a22] to-orange-500 shadow-lg shadow-primary/25 border border-primary-strong/40 z-0 overflow-hidden"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 32,
                          mass: 0.8,
                        }}
                      >
                        {/* Fill progressivo / varredura luminosa da esquerda para a direita */}
                        <motion.div
                          initial={{ x: "-100%" }}
                          animate={{ x: "100%" }}
                          transition={{ duration: 0.65, ease: "easeOut" }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 pointer-events-none"
                        />
                      </motion.div>
                    )}

                    {/* Fill progressivo da esquerda para a direita no Hover (Inativo) */}
                    {!isParentActive && !isSubActive && (
                      <motion.div
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/[0.09] via-white/[0.05] to-transparent border border-white/10 pointer-events-none z-0"
                        initial={{ scaleX: 0, opacity: 0 }}
                        whileHover={{ scaleX: 1, opacity: 1 }}
                        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                        style={{ originX: 0 }}
                      />
                    )}

                    {/* Cápsula Indicadora Branca na borda esquerda com transição suave */}
                    {isParentActive && (
                      <motion.div
                        layoutId="active-sidebar-capsule"
                        className="w-1.5 h-4 rounded-full bg-white shrink-0 -ml-0.5 shadow-sm z-10"
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30,
                        }}
                      />
                    )}

                    {/* Ícone com destaque */}
                    <Icon
                      size={19}
                      className={`shrink-0 transition-colors z-10 ${
                        isParentActive || isSubActive
                          ? "text-white drop-shadow-xs"
                          : "text-slate-400 group-hover:text-primary"
                      }`}
                    />

                    <AnimatePresence>
                      {!collapsed && (
                        <motion.div
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          className="flex-1 flex items-center justify-between min-w-0 z-10"
                        >
                          <span
                            className={`truncate text-[13px] tracking-tight ${
                              isParentActive
                                ? "font-bold text-white"
                                : isSubActive
                                ? "font-semibold text-white"
                                : "font-medium"
                            }`}
                          >
                            {item.label}
                          </span>

                          {hasSubItems && (
                            <button
                              type="button"
                              onClick={(e) => toggleSubmenu(item.href, e)}
                              className="p-1 rounded-md hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer ml-1 shrink-0"
                              title={isSubmenuOpen ? "Recolher subitens" : "Expandir subitens"}
                            >
                              <ChevronDown
                                size={14}
                                className={`transition-transform duration-200 ${
                                  isSubmenuOpen ? "rotate-180 text-white" : ""
                                }`}
                              />
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </Link>
              )}

              {/* Renderização dos Sub-itens */}
              {hasSubItems && !collapsed && (
                <AnimatePresence>
                  {isSubmenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className={`ml-4 pl-3 border-l-2 mt-1 space-y-1 overflow-hidden ${
                        isGroupOnly ? "border-amber-500/30" : "border-white/10"
                      }`}
                    >
                      {item.subItems?.map((sub) => {
                        const isThisSubActive = pathname === sub.href;
                        const SubIcon = sub.icon;

                        return (
                          <Link key={sub.href} href={sub.href} className="block group/sub relative">
                            <motion.div
                              whileHover={{ x: 2 }}
                              whileTap={{ scale: 0.985 }}
                              transition={{ duration: 0.15 }}
                              className={`relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors duration-200 cursor-pointer overflow-hidden ${
                                isThisSubActive
                                  ? "text-white font-bold"
                                  : "text-slate-300/75 hover:text-white"
                              }`}
                            >
                              {/* Transição suave de Fundo Ativo no Subitem */}
                              {isThisSubActive && (
                                <motion.div
                                  layoutId="active-sub-sidebar-pill"
                                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary via-[#ff7a22] to-orange-500 shadow-md shadow-primary/20 border border-primary-strong/40 z-0 overflow-hidden"
                                  transition={{
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 32,
                                    mass: 0.8,
                                  }}
                                >
                                  <motion.div
                                    initial={{ x: "-100%" }}
                                    animate={{ x: "100%" }}
                                    transition={{ duration: 0.55, ease: "easeOut" }}
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12 pointer-events-none"
                                  />
                                </motion.div>
                              )}

                              {/* Fill progressivo da esquerda para a direita no Hover do Subitem */}
                              {!isThisSubActive && (
                                <motion.div
                                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/[0.08] to-transparent border border-white/10 pointer-events-none z-0"
                                  initial={{ scaleX: 0, opacity: 0 }}
                                  whileHover={{ scaleX: 1, opacity: 1 }}
                                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                  style={{ originX: 0 }}
                                />
                              )}

                              {isThisSubActive && (
                                <motion.div
                                  layoutId="active-sub-capsule"
                                  className="w-1.5 h-3.5 rounded-full bg-white shrink-0 -ml-1 shadow-xs z-10"
                                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                                />
                              )}

                              <SubIcon
                                size={15}
                                className={`shrink-0 transition-colors z-10 ${
                                  isThisSubActive
                                    ? "text-white"
                                    : isGroupOnly
                                    ? "text-amber-400/80 group-hover/sub:text-amber-300"
                                    : "text-slate-400 group-hover/sub:text-primary"
                                }`}
                              />
                              <span className="truncate z-10">{sub.label}</span>
                            </motion.div>
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}

              {/* Sub-itens no Modo Recolhido (collapsed) */}
              {hasSubItems && collapsed && isSubmenuOpen && (
                <div className="space-y-1 pt-0.5">
                  {item.subItems?.map((sub) => {
                    const isThisSubActive = pathname === sub.href;
                    const SubIcon = sub.icon;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className="block relative"
                        title={sub.label}
                      >
                        <div
                          className={`w-9 h-9 mx-auto rounded-xl flex items-center justify-center transition-all relative overflow-hidden ${
                            isThisSubActive
                              ? "bg-primary text-white shadow-sm"
                              : "text-slate-400 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          {isThisSubActive && (
                            <motion.div
                              layoutId="active-collapsed-sub-pill"
                              className="absolute inset-0 bg-primary"
                            />
                          )}
                          <SubIcon size={15} className="z-10" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
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
