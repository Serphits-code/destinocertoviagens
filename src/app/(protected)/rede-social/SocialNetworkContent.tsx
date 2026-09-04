"use client";

import { useState, useMemo, useTransition } from "react";
import {
  Share2,
  Search,
  Users,
  Filter,
  RefreshCw,
  X,
  Loader2,
} from "lucide-react";
import {
  getCustomerSocialGraph,
  type SocialGraphData,
  type SocialNode,
} from "@/lib/actions/social-network";
import { SocialGraphCanvas } from "./SocialGraphCanvas";
import { ClientQuickCard } from "./ClientQuickCard";

interface SocialNetworkContentProps {
  initialData: SocialGraphData;
}

export function SocialNetworkContent({ initialData }: SocialNetworkContentProps) {
  const [data, setData] = useState<SocialGraphData>(initialData);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [minConnections, setMinConnections] = useState<number>(1);
  const [selectedNode, setSelectedNode] = useState<SocialNode | null>(null);

  const handleRefresh = () => {
    startTransition(async () => {
      const updated = await getCustomerSocialGraph({
        minConnections,
      });
      setData(updated);
    });
  };

  // Filtra nós pelo termo de busca (incluindo a rede de companheiros conectados) e densidade
  const { filteredNodes, filteredLinks } = useMemo(() => {
    let baseNodes = data.nodes;

    if (minConnections > 1) {
      baseNodes = baseNodes.filter((n) => n.companionsCount >= minConnections);
    }

    const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();

      // 1. Clientes que coincidem diretamente com a busca
      const directMatches = baseNodes.filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          (n.city && n.city.toLowerCase().includes(q))
      );

      const directMatchIds = new Set(directMatches.map((n) => n.id));

      // 2. Coleta TODOS os companheiros de viagem conectados diretamente aos clientes pesquisados
      const relevantNeighborIds = new Set<string>();
      const relevantLinks: typeof data.links = [];

      data.links.forEach((l) => {
        const srcId = typeof l.source === "object" ? (l.source as any).id : l.source;
        const tgtId = typeof l.target === "object" ? (l.target as any).id : l.target;

        if (directMatchIds.has(srcId)) {
          relevantNeighborIds.add(tgtId);
          relevantLinks.push(l);
        } else if (directMatchIds.has(tgtId)) {
          relevantNeighborIds.add(srcId);
          relevantLinks.push(l);
        }
      });

      // 3. Monta o conjunto final: cliente pesquisado + todas as pessoas conectadas a ele
      const finalNodeIds = new Set([...directMatchIds, ...relevantNeighborIds]);
      const resultNodes = Array.from(finalNodeIds)
        .map((id) => nodeMap.get(id))
        .filter((n): n is SocialNode => Boolean(n));

      return {
        filteredNodes: resultNodes,
        filteredLinks: relevantLinks,
      };
    }

    // Sem busca ativa: exibe nós respeitando o filtro de conexões
    const baseNodeIds = new Set(baseNodes.map((n) => n.id));
    const activeLinks = data.links.filter((l) => {
      const srcId = typeof l.source === "object" ? (l.source as any).id : l.source;
      const tgtId = typeof l.target === "object" ? (l.target as any).id : l.target;
      return baseNodeIds.has(srcId) && baseNodeIds.has(tgtId);
    });

    return {
      filteredNodes: baseNodes,
      filteredLinks: activeLinks,
    };
  }, [data.nodes, data.links, minConnections, searchQuery]);

  return (
    <div className="flex flex-col gap-2 h-[calc(100vh-6.5rem)]">
      {/* Barra de Ferramentas Ultra-Compacta (44px) e Organizada */}
      <div className="h-11 px-3 rounded-xl bg-surface border border-border shadow-2xs flex items-center justify-between gap-3 shrink-0">
        {/* Lado Esquerdo: Título e Contagem Compacta */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Share2 size={14} />
          </div>
          <span className="font-bold text-xs sm:text-sm text-text-title tracking-tight">
            Rede de Clientes
          </span>

          <div className="h-3.5 w-px bg-border hidden sm:block mx-0.5" />

          {/* Estatísticas Rápidas Integradas */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-text-muted">
            <span className="font-bold text-primary">{filteredNodes.length}</span> nós
            <span className="text-border">·</span>
            <span className="font-bold text-text-title">{filteredLinks.length}</span> conexões
          </div>
        </div>

        {/* Lado Direito: Ações em Linha Única */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Busca Rápida */}
          <div className="relative">
            <Search
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente..."
              className="pl-7 pr-6 py-1 h-7.5 w-32 sm:w-48 focus:w-60 text-xs rounded-lg border border-border bg-surface-subtle text-text-title placeholder:text-text-muted focus:outline-none focus:border-primary focus:bg-surface transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-title p-0.5 rounded-full cursor-pointer transition-colors"
                title="Limpar busca"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Filtro Mínimo de Companheiros */}
          <div className="flex items-center gap-1 text-xs bg-surface-subtle border border-border px-2 h-7.5 rounded-lg shrink-0 shadow-2xs">
            <Filter size={11} className="text-text-muted shrink-0" />
            <select
              value={minConnections}
              onChange={(e) => setMinConnections(Number(e.target.value))}
              className="bg-transparent text-text-title text-[11px] font-semibold focus:outline-none cursor-pointer pr-0.5"
              title="Filtrar por quantidade mínima de conexões"
            >
              <option value={1}>1+ conexão</option>
              <option value={2}>2+ conexões</option>
              <option value={3}>3+ conexões</option>
              <option value={5}>5+ conexões</option>
            </select>
          </div>

          {/* Botão de Atualização */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isPending}
            className="w-7.5 h-7.5 rounded-lg bg-surface-subtle hover:bg-surface-muted border border-border text-text-muted hover:text-text-title flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
            title="Recarregar dados"
          >
            <RefreshCw size={12} className={isPending ? "animate-spin text-primary" : ""} />
          </button>
        </div>
      </div>

      {/* Área Principal do Grafo */}
      <div className="flex-1 min-h-0 relative rounded-3xl overflow-hidden shadow-2xl">
        <SocialGraphCanvas
          nodes={filteredNodes}
          links={filteredLinks}
          selectedNodeId={selectedNode?.id || null}
          onSelectNode={(node) => setSelectedNode(node)}
        />

        {/* Card Rápido de Informações do Cliente */}
        <ClientQuickCard
          node={selectedNode}
          links={data.links}
          allNodes={data.nodes}
          onClose={() => setSelectedNode(null)}
          onSelectCompanion={(comp) => setSelectedNode(comp)}
        />
      </div>
    </div>
  );
}
