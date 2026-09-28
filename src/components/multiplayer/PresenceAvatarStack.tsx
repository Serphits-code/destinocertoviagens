// src/components/multiplayer/PresenceAvatarStack.tsx
"use client";

import type { PeerPresence, MultiplayerUser } from "@/lib/multiplayer/types";

interface PresenceAvatarStackProps {
  peers: PeerPresence[];
  currentUser?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function PresenceAvatarStack({
  peers,
  currentUser,
}: PresenceAvatarStackProps) {
  const activePeers = peers.filter((p) => p.online);
  const totalCount = activePeers.length + (currentUser ? 1 : 0);

  if (totalCount <= 0) return null;

  return (
    <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-surface-subtle border border-border">
      {/* Indicador de status multiplayer */}
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-muted">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="hidden sm:inline">Colaboradores:</span>
      </div>

      {/* Avatar Stack */}
      <div className="flex items-center -space-x-2 overflow-hidden py-0.5">
        {/* Outros Usuários Conectados */}
        {activePeers.slice(0, 4).map((peer) => {
          const color = peer.user.color;
          const initials = getInitials(peer.user.name);

          return (
            <div
              key={peer.user.id}
              className="group relative"
              title={`${peer.user.name} está online nesta excursão`}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black border-2 border-surface shadow-xs transition-transform group-hover:scale-110 group-hover:z-20 cursor-default"
                style={{
                  backgroundColor: color.bg,
                  color: color.text,
                }}
              >
                {initials}
              </div>

              {/* Tooltip ao passar o mouse */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                <div className="bg-slate-900 text-white text-[10px] font-semibold py-1 px-2 rounded-md shadow-xl whitespace-nowrap border border-slate-800">
                  <div className="font-bold">{peer.user.name}</div>
                  {peer.focus?.elementLabel && (
                    <div className="text-slate-400 text-[9px] mt-0.5">
                      Editando: {peer.focus.elementLabel}
                    </div>
                  )}
                </div>
                <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-1 border-r border-b border-slate-800" />
              </div>
            </div>
          );
        })}

        {/* Badge se houver mais de 4 outros colaboradores */}
        {activePeers.length > 4 && (
          <div className="w-7 h-7 rounded-full bg-slate-700 text-white border-2 border-surface flex items-center justify-center text-[10px] font-black shadow-xs">
            +{activePeers.length - 4}
          </div>
        )}
      </div>
    </div>
  );
}
