"use client";

import { useState, useRef, useCallback } from "react";
import type { DrawingItem } from "@/lib/actions/notes";

interface DrawingLayerProps {
  isDrawingMode: boolean;
  isEraserMode?: boolean;
  penColor: string;
  strokeWidth?: number;
  drawings: DrawingItem[];
  onSaveDrawing: (pathData: string, color: string, strokeWidth: number) => void;
  onDeleteDrawing?: (id: string) => void;
  zoomLevel: number;
}

const ERASER_CURSOR = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='white' stroke='%23ef4444' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21'/><path d='M22 21H7'/><path d='m5 11 9 9'/></svg>") 4 20, crosshair`;

export function DrawingLayer({
  isDrawingMode,
  isEraserMode = false,
  penColor,
  strokeWidth = 3.5,
  drawings,
  onSaveDrawing,
  onDeleteDrawing,
  zoomLevel,
}: DrawingLayerProps) {
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [hoveredDrawingId, setHoveredDrawingId] = useState<string | null>(null);

  const isDrawingRef = useRef(false);
  const isPointerDownRef = useRef(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const getCanvasCoords = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const rect = svgRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoomLevel;
      const y = (e.clientY - rect.top) / zoomLevel;
      return { x: Math.round(x), y: Math.round(y) };
    },
    [zoomLevel]
  );

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    isPointerDownRef.current = true;

    if (!isDrawingMode) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);

    const { x, y } = getCanvasCoords(e);
    isDrawingRef.current = true;
    setCurrentPath(`M ${x} ${y}`);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawingRef.current || !currentPath) return;
    e.preventDefault();

    const { x, y } = getCanvasCoords(e);
    setCurrentPath((prev) => `${prev} L ${x} ${y}`);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    isPointerDownRef.current = false;

    if (!isDrawingRef.current || !currentPath) return;
    isDrawingRef.current = false;

    // Salva apenas se o traço tiver um comprimento mínimo
    if (currentPath.includes("L")) {
      onSaveDrawing(currentPath, penColor, strokeWidth);
    }
    setCurrentPath(null);
  };

  const isInteractive = isDrawingMode || isEraserMode;

  return (
    <svg
      ref={svgRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`absolute inset-0 w-full h-full ${
        isInteractive ? "z-20 pointer-events-auto" : "pointer-events-none z-10"
      }`}
      style={{
        overflow: "visible",
        cursor: isEraserMode ? ERASER_CURSOR : isDrawingMode ? "crosshair" : undefined,
      }}
    >
      {/* Traços já salvos no mural */}
      {drawings.map((d) => {
        const isHoveredByEraser = isEraserMode && hoveredDrawingId === d.id;

        return (
          <g key={d.id}>
            {/* Traço visual */}
            <path
              d={d.pathData}
              fill="none"
              stroke={isHoveredByEraser ? "#EF4444" : d.color}
              strokeWidth={d.strokeWidth || strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={isHoveredByEraser ? "6 4" : undefined}
              style={{
                opacity: isHoveredByEraser ? 0.6 : 0.9,
                transition: "stroke 0.15s, opacity 0.15s",
              }}
            />

            {/* Hit-box invisível ampliada para facilitar apagar com a borracha */}
            {isEraserMode && (
              <path
                d={d.pathData}
                fill="none"
                stroke="transparent"
                strokeWidth={Math.max(24, (d.strokeWidth || strokeWidth) * 5)}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ pointerEvents: "stroke", cursor: ERASER_CURSOR }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onDeleteDrawing?.(d.id);
                }}
                onPointerEnter={() => {
                  setHoveredDrawingId(d.id);
                  if (isPointerDownRef.current) {
                    onDeleteDrawing?.(d.id);
                  }
                }}
                onPointerLeave={() => {
                  setHoveredDrawingId(null);
                }}
              />
            )}
          </g>
        );
      })}

      {/* Traço atual em desenho */}
      {currentPath && (
        <path
          d={currentPath}
          fill="none"
          stroke={penColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.95 }}
        />
      )}
    </svg>
  );
}
