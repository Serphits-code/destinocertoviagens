"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Printer,
  Building2,
} from "lucide-react";
import type { EditorBlock } from "@/lib/editor-types";
import type { RoomEntry, RoomGuest } from "./RoomListView";
import { getGuestAge } from "@/lib/package-calc";

interface HotelRoomListPrintModalProps {
  open: boolean;
  onClose: () => void;
  excursionName?: string;
  destination?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  hospedagemBlocks: EditorBlock[];
  roomsByBlock: Record<string, RoomEntry[]>;
  birthdaysMap: Record<string, string>;
}

function fmtDateBR(dateStr?: string | null) {
  if (!dateStr) return "-";
  const clean = dateStr.slice(0, 10);
  const parts = clean.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("pt-BR");
}

function formatCPF(doc?: string | null) {
  if (!doc) return "-";
  const digits = doc.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return doc;
}

function calculateNights(start?: string | null, end?: string | null): number {
  if (!start || !end) return 0;
  const d1 = new Date(start.slice(0, 10));
  const d2 = new Date(end.slice(0, 10));
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function HotelRoomListPrintModal({
  open,
  onClose,
  excursionName,
  destination,
  periodStart,
  periodEnd,
  hospedagemBlocks,
  roomsByBlock,
  birthdaysMap,
}: HotelRoomListPrintModalProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string>("all");

  const nights = useMemo(
    () => calculateNights(periodStart, periodEnd),
    [periodStart, periodEnd]
  );

  // Filtra as hospedagens a serem exibidas
  const filteredBlocks = useMemo(() => {
    if (selectedBlockId === "all") return hospedagemBlocks;
    return hospedagemBlocks.filter((b) => b.id === selectedBlockId);
  }, [hospedagemBlocks, selectedBlockId]);

  // Estatísticas das hospedagens exibidas
  const stats = useMemo(() => {
    let totalRooms = 0;
    let totalGuests = 0;
    let totalAdults = 0;
    let totalChildren = 0;
    let totalBabies = 0;
    const roomTypeCounts: Record<string, number> = {};

    for (const b of filteredBlocks) {
      const rooms = roomsByBlock[b.id] || [];
      for (const r of rooms) {
        totalRooms++;
        const tipo = r.tipo?.trim() || "Padrão";
        roomTypeCounts[tipo] = (roomTypeCounts[tipo] || 0) + 1;

        for (const g of r.hospedes) {
          totalGuests++;
          const t = (g.tipo || "").toLowerCase();
          if (t.includes("bebê") || t.includes("bebe")) {
            totalBabies++;
          } else if (t.includes("criança") || t.includes("crianca")) {
            totalChildren++;
          } else {
            totalAdults++;
          }
        }
      }
    }

    return {
      totalRooms,
      totalGuests,
      totalAdults,
      totalChildren,
      totalBabies,
      roomTypeCounts,
    };
  }, [filteredBlocks, roomsByBlock]);

  // Função de impressão via iframe isolado: evita páginas em branco causadas por modais/transforms
  const handlePrint = () => {
    const printableEl = document.getElementById("hotel-roomlist-printable");
    if (!printableEl) return;

    // Remove qualquer iframe de impressão anterior
    const oldIframe = document.getElementById("hotel-print-iframe");
    if (oldIframe) oldIframe.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "hotel-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Rooming List Oficial - ${excursionName || "Hotel"}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              background: #ffffff !important;
              padding: 0;
              margin: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              font-size: 11px;
              line-height: 1.35;
            }
            .header-container {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 12px;
              margin-bottom: 12px;
            }
            .logo-section {
              display: flex;
              align-items: center;
              gap: 14px;
            }
            .logo-img {
              height: 48px;
              width: auto;
              object-fit: contain;
            }
            .title-main {
              font-size: 18px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: -0.5px;
              color: #0f172a;
            }
            .title-sub {
              font-size: 9px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #475569;
            }
            .meta-section {
              text-align: right;
              font-size: 10px;
              color: #475569;
            }
            .meta-bold {
              font-weight: 700;
              color: #0f172a;
            }
            .status-badge {
              display: inline-block;
              margin-top: 3px;
              padding: 2px 6px;
              background: #f1f5f9;
              border: 1px solid #cbd5e1;
              border-radius: 4px;
              font-weight: 700;
              font-size: 9px;
              color: #1e293b;
            }
            .trip-info-box {
              display: flex;
              justify-content: space-between;
              padding: 8px 12px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              margin-bottom: 10px;
              gap: 16px;
            }
            .trip-info-col {
              flex: 1;
            }
            .info-row {
              margin-bottom: 3px;
              font-size: 11px;
            }
            .info-label {
              font-weight: 700;
              color: #334155;
            }
            .info-val {
              font-weight: 800;
              color: #0f172a;
            }
            .stats-grid {
              display: flex;
              gap: 8px;
              margin-bottom: 12px;
            }
            .stat-card {
              flex: 1;
              padding: 6px 8px;
              background: #f1f5f9;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              text-align: center;
            }
            .stat-label {
              font-size: 8px;
              font-weight: 700;
              text-transform: uppercase;
              color: #475569;
            }
            .stat-val {
              font-size: 14px;
              font-weight: 900;
              color: #0f172a;
              margin-top: 1px;
            }
            .stat-pax {
              flex: 2;
              text-align: left;
              padding: 6px 10px;
            }
            .room-card {
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              margin-bottom: 9px;
              overflow: hidden;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .room-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              background: #f1f5f9;
              padding: 5px 8px;
              border-bottom: 1px solid #cbd5e1;
            }
            .room-title {
              font-size: 11px;
              font-weight: 900;
              color: #0f172a;
            }
            .room-badge {
              display: inline-block;
              margin-left: 6px;
              padding: 1px 5px;
              background: #ffffff;
              border: 1px solid #cbd5e1;
              border-radius: 3px;
              font-size: 9px;
              font-weight: 700;
              color: #334155;
              text-transform: uppercase;
            }
            .room-count {
              font-size: 9px;
              font-weight: 600;
              color: #475569;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
            }
            th {
              background: #f8fafc;
              border-bottom: 1px solid #e2e8f0;
              padding: 4px 6px;
              text-align: left;
              font-size: 8px;
              font-weight: 700;
              text-transform: uppercase;
              color: #475569;
            }
            td {
              padding: 4px 6px;
              border-bottom: 1px solid #f1f5f9;
              vertical-align: middle;
            }
            tr:last-child td {
              border-bottom: none;
            }
            .td-order {
              text-align: center;
              font-weight: 700;
              color: #94a3b8;
              width: 22px;
            }
            .td-name {
              font-weight: 700;
              color: #0f172a;
            }
            .td-doc {
              font-family: monospace;
              color: #334155;
            }
            .td-center {
              text-align: center;
            }
            .guest-type-tag {
              display: inline-block;
              padding: 1px 4px;
              background: #f1f5f9;
              border: 1px solid #e2e8f0;
              border-radius: 3px;
              font-size: 8px;
              font-weight: 600;
            }
            .signatures-box {
              margin-top: 24px;
              padding-top: 12px;
              border-top: 2px solid #cbd5e1;
              display: flex;
              justify-content: space-around;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .sign-col {
              text-align: center;
              width: 42%;
            }
            .sign-line {
              border-bottom: 1px solid #64748b;
              height: 28px;
              margin-bottom: 5px;
            }
            .sign-role {
              font-size: 10px;
              font-weight: 700;
              color: #0f172a;
            }
            .sign-sub {
              font-size: 8px;
              color: #64748b;
            }
            .doc-footer {
              text-align: center;
              font-size: 8px;
              color: #94a3b8;
              margin-top: 12px;
            }
          </style>
        </head>
        <body>
          ${printableEl.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    const triggerPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("Erro ao imprimir via iframe:", err);
        window.print();
      }
    };

    // Aguarda o carregamento da imagem do logotipo antes de abrir a caixa de diálogo de impressão
    const img = iframe.contentWindow?.document.querySelector("img");
    if (img && !img.complete) {
      img.onload = () => setTimeout(triggerPrint, 150);
      img.onerror = () => setTimeout(triggerPrint, 150);
    } else {
      setTimeout(triggerPrint, 200);
    }
  };

  if (!open) return null;

  const emitDateStr = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden my-auto"
        >
          {/* Header de Ações no Modal */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-border bg-surface-subtle/70">
            <div>
              <h3 className="text-base font-bold text-text-title flex items-center gap-2">
                <Printer size={18} className="text-primary" />
                Rooming List Oficial para o Hotel
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Visualização formatada para entrega na recepção, impressão A4 ou salvar como PDF.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {hospedagemBlocks.length > 1 && (
                <select
                  value={selectedBlockId}
                  onChange={(e) => setSelectedBlockId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-border bg-surface text-xs font-semibold text-text-title focus:outline-none focus:border-primary"
                >
                  <option value="all">Todas as Hospedagens ({hospedagemBlocks.length})</option>
                  {hospedagemBlocks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.data.hotel || b.title || "Hospedagem"}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:bg-primary-hover transition-all cursor-pointer"
              >
                <Printer size={14} />
                <span>Imprimir / Salvar PDF</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-title hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* DOCUMENTO RENDERIZADO (Clonado pelo iframe para impressão e visível no modal) */}
          <div
            id="hotel-roomlist-printable"
            className="p-6 sm:p-8 bg-white text-slate-900 max-h-[calc(85vh-90px)] overflow-y-auto space-y-4"
          >
            {/* CABEÇALHO DO DOCUMENTO COM LOGO */}
            <div className="header-container flex items-center justify-between border-b-2 border-slate-900 pb-3">
              <div className="logo-section flex items-center gap-3">
                <img
                  src="/logo-color.svg"
                  alt="Destino Certo Viagens"
                  className="logo-img h-12 w-auto object-contain"
                />
                <div>
                  <h1 className="title-main text-xl font-black uppercase tracking-tight text-slate-900">
                    Rooming List Oficial
                  </h1>
                  <p className="title-sub text-[10px] font-bold text-slate-600 tracking-wider uppercase">
                    Destino Certo Viagens & Turismo • Documento de Check-in
                  </p>
                </div>
              </div>

              <div className="meta-section text-right text-[10px] text-slate-600">
                <div className="meta-bold font-bold text-slate-900">Data de Emissão:</div>
                <div>{emitDateStr}</div>
                <div className="status-badge inline-block mt-1 px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-semibold text-[9px] text-slate-800">
                  Status: Confirmado
                </div>
              </div>
            </div>

            {/* DADOS DA EXCURSÃO E HOSPEDAGEM */}
            <div className="trip-info-box flex justify-between gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <div className="trip-info-col space-y-1">
                <div className="info-row">
                  <span className="info-label font-bold text-slate-700">Excursão / Pacote: </span>
                  <span className="info-val font-black text-slate-900">{excursionName || "Excursão"}</span>
                </div>
                {destination && (
                  <div className="info-row">
                    <span className="info-label font-bold text-slate-700">Destino: </span>
                    <span className="info-val text-slate-900">{destination}</span>
                  </div>
                )}
                <div className="info-row">
                  <span className="info-label font-bold text-slate-700">Hospedagem: </span>
                  <span className="info-val font-black text-slate-900">
                    {filteredBlocks.length === 1
                      ? filteredBlocks[0].data.hotel || filteredBlocks[0].title || "Hotel"
                      : `${filteredBlocks.length} Hospedagens`}
                  </span>
                </div>
              </div>

              <div className="trip-info-col space-y-1 text-right">
                <div className="info-row">
                  <span className="info-label font-bold text-slate-700">Check-in: </span>
                  <span className="info-val font-black text-slate-900">{fmtDateBR(periodStart)}</span>
                  <span className="mx-1 text-slate-400">•</span>
                  <span className="info-label font-bold text-slate-700">Check-out: </span>
                  <span className="info-val font-black text-slate-900">{fmtDateBR(periodEnd)}</span>
                </div>
                {nights > 0 && (
                  <div className="info-row font-semibold text-slate-700">
                    Período: {nights} diária{nights !== 1 ? "s" : ""} ({nights + 1} dias)
                  </div>
                )}
                <div className="text-slate-600 font-medium">
                  {stats.totalRooms} quartos alocados • {stats.totalGuests} hóspedes
                </div>
              </div>
            </div>

            {/* RESUMO OPERACIONAL RÁPIDO PARA O HOTEL */}
            <div className="stats-grid flex gap-2 text-center text-xs">
              <div className="stat-card p-2 bg-slate-100 border border-slate-200 rounded-lg">
                <div className="stat-label text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                  Total de Quartos
                </div>
                <div className="stat-val text-base font-black text-slate-900 mt-0.5">
                  {stats.totalRooms}
                </div>
              </div>

              <div className="stat-card p-2 bg-slate-100 border border-slate-200 rounded-lg">
                <div className="stat-label text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                  Total de Hóspedes
                </div>
                <div className="stat-val text-base font-black text-slate-900 mt-0.5">
                  {stats.totalGuests}
                </div>
              </div>

              <div className="stat-card stat-pax p-2 bg-slate-100 border border-slate-200 rounded-lg text-left px-3">
                <div className="stat-label text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                  Perfil dos Passageiros
                </div>
                <div className="text-xs font-semibold text-slate-800 mt-1 flex items-center justify-between">
                  <span>Adultos: <strong>{stats.totalAdults}</strong></span>
                  <span>Crianças: <strong>{stats.totalChildren}</strong></span>
                  <span>Bebês: <strong>{stats.totalBabies}</strong></span>
                </div>
              </div>
            </div>

            {/* TABELA DE QUARTOS E HÓSPEDES AGRUPADOS POR HOSPEDAGEM */}
            <div className="space-y-4 pt-1">
              {filteredBlocks.map((block) => {
                const hotelName = block.data.hotel || block.title || "Hospedagem";
                const hotelRooms = roomsByBlock[block.id] || [];

                return (
                  <div key={block.id} className="space-y-3">
                    {/* Título da Hospedagem (se houver mais de uma) */}
                    {filteredBlocks.length > 1 && (
                      <div className="flex items-center gap-2 border-b border-slate-300 pb-1 pt-1">
                        <Building2 size={15} className="text-slate-700" />
                        <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                          {hotelName} ({hotelRooms.length} quartos)
                        </h2>
                      </div>
                    )}

                    {hotelRooms.length === 0 ? (
                      <div className="text-center py-3 text-slate-500 text-xs italic border border-dashed border-slate-300 rounded-lg">
                        Nenhum quarto configurado para esta hospedagem.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {hotelRooms.map((room, rIdx) => {
                          const roomLabel = room.numero ? `Quarto ${room.numero}` : `Quarto ${rIdx + 1}`;

                          return (
                            <div
                              key={rIdx}
                              className="room-card border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs"
                            >
                              {/* Faixa Superior do Quarto */}
                              <div className="room-header bg-slate-100 px-3 py-1 border-b border-slate-300 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="room-title font-black text-slate-900 text-xs">
                                    {roomLabel}
                                  </span>
                                  <span className="room-badge px-2 py-0.5 rounded bg-white border border-slate-300 text-[10px] font-bold text-slate-700 uppercase">
                                    {room.tipo || "Acomodação"}
                                  </span>
                                </div>

                                <div className="room-count text-[10px] text-slate-600 font-semibold">
                                  {room.hospedes.length} hóspede{room.hospedes.length !== 1 ? "s" : ""} alocado{room.hospedes.length !== 1 ? "s" : ""}
                                </div>
                              </div>

                              {/* Tabela de Hóspedes do Quarto */}
                              {room.hospedes.length === 0 ? (
                                <div className="px-3 py-2 text-slate-400 text-xs italic">
                                  Quarto vago (nenhum hóspede alocado).
                                </div>
                              ) : (
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                                      <th className="py-1 px-2.5 w-6 text-center">#</th>
                                      <th className="py-1 px-2.5">Nome Completo do Hóspede</th>
                                      <th className="py-1 px-2.5">Documento (CPF / RG)</th>
                                      <th className="py-1 px-2.5 text-center">Data Nasc.</th>
                                      <th className="py-1 px-2.5 text-center">Idade</th>
                                      <th className="py-1 px-2.5 text-center">Categoria</th>
                                      <th className="py-1 px-2.5">Observações / Cama Extra</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200">
                                    {room.hospedes.map((g, gIdx) => {
                                      const bDateStr =
                                        g.birthDate ||
                                        (g.customerId ? birthdaysMap[g.customerId] : null) ||
                                        (g.nome ? birthdaysMap[g.nome.trim().toLowerCase()] : null);

                                      const age = bDateStr
                                        ? getGuestAge({ birthDate: bDateStr }, periodStart)
                                        : null;

                                      return (
                                        <tr key={g.id || gIdx} className="hover:bg-slate-50/50">
                                          <td className="td-order py-1 px-2.5 text-center text-slate-400 font-bold text-[10px]">
                                            {gIdx + 1}
                                          </td>
                                          <td className="td-name py-1 px-2.5 font-bold text-slate-900">
                                            {g.nome || "Nome não informado"}
                                          </td>
                                          <td className="td-doc py-1 px-2.5 font-mono text-slate-700">
                                            {formatCPF(g.documento)}
                                          </td>
                                          <td className="td-center py-1 px-2.5 text-center text-slate-700">
                                            {fmtDateBR(bDateStr)}
                                          </td>
                                          <td className="td-center py-1 px-2.5 text-center font-semibold text-slate-800">
                                            {age !== null ? `${age} anos` : "-"}
                                          </td>
                                          <td className="td-center py-1 px-2.5 text-center">
                                            <span className="guest-type-tag px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                                              {g.tipo || "Adulto"}
                                            </span>
                                          </td>
                                          <td className="py-1 px-2.5 text-slate-600 text-[10px]">
                                            {g.isExtra && (
                                              <span className="font-bold text-amber-700 mr-1">[Cama Extra]</span>
                                            )}
                                            {g.observacao || (!g.isExtra ? "-" : "")}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* PROTOCOLO DE ENTREGA E RECEBIMENTO */}
            <div className="signatures-box pt-6 border-t-2 border-slate-300 mt-6 flex justify-around text-xs text-slate-700">
              <div className="sign-col space-y-2 text-center w-2/5">
                <div className="sign-line border-b border-slate-400 h-8 w-4/5 mx-auto" />
                <div>
                  <div className="sign-role font-bold text-slate-900">Responsável / Guia da Agência</div>
                  <div className="sign-sub text-[10px] text-slate-500">Destino Certo Viagens & Turismo</div>
                </div>
              </div>

              <div className="sign-col space-y-2 text-center w-2/5">
                <div className="sign-line border-b border-slate-400 h-8 w-4/5 mx-auto" />
                <div>
                  <div className="sign-role font-bold text-slate-900">Recepção do Hotel / Check-in</div>
                  <div className="sign-sub text-[10px] text-slate-500">Carimbo e Assinatura do Recepcionista</div>
                </div>
              </div>
            </div>

            <div className="doc-footer text-center text-[9px] text-slate-400 pt-1">
              Documento gerado pelo sistema Destino Certo Viagens. Todos os direitos reservados.
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
