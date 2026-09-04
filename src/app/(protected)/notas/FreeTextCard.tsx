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

  const isNearTop = isCanvasView && note.posY < 45;

  return (
    <motion.div
      layout={!isCanvasView}
      drag={isCanvasView}
      data-note-card="true"
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
      className={`group relative transition-all select-none cursor-default ${
        isCanvasView
          ? `w-fit max-w-2xl rounded-xl p-1 ${
              isFocused
                ? "bg-surface/50 backdrop-blur-xs ring-1.5 ring-primary/50 shadow-sm z-30"
                : "hover:bg-surface/20 hover:ring-1 hover:ring-border/60 z-10"
            }`
          : "w-full p-4 rounded-2xl bg-surface border border-border shadow-card flex flex-col justify-between"
      }`}
    >
      {/* Barra de controle rápida flutuante (estilo Miro/Figma, acima do texto) */}
      <div
        className={`absolute flex items-center gap-1 bg-surface/95 backdrop-blur-md px-1.5 py-1 rounded-xl shadow-xl border border-border transition-all z-40 w-max pointer-events-auto ${
          isNearTop ? "top-full mt-2 left-0" : "-top-10 left-0"
        } ${
          isFocused
            ? "opacity-100 scale-100"
            : "opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100"
        }`}
      >
        {isCanvasView && (
          <span
            className="cursor-grab active:cursor-grabbing p-1 text-text-muted hover:text-text-title rounded-lg transition-colors"
            title="Arrastar Texto"
          >
            <GripVertical size={13} />
          </span>
        )}
        <button
          type="button"
          onClick={cycleFontSize}
          className="px-2 py-0.5 rounded-lg bg-surface-muted hover:bg-primary/10 hover:text-primary text-[11px] font-bold text-text-title transition-colors cursor-pointer flex items-center gap-1"
          title="Alterar Tamanho da Fonte (P, M, G, GG)"
        >
          <Type size={12} />
          <span>{sizeConfig.label}</span>
        </button>
        <div className="w-[1px] h-3 bg-border mx-0.5" />
        <button
          type="button"
          onClick={() => {
            if (confirm("Deseja excluir este texto?")) {
              onDelete(note.id);
            }
          }}
          className="p-1 rounded-lg text-text-muted hover:text-status-danger hover:bg-status-danger-bg transition-colors cursor-pointer"
          title="Excluir Texto"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Container Auto-fit: o mirror span ajusta a largura e altura milimetricamente ao texto */}
      <div
        className="inline-grid items-center relative"
        style={{ minWidth: "60px" }}
      >
        {/* Span invisível que define a dimensão exata com base no texto */}
        <span
          className={`invisible whitespace-pre-wrap break-words col-start-1 row-start-1 select-none pointer-events-none p-1.5 leading-tight ${sizeConfig.cls}`}
          aria-hidden="true"
        >
          {(content || "Texto...") + "\u200B"}
        </span>

        {/* Textarea que preenche exatamente as dimensões do span */}
        <textarea
          value={content}
          onChange={handleContentChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          rows={1}
          placeholder="Texto..."
          className={`col-start-1 row-start-1 w-full h-full bg-transparent border-none outline-none resize-none overflow-hidden focus:ring-0 leading-tight text-text-title placeholder:text-text-muted/40 p-1.5 m-0 ${sizeConfig.cls}`}
        />
      </div>
    </motion.div>
  );
}
