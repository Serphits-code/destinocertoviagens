// src/lib/multiplayer/types.ts

export const MULTIPLAYER_COLORS = [
  { bg: "#8B5CF6", text: "#FFFFFF", name: "Roxo" },
  { bg: "#EC4899", text: "#FFFFFF", name: "Rosa" },
  { bg: "#3B82F6", text: "#FFFFFF", name: "Azul" },
  { bg: "#10B981", text: "#FFFFFF", name: "Esmeralda" },
  { bg: "#F59E0B", text: "#FFFFFF", name: "Âmbar" },
  { bg: "#06B6D4", text: "#FFFFFF", name: "Ciano" },
  { bg: "#EF4444", text: "#FFFFFF", name: "Coral" },
  { bg: "#6366F1", text: "#FFFFFF", name: "Índigo" },
  { bg: "#14B8A6", text: "#FFFFFF", name: "Teal" },
  { bg: "#D946EF", text: "#FFFFFF", name: "Fúcsia" },
];

export function getUserColor(userId: string): { bg: string; text: string; name: string } {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % MULTIPLAYER_COLORS.length;
  return MULTIPLAYER_COLORS[idx];
}

export interface MultiplayerUser {
  id: string;
  name: string;
  email?: string;
  color: {
    bg: string;
    text: string;
  };
}

export interface UserCursor {
  x: number; // Percentual relativo ao container (0 a 100)
  y: number; // Percentual relativo ao container (0 a 100)
  lastUpdate: number;
}

export interface UserFocus {
  elementId?: string | null; // ID do card ou input focado
  elementLabel?: string | null; // Descrição (ex: "Card Aéreo", "Preço Base")
  lastUpdate: number;
}

export interface PeerPresence {
  user: MultiplayerUser;
  cursor?: UserCursor | null;
  focus?: UserFocus | null;
  online: boolean;
  lastSeen: number;
}

export type EditorMutationAction =
  | {
      type: "header";
      patch: {
        name?: string;
        periodStart?: string | null;
        periodEnd?: string | null;
        slots?: number;
      };
    }
  | {
      type: "block_update";
      blockId: string;
      data: any;
      title?: string;
    }
  | {
      type: "block_delete";
      blockId: string;
    }
  | {
      type: "block_reorder";
      orderedIds: string[];
    }
  | {
      type: "block_toggle_collapse";
      blockId: string;
      collapsed: boolean;
    }
  | {
      type: "profit_margin";
      profitMargin: number;
    }
  | {
      type: "addons";
      addons: any[];
    }
  | {
      type: "itinerary";
      itinerary: any[];
    }
  | {
      type: "reload_blocks";
    };

export type MultiplayerPayload =
  | {
      type: "sync";
      users: PeerPresence[];
    }
  | {
      type: "user_joined";
      peer: PeerPresence;
    }
  | {
      type: "user_left";
      userId: string;
    }
  | {
      type: "cursor_move";
      userId: string;
      cursor: UserCursor;
    }
  | {
      type: "focus_change";
      userId: string;
      focus: UserFocus | null;
    }
  | {
      type: "content_mutation";
      userId: string;
      clientId?: string;
      mutation: EditorMutationAction;
    }
  | {
      type: "heartbeat";
      userId: string;
    };
