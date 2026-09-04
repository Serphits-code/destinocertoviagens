"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Plus,
  Trash2,
  ExternalLink,
  Check,
  Compass,
  ArrowUp,
  ArrowDown,
  Calendar,
  ChevronDown,
  Clock,
  Sparkles,
  Layers,
} from "lucide-react";
import type { ItineraryItem } from "@/lib/actions/itinerary";
import { ItineraryMapDrawer } from "./ItineraryMapDrawer";

export const DEFAULT_SAO_PAULO_ITINERARY: ItineraryItem[] = [
  {
    id: "item-1",
    day: 1,
    time: "09h30",
    title: "Praça da Sé com a Catedral da Sé de São Paulo",
    location: "Praça da Sé, São Paulo - SP",
    latitude: -23.55052,
    longitude: -46.633308,
  },
  {
    id: "item-2",
    day: 1,
    time: "11h30",
    title: "Mosteiro de São Bento",
    location: "Largo de São Bento, São Paulo - SP",
    latitude: -23.543167,
    longitude: -46.634694,
  },
  {
    id: "item-3",
    day: 1,
    time: "13h",
    title: "Mercado Municipal de São Paulo e almoço (Mercadão)",
    location: "Rua Cantareira, 306 - Centro Histórico de São Paulo",
    latitude: -23.541786,
    longitude: -46.629399,
  },
  {
    id: "item-4",
    day: 1,
    time: "14h30",
    title: "Tarde de Compras na 25 de março",
    location: "Rua 25 de Março, São Paulo - SP",
    latitude: -23.543088,
    longitude: -46.632296,
  },
  {
    id: "item-5",
    day: 2,
    time: "09h00",
    title: "Visita ao Parque Ibirapuera e MAM",
    location: "Av. Pedro Álvares Cabral - Vila Mariana, São Paulo - SP",
    latitude: -23.587416,
    longitude: -46.657634,
  },
  {
    id: "item-6",
    day: 2,
    time: "13h30",
    title: "Almoço e Passeio na Avenida Paulista",
    location: "Avenida Paulista, São Paulo - SP",
    latitude: -23.561414,
    longitude: -46.655881,
  },
  {
    id: "item-7",
    day: 2,
    time: "18h00",
    title: "Check-in no Hotel e Noite Livre",
    location: "Hotel Delplaza Marabá, São Paulo - SP",
    latitude: -23.543209,
    longitude: -46.642738,
  },
];

const WEEKDAYS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

interface ItineraryViewProps {
  excursionId: string;
  itinerary: ItineraryItem[];
  periodStart?: string | null;
  periodEnd?: string | null;
  onAddItem: (targetDay?: number) => void;
  onUpdateItem: (id: string, patch: Partial<ItineraryItem>) => void;
  onDeleteItem: (id: string) => void;
  onMoveItem: (index: number, direction: "up" | "down") => void;
  saved: boolean;
}

