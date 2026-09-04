"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun,
  Flame,
  Snowflake,
  CloudSun,
  CloudRain,
  Cloud,
  Thermometer,
  Umbrella,
  Briefcase,
  MapPin,
  ChevronDown,
  X,
  Loader2,
  Calendar,
  Sparkles,
  Info,
} from "lucide-react";
import {
  getDestinationClimate,
  type DestinationClimateResult,
} from "@/lib/actions/weather";

interface WeatherClimateBadgeProps {
  packageName: string;
  periodStart: string | null;
  periodEnd: string | null;
  fallbackCity?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export function WeatherClimateBadge({
  packageName,
  periodStart,
  periodEnd,
  fallbackCity,
  latitude,
  longitude,
}: WeatherClimateBadgeProps) {
  const [climate, setClimate] = useState<DestinationClimateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDetails, setOpenDetails] = useState(false);

  // Destino customizado que o usuário pode editar diretamente
  const [customDestination, setCustomDestination] = useState<string>("");
  const [editingDestination, setEditingDestination] = useState(false);
  const [tempDestInput, setTempDestInput] = useState("");

  const popoverRef = useRef<HTMLDivElement>(null);

  // Fecha popover ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenDetails(false);
      }
    }
    if (openDetails) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openDetails]);

  const activeDestination =
    customDestination || fallbackCity || packageName || "";

  // Consulta o clima sempre que o período, destino ou coordenadas mudarem
  useEffect(() => {
    if (!periodStart || !periodEnd || (!activeDestination.trim() && !latitude)) {
      setClimate(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      const res = await getDestinationClimate({
        destination: customDestination ? customDestination : activeDestination,
        latitude: !customDestination && latitude ? latitude : undefined,
        longitude: !customDestination && longitude ? longitude : undefined,
        startDate: periodStart,
        endDate: periodEnd,
      });

      if (!isMounted) return;
      setLoading(false);

      if (res.success && res.climate) {
        setClimate(res.climate);
      } else {
        setError(res.error || "Não foi possível carregar o clima.");
      }
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [periodStart, periodEnd, activeDestination, customDestination, latitude, longitude]);

  if (!periodStart || !periodEnd) {
    return null;
  }

  const renderWeatherIcon = (iconName: string, size = 16) => {
    switch (iconName) {
      case "flame":
        return <Flame size={size} className="text-orange-500 animate-pulse" />;
      case "snowflake":
        return <Snowflake size={size} className="text-cyan-400" />;
      case "cloud-rain":
        return <CloudRain size={size} className="text-blue-500" />;
      case "cloud":
        return <Cloud size={size} className="text-slate-400" />;
      case "sun":
        return <Sun size={size} className="text-amber-500" />;
      default:
        return <CloudSun size={size} className="text-amber-500" />;
    }
  };

  const handleSaveCustomDestination = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempDestInput.trim()) {
      setCustomDestination(tempDestInput.trim());
      setEditingDestination(false);
    }
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Botão / Badge Principal no Banner */}
      {loading ? (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-muted text-text-muted text-xs border border-border animate-pulse">
          <Loader2 size={13} className="animate-spin text-primary" />
          <span>Consultando médias climáticas para {activeDestination}...</span>
        </div>
      ) : error ? (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-muted text-text-muted text-xs border border-border">
          <Info size={13} className="text-text-muted" />
          <span>Clima não encontrado para este destino.</span>
          <button
            type="button"
            onClick={() => {
              setTempDestInput(activeDestination);
              setEditingDestination(true);
              setOpenDetails(true);
            }}
            className="text-primary hover:underline font-semibold"
          >
            Ajustar cidade
          </button>
        </div>
      ) : climate ? (
        <button
          type="button"
          onClick={() => setOpenDetails(!openDetails)}
          className={`group flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-2xs ${
            climate.classification.badgeColor
          }`}
          title="Clique para ver o detalhamento do clima e o que levar na mala"
        >
          <div className="flex items-center gap-1.5">
            {renderWeatherIcon(climate.classification.icon, 16)}
            <span>{climate.classification.label}</span>
          </div>

          <span className="opacity-40">·</span>

          <span className="font-mono font-bold">
            {climate.tempMinAvg}°C a {climate.tempMaxAvg}°C
          </span>

          <span className="opacity-40 hidden sm:inline-block">·</span>

          <span className="hidden sm:inline-block font-normal text-text-muted">
            📍 {climate.destinationName}
          </span>

          <ChevronDown
            size={13}
            className={`transition-transform duration-200 ${
              openDetails ? "rotate-180" : "opacity-60 group-hover:opacity-100"
            }`}
          />
        </button>
      ) : null}

      {/* Popover Detalhado de Clima */}
      <AnimatePresence>
        {openDetails && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute left-0 top-full mt-2 z-50 w-80 sm:w-96 p-4 rounded-2xl bg-surface border border-border shadow-2xl space-y-3.5 text-text-title"
          >
            {/* Header do Popover */}
            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-border">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <MapPin size={13} className="text-primary" />
                  {editingDestination ? (
                    <form
                      onSubmit={handleSaveCustomDestination}
                      className="flex items-center gap-1.5"
                    >
                      <input
                        type="text"
                        value={tempDestInput}
                        onChange={(e) => setTempDestInput(e.target.value)}
                        placeholder="Nome da cidade..."
                        className="px-2 py-0.5 rounded border border-primary text-xs bg-surface text-text-title focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="px-2 py-0.5 rounded bg-primary text-white text-[11px] font-bold"
                      >
                        OK
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-text-title">
                        {climate?.destinationName || activeDestination}
                        {climate?.state ? `, ${climate.state}` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setTempDestInput(climate?.destinationName || activeDestination);
                          setEditingDestination(true);
                        }}
                        className="text-[11px] text-primary hover:underline ml-1"
                      >
                        (Trocar)
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-text-muted mt-0.5 flex items-center gap-1">
                  <Calendar size={12} />
                  <span>
                    Período {climate?.periodLabel} ·{" "}
                    {climate?.isHistoricalAverage
                      ? "Normal histórica da época"
                      : "Previsão em tempo real"}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpenDetails(false)}
                className="p-1 rounded-lg text-text-muted hover:text-text-title hover:bg-surface-subtle transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {climate && (
              <>
                {/* Resumo Climático com Médias */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-surface-subtle border border-border/80">
                    <span className="text-[11px] font-medium text-text-muted block">
                      Máxima Média
                    </span>
                    <span className="text-xl font-bold text-orange-500 font-mono">
                      {climate.tempMaxAvg}°C
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-subtle border border-border/80">
                    <span className="text-[11px] font-medium text-text-muted block">
                      Mínima Média
                    </span>
                    <span className="text-xl font-bold text-blue-500 font-mono">
                      {climate.tempMinAvg}°C
                    </span>
                  </div>
                </div>

                {/* Síntese e Chuvas */}
                <div className="space-y-1.5 text-xs">
                  <p className="font-medium text-text-body">
                    {climate.classification.summary}
                  </p>

                  <div className="flex items-center gap-2 text-text-muted pt-1">
                    <Umbrella size={14} className="text-primary shrink-0" />
                    <span>
                      {climate.rainAssessment.label} ({climate.rainAssessment.totalMm} mm esperados)
                    </span>
                  </div>
                </div>

                {/* Previsão Dia a Dia */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                    Variação por dia no período
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {climate.daily.map((d, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-surface-subtle text-xs border border-border/50"
                      >
                        <span className="font-bold font-mono text-text-title">
                          {d.date}
                        </span>
                        <span className="text-[11px] text-text-muted truncate max-w-[130px]">
                          {d.description}
                        </span>
                        <span className="font-mono text-xs font-semibold text-text-title shrink-0">
                          <span className="text-blue-500">{d.tempMin}°</span> /{" "}
                          <span className="text-orange-500">{d.tempMax}°</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* O que levar na mala */}
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-primary">
                    <Briefcase size={14} />
                    <span>Dica para os passageiros (Mala):</span>
                  </div>
                  <p className="text-text-body text-[11px] leading-relaxed">
                    {climate.packingTips}
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
