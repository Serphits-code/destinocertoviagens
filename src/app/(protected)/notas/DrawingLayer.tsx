"use client";

import { useState, useRef, useCallback } from "react";
import type { DrawingItem } from "@/lib/actions/notes";

interface DrawingLayerProps {
  isDrawingMode: boolean;
  penColor: string;
  strokeWidth?: number;
  drawings: DrawingItem[];
  onSaveDrawing: (pathData: string, color: string, strokeWidth: number) => void;
  zoomLevel: number;
}

export function DrawingLayer({
  isDrawingMode,
  penColor,
  strokeWidth = 3.5,
  drawings,
  onSaveDrawing,
  zoomLevel,
}: DrawingLayerProps) {
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const isDrawingRef = useRef(false);
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
    if (!isDrawingRef.current || !currentPath) return;
    isDrawingRef.current = false;

    // Salva apenas se o traço tiver um comprimento mínimo
    if (currentPath.includes("L")) {
      onSaveDrawing(currentPath, penColor, strokeWidth);
    }
    setCurrentPath(null);
  };

  return (
    <svg
      ref={svgRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`absolute inset-0 w-full h-full ${
        isDrawingMode
          ? "cursor-crosshair z-20 pointer-events-auto"
          : "pointer-events-none z-10"
      }`}
      style={{ overflow: "visible" }}
    >
      {/* Traços já salvos */}
      {drawings.map((d) => (
        <path
          key={d.id}
          d={d.pathData}
          fill="none"
          stroke={d.color}
          strokeWidth={d.strokeWidth || strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.9 }}
        />
      ))}

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