export function ItineraryView({
  itinerary,
  periodStart,
  periodEnd,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onMoveItem,
  saved,
}: ItineraryViewProps) {
  const [activeItemForMap, setActiveItemForMap] = useState<ItineraryItem | null>(
    null
  );
  const [isMapDrawerOpen, setIsMapDrawerOpen] = useState(false);

  // Calcula a lista de dias disponíveis
  // Se houver datas de início e fim, calcula o intervalo exato
  const daysInfo = useMemo(() => {
    const list: Array<{
      dayNumber: number;
      dateFormatted?: string;
      weekday?: string;
    }> = [];

    let totalCalculatedDays = 1;

    if (periodStart && periodEnd) {
      const start = new Date(periodStart + "T12:00:00");
      const end = new Date(periodEnd + "T12:00:00");
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
      totalCalculatedDays = Math.max(1, Math.min(diffDays, 60)); // Máximo razoável

      for (let i = 0; i < totalCalculatedDays; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const day = d.getDate().toString().padStart(2, "0");
        const month = MONTHS[d.getMonth()];
        const weekday = WEEKDAYS[d.getDay()];
        list.push({
          dayNumber: i + 1,
          dateFormatted: `${day} de ${month}`,
          weekday,
        });
      }
    } else {
      // Se não houver período preenchido, descobre quantos dias existem nos itens atuais
      const maxDayFromItems = itinerary.reduce(
        (max, item) => Math.max(max, item.day || 1),
        1
      );
      for (let i = 1; i <= Math.max(3, maxDayFromItems); i++) {
        list.push({
          dayNumber: i,
          dateFormatted: `Dia ${i}`,
          weekday: undefined,
        });
      }
    }

    // Se houver itens com dias superiores ao calculado no período, inclui os dias adicionais
    const maxDayFromItems = itinerary.reduce(
      (max, item) => Math.max(max, item.day || 1),
      1
    );
    if (maxDayFromItems > list.length) {
      for (let i = list.length + 1; i <= maxDayFromItems; i++) {
        list.push({
          dayNumber: i,
          dateFormatted: `Dia ${i}`,
          weekday: undefined,
        });
      }
    }

    return list;
  }, [periodStart, periodEnd, itinerary]);

  // Dias manuais adicionais além dos calculados
  const [extraDaysCount, setExtraDaysCount] = useState(0);

  const allDays = useMemo(() => {
    const list = [...daysInfo];
    for (let i = 1; i <= extraDaysCount; i++) {
      const num = daysInfo.length + i;
      list.push({
        dayNumber: num,
        dateFormatted: `Dia ${num}`,
        weekday: undefined,
      });
    }
    return list;
  }, [daysInfo, extraDaysCount]);

  // Estado dos menus sanfona (quais dias estão expandidos)
  // Por padrão, todos os dias começam abertos para visualização completa
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    for (let i = 1; i <= 30; i++) {
      initial[i] = true;
    }
    return initial;
  });

  const toggleDay = (dayNum: number) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dayNum]: !prev[dayNum],
    }));
  };

  const expandAll = () => {
    const next: Record<number, boolean> = {};
    allDays.forEach((d) => {
      next[d.dayNumber] = true;
    });
    setExpandedDays(next);
  };

  const collapseAll = () => {
    const next: Record<number, boolean> = {};
    allDays.forEach((d) => {
      next[d.dayNumber] = false;
    });
    setExpandedDays(next);
  };

  // Agrupa os itens do roteiro por dia
  const itemsByDay = useMemo(() => {
    const map = new Map<number, ItineraryItem[]>();
    allDays.forEach((d) => map.set(d.dayNumber, []));

    itinerary.forEach((item) => {
      const dayNum = item.day || 1;
      const current = map.get(dayNum) || [];
      current.push(item);
      map.set(dayNum, current);
    });

    return map;
  }, [allDays, itinerary]);

  const openMapForItem = (item: ItineraryItem) => {
    setActiveItemForMap(item);
    setIsMapDrawerOpen(true);
  };

  const handleLocationUpdatedFromMap = (
    itemId: string,
    data: { location: string; latitude?: number; longitude?: number }
  ) => {
    onUpdateItem(itemId, data);
    if (activeItemForMap && activeItemForMap.id === itemId) {
      setActiveItemForMap((prev) => (prev ? { ...prev, ...data } : null));
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra Superior do Roteiro */}
      <div className="p-4 rounded-2xl bg-surface border border-border shadow-shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Compass size={20} />
          </div>
          <div>
            <h2 className="font-bold text-base text-text-title flex items-center gap-2">
              <span>Roteiro da Viagem</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
                {allDays.length} {allDays.length === 1 ? "dia" : "dias"}
              </span>
            </h2>
            <p className="text-xs text-text-muted">
              Atividades organizadas por dia no formato sanfona retrátil com
              geolocalização e salvamento instantâneo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {saved && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full font-semibold animate-in fade-in">
              <Check size={13} />
              <span>Salvo automaticamente</span>
            </span>
          )}

          {/* Botões de Expandir/Recolher Sanfonas */}
          <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-xl border border-border text-xs">
            <button
              type="button"
              onClick={expandAll}
              className="px-2.5 py-1 rounded-lg font-medium text-text-muted hover:text-text-title hover:bg-surface transition-colors cursor-pointer"
            >
              Expandir Todos
            </button>
            <span className="text-border">|</span>
            <button
              type="button"
              onClick={collapseAll}
              className="px-2.5 py-1 rounded-lg font-medium text-text-muted hover:text-text-title hover:bg-surface transition-colors cursor-pointer"
            >
              Recolher Todos
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Dias no Formato Sanfona (Accordion) */}
      <div className="space-y-4">
        {allDays.map((day) => {
          const dayItems = itemsByDay.get(day.dayNumber) || [];
          const isExpanded = Boolean(expandedDays[day.dayNumber]);

          return (
            <div
              key={day.dayNumber}
              className="rounded-2xl border border-border bg-surface shadow-shadow-card overflow-hidden transition-all"
            >
              {/* Cabeçalho da Sanfona do Dia */}
              <div
                onClick={() => toggleDay(day.dayNumber)}
                className="flex items-center justify-between p-4 bg-surface-subtle/80 hover:bg-surface-subtle cursor-pointer transition-colors select-none"
              >
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-xl bg-primary text-white font-extrabold text-xs tracking-wide shadow-xs">
                    Dia {day.dayNumber}
                  </span>

                  <div>
                    <h3 className="font-bold text-sm text-text-title flex items-center gap-2">
                      <span>{day.dateFormatted || `Dia ${day.dayNumber}`}</span>
                      {day.weekday && (
                        <span className="text-xs font-medium text-text-muted">
                          — {day.weekday}
                        </span>
                      )}
                    </h3>
                  </div>

                  <span className="text-xs text-text-muted font-medium px-2 py-0.5 rounded-md bg-surface border border-border/80 ml-1">
                    {dayItems.length} {dayItems.length === 1 ? "atividade" : "atividades"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Botão de Adicionar Atividade diretamente no Dia */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isExpanded) toggleDay(day.dayNumber);
                      onAddItem(day.dayNumber);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    title={`Adicionar atividade no Dia ${day.dayNumber}`}
                  >
                    <Plus size={14} />
                    <span>+ Atividade</span>
                  </button>

                  {/* Ícone de Seta Retrátil com Rotação Animada */}
                  <div
                    className={`p-1.5 rounded-lg text-text-muted transition-transform duration-200 ${
                      isExpanded ? "rotate-180 text-primary" : ""
                    }`}
                  >
                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>

              {/* Corpo da Sanfona: Atividades do Dia */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 sm:p-5 border-t border-border space-y-3 bg-surface">
                      {dayItems.length === 0 ? (
                        /* Estado Vazio do Dia */
                        <div className="py-6 text-center border border-dashed border-border rounded-xl bg-surface-subtle/30">
                          <Clock size={24} className="mx-auto text-text-muted mb-1 opacity-40" />
                          <p className="text-xs font-semibold text-text-muted">
                            Nenhuma atividade cadastrada para o Dia {day.dayNumber}
                          </p>
                          <button
                            type="button"
                            onClick={() => onAddItem(day.dayNumber)}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
                          >
                            <Plus size={13} />
                            <span>Adicionar primeira atividade do dia</span>
                          </button>
                        </div>
                      ) : (
                        /* Lista de Cards de Atividades */
                        dayItems.map((item, itemIdx) => {
                          const globalIdx = itinerary.findIndex(
                            (it) => it.id === item.id
                          );
                          const hasLocation = Boolean(
                            item.location || (item.latitude && item.longitude)
                          );
                          const mapsQuery =
                            item.latitude && item.longitude
                              ? `${item.latitude},${item.longitude}`
                              : encodeURIComponent(item.location || item.title);

                          return (
                            <div
                              key={item.id}
                              className="group relative flex flex-col md:flex-row md:items-center justify-between p-3.5 rounded-xl bg-surface-subtle/50 hover:bg-surface-subtle border border-border hover:border-primary/40 transition-all gap-3 shadow-2xs"
                            >
                              {/* Lado Esquerdo: Bullet + Horário + Título + Localização */}
                              <div className="flex items-start md:items-center gap-3 flex-1 min-w-0">
                                {/* Bullet Laranja com Número da Ordem */}
                                <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5 md:mt-0">
                                  {itemIdx + 1}
                                </div>

                                {/* Campo de Horário */}
                                <input
                                  type="text"
                                  value={item.time}
                                  onChange={(e) =>
                                    onUpdateItem(item.id, { time: e.target.value })
                                  }
                                  className="w-20 px-2 py-1 rounded-lg text-primary font-extrabold text-sm md:text-base tracking-tight bg-transparent hover:bg-surface focus:bg-surface border border-transparent hover:border-border focus:border-primary focus:outline-none transition-all"
                                  placeholder="09h00"
                                />

                                {/* Campo de Título / Atividade */}
                                <div className="flex-1 min-w-0">
                                  <input
                                    type="text"
                                    value={item.title}
                                    onChange={(e) =>
                                      onUpdateItem(item.id, { title: e.target.value })
                                    }
                                    className="w-full px-2 py-1 rounded-lg text-text-title font-bold text-sm md:text-base bg-transparent hover:bg-surface focus:bg-surface border border-transparent hover:border-border focus:border-primary focus:outline-none transition-all placeholder:text-text-muted"
                                    placeholder="Nome do local ou atividade"
                                  />

                                  {/* Endereço / Local configurado */}
                                  {item.location && (
                                    <p className="text-xs text-text-muted px-2 flex items-center gap-1.5 mt-0.5 truncate">
                                      <MapPin
                                        size={12}
                                        className="text-primary shrink-0"
                                      />
                                      <span className="truncate">
                                        {item.location}
                                      </span>
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Lado Direito: Mover de Dia + Mapas + Ações */}
                              <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
                                {/* Seletor de Dia para Remanejar */}
                                <div className="flex items-center gap-1 text-xs">
                                  <span className="text-[10px] font-semibold text-text-muted hidden sm:inline">
                                    Dia:
                                  </span>
                                  <select
                                    value={item.day || day.dayNumber}
                                    onChange={(e) =>
                                      onUpdateItem(item.id, {
                                        day: Number(e.target.value),
                                      })
                                    }
                                    className="px-2 py-1 rounded-lg border border-border bg-surface text-text-title text-xs font-semibold focus:outline-none focus:border-primary cursor-pointer"
                                    title="Mover esta atividade para outro dia"
                                  >
                                    {allDays.map((d) => (
                                      <option key={d.dayNumber} value={d.dayNumber}>
                                        Dia {d.dayNumber}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Botão Fixar no Mapa */}
                                <button
                                  type="button"
                                  onClick={() => openMapForItem(item)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                                    hasLocation
                                      ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white"
                                      : "bg-surface text-text-title border border-border hover:border-primary hover:text-primary"
                                  }`}
                                  title="Abrir mapa lateral para fixar localização"
                                >
                                  <MapPin
                                    size={13}
                                    className={hasLocation ? "text-primary group-hover:text-white" : ""}
                                  />
                                  <span>
                                    {hasLocation ? "Local Fixado" : "Fixar no Mapa"}
                                  </span>
                                </button>

                                {/* Abrir no Google Maps */}
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-surface border border-border text-text-muted hover:text-primary hover:border-primary transition-colors shadow-2xs"
                                  title="Abrir no Google Maps em nova aba"
                                >
                                  <ExternalLink size={12} />
                                </a>

                                {/* Ordenação Up/Down */}
                                <div className="flex items-center text-text-muted">
                                  <button
                                    type="button"
                                    disabled={globalIdx === 0}
                                    onClick={() => onMoveItem(globalIdx, "up")}
                                    className="p-1 rounded-lg hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                    title="Mover para cima"
                                  >
                                    <ArrowUp size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={globalIdx === itinerary.length - 1}
                                    onClick={() => onMoveItem(globalIdx, "down")}
                                    className="p-1 rounded-lg hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                    title="Mover para baixo"
                                  >
                                    <ArrowDown size={13} />
                                  </button>
                                </div>

                                {/* Excluir Ponto */}
                                <button
                                  type="button"
                                  onClick={() => onDeleteItem(item.id)}
                                  className="p-1.5 rounded-lg text-text-muted hover:text-status-danger hover:bg-status-danger-bg transition-colors cursor-pointer"
                                  title="Excluir atividade"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}

                      {/* Botão de Adicionar Atividade no rodapé do dia */}
                      {dayItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onAddItem(day.dayNumber)}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-border/80 hover:border-primary text-text-muted hover:text-primary text-xs font-semibold hover:bg-primary/5 transition-all cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>Adicionar mais uma atividade no Dia {day.dayNumber}</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Botão Inferior para Adicionar Novo Dia ao Roteiro */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={() => {
            const nextDay = allDays.length + 1;
            setExtraDaysCount((prev) => prev + 1);
            setExpandedDays((prev) => ({ ...prev, [nextDay]: true }));
            onAddItem(nextDay);
          }}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-surface border border-primary/30 hover:border-primary text-primary hover:bg-primary/5 text-sm font-bold transition-all shadow-xs cursor-pointer"
        >
          <Plus size={16} />
          <span>+ Adicionar Dia {allDays.length + 1} ao Roteiro</span>
        </button>
      </div>

      {/* Drawer Lateral do Mapa Leaflet */}
      <ItineraryMapDrawer
        isOpen={isMapDrawerOpen}
        item={activeItemForMap}
        onClose={() => {
          setIsMapDrawerOpen(false);
          setActiveItemForMap(null);
        }}
        onUpdateLocation={handleLocationUpdatedFromMap}
      />
    </div>
  );
}
