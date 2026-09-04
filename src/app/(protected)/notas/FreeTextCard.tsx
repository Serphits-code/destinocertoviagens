"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { GripVertical, Trash2, Type } from "lucide-react";
import type { NoteItem } from "@/lib/actions/notes";

interface FreeTextCardProps {
  note: NoteItem;
  isCanvasView: boolean;
  onUpdate: (id: string, patch: Partial<NoteItem>) => void;
  onDelete: (id: string) => void;
  onDragEnd?: (id: string, newX: number, newY: number) => void;
}

const FONT_SIZES: Record<string, { cls: string; label: string }> = {
  base: { cls: "text-base font-semibold", label: "P" },
  lg: { cls: "text-xl font-bold", label: "M" },
  xl: { cls: "text-3xl font-extrabold tracking-tight", label: "G" },
  "2xl": { cls: "text-4xl font-black tracking-tight", label: "GG" },
};

export function FreeTextCard({
  note,
  isCanvasView,
  onUpdate,
  onDelete,
  onDragEnd,
}: FreeTextCardProps) {
  const [content, setContent] = useState(note.content || note.title || "");
  const [isFocused, setIsFocused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentSizeKey = note.fontSize || "xl";
  const sizeConfig = FONT_SIZES[currentSizeKey] || FONT_SIZES.xl;

  const triggerUpdate = (newContent: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onUpdate(note.id, { content: newContent, title: newContent });
    }, 600);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    triggerUpdate(val);
  };

  const cycleFontSize = () => {
    const keys = Object.keys(FONT_SIZES);
    const nextIdx = (keys.indexOf(currentSizeKey) + 1) % keys.length;
    onUpdate(note.id, { fontSize: keys[nextIdx] });
  };

  return (
    <motion.div
      layout={!isCanvasView}
      drag={isCanvasView}
      dragMomentum={false}
      dragElastic={0.05}
      onDragEnd={(_e, info) => {
        if (onDragEnd && isCanvasView) {
          const newX = Math.round(note.posX + info.offset.x);
          const newY = Math.round(note.posY + info.offset.y);
          onDragEnd(note.id, Math.max(0, newX), Math.max(0, newY));
        }
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: 1,
        scale: 1,
        x: isCanvasView ? note.posX : 0,
        y: isCanvasView ? note.posY : 0,
      }}
      style={isCanvasView ? { position: "absolute", left: 0, top: 0 } : undefined}
      className={`group relative min-w-[220px] max-w-xl p-3 rounded-2xl transition-all select-none ${
        isFocused ? "bg-surface/60 backdrop-blur-xs ring-2 ring-primary/40 z-30" : "hover:bg-surface/30 z-10"
      }`}
    >
      {/* Barra de controle rápida visível no hover */}
      <div className="flex items-center justify-between gap-1 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1">
          {isCanvasView && (
            <span
              className="cursor-grab active:cursor-grabbing p-1 text-text-muted hover:text-text-title rounded-md"
              title="Arrastar Texto"
            >
              <GripVertical size={14} />
            </span>
          )}
          <button
            type="button"
            onClick={cycleFontSize}
            className="px-2 py-0.5 rounded-md bg-surface border border-border text-[11px] font-bold text-text-title hover:border-primary transition-colors cursor-pointer flex items-center gap-1"
            title="Alterar Tamanho da Fonte"
          >
            <Type size={12} />
            <span>{sizeConfig.label}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            if (confirm("Deseja excluir este texto?")) {
              onDelete(note.id);
            }
          }}
          className="p-1 rounded-md text-text-muted hover:text-status-danger hover:bg-status-danger-bg transition-colors cursor-pointer"
          title="Excluir Texto"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Textarea do Texto Livre */}
      <textarea
        value={content}
        onChange={handleContentChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        rows={Math.max(2, Math.min(6, content.split("\n").length))}
        placeholder="Digite um título ou texto livre..."
        className={`w-full bg-transparent border-none outline-none resize-none focus:ring-0 leading-tight text-text-title placeholder:text-text-muted/50 ${sizeConfig.cls}`}
      />
    </motion.div>
  );
}
