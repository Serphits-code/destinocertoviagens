// src/lib/multiplayer/useMultiplayerPresence.ts
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  MultiplayerUser,
  PeerPresence,
  MultiplayerPayload,
  EditorMutationAction,
} from "./types";

interface UseMultiplayerPresenceOptions {
  excursionId: string;
  currentUser?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
  containerRef: React.RefObject<HTMLElement | null>;
  onRemoteMutation?: (mutation: EditorMutationAction) => void;
}

export function useMultiplayerPresence({
  excursionId,
  currentUser,
  containerRef,
  onRemoteMutation,
}: UseMultiplayerPresenceOptions) {
  const [peers, setPeers] = useState<Map<string, PeerPresence>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  // ID único desta aba de navegador para distinguir de outras abas (mesmo que do mesmo usuário)
  const clientIdRef = useRef<string>(
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );

  const onRemoteMutationRef = useRef(onRemoteMutation);
  useEffect(() => {
    onRemoteMutationRef.current = onRemoteMutation;
  }, [onRemoteMutation]);

  const lastSentRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const pendingCursorRef = useRef<{ x: number; y: number } | null>(null);

  // Envia atualização de cursor via POST com throttle
  const sendCursorUpdate = useCallback(
    (x: number, y: number) => {
      pendingCursorRef.current = { x, y };

      if (rafIdRef.current) return;

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        const now = Date.now();
        // Mínimo de 35ms entre requisições (~28 fps)
        if (now - lastSentRef.current >= 35 && pendingCursorRef.current) {
          lastSentRef.current = now;
          const pos = pendingCursorRef.current;
          pendingCursorRef.current = null;

          fetch(`/api/excursoes/${excursionId}/multiplayer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "cursor",
              clientId: clientIdRef.current,
              x: pos.x,
              y: pos.y,
            }),
            keepalive: true,
          }).catch(() => {});
        }
      });
    },
    [excursionId]
  );

  // Envia foco em card ou input
  const sendFocusUpdate = useCallback(
    (elementId?: string | null, elementLabel?: string | null) => {
      fetch(`/api/excursoes/${excursionId}/multiplayer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "focus",
          clientId: clientIdRef.current,
          elementId,
          elementLabel,
        }),
        keepalive: true,
      }).catch(() => {});
    },
    [excursionId]
  );

  // Envia mutação de conteúdo do editor para os outros clientes
  // Debounce por tipo de mutação para evitar flood (ex: cada tecla em um campo)
  const pendingMutationsRef = useRef<Map<string, { mutation: EditorMutationAction; timer: ReturnType<typeof setTimeout> }>>(new Map());

  const broadcastMutation = useCallback(
    (mutation: EditorMutationAction) => {
      // Gera uma chave de debounce com base no tipo de mutação
      const debounceKey =
        mutation.type === "block_update"
          ? `block_update_${mutation.blockId}`
          : mutation.type === "header"
          ? "header"
          : mutation.type; // demais tipos são enviados imediatamente

      // Para tipos que se beneficiam de debounce (header, block_update), 
      // agrupamos em um intervalo curto para evitar explosão de POSTs
      const needsDebounce = mutation.type === "block_update" || mutation.type === "header";
      const delay = needsDebounce ? 80 : 0; // 80ms de debounce para updates frequentes

      const existing = pendingMutationsRef.current.get(debounceKey);
      if (existing) {
        clearTimeout(existing.timer);
      }

      const timer = setTimeout(() => {
        pendingMutationsRef.current.delete(debounceKey);
        fetch(`/api/excursoes/${excursionId}/multiplayer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "mutate",
            clientId: clientIdRef.current,
            mutation,
          }),
        }).catch((err) => {
          console.warn("[Multiplayer] Falha ao enviar mutação:", err);
        });
      }, delay);

      pendingMutationsRef.current.set(debounceKey, { mutation, timer });
    },
    [excursionId]
  );

  // Conexão SSE com reconexão automática robusta
  useEffect(() => {
    if (!excursionId || !currentUser?.id) return;

    let eventSource: EventSource | null = null;
    let isMounted = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;

    function connect() {
      if (!isMounted) return;

      eventSource = new EventSource(
        `/api/excursoes/${excursionId}/multiplayer?clientId=${encodeURIComponent(
          clientIdRef.current
        )}`
      );

      eventSource.onopen = () => {
        setIsConnected(true);
        reconnectAttempt = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const payload: MultiplayerPayload = JSON.parse(event.data);

          // Mutações de conteúdo do editor são processadas IMEDIATAMENTE fora do setPeers!
          if (payload.type === "content_mutation") {
            // Ignora eco disparado por esta própria aba
            if (payload.clientId && payload.clientId === clientIdRef.current) {
              return;
            }
            onRemoteMutationRef.current?.(payload.mutation);
            return;
          }

          setPeers((prev) => {
            const next = new Map(prev);

            if (payload.type === "sync") {
              next.clear();
              for (const peer of payload.users) {
                if (peer.user.id !== currentUser.id) {
                  next.set(peer.user.id, peer);
                }
              }
            } else if (payload.type === "user_joined") {
              if (payload.peer.user.id !== currentUser.id) {
                next.set(payload.peer.user.id, payload.peer);
              }
            } else if (payload.type === "user_left") {
              next.delete(payload.userId);
            } else if (payload.type === "cursor_move") {
              const existing = next.get(payload.userId);
              if (existing) {
                next.set(payload.userId, {
                  ...existing,
                  cursor: payload.cursor,
                  lastSeen: Date.now(),
                });
              }
            } else if (payload.type === "focus_change") {
              const existing = next.get(payload.userId);
              if (existing) {
                next.set(payload.userId, {
                  ...existing,
                  focus: payload.focus,
                  lastSeen: Date.now(),
                });
              }
            }

            return next;
          });
        } catch {
          // Ignora pings ou formatos inválidos
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        
        // O EventSource nativo reconecta automaticamente, mas em caso de erro
        // forçamos uma reconexão limpa para garantir que o servidor registre o clientId
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }

        if (isMounted) {
          const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempt), 10000);
          reconnectAttempt++;
          reconnectTimer = setTimeout(connect, delay);
        }
      };
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (eventSource) {
        eventSource.close();
        setIsConnected(false);
      }
    };
  }, [excursionId, currentUser?.id]);

  // Listener de movimento do mouse normalizado no container
  useEffect(() => {
    const container = containerRef.current || document.body;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      // Normaliza de 0 a 100%
      const rawX = ((e.clientX - rect.left) / rect.width) * 100;
      const rawY = ((e.clientY - rect.top) / rect.height) * 100;

      // Garante limites dentro da área visível
      const x = Math.max(0, Math.min(100, rawX));
      const y = Math.max(0, Math.min(100, rawY));

      sendCursorUpdate(x, y);
    };

    const handleMouseLeave = () => {
      // Quando o mouse sai do editor, envia posição fora
      sendCursorUpdate(-100, -100);
    };

    container.addEventListener("mousemove", handleMouseMove, { passive: true });
    container.addEventListener("mouseleave", handleMouseLeave, { passive: true });

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [containerRef, sendCursorUpdate]);

  // Listener de foco (inputs, cards, botões)
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Descobre se o foco está dentro de um bloco ou campo identificado
      const blockEl = target.closest("[data-block-id]") as HTMLElement | null;
      const blockId = blockEl?.getAttribute("data-block-id");
      const blockTitle = blockEl?.getAttribute("data-block-title") || target.getAttribute("placeholder") || target.getAttribute("title") || target.tagName;

      const elementId = target.id || blockId || undefined;
      const elementLabel = blockTitle || undefined;

      if (elementId) {
        sendFocusUpdate(elementId, elementLabel);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      // Pequeno delay para verificar se o foco apenas mudou para outro elemento
      setTimeout(() => {
        if (!document.activeElement || document.activeElement === document.body) {
          sendFocusUpdate(null, null);
        }
      }, 50);
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, [sendFocusUpdate]);

  // Heartbeat periódico para manter a presença ativa no servidor
  useEffect(() => {
    if (!excursionId) return;

    const interval = setInterval(() => {
      fetch(`/api/excursoes/${excursionId}/multiplayer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "heartbeat",
          clientId: clientIdRef.current,
        }),
        keepalive: true,
      }).catch(() => {});
    }, 20000); // A cada 20 segundos (o server prune é 35s)

    return () => clearInterval(interval);
  }, [excursionId]);

  const peersList = Array.from(peers.values());

  return {
    peers: peersList,
    isConnected,
    broadcastMutation,
  };
}
