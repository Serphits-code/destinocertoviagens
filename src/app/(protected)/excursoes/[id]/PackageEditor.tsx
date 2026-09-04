"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  startTransition,
} from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Check, BedDouble, Package, Compass, Pencil, GripVertical } from "lucide-react";
import type { EditorBlock, BlockCategoryId, BlockData } from "@/lib/editor-types";
import type { ItineraryItem } from "@/lib/actions/itinerary";
import {
  updateExcursionHeader,
  addBlock,
  addBlockFromPreset,
  updateBlockData,
  deleteBlock,
  duplicateBlock,
  reorderBlocks,
  toggleBlockCollapsed,
} from "@/lib/actions/blocks";
import { CATEGORY_DEFINITIONS } from "@/lib/categories";
import { BlockCard } from "./BlockCard";
import { AddBlockModal } from "./AddBlockModal";
import { SummaryWidget } from "./SummaryWidget";
import { RoomListView } from "./RoomListView";
import { ItineraryView, DEFAULT_SAO_PAULO_ITINERARY } from "./ItineraryView";
import { updateExcursionItinerary } from "@/lib/actions/itinerary";
import { WeatherClimateBadge } from "@/components/WeatherClimateBadge";

interface PackageEditorProps {
  excursionId: string;
  initialName: string;
  initialDestination?: string | null;
  initialDestinations?: Array<{ name: string; latitude: number; longitude: number }>;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  initialPeriodStart: string | null;
  initialPeriodEnd: string | null;
  initialSlots: number;
  initialBlocks: EditorBlock[];
  initialItinerary?: ItineraryItem[];
}

