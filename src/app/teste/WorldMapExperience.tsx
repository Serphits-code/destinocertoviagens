"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  Plane,
  Globe2,
  Maximize2,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  MapPin,
  ChevronRight,
  Clock,
  Navigation,
  Eye,
  Layers,
  Info,
  X,
} from "lucide-react";
import {
  worldCountries,
  DESTINATIONS,
  FLIGHT_ROUTES,
  STORY_MILESTONES,
  type DestinationPoint,
  type FlightRoute,
} from "@/data/worldMapData";

// Coordenadas exatas do Recife no sistema SVG do mapa
const RECIFE_X = 322.47;
const RECIFE_Y = 546.55;

// Dimensões do mapa mundi completo
const FULL_VIEW_X = 30.767;
const FULL_VIEW_Y = 241.591;
const FULL_WIDTH = 784.077;
const FULL_HEIGHT = 458.627;

const FULL_CENTER_X = FULL_VIEW_X + FULL_WIDTH / 2;
const FULL_CENTER_Y = FULL_VIEW_Y + FULL_HEIGHT / 2;

// Zoom inicial focado no Recife (aprox. 14x mais próximo)
const INITIAL_ZOOM = 14.0;
const INITIAL_WIDTH = FULL_WIDTH / INITIAL_ZOOM;
const INITIAL_HEIGHT = FULL_HEIGHT / INITIAL_ZOOM;

// Linhas de latitude para o grid cartográfico
const GRATICULE_LATITUDES = [
  { y: 310, label: "66.5° N • Círculo Polar Ártico" },
  { y: 390, label: "40.0° N • Hemisfério Norte" },
  { y: 445, label: "23.5° N • Trópico de Câncer" },
  { y: 530, label: "00.0° • Linha do Equador", isEquator: true },
  { y: 615, label: "23.5° S • Trópico de Capricórnio" },
  { y: 675, label: "40.0° S • Hemisfério Sul" },
];

// Linhas de longitude para o grid cartográfico
const GRATICULE_LONGITUDES = [
  { x: 130, label: "120° W" },
  { x: 225, label: "60° W" },
  { x: 322, label: "35° W • Meridiano de Recife", isOrigin: true },
  { x: 423, label: "00° • Meridiano de Greenwich", isGreenwich: true },
  { x: 520, label: "60° E" },
  { x: 620, label: "120° E" },
  { x: 720, label: "180° E" },
];

