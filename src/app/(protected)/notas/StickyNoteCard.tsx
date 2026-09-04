"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GripVertical,
  Trash2,
  Palette,
  Smile,
  Pin,
  Check,
  MoreHorizontal,
} from "lucide-react";
import type { NoteItem, NoteColor } from "@/lib/actions/notes";

interface StickyNoteCardProps {
  note: NoteItem;
  isCanvasView: boolean;
  onUpdate: (id: string, patch: Partial<NoteItem>) => void;
  onDelete: (id: string) => void;
  onDragEnd?: (id: string, newX: number, newY: number) => void;
}

export const COLOR_CONFIG: Record<
  NoteColor,
  {
    bg: string;
    text: string;
    placeholder: string;
    border: string;
    accent: string;
    label: string;
    dot: string;
  }
> = {
  yellow: {
    bg: "bg-[#FEF08A]",
    text: "text-[#713F12]",
    placeholder: "placeholder-[#713F12]/50",
    border: "border-[#FDE047]",
    accent: "#EAB308",
    label: "Amarelo",
    dot: "bg-[#FEF08A] border-[#EAB308]",
  },
  blue: {
    bg: "bg-[#BAE6FD]",
    text: "text-[#075985]",
    placeholder: "placeholder-[#075985]/50",
    border: "border-[#7DD3FC]",
    accent: "#0284C7",
    label: "Azul",
    dot: "bg-[#BAE6FD] border-[#0284C7]",
  },
  green: {
    bg: "bg-[#BBF7D0]",
    text: "text-[#166534]",
    placeholder: "placeholder-[#166534]/50",
    border: "border-[#86EFAC]",
    accent: "#16A34A",
    label: "Verde",
    dot: "bg-[#BBF7D0] border-[#16A34A]",
  },
  pink: {
    bg: "bg-[#FBCFE8]",
    text: "text-[#9D174D]",
    placeholder: "placeholder-[#9D174D]/50",
    border: "border-[#F472B6]",
    accent: "#DB2777",
    label: "Rosa",
    dot: "bg-[#FBCFE8] border-[#DB2777]",
  },
  purple: {
    bg: "bg-[#E9D5FF]",
    text: "text-[#6B21A8]",
    placeholder: "placeholder-[#6B21A8]/50",
    border: "border-[#C084FC]",
    accent: "#9333EA",
    label: "Roxo",
    dot: "bg-[#E9D5FF] border-[#9333EA]",
  },
  orange: {
    bg: "bg-[#FED7AA]",
    text: "text-[#9A3412]",
    placeholder: "placeholder-[#9A3412]/50",
    border: "border-[#FDBA74]",
    accent: "#EA580C",
    label: "Laranja",
    dot: "bg-[#FED7AA] border-[#EA580C]",
  },
  white: {
    bg: "bg-white",
    text: "text-slate-800",
    placeholder: "placeholder-slate-400",
    border: "border-slate-200",
    accent: "#64748B",
    label: "Branco",
    dot: "bg-white border-slate-400",
  },
};

const STICKERS = [
  "💯", "❤️", "✅", "💡", "🔥",
  "⭐", "📌", "🎉", "🎯", "☕",
  "🚀", "👍", "👏", "⚠️", "💎",
];

