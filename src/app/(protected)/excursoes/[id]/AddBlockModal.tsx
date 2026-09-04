"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { CATEGORY_LIST } from "@/lib/categories";
import { listBlockPresets } from "@/lib/actions/blocks";
import type { BlockCategoryId } from "@/lib/editor-types";

interface AddBlockModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (categoryId: BlockCategoryId, presetId?: string) => void;
}

interface PresetItem {
  id: string;
  name: string;
  categoryId: string;
}

export function AddBlockModal({ open, onClose, onSelect }: AddBlockModalProps) {
  const [tab, setTab] = useState<"categories" | "presets">("categories");
  const [presets, setPresets] = useState<PresetItem[]>([]);

  useEffect(() => {
    if (open && tab === "presets") {
      listBlockPresets().then(setPresets);
    }
  }, [open, tab]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-2xl bg-surface rounded-2xl shadow-shadow-hover border border-border overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-xl font-bold text-text-title">Adicionar Card</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-muted hover:bg-surface-muted transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-4">
              {(["categories", "presets"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tab === t
                      ? "bg-primary text-primary-contrast"
                      : "text-text-muted hover:bg-surface-muted"
                  }`}
                >
                  {t === "categories" ? "Categorias" : "Modelos Salvos"}
                </button>
              ))}
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {tab === "categories" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CATEGORY_LIST.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => onSelect(cat.id)}
                      className="flex items-start gap-3 p-4 rounded-xl border border-border bg-surface-subtle hover:border-primary hover:shadow-shadow-card transition-all text-left group"
                    >
                      <span className="text-2xl">{cat.icon}</span>
                      <div>
                        <p className="font-semibold text-text-title group-hover:text-primary transition-colors">
                          {cat.name}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {cat.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {presets.length === 0 ? (
                    <p className="text-text-muted text-center py-8">
                      Nenhum modelo salvo ainda. Salve um card como modelo no menu ⋮ do card.
                    </p>
                  ) : (
                    presets.map((preset) => {
                      const cat = CATEGORY_LIST.find((c) => c.id === preset.categoryId);
                      return (
                        <button
                          key={preset.id}
                          onClick={() =>
                            onSelect(preset.categoryId as BlockCategoryId, preset.id)
                          }
                          className="w-full flex items-center gap-3 p-4 rounded-xl border border-border bg-surface-subtle hover:border-primary hover:shadow-shadow-card transition-all text-left"
                        >
                          <span className="text-xl">{cat?.icon ?? "📦"}</span>
                          <div>
                            <p className="font-semibold text-text-title">{preset.name}</p>
                            <p className="text-xs text-text-muted">{cat?.name ?? preset.categoryId}</p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