export function WorldMapExperience() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showGraticule, setShowGraticule] = useState(true);
  const [showPins, setShowPins] = useState(true);
  const [selectedDestination, setSelectedDestination] = useState<DestinationPoint | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  // Monitora o scroll natural na página (min-h-[500vh])
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll <= 0) return;
      const current = window.scrollY;
      const prog = Math.min(1, Math.max(0, current / totalScroll));
      setScrollProgress(prog);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Animação de Reprodução Automática (Voo Panorâmico)
  useEffect(() => {
    if (!isPlaying) return;

    const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
    let animationFrameId: number;
    const duration = 16000; // 16 segundos para um voo completo super suave
    let startTime: number | null = null;
    const startScroll = window.scrollY;
    const remainingScroll = totalScroll - startScroll;

    // Se já estiver no fim, reinicia do topo
    if (window.scrollY >= totalScroll - 10) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progressFraction = Math.min(1, elapsed / duration);

      // Curva suave de aceleração e desaceleração (easeInOutCubic)
      const eased =
        progressFraction < 0.5
          ? 4 * progressFraction * progressFraction * progressFraction
          : 1 - Math.pow(-2 * progressFraction + 2, 3) / 2;

      window.scrollTo({
        top: startScroll + remainingScroll * eased,
        behavior: "instant",
      });

      if (progressFraction < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setIsPlaying(false);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying]);

  // Função para saltar suavemente para um marco específico
  const jumpToProgress = useCallback((targetProgress: number) => {
    setIsPlaying(false);
    const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({
      top: totalScroll * targetProgress,
      behavior: "smooth",
    });
  }, []);

  // Cálculo da ViewBox dinâmica com interpolação suave não-linear
  const { viewBox, currentZoom, currentCenter } = useMemo(() => {
    // Easing cúbico para acelerar a expansão no início e desacelerar ao contemplar o globo
    const t = scrollProgress;
    const eased =
      t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const curWidth = INITIAL_WIDTH + (FULL_WIDTH - INITIAL_WIDTH) * eased;
    const curHeight = INITIAL_HEIGHT + (FULL_HEIGHT - INITIAL_HEIGHT) * eased;

    const curCenterX = RECIFE_X + (FULL_CENTER_X - RECIFE_X) * eased;
    const curCenterY = RECIFE_Y + (FULL_CENTER_Y - RECIFE_Y) * eased;

    const x = curCenterX - curWidth / 2;
    const y = curCenterY - curHeight / 2;

    const zoom = (FULL_WIDTH / curWidth).toFixed(1);

    return {
      viewBox: `${x.toFixed(2)} ${y.toFixed(2)} ${curWidth.toFixed(2)} ${curHeight.toFixed(2)}`,
      currentZoom: zoom,
      currentCenter: { x: curCenterX, y: curCenterY },
    };
  }, [scrollProgress]);

  // Determina o marco atual da narrativa
  const activeMilestone = useMemo(() => {
    return (
      STORY_MILESTONES.find(
        (m) => scrollProgress >= m.range[0] && scrollProgress <= m.range[1]
      ) || STORY_MILESTONES[STORY_MILESTONES.length - 1]
    );
  }, [scrollProgress]);

  // Contadores dinâmicos
  const activeDestinationsCount = useMemo(() => {
    return DESTINATIONS.filter((d) => scrollProgress >= d.threshold).length;
  }, [scrollProgress]);

  const activeCountriesCount = useMemo(() => {
    return worldCountries.filter((c) => scrollProgress >= c.threshold).length;
  }, [scrollProgress]);

  return (
    <div ref={containerRef} className="relative min-h-[500vh] bg-[#070A12] text-slate-100 font-sans selection:bg-orange-500/30">
      {/* ========================================================================= */}
      {/* VIEWPORT FIXA (STICKY 100VH) COM O MAPA MUNDI CONSTRUTIVO               */}
      {/* ========================================================================= */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between select-none">
        
        {/* Camada de Fundo Estelar & Atmosfera Flat */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0f172a] via-[#090d16] to-[#04060a] opacity-90" />
        
        {/* Vinheta atmosférica nos cantos para foco total no centro */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,rgba(4,6,10,0.85)_100%)]" />

        {/* ===================================================================== */}
        {/* BARRA SUPERIOR (HEADER HUD)                                           */}
        {/* ===================================================================== */}
        <header className="relative z-30 flex items-center justify-between px-4 sm:px-8 py-4 backdrop-blur-md bg-[#0b0f19]/70 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 shadow-[0_0_15px_rgba(246,107,14,0.25)]">
              <Compass className="w-5 h-5 animate-[spin_12s_linear_infinite]" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  Destino Certo Viagens
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    Mundo Flat 360°
                  </span>
                </h1>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">
                De Recife para os 6 Continentes • Zoom Construtivo ao Rolar
              </p>
            </div>
          </div>

          {/* Telemetria de Zoom & Controles no Header */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Pill de Zoom Atual */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">Zoom:</span>
              <span className="font-mono font-bold text-cyan-400">{currentZoom}x</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Países:</span>
              <span className="font-mono font-bold text-emerald-400">{activeCountriesCount}/180</span>
            </div>

            {/* Alternar Rotas */}
            <button
              type="button"
              onClick={() => setShowRoutes(!showRoutes)}
              className={`p-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                showRoutes
                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                  : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
              title="Alternar visualização das rotas aéreas"
            >
              <Plane className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Rotas</span>
            </button>

            {/* Alternar Coordenadas/Grade */}
            <button
              type="button"
              onClick={() => setShowGraticule(!showGraticule)}
              className={`p-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                showGraticule
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300"
                  : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
              title="Alternar grade de coordenadas"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grade</span>
            </button>

            {/* Botão Auto-Play / Voo Automático */}
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold text-xs shadow-lg transition-all cursor-pointer ${
                isPlaying
                  ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/30 animate-pulse"
                  : "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/30"
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pausar</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Voo Automático</span>
                </>
              )}
            </button>

            {/* Botão Reset para Recife */}
            <button
              type="button"
              onClick={() => jumpToProgress(0)}
              className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Voltar o foco para Recife"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* ===================================================================== */}
        {/* O CANVAS SVG DO MAPA MUNDI                                            */}
        {/* ===================================================================== */}
        <div className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center">
          <svg
            className="w-full h-full transition-all duration-75 ease-out"
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Gradiente do Brasil (Origem) */}
              <linearGradient id="brazilGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f66b0e" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#b45309" stopOpacity="0.30" />
              </linearGradient>

              {/* Gradiente das Rotas Aéreas saindo de Recife */}
              <linearGradient id="routeGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f66b0e" />
                <stop offset="60%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>

              {/* Filtro Glow Neon para rotas e radar */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="glowHeavy" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* ------------------------------------------------------------- */}
            {/* 1. GRADE CARTOGRÁFICA / GRATICULE                              */}
            {/* ------------------------------------------------------------- */}
            {showGraticule && (
              <g className="graticule transition-opacity duration-300">
                {/* Linhas de Latitude */}
                {GRATICULE_LATITUDES.map((lat, idx) => (
                  <g key={`lat-${idx}`}>
                    <line
                      x1={FULL_VIEW_X}
                      y1={lat.y}
                      x2={FULL_VIEW_X + FULL_WIDTH}
                      y2={lat.y}
                      stroke={lat.isEquator ? "#f66b0e" : "rgba(255, 255, 255, 0.08)"}
                      strokeWidth={lat.isEquator ? "0.6" : "0.3"}
                      strokeDasharray={lat.isEquator ? "4 2" : "2 2"}
                      opacity={Math.min(0.7, Math.max(0.1, (scrollProgress - 0.1) * 0.9))}
                    />
                  </g>
                ))}

                {/* Linhas de Longitude */}
                {GRATICULE_LONGITUDES.map((lon, idx) => (
                  <g key={`lon-${idx}`}>
                    <line
                      x1={lon.x}
                      y1={FULL_VIEW_Y}
                      x2={lon.x}
                      y2={FULL_VIEW_Y + FULL_HEIGHT}
                      stroke={
                        lon.isOrigin
                          ? "rgba(246, 107, 14, 0.4)"
                          : lon.isGreenwich
                          ? "rgba(56, 189, 248, 0.35)"
                          : "rgba(255, 255, 255, 0.08)"
                      }
                      strokeWidth={lon.isOrigin || lon.isGreenwich ? "0.6" : "0.3"}
                      strokeDasharray="2 2"
                      opacity={Math.min(0.7, Math.max(0.1, (scrollProgress - 0.1) * 0.9))}
                    />
                  </g>
                ))}
              </g>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 2. PAÍSES E CONTINENTES (CONSTRUÇÃO PROGRESSIVA)               */}
            {/* ------------------------------------------------------------- */}
            <g id="countries-layer">
              {worldCountries.map((country) => {
                const isBrazil = country.id === "br";
                const isUnlocked = scrollProgress >= country.threshold;
                const isHovered = hoveredCountry === country.id;

                // Fração de construção do país (0 a 1 em um intervalo de 10% do scroll)
                const buildPhase = Math.min(
                  1,
                  Math.max(0, (scrollProgress - country.threshold) / 0.1)
                );

                // Estilos visuais flat conforme estado de construção
                let fillColor = "transparent";
                let strokeColor = "rgba(255, 255, 255, 0.04)";
                let strokeWidth = "0.2";
                let strokeDasharray = "none";
                let opacity = 0.3;

                if (isBrazil) {
                  // Brasil sempre visível e destacado como berço
                  fillColor = isHovered ? "rgba(246, 107, 14, 0.6)" : "url(#brazilGrad)";
                  strokeColor = "#f66b0e";
                  strokeWidth = "0.7";
                  opacity = 1;
                } else if (isUnlocked) {
                  // País em processo de construção ou finalizado
                  if (buildPhase < 1) {
                    // Efeito de "traçado sendo desenhado"
                    strokeColor = "#38bdf8";
                    strokeWidth = "0.5";
                    fillColor = `rgba(30, 41, 59, ${buildPhase * 0.7})`;
                    opacity = 0.4 + buildPhase * 0.6;
                  } else {
                    // País construído com flat design sofisticado
                    fillColor = isHovered
                      ? "rgba(56, 189, 248, 0.35)"
                      : country.region === "south_america"
                      ? "#1e293b"
                      : country.region === "americas"
                      ? "#1a2436"
                      : country.region === "europe_africa"
                      ? "#162030"
                      : "#131b29";
                    strokeColor = isHovered
                      ? "#38bdf8"
                      : "rgba(148, 163, 184, 0.35)";
                    strokeWidth = "0.35";
                    opacity = 0.95;
                  }
                }

                return (
                  <g
                    key={country.id}
                    id={`country-${country.id}`}
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setHoveredCountry(country.id)}
                    onMouseLeave={() => setHoveredCountry(null)}
                  >
                    {country.paths.map((d, pIdx) => (
                      <path
                        key={`path-${country.id}-${pIdx}`}
                        d={d}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={strokeDasharray}
                        opacity={opacity}
                        className="transition-colors duration-200"
                      />
                    ))}
                  </g>
                );
              })}
            </g>

            {/* ------------------------------------------------------------- */}
            {/* 3. ROTAS AÉREAS TRANSATLÂNTICAS E NACIONAIS                   */}
            {/* ------------------------------------------------------------- */}
            {showRoutes && (
              <g id="flight-routes-layer">
                {FLIGHT_ROUTES.map((route) => {
                  const isRouteActive = scrollProgress >= route.threshold;
                  if (!isRouteActive) return null;

                  // Progresso de desenho da rota específica
                  const routeProgress = Math.min(
                    1,
                    Math.max(0, (scrollProgress - route.threshold) / 0.08)
                  );

                  return (
                    <g key={route.id} className="route-item">
                      {/* Linha de Traçado da Rota */}
                      <path
                        d={route.path}
                        fill="none"
                        stroke="url(#routeGradient)"
                        strokeWidth="0.6"
                        strokeDasharray="1000"
                        strokeDashoffset={1000 * (1 - routeProgress)}
                        filter="url(#glow)"
                        opacity={0.85}
                      />

                      {/* Partícula / Avião viajando na rota quando completa */}
                      {routeProgress >= 1 && (
                        <circle
                          r="1.2"
                          fill="#ffffff"
                          filter="url(#glowHeavy)"
                          className="animate-pulse"
                        >
                          <animateMotion
                            path={route.path}
                            dur={`${Math.max(3, 7 - scrollProgress * 3)}s`}
                            repeatCount="indefinite"
                          />
                        </circle>
                      )}
                    </g>
                  );
                })}
              </g>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 4. BEACON & RADAR NO RECIFE (MARCO ZERO)                       */}
            {/* ------------------------------------------------------------- */}
            <g id="recife-beacon" transform={`translate(${RECIFE_X}, ${RECIFE_Y})`}>
              {/* Ondas concêntricas de sonar / radar pulsante */}
              <circle
                r="6"
                fill="none"
                stroke="#f66b0e"
                strokeWidth="0.4"
                opacity="0.8"
                className="animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"
              />
              <circle
                r="12"
                fill="none"
                stroke="#f66b0e"
                strokeWidth="0.25"
                opacity="0.5"
                className="animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite_1s]"
              />
              <circle
                r="20"
                fill="none"
                stroke="#f66b0e"
                strokeWidth="0.15"
                opacity="0.3"
                className="animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite_2s]"
              />

              {/* Ponto Central de Origem */}
              <circle r="2.2" fill="#f66b0e" filter="url(#glow)" />
              <circle r="1.1" fill="#ffffff" />

              {/* Rótulo de Recife sempre visível */}
              <g transform="translate(4, -3)">
                <rect
                  x="-1"
                  y="-5.5"
                  width="38"
                  height="7"
                  rx="1.5"
                  fill="rgba(15, 23, 42, 0.85)"
                  stroke="#f66b0e"
                  strokeWidth="0.3"
                />
                <text
                  x="1"
                  y="-1"
                  fill="#ffffff"
                  fontSize="3.2"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  RECIFE (ORIGEM)
                </text>
              </g>
            </g>

            {/* ------------------------------------------------------------- */}
            {/* 5. DESTINOS & PINS AO REDOR DO GLOBO                          */}
            {/* ------------------------------------------------------------- */}
            {showPins && (
              <g id="destinations-layer">
                {DESTINATIONS.filter((d) => d.id !== "recife").map((dest) => {
                  const isVisible = scrollProgress >= dest.threshold;
                  if (!isVisible) return null;

                  const isSelected = selectedDestination?.id === dest.id;

                  return (
                    <g
                      key={dest.id}
                      id={`pin-${dest.id}`}
                      transform={`translate(${dest.x}, ${dest.y})`}
                      className="cursor-pointer group"
                      onClick={() => setSelectedDestination(dest)}
                    >
                      {/* Halo do Destino */}
                      <circle
                        r="3.5"
                        fill="rgba(6, 182, 212, 0.18)"
                        stroke="#06b6d4"
                        strokeWidth="0.25"
                        className="group-hover:scale-125 transition-transform"
                      />
                      <circle
                        r="1.4"
                        fill={isSelected ? "#f66b0e" : "#38bdf8"}
                        filter="url(#glow)"
                      />

                      {/* Tag do Nome e Código */}
                      <g transform="translate(3, -2)">
                        <rect
                          x="0"
                          y="-4"
                          width={dest.code.length * 2.8 + 4}
                          height="5.2"
                          rx="1"
                          fill="rgba(11, 15, 25, 0.8)"
                          stroke="rgba(56, 189, 248, 0.4)"
                          strokeWidth="0.2"
                        />
                        <text
                          x="1.5"
                          y="-0.4"
                          fill="#e2e8f0"
                          fontSize="2.4"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          {dest.code}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            )}
          </svg>
        </div>

        {/* ===================================================================== */}
        {/* PAINEL INFERIOR: HISTÓRIA, CONTROLE DE ETAPAS & SCRUBBER              */}
        {/* ===================================================================== */}
        <footer className="relative z-30 px-4 sm:px-8 pb-5 pt-2 bg-gradient-to-t from-[#05070d] via-[#090d16]/95 to-transparent">
          {/* Card Principal da Narrativa */}
          <div className="max-w-5xl mx-auto rounded-2xl backdrop-blur-xl bg-[#0d1322]/85 border border-slate-800 p-4 sm:p-5 shadow-2xl">
            
            {/* Linha Superior do Card: Badge + Abas de Etapa */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold tracking-wider px-2.5 py-1 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase">
                  {activeMilestone.badge}
                </span>
                <span className="text-xs text-slate-400">
                  Progresso: <strong className="text-white font-mono">{Math.round(scrollProgress * 100)}%</strong>
                </span>
              </div>

              {/* Botões Rápidos para Saltos Diretos */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {[
                  { label: "1. Recife", prog: 0.0 },
                  { label: "2. América do Sul", prog: 0.32 },
                  { label: "3. Transatlântico", prog: 0.58 },
                  { label: "4. Mundo Global", prog: 1.0 },
                ].map((step, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => jumpToProgress(step.prog)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                      Math.abs(scrollProgress - step.prog) < 0.18
                        ? "bg-orange-500 text-white shadow-md shadow-orange-500/25 font-bold"
                        : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
                    }`}
                  >
                    {step.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Descrição da Etapa e Telemetria em 2 Colunas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3.5 items-center">
              <div className="md:col-span-2 space-y-1">
                <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                  {activeMilestone.title}
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeMilestone.description}
                </p>
              </div>

              {/* Métricas e Telemetria */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block">Altitude / Visão</span>
                  <span className="font-semibold text-cyan-400 truncate block">
                    {activeMilestone.telemetry.altitude}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block">Coordenadas</span>
                  <span className="font-mono text-slate-300 truncate block">
                    {activeMilestone.telemetry.coordenadas}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block">Cobertura</span>
                  <span className="font-semibold text-white truncate block">
                    {activeMilestone.telemetry.cobertura}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block">Destinos Ativos</span>
                  <span className="font-semibold text-orange-400 truncate block">
                    {activeDestinationsCount} Cidades Ativas
                  </span>
                </div>
              </div>
            </div>

            {/* Linha do Tempo / Scrubber Slider Interativo */}
            <div className="pt-4">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                <span className="flex items-center gap-1 font-semibold text-orange-400">
                  <MapPin className="w-3 h-3" /> Recife (0 km)
                </span>
                <span className="text-slate-400 italic">
                  Role a página ou arraste a barra para navegar pelo mapa
                </span>
                <span className="flex items-center gap-1 font-semibold text-cyan-400">
                  <Globe2 className="w-3 h-3" /> Mundo Completo (40.000 km)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.002"
                value={scrollProgress}
                onChange={(e) => jumpToProgress(parseFloat(e.target.value))}
                className="w-full h-2 rounded-lg bg-slate-800 appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400 transition-all"
              />
            </div>
          </div>
        </footer>

        {/* ===================================================================== */}
        {/* MODAL / GAVETA FLUTUANTE DE DETALHES DO DESTINO SELECIONADO          */}
        {/* ===================================================================== */}
        <AnimatePresence>
          {selectedDestination && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-4 sm:right-8 top-20 z-40 w-80 sm:w-96 rounded-2xl backdrop-blur-2xl bg-[#0f172a]/95 border border-cyan-500/30 p-5 shadow-2xl shadow-cyan-950/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{selectedDestination.flag}</span>
                  <div>
                    <h3 className="font-extrabold text-base text-white">
                      {selectedDestination.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {selectedDestination.city}, {selectedDestination.country} • Código:{" "}
                      <strong className="text-cyan-400">{selectedDestination.code}</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDestination(null)}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Informações de Voo saindo do Recife */}
              <div className="grid grid-cols-2 gap-2 mt-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block flex items-center gap-1">
                    <Clock className="w-3 h-3 text-orange-400" /> Tempo de Voo
                  </span>
                  <span className="font-bold text-white block mt-0.5">
                    {selectedDestination.flightTimeFromRecife}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-cyan-400" /> Distância de Recife
                  </span>
                  <span className="font-bold text-white block mt-0.5">
                    {selectedDestination.distanceKm}
                  </span>
                </div>
              </div>

              {/* Destaques do Destino */}
              <div className="mt-4">
                <span className="text-xs font-semibold text-slate-300 block mb-2">
                  Principais Experiências Destino Certo:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDestination.highlights.map((h, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800/90 text-slate-200 border border-slate-700 flex items-center gap-1"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-orange-400" />
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">Origem da Rota:</span>
                <span className="font-bold text-orange-400">Recife (REC)</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
