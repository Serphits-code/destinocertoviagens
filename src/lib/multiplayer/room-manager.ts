// src/lib/multiplayer/room-manager.ts
import { EventEmitter } from "events";
import type {
  MultiplayerUser,
  PeerPresence,
  UserCursor,
  UserFocus,
  MultiplayerPayload,
  EditorMutationAction,
} from "./types";

interface RoomClient {
  clientKey: string;
  user: MultiplayerUser;
  controller: ReadableStreamDefaultController;
}

interface RoomState {
  clients: Map<string, RoomClient>;
  presences: Map<string, PeerPresence>;
}

class MultiplayerRoomManager extends EventEmitter {
  private rooms: Map<string, RoomState> = new Map();

  constructor() {
    super();
    // Prune stale presences a cada 15 segundos
    setInterval(() => this.pruneInactiveClients(), 15000);
  }

  private getRoom(excursionId: string): RoomState {
    let room = this.rooms.get(excursionId);
    if (!room) {
      room = {
        clients: new Map(),
        presences: new Map(),
      };
      this.rooms.set(excursionId, room);
    }
    return room;
  }

  /**
   * Adiciona um novo cliente SSE a uma sala de excursão
   */
  public addClient(
    excursionId: string,
    clientKey: string,
    user: MultiplayerUser,
    controller: ReadableStreamDefaultController
  ) {
    const room = this.getRoom(excursionId);

    // Registra conexão SSE
    room.clients.set(clientKey, { clientKey, user, controller });

    // Atualiza estado de presença do usuário
    const existing = room.presences.get(user.id);
    const peer: PeerPresence = {
      user,
      cursor: existing?.cursor || null,
      focus: existing?.focus || null,
      online: true,
      lastSeen: Date.now(),
    };
    room.presences.set(user.id, peer);

    // 1. Envia lista completa de quem já está na sala para o novo cliente
    const currentUsers = Array.from(room.presences.values()).filter(
      (p) => p.online && p.user.id !== user.id
    );
    this.sendToClient(controller, {
      type: "sync",
      users: currentUsers,
    });

    // 2. Transmite aviso para os demais clientes de que este usuário entrou
    this.broadcastToRoom(
      excursionId,
      {
        type: "user_joined",
        peer,
      },
      clientKey
    );
  }

  /**
   * Remove o cliente quando fecha a aba ou desconecta
   */
  public removeClient(excursionId: string, clientKey: string) {
    const room = this.rooms.get(excursionId);
    if (!room) return;

    const client = room.clients.get(clientKey);
    if (!client) return;

    room.clients.delete(clientKey);

    // Verifica se o usuário tem outra conexão aberta na mesma sala (ex: 2 abas abertas)
    const hasOtherConnection = Array.from(room.clients.values()).some(
      (c) => c.user.id === client.user.id
    );

    if (!hasOtherConnection) {
      room.presences.delete(client.user.id);
      this.broadcastToRoom(excursionId, {
        type: "user_left",
        userId: client.user.id,
      });
    }

    if (room.clients.size === 0) {
      this.rooms.delete(excursionId);
    }
  }

  /**
   * Transmite atualização da posição do cursor para os outros membros da sala
   */
  public updateCursor(
    excursionId: string,
    userId: string,
    x: number,
    y: number
  ) {
    const room = this.rooms.get(excursionId);
    if (!room) return;

    const presence = room.presences.get(userId);
    if (presence) {
      const cursor: UserCursor = {
        x,
        y,
        lastUpdate: Date.now(),
      };
      presence.cursor = cursor;
      presence.lastSeen = Date.now();

      this.broadcastToRoom(
        excursionId,
        {
          type: "cursor_move",
          userId,
          cursor,
        },
        undefined,
        userId // Não reenvia de volta para quem moveu o mouse
      );
    }
  }

