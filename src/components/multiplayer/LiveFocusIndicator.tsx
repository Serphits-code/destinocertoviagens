// src/components/multiplayer/LiveFocusIndicator.tsx
"use client";

import { useEffect } from "react";
import type { PeerPresence } from "@/lib/multiplayer/types";

interface LiveFocusIndicatorProps {
  peers: PeerPresence[];
}

export function LiveFocusIndicator({ peers }: LiveFocusIndicatorProps) {
  useEffect(() => {
    // Para cada peer que tenha um elemento focado, adiciona classe e atributo
    const activeHighlights: Array<{ el: HTMLElement; cleanup: () => void }> = [];

    for (const peer of peers) {
      const elementId = peer.focus?.elementId;
      if (!elementId) continue;

      // Procura por ID ou por data-block-id
      const target =
        document.getElementById(elementId) ||
        document.querySelector(`[data-block-id="${elementId}"]`);

      if (target instanceof HTMLElement) {
        const originalOutline = target.style.outline;
        const originalOutlineOffset = target.style.outlineOffset;
        const originalTransition = target.style.transition;

        target.style.outline = `2px solid ${peer.user.color.bg}`;
        target.style.outlineOffset = "2px";
        target.style.transition = "outline 200ms ease";

        activeHighlights.push({
          el: target,
          cleanup: () => {
            target.style.outline = originalOutline;
            target.style.outlineOffset = originalOutlineOffset;
            target.style.transition = originalTransition;
          },
        });
      }
    }

    return () => {
      for (const h of activeHighlights) {
        h.cleanup();
      }
    };
  }, [peers]);

  return null;
}
