"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
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
  Hotel,
  MapPin,
  Moon,
  Layers,
  Baby,
  Printer,
  Gift,
  DollarSign,
  Tag,
} from "lucide-react";
import { HotelRoomListPrintModal } from "./HotelRoomListPrintModal";
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
import { getGuestAge, getGuestAgeBracket, formatBRL, parseNum } from "@/lib/package-calc";

interface RoomListViewProps {
  blocks: EditorBlock[];
  onUpdateBlock: (blockId: string, data: BlockData, title?: string) => void;
  periodStart?: string | null;
  periodEnd?: string | null;
  excursionName?: string;
  destination?: string | null;
}

export interface RoomGuest {
  id: string; // ID único para DnD
  customerId?: string;
  nome: string;
  documento: string;
  tipo: string; // "Adulto" | "Criança (2a)" | "Criança (Colo)" | "Bebê"
  observacao: string;
  birthDate?: string | null;
  isExtra?: boolean;
  billingType?: "padrao" | "cortesia" | "personalizado";
  isCortesia?: boolean;
  customValor?: string;
}

export interface RoomEntry {
  numero: string;
  tipo: string; // "Single", "Duplo", "Triplo"...
  hospedes: RoomGuest[];
  blockId?: string;
  hotelName?: string;
  extraSlots?: number;
}

interface HospedagemRoom {
  tipo: string;
  qtd: string;
}

function fmtBirthDate(bDate: string): string {
  const clean = bDate.split("T")[0];
  const parts = clean.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return bDate;
}

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
  const lower = tipo.trim().toLowerCase();
  for (const [key, cap] of Object.entries(ROOM_CAPACITY)) {
    if (lower.includes(key)) return cap;
  }
  if (lower.includes("casal")) return 2;
  if (lower.includes("solteiro")) return 1;
  const numMatch = lower.match(/(\d+)/);
  if (numMatch && parseInt(numMatch[1], 10) > 0) {
    return parseInt(numMatch[1], 10);
  }
  return 2;
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ensureGuestIds = (guests: any[] = []): RoomGuest[] =>
    guests.map((g) => ({
      id: g.id || generateGuestId(),
      customerId: g.customerId,
      nome: g.nome || "",
      documento: g.documento || "",
      tipo: g.tipo || "Adulto",
      observacao: g.observacao || "",
      birthDate: g.birthDate || null,
      isExtra: Boolean(g.isExtra),
      billingType: g.billingType || (g.isCortesia ? "cortesia" : (g.customValor && parseNum(g.customValor) > 0) ? "personalizado" : "padrao"),
      isCortesia: Boolean(g.isCortesia),
      customValor: g.customValor || "",
    }));

  if (existing.length > 0 && existing.length === totalQtd) {
    return existing.map((r) => ({
      ...r,
      extraSlots: r.extraSlots || 0,
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
          extraSlots: existing[reusedIdx].extraSlots || 0,
          hospedes: ensureGuestIds(existing[reusedIdx].hospedes),
        });
      } else {
        result.push({
          numero: `Quarto ${counter}`,
          tipo: hr.tipo,
          extraSlots: 0,
          hospedes: [],
        });
      }
      counter++;
    }
  }

  return result;
}

// ----------------------------------------------------
// COMPONENTE: ITEM DE HÓSPEDE (DRAGGABLE)
// ----------------------------------------------------
interface DraggableGuestItemProps {
  blockId: string;
  guest: RoomGuest;
  roomIdx: number;
  guestIdx: number;
  slotNumber: number;
  birthdayInfo: { isBirthday: boolean; dateFormatted: string; turningAge?: number } | null;
  birthDate?: string | null;
  periodStart?: string | null;
  onUpdateGuest: (
    roomIdx: number,
    guestIdx: number,
    key: keyof RoomGuest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any
  ) => void;
  onUpdateGuestBilling: (
    roomIdx: number,
    guestIdx: number,
    billingType: "padrao" | "cortesia" | "personalizado",
    customValor?: string
  ) => void;
  onRemoveGuest: (roomIdx: number, guestIdx: number) => void;
  onOpenCustomerPicker: (
    roomIdx: number,
    slotNumber: number,
    guestIdx?: number,
    isExtra?: boolean
  ) => void;
}