  /**
   * Transmite foco em card ou campo para os outros membros da sala
   */
  public updateFocus(
    excursionId: string,
    userId: string,
    elementId?: string | null,
    elementLabel?: string | null
  ) {
    const room = this.rooms.get(excursionId);
    if (!room) return;

    const presence = room.presences.get(userId);
    if (presence) {
      const focus: UserFocus | null = elementId
        ? { elementId, elementLabel, lastUpdate: Date.now() }
        : null;
      presence.focus = focus;
      presence.lastSeen = Date.now();

      this.broadcastToRoom(
        excursionId,
        {
          type: "focus_change",
          userId,
          focus,
        },
        undefined,
        userId
      );
    }
  }

  /**
   * Transmite mutações de dados da excursão em tempo real para os outros membros da sala
   */
  public broadcastMutation(
    excursionId: string,
    userId: string,
    clientId: string | undefined,
    mutation: EditorMutationAction
  ) {
    const room = this.rooms.get(excursionId);
    if (!room) return;

    this.broadcastToRoom(
      excursionId,
      {
        type: "content_mutation",
        userId,
        clientId,
        mutation,
      },
      clientId // Exclui apenas a conexão do cliente emissor (permite que outras abas do mesmo usuário recebam)
    );
  }

  /**
   * Heartbeat para manter usuário ativo
   */
  public keepAlive(excursionId: string, userId: string) {
    const room = this.rooms.get(excursionId);
    if (!room) return;

    const presence = room.presences.get(userId);
    if (presence) {
      presence.lastSeen = Date.now();
    }
  }

  /**
   * Envia mensagem SSE para um cliente específico
   */
  private sendToClient(
    controller: ReadableStreamDefaultController,
    payload: MultiplayerPayload
  ): boolean {
    try {
      const encoder = new TextEncoder();
      const data = `data: ${JSON.stringify(payload)}\n\n`;
      controller.enqueue(encoder.encode(data));
      return true;
    } catch {
      // Stream fechada
      return false;
    }
  }

  /**
   * Transmite mensagem SSE para todos os clientes da sala
   */
  private broadcastToRoom(
    excursionId: string,
    payload: MultiplayerPayload,
    excludeClientKey?: string,
    excludeUserId?: string
  ) {
    const room = this.rooms.get(excursionId);
    if (!room) return;

    const deadClients: string[] = [];

    for (const [key, client] of room.clients.entries()) {
      if (excludeClientKey && key === excludeClientKey) continue;
      if (excludeUserId && client.user.id === excludeUserId) continue;
      const sent = this.sendToClient(client.controller, payload);
      if (!sent) {
        deadClients.push(key);
      }
    }

    // Limpa clientes com streams fechados
    for (const key of deadClients) {
      this.removeClient(excursionId, key);
    }
  }

  /**
   * Remove presenças inativas (> 35s sem sinal)
   */
  private pruneInactiveClients() {
    const now = Date.now();
    for (const [excursionId, room] of this.rooms.entries()) {
      for (const [userId, presence] of room.presences.entries()) {
        if (now - presence.lastSeen > 35000) {
          room.presences.delete(userId);
          this.broadcastToRoom(excursionId, {
            type: "user_left",
            userId,
          });
        }
      }
    }
  }
  // Expose internals para permitir migração de dados entre hot-reloads
  public getRooms(): Map<string, RoomState> {
    return this.rooms;
  }

  public setRooms(rooms: Map<string, RoomState>) {
    this.rooms = rooms;
  }
}

// Preserva dados entre hot-reloads no Next.js
// IMPORTANTE: Sempre criamos uma nova instância da classe para garantir que 
// métodos novos/alterados estejam disponíveis. Os dados (rooms/clients) são
// migrados da instância anterior se existir.
const globalForRooms = globalThis as unknown as {
  multiplayerRoomManager?: MultiplayerRoomManager;
};

const freshManager = new MultiplayerRoomManager();

// Migra os dados (conexões SSE ativas) da instância anterior
if (globalForRooms.multiplayerRoomManager) {
  try {
    const oldRooms = globalForRooms.multiplayerRoomManager.getRooms();
    if (oldRooms && oldRooms.size > 0) {
      freshManager.setRooms(oldRooms);
    }
  } catch {
    // Instância antiga pode não ter getRooms() — ignora
  }
}

export const roomManager = freshManager;

if (process.env.NODE_ENV !== "production") {
  globalForRooms.multiplayerRoomManager = roomManager;
}

