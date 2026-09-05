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
  // FASE 1: Zoom Out & Construção das Linhas (0.00 a 0.65)
  // --------------------------------------------------------------------------
  const viewBox = useMemo(() => {
    const zoomT = Math.min(1, scrollProgress / 0.65);
    // Easing suave (easeInOutCubic)
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
  // FASE 2: Preenchimento Laranja & Transição de Linha (Cinza -> Branco) (0.65 a 0.80)
  // --------------------------------------------------------------------------
  const { fillProgress, strokeColor } = useMemo(() => {
    if (scrollProgress < 0.65) {
      return { fillProgress: 0, strokeColor: "#64748b" };
    }
    const t = Math.min(1, (scrollProgress - 0.65) / 0.15);
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
  // FASE 3: Esmaecimento do Mapa & Aparição / Crescimento da Logo (0.80 a 1.00)
  // --------------------------------------------------------------------------
  const { mapOpacity, mapScale, logoOpacity, logoScale } = useMemo(() => {
    if (scrollProgress < 0.8) {
      return {
        mapOpacity: 1,
        mapScale: 1,
        logoOpacity: 0,
        logoScale: 0.65,
      };
    }

    const t = Math.min(1, (scrollProgress - 0.8) / 0.2);
    // Easing suave
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    // O mapa esmaece suavemente até 0
    const mOpacity = Math.max(0, 1 - eased * 1.35);
    const mScale = 1 + eased * 0.05;

    // A logo aparece aumentando o tamanho
    const lOpacity = Math.min(1, Math.max(0, (eased - 0.12) / 0.8));
    const lScale = 0.65 + eased * 0.45; // Cresce de 0.65x até 1.10x

    return {
      mapOpacity: mOpacity,
      mapScale: mScale,
      logoOpacity: lOpacity,
      logoScale: lScale,
    };
  }, [scrollProgress]);

  // Opacidade do ponto indicador do Recife no início
  const recifeDotOpacity = useMemo(() => {
    return Math.max(0, 1 - scrollProgress * 6);
  }, [scrollProgress]);

  return (
    <div className="relative min-h-[500vh] bg-white">
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
                const isVisible = country.isBrazil || scrollProgress >= country.threshold;
                if (!isVisible) return null;

                // Suavidade de surgimento da linha conforme o scroll avança
                const lineAlpha = country.isBrazil
                  ? 1
                  : Math.min(1, (scrollProgress - country.threshold) / 0.04);

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

        {/* Camada da Logo Destino Certo (surge e aumenta de tamanho no final do scroll) */}
        {logoOpacity > 0 && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-75"
            style={{
              opacity: logoOpacity,
              transform: `scale(${logoScale})`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-color.svg"
              alt="Destino Certo"
              className="w-56 sm:w-72 md:w-96 max-h-[50vh] object-contain drop-shadow-xl"
            />
          </div>
        )}
      </div>
    </div>
  );
}
