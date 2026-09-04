"use client";

import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3-force";
import type { SocialNode, SocialLink } from "@/lib/actions/social-network";

interface SocialGraphCanvasProps {
  nodes: SocialNode[];
  links: SocialLink[];
  selectedNodeId: string | null;
  onSelectNode: (node: SocialNode | null) => void;
  hoveredNodeId?: string | null;
  onHoverNode?: (node: SocialNode | null) => void;
}

export function SocialGraphCanvas({
  nodes,
  links,
  selectedNodeId,
  onSelectNode,
  hoveredNodeId,
  onHoverNode,
}: SocialGraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simulationRef = useRef<any>(null);

  // Transformações da câmera (Pan & Zoom calibrado para o layout espaçoso)
  const transformRef = useRef<{ x: number; y: number; k: number }>({
    x: 0,
    y: 0,
    k: 0.45,
  });

  const isDraggingCanvasRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mouseDownPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const potentialNodeRef = useRef<any | null>(null);
  const isDraggingNodeRef = useRef(false);
  const activeDraggedNodeRef = useRef<any | null>(null);

  // Refs para seleção e hover — EVITA reiniciar a simulação física a cada movimento do mouse!
  const selectedNodeIdRef = useRef<string | null>(selectedNodeId);
  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

  const hoveredNodeIdRef = useRef<string | null>(hoveredNodeId);
  useEffect(() => {
    hoveredNodeIdRef.current = hoveredNodeId;
  }, [hoveredNodeId]);

  // Armazena cópia interna dos nós e links simulados
  const simNodesRef = useRef<any[]>([]);
  const simLinksRef = useRef<any[]>([]);

  // Mapa de adjacência para iluminar conexões
  const adjacencyMapRef = useRef<Map<string, Set<string>>>(new Map());

  // Atualiza mapa de adjacência
  useEffect(() => {
    const map = new Map<string, Set<string>>();
    nodes.forEach((n) => map.set(n.id, new Set()));

    links.forEach((l) => {
      const srcId = typeof l.source === "object" ? (l.source as any).id : l.source;
      const tgtId = typeof l.target === "object" ? (l.target as any).id : l.target;

      if (!map.has(srcId)) map.set(srcId, new Set());
      if (!map.has(tgtId)) map.set(tgtId, new Set());

      map.get(srcId)!.add(tgtId);
      map.get(tgtId)!.add(srcId);
    });

    adjacencyMapRef.current = map;
  }, [nodes, links]);

  // Inicializa simulação física com d3-force — DEPENDE APENAS DE [nodes, links]
  useEffect(() => {
    if (!containerRef.current) return;
    const { clientWidth: width, clientHeight: height } = containerRef.current;

    // Preserva posições de nós que já existiam para evitar saltos visuais ao filtrar
    const existingPosMap = new Map(
      simNodesRef.current.map((n) => [n.id, { x: n.x, y: n.y, vx: n.vx, vy: n.vy }])
    );

    const simNodes = nodes.map((n) => {
      const existing = existingPosMap.get(n.id);
      return {
        ...n,
        x: existing?.x ?? (n.x ?? width / 2 + (Math.random() - 0.5) * 700),
        y: existing?.y ?? (n.y ?? height / 2 + (Math.random() - 0.5) * 700),
        vx: existing?.vx ?? 0,
        vy: existing?.vy ?? 0,
      };
    });

    const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

    const simLinks = links
      .map((l) => {
        const srcId = typeof l.source === "object" ? (l.source as any).id : l.source;
        const tgtId = typeof l.target === "object" ? (l.target as any).id : l.target;
        return {
          ...l,
          source: nodeMap.get(srcId),
          target: nodeMap.get(tgtId),
        };
      })
      .filter((l) => l.source && l.target);

    simNodesRef.current = simNodes;
    simLinksRef.current = simLinks;

    // Configuração física calibrada idêntica ao Obsidian Graph View com nós bem espaçados:
    // 1. Repulsão Poderosa: Ímãs que empurram os nós para longe, criando muito respiro para os nomes
    // 2. Colisão Ampla (+32px): Garante espaço de segurança total sob cada nó para que os nomes fiquem 100% legíveis sem colisão
    // 3. Atração (Links Longos): Elásticos com comprimento maior (160px a 240px)
    // 4. Gravidade Central Suave: Mantém o gráfico na tela sem esmagar as bolinhas
    const simulation = (d3 as any)
      .forceSimulation(simNodes)
      .force(
        "link",
        (d3 as any)
          .forceLink(simLinks)
          .id((d: any) => d.id)
          .distance((l: any) => Math.max(160, 240 - Math.min(80, (l.weight - 1) * 20)))
          .strength(0.12)
      )
      .force(
        "charge",
        (d3 as any)
          .forceManyBody()
          .strength((d: any) => -220 - d.radius * 20)
          .distanceMax(1200)
      )
      .force(
        "collide",
        (d3 as any)
          .forceCollide()
          .radius((d: any) => d.radius + 32)
          .iterations(3)
      )
      .force("center", (d3 as any).forceCenter(width / 2, height / 2).strength(0.018))
      .force("x", (d3 as any).forceX(width / 2).strength(0.01))
      .force("y", (d3 as any).forceY(height / 2).strength(0.01))
      .alphaDecay(0.016);

    simulationRef.current = simulation;

    // Loop de renderização contínuo no canvas
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { x: tx, y: ty, k } = transformRef.current;
      // Prioridade de foco: se um nó estiver selecionado (modal aberto), o foco fica TRAVADO nele!
      // As conexões da pessoa clicada permanecem 100% ativas enquanto o modal estiver aberto.
      // Apenas quando nenhum nó está selecionado é que o hover controla as conexões em tempo real.
      const activeHoverId = hoveredNodeIdRef.current;
      const activeSelectedId = selectedNodeIdRef.current;
      const focusedId = activeSelectedId || activeHoverId;

      const neighborSet = focusedId
        ? adjacencyMapRef.current.get(focusedId) || new Set()
        : null;

      // Limpa tela com fundo escuro estilo Obsidian
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Aplica Pan & Zoom
      ctx.translate(tx, ty);
      ctx.scale(k, k);

      // Grade sutil de pontos de constelação
      drawGrid(ctx, canvas.width, canvas.height, tx, ty, k);

      // 1. Desenha arestas / conexões elásticas
      simLinksRef.current.forEach((link: any) => {
        const isConnected =
          focusedId &&
          (link.source.id === focusedId || link.target.id === focusedId);

        ctx.beginPath();
        ctx.moveTo(link.source.x, link.source.y);
        ctx.lineTo(link.target.x, link.target.y);

        if (focusedId) {
          if (isConnected) {
            ctx.strokeStyle = "#f97316";
            ctx.lineWidth = Math.min(3.5, 1.6 + link.weight * 0.45);
            ctx.globalAlpha = 0.95;
          } else {
            ctx.strokeStyle = "#334155";
            ctx.lineWidth = 0.4;
            ctx.globalAlpha = 0.04;
          }
        } else {
          ctx.strokeStyle = "#475569";
          ctx.lineWidth = Math.min(2.5, 0.6 + link.weight * 0.3);
          ctx.globalAlpha = 0.2;
        }

        ctx.stroke();
      });

      // 2. Desenha nós / esferas dos clientes estilo Obsidian Galaxy
      simNodesRef.current.forEach((node: any) => {
        const isSelected = node.id === activeSelectedId;
        const isHovered = node.id === activeHoverId;
        const isNeighbor = neighborSet?.has(node.id);
        const isHighlighted = isSelected || isNeighbor || (!activeSelectedId && isHovered);
        const isSuperHub = node.radius >= 25 || node.companionsCount >= 100;

        ctx.save();

        // Aura brilhante cósmica para super-hubs como George
        if (isSuperHub && (!focusedId || isHighlighted)) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 10, 0, 2 * Math.PI);
          ctx.fillStyle = "rgba(249, 115, 22, 0.16)";
          ctx.fill();

          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 22, 0, 2 * Math.PI);
          ctx.fillStyle = "rgba(249, 115, 22, 0.05)";
          ctx.fill();
        }

        // Opacidade geral com foco Obsidian: nós fora da rede ativa ficam em 0.07 de opacidade
        if (focusedId) {
          ctx.globalAlpha = isHighlighted ? 1 : 0.07;
        } else {
          ctx.globalAlpha = 1;
        }

        // Desenha o corpo da bolinha:
        // O nó selecionado (ou hovered quando não há seleção) ganha o laranja ativo (#f97316).
        // Vizinhos e demais nós preservam sua cor individual (esmeralda, ciano, violeta, ardósia).
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);

        ctx.fillStyle = isSelected || (!activeSelectedId && isHovered)
          ? "#f97316"
          : node.color;
        ctx.fill();

        // Contorno do nó: vizinhos ganham contorno branco luminoso sutil
        ctx.strokeStyle = isSelected || (!activeSelectedId && isHovered)
          ? "#ffffff"
          : isNeighbor
            ? "#ffffff"
            : isSuperHub
              ? "rgba(255, 255, 255, 0.9)"
              : "rgba(255, 255, 255, 0.22)";
        ctx.lineWidth = isSelected || (!activeSelectedId && isHovered) ? 3 : isNeighbor ? 1.6 : isSuperHub ? 2.2 : 0.8;
        ctx.stroke();

        // Anel externo:
        // No nó selecionado (ou hovered livre): anel laranja ativo
        // No nó sob o cursor quando é vizinho do selecionado: anel branco interativo
        if (isSelected || (!activeSelectedId && isHovered)) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 6, 0, 2 * Math.PI);
          ctx.strokeStyle = "#f97316";
          ctx.lineWidth = 2.2;
          ctx.stroke();
        } else if (isHovered && isNeighbor) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 4.5, 0, 2 * Math.PI);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }

        // Rótulo textual inteligente com contorno escuro e legibilidade máxima:
        const shouldShowLabel = isSuperHub || node.radius >= 14 || isHighlighted || k >= 1.25;

        if (shouldShowLabel) {
          const displayName = node.name?.trim()
            ? node.name.split(" ").slice(0, 2).join(" ")
            : "Passageiro";

          if (isSuperHub) {
            ctx.font = "bold 13px sans-serif";
          } else if (node.radius >= 14 || isHighlighted) {
            ctx.font = "bold 11px sans-serif";
          } else {
            ctx.font = "10px sans-serif";
          }

          ctx.textAlign = "center";
          ctx.textBaseline = "top";

          const textY = node.y + node.radius + (isSuperHub ? 7 : 4);

          // Contorno escuro grosso de fundo: garante que o texto fique 100% legível sobre qualquer aresta
          ctx.strokeStyle = "#0d1117";
          ctx.lineWidth = 3.5;
          ctx.strokeText(displayName, node.x, textY);

          // Preenchimento brilhante do texto
          ctx.fillStyle = isHighlighted || isSuperHub
            ? "#ffffff"
            : focusedId
              ? "rgba(148, 163, 184, 0.45)"
              : "rgba(226, 232, 240, 0.95)";

          ctx.fillText(displayName, node.x, textY);
        }

        ctx.restore();
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      simulation.stop();
    };
  }, [nodes, links]); // Depende apenas dos dados do grafo, NUNCA do hover

  // Redimensionamento de Canvas
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      canvasRef.current.width = clientWidth;
      canvasRef.current.height = clientHeight;
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Encontra nó sob as coordenadas do mouse
  const getNodeAtPos = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;

    const { x: tx, y: ty, k } = transformRef.current;
    const worldX = (mx - tx) / k;
    const worldY = (my - ty) / k;

    // Busca o nó mais próximo dentro de seu raio + margem
    for (let i = simNodesRef.current.length - 1; i >= 0; i--) {
      const n = simNodesRef.current[i];
      const dx = n.x - worldX;
      const dy = n.y - worldY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= n.radius + 8) {
        return n;
      }
    }
    return null;
  }, []);

  // Eventos de Mouse: Pan, Zoom e Drag de Nós (SEM animação de puxada ao apenas clicar!)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const clickedNode = getNodeAtPos(e.clientX, e.clientY);
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };

    if (clickedNode) {
      // Registra nó sob o cursor mas NÃO reinicia a física ainda!
      potentialNodeRef.current = clickedNode;
      isDraggingNodeRef.current = false;
    } else {
      isDraggingCanvasRef.current = true;
      dragStartRef.current = {
        x: e.clientX - transformRef.current.x,
        y: e.clientY - transformRef.current.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // 1. Arrastando um nó específico (apenas se o mouse se deslocou mais de 4px)
    if (potentialNodeRef.current) {
      const dist = Math.hypot(
        e.clientX - mouseDownPosRef.current.x,
        e.clientY - mouseDownPosRef.current.y
      );

      if (!isDraggingNodeRef.current && dist > 4) {
        // Inicia o arrasto intencional do nó
        isDraggingNodeRef.current = true;
        activeDraggedNodeRef.current = potentialNodeRef.current;
        potentialNodeRef.current.fx = potentialNodeRef.current.x;
        potentialNodeRef.current.fy = potentialNodeRef.current.y;
        if (simulationRef.current) simulationRef.current.alphaTarget(0.12).restart();
      }

      if (isDraggingNodeRef.current && activeDraggedNodeRef.current) {
        const rect = canvasRef.current!.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const { x: tx, y: ty, k } = transformRef.current;

        activeDraggedNodeRef.current.fx = (mx - tx) / k;
        activeDraggedNodeRef.current.fy = (my - ty) / k;
        return;
      }
    }

    // 2. Arrastando a tela (Pan)
    if (isDraggingCanvasRef.current) {
      transformRef.current.x = e.clientX - dragStartRef.current.x;
      transformRef.current.y = e.clientY - dragStartRef.current.y;
      return;
    }

    // 3. Hover em nós — atualiza ref imediatamente sem reiniciar a simulação!
    const hovered = getNodeAtPos(e.clientX, e.clientY);
    const prevId = hoveredNodeIdRef.current;
    const nextId = hovered?.id || null;

    if (prevId !== nextId) {
      hoveredNodeIdRef.current = nextId;
      onHoverNode?.(hovered);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = hovered ? "pointer" : "grab";
      }
    }
  };

  const handleMouseUp = () => {
    if (isDraggingNodeRef.current && activeDraggedNodeRef.current) {
      activeDraggedNodeRef.current.fx = null;
      activeDraggedNodeRef.current.fy = null;
      activeDraggedNodeRef.current = null;
      if (simulationRef.current) simulationRef.current.alphaTarget(0);
    }

    potentialNodeRef.current = null;
    isDraggingNodeRef.current = false;
    isDraggingCanvasRef.current = false;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Se o mouse se moveu mais de 4px (arrasto), ignora clique
    const dist = Math.hypot(
      e.clientX - mouseDownPosRef.current.x,
      e.clientY - mouseDownPosRef.current.y
    );
    if (dist > 4) return;

    const clickedNode = getNodeAtPos(e.clientX, e.clientY);
    onSelectNode(clickedNode);
  };

  // Zoom suave com Scroll Wheel (com alcance infinito para ver todo o universo)
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.14 : 0.86;
    const currentK = transformRef.current.k;
    // Permite afastar até 0.04 (4% de zoom para ver a galáxia inteira) e aproximar até 4.5x
    const nextK = Math.max(0.04, Math.min(4.5, currentK * zoomFactor));

    transformRef.current.x = mx - (mx - transformRef.current.x) * (nextK / currentK);
    transformRef.current.y = my - (my - transformRef.current.y) * (nextK / currentK);
    transformRef.current.k = nextK;
  };

  // Zoom através dos botões da interface (sempre focado no centro da tela)
  const handleButtonZoom = (factor: number) => {
    if (!canvasRef.current || !containerRef.current) return;
    const { clientWidth: width, clientHeight: height } = containerRef.current;
    const currentK = transformRef.current.k;
    const nextK = Math.max(0.04, Math.min(4.5, currentK * factor));

    const cx = width / 2;
    const cy = height / 2;
    transformRef.current.x = cx - (cx - transformRef.current.x) * (nextK / currentK);
    transformRef.current.y = cy - (cy - transformRef.current.y) * (nextK / currentK);
    transformRef.current.k = nextK;
  };

  // Centralizar Câmera no Grafo com visão panorâmica total
  const handleResetCamera = () => {
    if (!containerRef.current) return;
    const { clientWidth: width, clientHeight: height } = containerRef.current;
    transformRef.current = {
      x: width * 0.28,
      y: height * 0.28,
      k: 0.45,
    };
    if (simulationRef.current) simulationRef.current.alpha(0.25).restart();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[500px] bg-[#0d1117] rounded-3xl overflow-hidden border border-white/10 shadow-2xl select-none"
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
      />

      {/* Controles Flutuantes da Câmera (Zoom In/Out e Reset) — Posição segura com folga da borda */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 bg-[#161b22]/90 backdrop-blur-xl p-2 rounded-2xl border border-white/20 text-white shadow-2xl z-20">
        <button
          type="button"
          onClick={() => handleButtonZoom(1.28)}
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/25 active:scale-95 flex items-center justify-center text-lg font-bold transition-all cursor-pointer shadow-xs select-none"
          title="Aumentar Zoom (+)"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => handleButtonZoom(0.78)}
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/25 active:scale-95 flex items-center justify-center text-lg font-bold transition-all cursor-pointer shadow-xs select-none"
          title="Diminuir Zoom (-)"
        >
          −
        </button>
        <button
          type="button"
          onClick={handleResetCamera}
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/25 active:scale-95 flex items-center justify-center text-sm font-semibold transition-all cursor-pointer shadow-xs select-none"
          title="Visão Geral Panorâmica (Reset)"
        >
          ⟲
        </button>
      </div>

      {/* Indicador de Ajuda / Dica no canto inferior esquerdo */}
      <div className="absolute bottom-6 left-6 hidden sm:flex items-center gap-2 bg-[#161b22]/90 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/15 text-[11px] text-white/70 pointer-events-none z-10 shadow-lg">
        <span>🖱️ Arraste para mover · Scroll para zoom panorâmico · Clique para fixar cliente</span>
      </div>
    </div>
  );
}

// Desenha grade suave estilo Obsidian
function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tx: number,
  ty: number,
  k: number
) {
  const gridSize = 40 * k;
  const startX = tx % gridSize;
  const startY = ty % gridSize;

  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.03)";

  for (let x = startX; x < width; x += gridSize) {
    for (let y = startY; y < height; y += gridSize) {
      ctx.fillRect(x - 0.5, y - 0.5, 1.5, 1.5);
    }
  }
  ctx.restore();
}

// Escurece ou clareia cores HEX
function adjustColor(color: string, amount: number) {
  return (
    "#" +
    color
      .replace(/^#/, "")
      .replace(/../g, (c) =>
        (
          "0" +
          Math.min(255, Math.max(0, parseInt(c, 16) + amount)).toString(16)
        ).substr(-2)
      )
  );
}
