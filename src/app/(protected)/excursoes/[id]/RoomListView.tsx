"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BedDouble,
  Plus,
  Trash2,
  AlertTriangle,
  Check,
  Edit2,
  GripVertical,
  User,
  UserCheck,
  Search,
  ArrowRightLeft,
  Sparkles,
  Bed,
  Cake,
  PartyPopper,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { EditorBlock, BlockData } from "@/lib/editor-types";
import { GuestSelectorModal } from "./GuestSelectorModal";
import { getCustomersBirthdays } from "@/lib/actions/customers";

interface RoomListViewProps {
  blocks: EditorBlock[];
  onUpdateBlock: (blockId: string, data: BlockData, title?: string) => void;
  periodStart?: string | null;
  periodEnd?: string | null;
}

export interface RoomGuest {
  id: string; // ID único para DnD
  customerId?: string;
  nome: string;
  documento: string;
  tipo: string; // "Adulto" | "Criança (2a)" | "Criança (Colo)" | "Bebê"
  observacao: string;
  birthDate?: string | null;
}

export interface RoomEntry {
  numero: string;
  tipo: string; // "Single", "Duplo", "Triplo"...
  hospedes: RoomGuest[];
}

interface HospedagemRoom {
  tipo: string;
  qtd: string;
}

const GUEST_TYPES = ["Adulto", "Criança (2a)", "Criança (Colo)", "Bebê"];

const ROOM_CAPACITY: Record<string, number> = {
  single: 1,
  duplo: 2,
  triplo: 3,
  quádruplo: 4,
  quadruplo: 4,
  quíntuplo: 5,
  quintuplo: 5,
};

function generateGuestId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function capacityOf(tipo: string): number {
  const key = tipo.trim().toLowerCase().replace(/\s*(casal|solteiro)\s*/g, "");
  return ROOM_CAPACITY[key] ?? 2;
}

// Verifica se o aniversário cai no intervalo de datas da excursão
export function isBirthdayInPeriod(
  birthDateStr: string | null | undefined,
  periodStartStr: string | null | undefined,
  periodEndStr: string | null | undefined
): { isBirthday: boolean; dateFormatted: string; turningAge?: number } | null {
  if (!birthDateStr || !periodStartStr || !periodEndStr) return null;

  const cleanBirth = birthDateStr.split("T")[0];
  const [bYear, bMonth, bDay] = cleanBirth.split("-").map(Number);
  const start = new Date(periodStartStr + "T00:00:00");
  const end = new Date(periodEndStr + "T23:59:59");

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || !bMonth || !bDay) {
    return null;
  }

  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  for (let year = startYear; year <= endYear; year++) {
    const birthdayThisYear = new Date(year, bMonth - 1, bDay, 12, 0, 0);
    if (birthdayThisYear >= start && birthdayThisYear <= end) {
      const turningAge = bYear && bYear > 1900 ? year - bYear : undefined;
      const dateFormatted = `${String(bDay).padStart(2, "0")}/${String(bMonth).padStart(2, "0")}`;
      return { isBirthday: true, dateFormatted, turningAge };
    }
  }

  return null;
}

function syncRooms(
  hospedagemRooms: HospedagemRoom[],
  existing: RoomEntry[]
): RoomEntry[] {
  const totalQtd = hospedagemRooms.reduce(
    (sum, r) => sum + (parseInt(r.qtd) || 0),
    0
  );

  const ensureGuestIds = (guests: any[] = []): RoomGuest[] =>
    guests.map((g) => ({
      id: g.id || generateGuestId(),
      customerId: g.customerId,
      nome: g.nome || "",
      documento: g.documento || "",
      tipo: g.tipo || "Adulto",
      observacao: g.observacao || "",
      birthDate: g.birthDate || null,
    }));

  if (existing.length > 0 && existing.length === totalQtd) {
    return existing.map((r) => ({
      ...r,
      hospedes: ensureGuestIds(r.hospedes),
    }));
  }

  const result: RoomEntry[] = [];
  const usedIndexes = new Set<number>();
  let counter = 101;

  for (const hr of hospedagemRooms) {
    const qtd = parseInt(hr.qtd) || 0;
    for (let i = 0; i < qtd; i++) {
      const reusedIdx = existing.findIndex(
        (r, idx) =>
          !usedIndexes.has(idx) &&
          r.tipo.trim().toLowerCase() === hr.tipo.trim().toLowerCase()
      );

      if (reusedIdx >= 0) {
        usedIndexes.add(reusedIdx);
        result.push({
          numero: existing[reusedIdx].numero || `Quarto ${counter}`,
          tipo: existing[reusedIdx].tipo || hr.tipo,
          hospedes: ensureGuestIds(existing[reusedIdx].hospedes),
        });
      } else {
        result.push({
          numero: `Quarto ${counter}`,
          tipo: hr.tipo,
          hospedes: [],
        });
      }
      counter++;
    }
  }

  return result.length > 0 ? result : existing;
}

