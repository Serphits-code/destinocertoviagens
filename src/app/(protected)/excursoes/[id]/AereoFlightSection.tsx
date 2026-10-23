"use client";

import React, { useState, useId } from "react";
import {
  Plane,
  Plus,
  Trash2,
  GripVertical,
  CornerDownRight,
  Unlink,
  ArrowRight,
  Clock,
  ChevronDown,
  GitBranch,
} from "lucide-react";
import type { AereoFlight, RowStatus } from "@/lib/editor-types";

interface AereoFlightSectionProps {
  flights: AereoFlight[];
  onChange: (flights: AereoFlight[]) => void;
}

const inputCls =
  "w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all";
const inputUpperCls = `${inputCls} uppercase font-mono font-semibold tracking-wider`;

function StatusSelect({
  value,
  onChange,
}: {
  value: RowStatus;
  onChange: (v: RowStatus) => void;
}) {
  const styles: Record<RowStatus, string> = {
    PENDENTE: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    COTADO: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
    CONFIRMADO: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    CANCELADO: "bg-slate-500/15 text-slate-500 line-through border-slate-500/30",
  };

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as RowStatus)}
      className={`px-2 py-1 rounded-md text-[11px] font-bold border outline-none cursor-pointer transition-all ${
        styles[value] || styles.COTADO
      }`}
    >
      <option value="CONFIRMADO" className="bg-surface text-text-title font-semibold">
        CONFIRMADO
      </option>
      <option value="COTADO" className="bg-surface text-text-title font-semibold">
        COTADO
      </option>
      <option value="PENDENTE" className="bg-surface text-text-title font-semibold">
        PENDENTE
      </option>
      <option value="CANCELADO" className="bg-surface text-text-title font-semibold">
        CANCELADO
      </option>
    </select>
  );
}

