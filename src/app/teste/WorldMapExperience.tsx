"use client";

import { useEffect, useState, useMemo } from "react";
import worldCountriesData from "@/data/worldCountries.json";

interface CountryData {
  id: string;
  name: string;
  region: string;
  threshold: number;
  paths: string[];
}

const worldCountries = worldCountriesData as CountryData[];

// Coordenadas precisas do Recife no sistema SVG do mapa
const RECIFE_X = 322.47;
const RECIFE_Y = 546.55;

// Dimensões do mapa mundi completo
const FULL_VIEW_X = 30.767;
const FULL_VIEW_Y = 241.591;
const FULL_WIDTH = 784.077;
const FULL_HEIGHT = 458.627;

const FULL_CENTER_X = FULL_VIEW_X + FULL_WIDTH / 2;
const FULL_CENTER_Y = FULL_VIEW_Y + FULL_HEIGHT / 2;

// Zoom inicial próximo em Recife (~16x)
const INITIAL_ZOOM = 16.0;
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

  // Cálculo da ViewBox dinâmica com interpolação não-linear suave
  // O zoom out conclui em 78% do scroll, deixando os últimos 22% para a transição do fill laranja
  const viewBox = useMemo(() => {
    const zoomT = Math.min(1, scrollProgress / 0.78);
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

  // Transição do fill laranja (0.78 -> 1.00)
  const fillProgress = useMemo(() => {
    if (scrollProgress < 0.78) return 0;
    const t = Math.min(1, (scrollProgress - 0.78) / 0.22);
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }, [scrollProgress]);

  // Opacidade do ponto indicador do Recife (aparece no início e desaparece suavemente no zoom out)
  const recifeDotOpacity = useMemo(() => {
    return Math.max(0, 1 - scrollProgress * 5);
  }, [scrollProgress]);

  return (
    <div className="relative min-h-[450vh] bg-white">
      {/* Visualização fixa 100vh em tela cheia sem nenhuma interferência visual */}
      <div className="fixed inset-0 w-full h-full bg-white flex items-center justify-center overflow-hidden select-none pointer-events-none">
        <svg
          className="w-full h-full max-w-[100vw] max-h-[100vh] p-4 sm:p-8"
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Camada de Países */}
          <g id="world-layer">
            {worldCountries.map((country) => {
              const isBrazil = country.id === "br";
              const isVisible = isBrazil || scrollProgress >= country.threshold;

              if (!isVisible) return null;

              // Suavidade de surgimento da linha conforme o scroll avança
              const lineAlpha = isBrazil
                ? 1
                : Math.min(1, (scrollProgress - country.threshold) / 0.04);

              // Cor da linha: transita de preto/charcoal para laranja no preenchimento final
              let strokeColor = "#111827";
              if (fillProgress > 0) {
                // Interpolação suave do preto para o laranja (#F66B0E)
                const r = Math.round(17 + (246 - 17) * fillProgress);
                const g = Math.round(24 + (107 - 24) * fillProgress);
                const b = Math.round(39 + (14 - 39) * fillProgress);
                strokeColor = `rgb(${r}, ${g}, ${b})`;
              }

              // Cor de preenchimento: transparente até ~78%, depois preenche com laranja vibrante
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
                      strokeWidth={fillProgress > 0.8 ? "0.6" : "0.9"}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>
              );
            })}
          </g>

          {/* Marcador Minimalista Inicial no Recife (Ponto de Partida) */}
          {recifeDotOpacity > 0 && (
            <g
              transform={`translate(${RECIFE_X}, ${RECIFE_Y})`}
              opacity={recifeDotOpacity}
            >
              <circle
                r="3.5"
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
    </div>
  );
}
