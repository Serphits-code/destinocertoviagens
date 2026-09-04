"use client";

import { useState, useTransition, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  LayoutGrid,
  Maximize2,
  Lock,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  StickyNote,
  Filter,
  Sparkles,
} from "lucide-react";
import type { NoteItem, NoteColor } from "@/lib/actions/notes";
import {
  createNote,
  updateNote,
  updateNotePosition,
  deleteNote,
} from "@/lib/actions/notes";
import { StickyNoteCard, COLOR_CONFIG } from "./StickyNoteCard";

interface NotesCanvasContentProps {
  initialNotes: NoteItem[];
  userName?: string | null;
}

export function NotesCanvasContent({
  initialNotes,
  userName,
}: NotesCanvasContentProps) {
  const [notes, setNotes] = useState<NoteItem[]>(initialNotes);
  const [viewMode, setViewMode] = useState<"canvas" | "grid">("canvas");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedColorFilter, setSelectedColorFilter] = useState<NoteColor | "ALL">("ALL");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [justSaved, setJustSaved] = useState(false);

  const [isPending, startTransition] = useTransition();

  const canvasRef = useRef<HTMLDivElement | null>(null);

  const flashSaved = useCallback(() => {
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  }, []);

  // Criar nova nota com cor específica
  const handleCreateNote = (color: NoteColor = "yellow") => {
    // Posição com leve dispersão natural
    const canvasBounds = canvasRef.current?.getBoundingClientRect();
    const scrollLeft = canvasRef.current?.scrollLeft || 0;
    const scrollTop = canvasRef.current?.scrollTop || 0;

    const basePosX = scrollLeft + 120 + Math.floor(Math.random() * 120);
    const basePosY = scrollTop + 100 + Math.floor(Math.random() * 80);

    const tempId = `temp_${Date.now()}`;
    const optimisticNote: NoteItem = {
      id: tempId,
      userId: "",
      title: "",
      content: "",
      color,
      posX: basePosX,
      posY: basePosY,
      rotation: Number(((Math.random() - 0.5) * 4).toFixed(1)),
      sticker: null,
      pinned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setNotes((prev) => [optimisticNote, ...prev]);

    startTransition(async () => {
      const created = await createNote({
        color,
        posX: basePosX,
        posY: basePosY,
      });

      setNotes((prev) =>
        prev.map((n) => (n.id === tempId ? created : n))
      );
      flashSaved();
    });
  };

  // Atualizar dados de texto/cor/sticker
  const handleUpdateNote = (id: string, patch: Partial<NoteItem>) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: new Date() } : n))
    );

    startTransition(async () => {
      await updateNote(id, patch);
      flashSaved();
    });
  };

  // Atualizar coordenadas após drag & drop no canvas
  const handleDragEnd = (id: string, newX: number, newY: number) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, posX: newX, posY: newY } : n))
    );

    startTransition(async () => {
      await updateNotePosition(id, newX, newY);
      flashSaved();
    });
  };

  // Excluir nota
  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));

    startTransition(async () => {
      await deleteNote(id);
      flashSaved();
    });
  };

  // Filtros aplicados
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchesSearch =
        !searchTerm ||
        (n.title && n.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (n.content && n.content.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesColor =
        selectedColorFilter === "ALL" || n.color === selectedColorFilter;

      return matchesSearch && matchesColor;
    });
  }, [notes, searchTerm, selectedColorFilter]);

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => {
      const next = Number((prev + delta).toFixed(2));
      return Math.min(Math.max(next, 0.6), 1.5);
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] -m-6 overflow-hidden bg-background">
      {/* Barra de Ferramentas Superior Estilo Miro */}
      <header className="h-16 px-6 border-b border-border bg-surface/90 backdrop-blur-md flex items-center justify-between gap-4 z-20 shrink-0">
        {/* Lado Esquerdo: Título e Badge de Privacidade */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <StickyNote size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-text-title leading-tight">
                Quadro de Notas
              </h1>
              <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-muted text-text-muted border border-border">
                <Lock size={10} />
                <span>Privado</span>
              </span>
            </div>
            <p className="text-xs text-text-muted hidden sm:block">
              Apenas você ({userName || "você"}) tem acesso a estas notas.
            </p>
          </div>
        </div>

        {/* Lado Central: Barra de Pesquisa e Filtros */}
        <div className="flex items-center gap-2 flex-1 max-w-md justify-center">
          <div className="relative w-full max-w-xs">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar nas notas..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border bg-surface-subtle text-xs text-text-body placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface transition-all"
            />
            <Search
              size={14}
              className="absolute left-2.5 top-2 text-text-muted pointer-events-none"
            />
          </div>

          {/* Filtro por Cor */}
          <div className="hidden md:flex items-center gap-1 bg-surface-subtle p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setSelectedColorFilter("ALL")}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                selectedColorFilter === "ALL"
                  ? "bg-primary text-white"
                  : "text-text-muted hover:text-text-title"
              }`}
            >
              Todas
            </button>
            {(Object.keys(COLOR_CONFIG) as NoteColor[]).map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColorFilter(color)}
                className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                  COLOR_CONFIG[color].dot
                } ${selectedColorFilter === color ? "scale-125 ring-2 ring-primary ring-offset-1" : "hover:scale-110"}`}
                title={COLOR_CONFIG[color].label}
              />
            ))}
          </div>
        </div>

        {/* Lado Direito: Alternador de Visualização & Botão Novo Post-it */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Alternador Canvas vs Grid */}
          <div className="flex items-center bg-surface-subtle p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setViewMode("canvas")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "canvas"
                  ? "bg-surface text-text-title shadow-2xs"
                  : "text-text-muted hover:text-text-title"
              }`}
              title="Mural Livre estilo Miro"
            >
              <Maximize2 size={13} />
              <span className="hidden sm:inline">Mural</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-surface text-text-title shadow-2xs"
                  : "text-text-muted hover:text-text-title"
              }`}
              title="Organizado em Grade"
            >
              <LayoutGrid size={13} />
              <span className="hidden sm:inline">Grade</span>
            </button>
          </div>

          {/* Botão Novo Post-it com Cores Rápidas */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleCreateNote("yellow")}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Plus size={15} />
              <span>Novo Post-it</span>
            </button>
          </div>
        </div>
      </header>

      {/* Área Principal de Trabalho (Canvas ou Grid) */}
      <main
        ref={canvasRef}
        className={`flex-1 relative overflow-auto select-none ${
          viewMode === "canvas"
            ? "cursor-default"
            : "p-8 max-w-7xl mx-auto w-full"
        }`}
        style={
          viewMode === "canvas"
            ? {
                backgroundImage:
                  "radial-gradient(circle, var(--border) 1.2px, transparent 1.2px)",
                backgroundSize: "28px 28px",
              }
            : undefined
        }
      >
        {filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 flex items-center justify-center shadow-inner">
              <StickyNote size={32} />
            </div>
            <div className="max-w-sm space-y-1">
              <h3 className="text-base font-bold text-text-title">
                {searchTerm || selectedColorFilter !== "ALL"
                  ? "Nenhuma nota encontrada com esse filtro"
                  : "Seu quadro está limpo"}
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                {searchTerm || selectedColorFilter !== "ALL"
                  ? "Tente limpar a pesquisa ou selecionar outra cor de post-it."
                  : "Crie notas rápidas, ideias de roteiros, lembretes de clientes ou to-dos pessoais. Elas ficam salvas somente para você."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCreateNote("yellow")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors cursor-pointer shadow-sm"
            >
              <Plus size={14} />
              <span>Criar Primeiro Post-it</span>
            </button>
          </div>
        ) : viewMode === "canvas" ? (
          /* Canvas Livre Estilo Miro */
          <div
            className="relative min-w-[2400px] min-h-[1600px] transition-transform origin-top-left"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {filteredNotes.map((note) => (
              <StickyNoteCard
                key={note.id}
                note={note}
                isCanvasView={true}
                onUpdate={handleUpdateNote}
                onDelete={handleDeleteNote}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        ) : (
          /* Visualização Organizada em Grade */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-12">
            {filteredNotes.map((note) => (
              <StickyNoteCard
                key={note.id}
                note={note}
                isCanvasView={false}
                onUpdate={handleUpdateNote}
                onDelete={handleDeleteNote}
              />
            ))}
          </div>
        )}
      </main>

      {/* Controles Flutuantes Inferiores Estilo Miro (Zoom & Status) */}
      <footer className="absolute bottom-5 right-6 z-30 flex items-center gap-3">
        <AnimatePresence>
          {justSaved && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="px-3 py-1.5 rounded-full bg-surface/90 border border-border shadow-lg text-xs font-semibold text-status-success flex items-center gap-1.5 backdrop-blur-md"
            >
              <Sparkles size={13} />
              <span>Salvo</span>
            </motion.div>
          )}
        </AnimatePresence>

        {viewMode === "canvas" && (
          <div className="flex items-center gap-1 bg-surface/90 border border-border shadow-lg px-2 py-1 rounded-2xl backdrop-blur-md text-xs font-bold text-text-title">
            <button
              type="button"
              onClick={() => handleZoom(-0.1)}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-title hover:bg-surface-muted transition-colors cursor-pointer"
              title="Diminuir Zoom"
            >
              <ZoomOut size={14} />
            </button>

            <span className="w-12 text-center text-xs font-bold tabular-nums">
              {Math.round(zoomLevel * 100)}%
            </span>

            <button
              type="button"
              onClick={() => handleZoom(0.1)}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-title hover:bg-surface-muted transition-colors cursor-pointer"
              title="Aumentar Zoom"
            >
              <ZoomIn size={14} />
            </button>

            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-title hover:bg-surface-muted transition-colors cursor-pointer ml-1"
              title="Resetar Zoom (100%)"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}
