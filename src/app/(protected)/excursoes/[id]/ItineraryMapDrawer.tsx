"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MapPin,
  Search,
  ExternalLink,
  Check,
  Navigation,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { ItineraryItem } from "@/lib/actions/itinerary";
import "leaflet/dist/leaflet.css";

interface ItineraryMapDrawerProps {
  isOpen: boolean;
  item: ItineraryItem | null;
  onClose: () => void;
  onUpdateLocation: (
    itemId: string,
    data: { location: string; latitude?: number; longitude?: number }
  ) => void;
}

export function ItineraryMapDrawer({
  isOpen,
  item,
  onClose,
  onUpdateLocation,
}: ItineraryMapDrawerProps) {
  const [addressInput, setAddressInput] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const openedItemIdRef = useRef<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincroniza APENAS quando o drawer abre ou quando o item selecionado muda
  // NUNCA reescreve o input durante a digitação do usuário!
  useEffect(() => {
    if (isOpen && item) {
      if (openedItemIdRef.current !== item.id) {
        openedItemIdRef.current = item.id;
        setAddressInput(item.location || item.title || "");
        setResolvedAddress(item.location || null);
        if (item.latitude && item.longitude) {
          setCoords({ lat: item.latitude, lng: item.longitude });
        } else {
          setCoords(null);
        }
      }
    } else if (!isOpen) {
      openedItemIdRef.current = null;
    }
  }, [isOpen, item?.id]); // Depende apenas de isOpen e item.id!

  // Salva automaticamente e dá feedback
  const triggerSave = useCallback(
    (newAddress: string, lat?: number, lng?: number) => {
      if (!item) return;
      onUpdateLocation(item.id, {
        location: newAddress,
        latitude: lat,
        longitude: lng,
      });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    },
    [item, onUpdateLocation]
  );

  // Inicialização do Leaflet no Client
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    let isSubscribed = true;

    async function initMap() {
      const L = (await import("leaflet")).default;

      if (!isSubscribed || !mapContainerRef.current) return;

      // Limpa mapa anterior se houver
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const defaultLat = coords?.lat || -23.55052;
      const defaultLng = coords?.lng || -46.633308;
      const initialZoom = coords ? 16 : 13;

      const map = L.map(mapContainerRef.current).setView([defaultLat, defaultLng], initialZoom);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Ícone laranja personalizado Destino Certo
      const orangeIcon = L.divIcon({
        className: "custom-map-pin",
        html: `
          <div style="
            background-color: #f66b0e;
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 10px;
              height: 10px;
              background-color: white;
              border-radius: 50%;
              transform: rotate(45deg);
            "></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      if (coords) {
        markerRef.current = L.marker([coords.lat, coords.lng], {
          icon: orangeIcon,
          draggable: true,
        }).addTo(map);

        markerRef.current.on("dragend", async (e: any) => {
          const { lat, lng } = e.target.getLatLng();
          setCoords({ lat, lng });
          // Reverse geocoding ao arrastar
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );
            const data = await res.json();
            const resolvedAddr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            setResolvedAddress(resolvedAddr);
            triggerSave(addressInput || resolvedAddr, lat, lng);
          } catch {
            triggerSave(addressInput, lat, lng);
          }
        });
      }

      // Clique no mapa para posicionar ou mover o pin
      map.on("click", async (e: any) => {
        const { lat, lng } = e.latlng;
        setCoords({ lat, lng });

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], {
            icon: orangeIcon,
            draggable: true,
          }).addTo(map);
        }

        // Reverse geocoding ao clicar
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await res.json();
          if (data && data.display_name) {
            setResolvedAddress(data.display_name);
            triggerSave(addressInput || data.display_name, lat, lng);
            return;
          }
        } catch {
          // fallback
        }
        triggerSave(addressInput, lat, lng);
      });

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 250);
    }

    initMap();

    return () => {
      isSubscribed = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, coords?.lat, coords?.lng]);

  // Busca de endereço via Nominatim
  // IMPORTANTE: NÃO altera o addressInput que o usuário está digitando!
  const handleSearchAddress = useCallback(
    async (queryOverride?: string) => {
      const qText = (queryOverride !== undefined ? queryOverride : addressInput).trim();
      if (!qText || qText.length < 3) return;
      setIsSearching(true);

      try {
        const q = encodeURIComponent(qText);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`
        );
        const data = await res.json();

        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          const displayName = data[0].display_name;

          setCoords({ lat, lng });
          setResolvedAddress(displayName); // Exibe como informação auxiliar sem sobrescrever o texto digitado!

          if (mapInstanceRef.current) {
            const L = (await import("leaflet")).default;
            mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 0.7 });

            const orangeIcon = L.divIcon({
              className: "custom-map-pin",
              html: `
                <div style="
                  background-color: #f66b0e;
                  width: 32px;
                  height: 32px;
                  border-radius: 50% 50% 50% 0;
                  transform: rotate(-45deg);
                  border: 3px solid white;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                ">
                  <div style="
                    width: 10px;
                    height: 10px;
                    background-color: white;
                    border-radius: 50%;
                    transform: rotate(45deg);
                  "></div>
                </div>
              `,
              iconSize: [32, 32],
              iconAnchor: [16, 32],
            });

            if (markerRef.current) {
              markerRef.current.setLatLng([lat, lng]);
            } else {
              markerRef.current = L.marker([lat, lng], {
                icon: orangeIcon,
                draggable: true,
              }).addTo(mapInstanceRef.current);
            }
          }

          // Salva com o texto que o usuário digitou e as coordenadas encontradas!
          triggerSave(qText, lat, lng);
        }
      } catch (e) {
        console.error("Erro na busca de endereço:", e);
      } finally {
        setIsSearching(false);
      }
    },
    [addressInput, triggerSave]
  );

  // Atualização enquanto o usuário digita
  // Preserva 100% o que o usuário digita sem interrupções!
  const onAddressInputChange = (val: string) => {
    setAddressInput(val);
    triggerSave(val, coords?.lat, coords?.lng);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (val.trim().length >= 3) {
      searchTimerRef.current = setTimeout(() => {
        handleSearchAddress(val);
      }, 700); // 700ms debounce confortável para digitação
    }
  };

  const handleOpenGoogleMaps = () => {
    const q = coords
      ? `${coords.lat},${coords.lng}`
      : encodeURIComponent(addressInput || item?.title || "");
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
  };

  return (
    <AnimatePresence>
      {isOpen && item && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Lateral Direito */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="relative w-full max-w-xl h-full bg-(--surface) border-l border-(--border) shadow-2xl flex flex-col z-10"
          >
            {/* Header do Drawer */}
            <div className="px-6 py-4 border-b border-(--border) flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-primary font-bold text-sm bg-primary/10 px-2.5 py-1 rounded-lg">
                  {item.time}
                </span>
                <div>
                  <h3 className="font-bold text-base text-(--text-title) truncate max-w-xs sm:max-w-sm">
                    {item.title}
                  </h3>
                  <p className="text-xs text-(--text-muted) flex items-center gap-1 mt-0.5">
                    <MapPin size={12} className="text-primary" />
                    <span>Localização geográfica do ponto</span>
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-(--text-muted) hover:bg-(--surface-subtle) hover:text-(--text-title) transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo: Barra de Busca de Endereço */}
            <div className="p-4 border-b border-(--border) bg-(--surface-subtle)/50 space-y-2.5">
              <label className="block text-xs font-semibold text-(--text-title)">
                Endereço ou Nome do Local
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-primary"
                  />
                  <input
                    type="text"
                    value={addressInput}
                    onChange={(e) => onAddressInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                        handleSearchAddress();
                      }
                    }}
                    placeholder="Ex: Praça da Sé, São Paulo ou Hotel Delplaza Marabá"
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-(--surface) border border-(--border) text-(--text-title) placeholder:text-(--text-muted) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  {isSearching && (
                    <Loader2
                      size={14}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-primary animate-spin"
                    />
                  )}
                </div>
                <button
                  onClick={() => {
                    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                    handleSearchAddress();
                  }}
                  disabled={isSearching}
                  className="px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-strong transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-sm"
                  title="Buscar localização agora"
                >
                  {isSearching ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Search size={14} />
                  )}
                  <span>Buscar</span>
                </button>
              </div>

              {/* Endereço resolvido exibido como informação auxiliar */}
              {resolvedAddress && (
                <div className="flex items-center gap-1.5 text-[11px] text-(--text-muted) bg-(--surface) px-2.5 py-1.5 rounded-lg border border-(--border) truncate">
                  <MapPin size={11} className="text-primary shrink-0" />
                  <span className="font-semibold text-(--text-title) shrink-0">Localizado:</span>
                  <span className="truncate">{resolvedAddress}</span>
                </div>
              )}

              {/* Status do Salvamento Automático */}
              <div className="flex items-center justify-between text-[11px] pt-0.5">
                <div className="flex items-center gap-1.5 font-medium">
                  {isSearching ? (
                    <span className="text-primary flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" />
                      <span>Atualizando mapa conforme você digita...</span>
                    </span>
                  ) : justSaved ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <Check size={13} className="animate-bounce" />
                      <span>Salvo instantaneamente!</span>
                    </span>
                  ) : (
                    <span className="text-(--text-muted)">
                      O mapa atualiza automaticamente ou com Enter
                    </span>
                  )}
                </div>

                <button
                  onClick={handleOpenGoogleMaps}
                  className="inline-flex items-center gap-1 text-primary hover:underline font-semibold cursor-pointer"
                >
                  <ExternalLink size={12} />
                  <span>Abrir no Google Maps</span>
                </button>
              </div>
            </div>

            {/* Container do Mapa Interativo Leaflet */}
            <div className="flex-1 relative w-full h-full bg-(--surface-subtle)">
              <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
            </div>

            {/* Rodapé com Ações */}
            <div className="p-4 border-t border-(--border) bg-(--surface) flex items-center justify-between">
              <div className="text-xs text-(--text-muted)">
                {coords ? (
                  <span className="font-mono text-[11px]">
                    Lat: {coords.lat.toFixed(5)}, Lng: {coords.lng.toFixed(5)}
                  </span>
                ) : (
                  <span>Nenhum pin fixado ainda</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenGoogleMaps}
                  className="px-3.5 py-2 rounded-xl border border-(--border) bg-(--surface-subtle) hover:bg-(--surface) text-(--text-title) text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink size={14} />
                  <span>Ver no Google Maps</span>
                </button>

                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-strong transition-all cursor-pointer shadow-md"
                >
                  Concluir & Fechar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
