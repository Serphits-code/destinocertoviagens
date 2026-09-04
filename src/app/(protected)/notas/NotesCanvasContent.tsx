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
  Type,
  Sparkles,
} from "lucide-react";
import type { NoteItem, NoteColor, NoteType, DrawingItem } from "@/lib/actions/notes";
import {
  createNote,
  updateNote,
  updateNotePosition,
  deleteNote,
  saveDrawing,
  undoLastDrawing,
  clearUserDrawings,
} from "@/lib/actions/notes";
import { StickyNoteCard, COLOR_CONFIG } from "./StickyNoteCard";
import { FreeTextCard } from "./FreeTextCard";
import { MiroToolbar, type ActiveTool, PEN_COLORS } from "./MiroToolbar";
import { DrawingLayer } from "./DrawingLayer";

interface NotesCanvasContentProps {
  initialNotes: NoteItem[];
  initialDrawings?: DrawingItem[];
  userName?: string | null;
}

export function NotesCanvasContent({
  initialNotes,
  initialDrawings = [],
  userName,
}: NotesCanvasContentProps) {
  const [notes, setNotes] = useState<NoteItem[]>(initialNotes);
  const [drawings, setDrawings] = useState<DrawingItem[]>(initialDrawings);
  const [viewMode, setViewMode] = useState<"canvas" | "grid">("canvas");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedColorFilter, setSelectedColorFilter] = useState<NoteColor | "ALL">("ALL");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [justSaved, setJustSaved] = useState(false);

  // Ferramenta Ativa da Barra Estilo Miro
  const [activeTool, setActiveTool] = useState<ActiveTool>("select");
  const [penColor, setPenColor] = useState<string>(PEN_COLORS[0].value);

  const [isPending, startTransition] = useTransition();
  const canvasScrollRef = useRef<HTMLDivElement | null>(null);

  const flashSaved = useCallback(() => {
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  }, []);

  // Criação de Post-it (Sticky Note)
  const handleCreateSticky = (color: NoteColor = "yellow") => {
    const scrollLeft = canvasScrollRef.current?.scrollLeft || 0;
    const scrollTop = canvasScrollRef.current?.scrollTop || 0;

    const basePosX = Math.max(80, scrollLeft + 180 + Math.floor(Math.random() * 120));
    const basePosY = Math.max(80, scrollTop + 120 + Math.floor(Math.random() * 80));

    const tempId = `temp_${Date.now()}`;
    const optimisticNote: NoteItem = {
      id: tempId,
      userId: "",
      type: "sticky",
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
        type: "sticky",
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

  // Criação de Texto Livre (T)
  const handleCreateFreeText = () => {
    const scrollLeft = canvasScrollRef.current?.scrollLeft || 0;
    const scrollTop = canvasScrollRef.current?.scrollTop || 0;

    const basePosX = Math.max(80, scrollLeft + 250 + Math.floor(Math.random() * 80));
    const basePosY = Math.max(80, scrollTop + 160 + Math.floor(Math.random() * 60));

    const tempId = `temp_txt_${Date.now()}`;
    const optimisticText: NoteItem = {
      id: tempId,
      userId: "",
      type: "text",
      fontSize: "xl",
      title: "Novo Título",
      content: "Novo Título",
      color: "white",
      posX: basePosX,
      posY: basePosY,
      rotation: 0,
      sticker: null,
      pinned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setNotes((prev) => [optimisticText, ...prev]);

    startTransition(async () => {
      const created = await createNote({
        type: "text",
        title: "Novo Título",
        content: "Novo Título",
        fontSize: "xl",
        color: "white",
        posX: basePosX,
        posY: basePosY,
      });

      setNotes((prev) =>
        prev.map((n) => (n.id === tempId ? created : n))
      );
      flashSaved();
    });
  };

  // Atualizar dados de nota / texto
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

  // Excluir nota / texto
  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));

    startTransition(async () => {
      await deleteNote(id);
      flashSaved();
    });
  };

  // Salvar novo traço de desenho (caneta)
  const handleSaveDrawing = (pathData: string, color: string, strokeWidth: number) => {
    const tempDrawing: DrawingItem = {
      id: `draw_${Date.now()}`,
      userId: "",
      pathData,
      color,
      strokeWidth,
      createdAt: new Date(),
    };

    setDrawings((prev) => [...prev, tempDrawing]);

    startTransition(async () => {
      const saved = await saveDrawing(pathData, color, strokeWidth);
      setDrawings((prev) =>
        prev.map((d) => (d.id === tempDrawing.id ? saved : d))
      );
      flashSaved();
    });
  };

  // Desfazer último desenho
  const handleUndoDrawing = () => {
    if (drawings.length === 0) return;
    setDrawings((prev) => prev.slice(0, -1));

    startTransition(async () => {
      await undoLastDrawing();
      flashSaved();
    });
  };

  // Limpar todos os desenhos
  const handleClearDrawings = () => {
    setDrawings([]);

    startTransition(async () => {
      await clearUserDrawings();
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
    <div className="flex flex-col h-[calc(100vh-4.5rem)] -m-6 w-[calc(100%+3rem)] max-w-[calc(100vw-260px)] overflow-hidden bg-background relative select-none">
      {/* Barra de Ferramentas Superior Estilo Miro (Contida na Largura da Tela) */}
      <header className="h-16 px-6 border-b border-border bg-surface/95 backdrop-blur-md flex items-center justify-between gap-4 z-30 shrink-0 w-full">
        {/* Lado Esquerdo: Título e Badge de Privacidade */}
        <div className="flex items-center gap-3 shrink-0">
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
            <p className="text-xs text-text-muted hidden md:block">
              Apenas você ({userName || "você"}) tem acesso a estas notas e rabiscos.
            </p>
          </div>
        </div>

        {/* Lado Central: Pesquisa e Filtros */}
        <div className="flex items-center gap-2 flex-1 max-w-sm justify-center">
          <div className="relative w-full">
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
          <div className="hidden lg:flex items-center gap-1 bg-surface-subtle p-1 rounded-xl border border-border shrink-0">
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

        {/* Lado Direito: Alternador de Visualização & Botão Criar */}
        <div className="flex items-center gap-2.5 shrink-0">
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

          {/* Botões Rápidos */}
          <button
            type="button"
            onClick={() => handleCreateFreeText()}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface-subtle hover:border-primary text-text-title text-xs font-bold transition-all cursor-pointer"
            title="Adicionar Texto Livre na Tela"
          >
            <Type size={14} className="text-primary" />
            <span>Texto (T)</span>
          </button>

          <button
            type="button"
            onClick={() => handleCreateSticky("yellow")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
          >
            <Plus size={14} />
            <span>Post-it</span>
          </button>
        </div>
      </header>

      {/* Barra de Ferramentas Vertical Flutuante à Esquerda (Estilo Miro) */}
      {viewMode === "canvas" && (
        <MiroToolbar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          penColor={penColor}
          onChangePenColor={setPenColor}
          onAddSticky={handleCreateSticky}
          onAddFreeText={handleCreateFreeText}
          onUndoDrawing={handleUndoDrawing}
          onClearDrawings={handleClearDrawings}
          drawingsCount={drawings.length}
        />
      )}

      {/* Área Principal de Trabalho (Canvas ou Grid) */}
      <main
        ref={canvasScrollRef}
        className={`flex-1 relative overflow-auto w-full select-none ${
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
        {filteredNotes.length === 0 && drawings.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 flex items-center justify-center shadow-inner">
              <StickyNote size={32} />
            </div>
            <div className="max-w-sm space-y-1">
              <h3 className="text-base font-bold text-text-title">
                {searchTerm || selectedColorFilter !== "ALL"
                  ? "Nenhuma nota encontrada com esse filtro"
                  : "Seu mural está pronto"}
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Use a barra de ferramentas à esquerda para adicionar post-its, escrever títulos ou desenhar com a caneta.
              </p>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <button
                type="button"
                onClick={() => handleCreateSticky("yellow")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors cursor-pointer shadow-sm"
              >
                <Plus size={14} />
                <span>Novo Post-it</span>
              </button>
              <button
                type="button"
                onClick={() => handleCreateFreeText()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-surface text-text-title text-xs font-bold hover:border-primary transition-colors cursor-pointer"
              >
                <Type size={14} className="text-primary" />
                <span>Texto Livre</span>
              </button>
            </div>
          </div>
        ) : viewMode === "canvas" ? (
          /* Canvas Livre Estilo Miro */
          <div
            className="relative min-w-[2400px] min-h-[1600px] transition-transform origin-top-left"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Camada de Desenho SVG (Caneta/Rabisco) */}
            <DrawingLayer
              isDrawingMode={activeTool === "pen"}
              penColor={penColor}
              drawings={drawings}
              onSaveDrawing={handleSaveDrawing}
              zoomLevel={zoomLevel}
            />

            {/* Renderização dos Elementos (Post-its e Textos Livres) */}
            {filteredNotes.map((note) =>
              note.type === "text" ? (
                <FreeTextCard
                  key={note.id}
                  note={note}
                  isCanvasView={true}
                  onUpdate={handleUpdateNote}
                  onDelete={handleDeleteNote}
                  onDragEnd={handleDragEnd}
                />
              ) : (
                <StickyNoteCard
                  key={note.id}
                  note={note}
                  isCanvasView={true}
                  onUpdate={handleUpdateNote}
                  onDelete={handleDeleteNote}
                  onDragEnd={handleDragEnd}
                />
              )
            )}
          </div>
        ) : (
          /* Visualização Organizada em Grade */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-12">
            {filteredNotes.map((note) =>
              note.type === "text" ? (
                <FreeTextCard
                  key={note.id}
                  note={note}
                  isCanvasView={false}
                  onUpdate={handleUpdateNote}
                  onDelete={handleDeleteNote}
                />
              ) : (
                <StickyNoteCard
                  key={note.id}
                  note={note}
                  isCanvasView={false}
                  onUpdate={handleUpdateNote}
                  onDelete={handleDeleteNote}
                />
              )
            )}
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
