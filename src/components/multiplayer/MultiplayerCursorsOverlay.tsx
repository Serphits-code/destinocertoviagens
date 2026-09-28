// src/components/multiplayer/MultiplayerCursorsOverlay.tsx
"use client";

import { useEffect, useState } from "react";
import type { PeerPresence } from "@/lib/multiplayer/types";

interface MultiplayerCursorsOverlayProps {
  peers: PeerPresence[];
}

export function MultiplayerCursorsOverlay({ peers }: MultiplayerCursorsOverlayProps) {
  // Timer de refresh a cada 1s para atualizar o estado de inatividade (idle)
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-50 overflow-hidden select-none"
      aria-hidden="true"
    >
      {peers.map((peer) => {
        const cursor = peer.cursor;
        if (!cursor) return null;

        // Se o cursor estiver fora dos limites (ex: -100)
        if (cursor.x < 0 || cursor.y < 0) return null;

        // Se inativo por mais de 3.5 segundos, fade out
        const isIdle = now - cursor.lastUpdate > 3500;
        const color = peer.user.color;

        return (
          <div
            key={peer.user.id}
            className="absolute will-change-[left,top]"
            style={{
              left: `${cursor.x}%`,
              top: `${cursor.y}%`,
              transition: "left 80ms cubic-bezier(0.16, 1, 0.3, 1), top 80ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms ease-out",
              opacity: isIdle ? 0 : 1,
            }}
          >
            {/* Seta do Cursor Estilo Figma com Sombra Realista */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="drop-shadow-[0_2px_5px_rgba(0,0,0,0.35)]"
              style={{ color: color.bg }}
            >
              <path
                d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                fill="currentColor"
                stroke="#FFFFFF"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>

            {/* Tag Flutuante com o Nome do Usuário */}
            <div
              className="absolute left-3.5 top-3.5 px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap shadow-lg flex items-center gap-1.5"
              style={{
                backgroundColor: color.bg,
                color: color.text,
              }}
            >
              <span>{peer.user.name}</span>

              {peer.focus?.elementLabel && (
                <span className="text-[9px] opacity-80 font-normal border-l border-white/30 pl-1">
                  {peer.focus.elementLabel.slice(0, 18)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