function calculateLayover(chegada?: string, saida?: string): string | null {
  if (!chegada || !saida) return null;
  const match1 = chegada.match(/^(\d{1,2}):(\d{2})$/);
  const match2 = saida.match(/^(\d{1,2}):(\d{2})$/);
  if (!match1 || !match2) return null;

  const mins1 = parseInt(match1[1], 10) * 60 + parseInt(match1[2], 10);
  let mins2 = parseInt(match2[1], 10) * 60 + parseInt(match2[2], 10);

  if (mins2 < mins1) {
    mins2 += 24 * 60; // Passou da meia-noite
  }

  const diffMins = mins2 - mins1;
  if (diffMins < 0 || diffMins > 24 * 60) return null;

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

function getCiaBadge(cia: string) {
  const c = (cia || "").toUpperCase().trim();
  if (c.includes("AZUL")) {
    return "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30";
  }
  if (c.includes("GOL")) {
    return "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30";
  }
  if (c.includes("LATAM")) {
    return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";
  }
  if (c.includes("TAP")) {
    return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
  }
  return "bg-surface-subtle text-text-body border-border";
}

export function AereoFlightSection({ flights, onChange }: AereoFlightSectionProps) {
  const datalistId = useId();
  const [draggedFlightId, setDraggedFlightId] = useState<string | null>(null);
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);
  const [addConexaoMenuOpen, setAddConexaoMenuOpen] = useState(false);

  // Garante IDs estáveis para todos os voos
  const normalizedFlights = React.useMemo(() => {
    let hasMissingId = false;
    const list = flights.map((f, i) => {
      if (!f.id) {
        hasMissingId = true;
        return {
          ...f,
          id: `flight_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        };
      }
      return f;
    });

    if (hasMissingId) {
      setTimeout(() => onChange(list), 0);
    }
    return list;
  }, [flights, onChange]);

  const updateFlightField = (id: string, field: keyof AereoFlight, value: unknown) => {
    const next = normalizedFlights.map((f) => (f.id === id ? { ...f, [field]: value } : f));
    onChange(next);
  };

  const removeFlight = (id: string) => {
    // Ao remover um voo, suas conexões filhas se tornam voos principais independentes
    const next = normalizedFlights
      .filter((f) => f.id !== id)
      .map((f) => (f.conexaoDeId === id ? { ...f, conexaoDeId: undefined } : f));
    onChange(next);
  };

  const addMainFlight = () => {
    const newFlight: AereoFlight = {
      id: `flight_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      cia: "AZUL",
      voo: "",
      origem: "",
      saida: "",
      chegada: "",
      destino: "",
      tipo: "Ida",
      status: "CONFIRMADO",
    };
    onChange([...normalizedFlights, newFlight]);
  };

  const addConnectionTo = (parentFlightId: string) => {
    const parent = normalizedFlights.find((f) => f.id === parentFlightId);
    if (!parent) return;

    const newConnection: AereoFlight = {
      id: `flight_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      cia: parent.cia || "AZUL",
      voo: "",
      origem: parent.destino || "", // Inicia onde o voo pai aterrissou!
      saida: "",
      chegada: "",
      destino: "",
      tipo: parent.tipo || "Ida",
      status: parent.status || "CONFIRMADO",
      conexaoDeId: parent.id,
    };

    // Insere logo após o voo pai ou após a última conexão desse voo pai
    const parentIndex = normalizedFlights.findIndex((f) => f.id === parentFlightId);
    const next = [...normalizedFlights];
    let insertIndex = parentIndex + 1;
    while (
      insertIndex < next.length &&
      next[insertIndex].conexaoDeId === parentFlightId
    ) {
      insertIndex++;
    }

    next.splice(insertIndex, 0, newConnection);
    onChange(next);
    setAddConexaoMenuOpen(false);
  };

  const unlinkFlight = (flightId: string) => {
    const next = normalizedFlights.map((f) =>
      f.id === flightId ? { ...f, conexaoDeId: undefined } : f
    );
    onChange(next);
  };

  const setFlightConnection = (flightId: string, parentFlightId?: string | null) => {
    if (!parentFlightId) {
      unlinkFlight(flightId);
      return;
    }
    if (parentFlightId === flightId) return;

    // Evita loop circular
    const next = normalizedFlights.map((f) =>
      f.id === flightId ? { ...f, conexaoDeId: parentFlightId } : f
    );

    // Reorganiza a lista para agrupar visualmente a conexão logo após o pai
    const parentIdx = next.findIndex((f) => f.id === parentFlightId);
    const flightObj = next.find((f) => f.id === flightId);
    if (parentIdx !== -1 && flightObj) {
      const filtered = next.filter((f) => f.id !== flightId);
      let targetIdx = filtered.findIndex((f) => f.id === parentFlightId) + 1;
      while (
        targetIdx < filtered.length &&
        filtered[targetIdx].conexaoDeId === parentFlightId
      ) {
        targetIdx++;
      }
      filtered.splice(targetIdx, 0, flightObj);
      onChange(filtered);
    } else {
      onChange(next);
    }
  };

  // Drag and Drop: agrupar como conexão dinamicamente
  const handleDropOnTarget = (targetId: string) => {
    if (!draggedFlightId) return;

    if (targetId === "__UNLINK__") {
      unlinkFlight(draggedFlightId);
      setDraggedFlightId(null);
      setDragOverTargetId(null);
      return;
    }

    if (draggedFlightId === targetId) {
      setDraggedFlightId(null);
      setDragOverTargetId(null);
      return;
    }

    const targetFlight = normalizedFlights.find((f) => f.id === targetId);
    if (!targetFlight) return;

    // Se o alvo já for uma conexão, conecta ao mesmo pai do alvo
    const effectiveParentId = targetFlight.conexaoDeId || targetFlight.id;
    setFlightConnection(draggedFlightId, effectiveParentId);

    setDraggedFlightId(null);
    setDragOverTargetId(null);
  };

  // Separação em grupos: voos principais e suas conexões
  const mainFlights = normalizedFlights.filter(
    (f) => !f.conexaoDeId || !normalizedFlights.some((p) => p.id === f.conexaoDeId)
  );

  const getConnectionsOf = (parentId: string) =>
    normalizedFlights.filter((f) => f.conexaoDeId === parentId);

  const draggedFlight = normalizedFlights.find((f) => f.id === draggedFlightId);

  return (
    <div className="space-y-4">
      {/* Sugestões de Companhias Aéreas */}
      <datalist id={datalistId}>
        <option value="AZUL" />
        <option value="GOL" />
        <option value="LATAM" />
        <option value="TAP" />
        <option value="VOEPASS" />
        <option value="COPA" />
        <option value="AVIANCA" />
        <option value="AIR FRANCE" />
      </datalist>

      {/* Banner Informativo & Dropzone de Desvinculação durante o Arraste */}
      {draggedFlight && draggedFlight.conexaoDeId && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverTargetId("__UNLINK__");
          }}
          onDragLeave={() => {
            if (dragOverTargetId === "__UNLINK__") setDragOverTargetId(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            handleDropOnTarget("__UNLINK__");
          }}
          className={`border-2 border-dashed rounded-xl p-3 text-center transition-all ${
            dragOverTargetId === "__UNLINK__"
              ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold scale-[1.01] shadow-lg"
              : "border-border bg-surface-subtle/50 text-text-muted text-xs hover:border-primary/50"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Unlink size={16} className={dragOverTargetId === "__UNLINK__" ? "animate-bounce" : ""} />
            <span>Solte aqui para <strong>DESVINCULAR</strong> e transformar em Voo Principal</span>
          </div>
        </div>
      )}

      {/* Lista de Voos e Conexões Agrupadas */}
      {mainFlights.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-surface-subtle/30 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Plane size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-title">Nenhum voo cadastrado</p>
            <p className="text-xs text-text-muted mt-0.5">
              Adicione voos principais e conecte trechos facilmente por seleção ou arrastando.
            </p>
          </div>
          <button
            type="button"
            onClick={addMainFlight}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-strong transition-all cursor-pointer shadow-sm"
          >
            <Plus size={14} /> Adicionar Primeiro Voo
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {mainFlights.map((mainFlight, mainIdx) => {
            const connections = getConnectionsOf(mainFlight.id || "");
            const isMainBeingDragged = draggedFlightId === mainFlight.id;
            const isDragOverMain = dragOverTargetId === mainFlight.id && draggedFlightId !== mainFlight.id;

            // Rota geral calculada (ex: REC ➔ FOZ com 1 conexão em CNF)
            const finalDestination =
              connections.length > 0
                ? connections[connections.length - 1].destino || mainFlight.destino
                : mainFlight.destino;

            return (
              <div
                key={mainFlight.id || mainIdx}
                className={`rounded-2xl border transition-all ${
                  isDragOverMain
                    ? "border-primary ring-2 ring-primary/40 bg-primary/5 shadow-md scale-[1.008]"
                    : "border-border bg-surface shadow-xs"
                } ${isMainBeingDragged ? "opacity-50" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggedFlightId && draggedFlightId !== mainFlight.id) {
                    setDragOverTargetId(mainFlight.id || null);
                  }
                }}
                onDragLeave={() => {
                  if (dragOverTargetId === mainFlight.id) setDragOverTargetId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (mainFlight.id) handleDropOnTarget(mainFlight.id);
                }}
              >
                {/* Cabeçalho do Trecho / Rota Geral */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-surface-subtle/70 rounded-t-2xl border-b border-border/80">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${getCiaBadge(
                        mainFlight.cia
                      )}`}
                    >
                      {mainFlight.cia || "AÉREO"}
                    </span>
                    <span className="text-xs font-bold text-text-title">
                      {mainFlight.tipo || "Trecho"} • {mainFlight.origem || "---"}{" "}
                      <ArrowRight size={12} className="inline mx-1 text-primary" />{" "}
                      {finalDestination || "---"}
                    </span>
                    {connections.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <GitBranch size={11} /> {connections.length}{" "}
                        {connections.length === 1 ? "conexão" : "conexões"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {/* Botão rápido: Adicionar conexão direta a este voo */}
                    <button
                      type="button"
                      onClick={() => mainFlight.id && addConnectionTo(mainFlight.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-primary hover:text-primary-strong bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer"
                      title="Adicionar voo em conexão a este trecho"
                    >
                      <Plus size={12} /> Conexão
                    </button>
                  </div>
                </div>

                {/* Banner de Drop quando arrastando outro voo sobre este */}
                {isDragOverMain && (
                  <div className="px-4 py-2 bg-primary/15 border-b border-primary/20 text-xs font-bold text-primary flex items-center justify-center gap-2 animate-pulse">
                    <CornerDownRight size={16} />
                    <span>
                      Solte para agrupar como <strong>CONEXÃO</strong> deste voo ({mainFlight.cia}{" "}
                      {mainFlight.voo ? `nº ${mainFlight.voo}` : ""})
                    </span>
                  </div>
                )}

                {/* Corpo do Voo Principal */}
                <div className="p-3.5 space-y-3">
                  <FlightRowCard
                    flight={mainFlight}
                    allFlights={normalizedFlights}
                    datalistId={datalistId}
                    isConnection={false}
                    onFieldChange={(field, val) =>
                      mainFlight.id && updateFlightField(mainFlight.id, field, val)
                    }
                    onDelete={() => mainFlight.id && removeFlight(mainFlight.id)}
                    onSetConnection={(parentId) =>
                      mainFlight.id && setFlightConnection(mainFlight.id, parentId)
                    }
                    onDragStart={() => setDraggedFlightId(mainFlight.id || null)}
                    onDragEnd={() => {
                      setDraggedFlightId(null);
                      setDragOverTargetId(null);
                    }}
                  />

                  {/* Lista de Conexões Encadeadas */}
                  {connections.map((conn, connIdx) => {
                    const prevFlight = connIdx === 0 ? mainFlight : connections[connIdx - 1];
                    const layover = calculateLayover(prevFlight.chegada, conn.saida);
                    const isConnBeingDragged = draggedFlightId === conn.id;
                    const isDragOverConn =
                      dragOverTargetId === conn.id && draggedFlightId !== conn.id;

                    return (
                      <div
                        key={conn.id || connIdx}
                        className="relative pl-6 sm:pl-9 space-y-2"
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (draggedFlightId && draggedFlightId !== conn.id) {
                            setDragOverTargetId(conn.id || null);
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverTargetId === conn.id) setDragOverTargetId(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (conn.id) handleDropOnTarget(conn.id);
                        }}
                      >
                        {/* Linha visual de conexão (Árvore) */}
                        <div className="absolute left-2.5 sm:left-4 top-0 bottom-4 w-0.5 bg-gradient-to-b from-primary/50 to-primary/20 -translate-x-1/2" />
                        <div className="absolute left-2.5 sm:left-4 top-4 w-3.5 h-0.5 bg-primary/40" />

                        {/* Indicador de Tempo de Conexão / Troca de Aeronave */}
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-subtle border border-border text-text-muted">
                          <Clock size={11} className="text-primary" />
                          <span>
                            Conexão em{" "}
                            <strong className="text-text-title font-mono">
                              {prevFlight.destino || conn.origem || "Aeroporto"}
                            </strong>
                            {layover ? `: ${layover} de espera` : ""}
                          </span>
                        </div>

                        {/* Banner de Drop quando arrastando outro voo sobre esta conexão */}
                        {isDragOverConn && (
                          <div className="px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/30 text-xs font-bold text-primary flex items-center gap-2">
                            <CornerDownRight size={14} />
                            <span>Solte para agrupar como conexão neste trecho</span>
                          </div>
                        )}

                        {/* Card da Conexão */}
                        <div
                          className={`rounded-xl border border-primary/20 bg-primary/[0.02] p-2.5 transition-all ${
                            isDragOverConn ? "ring-2 ring-primary/40 bg-primary/10" : ""
                          } ${isConnBeingDragged ? "opacity-50" : ""}`}
                        >
                          <FlightRowCard
                            flight={conn}
                            allFlights={normalizedFlights}
                            datalistId={datalistId}
                            isConnection={true}
                            onFieldChange={(field, val) =>
                              conn.id && updateFlightField(conn.id, field, val)
                            }
                            onDelete={() => conn.id && removeFlight(conn.id)}
                            onSetConnection={(parentId) =>
                              conn.id && setFlightConnection(conn.id, parentId)
                            }
                            onUnlink={() => conn.id && unlinkFlight(conn.id)}
                            onDragStart={() => setDraggedFlightId(conn.id || null)}
                            onDragEnd={() => {
                              setDraggedFlightId(null);
                              setDragOverTargetId(null);
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ações Inferiores: Adicionar Voo Principal ou Nova Conexão */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={addMainFlight}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary transition-all cursor-pointer shadow-xs"
        >
          <Plus size={14} /> Adicionar Voo Principal
        </button>

        {mainFlights.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setAddConexaoMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-surface text-text-body hover:bg-surface-subtle hover:border-text-muted transition-all cursor-pointer"
            >
              <GitBranch size={13} className="text-amber-500" />
              <span>Adicionar Conexão...</span>
              <ChevronDown size={13} className="text-text-muted" />
            </button>

            {addConexaoMenuOpen && (
              <div className="absolute left-0 mt-1 w-64 bg-surface rounded-xl border border-border shadow-xl z-30 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1 text-[11px] font-bold text-text-muted uppercase tracking-wider">
                  Vincular conexão a qual voo?
                </div>
                {mainFlights.map((mf) => (
                  <button
                    key={mf.id}
                    type="button"
                    onClick={() => mf.id && addConnectionTo(mf.id)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-primary/10 hover:text-primary transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-semibold truncate">
                      {mf.cia || "Voo"} {mf.voo ? `nº ${mf.voo}` : ""} ({mf.origem || "?"} →{" "}
                      {mf.destino || "?"})
                    </span>
                    <span className="text-[10px] text-text-muted ml-2 shrink-0">{mf.tipo}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="ml-auto text-[11px] text-text-muted hidden sm:flex items-center gap-1.5">
          <GripVertical size={13} />
          <span>Dica: arraste um voo sobre outro para agrupá-los como conexão dinâmica.</span>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------------------------
// Subcomponente: Linha/Card Editável de um Voo (usado tanto para Voo Principal quanto Conexão)
// -------------------------------------------------------------------------------------------------
interface FlightRowCardProps {
  flight: AereoFlight;
  allFlights: AereoFlight[];
  datalistId: string;
  isConnection: boolean;
  onFieldChange: (field: keyof AereoFlight, value: unknown) => void;
  onDelete: () => void;
  onSetConnection: (parentId?: string | null) => void;
  onUnlink?: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

function FlightRowCard({
  flight,
  allFlights,
  datalistId,
  isConnection,
  onFieldChange,
  onDelete,
  onSetConnection,
  onUnlink,
  onDragStart,
  onDragEnd,
}: FlightRowCardProps) {
  // Lista de voos candidatos aos quais este voo pode ser vinculado como conexão (exclui a si mesmo)
  const candidateParents = allFlights.filter((f) => f.id !== flight.id && f.conexaoDeId !== flight.id);

  return (
    <div className="space-y-2">
      {/* Barra de Status e Vínculo de Conexão */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-border/40">
        <div className="flex items-center gap-2">
          {/* Drag Handle */}
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", flight.id || "");
              onDragStart();
            }}
            onDragEnd={onDragEnd}
            className="cursor-grab active:cursor-grabbing p-1 rounded-md text-text-muted hover:text-primary hover:bg-surface-subtle transition-colors"
            title="Segure e arraste este voo sobre outro para agrupar como conexão"
          >
            <GripVertical size={15} />
          </div>

          {/* Badge de Trecho / Conexão */}
          {isConnection ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <CornerDownRight size={11} /> Conexão
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <Plane size={11} /> Trecho Principal
            </span>
          )}

          {/* Seletor Dinâmico de Conexão / Vínculo */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[11px] text-text-muted font-medium">Vínculo:</span>
            <select
              value={flight.conexaoDeId || ""}
              onChange={(e) => onSetConnection(e.target.value || null)}
              className="px-2 py-0.5 rounded-md text-[11px] font-medium border border-border bg-surface text-text-body focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer max-w-[200px] truncate"
              title="Selecione o voo ao qual este voo pertence como conexão"
            >
              <option value="">✈️ Voo Principal (Direto)</option>
              {candidateParents.map((cand) => (
                <option key={cand.id} value={cand.id}>
                  ↳ Conexão de: {cand.cia || "Voo"} {cand.voo ? `nº ${cand.voo}` : ""} (
                  {cand.origem || "?"} → {cand.destino || "?"})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão de Desvincular rápido para conexões */}
          {isConnection && onUnlink && (
            <button
              type="button"
              onClick={onUnlink}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-text-muted hover:text-primary hover:bg-surface-subtle transition-colors cursor-pointer"
              title="Transformar este voo em um trecho principal independente"
            >
              <Unlink size={12} /> Desmembrar
            </button>
          )}

          {/* Status do Voo */}
          <StatusSelect
            value={flight.status || "CONFIRMADO"}
            onChange={(val) => onFieldChange("status", val)}
          />

          {/* Botão Remover */}
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded text-text-muted hover:text-status-danger hover:bg-status-danger/10 transition-colors cursor-pointer"
            title="Excluir este voo"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Grid de Campos do Voo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {/* Cia Aérea */}
        <label className="text-[11px] text-text-muted">
          <span className="block mb-0.5 font-medium">Cia Aérea</span>
          <input
            list={datalistId}
            className={inputUpperCls}
            placeholder="AZUL"
            value={flight.cia || ""}
            onChange={(e) => onFieldChange("cia", e.target.value.toUpperCase())}
          />
        </label>

        {/* Número do Voo */}
        <label className="text-[11px] text-text-muted">
          <span className="block mb-0.5 font-medium">Nº Voo</span>
          <input
            className={inputUpperCls}
            placeholder="4605"
            value={flight.voo || ""}
            onChange={(e) => onFieldChange("voo", e.target.value)}
          />
        </label>

        {/* Origem */}
        <label className="text-[11px] text-text-muted">
          <span className="block mb-0.5 font-medium">Origem (IATA)</span>
          <input
            className={inputUpperCls}
            placeholder="REC"
            maxLength={4}
            value={flight.origem || ""}
            onChange={(e) => onFieldChange("origem", e.target.value.toUpperCase())}
          />
        </label>

        {/* Saída */}
        <label className="text-[11px] text-text-muted">
          <span className="block mb-0.5 font-medium">Saída</span>
          <input
            className={inputCls}
            placeholder="02:45"
            value={flight.saida || ""}
            onChange={(e) => onFieldChange("saida", e.target.value)}
          />
        </label>

        {/* Chegada */}
        <label className="text-[11px] text-text-muted">
          <span className="block mb-0.5 font-medium">Chegada</span>
          <input
            className={inputCls}
            placeholder="05:20"
            value={flight.chegada || ""}
            onChange={(e) => onFieldChange("chegada", e.target.value)}
          />
        </label>

        {/* Destino */}
        <label className="text-[11px] text-text-muted">
          <span className="block mb-0.5 font-medium">Destino (IATA)</span>
          <input
            className={inputUpperCls}
            placeholder="CNF"
            maxLength={4}
            value={flight.destino || ""}
            onChange={(e) => onFieldChange("destino", e.target.value.toUpperCase())}
          />
        </label>

        {/* Tipo (Ida/Volta) */}
        <label className="text-[11px] text-text-muted col-span-2 sm:col-span-1">
          <span className="block mb-0.5 font-medium">Tipo</span>
          <input
            className={inputCls}
            placeholder="Ida"
            value={flight.tipo || ""}
            onChange={(e) => onFieldChange("tipo", e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
