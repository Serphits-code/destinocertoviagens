"use client";

import { useState, useTransition, useMemo, useRef, useCallback, useEffect } from "react";
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
  Focus,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type { NoteItem, NoteColor, NoteType, DrawingItem } from "@/lib/actions/notes";
import {
  createNote,
  updateNote,
  updateNotePosition,
  deleteNote,
  saveDrawing,
  deleteDrawing,
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

  // Pan / Arrastar tela do mural (estilo Miro/Figma)
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (viewMode !== "canvas" || activeTool === "pen" || activeTool === "eraser") return;
    // Aceita clique com botão esquerdo (0) ou botão de rolagem/meio (1)
    if (e.button !== 0 && e.button !== 1) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Se o clique ocorreu em um post-it, card de texto, botão, input, textarea ou toolbar, NÃO arrasta o canvas
    if (
      target.closest("[data-note-card]") ||
      target.closest("button") ||
      target.closest("input") ||
      target.closest("textarea") ||
      target.closest("aside") ||
      target.closest("header") ||
      target.closest("footer")
    ) {
      return;
    }

    if (!canvasScrollRef.current) return;

    setIsPanning(true);
    panStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: canvasScrollRef.current.scrollLeft,
      scrollTop: canvasScrollRef.current.scrollTop,
    };

    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!panStartRef.current || !canvasScrollRef.current) return;
      const dx = moveEvent.clientX - panStartRef.current.startX;
      const dy = moveEvent.clientY - panStartRef.current.startY;
      canvasScrollRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
      canvasScrollRef.current.scrollTop = panStartRef.current.scrollTop - dy;
    };

    const onPointerUp = () => {
      setIsPanning(false);
      panStartRef.current = null;
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  // Cálculo do ponto central de todas as notas e desenhos existentes
  const getNotesCenter = useCallback(
    (notesList: NoteItem[], drawingsList: DrawingItem[] = []) => {
      if (notesList.length === 0 && drawingsList.length === 0) return null;

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      for (const n of notesList) {
        const w = n.type === "sticky" ? 256 : 180;
        const h = n.type === "sticky" ? 220 : 80;

        minX = Math.min(minX, n.posX);
        maxX = Math.max(maxX, n.posX + w);
        minY = Math.min(minY, n.posY);
        maxY = Math.max(maxY, n.posY + h);
      }

      // Se não houver notas, utiliza as coordenadas dos desenhos
      if (notesList.length === 0) {
        for (const d of drawingsList) {
          const nums = d.pathData.match(/\d+/g)?.map(Number) || [];
          for (let i = 0; i < nums.length; i += 2) {
            if (nums[i] !== undefined) {
              minX = Math.min(minX, nums[i]);
              maxX = Math.max(maxX, nums[i]);
            }
            if (nums[i + 1] !== undefined) {
              minY = Math.min(minY, nums[i + 1]);
              maxY = Math.max(maxY, nums[i + 1]);
            }
          }
        }
      }

      if (minX === Infinity) return null;

      return {
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
      };
    },
    []
  );

  // Centraliza a visão do canvas exatamente sobre as notas
  const centerOnNotes = useCallback(
    (smooth = true, targetNotes = notes, targetDrawings = drawings) => {
      if (!canvasScrollRef.current) return;

      const center = getNotesCenter(targetNotes, targetDrawings);
      if (!center) return;

      const viewportWidth = canvasScrollRef.current.clientWidth;
      const viewportHeight = canvasScrollRef.current.clientHeight;

      const targetX = center.centerX * zoomLevel - viewportWidth / 2;
      const targetY = center.centerY * zoomLevel - viewportHeight / 2;

      const scrollLeft = Math.max(0, targetX);
      const scrollTop = Math.max(0, targetY);

      canvasScrollRef.current.scrollTo({
        left: scrollLeft,
        top: scrollTop,
        behavior: smooth ? "smooth" : "auto",
      });
    },
    [notes, drawings, zoomLevel, getNotesCenter]
  );

  // Centraliza a visão do canvas em uma nota específica (usado na busca e navegação)
  const centerOnSingleNote = useCallback(
    (note: NoteItem, smooth = true) => {
      if (!canvasScrollRef.current) return;

      const w = note.type === "sticky" ? 256 : 160;
      const h = note.type === "sticky" ? 220 : 60;

      const noteCenterX = note.posX + w / 2;
      const noteCenterY = note.posY + h / 2;

      const viewportWidth = canvasScrollRef.current.clientWidth;
      const viewportHeight = canvasScrollRef.current.clientHeight;

      const targetX = noteCenterX * zoomLevel - viewportWidth / 2;
      const targetY = noteCenterY * zoomLevel - viewportHeight / 2;

      const scrollLeft = Math.max(0, targetX);
      const scrollTop = Math.max(0, targetY);

      canvasScrollRef.current.scrollTo({
        left: scrollLeft,
        top: scrollTop,
        behavior: smooth ? "smooth" : "auto",
      });
    },
    [zoomLevel]
  );

  // Ao carregar a página pela primeira vez, centraliza automaticamente nas notas já colocadas
  const hasInitialCenteredRef = useRef(false);
  useEffect(() => {
    if (
      !hasInitialCenteredRef.current &&
      (initialNotes.length > 0 || initialDrawings.length > 0)
    ) {
      const t = setTimeout(() => {
        centerOnNotes(false, initialNotes, initialDrawings);
        hasInitialCenteredRef.current = true;
      }, 100);
      return () => clearTimeout(t);
    }
  }, [initialNotes, initialDrawings, centerOnNotes]);

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

  // Apagar traço individual (Borracha)
  const handleDeleteDrawing = (id: string) => {
    setDrawings((prev) => prev.filter((d) => d.id !== id));

    startTransition(async () => {
      await deleteDrawing(id);
      flashSaved();
    });
  };

  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lista de notas que atendem a busca atual
  const matchedNotes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return notes.filter((n) => {
      const matchesSearch =
        (n.title && n.title.toLowerCase().includes(term)) ||
        (n.content && n.content.toLowerCase().includes(term));
      const matchesColor =
        selectedColorFilter === "ALL" || n.color === selectedColorFilter;
      return matchesSearch && matchesColor;
    });
  }, [notes, searchTerm, selectedColorFilter]);

  // Ao digitar no campo de busca, centraliza automaticamente na nota encontrada
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    setCurrentMatchIdx(0);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (val.trim()) {
      searchTimerRef.current = setTimeout(() => {
        const term = val.trim().toLowerCase();
        const firstMatch = notes.find((n) => {
          const matches =
            (n.title && n.title.toLowerCase().includes(term)) ||
            (n.content && n.content.toLowerCase().includes(term));
          const matchesColor =
            selectedColorFilter === "ALL" || n.color === selectedColorFilter;
          return matches && matchesColor;
        });

        if (firstMatch && viewMode === "canvas") {
          centerOnSingleNote(firstMatch, true);
        }
      }, 120);
    }
  };

  const handleNextMatch = () => {
    if (matchedNotes.length === 0) return;
    const nextIdx = (currentMatchIdx + 1) % matchedNotes.length;
    setCurrentMatchIdx(nextIdx);
    if (viewMode === "canvas") {
      centerOnSingleNote(matchedNotes[nextIdx], true);
    }
  };

  const handlePrevMatch = () => {
    if (matchedNotes.length === 0) return;
    const prevIdx =
      (currentMatchIdx - 1 + matchedNotes.length) % matchedNotes.length;
    setCurrentMatchIdx(prevIdx);
    if (viewMode === "canvas") {
      centerOnSingleNote(matchedNotes[prevIdx], true);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrevMatch();
      } else {
        handleNextMatch();
      }
    } else if (e.key === "Escape") {
      setSearchTerm("");
      setCurrentMatchIdx(0);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setCurrentMatchIdx(0);
  };

  // Filtros aplicados para a exibição em Grade (Grid)
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
        <div className="flex items-center gap-2 flex-1 max-w-md justify-center">
          <div className="relative w-full flex items-center">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar nas notas... (Enter para navegar)"
              className="w-full pl-8 pr-24 py-1.5 rounded-xl border border-border bg-surface-subtle text-xs text-text-body placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface transition-all"
            />
            <Search
              size={14}
              className="absolute left-2.5 text-text-muted pointer-events-none"
            />

            {/* Controles da busca: Contador + Setas + Limpar */}
            {searchTerm && (
              <div className="absolute right-1.5 flex items-center gap-0.5 bg-surface rounded-lg px-1.5 py-0.5 border border-border shadow-xs">
                {matchedNotes.length > 0 ? (
                  <>
                    <span className="text-[10px] font-bold text-text-muted tabular-nums pr-1">
                      {currentMatchIdx + 1}/{matchedNotes.length}
                    </span>
                    {matchedNotes.length > 1 && (
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={handlePrevMatch}
                          className="p-0.5 hover:bg-surface-muted rounded text-text-muted hover:text-text-title cursor-pointer"
                          title="Anterior (Shift + Enter)"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={handleNextMatch}
                          className="p-0.5 hover:bg-surface-muted rounded text-text-muted hover:text-text-title cursor-pointer"
                          title="Próxima (Enter)"
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-[10px] text-text-muted px-1 font-medium">
                    0 notas
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="p-0.5 hover:bg-surface-muted rounded text-text-muted hover:text-red-500 cursor-pointer ml-0.5"
                  title="Limpar busca (Esc)"
                >
                  <X size={12} />
                </button>
              </div>
            )}
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
        onPointerDown={handleCanvasPointerDown}
        className={`flex-1 relative overflow-auto w-full select-none ${
          viewMode === "canvas"
            ? activeTool === "pen"
              ? "cursor-crosshair"
              : activeTool === "eraser"
              ? "cursor-pointer"
              : isPanning
              ? "cursor-grabbing"
              : "cursor-grab"
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
        {!searchTerm && selectedColorFilter === "ALL" && notes.length === 0 && drawings.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 flex items-center justify-center shadow-inner">
              <StickyNote size={32} />
            </div>
            <div className="max-w-sm space-y-1">
              <h3 className="text-base font-bold text-text-title">
                Seu mural está pronto
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
            className={`relative min-w-[2400px] min-h-[1600px] transition-transform origin-top-left ${
              activeTool === "pen"
                ? "cursor-crosshair"
                : activeTool === "eraser"
                ? "cursor-pointer"
                : isPanning
                ? "cursor-grabbing"
                : "cursor-grab"
            }`}
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Camada de Desenho SVG (Caneta/Rabisco e Borracha) */}
            <DrawingLayer
              isDrawingMode={activeTool === "pen"}
              isEraserMode={activeTool === "eraser"}
              penColor={penColor}
              drawings={drawings}
              onSaveDrawing={handleSaveDrawing}
              onDeleteDrawing={handleDeleteDrawing}
              zoomLevel={zoomLevel}
            />

            {/* Renderização dos Elementos (Post-its e Textos Livres) */}
            {notes
              .filter(
                (n) =>
                  selectedColorFilter === "ALL" || n.color === selectedColorFilter
              )
              .map((note) => {
                const isSearchActive = searchTerm.trim().length > 0;
                const isMatch =
                  isSearchActive && matchedNotes.some((m) => m.id === note.id);
                const isCurrentMatch =
                  isSearchActive && matchedNotes[currentMatchIdx]?.id === note.id;
                const isDimmed = isSearchActive && !isMatch;

                return note.type === "text" ? (
                  <FreeTextCard
                    key={note.id}
                    note={note}
                    isCanvasView={true}
                    onUpdate={handleUpdateNote}
                    onDelete={handleDeleteNote}
                    onDragEnd={handleDragEnd}
                    isHighlighted={isCurrentMatch}
                    isDimmed={isDimmed}
                  />
                ) : (
                  <StickyNoteCard
                    key={note.id}
                    note={note}
                    isCanvasView={true}
                    onUpdate={handleUpdateNote}
                    onDelete={handleDeleteNote}
                    onDragEnd={handleDragEnd}
                    isHighlighted={isCurrentMatch}
                    isDimmed={isDimmed}
                  />
                );
              })}
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
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-surface/90 border border-border shadow-lg backdrop-blur-md text-[11px] font-medium text-text-muted select-none">
            {activeTool === "eraser" ? (
              <>
                <span className="text-sm leading-none">🧹</span>
                <span className="text-primary font-semibold">Borracha: Clique ou passe sobre os rabiscos para apagá-los</span>
              </>
            ) : activeTool === "pen" ? (
              <>
                <span className="text-sm leading-none">✏️</span>
                <span>Modo Caneta: Desenhe livremente no mural</span>
              </>
            ) : (
              <>
                <span className="text-sm leading-none">✋</span>
                <span>Arraste o fundo para navegar</span>
              </>
            )}
          </div>
        )}

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

            <button
              type="button"
              onClick={() => centerOnNotes(true)}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-title hover:bg-surface-muted transition-colors cursor-pointer"
              title="Centralizar nas Notas"
            >
              <Focus size={14} />
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}
