"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, LogOut, Settings } from "lucide-react";
import { signOut } from "next-auth/react";
import Image from "next/image";

interface UserMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-muted hover:bg-surface-subtle border border-border transition-colors"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name || "Usuário"}
            width={32}
            height={32}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
            {user.name?.charAt(0).toUpperCase() || "U"}
          </div>
        )}
        <span className="text-sm font-medium text-text-title hidden sm:block">
          {user.name}
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-56 bg-surface rounded-xl shadow-shadow-hover border border-border overflow-hidden z-50"
          >
            <div className="p-4 border-b border-border">
              <p className="text-sm font-semibold text-text-title">{user.name}</p>
              <p className="text-xs text-text-muted">{user.email}</p>
            </div>
            
            <div className="p-1">
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-body hover:bg-surface-muted rounded-lg transition-colors">
                <User size={16} />
                Meu Perfil
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-body hover:bg-surface-muted rounded-lg transition-colors">
                <Settings size={16} />
                Configurações
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-status-danger hover:bg-status-danger-bg rounded-lg transition-colors"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