// ----------------------------------------------------
// COMPONENTE: ITEM DE HÓSPEDE (DRAGGABLE)
// ----------------------------------------------------
interface DraggableGuestItemProps {
  guest: RoomGuest;
  roomIdx: number;
  guestIdx: number;
  slotNumber: number;
  birthdayInfo?: {
    isBirthday: boolean;
    dateFormatted: string;
    turningAge?: number;
  } | null;
  onUpdateGuest: (
    roomIdx: number,
    guestIdx: number,
    key: keyof RoomGuest,
    value: string
  ) => void;
  onRemoveGuest: (roomIdx: number, guestIdx: number) => void;
  onOpenCustomerPicker: (roomIdx: number, slotNumber: number, guestIdx?: number) => void;
}

function DraggableGuestItem({
  guest,
  roomIdx,
  guestIdx,
  slotNumber,
  birthdayInfo,
  onUpdateGuest,
  onRemoveGuest,
  onOpenCustomerPicker,
}: DraggableGuestItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: guest.id,
    data: { guest, roomIdx, guestIdx },
  });

  const hasAlert =
    guest.observacao.toLowerCase().includes("alergia") ||
    guest.observacao.toLowerCase().includes("isent") ||
    guest.observacao.toLowerCase().includes("vegetar") ||
    guest.observacao.toLowerCase().includes("medic") ||
    guest.observacao.toLowerCase().includes("restri");

  return (
    <div
      ref={setNodeRef}
      className={`group/guest relative flex flex-col md:flex-row items-stretch md:items-center gap-3 p-3.5 rounded-xl border bg-surface transition-all ${
        birthdayInfo
          ? "border-amber-500/40 bg-gradient-to-r from-amber-500/[0.03] to-surface shadow-2xs"
          : "border-border/80 hover:border-primary/40 hover:shadow-xs"
      } ${
        isDragging ? "opacity-30 border-dashed border-primary scale-[0.98]" : ""
      }`}
    >
      {/* Indicador do Espaço e Grip de Arraste */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface-subtle cursor-grab active:cursor-grabbing transition-colors"
          title="Segure e arraste para mover este hóspede para outro quarto"
        >
          <GripVertical size={16} />
        </button>

        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-surface-subtle text-text-muted text-xs font-bold shrink-0 border border-border/60">
          {slotNumber}
        </span>

        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
          {guest.nome ? guest.nome.slice(0, 2) : <User size={14} />}
        </div>
      </div>

      {/* Dados do Hóspede: Nome, Badge de Aniversário & Documento */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
        {/* Nome com Badge de Aniversário */}
        <div className="md:col-span-5 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 flex-wrap">
            <input
              type="text"
              value={guest.nome}
              onChange={(e) =>
                onUpdateGuest(roomIdx, guestIdx, "nome", e.target.value)
              }
              placeholder="Nome completo do hóspede"
              className="px-2.5 py-1 rounded-lg border border-transparent hover:border-border focus:border-primary bg-transparent focus:bg-surface text-text-title text-sm font-semibold transition-all outline-none flex-1 min-w-[140px]"
            />

            {/* ALERTA DE ANIVERSÁRIO */}
            {birthdayInfo && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-amber-500/20 to-pink-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-2xs shrink-0 animate-pulse"
                title={`🎂 Aniversariante nesta viagem! Comemora dia ${birthdayInfo.dateFormatted}${
                  birthdayInfo.turningAge ? ` (${birthdayInfo.turningAge} anos)` : ""
                }. Lembrete para bolo ou brinde!`}
              >
                <Cake size={12} className="text-amber-500 shrink-0" />
                <span>
                  Aniversário {birthdayInfo.dateFormatted}
                  {birthdayInfo.turningAge ? ` (${birthdayInfo.turningAge}a)` : ""}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Documento (CPF / RG) */}
        <div className="md:col-span-2">
          <input
            type="text"
            value={guest.documento}
            onChange={(e) =>
              onUpdateGuest(roomIdx, guestIdx, "documento", e.target.value)
            }
            placeholder="CPF ou RG"
            className="w-full px-2.5 py-1.5 rounded-lg border border-transparent hover:border-border focus:border-primary bg-transparent focus:bg-surface text-text-muted text-xs transition-all outline-none font-mono"
          />
        </div>

        {/* Tipo (Faixa etária) */}
        <div className="md:col-span-2">
          <select
            value={guest.tipo}
            onChange={(e) =>
              onUpdateGuest(roomIdx, guestIdx, "tipo", e.target.value)
            }
            className="w-full px-2 py-1.5 rounded-lg border border-border/60 bg-surface-subtle text-text-title text-xs font-medium cursor-pointer focus:outline-none focus:border-primary transition-colors"
          >
            {GUEST_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Observação com Alerta */}
        <div className="md:col-span-3 flex items-center gap-1.5">
          {hasAlert && (
            <span title="Atenção: observação especial ou restrição">
              <AlertTriangle
                size={14}
                className="text-status-warning shrink-0 animate-pulse"
              />
            </span>
          )}
          <input
            type="text"
            value={guest.observacao}
            onChange={(e) =>
              onUpdateGuest(roomIdx, guestIdx, "observacao", e.target.value)
            }
            placeholder="Alergias, cama extra, etc."
            className={`w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-border focus:border-primary bg-transparent focus:bg-surface text-xs transition-all outline-none ${
              hasAlert ? "text-amber-600 font-medium" : "text-text-muted"
            }`}
          />
        </div>
      </div>

      {/* Ações: Vincular outro cadastro ou Remover */}
      <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/40">
        <button
          type="button"
          onClick={() => onOpenCustomerPicker(roomIdx, slotNumber, guestIdx)}
          className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
          title="Substituir ou selecionar outro cliente cadastrado"
        >
          <ArrowRightLeft size={14} />
        </button>

        <button
          type="button"
          onClick={() => onRemoveGuest(roomIdx, guestIdx)}
          className="p-1.5 rounded-lg text-text-muted hover:text-status-danger hover:bg-status-danger-bg transition-colors cursor-pointer"
          title="Remover hóspede deste quarto"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// COMPONENTE: ESPAÇO VAZIO (SLOT DISPONÍVEL)
// ----------------------------------------------------
interface EmptySlotProps {
  slotNumber: number;
  roomIdx: number;
  isExtra?: boolean;
  onOpenCustomerPicker: (roomIdx: number, slotNumber: number) => void;
}

function EmptySlot({
  slotNumber,
  roomIdx,
  isExtra,
  onOpenCustomerPicker,
}: EmptySlotProps) {
  return (
    <div
      onClick={() => onOpenCustomerPicker(roomIdx, slotNumber)}
      className="group/empty flex items-center justify-between p-3 rounded-xl border border-dashed border-border/90 hover:border-primary/60 bg-surface-subtle/40 hover:bg-primary/5 transition-all cursor-pointer"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-surface-muted text-text-muted text-xs font-semibold group-hover/empty:text-primary group-hover/empty:bg-primary/10 transition-colors">
          {slotNumber}
        </span>

        <div className="flex items-center gap-2">
          <Bed
            size={16}
            className="text-text-muted group-hover/empty:text-primary transition-colors"
          />
          <span className="text-xs font-semibold text-text-muted group-hover/empty:text-primary transition-colors">
            {isExtra ? "Cama Extra / Espaço Adicional" : `Espaço ${slotNumber} disponível`}
          </span>
          <span className="hidden sm:inline-block text-[11px] text-text-muted/70">
            — Clique para adicionar passageiro cadastrado
          </span>
        </div>
      </div>

      <button
        type="button"
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 text-primary group-hover/empty:bg-primary group-hover/empty:text-white text-xs font-bold transition-all shadow-2xs"
      >
        <Plus size={13} />
        <span>Adicionar Hóspede</span>
      </button>
    </div>
  );
}

// ----------------------------------------------------
// COMPONENTE: CARD DO QUARTO (DROPPABLE)
// ----------------------------------------------------
interface RoomCardProps {
  room: RoomEntry;
  roomIdx: number;
  isDraggingAny: boolean;
  isHoveredByDrag: boolean;
  periodStart?: string | null;
  periodEnd?: string | null;
  birthdaysMap: Record<string, string>;
  onSetRoomNumber: (roomIdx: number, value: string) => void;
  onUpdateGuest: (
    roomIdx: number,
    guestIdx: number,
    key: keyof RoomGuest,
    value: string
  ) => void;
  onRemoveGuest: (roomIdx: number, guestIdx: number) => void;
  onOpenCustomerPicker: (roomIdx: number, slotNumber: number, guestIdx?: number) => void;
  onAddExtraSlot: (roomIdx: number) => void;
  extraSlotsAllowed: boolean;
}

function RoomCard({
  room,
  roomIdx,
  isDraggingAny,
  isHoveredByDrag,
  periodStart,
  periodEnd,
  birthdaysMap,
  onSetRoomNumber,
  onUpdateGuest,
  onRemoveGuest,
  onOpenCustomerPicker,
  onAddExtraSlot,
  extraSlotsAllowed,
}: RoomCardProps) {
  const { setNodeRef } = useDroppable({
    id: `room-${roomIdx}`,
  });

  const capacity = capacityOf(room.tipo);
  const occupiedCount = room.hospedes.length;
  const isFull = occupiedCount >= capacity;

  // Resolve data de nascimento do hóspede
  const getGuestBDate = (g: RoomGuest): string | null => {
    if (g.birthDate) return g.birthDate;
    if (g.customerId && birthdaysMap[g.customerId]) return birthdaysMap[g.customerId];
    if (g.nome && birthdaysMap[g.nome.trim().toLowerCase()]) {
      return birthdaysMap[g.nome.trim().toLowerCase()];
    }
    if (g.documento) {
      const cleanDoc = g.documento.replace(/\D/g, "");
      if (cleanDoc && birthdaysMap[cleanDoc]) return birthdaysMap[cleanDoc];
    }
    return null;
  };

  // Verifica se há algum aniversariante neste quarto
  const roomBirthdayGuests = room.hospedes
    .map((g) => ({
      guest: g,
      info: isBirthdayInPeriod(getGuestBDate(g), periodStart, periodEnd),
    }))
    .filter((item) => item.info?.isBirthday);

  const shouldShowNextEmptySlot = !isFull || extraSlotsAllowed;
  const nextSlotNumber = occupiedCount + 1;

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-2xl border bg-surface shadow-shadow-card overflow-hidden transition-all duration-200 ${
        isHoveredByDrag
          ? "ring-2 ring-primary border-primary bg-primary/5 scale-[1.008]"
          : isDraggingAny
            ? "border-primary/40 bg-surface"
            : roomBirthdayGuests.length > 0
              ? "border-amber-500/40"
              : "border-border"
      }`}
    >
      {/* Header do Quarto */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-surface-subtle border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <BedDouble size={16} />
          </div>

          <div className="relative flex items-center group/title">
            <input
              type="text"
              value={room.numero}
              onChange={(e) => onSetRoomNumber(roomIdx, e.target.value)}
              placeholder="Nome do quarto..."
              className="font-bold text-base text-text-title bg-transparent hover:bg-surface focus:bg-surface border border-transparent hover:border-border focus:border-primary px-2.5 py-1 rounded-lg outline-none w-48 sm:w-60 transition-all"
              title="Clique para renomear este quarto"
            />
            <Edit2
              size={12}
              className="absolute right-2 opacity-0 group-hover/title:opacity-40 pointer-events-none transition-opacity text-text-muted"
            />
          </div>

          <span className="text-text-muted">·</span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-surface-muted text-text-muted border border-border/70">
            {room.tipo} (Capacidade: {capacity})
          </span>

          {/* Badge de Aniversariante no Quarto */}
          {roomBirthdayGuests.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse">
              <Cake size={13} className="text-amber-500" />
              <span>
                {roomBirthdayGuests.length === 1
                  ? "1 Aniversariante"
                  : `${roomBirthdayGuests.length} Aniversariantes`}
              </span>
            </span>
          )}
        </div>

        {/* Badge de Ocupação */}
        <div className="flex items-center gap-2">
          {isHoveredByDrag && (
            <span className="text-xs font-bold text-primary animate-pulse flex items-center gap-1">
              <Sparkles size={13} />
              <span>Solte para transferir hóspede</span>
            </span>
          )}

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              occupiedCount >= capacity
                ? "bg-status-success-bg text-status-success border border-status-success/20"
                : occupiedCount > 0
                  ? "bg-status-info-bg text-status-info border border-status-info/20"
                  : "bg-surface-muted text-text-muted border border-border"
            }`}
          >
            {occupiedCount}/{capacity}{" "}
            {occupiedCount === 0
              ? "Livre"
              : occupiedCount >= capacity
                ? "Completo"
                : `Vaga${capacity - occupiedCount > 1 ? "s" : ""}: ${capacity - occupiedCount}`}
          </span>
        </div>
      </div>

      {/* Lista de Espaços do Quarto */}
      <div className="p-4 space-y-2.5">
        {/* Espaços Ocupados por Hóspedes */}
        {room.hospedes.map((guest, guestIdx) => {
          const bDate = getGuestBDate(guest);
          const bInfo = isBirthdayInPeriod(bDate, periodStart, periodEnd);

          return (
            <DraggableGuestItem
              key={guest.id}
              guest={guest}
              roomIdx={roomIdx}
              guestIdx={guestIdx}
              slotNumber={guestIdx + 1}
              birthdayInfo={bInfo}
              onUpdateGuest={onUpdateGuest}
              onRemoveGuest={onRemoveGuest}
              onOpenCustomerPicker={onOpenCustomerPicker}
            />
          );
        })}

        {/* Próximo Espaço Vago */}
        {shouldShowNextEmptySlot && (
          <EmptySlot
            slotNumber={nextSlotNumber}
            roomIdx={roomIdx}
            isExtra={occupiedCount >= capacity}
            onOpenCustomerPicker={onOpenCustomerPicker}
          />
        )}

        {/* Botão de Cama Extra */}
        {isFull && !extraSlotsAllowed && (
          <div className="pt-1 text-right">
            <button
              type="button"
              onClick={() => onAddExtraSlot(roomIdx)}
              className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-primary transition-colors cursor-pointer"
            >
              <Plus size={12} />
              <span>Adicionar Cama Extra / Vaga Adicional</span>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ----------------------------------------------------
// COMPONENTE PRINCIPAL: ROOM LIST VIEW
// ----------------------------------------------------
export function RoomListView({
  blocks,
  onUpdateBlock,
  periodStart,
  periodEnd,
}: RoomListViewProps) {
  const hospedagem = blocks.find((b) => b.categoryId === "hospedagem");
  if (!hospedagem) return null;

  const data = hospedagem.data;
  const hospedagemRooms: HospedagemRoom[] = Array.isArray(data.rooms)
    ? data.rooms
    : [];
  const existingRooms: RoomEntry[] = Array.isArray(data.roomList)
    ? data.roomList
    : [];

  const [rooms, setRooms] = useState<RoomEntry[]>(() =>
    syncRooms(hospedagemRooms, existingRooms)
  );

  const [justSaved, setJustSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mapa de aniversários carregado do banco de dados para os passageiros atuais
  const [birthdaysMap, setBirthdaysMap] = useState<Record<string, string>>({});

  // Carrega aniversários dos clientes cadastrados para os hóspedes atuais
  useEffect(() => {
    const guestsToQuery = rooms
      .flatMap((r) => r.hospedes)
      .filter((g) => g.nome && !g.birthDate);

    if (guestsToQuery.length > 0) {
      getCustomersBirthdays(
        guestsToQuery.map((g) => ({
          customerId: g.customerId,
          name: g.nome,
          document: g.documento,
        }))
      ).then((map) => {
        setBirthdaysMap((prev) => ({ ...prev, ...map }));
      });
    }
  }, [rooms]);

  // Sincroniza se o bloco de hospedagem mudar externamente
  const blockIdRef = useRef(hospedagem.id);
  useEffect(() => {
    if (blockIdRef.current !== hospedagem.id) {
      blockIdRef.current = hospedagem.id;
      setRooms(syncRooms(hospedagemRooms, existingRooms));
    }
  }, [hospedagem.id, hospedagemRooms, existingRooms]);

  // Persistência debounced
  const persistRooms = useCallback(
    (newRooms: RoomEntry[]) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        onUpdateBlock(hospedagem.id, { ...data, roomList: newRooms });
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
      }, 400);
    },
    [hospedagem.id, data, onUpdateBlock]
  );

  // Camas extras por quarto
  const [extraSlotsRooms, setExtraSlotsRooms] = useState<Record<number, boolean>>({});

  const handleAddExtraSlot = (roomIdx: number) => {
    setExtraSlotsRooms((prev) => ({ ...prev, [roomIdx]: true }));
  };

  // Modal de Seleção de Clientes
  const [modalState, setModalState] = useState<{
    open: boolean;
    roomIdx: number;
    slotNumber: number;
    guestIdx?: number;
  }>({
    open: false,
    roomIdx: 0,
    slotNumber: 1,
  });

  const handleOpenCustomerPicker = (
    roomIdx: number,
    slotNumber: number,
    guestIdx?: number
  ) => {
    setModalState({
      open: true,
      roomIdx,
      slotNumber,
      guestIdx,
    });
  };

  const handleSelectCustomerForSlot = (guestData: {
    nome: string;
    documento: string;
    tipo: string;
    observacao: string;
    customerId?: string;
    birthDate?: string | null;
  }) => {
    const { roomIdx, guestIdx } = modalState;

    setRooms((prev) => {
      const next = prev.map((r, i) => {
        if (i !== roomIdx) return r;

        const newGuest: RoomGuest = {
          id:
            guestIdx !== undefined && r.hospedes[guestIdx]?.id
              ? r.hospedes[guestIdx].id
              : generateGuestId(),
          customerId: guestData.customerId,
          nome: guestData.nome,
          documento: guestData.documento,
          tipo: guestData.tipo,
          observacao: guestData.observacao,
          birthDate: guestData.birthDate || null,
        };

        let updatedGuests: RoomGuest[];
        if (guestIdx !== undefined && guestIdx < r.hospedes.length) {
          updatedGuests = r.hospedes.map((g, gi) =>
            gi === guestIdx ? newGuest : g
          );
        } else {
          updatedGuests = [...r.hospedes, newGuest];
        }

        return { ...r, hospedes: updatedGuests };
      });

      persistRooms(next);
      return next;
    });
  };

  const handleSetRoomNumber = (idx: number, value: string) => {
    setRooms((prev) => {
      const next = prev.map((r, i) => (i === idx ? { ...r, numero: value } : r));
      persistRooms(next);
      return next;
    });
  };

  const handleUpdateGuest = (
    roomIdx: number,
    guestIdx: number,
    key: keyof RoomGuest,
    value: string
  ) => {
    setRooms((prev) => {
      const next = prev.map((r, i) =>
        i === roomIdx
          ? {
              ...r,
              hospedes: r.hospedes.map((g, gi) =>
                gi === guestIdx ? { ...g, [key]: value } : g
              ),
            }
          : r
      );
      persistRooms(next);
      return next;
    });
  };

  const handleRemoveGuest = (roomIdx: number, guestIdx: number) => {
    setRooms((prev) => {
      const next = prev.map((r, i) =>
        i === roomIdx
          ? { ...r, hospedes: r.hospedes.filter((_, gi) => gi !== guestIdx) }
          : r
      );
      persistRooms(next);
      return next;
    });
  };

  // Mapa de alocações existentes para evitar duplicidade
  const existingAllocations = useMemo(() => {
    const map = new Map<string, string>();
    rooms.forEach((r) => {
      r.hospedes.forEach((g) => {
        if (g.nome) map.set(g.nome.trim().toLowerCase(), r.numero);
        if (g.documento) {
          const cleanDoc = g.documento.replace(/\D/g, "");
          if (cleanDoc) map.set(cleanDoc, r.numero);
        }
      });
    });
    return map;
  }, [rooms]);

  // Lista consolidada de todos os aniversariantes durante o período da excursão
  const allBirthdayGuests = useMemo(() => {
    if (!periodStart || !periodEnd) return [];

    const list: Array<{
      guest: RoomGuest;
      roomNumero: string;
      birthdayInfo: { isBirthday: boolean; dateFormatted: string; turningAge?: number };
    }> = [];

    rooms.forEach((r) => {
      r.hospedes.forEach((g) => {
        const bDate =
          g.birthDate ||
          (g.customerId ? birthdaysMap[g.customerId] : null) ||
          (g.nome ? birthdaysMap[g.nome.trim().toLowerCase()] : null) ||
          (g.documento ? birthdaysMap[g.documento.replace(/\D/g, "")] : null);

        const info = isBirthdayInPeriod(bDate, periodStart, periodEnd);
        if (info?.isBirthday) {
          list.push({
            guest: g,
            roomNumero: r.numero,
            birthdayInfo: info,
          });
        }
      });
    });

    return list;
  }, [rooms, periodStart, periodEnd, birthdaysMap]);

  // Estatísticas gerais
  const totalHospedes = useMemo(
    () => rooms.reduce((sum, r) => sum + r.hospedes.length, 0),
    [rooms]
  );
  const totalCapacidade = useMemo(
    () => rooms.reduce((sum, r) => sum + capacityOf(r.tipo), 0),
    [rooms]
  );
  const vagasLivres = Math.max(0, totalCapacidade - totalHospedes);

  // Filtro de busca na Room List
  const [roomFilter, setRoomFilter] = useState("");

  const filteredRooms = useMemo(() => {
    if (!roomFilter.trim()) return rooms;
    const q = roomFilter.toLowerCase();
    return rooms.filter(
      (r) =>
        r.numero.toLowerCase().includes(q) ||
        r.tipo.toLowerCase().includes(q) ||
        r.hospedes.some(
          (g) =>
            g.nome.toLowerCase().includes(q) ||
            g.documento.toLowerCase().includes(q) ||
            g.observacao.toLowerCase().includes(q)
        )
    );
  }, [rooms, roomFilter]);

  // ----------------------------------------------------
  // DRAG AND DROP COM @dnd-kit
  // ----------------------------------------------------
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const [activeDragItem, setActiveDragItem] = useState<{
    guest: RoomGuest;
    roomIdx: number;
    guestIdx: number;
  } | null>(null);

  const [overRoomId, setOverRoomId] = useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as any;
    if (data?.guest) {
      setActiveDragItem({
        guest: data.guest,
        roomIdx: data.roomIdx,
        guestIdx: data.guestIdx,
      });
    }
  };

  const handleDragOver = (event: any) => {
    setOverRoomId(event.over?.id ? String(event.over.id) : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);
    setOverRoomId(null);

    if (!over) return;

    const sourceData = active.data.current as any;
    if (!sourceData) return;

    const sourceRoomIdx = sourceData.roomIdx;
    const sourceGuestIdx = sourceData.guestIdx;

    let targetRoomIdx: number | null = null;
    const overId = String(over.id);
    if (overId.startsWith("room-")) {
      targetRoomIdx = parseInt(overId.replace("room-", ""), 10);
    }

    if (
      targetRoomIdx === null ||
      isNaN(targetRoomIdx) ||
      sourceRoomIdx === targetRoomIdx
    ) {
      return;
    }

    setRooms((prev) => {
      const sourceRoom = prev[sourceRoomIdx];
      const targetRoom = prev[targetRoomIdx!];
      if (!sourceRoom || !targetRoom) return prev;

      const guestToMove = sourceRoom.hospedes[sourceGuestIdx];
      if (!guestToMove) return prev;

      const newSourceGuests = sourceRoom.hospedes.filter(
        (_, i) => i !== sourceGuestIdx
      );
      const newTargetGuests = [...targetRoom.hospedes, guestToMove];

      const next = prev.map((r, i) => {
        if (i === sourceRoomIdx) return { ...r, hospedes: newSourceGuests };
        if (i === targetRoomIdx) return { ...r, hospedes: newTargetGuests };
        return r;
      });

      persistRooms(next);
      return next;
    });
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Banner de Aniversariantes no Período da Viagem */}
        {allBirthdayGuests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-pink-500/10 to-purple-500/10 border border-amber-500/30 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-pink-500 text-white flex items-center justify-center text-xl shadow-md shrink-0">
                🎂
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-extrabold text-sm text-text-title">
                    {allBirthdayGuests.length === 1
                      ? "1 Aniversariante nesta viagem!"
                      : `${allBirthdayGuests.length} Aniversariantes nesta viagem!`}
                  </h4>
                  <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs">
                    Comemoração no Roteiro
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mt-1">
                  {allBirthdayGuests.map((bg, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-surface/80 border border-amber-500/30 text-text-title font-medium"
                    >
                      <span>🎉</span>
                      <span className="font-bold">{bg.guest.nome}</span>
                      <span className="text-amber-600 dark:text-amber-400 font-extrabold">
                        dia {bg.birthdayInfo.dateFormatted}
                        {bg.birthdayInfo.turningAge ? ` (${bg.birthdayInfo.turningAge} anos)` : ""}
                      </span>
                      <span className="text-text-muted text-[11px]">
                        [{bg.roomNumero}]
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0 hidden md:block">
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 justify-end">
                <PartyPopper size={14} />
                <span>Planejar bolo ou brinde!</span>
              </span>
              <span className="text-[10px] text-text-muted">
                Notificação automática da agência
              </span>
            </div>
          </motion.div>
        )}

        {/* Banner Superior com Estatísticas e Busca */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-surface border border-border shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <BedDouble size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-title flex items-center gap-2">
                Room List — {data.hotel ?? "Hospedagem"}
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Arraste hóspedes entre os quartos para remanejar. Os novos espaços
                são liberados automaticamente conforme os anteriores são preenchidos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {justSaved && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full font-semibold animate-in fade-in">
                <Check size={13} />
                <span>Salvo</span>
              </span>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-surface-subtle border border-border text-text-title">
                {rooms.length} quarto{rooms.length !== 1 ? "s" : ""}
              </span>
              <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                {totalHospedes} hóspede{totalHospedes !== 1 ? "s" : ""}
              </span>
              <span
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border ${
                  vagasLivres === 0
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                    : "bg-surface-subtle border-border text-text-muted"
                }`}
              >
                {vagasLivres} vaga{vagasLivres !== 1 ? "s" : ""} livre{vagasLivres !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Filtro de Hóspedes */}
        {rooms.length > 0 && (
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              type="text"
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              placeholder="Localizar hóspede por nome, documento ou quarto..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-surface text-text-title text-xs placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        )}

        {/* Mensagem quando nenhum quarto está configurado */}
        {rooms.length === 0 && (
          <div className="bg-surface rounded-2xl border border-border p-12 text-center">
            <BedDouble size={48} className="mx-auto text-text-muted mb-3 opacity-40" />
            <p className="text-base text-text-title font-bold">
              Nenhum quarto cadastrado
            </p>
            <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
              Configure os quartos no card <strong>Hospedagem</strong> da aba Pacote
              (coluna <em>Qtd</em>) para que eles apareçam aqui automaticamente.
            </p>
          </div>
        )}

        {/* Grid de Quartos */}
        <div className="space-y-4">
          {filteredRooms.map((room) => {
            const roomIdx = rooms.findIndex((r) => r === room);
            const isHovered = overRoomId === `room-${roomIdx}`;

            return (
              <RoomCard
                key={roomIdx}
                room={room}
                roomIdx={roomIdx}
                isDraggingAny={Boolean(activeDragItem)}
                isHoveredByDrag={isHovered}
                periodStart={periodStart}
                periodEnd={periodEnd}
                birthdaysMap={birthdaysMap}
                onSetRoomNumber={handleSetRoomNumber}
                onUpdateGuest={handleUpdateGuest}
                onRemoveGuest={handleRemoveGuest}
                onOpenCustomerPicker={handleOpenCustomerPicker}
                onAddExtraSlot={handleAddExtraSlot}
                extraSlotsAllowed={Boolean(extraSlotsRooms[roomIdx])}
              />
            );
          })}
        </div>

        {/* Modal de Seleção de Clientes e Passageiros */}
        <GuestSelectorModal
          open={modalState.open}
          onClose={() => setModalState((prev) => ({ ...prev, open: false }))}
          onSelect={handleSelectCustomerForSlot}
          roomTitle={rooms[modalState.roomIdx]?.numero || "Quarto"}
          slotNumber={modalState.slotNumber}
          existingAllocations={existingAllocations}
        />

        {/* Overlay do Hóspede sendo arrastado */}
        <DragOverlay dropAnimation={{ duration: 180 }}>
          {activeDragItem ? (
            <div className="flex items-center gap-3 p-3.5 rounded-xl border-2 border-primary bg-surface shadow-2xl scale-[1.03] rotate-1 cursor-grabbing">
              <GripVertical size={16} className="text-primary" />
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs uppercase">
                {activeDragItem.guest.nome
                  ? activeDragItem.guest.nome.slice(0, 2)
                  : <UserCheck size={14} />}
              </div>
              <div>
                <h4 className="font-bold text-sm text-text-title">
                  {activeDragItem.guest.nome || "Hóspede sem nome"}
                </h4>
                <p className="text-xs text-text-muted">
                  {activeDragItem.guest.documento || "Sem documento"} ·{" "}
                  {activeDragItem.guest.tipo}
                </p>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
