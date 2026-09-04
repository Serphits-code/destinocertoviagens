"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  Save,
  Plus,
  MoreVertical,
} from "lucide-react";
import type { EditorBlock, BlockData } from "@/lib/editor-types";
import { CATEGORY_DEFINITIONS } from "@/lib/categories";
import { saveBlockPreset } from "@/lib/actions/blocks";
import { BlockTable } from "./BlockTable";

interface BlockCardProps {
  block: EditorBlock;
  onUpdate: (blockId: string, data: BlockData, title?: string) => void;
  onDelete: (blockId: string) => void;
  onDuplicate: (blockId: string) => void;
  onToggleCollapse: (blockId: string) => void;
}

export function BlockCard({
  block,
  onUpdate,
  onDelete,
  onDuplicate,
  onToggleCollapse,
}: BlockCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const catDef = CATEGORY_DEFINITIONS[block.categoryId] ?? CATEGORY_DEFINITIONS.personalizada;

  async function handleSavePreset() {
    const name = prompt("Nome do modelo:", block.title);
    if (!name) return;
    setSavingPreset(true);
    await saveBlockPreset(block.id, name);
    setSavingPreset(false);
    setMenuOpen(false);
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-surface rounded-2xl border border-border shadow-shadow-card hover:shadow-shadow-hover transition-shadow ${
        menuOpen ? "z-30 relative" : "relative"
      }`}
    >
      {/* Header do card */}
      <div
        className={`flex items-center gap-2 px-4 py-3 bg-surface-subtle transition-all ${
          block.collapsed ? "rounded-2xl" : "rounded-t-2xl border-b border-border"
        }`}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface transition-colors"
          title="Segure e arraste para reorganizar este card no pacote"
        >
          <GripVertical size={18} />
        </button>

        <button
          onClick={() => onToggleCollapse(block.id)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          <span className="text-lg">{catDef.icon}</span>
          <input
            value={block.title}
            onChange={(e) => onUpdate(block.id, block.data, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-text-title bg-transparent border-none outline-none flex-1 min-w-0 truncate focus:ring-0"
          />
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleCollapse(block.id)}
            className="p-1.5 rounded-lg text-text-muted hover:bg-surface-muted transition-colors cursor-pointer"
            title={block.collapsed ? "Expandir" : "Minimizar"}
          >
            {block.collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg text-text-muted hover:bg-surface-muted transition-colors cursor-pointer"
              title="Mais opções"
            >
              <MoreVertical size={16} />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <>
                  {/* Backdrop para fechar ao clicar fora */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                    }}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    className="absolute right-0 top-full mt-1.5 w-52 bg-surface rounded-xl shadow-2xl border border-border overflow-hidden z-50"
                  >
                    <button
                      onClick={() => {
                        onDuplicate(block.id);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-text-body hover:bg-surface-muted transition-colors cursor-pointer"
                    >
                      <Copy size={14} /> Duplicar Card
                    </button>
                    <button
                      onClick={handleSavePreset}
                      disabled={savingPreset || block.id.startsWith("temp_")}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-text-body hover:bg-surface-muted transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Save size={14} /> Salvar como Modelo
                    </button>
                    <button
                      onClick={() => {
                        onDelete(block.id);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-status-danger hover:bg-status-danger-bg transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} /> Excluir Card
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Corpo colapsável */}
      <AnimatePresence initial={false}>
        {!block.collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-4 overflow-x-auto">
              {block.id.startsWith("temp_") ? (
                <div className="flex items-center gap-2 text-text-muted text-sm py-6 justify-center">
                  <Plus size={16} className="animate-spin" /> Criando bloco...
                </div>
              ) : (
                <BlockTable
                  block={block}
                  onUpdate={(data) => onUpdate(block.id, data)}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
