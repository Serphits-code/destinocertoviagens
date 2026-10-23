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
  Ticket,
  ArrowRightLeft,
  Copy,
  Check,
  BedDouble,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type {
  PublicTripData,
  PersonalizedPassenger,
  PersonalizedLodging,
  PersonalizedAddon,
} from "@/lib/actions/share-package";
import { authenticateTripGuest } from "@/lib/actions/share-package";
import "leaflet/dist/leaflet.css";

interface TripPortalViewProps {
  trip: PublicTripData;
  shareCode: string;
}

function formatCpf(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function TripPortalView({ trip, shareCode }: TripPortalViewProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [passenger, setPassenger] = useState<PersonalizedPassenger | null>(null);
  const [isMasterMode, setIsMasterMode] = useState(false);

  const [cpfInput, setCpfInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showMasterLogin, setShowMasterLogin] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [copiedVoucher, setCopiedVoucher] = useState<string | null>(null);

  // Mapa
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);

  // Restaura sessão salva
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedPassenger = sessionStorage.getItem(`trip_passenger_${shareCode}`);
        if (storedPassenger) {
          setPassenger(JSON.parse(storedPassenger));
          setUnlocked(true);
          return;
        }

        const storedMaster = sessionStorage.getItem(`trip_master_${shareCode}`);
        if (storedMaster === "true") {
          setIsMasterMode(true);
          setUnlocked(true);
          return;
        }
      } catch {
        // Ignora erro de parsing
      }
    }
  }, [shareCode]);

  // Autenticação pelo CPF do passageiro
  const handleAuthenticatePassenger = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCpf = cpfInput.replace(/\D/g, "");
    if (!cleanCpf || cleanCpf.length < 5) {
      setAuthError("Por favor, digite seu CPF para consultar seus dados.");
      return;
    }

    setIsAuthenticating(true);
    setAuthError("");

    try {
      const res = await authenticateTripGuest({ shareCode, cpf: cpfInput });
      if (res.success && res.passenger) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(`trip_passenger_${shareCode}`, JSON.stringify(res.passenger));
        }
        setPassenger(res.passenger);
        setIsMasterMode(false);
        setUnlocked(true);
      } else {
        setAuthError(
          res.message ||
            "CPF não localizado na lista de passageiros desta viagem. Verifique os números ou fale com a agência."
        );
      }
    } catch {
      setAuthError("Ocorreu um erro ao validar seu CPF. Tente novamente em instantes.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Autenticação por Senha Master (Agência/Organizador)
  const handleAuthenticateMaster = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!passwordInput.trim()) {
      setAuthError("Digite a senha geral para continuar.");
      return;
    }

    setIsAuthenticating(true);
    setAuthError("");

    try {
      const res = await authenticateTripGuest({ shareCode, password: passwordInput });
      if (res.success) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(`trip_master_${shareCode}`, "true");
        }
        setIsMasterMode(true);
        setPassenger(null);
        setUnlocked(true);
      } else {
        setAuthError(res.message || "Senha incorreta. Tente novamente.");
      }
    } catch {
      setAuthError("Erro ao validar senha.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Logout / Trocar Passageiro
  const handleLogout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(`trip_passenger_${shareCode}`);
      sessionStorage.removeItem(`trip_master_${shareCode}`);
    }
    setPassenger(null);
    setIsMasterMode(false);
    setUnlocked(false);
    setCpfInput("");
    setPasswordInput("");
    setAuthError("");
  };

  // Copiar código de voucher
  const handleCopyVoucher = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedVoucher(code);
      setTimeout(() => setCopiedVoucher(null), 2500);
    } catch {
      // Fallback
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

      const defaultLat = points[0]?.lat || -3.854;
      const defaultLng = points[0]?.lng || -32.429;

      const map = L.map(mapContainerRef.current).setView(
        [defaultLat, defaultLng],
        points.length > 1 ? 12 : 13
      );
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

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

  // ============================================================
  // TELA DE AUTENTICAÇÃO PERSONALIZADA POR CPF (PORTAL DO VIAJANTE)
  // ============================================================
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 selection:bg-blue-600 selection:text-white">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"
        >
          {/* Header do Card */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/15 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <ShieldCheck size={28} />
            </div>
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest block">
              Destino Certo Viagens
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
              {trip.title || "Portal do Passageiro"}
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              Digite seu CPF cadastrado para acessar seu guia exclusivo, sua acomodação confirmada e
              seus passeios contratados.
            </p>
          </div>

          {/* Mensagem de Erro */}
          {authError && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/25 text-xs"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <span>{authError}</span>
            </motion.div>
          )}

          {/* Form Principal: CPF do Passageiro */}
          {!showMasterLogin ? (
            <form onSubmit={handleAuthenticatePassenger} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <User size={14} className="text-blue-400" />
                  <span>CPF do Passageiro</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cpfInput}
                    onChange={(e) => setCpfInput(formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="w-full px-4 py-3 text-base font-mono font-bold tracking-wider rounded-xl border border-slate-700 bg-slate-950 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-center"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-500 text-center pt-0.5">
                  O acesso é personalizado para o seu hotel, quarto e passeios extras.
                </p>
              </div>

              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/25 disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Consultando sua viagem...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Acessar Meu Guia Exclusivo</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Form Alternativo: Senha Geral / Master */
            <form onSubmit={handleAuthenticateMaster} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Lock size={14} className="text-amber-400" />
                  <span>Senha Geral da Viagem (Agência)</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Digite a senha geral..."
                    className="w-full pl-4 pr-11 py-3 text-sm font-semibold rounded-xl border border-slate-700 bg-slate-950 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
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
              </div>

              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-600/25 disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Validando senha...</span>
                  </>
                ) : (
                  <span>Acessar como Administrador</span>
                )}
              </button>
            </form>
          )}

          {/* Toggle de Acesso Alternativo */}
          <div className="pt-2 border-t border-slate-800/80 text-center space-y-2">
            <button
              type="button"
              onClick={() => {
                setShowMasterLogin(!showMasterLogin);
                setAuthError("");
              }}
              className="text-xs text-slate-400 hover:text-slate-200 font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              {showMasterLogin ? (
                <>
                  <User size={13} className="text-blue-400" />
                  <span>Voltar para acesso por CPF do Passageiro</span>
                </>
              ) : (
                <>
                  <Lock size={13} className="text-slate-500" />
                  <span>É organizador ou agência? Entrar com Senha Geral</span>
                </>
              )}
            </button>

            <p className="text-[11px] text-slate-500 block">
              Dúvidas com seu acesso? Fale com a equipe da Destino Certo Viagens.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ============================================================
  // PORTAL DO CLIENTE AUTENTICADO (100% PERSONALIZADO & LIVRE DE CUSTOS)
  // ============================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Topo / Barra de Navegação */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md">
            DC
          </div>
          <div>
            <span className="text-xs font-bold text-white tracking-wide block">
              Destino Certo Viagens
            </span>
            <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider block">
              {passenger ? "Guia Exclusivo do Passageiro" : "Visualização Geral da Agência"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {passenger ? (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <User size={13} className="text-blue-400" />
              <span className="font-semibold text-white">{passenger.nome}</span>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            title="Sair ou consultar outro passageiro"
          >
            <ArrowRightLeft size={13} className="text-slate-400" />
            <span className="hidden sm:inline">Trocar Passageiro</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 text-xs font-semibold transition-colors cursor-pointer"
            title="Imprimir ou Salvar Roteiro em PDF"
          >
            <Printer size={14} className="text-blue-400" />
            <span className="hidden sm:inline">Imprimir / PDF</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* 1. Hero da Viagem (Com Boas-Vindas Personalizadas) */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950/80 via-slate-900 to-slate-900 border border-slate-800/80 p-6 sm:p-10 shadow-2xl">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-bold">
              <Sparkles size={14} />
              <span>
                {passenger ? `Olá, ${passenger.nome.split(" ")[0]}!` : "Viagem Confirmada"}
              </span>
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

        {/* 2. Badge do Passageiro & Resumo VIP */}
        {passenger && (
          <section className="bg-gradient-to-r from-blue-900/30 via-slate-900 to-slate-900 rounded-2xl border border-blue-500/20 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-md shrink-0">
                <User size={22} />
              </div>
              <div>
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">
                  Perfil do Passageiro
                </span>
                <h3 className="text-base font-bold text-white">{passenger.nome}</h3>
                <span className="text-xs text-slate-400">
                  Categoria: {passenger.tipo || "Adulto"} • CPF: {passenger.documento || "Cadastrado"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Passeios Extras</span>
                <span className="font-black text-emerald-400">
                  {passenger.addons.length} contratado(s)
                </span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowRightLeft size={12} />
                <span>Trocar</span>
              </button>
            </div>
          </section>
        )}

        {/* Aviso no Modo Master */}
        {isMasterMode && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3 text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-amber-400 shrink-0" />
              <span>
                <strong>Modo Administrador / Agência:</strong> Você está visualizando todas as
                hospedagens e dados gerais sem filtro individual de passageiro.
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-500 transition-colors cursor-pointer shrink-0"
            >
              Sair
            </button>
          </div>
        )}

        {/* 3. Acomodação & Quarto (ESTRITAMENTE PERSONALIZADO PARA O PASSAGEIRO) */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Hotel size={22} className="text-blue-400" />
            <h2>{passenger ? "Sua Acomodação & Quarto" : "Hospedagem & Acomodações"}</h2>
          </div>

          {passenger ? (
            /* Visualização Personalizada: Mostra apenas o hotel e quarto do passageiro autenticado */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {passenger.lodgings.length > 0 ? (
                passenger.lodgings.map((lodging, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900 border-2 border-blue-500/30 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md mb-1.5">
                          <Check size={11} />
                          <span>Seu Hotel Confirmado</span>
                        </div>
                        <h3 className="text-lg font-bold text-white">{lodging.hotelName}</h3>
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
                      <div className="text-xs text-slate-300 flex items-center gap-2 py-1.5 px-3 rounded-xl bg-slate-950/60 border border-slate-800">
                        <Calendar size={13} className="text-blue-400" />
                        <span>Período da estadia: {lodging.periodo}</span>
                      </div>
                    )}

                    {/* Destaque do Quarto Reservado */}
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/60 to-slate-950 border border-blue-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <BedDouble size={15} className="text-blue-400" />
                          <span>{lodging.quartoNumero}</span>
                        </span>
                        <span className="text-xs font-black px-2 py-0.5 rounded-md bg-blue-600/20 text-blue-300 border border-blue-500/30">
                          Quarto {lodging.quartoTipo}
                        </span>
                      </div>

                      {lodging.roomMates && lodging.roomMates.length > 0 ? (
                        <div className="pt-1.5 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
                          <Users size={12} className="text-slate-500 shrink-0" />
                          <span>
                            Acompanhante(s) no mesmo quarto:{" "}
                            <strong className="text-slate-200">
                              {lodging.roomMates.map((m) => m.nome).join(", ")}
                            </strong>
                          </span>
                        </div>
                      ) : (
                        <div className="pt-1 border-t border-slate-800 text-[11px] text-slate-500 italic">
                          Acomodação individual / exclusiva para você.
                        </div>
                      )}
                    </div>

                    {lodging.observation && (
                      <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800">
                        {lodging.observation}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
                  Sua acomodação está sendo finalizada pela equipe da Destino Certo.
                </div>
              )}
            </div>
          ) : (
            /* Modo Master: Mostra todas as hospedagens da viagem */
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
          )}
        </section>

        {/* 4. Passeios & Serviços Exclusivos (ESTRITAMENTE PERSONALIZADO PARA O PASSAGEIRO) */}
        {passenger && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <Ticket size={22} className="text-emerald-400" />
                <h2>Seus Passeios &amp; Serviços Exclusivos</h2>
              </div>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                {passenger.addons.length} item(ns) contratado(s)
              </span>
            </div>

            {passenger.addons.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {passenger.addons.map((addon) => (
                  <div
                    key={addon.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5 shadow-lg relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md mb-1.5">
                          <Sparkles size={11} />
                          <span>Passeio Contratado</span>
                        </div>
                        <h3 className="text-base font-bold text-white">{addon.title}</h3>
                        {addon.location && (
                          <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={12} className="text-emerald-400" />
                            <span>{addon.location}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {addon.observation && (
                      <p className="text-xs text-slate-300 leading-relaxed font-normal bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                        {addon.observation}
                      </p>
                    )}

                    {/* Voucher de Acesso emitido */}
                    {addon.voucherCode ? (
                      <div className="pt-2">
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Ticket size={16} className="text-emerald-400 shrink-0" />
                            <div>
                              <span className="text-[10px] font-bold uppercase text-emerald-300 block">
                                Voucher de Acesso
                              </span>
                              <span className="text-sm font-black font-mono text-white">
                                {addon.voucherCode}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopyVoucher(addon.voucherCode!)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {copiedVoucher === addon.voucherCode ? (
                              <>
                                <Check size={12} className="text-emerald-400" />
                                <span>Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                        <CheckCircle2 size={13} className="text-emerald-500/70" />
                        <span>Presença confirmada na lista do operador / guia.</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-1.5">
                <p className="text-sm font-semibold text-slate-300">
                  Pacote Padrão Confirmado
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Você está com todos os itens inclusos no pacote padrão confirmados. Caso deseje
                  adicionar passeios extras opcionais, solicite à sua agência.
                </p>
              </div>
            )}
          </section>
        )}

        {/* 5. Mapa Interativo dos Destinos e Roteiro */}
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

        {/* 6. Voos e Transporte Rodoviário */}
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
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        flight.conexaoDeId
                          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          : "bg-blue-500/15 text-blue-300 border-blue-500/20"
                      }`}
                    >
                      {flight.conexaoDeId
                        ? `↳ Conexão • ${flight.tipo || "Trecho"}`
                        : flight.tipo || "Trecho Aéreo"}
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
                      <Plane
                        size={20}
                        className={`rotate-90 ${
                          flight.conexaoDeId ? "text-amber-400" : "text-slate-500"
                        }`}
                      />
                      <span
                        className={`text-[10px] mt-1 font-semibold ${
                          flight.conexaoDeId ? "text-amber-400" : "text-slate-500"
                        }`}
                      >
                        {flight.conexaoDeId ? "Conexão" : "Direto"}
                      </span>
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
                      <span
                        className={`font-bold ${
                          flight.status === "CONFIRMADO"
                            ? "text-emerald-400"
                            : flight.status === "CANCELADO"
                            ? "text-rose-400 line-through"
                            : "text-amber-400"
                        }`}
                      >
                        {flight.status}
                      </span>
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

        {/* 7. Roteiro Dia a Dia */}
        {trip.itinerary && trip.itinerary.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-lg">
              <Clock size={22} className="text-blue-400" />
              <h2>Roteiro Programado</h2>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              {trip.itinerary.map((item, idx) => (
                <div key={item.id || idx} className="flex gap-4 sm:gap-6 relative">
                  {idx !== trip.itinerary.length - 1 && (
                    <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-slate-800" />
                  )}

                  <div className="relative z-10 w-8 h-8 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-md">
                    {item.day || idx + 1}
                  </div>

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

        {/* 8. O que está Incluso no Pacote */}
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

        {/* 9. Guia & Orientações Úteis */}
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
                Acompanhamento por equipe e guia credenciado da Destino Certo Viagens durante os
                passeios.
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
                  <strong>Documentação:</strong> Leve documento original oficial com foto (RG ou
                  CNH dentro da validade).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Luggage size={15} className="text-blue-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Bagagem:</strong> Chegue ao aeroporto ou ponto de encontro com no mínimo
                  2h de antecedência.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck size={15} className="text-blue-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Taxas &amp; Preservação:</strong> Conserve sempre à mão seus comprovantes
                  de taxas e ingressos ambientais quando aplicável.
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
