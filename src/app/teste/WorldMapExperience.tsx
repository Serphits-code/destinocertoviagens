"use client";

import { useEffect, useState, useMemo } from "react";
import connectedWorldCountries from "@/data/connectedWorldCountries.json";

interface CountryData {
  id: string;
  name: string;
  isBrazil: boolean;
  threshold: number;
  paths: string[];
}

const worldCountries = connectedWorldCountries as CountryData[];

// Coordenadas precisas do Recife no sistema SVG 1000x500
const RECIFE_X = 403.1;
const RECIFE_Y = 272.4;

// Dimensões do mapa mundi completo (projeção cilíndrica 1000x500)
const FULL_WIDTH = 1000;
const FULL_HEIGHT = 500;
const FULL_CENTER_X = 500;
const FULL_CENTER_Y = 250;

// Zoom inicial próximo no Recife (~14x)
const INITIAL_ZOOM = 14.0;
const INITIAL_WIDTH = FULL_WIDTH / INITIAL_ZOOM;
const INITIAL_HEIGHT = FULL_HEIGHT / INITIAL_ZOOM;

export function WorldMapExperience() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          if (maxScroll > 0) {
            const current = window.scrollY;
            const prog = Math.min(1, Math.max(0, current / maxScroll));
            setScrollProgress(prog);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // --------------------------------------------------------------------------
  // FASE 1: Zoom Out & Construção das Linhas (0.00 a 0.55)
  // --------------------------------------------------------------------------
  const viewBox = useMemo(() => {
    const zoomT = Math.min(1, scrollProgress / 0.55);
    const easedZoom =
      zoomT < 0.5
        ? 4 * zoomT * zoomT * zoomT
        : 1 - Math.pow(-2 * zoomT + 2, 3) / 2;

    const curWidth = INITIAL_WIDTH + (FULL_WIDTH - INITIAL_WIDTH) * easedZoom;
    const curHeight = INITIAL_HEIGHT + (FULL_HEIGHT - INITIAL_HEIGHT) * easedZoom;

    const curCenterX = RECIFE_X + (FULL_CENTER_X - RECIFE_X) * easedZoom;
    const curCenterY = RECIFE_Y + (FULL_CENTER_Y - RECIFE_Y) * easedZoom;

    const x = curCenterX - curWidth / 2;
    const y = curCenterY - curHeight / 2;

    return `${x.toFixed(2)} ${y.toFixed(2)} ${curWidth.toFixed(2)} ${curHeight.toFixed(2)}`;
  }, [scrollProgress]);

  // --------------------------------------------------------------------------
  // FASE 2: Preenchimento Laranja & Transição de Linha (Cinza -> Branco) (0.55 a 0.72)
  // --------------------------------------------------------------------------
  const { fillProgress, strokeColor } = useMemo(() => {
    if (scrollProgress < 0.55) {
      return { fillProgress: 0, strokeColor: "#64748b" };
    }
    const t = Math.min(1, (scrollProgress - 0.55) / 0.17);
    const easedFill = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    // Transição da cor da linha de cinza (#64748b: 100, 116, 139) para branco (#ffffff: 255, 255, 255)
    const r = Math.round(100 + (255 - 100) * easedFill);
    const g = Math.round(116 + (255 - 116) * easedFill);
    const b = Math.round(139 + (255 - 139) * easedFill);

    return {
      fillProgress: easedFill,
      strokeColor: `rgb(${r}, ${g}, ${b})`,
    };
  }, [scrollProgress]);

  // --------------------------------------------------------------------------
  // FASE 3: Esmaecimento do Mapa & Logo Aparece Grande (0.72 a 0.86)
  // FASE 4: Logo Sobe & Texto "A gente te leva..." Anima de Baixo (0.86 a 1.00)
  // --------------------------------------------------------------------------
  const {
    mapOpacity,
    mapScale,
    logoOpacity,
    logoScale,
    logoTranslateY,
    textOpacity,
    textTranslateY,
  } = useMemo(() => {
    if (scrollProgress < 0.72) {
      return {
        mapOpacity: 1,
        mapScale: 1,
        logoOpacity: 0,
        logoScale: 0.65,
        logoTranslateY: 0,
        textOpacity: 0,
        textTranslateY: 45,
      };
    }

    // Progresso de esmaecimento do mapa e surgimento da logo
    const fadeProg = Math.min(1, (scrollProgress - 0.72) / 0.14);
    const easedFade = fadeProg < 0.5 ? 2 * fadeProg * fadeProg : 1 - Math.pow(-2 * fadeProg + 2, 2) / 2;

    const mOpacity = Math.max(0, 1 - easedFade * 1.35);
    const mScale = 1 + easedFade * 0.05;

    // A logo aparece aumentando de tamanho
    const lOpacity = Math.min(1, Math.max(0, (easedFade - 0.08) / 0.85));

    // Fase 4: Logo sobe e texto entra (0.86 a 1.00)
    let lTranslateY = 0;
    let lScale = 0.65 + easedFade * 0.38; // Chega a ~1.03
    let tOpacity = 0;
    let tTranslateY = 45;

    if (scrollProgress >= 0.86) {
      const textProg = Math.min(1, (scrollProgress - 0.86) / 0.14);
      const easedText = textProg < 0.5 ? 2 * textProg * textProg : 1 - Math.pow(-2 * textProg + 2, 2) / 2;

      // A logo se desloca para cima suavemente
      lTranslateY = -38 * easedText;
      lScale = 1.03 - 0.05 * easedText; // Ajuste fino proporcional

      // O texto aparece de baixo para cima
      tOpacity = Math.min(1, easedText * 1.3);
      tTranslateY = 45 * (1 - easedText);
    }

    return {
      mapOpacity: mOpacity,
      mapScale: mScale,
      logoOpacity: lOpacity,
      logoScale: lScale,
      logoTranslateY: lTranslateY,
      textOpacity: tOpacity,
      textTranslateY: tTranslateY,
    };
  }, [scrollProgress]);

  // Opacidade do ponto indicador do Recife no início
  const recifeDotOpacity = useMemo(() => {
    return Math.max(0, 1 - scrollProgress * 7);
  }, [scrollProgress]);

  return (
    <div className="relative min-h-[600vh] bg-white">
      {/* Visualização fixa 100vh em tela cheia, controlada unicamente pelo scroll */}
      <div className="fixed inset-0 w-full h-full bg-white flex items-center justify-center overflow-hidden select-none pointer-events-none">
        
        {/* Camada do Mapa Mundi Vetorial */}
        <div
          className="relative w-full h-full flex items-center justify-center transition-opacity duration-75"
          style={{
            opacity: mapOpacity,
            transform: `scale(${mapScale})`,
          }}
        >
          <svg
            className="w-full h-full max-w-[100vw] max-h-[100vh] p-2 sm:p-6"
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Países com fronteiras coladas (sem espaçamento) */}
            <g id="countries-group">
              {worldCountries.map((country) => {
                const adjustedThreshold = country.threshold * 0.72;
                const isVisible = country.isBrazil || scrollProgress >= adjustedThreshold;
                if (!isVisible) return null;

                // Suavidade de surgimento da linha conforme o scroll avança
                const lineAlpha = country.isBrazil
                  ? 1
                  : Math.min(1, (scrollProgress - adjustedThreshold) / 0.04);

                const fillColor =
                  fillProgress > 0
                    ? `rgba(246, 107, 14, ${fillProgress})`
                    : "transparent";

                return (
                  <g key={country.id} opacity={lineAlpha}>
                    {country.paths.map((d, idx) => (
                      <path
                        key={`${country.id}-${idx}`}
                        d={d}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={fillProgress > 0.8 ? "0.6" : "0.85"}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}
                  </g>
                );
              })}
            </g>

            {/* Marcador Minimalista Inicial no Recife (Ponto de Origem) */}
            {recifeDotOpacity > 0 && (
              <g
                transform={`translate(${RECIFE_X}, ${RECIFE_Y})`}
                opacity={recifeDotOpacity}
              >
                <circle
                  r="4"
                  fill="none"
                  stroke="#111827"
                  strokeWidth="0.8"
                  vectorEffect="non-scaling-stroke"
                  className="animate-ping"
                />
                <circle
                  r="1.8"
                  fill="#f66b0e"
                  stroke="#111827"
                  strokeWidth="0.8"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            )}
          </svg>
        </div>

        {/* Camada da Logo Destino Certo + Slogan Animado */}
        {logoOpacity > 0 && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4"
            style={{
              opacity: logoOpacity,
            }}
          >
            {/* Logo que sobe suavemente quando o texto começa a surgir */}
            <div
              className="flex flex-col items-center transition-transform duration-75"
              style={{
                transform: `translateY(${logoTranslateY}px) scale(${logoScale})`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-color.svg"
                alt="Destino Certo"
                className="w-52 sm:w-68 md:w-84 max-h-[40vh] object-contain drop-shadow-xl"
              />
            </div>

            {/* Texto animado que surge de baixo para cima */}
            {textOpacity > 0 && (
              <div
                className="text-center transition-all duration-75 mt-4 sm:mt-6"
                style={{
                  opacity: textOpacity,
                  transform: `translateY(${textTranslateY}px)`,
                }}
              >
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#112b3c]">
                  A gente te leva pra{" "}
                  <span className="text-[#f66b0e] drop-shadow-sm">qualquer destino!</span>
                </h2>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
