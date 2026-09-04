"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MousePointer,
  Type,
  StickyNote,
  PenTool,
  Undo2,
  Trash2,
  Palette,
  Check,
} from "lucide-react";
import type { NoteColor } from "@/lib/actions/notes";
import { COLOR_CONFIG } from "./StickyNoteCard";

export type ActiveTool = "select" | "text" | "sticky" | "pen";

export const PEN_COLORS = [
  { label: "Amarelo", value: "#F59E0B" },
  { label: "Azul", value: "#0284C7" },
  { label: "Verde", value: "#16A34A" },
  { label: "Rosa", value: "#DB2777" },
  { label: "Laranja", value: "#EA580C" },
  { label: "Branco", value: "#FFFFFF" },
];

interface MiroToolbarProps {
  activeTool: ActiveTool;
  onSelectTool: (tool: ActiveTool) => void;
  penColor: string;
  onChangePenColor: (color: string) => void;
  onAddSticky: (color: NoteColor) => void;
  onAddFreeText: () => void;
  onUndoDrawing: () => void;
  onClearDrawings: () => void;
  drawingsCount: number;
}

export function MiroToolbar({
  activeTool,
  onSelectTool,
  penColor,
  onChangePenColor,
  onAddSticky,
  onAddFreeText,
  onUndoDrawing,
  onClearDrawings,
  drawingsCount,
}: MiroToolbarProps) {
  const [showStickyColors, setShowStickyColors] = useState(false);
  const [showPenColors, setShowPenColors] = useState(false);

  return (
    <aside className="absolute left-6 top-24 z-30 flex flex-col items-center bg-surface/90 backdrop-blur-md border border-border shadow-2xl rounded-2xl p-1.5 gap-1 select-none">
      {/* 1. Mover / Selecionar */}
      <button
        type="button"
        onClick={() => {
          onSelectTool("select");
          setShowStickyColors(false);
          setShowPenColors(false);
        }}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
          activeTool === "select"
            ? "bg-primary text-white shadow-xs"
            : "text-text-muted hover:text-text-title hover:bg-surface-muted"
        }`}
        title="Navegar e Selecionar (V) • Arraste o fundo da tela para mover"
      >
        <MousePointer size={18} />
      </button>

      {/* 2. Texto Livre (T) */}
      <button
        type="button"
        onClick={() => {
          onSelectTool("text");
          onAddFreeText();
          setShowStickyColors(false);
          setShowPenColors(false);
        }}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
          activeTool === "text"
            ? "bg-primary text-white shadow-xs"
            : "text-text-muted hover:text-text-title hover:bg-surface-muted"
        }`}
        title="Texto Livre na Tela (T)"
      >
        <Type size={18} />
      </button>

      {/* 3. Post-it / Sticky Note */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowStickyColors(!showStickyColors);
            setShowPenColors(false);
          }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            activeTool === "sticky" || showStickyColors
              ? "bg-primary text-white shadow-xs"
              : "text-text-muted hover:text-text-title hover:bg-surface-muted"
          }`}
          title="Novo Post-it (N)"
        >
          <StickyNote size={18} />
        </button>

        {/* Paleta flutuante de cores do Post-it */}
        <AnimatePresence>
          {showStickyColors && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowStickyColors(false)}
              />
              <motion.div
                initial={{ opacity: 0, x: -8, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -8, scale: 0.95 }}
                className="absolute left-full top-0 ml-3 p-2 bg-surface rounded-2xl shadow-2xl border border-border flex flex-col gap-1.5 z-50 w-36"
              >
                <span className="text-[10px] font-bold text-text-muted uppercase px-1">
                  Cor do Post-it
                </span>
                {(Object.keys(COLOR_CONFIG) as NoteColor[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      onAddSticky(c);
                      onSelectTool("sticky");
                      setShowStickyColors(false);
                    }}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-surface-muted transition-colors text-xs font-semibold text-text-title cursor-pointer text-left"
                  >
                    <span
                      className={`w-4 h-4 rounded-md border shadow-2xs ${COLOR_CONFIG[c].dot}`}
                    />
                    <span>{COLOR_CONFIG[c].label}</span>
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* 4. Caneta de Rabisco / Linhas */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            onSelectTool("pen");
            setShowPenColors(!showPenColors);
            setShowStickyColors(false);
          }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            activeTool === "pen"
              ? "bg-primary text-white shadow-xs"
              : "text-text-muted hover:text-text-title hover:bg-surface-muted"
          }`}
          title="Caneta / Rabisco à Mão Livre (P)"
        >
          <PenTool size={18} />
        </button>

        {/* Seletor flutuante de cor da caneta */}
        <AnimatePresence>
          {showPenColors && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowPenColors(false)}
              />
              <motion.div
                initial={{ opacity: 0, x: -8, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -8, scale: 0.95 }}
                className="absolute left-full top-0 ml-3 p-2 bg-surface rounded-2xl shadow-2xl border border-border flex flex-col gap-2 z-50 w-36"
              >
                <span className="text-[10px] font-bold text-text-muted uppercase px-1">
                  Cor da Caneta
                </span>
                <div className="grid grid-cols-3 gap-2 p-1">
                  {PEN_COLORS.map((pc) => (
                    <button
                      key={pc.value}
                      type="button"
                      onClick={() => {
                        onChangePenColor(pc.value);
                        onSelectTool("pen");
                        setShowPenColors(false);
                      }}
                      style={{ backgroundColor: pc.value }}
                      className={`w-7 h-7 rounded-full border-2 shadow-2xs transition-transform hover:scale-110 cursor-pointer flex items-center justify-center ${
                        penColor === pc.value
                          ? "border-primary ring-2 ring-primary ring-offset-1"
                          : "border-black/20"
                      }`}
                      title={pc.label}
                    >
                      {penColor === pc.value && (
                        <Check size={13} className="text-black/80" strokeWidth={3} />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <div className="w-6 h-px bg-border my-1" />

      {/* 5. Desfazer Traço (Undo) */}
      <button
        type="button"
        onClick={onUndoDrawing}
        disabled={drawingsCount === 0}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-text-muted hover:text-text-title hover:bg-surface-muted transition-all disabled:opacity-30 cursor-pointer"
        title="Desfazer Último Rabisco"
      >
        <Undo2 size={17} />
      </button>

      {/* 6. Limpar Rabiscos */}
      {drawingsCount > 0 && (
        <button
          type="button"
          onClick={() => {
            if (confirm("Deseja apagar todos os rabiscos desenhados no quadro?")) {
              onClearDrawings();
            }
          }}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-text-muted hover:text-status-danger hover:bg-status-danger-bg transition-all cursor-pointer"
          title="Limpar todos os desenhos"
        >
          <Trash2 size={16} />
        </button>
      )}
    </aside>
  );
}