export function StickyNoteCard({
  note,
  isCanvasView,
  onUpdate,
  onDelete,
  onDragEnd,
}: StickyNoteCardProps) {
  const [title, setTitle] = useState(note.title || "");
  const [content, setContent] = useState(note.content || "");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentTheme = COLOR_CONFIG[note.color] || COLOR_CONFIG.yellow;

  // Auto-save debounced ao digitar
  const triggerUpdate = (newTitle: string, newContent: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onUpdate(note.id, { title: newTitle, content: newContent });
    }, 600);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    triggerUpdate(val, content);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    triggerUpdate(title, val);
  };

  const cardStyle = {
    rotate: isCanvasView && !isFocused ? `${note.rotation}deg` : "0deg",
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
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: 1,
        scale: 1,
        x: isCanvasView ? note.posX : 0,
        y: isCanvasView ? note.posY : 0,
        ...cardStyle,
      }}
      style={isCanvasView ? { position: "absolute", left: 0, top: 0 } : undefined}
      whileHover={{ scale: 1.02, zIndex: 30 }}
      whileTap={{ scale: 0.98 }}
      className={`group relative w-64 min-h-[220px] rounded-2xl p-4 shadow-[0_12px_28px_-6px_rgba(0,0,0,0.18),0_6px_10px_-4px_rgba(0,0,0,0.12)] border transition-all flex flex-col justify-between select-none ${
        currentTheme.bg
      } ${currentTheme.border} ${isFocused ? "ring-2 ring-primary/40 z-30" : "z-10"}`}
    >
      {/* Topo do Post-it */}
      <div>
        {/* Barra de Ações Superior (visível no hover ou ao focar) */}
        <div className="flex items-center justify-between gap-1 mb-2.5 pb-2 border-b border-black/10">
          <div className="flex items-center gap-1">
            {isCanvasView && (
              <span
                className="cursor-grab active:cursor-grabbing p-1 text-black/40 hover:text-black/70 rounded-md transition-colors"
                title="Arrastar Post-it"
              >
                <GripVertical size={14} />
              </span>
            )}

            {note.pinned && (
              <span
                className="text-primary text-xs font-bold flex items-center gap-1"
                title="Nota Fixada"
              >
                <Pin size={13} className="fill-primary text-primary" />
              </span>
            )}

            {/* Sticker / Emoji Atual */}
            {note.sticker && (
              <button
                type="button"
                onClick={() => onUpdate(note.id, { sticker: null })}
                className="text-xl leading-none cursor-pointer hover:scale-125 transition-transform drop-shadow-sm flex items-center justify-center p-0.5 rounded-md hover:bg-black/5"
                title="Sticker ativo (clique para remover)"
              >
                {note.sticker}
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Seletor de Cores */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowColorPicker(!showColorPicker);
                  setShowStickerPicker(false);
                }}
                className="p-1 text-black/40 hover:text-black/80 hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
                title="Mudar Cor"
              >
                <Palette size={13} />
              </button>

              <AnimatePresence>
                {showColorPicker && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowColorPicker(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85, y: -4 }}
                      style={{ width: "max-content", minWidth: "max-content" }}
                      className="absolute right-0 top-full mt-2 p-2.5 bg-surface/95 backdrop-blur-md rounded-2xl shadow-2xl border border-border flex items-center gap-2 z-50"
                    >
                      {(Object.keys(COLOR_CONFIG) as NoteColor[]).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            onUpdate(note.id, { color: c });
                            setShowColorPicker(false);
                          }}
                          className={`w-6 h-6 shrink-0 rounded-full border-2 shadow-sm transition-transform hover:scale-125 cursor-pointer ${
                            COLOR_CONFIG[c].dot
                          } ${note.color === c ? "ring-2 ring-primary ring-offset-2" : ""}`}
                          title={COLOR_CONFIG[c].label}
                        />
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Seletor de Stickers / Emojis */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowStickerPicker(!showStickerPicker);
                  setShowColorPicker(false);
                }}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  showStickerPicker || note.sticker
                    ? "text-primary bg-primary/10"
                    : "text-black/40 hover:text-black/80 hover:bg-black/5"
                }`}
                title="Adicionar Sticker / Reação"
              >
                <Smile size={13} />
              </button>

              <AnimatePresence>
                {showStickerPicker && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowStickerPicker(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -4 }}
                      style={{ width: "224px", minWidth: "224px" }}
                      className="absolute right-0 top-full mt-2 p-2.5 bg-surface/95 backdrop-blur-md rounded-2xl shadow-2xl border border-border z-50 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-bold tracking-wider uppercase text-text-muted">
                          Stickers
                        </span>
                        {note.sticker && (
                          <button
                            type="button"
                            onClick={() => {
                              onUpdate(note.id, { sticker: null });
                              setShowStickerPicker(false);
                            }}
                            className="text-[10px] font-semibold text-status-danger hover:underline cursor-pointer"
                          >
                            Remover
                          </button>
                        )}
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(5, 36px)",
                          gap: "4px",
                          justifyContent: "center",
                        }}
                      >
                        {STICKERS.map((stk) => {
                          const isSelected = note.sticker === stk;
                          return (
                            <button
                              key={stk}
                              type="button"
                              onClick={() => {
                                onUpdate(note.id, {
                                  sticker: isSelected ? null : stk,
                                });
                                setShowStickerPicker(false);
                              }}
                              style={{ width: "36px", height: "36px" }}
                              className={`flex items-center justify-center rounded-xl text-xl hover:scale-125 transition-all cursor-pointer select-none shrink-0 ${
                                isSelected
                                  ? "bg-primary/20 ring-1 ring-primary"
                                  : "hover:bg-surface-muted"
                              }`}
                              title={stk}
                            >
                              {stk}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Fixar / Desafixar */}
            <button
              type="button"
              onClick={() => onUpdate(note.id, { pinned: !note.pinned })}
              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                note.pinned
                  ? "text-primary hover:bg-primary/10"
                  : "text-black/40 hover:text-black/80 hover:bg-black/5"
              }`}
              title={note.pinned ? "Desafixar" : "Fixar no topo"}
            >
              <Pin size={13} />
            </button>

            {/* Excluir */}
            <button
              type="button"
              onClick={() => {
                if (confirm("Deseja excluir esta nota?")) {
                  onDelete(note.id);
                }
              }}
              className="p-1 text-black/40 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="Excluir Nota"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Campo de Título */}
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Título da nota..."
          className={`w-full font-bold text-sm bg-transparent border-none outline-none focus:ring-0 mb-1 leading-snug ${
            currentTheme.text
          } ${currentTheme.placeholder}`}
        />

        {/* Conteúdo da Nota */}
        <textarea
          value={content}
          onChange={handleContentChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          rows={5}
          placeholder="O que você precisa lembrar hoje? Digite aqui..."
          className={`w-full text-xs bg-transparent border-none outline-none resize-none focus:ring-0 leading-relaxed font-medium ${
            currentTheme.text
          } ${currentTheme.placeholder}`}
        />
      </div>

      {/* Rodapé da Nota */}
      <div className="pt-2 border-t border-black/5 flex items-center justify-between text-[10px] text-black/40">
        <span>
          {new Date(note.updatedAt || note.createdAt).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
          Auto-salvo ✓
        </span>
      </div>
    </motion.div>
  );
}
