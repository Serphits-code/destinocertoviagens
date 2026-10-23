"use client";

import React, { useState, useMemo } from "react";
import {
  Plane,
  Users,
  Search,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  GripVertical,
  ChevronDown,
  UserCheck,
  Building,
  RotateCcw,
  GitBranch,
} from "lucide-react";
import type {
  EditorBlock,
  BlockData,
  AereoBlockData,
  AereoFlight,
  FlightPassengerAllocation,
} from "@/lib/editor-types";
import type { RoomGuest, RoomEntry } from "./RoomListView";
import { parseNum } from "@/lib/package-calc";
import { FlightManifestModal } from "./FlightManifestModal";

interface VoosViewProps {
  blocks: EditorBlock[];
  guests: RoomGuest[];
  rooms: RoomEntry[];
  onUpdateBlock: (blockId: string, data: BlockData, title?: string) => void;
  periodStart?: string | null;
  periodEnd?: string | null;
  excursionName?: string;
  destination?: string | null;
}

interface FlightJourney {
  id: string; // ID do voo principal
  tipo: string; // "Ida", "Volta", etc.
  mainFlight: AereoFlight;
  connections: AereoFlight[];
  allFlights: AereoFlight[];
  origin: string;
  finalDestination: string;
  primaryCia: string;
}

