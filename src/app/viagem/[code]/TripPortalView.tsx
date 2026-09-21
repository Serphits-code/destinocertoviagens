// src/app/viagem/[code]/TripPortalView.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  Calendar,
  MapPin,
  Plane,
  Bus,
  Hotel,
  Clock,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  Printer,
  Share2,
  Info,
  ShieldCheck,
  Sparkles,
  Luggage,
  FileText,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import type { PublicTripData } from "@/lib/actions/share-package";
import { verifyTripPassword } from "@/lib/actions/share-package";
import "leaflet/dist/leaflet.css";

interface TripPortalViewProps {
  trip: PublicTripData;
  shareCode: string;
}

export function TripPortalView({ trip, shareCode }: TripPortalViewProps) {
  const [unlocked, setUnlocked] = useState(!trip.hasPassword);
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Mapa
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);

  // Verifica se já foi autenticado nesta sessão do navegador
  useEffect(() => {
    if (trip.hasPassword && typeof window !== "undefined") {
      const stored = sessionStorage.getItem(`trip_unlocked_${shareCode}`);
      if (stored === "true") {
        setUnlocked(true);
      }
    }
  }, [trip.hasPassword, shareCode]);

  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!passwordInput.trim()) {
      setPasswordError("Digite a senha para acessar.");
      return;
    }

    setIsVerifying(true);
    setPasswordError("");

    try {
      const res = await verifyTripPassword(shareCode, passwordInput);
      if (res.success) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(`trip_unlocked_${shareCode}`, "true");
        }
        setUnlocked(true);
      } else {
        setPasswordError(res.message || "Senha incorreta.");
      }
    } catch {
      setPasswordError("Erro ao validar senha. Tente novamente.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Inicializa mapa quando desbloqueado
  useEffect(() => {
    if (!unlocked || !mapContainerRef.current) return;
    let isSubscribed = true;

    async function initMap() {
      const L = (await import("leaflet")).default;
      if (!isSubscribed || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Pontos no mapa: destinos + paradas do roteiro
      const points: Array<{ lat: number; lng: number; title: string; category?: string }> = [];

      for (const d of trip.destinations) {
        if (d.latitude && d.longitude) {
          points.push({ lat: d.latitude, lng: d.longitude, title: d.name, category: "Destino" });
        }
      }

      for (const item of trip.itinerary) {
        if (item.latitude && item.longitude) {
          points.push({
            lat: item.latitude,
            lng: item.longitude,
            title: item.title || item.location || "Ponto de Parada",
            category: "Roteiro",
          });
        }
      }

      // Se não houver coordenadas, usa Fernando de Noronha como fallback
      const defaultLat = points[0]?.lat || -3.854;
      const defaultLng = points[0]?.lng || -32.429;

      const map = L.map(mapContainerRef.current).setView([defaultLat, defaultLng], points.length > 1 ? 12 : 13);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Ícone customizado
      const pinIcon = L.divIcon({
        className: "custom-leaflet-pin",
        html: `
          <div style="background-color: #2563EB; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30],
      });

      const bounds = L.latLngBounds([]);

      for (const pt of points) {
        const marker = L.marker([pt.lat, pt.lng], { icon: pinIcon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 13px; font-weight: 700; color: #1e293b;">
            <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">${pt.category}</div>
            ${pt.title}
          </div>
        `);
        bounds.extend([pt.lat, pt.lng]);
      }

      if (points.length > 1) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }

    initMap();

    return () => {
      isSubscribed = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [unlocked, trip.destinations, trip.itinerary]);

  // Formatação de datas amigável (ex: 09 de Maio de 2026)
  const formatTripDates = () => {
    if (!trip.periodStart) return "Data a confirmar";
    try {
      const d1 = new Date(trip.periodStart + "T12:00:00");
      const d2 = trip.periodEnd ? new Date(trip.periodEnd + "T12:00:00") : null;

      const day1 = d1.getDate().toString().padStart(2, "0");
      const month1 = d1.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      const year1 = d1.getFullYear();

      if (!d2) return `${day1} de ${month1} de ${year1}`;

      const day2 = d2.getDate().toString().padStart(2, "0");
      const month2 = d2.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      const year2 = d2.getFullYear();

      if (month1 === month2 && year1 === year2) {
        return `${day1} a ${day2} de ${month1} de ${year1}`;
      }
      return `${day1} de ${month1} a ${day2} de ${month2} de ${year2}`;
    } catch {
      return `${trip.periodStart} a ${trip.periodEnd}`;
    }
  };

  // Se bloqueado por senha, exibe a tela de login
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6"
        >
          {/* Logo / Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/15 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto mb-3">
              <Lock size={26} />
            </div>
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block">
              Destino Certo Viagens
            </span>
            <h1 className="text-xl font-bold text-white leading-tight">
              {trip.title || "Guia da Viagem"}
            </h1>
            <p className="text-xs text-slate-400">
              Digite a senha fornecida pela agência para acessar os detalhes, voos e roteiro da sua viagem.
            </p>
          </div>

          {/* Form de Senha */}
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Senha de Acesso
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Digite a senha..."
                  className="w-full pl-4 pr-11 py-3 text-sm font-semibold rounded-xl border border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {passwordError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 pt-1">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <span>Acessar Roteiro da Viagem</span>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500">
              Precisa de ajuda com sua senha? Entre em contato com seu agente da Destino Certo.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // PORTAL DO CLIENTE DESBLOQUEADO (100% LIVRE DE VALORES FINANCEIROS)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Topo / Barra de Navegação */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md">
            DC
          </div>
          <div>
            <span className="text-xs font-bold text-white tracking-wide block">
              Destino Certo Viagens
            </span>
            <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider block">
              Guia Exclusivo do Passageiro
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            title="Imprimir ou Salvar Roteiro em PDF"
          >
            <Printer size={14} className="text-blue-400" />
            <span className="hidden sm:inline">Imprimir / PDF</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* 1. Hero da Viagem */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900/40 via-slate-900 to-slate-900 border border-slate-800/80 p-6 sm:p-10 shadow-2xl">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-bold">
              <Sparkles size={14} />
              <span>Viagem Confirmada</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              {trip.title}
            </h1>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-slate-300 pt-1">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-blue-400 shrink-0" />
                <span className="font-semibold">{formatTripDates()}</span>
              </div>

              {trip.destination && (
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-emerald-400 shrink-0" />
                  <span className="font-semibold">{trip.destination}</span>
                </div>
              )}
            </div>

            {trip.airlineLocator && (
              <div className="pt-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 font-mono">
                  <Plane size={14} className="text-blue-400" />
                  <span>Localizador Geral (PNR):</span>
                  <span className="font-black text-white">{trip.airlineLocator}</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 2. Mapa Interativo dos Destinos e Roteiro */}
        <section className="bg-slate-900/90 rounded-3xl border border-slate-800/80 p-5 sm:p-7 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-600/15 text-blue-400">
                <Compass size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Mapa da Viagem &amp; Locais</h2>
                <p className="text-xs text-slate-400">
                  Navegue pelos pontos de parada, passeios e hospedagens no mapa interativo
                </p>
              </div>
            </div>
          </div>

          <div
            ref={mapContainerRef}
            className="w-full h-72 sm:h-96 rounded-2xl overflow-hidden border border-slate-800 z-10"
          />
        </section>

        {/* 3. Voos e Transporte Rodoviário */}
        {(trip.flights.length > 0 || trip.transports.length > 0) && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-lg">
              <Plane size={22} className="text-blue-400" />
              <h2>Transporte &amp; Logística</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Voos Aéreos */}
              {trip.flights.map((flight, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20">
                      {flight.tipo || "Trecho Aéreo"}
                    </span>
                    <span className="text-xs font-black text-slate-400">
                      {flight.cia || "Companhia Aérea"} {flight.voo ? `• Voo ${flight.voo}` : ""}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-y border-slate-800/80">
                    <div className="text-left">
                      <span className="text-[11px] text-slate-400 block">Origem</span>
                      <span className="text-lg font-black text-white">{flight.origem || "---"}</span>
                      {flight.saida && (
                        <span className="text-xs text-blue-400 font-bold block">{flight.saida}</span>
                      )}
                    </div>

                    <div className="flex flex-col items-center px-4">
                      <Plane size={20} className="text-slate-500 rotate-90" />
                      <span className="text-[10px] text-slate-500 mt-1">Direto</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">Destino</span>
                      <span className="text-lg font-black text-white">{flight.destino || "---"}</span>
                      {flight.chegada && (
                        <span className="text-xs text-blue-400 font-bold block">{flight.chegada}</span>
                      )}
                    </div>
                  </div>

                  {flight.status && (
                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Status do Voo:</span>
                      <span className="font-bold text-emerald-400">{flight.status}</span>
                    </div>
                  )}
                </div>
              ))}

              {/* Transporte Terrestre / Vans / Ônibus */}
              {trip.transports.map((transp, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                      <Bus size={12} />
                      <span>{transp.veiculo || "Transporte Terrestre"}</span>
                    </span>
                    {transp.empresa && (
                      <span className="text-xs text-slate-400 font-bold">{transp.empresa}</span>
                    )}
                  </div>

                  {transp.itinerario && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-400 block">
                        Itinerário / Trajeto:
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed font-medium">
                        {transp.itinerario}
                      </p>
                    </div>
                  )}

                  {/* Comodidades do Veículo */}
                  <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-400">
                    {transp.ar === "SIM" && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        ❄️ Ar-condicionado
                      </span>
                    )}
                    {transp.wifi === "SIM" && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        📶 Wi-Fi
                      </span>
                    )}
                    {transp.agua === "SIM" && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        💧 Água mineral
                      </span>
                    )}
                  </div>

                  {transp.observation && (
                    <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800">
                      {transp.observation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 4. Hospedagem & Pousadas */}
        {trip.lodgings.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-lg">
              <Hotel size={22} className="text-blue-400" />
              <h2>Hospedagem &amp; Acomodação</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trip.lodgings.map((lodging, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-white">{lodging.hotel}</h3>
                      {lodging.cidade && (
                        <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin size={12} className="text-blue-400" />
                          <span>{lodging.cidade}</span>
                        </span>
                      )}
                    </div>

                    {lodging.diarias && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/20 shrink-0">
                        {lodging.diarias}
                      </span>
                    )}
                  </div>

                  {lodging.periodo && (
                    <div className="text-xs text-slate-300 flex items-center gap-2 py-1 px-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                      <Calendar size={13} className="text-blue-400" />
                      <span>Período: {lodging.periodo}</span>
                    </div>
                  )}

                  {lodging.roomTypes && lodging.roomTypes.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-400 block">
                        Tipos de Acomodação:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {lodging.roomTypes.map((rt, rIdx) => (
                          <span
                            key={rIdx}
                            className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] text-slate-200"
                          >
                            Quarto {rt}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {lodging.observation && (
                    <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800">
                      {lodging.observation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 5. Roteiro Dia a Dia */}
        {trip.itinerary && trip.itinerary.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-lg">
              <Clock size={22} className="text-blue-400" />
              <h2>Roteiro Programado</h2>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              {trip.itinerary.map((item, idx) => (
                <div key={item.id || idx} className="flex gap-4 sm:gap-6 relative">
                  {/* Linha vertical do cronograma */}
                  {idx !== trip.itinerary.length - 1 && (
                    <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-slate-800" />
                  )}

                  {/* Marcador do dia */}
                  <div className="relative z-10 w-8 h-8 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-md">
                    {item.day || idx + 1}
                  </div>

                  {/* Detalhes da Atividade */}
                  <div className="flex-1 pb-6 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                        {item.time || `Dia ${item.day || idx + 1}`}
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-white">
                        {item.title}
                      </h4>
                    </div>

                    {item.location && (
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <MapPin size={12} className="text-emerald-400 shrink-0" />
                        <span>{item.location}</span>
                      </p>
                    )}

                    {item.observation && (
                      <p className="text-xs text-slate-300 leading-relaxed pt-1">
                        {item.observation}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 6. O que está Incluso na Viagem */}
        {(trip.includedItems.length > 0 || trip.customInclusions.length > 0) && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-lg">
              <CheckCircle2 size={22} className="text-emerald-400" />
              <h2>O que está Incluso</h2>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-3 shadow-xl">
              {trip.includedItems.map((inc, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={16} />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-200">
                    {inc.title}
                  </span>
                </div>
              ))}

              {trip.customInclusions.map((item, idx) => (
                <div
                  key={`custom-${idx}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={16} />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-200">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 7. Guia & Orientações Úteis */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Guia Responsável */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2.5 text-white font-bold">
              <User size={20} className="text-blue-400" />
              <h3>Guia Acompanhante</h3>
            </div>

            {trip.guides.length > 0 ? (
              trip.guides.map((g, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-white block">{g.nome}</span>
                      <span className="text-xs text-slate-400">
                        {g.tipo || "Guia Credenciado Destino Certo"}
                      </span>
                    </div>

                    {g.telefone && (
                      <a
                        href={`https://wa.me/55${g.telefone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600/15 text-emerald-400 border border-emerald-500/20 text-xs font-bold hover:bg-emerald-600/25 transition-colors"
                      >
                        <Phone size={13} />
                        <span>{g.telefone}</span>
                      </a>
                    )}
                  </div>

                  {g.observation && (
                    <p className="text-xs text-slate-400 italic pt-1">{g.observation}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">
                Acompanhamento por equipe e guia credenciado da Destino Certo Viagens durante os passeios.
              </p>
            )}
          </div>

          {/* Dicas e Orientações do Viajante */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2.5 text-white font-bold">
              <Info size={20} className="text-emerald-400" />
              <h3>Dicas &amp; Orientações Importantes</h3>
            </div>

            <ul className="text-xs text-slate-300 space-y-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <FileText size={15} className="text-blue-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Documentação:</strong> Leve documento original oficial com foto (RG ou CNH dentro da validade).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Luggage size={15} className="text-blue-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Bagagem:</strong> Chegue ao aeroporto/ponto de encontro com no mínimo 2h de antecedência.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck size={15} className="text-blue-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Taxas &amp; Preservação:</strong> Em destinos ecológicos como Fernando de Noronha, conserve seu comprovante da TPA e o ingresso do Parque Nacional sempre à mão.
                </span>
              </li>
            </ul>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-8 border-t border-slate-800/80 text-center text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-400">Destino Certo Viagens • Turismo e Lazer</p>
        <p>Este roteiro é exclusivo e confidencial para passageiros confirmados.</p>
      </footer>
    </div>
  );
}
