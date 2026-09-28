// src/app/api/excursoes/[id]/multiplayer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { roomManager } from "@/lib/multiplayer/room-manager";
import { getUserColor, type MultiplayerUser } from "@/lib/multiplayer/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  const { id: excursionId } = await params;
  const user = session.user;
  const color = getUserColor(user.id);

  const multiplayerUser: MultiplayerUser = {
    id: user.id,
    name: user.name || user.email?.split("@")[0] || "Usuário",
    email: user.email || undefined,
    color: {
      bg: color.bg,
      text: color.text,
    },
  };

  const clientKey =
    req.nextUrl.searchParams.get("clientId") ||
    `${user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      roomManager.addClient(excursionId, clientKey, multiplayerUser, controller);

      cleanup = () => {
        roomManager.removeClient(excursionId, clientKey);
      };

      // Heartbeat ping a cada 15 segundos para manter a conexão SSE viva
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": ping\n\n"));
        } catch {
          clearInterval(pingInterval);
        }
      }, 15000);

      req.signal.addEventListener("abort", () => {
        clearInterval(pingInterval);
        if (cleanup) cleanup();
      });
    },
    cancel() {
      if (cleanup) cleanup();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id: excursionId } = await params;
  const userId = session.user.id;

  try {
    const body = await req.json();

    if (body.action === "cursor") {
      const { x, y } = body;
      if (typeof x === "number" && typeof y === "number") {
        roomManager.updateCursor(excursionId, userId, x, y);
      }
    } else if (body.action === "focus") {
      const { elementId, elementLabel } = body;
      roomManager.updateFocus(excursionId, userId, elementId, elementLabel);
    } else if (body.action === "heartbeat") {
      roomManager.keepAlive(excursionId, userId);
    } else if (body.action === "mutate") {
      const { mutation, clientId } = body;
      if (mutation && typeof mutation.type === "string") {
        roomManager.broadcastMutation(excursionId, userId, clientId, mutation);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Multiplayer POST] Error:", err);
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }
}
