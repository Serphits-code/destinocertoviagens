"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ExternalLink,
  MapPin,
  Users,
  Compass,
  Calendar,
  Sparkles,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import type { SocialNode, SocialLink } from "@/lib/actions/social-network";

interface ClientQuickCardProps {
  node: SocialNode | null;
  links: SocialLink[];
  allNodes: SocialNode[];
  onClose: () => void;
  onSelectCompanion: (companionNode: SocialNode) => void;
}

export function ClientQuickCard({
  node,
  links,
  allNodes,
  onClose,
  onSelectCompanion,
}: ClientQuickCardProps) {
  if (!node) return null;

  // Descobre todos os companheiros conectados a este nó
  const connectedNeighbors: Array<{
    companionNode: SocialNode;
    weight: number;
    trips: string[];
  }> = [];

  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));
  const seenNeighborIds = new Set<string>();

  links.forEach((l) => {
    const srcId = typeof l.source === "object" ? (l.source as any).id : l.source;
    const tgtId = typeof l.target === "object" ? (l.target as any).id : l.target;

    const otherId = srcId === node.id ? tgtId : tgtId === node.id ? srcId : null;
    if (!otherId || seenNeighborIds.has(otherId) || !nodeMap.has(otherId)) return;

    seenNeighborIds.add(otherId);
    connectedNeighbors.push({
      companionNode: nodeMap.get(otherId)!,
      weight: l.weight,
      trips: l.trips,
    });
  });

  // Ordena companheiros por quantidade de viagens juntos
  connectedNeighbors.sort((a, b) => b.weight - a.weight);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 40, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 40, scale: 0.95 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="absolute top-5 right-5 w-80 sm:w-96 max-h-[calc(100%-40px)] bg-surface/95 backdrop-blur-xl border border-border/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-20"
      >
        {/* Cabeçalho do Card */}
        <div className="p-5 border-b border-border/60 bg-gradient-to-br from-surface-subtle to-surface relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-text-muted hover:text-text-title hover:bg-surface-muted transition-colors cursor-pointer"
            title="Fechar card"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-3.5 pr-6">
            {/* Avatar com cor do Nó */}
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-white text-lg shrink-0 shadow-md"
              style={{ backgroundColor: node.color }}
            >
              {node.name ? node.name.slice(0, 2).toUpperCase() : <UserCheck size={20} />}
            </div>

            <div className="min-w-0 flex-1">
              {/* Nome do Cliente com Link Direto para /clientes/[id] */}
              <Link
                href={`/clientes/${node.id}`}
                className="group/name flex items-center gap-1.5 text-text-title hover:text-primary transition-colors"
                title="Abrir cadastro completo deste cliente"
              >
                <h3 className="font-extrabold text-base leading-tight truncate group-hover/name:underline">
                  {node.name}
                </h3>
                <ExternalLink size={14} className="shrink-0 text-text-muted group-hover/name:text-primary" />
              </Link>

              {/* Localização */}
              <p className="text-xs text-text-muted flex items-center gap-1 mt-1 truncate">
                <MapPin size={12} className="text-primary shrink-0" />
                <span>
                  {node.city && node.state
                    ? `${node.city}, ${node.state}`
                    : node.city || "Brasil"}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Métricas Rápidas */}
        <div className="grid grid-cols-2 gap-3 p-4 border-b border-border/60 bg-surface-subtle/40">
          <div className="p-3 rounded-2xl bg-surface border border-border/60 text-center">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
              Viagens
            </span>
            <span className="font-black text-xl text-primary mt-0.5 block">
              {node.tripsCount}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-surface border border-border/60 text-center">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
              Companheiros
            </span>
            <span className="font-black text-xl text-text-title mt-0.5 block">
              {node.companionsCount}
            </span>
          </div>
        </div>

        {/* Lista de Companheiros Conectados no Grafo */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Users size={13} className="text-primary" />
              <span>Rede de Viagens ({connectedNeighbors.length})</span>
            </h4>
            <span className="text-[10px] text-text-muted">Clique para navegar</span>
          </div>

          {connectedNeighbors.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-4 italic">
              Nenhum outro passageiro vinculado em viagens conjuntas.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {connectedNeighbors.map(({ companionNode, weight, trips }) => (
                <div
                  key={companionNode.id}
                  onClick={() => onSelectCompanion(companionNode)}
                  className="group/comp flex items-center justify-between p-2.5 rounded-xl border border-border/70 hover:border-primary/50 bg-surface hover:bg-primary/5 transition-all cursor-pointer shadow-2xs"
                  title="Focar este cliente no grafo"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                      style={{ backgroundColor: companionNode.color }}
                    >
                      {companionNode.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-text-title group-hover/comp:text-primary transition-colors truncate">
                        {companionNode.name}
                      </p>
                      <p className="text-[10px] text-text-muted truncate">
                        {trips[0] || `${weight} viagem(ns) em conjunto`}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-surface-muted text-text-muted group-hover/comp:bg-primary group-hover/comp:text-white transition-colors shrink-0">
                    {weight}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé: Botão de Navegação Completa para o Cliente */}
        <div className="p-4 border-t border-border/60 bg-surface">
          <Link
            href={`/clientes/${node.id}`}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-strong text-white font-bold text-xs transition-all shadow-md cursor-pointer"
          >
            <span>Ver Cadastro Completo do Cliente</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