function calculateLayover(chegada?: string, saida?: string): string | null {
  if (!chegada || !saida) return null;
  const match1 = chegada.match(/^(\d{1,2}):(\d{2})$/);
  const match2 = saida.match(/^(\d{1,2}):(\d{2})$/);
  if (!match1 || !match2) return null;

  const mins1 = parseInt(match1[1], 10) * 60 + parseInt(match1[2], 10);
  let mins2 = parseInt(match2[1], 10) * 60 + parseInt(match2[2], 10);

  if (mins2 < mins1) mins2 += 24 * 60;
  const diffMins = mins2 - mins1;
  if (diffMins < 0 || diffMins > 24 * 60) return null;

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

function buildJourneys(flights: AereoFlight[]): FlightJourney[] {
  const mainFlights = flights.filter(
    (f) => !f.conexaoDeId || !flights.some((p) => p.id === f.conexaoDeId)
  );

  return mainFlights.map((mf, idx) => {
    const journeyId = mf.id || `journey_${idx}`;
    const connections = flights.filter((f) => f.conexaoDeId === mf.id);
    const allFlights = [mf, ...connections];
    const origin = mf.origem || "---";
    const finalDestination =
      connections.length > 0
        ? connections[connections.length - 1].destino || mf.destino || "---"
        : mf.destino || "---";

    return {
      id: journeyId,
      tipo: mf.tipo || (idx === 0 ? "Ida" : "Volta"),
      mainFlight: mf,
      connections,
      allFlights,
      origin,
      finalDestination,
      primaryCia: mf.cia || "AZUL",
    };
  });
}

export function VoosView({
  blocks,
  guests,
  rooms,
  onUpdateBlock,
  periodStart,
  periodEnd,
  excursionName,
  destination,
}: VoosViewProps) {
  // Filtros da barra lateral de passageiros da Room List
  const [searchGuest, setSearchGuest] = useState("");
  const [guestFilterTab, setGuestFilterTab] = useState<"todos" | "pendentes" | "alocados">("todos");

  // Drag and drop de passageiros
  const [draggedGuestId, setDraggedGuestId] = useState<string | null>(null);
  const [dragOverJourneyKey, setDragOverJourneyKey] = useState<string | null>(null);

  // Modal de Impressão do Manifesto
  const [printModalState, setPrintModalState] = useState<{
    isOpen: boolean;
    block: EditorBlock | null;
    journey: FlightJourney | null;
    allocations: FlightPassengerAllocation[];
  }>({
    isOpen: false,
    block: null,
    journey: null,
    allocations: [],
  });

  // Mapa de cada hóspede para o quarto onde ele está alocado na Room List
  const guestRoomMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rooms) {
      const roomDesc = r.numero ? `Qto ${r.numero} (${r.tipo})` : r.tipo || "Quarto";
      for (const g of r.hospedes || []) {
        map.set(g.id, roomDesc);
        if (g.customerId) map.set(g.customerId, roomDesc);
        if (g.documento) map.set(g.documento, roomDesc);
      }
    }
    return map;
  }, [rooms]);

  // Todos os blocos de Aéreo cadastrados no pacote
  const aereoBlocks = useMemo(
    () => blocks.filter((b) => b.categoryId === "aereo"),
    [blocks]
  );

  // Mapa de alocações: guestId -> Set de journeyIds em que ele está presente
  const guestAllocationMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const b of aereoBlocks) {
      const d = b.data as AereoBlockData;
      const allocs = d.flightAllocations || {};
      for (const [journeyId, list] of Object.entries(allocs)) {
        for (const p of list || []) {
          if (!map.has(p.guestId)) {
            map.set(p.guestId, new Set());
          }
          map.get(p.guestId)!.add(`${b.id}_${journeyId}`);
        }
      }
    }
    return map;
  }, [aereoBlocks]);

  // Total geral de vagas e alocações
  const totalStats = useMemo(() => {
    let totalVagas = 0;
    let totalAlocados = 0;
    for (const b of aereoBlocks) {
      const d = b.data as AereoBlockData;
      const vagasNum = parseNum(d.vagas) || 0;
      const journeys = buildJourneys(d.flights || []);
      totalVagas += vagasNum * journeys.length;

      const allocs = d.flightAllocations || {};
      for (const list of Object.values(allocs)) {
        totalAlocados += (list || []).length;
      }
    }
    return { totalVagas, totalAlocados };
  }, [aereoBlocks]);

  // Manipulação de alocação de passageiros em um trecho
  const handleAllocateGuest = (
    blockId: string,
    journeyId: string,
    guestId: string
  ) => {
    const targetBlock = blocks.find((b) => b.id === blockId);
    if (!targetBlock) return;

    const targetGuest = guests.find(
      (g) => g.id === guestId || g.customerId === guestId || g.documento === guestId
    );
    if (!targetGuest) return;

    const d = targetBlock.data as AereoBlockData;
    const currentAllocations = { ...(d.flightAllocations || {}) };
    const journeyList = [...(currentAllocations[journeyId] || [])];

    // Verifica se já está alocado neste trecho
    if (journeyList.some((p) => p.guestId === targetGuest.id)) {
      return;
    }

    const roomDesc = guestRoomMap.get(targetGuest.id) || "";
    const newAllocation: FlightPassengerAllocation = {
      id: `alloc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      guestId: targetGuest.id,
      nome: targetGuest.nome,
      documento: targetGuest.documento || "",
      birthDate: targetGuest.birthDate || null,
      tipo: targetGuest.tipo || "Adulto",
      roomNumber: roomDesc,
      seat: "",
      ticketNumber: "",
      allocatedAt: new Date().toISOString(),
    };

    journeyList.push(newAllocation);
    currentAllocations[journeyId] = journeyList;

    onUpdateBlock(blockId, {
      ...d,
      flightAllocations: currentAllocations,
    });
  };

  const handleRemoveAllocation = (
    blockId: string,
    journeyId: string,
    allocationId: string
  ) => {
    const targetBlock = blocks.find((b) => b.id === blockId);
    if (!targetBlock) return;

    const d = targetBlock.data as AereoBlockData;
    const currentAllocations = { ...(d.flightAllocations || {}) };
    const journeyList = (currentAllocations[journeyId] || []).filter(
      (p) => p.id !== allocationId
    );

    currentAllocations[journeyId] = journeyList;
    onUpdateBlock(blockId, {
      ...d,
      flightAllocations: currentAllocations,
    });
  };

  const handleUpdateAllocationField = (
    blockId: string,
    journeyId: string,
    allocationId: string,
    field: "seat" | "ticketNumber",
    value: string
  ) => {
    const targetBlock = blocks.find((b) => b.id === blockId);
    if (!targetBlock) return;

    const d = targetBlock.data as AereoBlockData;
    const currentAllocations = { ...(d.flightAllocations || {}) };
    const journeyList = (currentAllocations[journeyId] || []).map((p) =>
      p.id === allocationId ? { ...p, [field]: value } : p
    );

    currentAllocations[journeyId] = journeyList;
    onUpdateBlock(blockId, {
      ...d,
      flightAllocations: currentAllocations,
    });
  };

  const handleClearJourney = (blockId: string, journeyId: string) => {
    if (!confirm("Tem certeza que deseja remover todos os passageiros deste trecho?")) return;
    const targetBlock = blocks.find((b) => b.id === blockId);
    if (!targetBlock) return;

    const d = targetBlock.data as AereoBlockData;
    const currentAllocations = { ...(d.flightAllocations || {}) };
    currentAllocations[journeyId] = [];

    onUpdateBlock(blockId, {
      ...d,
      flightAllocations: currentAllocations,
    });
  };

  const handleAllocateAllRemaining = (
    blockId: string,
    journeyId: string,
    capacity: number
  ) => {
    const targetBlock = blocks.find((b) => b.id === blockId);
    if (!targetBlock) return;

    const d = targetBlock.data as AereoBlockData;
    const currentAllocations = { ...(d.flightAllocations || {}) };
    const journeyList = [...(currentAllocations[journeyId] || [])];
    const existingGuestIds = new Set(journeyList.map((p) => p.guestId));

    // Passageiros da Room List que ainda não estão neste trecho
    const candidates = guests.filter((g) => !existingGuestIds.has(g.id));
    const availableSlots = Math.max(0, capacity - journeyList.length);
    const toAdd = candidates.slice(0, availableSlots);

    for (const g of toAdd) {
      const roomDesc = guestRoomMap.get(g.id) || "";
      journeyList.push({
        id: `alloc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        guestId: g.id,
        nome: g.nome,
        documento: g.documento || "",
        birthDate: g.birthDate || null,
        tipo: g.tipo || "Adulto",
        roomNumber: roomDesc,
        seat: "",
        ticketNumber: "",
        allocatedAt: new Date().toISOString(),
      });
    }

    currentAllocations[journeyId] = journeyList;
    onUpdateBlock(blockId, {
      ...d,
      flightAllocations: currentAllocations,
    });
  };

  // Filtragem dos passageiros da lista lateral
  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      const q = searchGuest.toLowerCase();
      const matchesSearch =
        !q ||
        g.nome.toLowerCase().includes(q) ||
        (g.documento && g.documento.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      const allocCount = guestAllocationMap.get(g.id)?.size || 0;
      if (guestFilterTab === "pendentes") return allocCount === 0;
      if (guestFilterTab === "alocados") return allocCount > 0;
      return true;
    });
  }, [guests, searchGuest, guestFilterTab, guestAllocationMap]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho Superior da Página de Voos */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-surface border border-border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <Plane size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-text-title tracking-tight">
                Alocação de Passageiros nos Voos
              </h2>
              <p className="text-xs text-text-muted">
                Distribua os passageiros da Room List nos trechos de voo. Voos com conexão são tratados como uma única viagem agrupada.
              </p>
            </div>
          </div>
        </div>

        {/* Resumo Rápido de Vagas e Passageiros */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-surface-subtle">
            <Users size={14} className="text-primary" />
            <span className="font-semibold text-text-muted">Room List:</span>
            <strong className="text-text-title">{guests.length} pessoas</strong>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-surface-subtle">
            <Plane size={14} className="text-sky-500" />
            <span className="font-semibold text-text-muted">Cards de Aéreo:</span>
            <strong className="text-text-title">{aereoBlocks.length}</strong>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-surface-subtle">
            <UserCheck size={14} className="text-emerald-500" />
            <span className="font-semibold text-text-muted">Assentos Alocados:</span>
            <strong className="text-emerald-600 dark:text-emerald-400">
              {totalStats.totalAlocados}
              {totalStats.totalVagas > 0 ? ` / ${totalStats.totalVagas}` : ""}
            </strong>
          </div>
        </div>
      </div>

      {/* Caso não haja nenhum card de Aéreo */}
      {aereoBlocks.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-surface shadow-xs space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
            <Plane size={32} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-text-title">Nenhum Card de Aéreo Cadastrado</h3>
            <p className="text-xs text-text-muted">
              Para alocar passageiros nos voos, você precisa primeiro adicionar um card de <strong>Aéreo</strong> na aba <strong>Pacote</strong>.
            </p>
          </div>
        </div>
      ) : (
        /* Layout Principal: Coluna da Room List à Esquerda e Trechos de Voo à Direita */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Coluna Esquerda: Passageiros da Room List (Pool de Alocação) */}
          <div className="lg:col-span-4 space-y-3 lg:sticky lg:top-4">
            <div className="p-4 rounded-3xl bg-surface border border-border shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-primary" />
                  <h3 className="text-sm font-bold text-text-title">Passageiros da Room List</h3>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {guests.length}
                </span>
              </div>

              {/* Dica de Arraste */}
              <div className="text-[11px] text-text-muted bg-surface-subtle p-2 rounded-xl flex items-center gap-1.5 border border-border/50">
                <GripVertical size={13} className="text-primary shrink-0" />
                <span>Arraste o passageiro ou clique em <strong>+ Alocar</strong> para vinculá-lo a um voo.</span>
              </div>

              {/* Busca e Filtros */}
              <div className="space-y-2">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <input
                    type="text"
                    value={searchGuest}
                    onChange={(e) => setSearchGuest(e.target.value)}
                    placeholder="Buscar passageiro ou documento..."
                    className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-xl border border-border bg-surface-subtle text-text-body focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                <div className="flex rounded-xl bg-surface-subtle p-1 border border-border/60 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setGuestFilterTab("todos")}
                    className={`flex-1 py-1 rounded-lg transition-all ${
                      guestFilterTab === "todos"
                        ? "bg-surface text-text-title shadow-xs"
                        : "text-text-muted hover:text-text-body"
                    }`}
                  >
                    Todos ({guests.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuestFilterTab("pendentes")}
                    className={`flex-1 py-1 rounded-lg transition-all ${
                      guestFilterTab === "pendentes"
                        ? "bg-surface text-text-title shadow-xs"
                        : "text-text-muted hover:text-text-body"
                    }`}
                  >
                    Não Alocados
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuestFilterTab("alocados")}
                    className={`flex-1 py-1 rounded-lg transition-all ${
                      guestFilterTab === "alocados"
                        ? "bg-surface text-text-title shadow-xs"
                        : "text-text-muted hover:text-text-body"
                    }`}
                  >
                    Alocados
                  </button>
                </div>
              </div>

              {/* Lista com Scroll dos Passageiros */}
              <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
                {filteredGuests.length === 0 ? (
                  <div className="p-6 text-center text-xs text-text-muted">
                    Nenhum passageiro encontrado.
                  </div>
                ) : (
                  filteredGuests.map((g) => {
                    const roomDesc = guestRoomMap.get(g.id);
                    const allocsCount = guestAllocationMap.get(g.id)?.size || 0;
                    const isDragging = draggedGuestId === g.id;

                    return (
                      <div
                        key={g.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", g.id);
                          setDraggedGuestId(g.id);
                        }}
                        onDragEnd={() => setDraggedGuestId(null)}
                        className={`p-2.5 rounded-2xl border transition-all cursor-grab active:cursor-grabbing ${
                          isDragging
                            ? "opacity-40 scale-95 border-primary"
                            : "border-border hover:border-primary/50 bg-surface shadow-2xs hover:shadow-xs"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                            <div className="mt-0.5 text-text-muted hover:text-primary">
                              <GripVertical size={14} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-text-title truncate">
                                {g.nome}
                              </div>
                              <div className="text-[10px] text-text-muted font-mono flex items-center gap-1.5 mt-0.5">
                                <span>{g.documento || "Sem doc"}</span>
                                {g.tipo && (
                                  <span className="px-1.5 py-0.2 rounded bg-surface-subtle text-text-muted font-sans">
                                    {g.tipo}
                                  </span>
                                )}
                              </div>
                              {roomDesc && (
                                <div className="text-[10px] text-primary/80 flex items-center gap-1 mt-1 font-medium">
                                  <Building size={10} />
                                  <span className="truncate">{roomDesc}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {allocsCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 size={10} /> {allocsCount} {allocsCount === 1 ? "voo" : "voos"}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                Pendente
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Botões Rápidos para Alocar em Trechos Existentes */}
                        <div className="mt-2 pt-2 border-t border-border/40 flex flex-wrap gap-1">
                          {aereoBlocks.map((b) => {
                            const d = b.data as AereoBlockData;
                            const journeys = buildJourneys(d.flights || []);
                            return journeys.map((j) => {
                              const isAllocatedInThis = guestAllocationMap
                                .get(g.id)
                                ?.has(`${b.id}_${j.id}`);

                              if (isAllocatedInThis) return null;

                              return (
                                <button
                                  key={`${b.id}_${j.id}`}
                                  type="button"
                                  onClick={() => handleAllocateGuest(b.id, j.id, g.id)}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1 cursor-pointer"
                                  title={`Alocar no trecho ${j.tipo} de ${b.title || "Aéreo"}`}
                                >
                                  <Plus size={10} /> {j.tipo} ({j.origin}➔{j.finalDestination})
                                </button>
                              );
                            });
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Coluna Direita: Cards de Aéreo e seus Trechos Agrupados */}
          <div className="lg:col-span-8 space-y-6">
            {aereoBlocks.map((block) => {
              const d = block.data as AereoBlockData;
              const vagasNum = parseNum(d.vagas) || 0;
              const flights = Array.isArray(d.flights) ? d.flights : [];
              const journeys = buildJourneys(flights);
              const allocations = d.flightAllocations || {};

              return (
                <div
                  key={block.id}
                  className="rounded-3xl border border-border bg-surface shadow-xs overflow-hidden space-y-4"
                >
                  {/* Cabeçalho do Card de Aéreo */}
                  <div className="p-5 bg-gradient-to-r from-sky-500/10 via-surface to-surface-subtle border-b border-border flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">✈️</span>
                        <h3 className="text-base font-black text-text-title tracking-tight">
                          {block.title || "Aéreo"}
                        </h3>
                        {d.localizador && (
                          <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-primary/15 text-primary border border-primary/20 uppercase">
                            LOC: {d.localizador}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted">
                        Capacidade configurada no card: <strong>{vagasNum} vagas</strong> por trecho.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-text-muted font-medium">
                        {journeys.length} {journeys.length === 1 ? "viagem/trecho" : "viagens/trechos"}
                      </span>
                    </div>
                  </div>

                  {/* Lista de Trechos (Journeys) dentro deste Aéreo */}
                  <div className="p-5 pt-0 space-y-6">
                    {journeys.length === 0 ? (
                      <div className="p-8 text-center text-xs text-text-muted border border-dashed border-border rounded-2xl">
                        Nenhum voo cadastrado neste card de Aéreo. Configure os voos na aba Pacote.
                      </div>
                    ) : (
                      journeys.map((journey) => {
                        const journeyKey = `${block.id}_${journey.id}`;
                        const allocatedList = allocations[journey.id] || [];
                        const isDragOver = dragOverJourneyKey === journeyKey;
                        const remainingVagas = Math.max(0, vagasNum - allocatedList.length);
                        const isFull = vagasNum > 0 && allocatedList.length >= vagasNum;

                        return (
                          <div
                            key={journey.id}
                            className={`rounded-2xl border transition-all ${
                              isDragOver
                                ? "border-primary ring-2 ring-primary/40 bg-primary/5 shadow-md scale-[1.005]"
                                : "border-border bg-surface-subtle/50"
                            }`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (draggedGuestId) {
                                setDragOverJourneyKey(journeyKey);
                              }
                            }}
                            onDragLeave={() => {
                              if (dragOverJourneyKey === journeyKey) {
                                setDragOverJourneyKey(null);
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              setDragOverJourneyKey(null);
                              const guestId = e.dataTransfer.getData("text/plain");
                              if (guestId) {
                                handleAllocateGuest(block.id, journey.id, guestId);
                              }
                            }}
                          >
                            {/* Cabeçalho do Trecho Agrupado */}
                            <div className="p-4 border-b border-border/80 flex flex-wrap items-center justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-primary text-white">
                                    {journey.tipo}
                                  </span>
                                  <span className="text-sm font-black text-text-title">
                                    {journey.origin}{" "}
                                    <ArrowRight size={13} className="inline mx-1 text-primary" />{" "}
                                    {journey.finalDestination}
                                  </span>
                                  {journey.connections.length > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/20">
                                      <GitBranch size={11} /> {journey.connections.length}{" "}
                                      {journey.connections.length === 1 ? "conexão" : "conexões"}
                                    </span>
                                  )}
                                </div>

                                {/* Lista dos voos que compõem este trecho único */}
                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted pt-1">
                                  {journey.allFlights.map((fl, flIdx) => (
                                    <span
                                      key={fl.id || flIdx}
                                      className="px-2 py-0.5 rounded-md bg-surface border border-border font-mono font-semibold text-text-body"
                                    >
                                      {fl.cia || "AZUL"} {fl.voo || "---"} ({fl.origem} {fl.saida} ➔ {fl.destino} {fl.chegada})
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Barra e Contador de Vagas */}
                              <div className="flex flex-wrap items-center gap-3">
                                <div className="text-right">
                                  <div className="text-xs font-bold text-text-title flex items-center gap-1 justify-end">
                                    <span>{allocatedList.length}</span>
                                    <span className="text-text-muted font-normal">/ {vagasNum} vagas</span>
                                  </div>
                                  <span
                                    className={`text-[10px] font-bold ${
                                      isFull
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : remainingVagas <= 3 && vagasNum > 0
                                        ? "text-amber-500"
                                        : "text-text-muted"
                                    }`}
                                  >
                                    {isFull ? "✓ Vagas Esgotadas" : `${remainingVagas} disponíveis`}
                                  </span>
                                </div>

                                {/* Ações do Trecho */}
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPrintModalState({
                                        isOpen: true,
                                        block,
                                        journey,
                                        allocations: allocatedList,
                                      })
                                    }
                                    className="p-1.5 rounded-lg border border-border bg-surface text-text-muted hover:text-primary hover:border-primary transition-all cursor-pointer"
                                    title="Imprimir Manifesto de Voo / Lista de Embarque"
                                  >
                                    <Printer size={15} />
                                  </button>

                                  {vagasNum > 0 && remainingVagas > 0 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleAllocateAllRemaining(block.id, journey.id, vagasNum)
                                      }
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition-all cursor-pointer"
                                      title="Alocar automaticamente os passageiros da Room List ainda não presentes neste voo"
                                    >
                                      <Sparkles size={13} />
                                      <span className="hidden sm:inline">Preencher Restantes</span>
                                    </button>
                                  )}

                                  {allocatedList.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleClearJourney(block.id, journey.id)}
                                      className="p-1.5 rounded-lg border border-border bg-surface text-text-muted hover:text-status-danger hover:border-status-danger transition-all cursor-pointer"
                                      title="Limpar todos os passageiros deste trecho"
                                    >
                                      <RotateCcw size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Dropzone animada quando arrastando */}
                            {isDragOver && (
                              <div className="m-3 p-3 rounded-xl bg-primary/15 border-2 border-dashed border-primary text-xs font-bold text-primary text-center animate-pulse">
                                Solte o passageiro aqui para alocar no trecho {journey.tipo}!
                              </div>
                            )}

                            {/* Tabela dos Passageiros Alocados neste Trecho */}
                            <div className="p-4 space-y-3">
                              {allocatedList.length === 0 ? (
                                <div className="p-6 text-center text-xs text-text-muted border border-dashed border-border/80 rounded-xl bg-surface/50">
                                  Nenhum passageiro alocado neste trecho ainda. Arraste um passageiro da lista lateral ou use o botão de preenchimento.
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs text-left">
                                    <thead>
                                      <tr className="border-b border-border/60 text-text-muted font-bold uppercase text-[10px]">
                                        <th className="py-2 px-2.5 w-8 text-center">#</th>
                                        <th className="py-2 px-2.5">Passageiro</th>
                                        <th className="py-2 px-2.5">Documento</th>
                                        <th className="py-2 px-2.5">Quarto (Room List)</th>
                                        <th className="py-2 px-2.5 w-24 text-center">Assento</th>
                                        <th className="py-2 px-2.5 w-32 text-center">Bilhete / E-Ticket</th>
                                        <th className="py-2 px-2.5 w-10 text-center"></th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                      {allocatedList.map((p, idx) => (
                                        <tr
                                          key={p.id}
                                          className="hover:bg-surface transition-colors"
                                        >
                                          <td className="py-2 px-2.5 text-center font-bold text-text-muted">
                                            {idx + 1}
                                          </td>
                                          <td className="py-2 px-2.5 font-bold text-text-title">
                                            <span>{p.nome}</span>
                                            {p.tipo && (
                                              <span className="ml-1.5 text-[10px] font-normal text-text-muted">
                                                ({p.tipo})
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2 px-2.5 font-mono text-text-body">
                                            {p.documento || "---"}
                                          </td>
                                          <td className="py-2 px-2.5 text-text-muted">
                                            {p.roomNumber || "---"}
                                          </td>
                                          <td className="py-2 px-2.5 text-center">
                                            <input
                                              type="text"
                                              className="w-16 px-1.5 py-0.5 text-center uppercase font-mono font-bold text-xs rounded border border-border bg-surface text-primary focus:outline-none focus:border-primary"
                                              placeholder="Ex: 14A"
                                              value={p.seat || ""}
                                              onChange={(e) =>
                                                handleUpdateAllocationField(
                                                  block.id,
                                                  journey.id,
                                                  p.id,
                                                  "seat",
                                                  e.target.value.toUpperCase()
                                                )
                                              }
                                            />
                                          </td>
                                          <td className="py-2 px-2.5 text-center">
                                            <input
                                              type="text"
                                              className="w-28 px-1.5 py-0.5 text-center font-mono text-xs rounded border border-border bg-surface text-text-body focus:outline-none focus:border-primary"
                                              placeholder="Ex: 057-234234"
                                              value={p.ticketNumber || ""}
                                              onChange={(e) =>
                                                handleUpdateAllocationField(
                                                  block.id,
                                                  journey.id,
                                                  p.id,
                                                  "ticketNumber",
                                                  e.target.value
                                                )
                                              }
                                            />
                                          </td>
                                          <td className="py-2 px-2.5 text-center">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleRemoveAllocation(block.id, journey.id, p.id)
                                              }
                                              className="p-1 rounded text-text-muted hover:text-status-danger hover:bg-status-danger/10 transition-colors cursor-pointer"
                                              title="Remover passageiro deste voo"
                                            >
                                              <Trash2 size={13} />
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Impressão do Manifesto */}
      {printModalState.isOpen && printModalState.block && printModalState.journey && (
        <FlightManifestModal
          isOpen={printModalState.isOpen}
          onClose={() =>
            setPrintModalState({
              isOpen: false,
              block: null,
              journey: null,
              allocations: [],
            })
          }
          block={printModalState.block}
          journeyTitle={`Trecho ${printModalState.journey.tipo}`}
          journeyRoute={`${printModalState.journey.origin} ➔ ${printModalState.journey.finalDestination}`}
          journeyFlights={printModalState.journey.allFlights}
          allocations={printModalState.allocations}
          excursionName={excursionName}
          periodStart={periodStart}
          periodEnd={periodEnd}
          destination={destination}
        />
      )}
    </div>
  );
}
