"use client";

import { useState, useTransition, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  MapPin,
  Calendar,
  Users,
  Sparkles,
  ArrowLeft,
  Loader2,
  Check,
  AlertCircle,
  Compass,
  Route,
} from "lucide-react";
import { createExcursionDirect } from "@/lib/actions/excursions";
import { WeatherClimateBadge } from "@/components/WeatherClimateBadge";
import type { DestinationStop } from "@/components/DestinationMapPicker";

// Carregamento dinâmico do mapa no client-side para Leaflet
const DestinationMapPicker = dynamic(
  () =>
    import("@/components/DestinationMapPicker").then(
      (mod) => mod.DestinationMapPicker
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[380px] rounded-2xl bg-surface-subtle border border-border flex flex-col items-center justify-center text-text-muted gap-2 animate-pulse">
        <Loader2 size={24} className="animate-spin text-primary" />
        <span className="text-xs">Carregando mapa interativo...</span>
      </div>
    ),
  }
);

export default function NovaExcursaoPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Lista de paradas/destinos da excursão
  const [stops, setStops] = useState<DestinationStop[]>([
    {
      id: "stop_1",
      name: "Cachoeirinha, Pernambuco",
      latitude: -8.48733,
      longitude: -36.23719,
    },
  ]);

  const [activeStopIdx, setActiveStopIdx] = useState(0);

  // Estados do formulário
  const [name, setName] = useState("Pacote Cachoeirinha");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [slots, setSlots] = useState<number>(20);
  const [status, setStatus] = useState<"RASCUNHO" | "ATIVA">("RASCUNHO");
  const [error, setError] = useState<string | null>(null);

  // Callback chamado quando a lista de paradas muda no mapa
  const handleStopsChange = useCallback((newStops: DestinationStop[]) => {
    setStops(newStops);

    // Sugere nome do pacote baseado nas cidades se ainda estiver no padrão
    if (newStops.length > 0) {
      const cityNames = newStops.map((s) => s.name.split(",")[0].trim());
      const formattedCities =
        cityNames.length === 1
          ? cityNames[0]
          : cityNames.slice(0, -1).join(", ") + " e " + cityNames[cityNames.length - 1];

      setName((prev) => {
        if (!prev || prev.startsWith("Pacote ")) {
          return `Pacote ${formattedCities}`;
        }
        return prev;
      });
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Informe o nome da excursão.");
      return;
    }

    if (stops.length === 0) {
      setError("Adicione ao menos uma cidade/destino no mapa.");
      return;
    }

    setError(null);

    // Formata o resumo do destino
    const cityNames = stops.map((s) => s.name.split(",")[0].trim());
    const destinationSummary =
      cityNames.length === 1
        ? stops[0].name
        : cityNames.slice(0, -1).join(", ") + " e " + cityNames[cityNames.length - 1];

    startTransition(async () => {
      const res = await createExcursionDirect({
        name,
        destination: destinationSummary,
        destinations: stops.map((s) => ({
          name: s.name,
          latitude: s.latitude,
          longitude: s.longitude,
        })),
        latitude: stops[0]?.latitude,
        longitude: stops[0]?.longitude,
        periodStart: periodStart || undefined,
        periodEnd: periodEnd || undefined,
        slots: Number(slots) || 0,
        status,
      });

      if (res.success && res.excursionId) {
        router.push(`/excursoes/${res.excursionId}`);
      } else {
        setError(res.error || "Erro ao criar excursão.");
      }
    });
  };

  const currentStopForWeather = stops[activeStopIdx] || stops[0];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header com Navegação de Retorno */}
      <div className="flex items-center justify-between">
        <a
          href="/excursoes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Voltar para Excursões</span>
        </a>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold flex items-center gap-1.5">
            <Compass size={13} />
            <span>Novo Pacote / Excursão</span>
          </span>
        </div>
      </div>

      {/* Grid Principal: Formulário + Mapa */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda: Dados da Excursão e Prévia de Clima */}
        <div className="lg:col-span-5 space-y-5">
          <form
            onSubmit={handleSubmit}
            className="p-6 rounded-2xl bg-surface border border-border shadow-shadow-card space-y-4"
          >
            <div>
              <h2 className="text-xl font-bold text-text-title">
                Criar Nova Excursão
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Cadastre o pacote, adicione os destinos no mapa e visualize a previsão
                climática em tempo real.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-status-danger-bg text-status-danger text-xs flex items-center gap-2 border border-status-danger/20">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            {/* Nome da Excursão */}
            <div>
              <label className="block text-xs font-semibold text-text-title mb-1.5">
                Nome do Pacote / Excursão *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Pacote Cachoeirinha e Garanhuns"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-text-title text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs transition-all"
              />
            </div>

            {/* Cidades da Rota */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-text-title flex items-center gap-1">
                  <Route size={14} className="text-primary" />
                  <span>
                    Destinos da Viagem ({stops.length}{" "}
                    {stops.length === 1 ? "cidade" : "cidades"})
                  </span>
                </label>
                <span className="text-[11px] text-text-muted">
                  Adicione paradas no mapa ao lado
                </span>
              </div>

              <div className="space-y-1.5">
                {stops.map((stop, idx) => (
                  <div
                    key={stop.id}
                    onClick={() => setActiveStopIdx(idx)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                      idx === activeStopIdx
                        ? "bg-primary/5 border-primary/40 text-text-title"
                        : "bg-surface-subtle border-border/70 text-text-muted hover:text-text-title"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-semibold truncate">{stop.name}</span>
                    </div>

                    <span className="text-[11px] text-text-muted shrink-0 font-mono">
                      {idx === 0 ? "Principal" : `Parada ${idx + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Período da Viagem */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-title mb-1.5">
                  Data de Início
                </label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-border bg-surface text-text-title text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-title mb-1.5">
                  Data de Término
                </label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-border bg-surface text-text-title text-xs focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Vagas e Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-title mb-1.5">
                  Vagas Contratadas
                </label>
                <div className="relative">
                  <Users
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <input
                    type="number"
                    min={0}
                    value={slots}
                    onChange={(e) => setSlots(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-border bg-surface text-text-title text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-title mb-1.5">
                  Status Inicial
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-title text-xs focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="RASCUNHO">Rascunho</option>
                  <option value="ATIVA">Ativa</option>
                </select>
              </div>
            </div>

            {/* Seção de Clima em Tempo Real */}
            <div className="pt-2 border-t border-border/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-title flex items-center gap-1.5">
                  <Sparkles size={14} className="text-primary" />
                  <span>Clima na Época da Viagem</span>
                </span>

                <span className="text-[11px] text-text-muted">
                  {stops.length > 1
                    ? `Parada ${activeStopIdx + 1} de ${stops.length}`
                    : "Coordenadas do pin"}
                </span>
              </div>

              {/* Se houver múltiplas cidades, exibe alternador de clima por cidade */}
              {stops.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {stops.map((stop, idx) => (
                    <button
                      key={stop.id}
                      type="button"
                      onClick={() => setActiveStopIdx(idx)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                        idx === activeStopIdx
                          ? "bg-primary text-white shadow-2xs"
                          : "bg-surface-muted text-text-muted hover:text-text-title"
                      }`}
                    >
                      {idx + 1}. {stop.name.split(",")[0]}
                    </button>
                  ))}
                </div>
              )}

              {periodStart && periodEnd && currentStopForWeather ? (
                <div className="p-3 rounded-xl bg-surface-subtle border border-border/80">
                  <WeatherClimateBadge
                    packageName={currentStopForWeather.name}
                    periodStart={periodStart}
                    periodEnd={periodEnd}
                    fallbackCity={currentStopForWeather.name}
                    latitude={currentStopForWeather.latitude}
                    longitude={currentStopForWeather.longitude}
                  />
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-surface-subtle/60 border border-dashed border-border text-center text-xs text-text-muted">
                  Defina as datas da viagem para consultar as temperaturas e condições
                  climáticas de cada cidade da rota.
                </div>
              )}
            </div>

            {/* Botão de Criação */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-strong transition-all shadow-md cursor-pointer disabled:opacity-50 mt-2"
            >
              {isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
              <span>Criar Excursão e Abrir Pacote</span>
            </button>
          </form>
        </div>

        {/* Coluna Direita: Mapa Interativo com Múltiplas Paradas */}
        <div className="lg:col-span-7 h-[620px] p-5 rounded-2xl bg-surface border border-border shadow-shadow-card flex flex-col space-y-3">
          <div>
            <h3 className="text-base font-bold text-text-title flex items-center gap-2">
              <MapPin size={18} className="text-primary" />
              <span>Mapa do Roteiro ({stops.length} cidades / paradas)</span>
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Pesquise cidades, clique em <strong>+ Adicionar Cidade / Parada</strong> para incluir
              novos destinos na rota e arraste os pinos para os pontos exatos.
            </p>
          </div>

          <div className="flex-1 min-h-0">
            <DestinationMapPicker
              initialStops={stops}
              activeStopIndex={activeStopIdx}
              onActiveStopChange={(idx) => setActiveStopIdx(idx)}
              onStopsChange={handleStopsChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