function generateTempId() {
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function PackageEditor({
  excursionId,
  initialName,
  initialDestination,
  initialDestinations = [],
  initialLatitude,
  initialLongitude,
  initialPeriodStart,
  initialPeriodEnd,
  initialSlots,
  initialBlocks,
  initialItinerary,
}: PackageEditorProps) {
  const [blocks, setBlocks] = useState<EditorBlock[]>(initialBlocks);
  const [name, setName] = useState(initialName);
  const [periodStart, setPeriodStart] = useState(initialPeriodStart ?? "");
  const [periodEnd, setPeriodEnd] = useState(initialPeriodEnd ?? "");
  const [slots, setSlots] = useState(initialSlots);
  const [activeDestIdx, setActiveDestIdx] = useState(0);
  const [saved, setSaved] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [insertIndex, setInsertIndex] = useState<number | undefined>(undefined);
  const [mounted, setMounted] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [view, setView] = useState<"pacote" | "roomlist" | "roteiro">("pacote");

  // ---- Roteiro ----
  const [itinerary, setItinerary] = useState<ItineraryItem[]>(
    initialItinerary && initialItinerary.length > 0
      ? initialItinerary
      : DEFAULT_SAO_PAULO_ITINERARY
  );
  const [itinerarySaved, setItinerarySaved] = useState(false);
  const itineraryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistItinerary = useCallback(
    (newItems: ItineraryItem[]) => {
      if (itineraryTimer.current) clearTimeout(itineraryTimer.current);
      itineraryTimer.current = setTimeout(async () => {
        await updateExcursionItinerary(excursionId, newItems);
        setItinerarySaved(true);
        setTimeout(() => setItinerarySaved(false), 2000);
      }, 500);
    },
    [excursionId]
  );

  const handleAddItineraryItem = useCallback((targetDay?: number) => {
    const newItem: ItineraryItem = {
      id: `it_${Date.now()}`,
      day: targetDay || 1,
      time: "09h00",
      title: "Nova atividade",
      location: "",
    };
    setItinerary((prev) => {
      const next = [...prev, newItem];
      persistItinerary(next);
      return next;
    });
  }, [persistItinerary]);

  const handleUpdateItineraryItem = useCallback(
    (id: string, patch: Partial<ItineraryItem>) => {
      setItinerary((prev) => {
        const next = prev.map((item) => (item.id === id ? { ...item, ...patch } : item));
        persistItinerary(next);
        return next;
      });
    },
    [persistItinerary]
  );

  const handleDeleteItineraryItem = useCallback(
    (id: string) => {
      setItinerary((prev) => {
        const next = prev.filter((i) => i.id !== id);
        persistItinerary(next);
        return next;
      });
    },
    [persistItinerary]
  );

  const handleMoveItineraryItem = useCallback(
    (index: number, direction: "up" | "down") => {
      setItinerary((prev) => {
        if (
          (direction === "up" && index === 0) ||
          (direction === "down" && index === prev.length - 1)
        ) {
          return prev;
        }
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        const next = [...prev];
        const temp = next[index];
        next[index] = next[targetIndex];
        next[targetIndex] = temp;
        persistItinerary(next);
        return next;
      });
    },
    [persistItinerary]
  );

  // Gate de montagem: DnD só renderiza no cliente (corrige hydration mismatch)
  useEffect(() => setMounted(true), []);

  // O switch Room List só aparece se houver bloco de hospedagem com quartos cadastrados
  const hasHospedagem = blocks.some(
    (b) =>
      b.categoryId === "hospedagem" &&
      Array.isArray(b.data.rooms) &&
      b.data.rooms.length > 0
  );

  const activeBlock = activeBlockId
    ? blocks.find((b) => b.id === activeBlockId)
    : null;

  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashSaved = useCallback(() => {
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  // ---- Header (nome, período, vagas) com auto-save debounced ----
  const headerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistHeader = useCallback(
    (patch: Partial<{ name: string; periodStart: string | null; periodEnd: string | null; slots: number }>) => {
      if (headerTimer.current) clearTimeout(headerTimer.current);
      headerTimer.current = setTimeout(() => {
        startTransition(async () => {
          await updateExcursionHeader(excursionId, patch);
          flashSaved();
        });
      }, 800);
    },
    [excursionId, flashSaved]
  );

  // ---- Blocos ----

  const persistBlockData = useCallback(
    (blockId: string, data: BlockData, title?: string) => {
      if (blockId.startsWith("temp_")) return; // aguarda id real
      startTransition(async () => {
        await updateBlockData(blockId, data, title);
        flashSaved();
      });
    },
    [flashSaved]
  );

  const handleUpdateBlock = useCallback(
    (blockId: string, data: BlockData, title?: string) => {
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId ? { ...b, data, ...(title !== undefined && { title }) } : b
        )
      );
      persistBlockData(blockId, data, title);
    },
    [persistBlockData]
  );

  const handleAddBlock = useCallback(
    (categoryId: BlockCategoryId, presetId?: string) => {
      const index = insertIndex ?? blocks.length;
      setModalOpen(false);

      // Inserção otimista com id temporário
      const tempId = generateTempId();
      const tempBlock: EditorBlock = {
        id: tempId,
        categoryId,
        title: "Carregando...",
        order: index,
        collapsed: false,
        data: {},
      };
      setBlocks((prev) => {
        const next = [...prev];
        next.splice(index, 0, tempBlock);
        return next.map((b, i) => ({ ...b, order: i }));
      });

      startTransition(async () => {
        const result = presetId
          ? await addBlockFromPreset(excursionId, presetId, index)
          : await addBlock(excursionId, categoryId, index);

        if (result.blockId) {
          // Recarrega para obter o bloco com dados completos do servidor
          window.location.reload();
        }
        flashSaved();
      });
    },
    [blocks.length, excursionId, insertIndex, flashSaved]
  );

  const handleDeleteBlock = useCallback(
    (blockId: string) => {
      if (!confirm("Deseja realmente excluir este card?")) return;
      setBlocks((prev) =>
        prev.filter((b) => b.id !== blockId).map((b, i) => ({ ...b, order: i }))
      );
      if (!blockId.startsWith("temp_")) {
        startTransition(async () => {
          await deleteBlock(blockId);
          flashSaved();
        });
      }
    },
    [flashSaved]
  );

  const handleDuplicateBlock = useCallback(
    (blockId: string) => {
      const index = blocks.findIndex((b) => b.id === blockId);
      if (index === -1) return;
      const original = blocks[index];
      const clone: EditorBlock = {
        ...original,
        id: generateTempId(),
        title: `${original.title} (Cópia)`,
        data: JSON.parse(JSON.stringify(original.data)),
      };
      setBlocks((prev) => {
        const next = [...prev];
        next.splice(index + 1, 0, clone);
        return next.map((b, i) => ({ ...b, order: i }));
      });
      if (!blockId.startsWith("temp_")) {
        startTransition(async () => {
          const result = await duplicateBlock(blockId);
          if (result.blockId) {
            window.location.reload();
          }
          flashSaved();
        });
      }
    },
    [blocks, flashSaved]
  );

  const handleToggleCollapse = useCallback(
    (blockId: string) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === blockId ? { ...b, collapsed: !b.collapsed } : b))
      );
      if (!blockId.startsWith("temp_")) {
        const block = blocks.find((b) => b.id === blockId);
        startTransition(async () => {
          await toggleBlockCollapsed(blockId, !block?.collapsed);
        });
      }
    },
    [blocks]
  );

  const expandAll = () =>
    setBlocks((prev) => prev.map((b) => ({ ...b, collapsed: false })));
  const collapseAll = () =>
    setBlocks((prev) => prev.map((b) => ({ ...b, collapsed: true })));

  // ---- Drag & Drop ----
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveBlockId(String(event.active.id));
  }, []);

  // Reordenação debounced segura fora do ciclo de render
  const reorderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistBlockOrder = useCallback(
    (orderedIds: string[]) => {
      if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current);
      reorderTimerRef.current = setTimeout(async () => {
        const realIds = orderedIds.filter((id) => !id.startsWith("temp_"));
        if (realIds.length === orderedIds.length) {
          await reorderBlocks(excursionId, realIds);
          flashSaved();
        }
      }, 350);
    },
    [excursionId, flashSaved]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveBlockId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(blocks, oldIndex, newIndex).map((b, i) => ({
        ...b,
        order: i,
      }));

      setBlocks(reordered);
      persistBlockOrder(reordered.map((b) => b.id));
    },
    [blocks, persistBlockOrder]
  );

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Indicador de salvamento */}
      <div className="flex items-center justify-between">
        <a
          href="/excursoes"
          className="text-sm text-text-muted hover:text-primary transition-colors"
        >
          ← Voltar para Excursões
        </a>
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {saved && (
              <motion.span
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-sm text-status-success bg-status-success-bg px-3 py-1 rounded-full"
              >
                <Check size={14} /> Salvo
              </motion.span>
            )}
          </AnimatePresence>

          {/* Switch Pacote / Room List / Roteiro */}
          <div className="flex items-center bg-surface-muted rounded-lg p-1 border border-border">
            <button
              onClick={() => setView("pacote")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                view === "pacote"
                  ? "bg-surface text-text-title shadow-shadow-card"
                  : "text-text-muted hover:text-text-body"
              }`}
            >
              <Package size={15} /> Pacote
            </button>
            {hasHospedagem && (
              <button
                onClick={() => setView("roomlist")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  view === "roomlist"
                    ? "bg-surface text-text-title shadow-shadow-card"
                    : "text-text-muted hover:text-text-body"
                }`}
              >
                <BedDouble size={15} /> Room List
              </button>
            )}
            <button
              onClick={() => setView("roteiro")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                view === "roteiro"
                  ? "bg-surface text-text-title shadow-shadow-card"
                  : "text-text-muted hover:text-text-body"
              }`}
            >
              <Compass size={15} /> Roteiro
            </button>
          </div>
        </div>
      </div>

      {/* Banner do pacote */}
      <div className="bg-surface rounded-2xl border border-border shadow-shadow-card p-6">
        <div className="flex items-center justify-between gap-4">
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              persistHeader({ name: e.target.value });
            }}
            className="text-2xl font-bold text-text-title bg-transparent border-none outline-none w-full focus:ring-0 placeholder:text-text-muted"
            placeholder="Nome do pacote"
          />

          <a
            href={`/excursoes/${excursionId}/editar`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface-subtle hover:border-primary text-text-title text-xs font-semibold shrink-0 transition-colors cursor-pointer"
            title="Editar dados básicos, destinos no mapa e período da excursão"
          >
            <Pencil size={13} className="text-primary" />
            <span>Editar Dados / Mapa</span>
          </a>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-3 border-t border-border/60 text-sm text-text-muted">
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2">
              Período:
              <input
                type="date"
                value={periodStart}
                onChange={(e) => {
                  setPeriodStart(e.target.value);
                  persistHeader({ periodStart: e.target.value || null });
                }}
                className="px-2 py-1 rounded-lg border border-border bg-surface-subtle text-text-body focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span>até</span>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => {
                  setPeriodEnd(e.target.value);
                  persistHeader({ periodEnd: e.target.value || null });
                }}
                className="px-2 py-1 rounded-lg border border-border bg-surface-subtle text-text-body focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <label className="flex items-center gap-2">
              Vagas:
              <input
                type="number"
                min={0}
                value={slots}
                onChange={(e) => {
                  const v = parseInt(e.target.value) || 0;
                  setSlots(v);
                  persistHeader({ slots: v });
                }}
                className="w-20 px-2 py-1 rounded-lg border border-border bg-surface-subtle text-text-body focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
          </div>

          {/* Badge de Clima da Época do Ano com suporte a Múltiplos Destinos */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            {initialDestinations.length > 1 && (
              <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-xl border border-border">
                {initialDestinations.map((d, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveDestIdx(idx)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      idx === activeDestIdx
                        ? "bg-primary text-white shadow-2xs"
                        : "text-text-muted hover:text-text-title"
                    }`}
                  >
                    {idx + 1}. {d.name.split(",")[0]}
                  </button>
                ))}
              </div>
            )}

            <WeatherClimateBadge
              packageName={
                initialDestinations[activeDestIdx]?.name ||
                initialDestination ||
                name
              }
              periodStart={periodStart}
              periodEnd={periodEnd}
              fallbackCity={
                initialDestinations[activeDestIdx]?.name ||
                initialDestination ||
                blocks.find((b) => b.categoryId === "hospedagem")?.data?.cidade
              }
              latitude={
                initialDestinations[activeDestIdx]?.latitude ?? initialLatitude
              }
              longitude={
                initialDestinations[activeDestIdx]?.longitude ?? initialLongitude
              }
            />
          </div>
        </div>
      </div>

      {/* Layout: editor + sidebar */}
      <div className="flex gap-6 items-start">
        {/* Coluna principal */}
        <div className="flex-1 min-w-0 space-y-0">
          {view === "roomlist" ? (
            <RoomListView
              blocks={blocks}
              onUpdateBlock={handleUpdateBlock}
              periodStart={periodStart}
              periodEnd={periodEnd}
            />
          ) : view === "roteiro" ? (
            <ItineraryView
              excursionId={excursionId}
              itinerary={itinerary}
              periodStart={periodStart}
              periodEnd={periodEnd}
              onAddItem={handleAddItineraryItem}
              onUpdateItem={handleUpdateItineraryItem}
              onDeleteItem={handleDeleteItineraryItem}
              onMoveItem={handleMoveItineraryItem}
              saved={itinerarySaved}
            />
          ) : blocks.length === 0 ? (
            <div className="bg-surface rounded-2xl border border-border p-12 text-center">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-lg font-semibold text-text-title">
                Nenhum item adicionado ao pacote
              </h3>
              <p className="text-text-muted mt-1 mb-6">
                Clique em &quot;Adicionar Card&quot; para começar a montar o pacote.
              </p>
              <button
                onClick={() => {
                  setInsertIndex(0);
                  setModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-contrast font-semibold hover:bg-primary-strong transition-colors"
              >
                <Plus size={18} /> Adicionar Primeiro Item
              </button>
            </div>
          ) : mounted ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                {blocks.map((block, index) => (
                  <div
                    key={block.id}
                    className={
                      activeBlockId && activeBlockId !== block.id
                        ? "opacity-40 transition-opacity"
                        : "transition-opacity"
                    }
                  >
                    {/* Divisor de inserção */}
                    <button
                      onClick={() => {
                        setInsertIndex(index);
                        setModalOpen(true);
                      }}
                      className="w-full group flex items-center gap-3 py-1.5 opacity-0 hover:opacity-100 transition-opacity"
                      title="Inserir card nesta posição"
                    >
                      <span className="flex-1 h-px bg-border group-hover:bg-primary transition-colors" />
                      <span className="text-xs text-text-muted group-hover:text-primary flex items-center gap-1 transition-colors">
                        <Plus size={12} /> Inserir aqui
                      </span>
                      <span className="flex-1 h-px bg-border group-hover:bg-primary transition-colors" />
                    </button>

                    <BlockCard
                      block={block}
                      onUpdate={handleUpdateBlock}
                      onDelete={handleDeleteBlock}
                      onDuplicate={handleDuplicateBlock}
                      onToggleCollapse={handleToggleCollapse}
                    />
                  </div>
                ))}

                {/* Divisor final */}
                <button
                  onClick={() => {
                    setInsertIndex(blocks.length);
                    setModalOpen(true);
                  }}
                  className="w-full group flex items-center gap-3 py-1.5 opacity-0 hover:opacity-100 transition-opacity"
                >
                  <span className="flex-1 h-px bg-border group-hover:bg-primary transition-colors" />
                  <span className="text-xs text-text-muted group-hover:text-primary flex items-center gap-1 transition-colors">
                    <Plus size={12} /> Inserir aqui
                  </span>
                  <span className="flex-1 h-px bg-border group-hover:bg-primary transition-colors" />
                </button>
              </SortableContext>

              {/* Preview flutuante do card sendo arrastado idêntico à Room List */}
              <DragOverlay dropAnimation={{ duration: 180 }}>
                {activeBlock ? (
                  <div className="bg-surface rounded-2xl border-2 border-primary shadow-2xl px-5 py-4 flex items-center justify-between gap-4 rotate-1 scale-[1.03] cursor-grabbing opacity-95">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {CATEGORY_DEFINITIONS[activeBlock.categoryId]?.icon ?? "📦"}
                      </span>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-primary">
                          {CATEGORY_DEFINITIONS[activeBlock.categoryId]?.name ?? activeBlock.categoryId}
                        </span>
                        <h3 className="font-bold text-sm text-text-title">
                          {activeBlock.title}
                        </h3>
                      </div>
                    </div>
                    <GripVertical size={18} className="text-primary shrink-0" />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            // SSR / pré-hidratação: lista estática sem DnD (evita hydration mismatch)
            blocks.map((block) => (
              <div key={block.id} className="mb-4">
                <BlockCard
                  block={block}
                  onUpdate={handleUpdateBlock}
                  onDelete={handleDeleteBlock}
                  onDuplicate={handleDuplicateBlock}
                  onToggleCollapse={handleToggleCollapse}
                />
              </div>
            ))
          )}
        </div>

        {/* Sidebar: lateral com Resumo Financeiro, Ações e Botão que rolam juntos mantendo-se sempre visíveis */}
        <aside className="w-72 shrink-0 hidden lg:block sticky top-20 self-start space-y-4">
          {/* Botão de Adicionar Ponto — Posicionado junto com o Resumo Financeiro sem duplicação */}
          {view === "roteiro" && (
            <button
              onClick={() => handleAddItineraryItem()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-primary text-white text-sm font-bold shadow-lg hover:bg-primary-strong transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus size={18} />
              <span>Adicionar Ponto</span>
            </button>
          )}

          {/* Botão de Adicionar Card no Pacote */}
          {view === "pacote" && (
            <button
              onClick={() => {
                setInsertIndex(undefined);
                setModalOpen(true);
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-primary text-white text-sm font-bold shadow-lg hover:bg-primary-strong transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus size={18} />
              <span>Adicionar Card</span>
            </button>
          )}

          <SummaryWidget blocks={blocks} slots={slots} />
          <div className="bg-surface rounded-2xl border border-border shadow-shadow-card p-4 space-y-2">
            <h4 className="text-sm font-semibold text-text-title">⚡ Ações Rápidas</h4>
            <button
              onClick={expandAll}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-text-body hover:bg-surface-muted transition-colors"
            >
              ➕ Expandir Todos
            </button>
            <button
              onClick={collapseAll}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-text-body hover:bg-surface-muted transition-colors"
            >
              ➖ Minimizar Todos
            </button>
            <button
              onClick={() => window.print()}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-text-body hover:bg-surface-muted transition-colors"
            >
              🖨️ Imprimir / PDF
            </button>
          </div>
        </aside>
      </div>

      {/* Modal de adicionar bloco */}
      <AddBlockModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={handleAddBlock}
      />
    </div>
  );
}
