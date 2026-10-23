"use client";

import React, { useRef } from "react";
import { X, Printer, Plane, Calendar, ShieldCheck, MapPin } from "lucide-react";
import type { EditorBlock, AereoBlockData, FlightPassengerAllocation } from "@/lib/editor-types";

interface FlightManifestModalProps {
  isOpen: boolean;
  onClose: () => void;
  block: EditorBlock;
  journeyTitle: string;
  journeyRoute: string;
  journeyFlights: Array<{
    cia?: string;
    voo?: string;
    origem?: string;
    destino?: string;
    saida?: string;
    chegada?: string;
    tipo?: string;
  }>;
  allocations: FlightPassengerAllocation[];
  excursionName?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  destination?: string | null;
}

export function FlightManifestModal({
  isOpen,
  onClose,
  block,
  journeyTitle,
  journeyRoute,
  journeyFlights,
  allocations,
  excursionName,
  periodStart,
  periodEnd,
  destination,
}: FlightManifestModalProps) {
  const printableRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const data = block.data as AereoBlockData;
  const localizador = data.localizador || "---";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-surface w-full max-w-4xl max-h-[92vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Barra superior de ações */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-subtle print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Printer size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-title">
                Manifesto de Voo &amp; Lista de Embarque
              </h3>
              <p className="text-xs text-text-muted">
                {journeyTitle} • {journeyRoute} ({allocations.length} passageiros)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-strong transition-all cursor-pointer shadow-sm"
            >
              <Printer size={14} /> Imprimir / Salvar PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-text-muted hover:text-text-title hover:bg-surface transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Conteúdo Imprimível */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white text-slate-900 print:p-0 print:m-0 print:overflow-visible">
          <div ref={printableRef} className="space-y-6">
            {/* Cabeçalho da Agência */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                  DESTINO CERTO VIAGENS
                </h1>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Manifesto de Embarque e Alocação Aérea
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-700">
                  {excursionName && (
                    <span className="font-bold bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                      Viagem: {excursionName}
                    </span>
                  )}
                  {destination && (
                    <span className="flex items-center gap-1 font-medium">
                      <MapPin size={12} /> {destination}
                    </span>
                  )}
                  {periodStart && (
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar size={12} /> {periodStart} {periodEnd ? `até ${periodEnd}` : ""}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Localizador
                </span>
                <span className="text-xl font-black font-mono text-blue-600 border border-blue-200 bg-blue-50 px-3 py-1 rounded-lg inline-block">
                  {localizador}
                </span>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Card: {block.title || "Aéreo"}
                </span>
              </div>
            </div>

            {/* Informações dos Voos / Trechos */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="uppercase flex items-center gap-1.5">
                  <Plane size={14} className="text-blue-600" /> Detalhes dos Voos do Trecho
                </span>
                <span>
                  {allocations.length} {allocations.length === 1 ? "Passageiro Alocado" : "Passageiros Alocados"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {journeyFlights.map((f, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-extrabold text-blue-700">
                        {f.cia || "Cia"} {f.voo ? `Voo ${f.voo}` : ""}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase">
                        {i === 0 ? "Voo Principal" : "Conexão"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-mono font-bold text-sm text-slate-900 pt-1">
                      <span>{f.origem || "---"} ({f.saida || "--:--"})</span>
                      <span className="text-slate-400 text-xs">➔</span>
                      <span>{f.destino || "---"} ({f.chegada || "--:--"})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabela de Passageiros */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Relação Nominal de Passageiros</span>
                <span>Total: {allocations.length}</span>
              </div>

              {allocations.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-xl text-slate-400 text-xs">
                  Nenhum passageiro alocado neste trecho ainda.
                </div>
              ) : (
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-2.5 w-10 text-center">#</th>
                      <th className="py-2 px-2.5">Nome Completo</th>
                      <th className="py-2 px-2.5">Documento</th>
                      <th className="py-2 px-2.5">Quarto</th>
                      <th className="py-2 px-2.5 text-center">Assento</th>
                      <th className="py-2 px-2.5 text-center">E-Ticket / Bilhete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {allocations.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-slate-50">
                        <td className="py-2 px-2.5 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2.5 font-bold text-slate-900">
                          {p.nome}
                          {p.tipo && (
                            <span className="ml-1.5 text-[10px] font-medium text-slate-500">
                              ({p.tipo})
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 font-mono text-slate-700">
                          {p.documento || "---"}
                        </td>
                        <td className="py-2 px-2.5 text-slate-600">
                          {p.roomNumber || "---"}
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono font-bold text-blue-700">
                          {p.seat || "---"}
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono text-slate-700">
                          {p.ticketNumber || "---"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Rodapé do Manifesto */}
            <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 font-semibold">
                <ShieldCheck size={13} className="text-emerald-600" /> Destino Certo Viagens • Documento Oficial de Embarque
              </span>
              <span>
                Emitido em: {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