function DraggableGuestItem({
  blockId,
  guest,
  roomIdx,
  guestIdx,
  slotNumber,
  birthdayInfo,
  birthDate,
  periodStart,
  onUpdateGuest,
  onUpdateGuestBilling,
  onRemoveGuest,
  onOpenCustomerPicker,
}: DraggableGuestItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `guest-${guest.id}`,
    data: {
      guest,
      blockId,
      roomIdx,
      guestIdx,
    },
  });

  const effectiveBirthDate = guest.birthDate || birthDate || null;
  const guestAge = getGuestAge({ birthDate: effectiveBirthDate }, periodStart);
  const ageBracket = getGuestAgeBracket(
    { birthDate: effectiveBirthDate, tipo: guest.tipo },
    periodStart
  );

  // Mantém guest.tipo sincronizado automaticamente com a idade
  useEffect(() => {
    if (guestAge !== null) {
      const autoTipo =
        guestAge < 2 ? "Bebê" : guestAge < 12 ? "Criança (2a)" : "Adulto";
      if (guest.tipo !== autoTipo) {
        onUpdateGuest(roomIdx, guestIdx, "tipo", autoTipo);
      }
    }
  }, [guestAge, guest.tipo, roomIdx, guestIdx, onUpdateGuest]);

  // Se tiver birthDate resolvido do banco mas não salvo no hóspede, persiste
  useEffect(() => {
    if (birthDate && !guest.birthDate) {
      onUpdateGuest(roomIdx, guestIdx, "birthDate", birthDate);
    }
  }, [birthDate, guest.birthDate, roomIdx, guestIdx, onUpdateGuest]);

  const hasAlert = Boolean(guest.observacao && guest.observacao.trim().length > 0);

  // Configuração do Badge Fixo de Idade / Categoria
  let badgeLabel = "Adulto";
  let badgeStyle = "bg-primary/10 text-primary border-primary/20";
  let badgeIcon = <User size={12} className="text-primary/70 shrink-0" />;

  if (ageBracket === "bebe") {
    badgeLabel =
      guestAge !== null
        ? guestAge === 0
          ? "Bebê (<1a)"
          : `Bebê (${guestAge}a)`
        : "Bebê";
    badgeStyle = "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/25";
    badgeIcon = <Baby size={12} className="text-pink-600 dark:text-pink-400 shrink-0" />;
  } else if (ageBracket === "crianca") {
    badgeLabel = guestAge !== null ? `Criança (${guestAge}a)` : "Criança";
    badgeStyle = "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25";
    badgeIcon = <User size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />;
  } else {
    badgeLabel = guestAge !== null ? `Adulto (${guestAge}a)` : "Adulto";
    badgeStyle = "bg-surface-subtle text-text-title border-border/80";
    badgeIcon = <User size={12} className="text-text-muted shrink-0" />;
  }

  const badgeTitle = effectiveBirthDate
    ? `Data de nascimento: ${fmtBirthDate(effectiveBirthDate)}${
        guestAge !== null ? ` (${guestAge} anos na viagem)` : ""
      }`
    : "Faixa etária calculada automaticamente pelo sistema";

  return (
    <div
      ref={setNodeRef}
      className={`group/guest relative flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-xl border transition-all duration-150 ${
        isDragging
          ? "opacity-30 border-dashed border-primary bg-primary/5"
          : birthdayInfo
            ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50"
            : "border-border/80 bg-surface hover:border-primary/40 hover:shadow-xs"
      }`}
    >
      {/* Alça de Arraste e Número do Espaço */}
      <div className="flex items-center gap-2 shrink-0">
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

      {/* Dados do Hóspede: Nome, Badge de Aniversário, Cama Extra, Documento, Faixa Etária, Cobrança e Observação */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
        {/* Nome com Badge de Aniversário e Cama Extra */}
        <div className="md:col-span-3 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 flex-wrap">
            <input
              type="text"
              value={guest.nome}
              onChange={(e) =>
                onUpdateGuest(roomIdx, guestIdx, "nome", e.target.value)
              }
              placeholder="Nome completo do hóspede"
              className="px-2.5 py-1 rounded-lg border border-transparent hover:border-border focus:border-primary bg-transparent focus:bg-surface text-text-title text-sm font-semibold transition-all outline-none flex-1 min-w-[120px]"
            />

            {/* BADGE DE CAMA EXTRA */}
            {guest.isExtra && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 shrink-0"
                title="Hóspede alocado em vaga adicional / cama extra"
              >
                Cama Extra
              </span>
            )}

            {/* ALERTA DE ANIVERSÁRIO */}
            {birthdayInfo && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-amber-500/20 to-pink-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-2xs shrink-0 animate-pulse"
                title={`🎂 Aniversariante nesta viagem! Comemora dia ${birthdayInfo.dateFormatted}${
                  birthdayInfo.turningAge ? ` (${birthdayInfo.turningAge} anos)` : ""
                }. Lembrete para bolo ou brinde!`}
              >
                <Cake size={11} className="text-amber-500 shrink-0" />
                <span>
                  {birthdayInfo.dateFormatted}
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
            className="w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-border focus:border-primary bg-transparent focus:bg-surface text-text-muted text-xs transition-all outline-none font-mono"
          />
        </div>

        {/* Faixa Etária / Idade (Badge Fixo Calculado pelo Sistema) */}
        <div className="md:col-span-2 flex items-center">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold border select-none transition-colors shadow-2xs ${badgeStyle}`}
            title={badgeTitle}
          >
            {badgeIcon}
            <span>{badgeLabel}</span>
          </span>
        </div>

        {/* Condição de Cobrança (Padrão, Cortesia ou Cobrar Valor) */}
        <div className="md:col-span-3 flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
          <select
            value={
              guest.billingType ||
              (guest.isCortesia ? "cortesia" : guest.customValor && parseNum(guest.customValor) > 0 ? "personalizado" : "padrao")
            }
            onChange={(e) => {
              const mode = e.target.value as "padrao" | "cortesia" | "personalizado";
              onUpdateGuestBilling(roomIdx, guestIdx, mode, guest.customValor);
            }}
            className={`px-2 py-1 rounded-lg border text-xs font-semibold focus:outline-none transition-all cursor-pointer ${
              guest.isCortesia || guest.billingType === "cortesia"
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold"
                : guest.billingType === "personalizado" || (guest.customValor && parseNum(guest.customValor) > 0)
                ? "bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300 font-bold"
                : "bg-surface border-border text-text-muted hover:border-border-strong"
            }`}
            title="Condição financeira da vaga: Padrão, Cortesia (R$ 0) ou Cobrar Valor Personalizado"
          >
            <option value="padrao">Padrão</option>
            <option value="cortesia">🎁 Cortesia (R$ 0)</option>
            <option value="personalizado">💰 Cobrar Valor</option>
          </select>

          {(guest.billingType === "personalizado" ||
            (!guest.isCortesia && guest.customValor && parseNum(guest.customValor) > 0)) && (
            <input
              type="text"
              inputMode="decimal"
              value={guest.customValor ?? ""}
              placeholder="0,00"
              onChange={(e) => onUpdateGuest(roomIdx, guestIdx, "customValor", e.target.value)}
              onBlur={(e) => {
                if (e.target.value) {
                  onUpdateGuest(roomIdx, guestIdx, "customValor", formatBRL(e.target.value, false));
                }
              }}
              className="w-20 px-1.5 py-1 rounded-lg border border-border bg-surface text-xs text-right font-bold text-text-title tabular-nums focus:outline-none focus:border-primary shadow-2xs"
              title="Digite o valor a ser cobrado deste passageiro (R$)"
            />
          )}
        </div>

        {/* Observação com Alerta */}
        <div className="md:col-span-2 flex items-center gap-1.5">
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
            placeholder="Observações / Cama extra"
            className={`w-full px-2 py-1 rounded-lg border border-transparent hover:border-border focus:border-primary bg-transparent focus:bg-surface text-xs transition-all outline-none ${
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
  onOpenCustomerPicker: (
    roomIdx: number,
    slotNumber: number,
    guestIdx?: number,
    isExtra?: boolean
  ) => void;
  onRemoveExtraSlot?: (roomIdx: number) => void;
}

function EmptySlot({
  slotNumber,
  roomIdx,
  isExtra,
  onOpenCustomerPicker,
  onRemoveExtraSlot,
}: EmptySlotProps) {
  return (
    <div
      onClick={() => onOpenCustomerPicker(roomIdx, slotNumber, undefined, isExtra)}
      className={`group/empty flex items-center justify-between p-3 rounded-xl border border-dashed transition-all cursor-pointer ${
        isExtra
          ? "border-amber-500/60 hover:border-amber-500 bg-amber-500/5 hover:bg-amber-500/10"
          : "border-border/90 hover:border-primary/60 bg-surface-subtle/40 hover:bg-primary/5"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`flex items-center justify-center w-6 h-6 rounded-md text-xs font-semibold transition-colors ${
            isExtra
              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold"
              : "bg-surface-muted text-text-muted group-hover/empty:text-primary group-hover/empty:bg-primary/10"
          }`}
        >
          {slotNumber}
        </span>

        <div className="flex items-center gap-2">
          <Bed
            size={16}
            className={
              isExtra
                ? "text-amber-600 dark:text-amber-400"
                : "text-text-muted group-hover/empty:text-primary transition-colors"
            }
          />
          <div className="flex items-center gap-1.5">
            <span
              className={`text-xs font-semibold transition-colors ${
                isExtra
                  ? "text-amber-700 dark:text-amber-300 font-bold"
                  : "text-text-muted group-hover/empty:text-primary"
              }`}
            >
              {isExtra ? "Cama Extra / Vaga Adicional" : `Espaço ${slotNumber} disponível`}
            </span>
            {isExtra && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200">
                + Extra
              </span>
            )}
          </div>
          <span className="hidden sm:inline-block text-[11px] text-text-muted/70">
            — Clique para adicionar hóspede (criança ou adulto)
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isExtra && onRemoveExtraSlot && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveExtraSlot(roomIdx);
            }}
            className="p-1.5 rounded-lg text-text-muted hover:text-status-danger hover:bg-status-danger-bg transition-colors cursor-pointer"
            title="Remover esta vaga extra não utilizada"
          >
            <Trash2 size={13} />
          </button>
        )}

        <button
          type="button"
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs ${
            isExtra
              ? "bg-amber-500 text-white hover:bg-amber-600"
              : "bg-primary/10 text-primary group-hover/empty:bg-primary group-hover/empty:text-white"
          }`}
        >
          <Plus size={13} />
          <span>Adicionar Hóspede</span>
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// COMPONENTE: CARD DO QUARTO (DROPPABLE)
// ----------------------------------------------------
interface RoomCardProps {
  blockId: string;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any
  ) => void;
  onUpdateGuestBilling: (
    roomIdx: number,
    guestIdx: number,
    billingType: "padrao" | "cortesia" | "personalizado",
    customValor?: string
  ) => void;
  onRemoveGuest: (roomIdx: number, guestIdx: number) => void;
  onOpenCustomerPicker: (
    roomIdx: number,
    slotNumber: number,
    guestIdx?: number,
    isExtra?: boolean
  ) => void;
  onAddExtraSlot: (roomIdx: number) => void;
  onRemoveExtraSlot: (roomIdx: number) => void;
}

function RoomCard({
  blockId,
  room,
  roomIdx,
  isDraggingAny,
  isHoveredByDrag,
  periodStart,
  periodEnd,
  birthdaysMap,
  onSetRoomNumber,
  onUpdateGuest,
  onUpdateGuestBilling,
  onRemoveGuest,
  onOpenCustomerPicker,
  onAddExtraSlot,
  onRemoveExtraSlot,
}: RoomCardProps) {
  const { setNodeRef } = useDroppable({
    id: `room-${blockId}-${roomIdx}`,
  });

  const baseCapacity = capacityOf(room.tipo);
  const extraSlots = room.extraSlots || 0;
  const occupiedCount = room.hospedes.length;
  const totalCapacity = Math.max(baseCapacity + extraSlots, occupiedCount);

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

  // Quantidade de vagas regulares restantes para preencher todos os espaços da capacidade total do quarto
  const remainingSlotsCount = Math.max(0, totalCapacity - occupiedCount);
  const emptySlots = Array.from(
    { length: remainingSlotsCount },
    (_, idx) => occupiedCount + idx + 1
  );

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
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-surface-muted text-text-muted border border-border/70 flex items-center gap-1.5">
            <span>{room.tipo}</span>
            {extraSlots > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
                +{extraSlots} extra
              </span>
            )}
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

        {/* Badge de Ocupação & Botão de Vaga Extra no Topo */}
        <div className="flex items-center gap-2">
          {isHoveredByDrag && (
            <span className="text-xs font-bold text-primary animate-pulse flex items-center gap-1">
              <Sparkles size={13} />
              <span>Solte para transferir hóspede</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => onAddExtraSlot(roomIdx)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all cursor-pointer shadow-2xs"
            title="Adicionar vaga adicional / cama extra neste quarto (ex: para criança ou cama extra)"
          >
            <Plus size={13} />
            <span>+ Vaga Extra</span>
          </button>

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              occupiedCount >= totalCapacity
                ? "bg-status-success-bg text-status-success border border-status-success/20"
                : occupiedCount > 0
                  ? "bg-status-info-bg text-status-info border border-status-info/20"
                  : "bg-surface-muted text-text-muted border border-border"
            }`}
          >
            {occupiedCount}/{totalCapacity}{" "}
            {occupiedCount === 0
              ? "Livre"
              : occupiedCount >= totalCapacity
                ? "Completo"
                : `Vaga${totalCapacity - occupiedCount > 1 ? "s" : ""}: ${totalCapacity - occupiedCount}`}
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
              blockId={blockId}
              guest={guest}
              roomIdx={roomIdx}
              guestIdx={guestIdx}
              slotNumber={guestIdx + 1}
              birthdayInfo={bInfo}
              birthDate={bDate}
              periodStart={periodStart}
              onUpdateGuest={onUpdateGuest}
              onUpdateGuestBilling={onUpdateGuestBilling}
              onRemoveGuest={onRemoveGuest}
              onOpenCustomerPicker={onOpenCustomerPicker}
            />
          );
        })}

        {/* Espaços Vagos Disponíveis */}
        {emptySlots.map((slotNum) => {
          const isExtra = slotNum > baseCapacity;
          return (
            <EmptySlot
              key={`empty-slot-${blockId}-${roomIdx}-${slotNum}`}
              slotNumber={slotNum}
              roomIdx={roomIdx}
              isExtra={isExtra}
              onOpenCustomerPicker={onOpenCustomerPicker}
              onRemoveExtraSlot={isExtra ? () => onRemoveExtraSlot(roomIdx) : undefined}
            />
          );
        })}

        {/* Ações inferiores do Quarto: sempre permitir adicionar vaga extra/criança */}
        <div className="pt-2 flex items-center justify-between border-t border-border/40">
          <button
            type="button"
            onClick={() => onAddExtraSlot(roomIdx)}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary-strong font-semibold transition-colors cursor-pointer py-1 px-2.5 rounded-lg hover:bg-primary/5"
            title="Adicionar vaga adicional / cama extra neste quarto (ex: para criança ou cama extra)"
          >
            <Plus size={13} />
            <span>Adicionar Vaga Extra (Criança / Cama Extra)</span>
          </button>

          {extraSlots > 0 && occupiedCount < totalCapacity && (
            <button
              type="button"
              onClick={() => onRemoveExtraSlot(roomIdx)}
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-status-danger transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-status-danger-bg"
              title="Remover vaga extra não utilizada deste quarto"
            >
              <Trash2 size={12} />
              <span>Remover vaga extra</span>
            </button>
          )}
        </div>
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
  excursionName,
  destination,
}: RoomListViewProps) {
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Filtra todos os blocos de categoria hospedagem presentes no pacote
  const hospedagemBlocks = useMemo(
    () => blocks.filter((b) => b.categoryId === "hospedagem"),
    [blocks]
  );

  // Armazena a lista de quartos sincronizada para cada bloco de hospedagem (indexado por block.id)
  const [roomsByBlock, setRoomsByBlock] = useState<Record<string, RoomEntry[]>>(() => {
    const initial: Record<string, RoomEntry[]> = {};
    for (const b of hospedagemBlocks) {
      const hRooms: HospedagemRoom[] = Array.isArray(b.data.rooms) ? b.data.rooms : [];
      const exRooms: RoomEntry[] = Array.isArray(b.data.roomList) ? b.data.roomList : [];
      initial[b.id] = syncRooms(hRooms, exRooms);
    }
    return initial;
  });

  // Filtro de seleção de hotel (quando há mais de uma hospedagem: "all" ou id do bloco)
  const [selectedHotelId, setSelectedHotelId] = useState<string>("all");

  const [justSaved, setJustSaved] = useState(false);
  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Mapa de aniversários carregado do banco de dados para os passageiros atuais
  const [birthdaysMap, setBirthdaysMap] = useState<Record<string, string>>({});

  // Sincroniza se os blocos de hospedagem mudarem externamente (ex.: alteração de quantidade no pacote)
  useEffect(() => {
    setRoomsByBlock((prev) => {
      let changed = false;
      const next: Record<string, RoomEntry[]> = { ...prev };
      for (const b of hospedagemBlocks) {
        const hRooms: HospedagemRoom[] = Array.isArray(b.data.rooms) ? b.data.rooms : [];
        const exRooms: RoomEntry[] = Array.isArray(b.data.roomList) ? b.data.roomList : [];
        const totalQtd = hRooms.reduce((sum, r) => sum + (parseInt(r.qtd) || 0), 0);

        if (!next[b.id]) {
          next[b.id] = syncRooms(hRooms, exRooms);
          changed = true;
        } else if (next[b.id].length !== totalQtd && totalQtd > 0) {
          next[b.id] = syncRooms(hRooms, exRooms.length > 0 ? exRooms : next[b.id]);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [hospedagemBlocks]);

  // Carrega aniversários dos clientes cadastrados para os hóspedes atuais
  useEffect(() => {
    const guestsToQuery: Array<{ customerId?: string; nome: string; documento: string; birthDate?: string | null }> = [];
    for (const b of hospedagemBlocks) {
      const bRooms = roomsByBlock[b.id] ?? [];
      bRooms.forEach((r) => {
        r.hospedes.forEach((g) => {
          if (g.nome && !g.birthDate) {
            guestsToQuery.push(g);
          }
        });
      });
    }

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
  }, [hospedagemBlocks, roomsByBlock]);

  // Persistência debounced por bloco de hospedagem
  const persistRoomsForBlock = useCallback(
    (blockId: string, newRooms: RoomEntry[]) => {
      const targetBlock = blocks.find((b) => b.id === blockId);
      if (!targetBlock) return;

      if (saveTimersRef.current[blockId]) {
        clearTimeout(saveTimersRef.current[blockId]);
      }
      saveTimersRef.current[blockId] = setTimeout(() => {
        onUpdateBlock(blockId, { ...targetBlock.data, roomList: newRooms });
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
      }, 400);
    },
    [blocks, onUpdateBlock]
  );

  // Camas extras por quarto (persistidas diretamente no objeto RoomEntry.extraSlots)
  const handleAddExtraSlot = (blockId: string, roomIdx: number) => {
    setRoomsByBlock((prev) => {
      const currentRooms = prev[blockId] ? [...prev[blockId]] : [];
      const room = currentRooms[roomIdx];
      if (!room) return prev;
      const currentExtra = room.extraSlots || 0;
      currentRooms[roomIdx] = {
        ...room,
        extraSlots: currentExtra + 1,
      };
      persistRoomsForBlock(blockId, currentRooms);
      return { ...prev, [blockId]: currentRooms };
    });
  };

  const handleRemoveExtraSlot = (blockId: string, roomIdx: number) => {
    setRoomsByBlock((prev) => {
      const currentRooms = prev[blockId] ? [...prev[blockId]] : [];
      const room = currentRooms[roomIdx];
      if (!room) return prev;
      const currentExtra = room.extraSlots || 0;
      if (currentExtra <= 0) return prev;
      currentRooms[roomIdx] = {
        ...room,
        extraSlots: currentExtra - 1,
      };
      persistRoomsForBlock(blockId, currentRooms);
      return { ...prev, [blockId]: currentRooms };
    });
  };

  // Modal de Seleção de Clientes
  const [modalState, setModalState] = useState<{
    open: boolean;
    blockId: string;
    roomIdx: number;
    slotNumber: number;
    guestIdx?: number;
    isExtraSlot?: boolean;
  }>({
    open: false,
    blockId: "",
    roomIdx: 0,
    slotNumber: 1,
    isExtraSlot: false,
  });

  const handleOpenCustomerPicker = (
    blockId: string,
    roomIdx: number,
    slotNumber: number,
    guestIdx?: number,
    isExtra?: boolean
  ) => {
    setModalState({
      open: true,
      blockId,
      roomIdx,
      slotNumber,
      guestIdx,
      isExtraSlot: Boolean(isExtra),
    });
  };

  const handleSelectCustomerForSlot = (guestData: {
    nome: string;
    documento: string;
    tipo: string;
    observacao: string;
    customerId?: string;
    birthDate?: string | null;
    isExtra?: boolean;
    billingType?: "padrao" | "cortesia" | "personalizado";
    isCortesia?: boolean;
    customValor?: string;
  }) => {
    const { blockId, roomIdx, guestIdx, isExtraSlot } = modalState;
    if (!blockId) return;

    setRoomsByBlock((prev) => {
      const currentRooms = prev[blockId] ? [...prev[blockId]] : [];
      const targetRoom = currentRooms[roomIdx];
      if (!targetRoom) return prev;

      let autoTipo = guestData.tipo || "Adulto";
      const bDate =
        guestData.birthDate ||
        (guestData.customerId ? birthdaysMap[guestData.customerId] : null);
      if (bDate) {
        const age = getGuestAge({ birthDate: bDate }, periodStart);
        if (age !== null) {
          autoTipo = age < 2 ? "Bebê" : age < 12 ? "Criança (2a)" : "Adulto";
        }
      }

      const isCortesia = Boolean(guestData.isCortesia || guestData.billingType === "cortesia");
      const billingType = guestData.billingType || (isCortesia ? "cortesia" : (guestData.customValor && parseNum(guestData.customValor) > 0) ? "personalizado" : "padrao");

      const hospedes = [...targetRoom.hospedes];
      const newGuest: RoomGuest = {
        id:
          guestIdx !== undefined && hospedes[guestIdx]?.id
            ? hospedes[guestIdx].id
            : generateGuestId(),
        customerId: guestData.customerId,
        nome: guestData.nome,
        documento: guestData.documento,
        tipo: autoTipo,
        observacao: guestData.observacao,
        birthDate: bDate || null,
        isExtra: Boolean(guestData.isExtra || isExtraSlot),
        billingType,
        isCortesia,
        customValor: isCortesia ? "0,00" : (guestData.customValor || ""),
      };

      if (guestIdx !== undefined && guestIdx < hospedes.length) {
        hospedes[guestIdx] = newGuest;
      } else {
        hospedes.push(newGuest);
      }

      currentRooms[roomIdx] = { ...targetRoom, hospedes };
      persistRoomsForBlock(blockId, currentRooms);
      return { ...prev, [blockId]: currentRooms };
    });

    setModalState((prev) => ({ ...prev, open: false }));
  };

  const handleSetRoomNumber = (blockId: string, idx: number, value: string) => {
    setRoomsByBlock((prev) => {
      const currentRooms = prev[blockId] ? [...prev[blockId]] : [];
      if (!currentRooms[idx]) return prev;
      currentRooms[idx] = { ...currentRooms[idx], numero: value };
      persistRoomsForBlock(blockId, currentRooms);
      return { ...prev, [blockId]: currentRooms };
    });
  };

  const handleUpdateGuest = (
    blockId: string,
    roomIdx: number,
    guestIdx: number,
    key: keyof RoomGuest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any
  ) => {
    setRoomsByBlock((prev) => {
      const currentRooms = prev[blockId] ? [...prev[blockId]] : [];
      const room = currentRooms[roomIdx];
      if (!room || !room.hospedes[guestIdx]) return prev;

      const hospedes = room.hospedes.map((g, gi) =>
        gi === guestIdx ? { ...g, [key]: value } : g
      );
      currentRooms[roomIdx] = { ...room, hospedes };
      persistRoomsForBlock(blockId, currentRooms);
      return { ...prev, [blockId]: currentRooms };
    });
  };

  const handleUpdateGuestBilling = (
    blockId: string,
    roomIdx: number,
    guestIdx: number,
    billingType: "padrao" | "cortesia" | "personalizado",
    customValor?: string
  ) => {
    setRoomsByBlock((prev) => {
      const currentRooms = prev[blockId] ? [...prev[blockId]] : [];
      const room = currentRooms[roomIdx];
      if (!room || !room.hospedes[guestIdx]) return prev;

      const hospedes = room.hospedes.map((g, gi) => {
        if (gi !== guestIdx) return g;
        if (billingType === "cortesia") {
          return {
            ...g,
            billingType: "cortesia" as const,
            isCortesia: true,
            customValor: "0,00",
          };
        } else if (billingType === "personalizado") {
          return {
            ...g,
            billingType: "personalizado" as const,
            isCortesia: false,
            customValor: customValor || g.customValor || "0,00",
          };
        } else {
          return {
            ...g,
            billingType: "padrao" as const,
            isCortesia: false,
            customValor: "",
          };
        }
      });

      currentRooms[roomIdx] = { ...room, hospedes };
      persistRoomsForBlock(blockId, currentRooms);
      return { ...prev, [blockId]: currentRooms };
    });
  };

  const handleRemoveGuest = (blockId: string, roomIdx: number, guestIdx: number) => {
    setRoomsByBlock((prev) => {
      const currentRooms = prev[blockId] ? [...prev[blockId]] : [];
      const room = currentRooms[roomIdx];
      if (!room) return prev;

      const hospedes = room.hospedes.filter((_, gi) => gi !== guestIdx);
      currentRooms[roomIdx] = { ...room, hospedes };
      persistRoomsForBlock(blockId, currentRooms);
      return { ...prev, [blockId]: currentRooms };
    });
  };

  // Mapa de alocações existentes para evitar duplicidade e indicar em qual hospedagem/quarto está
  const existingAllocations = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of hospedagemBlocks) {
      const bRooms = roomsByBlock[b.id] ?? [];
      const hotelLabel = b.data.hotel || b.title || "Hospedagem";
      bRooms.forEach((r) => {
        r.hospedes.forEach((g) => {
          const loc =
            hospedagemBlocks.length > 1
              ? `${r.numero} (${hotelLabel})`
              : r.numero;
          if (g.nome) map.set(g.nome.trim().toLowerCase(), loc);
          if (g.documento) {
            const cleanDoc = g.documento.replace(/\D/g, "");
            if (cleanDoc) map.set(cleanDoc, loc);
          }
        });
      });
    }
    return map;
  }, [hospedagemBlocks, roomsByBlock]);

  // Lista consolidada de todos os aniversariantes durante o período da excursão
  const allBirthdayGuests = useMemo(() => {
    if (!periodStart || !periodEnd) return [];

    const list: Array<{
      guest: RoomGuest;
      hotelName: string;
      roomNumero: string;
      birthdayInfo: { isBirthday: boolean; dateFormatted: string; turningAge?: number };
    }> = [];

    for (const b of hospedagemBlocks) {
      const bRooms = roomsByBlock[b.id] ?? [];
      const hotelName = b.data.hotel || b.title || "Hospedagem";
      bRooms.forEach((r) => {
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
              hotelName,
              roomNumero: r.numero,
              birthdayInfo: info,
            });
          }
        });
      });
    }

    return list;
  }, [hospedagemBlocks, roomsByBlock, periodStart, periodEnd, birthdaysMap]);

  // Estatísticas consolidadas de todas as hospedagens
  const overallStats = useMemo(() => {
    let totalHotels = hospedagemBlocks.length;
    let totalRooms = 0;
    let totalGuests = 0;
    let totalCapacity = 0;

    for (const b of hospedagemBlocks) {
      const bRooms = roomsByBlock[b.id] ?? [];
      totalRooms += bRooms.length;
      totalGuests += bRooms.reduce((sum, r) => sum + r.hospedes.length, 0);
      totalCapacity += bRooms.reduce((sum, r) => sum + (capacityOf(r.tipo) + (r.extraSlots || 0)), 0);
    }

    const vagasLivres = Math.max(0, totalCapacity - totalGuests);
    return { totalHotels, totalRooms, totalGuests, totalCapacity, vagasLivres };
  }, [hospedagemBlocks, roomsByBlock]);

  // Filtro de busca na Room List
  const [roomFilter, setRoomFilter] = useState("");

  // ----------------------------------------------------
  // DRAG AND DROP COM @dnd-kit
  // ----------------------------------------------------
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const [activeDragItem, setActiveDragItem] = useState<{
    guest: RoomGuest;
    blockId: string;
    roomIdx: number;
    guestIdx: number;
  } | null>(null);

  const [overRoomId, setOverRoomId] = useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = event.active.data.current as any;
    if (data?.guest) {
      setActiveDragItem({
        guest: data.guest,
        blockId: data.blockId,
        roomIdx: data.roomIdx,
        guestIdx: data.guestIdx,
      });
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragOver = (event: any) => {
    setOverRoomId(event.over?.id ? String(event.over.id) : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);
    setOverRoomId(null);

    if (!over) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sourceData = active.data.current as any;
    if (!sourceData) return;

    const sourceBlockId = sourceData.blockId;
    const sourceRoomIdx = sourceData.roomIdx;
    const sourceGuestIdx = sourceData.guestIdx;

    const overId = String(over.id);
    const match = overId.match(/^room-(.+)-(\d+)$/);
    if (!match) return;

    const targetBlockId = match[1];
    const targetRoomIdx = parseInt(match[2], 10);

    if (isNaN(targetRoomIdx)) return;

    if (sourceBlockId === targetBlockId && sourceRoomIdx === targetRoomIdx) {
      return;
    }

    setRoomsByBlock((prev) => {
      const sourceRooms = prev[sourceBlockId] ? [...prev[sourceBlockId]] : [];
      const targetRooms =
        sourceBlockId === targetBlockId
          ? sourceRooms
          : prev[targetBlockId]
          ? [...prev[targetBlockId]]
          : [];

      const sourceRoom = sourceRooms[sourceRoomIdx];
      const targetRoom = targetRooms[targetRoomIdx];
      if (!sourceRoom || !targetRoom) return prev;

      const guestToMove = sourceRoom.hospedes[sourceGuestIdx];
      if (!guestToMove) return prev;

      const newSourceGuests = sourceRoom.hospedes.filter(
        (_, i) => i !== sourceGuestIdx
      );
      const newTargetGuests = [...targetRoom.hospedes, guestToMove];

      if (sourceBlockId === targetBlockId) {
        sourceRooms[sourceRoomIdx] = { ...sourceRoom, hospedes: newSourceGuests };
        sourceRooms[targetRoomIdx] = { ...targetRoom, hospedes: newTargetGuests };
        persistRoomsForBlock(sourceBlockId, sourceRooms);
        return {
          ...prev,
          [sourceBlockId]: sourceRooms,
        };
      } else {
        sourceRooms[sourceRoomIdx] = { ...sourceRoom, hospedes: newSourceGuests };
        targetRooms[targetRoomIdx] = { ...targetRoom, hospedes: newTargetGuests };
        persistRoomsForBlock(sourceBlockId, sourceRooms);
        persistRoomsForBlock(targetBlockId, targetRooms);
        return {
          ...prev,
          [sourceBlockId]: sourceRooms,
          [targetBlockId]: targetRooms,
        };
      }
    });
  };

  // Se não houver nenhum bloco de hospedagem cadastrado
  if (hospedagemBlocks.length === 0) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-12 text-center shadow-xs">
        <BedDouble size={48} className="mx-auto text-text-muted mb-3 opacity-40" />
        <h3 className="text-lg font-bold text-text-title">
          Nenhuma hospedagem cadastrada no pacote
        </h3>
        <p className="text-xs text-text-muted mt-1.5 max-w-md mx-auto">
          Adicione um card de <strong>Hospedagem</strong> na aba Pacote (configurando a quantidade de quartos)
          para gerenciar o Room List desta viagem.
        </p>
      </div>
    );
  }

  // Hospedagens a exibir conforme seleção de tab
  const displayedHospedagens =
    selectedHotelId === "all"
      ? hospedagemBlocks
      : hospedagemBlocks.filter((b) => b.id === selectedHotelId);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* Banner de Aniversariantes no Período da Viagem (Enxuto) */}
        {allBirthdayGuests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-wrap items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
              <span className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300 shrink-0">
                <Cake size={15} className="text-amber-500" />
                <span>
                  {allBirthdayGuests.length === 1
                    ? "Aniversariante na viagem:"
                    : `${allBirthdayGuests.length} Aniversariantes na viagem:`}
                </span>
              </span>

              <div className="flex flex-wrap items-center gap-2">
                {allBirthdayGuests.map((bg, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface/90 border border-amber-500/20 text-text-title shadow-2xs font-medium"
                  >
                    <span className="font-bold">{bg.guest.nome}</span>
                    <span className="text-amber-600 dark:text-amber-400 font-extrabold">
                      {bg.birthdayInfo.dateFormatted}
                      {bg.birthdayInfo.turningAge ? ` (${bg.birthdayInfo.turningAge} anos)` : ""}
                    </span>
                    <span className="text-text-muted text-[11px]">
                      · Quarto {bg.roomNumero}
                      {hospedagemBlocks.length > 1 ? ` (${bg.hotelName})` : ""}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Banner Superior Geral com Estatísticas */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-surface border border-border shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <BedDouble size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-title flex items-center gap-2">
                Room List
                {hospedagemBlocks.length === 1 ? (
                  <span className="text-primary font-semibold">
                    — {hospedagemBlocks[0].data.hotel || "Hospedagem"}
                  </span>
                ) : (
                  <span className="text-text-muted text-base font-normal">
                    ({hospedagemBlocks.length} hospedagens cadastradas)
                  </span>
                )}
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                {hospedagemBlocks.length > 1
                  ? "Arraste hóspedes entre os quartos para remanejar. Os quartos estão organizados e agrupados por hospedagem."
                  : "Arraste hóspedes entre os quartos para remanejar. Os novos espaços são liberados automaticamente."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">


            <div className="flex items-center gap-2 flex-wrap">
              {hospedagemBlocks.length > 1 && (
                <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-surface-subtle border border-border text-text-title">
                  {overallStats.totalHotels} hospedagens
                </span>
              )}
              <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-surface-subtle border border-border text-text-title">
                {overallStats.totalRooms} quarto{overallStats.totalRooms !== 1 ? "s" : ""}
              </span>
              <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold">
                {overallStats.totalGuests} hóspede{overallStats.totalGuests !== 1 ? "s" : ""}
              </span>
              <span
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border ${
                  overallStats.vagasLivres === 0
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                    : "bg-surface-subtle border-border text-text-muted"
                }`}
              >
                {overallStats.vagasLivres} vaga{overallStats.vagasLivres !== 1 ? "s" : ""} livre{overallStats.vagasLivres !== 1 ? "s" : ""}
              </span>

              <button
                type="button"
                onClick={() => setPrintModalOpen(true)}
                title="Imprimir Room List Oficial para o Hotel (PDF)"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-subtle text-text-body text-xs font-semibold shadow-2xs hover:border-primary/40 transition-all cursor-pointer group"
              >
                <Printer size={14} className="text-text-muted group-hover:text-primary transition-colors" />
                <span>Imprimir para Hotel</span>
              </button>
            </div>
          </div>
        </div>

        {/* Abas de Navegação Rápida entre Hospedagens (quando houver mais de 1) */}
        {hospedagemBlocks.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedHotelId("all")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedHotelId === "all"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-surface border border-border text-text-muted hover:text-text-title hover:bg-surface-subtle"
              }`}
            >
              <Layers size={14} />
              <span>Todas as Hospedagens</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                  selectedHotelId === "all"
                    ? "bg-white/20 text-white"
                    : "bg-surface-subtle text-text-muted"
                }`}
              >
                {hospedagemBlocks.length}
              </span>
            </button>

            {hospedagemBlocks.map((b, idx) => {
              const bRooms = roomsByBlock[b.id] ?? [];
              const hotelName = b.data.hotel || b.title || `Hospedagem ${idx + 1}`;
              const isSelected = selectedHotelId === b.id;

              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedHotelId(b.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-primary text-white shadow-xs"
                      : "bg-surface border border-border text-text-muted hover:text-text-title hover:bg-surface-subtle"
                  }`}
                >
                  <Hotel size={14} />
                  <span>{hotelName}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-surface-subtle text-text-muted"
                    }`}
                  >
                    {bRooms.length}q
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Barra de Filtro de Hóspedes (busca global em todos os quartos/hotéis) */}
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
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-surface text-text-title text-xs placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-2xs"
          />
        </div>

        {/* Listagem Separada e Agrupada por Hospedagem */}
        <div className="space-y-8">
          {displayedHospedagens.map((block, hotelIdx) => {
            const hotelRooms = roomsByBlock[block.id] ?? [];
            const hotelName = block.data.hotel || block.title || `Hospedagem ${hotelIdx + 1}`;
            const cidade = block.data.cidade;
            const diarias = block.data.diarias;

            // Filtro aplicado aos quartos desta hospedagem
            const filteredHotelRooms = hotelRooms.filter((r) => {
              if (!roomFilter.trim()) return true;
              const q = roomFilter.toLowerCase();
              return (
                r.numero.toLowerCase().includes(q) ||
                r.tipo.toLowerCase().includes(q) ||
                r.hospedes.some(
                  (g) =>
                    g.nome.toLowerCase().includes(q) ||
                    g.documento.toLowerCase().includes(q) ||
                    g.observacao.toLowerCase().includes(q)
                )
              );
            });

            const hotelGuestsCount = hotelRooms.reduce(
              (sum, r) => sum + r.hospedes.length,
              0
            );
            const hotelCapacity = hotelRooms.reduce(
              (sum, r) => sum + (capacityOf(r.tipo) + (r.extraSlots || 0)),
              0
            );
            const hotelVagasLivres = Math.max(0, hotelCapacity - hotelGuestsCount);

            return (
              <div
                key={block.id}
                className="rounded-3xl border border-border/90 bg-surface/60 p-5 sm:p-6 space-y-5 shadow-xs"
              >
                {/* Header da Hospedagem Agrupada */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent text-primary flex items-center justify-center text-xl shadow-xs border border-primary/20 shrink-0">
                      🏨
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                          Hospedagem {hospedagemBlocks.length > 1 ? `${hotelIdx + 1} de ${hospedagemBlocks.length}` : ""}
                        </span>
                        {cidade && (
                          <span className="inline-flex items-center gap-1 text-xs text-text-muted font-medium">
                            <MapPin size={12} className="text-primary" />
                            {cidade}
                          </span>
                        )}
                        {diarias && (
                          <span className="inline-flex items-center gap-1 text-xs text-text-muted font-medium">
                            <Moon size={12} className="text-amber-500" />
                            {diarias} diária{Number(diarias) > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-text-title mt-0.5">
                        {hotelName}
                      </h3>
                    </div>
                  </div>

                  {/* Badges com Estatísticas desta Hospedagem */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-surface border border-border text-text-title shadow-2xs">
                      {hotelRooms.length} quarto{hotelRooms.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold shadow-2xs">
                      {hotelGuestsCount} hóspede{hotelGuestsCount !== 1 ? "s" : ""}
                    </span>
                    <span
                      className={`text-xs font-semibold px-3 py-1.5 rounded-xl border shadow-2xs ${
                        hotelVagasLivres === 0
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                          : "bg-surface border-border text-text-muted"
                      }`}
                    >
                      {hotelVagasLivres} vaga{hotelVagasLivres !== 1 ? "s" : ""} livre{hotelVagasLivres !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Quartos da Hospedagem */}
                {filteredHotelRooms.length === 0 ? (
                  <div className="py-10 text-center text-xs text-text-muted italic bg-surface-subtle/40 rounded-2xl border border-dashed border-border/80 p-6">
                    {hotelRooms.length === 0
                      ? "Nenhum quarto cadastrado nesta hospedagem. Configure a coluna Qtd na aba Pacote."
                      : "Nenhum quarto ou hóspede corresponde ao filtro de busca nesta hospedagem."}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredHotelRooms.map((room) => {
                      const roomIdx = hotelRooms.findIndex((r) => r === room);
                      const isHovered = overRoomId === `room-${block.id}-${roomIdx}`;

                      return (
                        <RoomCard
                          key={`${block.id}-${roomIdx}`}
                          blockId={block.id}
                          room={room}
                          roomIdx={roomIdx}
                          isDraggingAny={Boolean(activeDragItem)}
                          isHoveredByDrag={isHovered}
                          periodStart={periodStart}
                          periodEnd={periodEnd}
                          birthdaysMap={birthdaysMap}
                          onSetRoomNumber={(rIdx, val) => handleSetRoomNumber(block.id, rIdx, val)}
                          onUpdateGuest={(rIdx, gIdx, key, val) =>
                            handleUpdateGuest(block.id, rIdx, gIdx, key, val)
                          }
                          onUpdateGuestBilling={(rIdx, gIdx, billingType, customValor) =>
                            handleUpdateGuestBilling(block.id, rIdx, gIdx, billingType, customValor)
                          }
                          onRemoveGuest={(rIdx, gIdx) => handleRemoveGuest(block.id, rIdx, gIdx)}
                          onOpenCustomerPicker={(rIdx, slot, gIdx, isExtra) =>
                            handleOpenCustomerPicker(block.id, rIdx, slot, gIdx, isExtra)
                          }
                          onAddExtraSlot={(rIdx) => handleAddExtraSlot(block.id, rIdx)}
                          onRemoveExtraSlot={(rIdx) => handleRemoveExtraSlot(block.id, rIdx)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal de Seleção de Clientes e Passageiros */}
        <GuestSelectorModal
          open={modalState.open}
          onClose={() => setModalState((prev) => ({ ...prev, open: false }))}
          onSelect={handleSelectCustomerForSlot}
          roomTitle={
            roomsByBlock[modalState.blockId]?.[modalState.roomIdx]?.numero || "Quarto"
          }
          slotNumber={modalState.slotNumber}
          isExtraSlot={modalState.isExtraSlot}
          existingAllocations={existingAllocations}
        />

        {/* Overlay do Hóspede sendo arrastado */}
        <DragOverlay dropAnimation={{ duration: 180 }}>
          {activeDragItem ? (
            <div className="flex items-center gap-3 p-3.5 rounded-xl border-2 border-primary bg-surface shadow-2xl scale-[1.03] rotate-1 cursor-grabbing">
              <GripVertical size={16} className="text-primary" />
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs uppercase">
                {activeDragItem.guest.nome ? (
                  activeDragItem.guest.nome.slice(0, 2)
                ) : (
                  <UserCheck size={14} />
                )}
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

        {/* Modal de Impressão e PDF do Room List para o Hotel */}
        {printModalOpen && (
          <HotelRoomListPrintModal
            open={printModalOpen}
            onClose={() => setPrintModalOpen(false)}
            excursionName={excursionName}
            destination={destination}
            periodStart={periodStart}
            periodEnd={periodEnd}
            hospedagemBlocks={hospedagemBlocks}
            roomsByBlock={roomsByBlock}
            birthdaysMap={birthdaysMap}
          />
        )}
      </div>
    </DndContext>
  );
}
