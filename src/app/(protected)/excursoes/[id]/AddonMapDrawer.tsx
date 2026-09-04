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
import type { ExcursionAddon } from "@/lib/actions/addons";
import "leaflet/dist/leaflet.css";

interface AddonMapDrawerProps {
  isOpen: boolean;
  addon: ExcursionAddon | null;
  onClose: () => void;
  onUpdateLocation: (
    addonId: string,
    data: { location: string; latitude?: number; longitude?: number }
  ) => void;
}

export function AddonMapDrawer({
  isOpen,
  addon,
  onClose,
  onUpdateLocation,
}: AddonMapDrawerProps) {
  const [addressInput, setAddressInput] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const openedAddonIdRef = useRef<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen && addon) {
      if (openedAddonIdRef.current !== addon.id) {
        openedAddonIdRef.current = addon.id;
        setAddressInput(addon.location || addon.title || "");
        setResolvedAddress(addon.location || null);
        if (addon.latitude && addon.longitude) {
          setCoords({ lat: addon.latitude, lng: addon.longitude });
        } else {
          setCoords(null);
        }
      }
    } else if (!isOpen) {
      openedAddonIdRef.current = null;
    }
  }, [isOpen, addon?.id]);

  const triggerSave = useCallback(
    (newAddress: string, lat?: number, lng?: number) => {
      if (!addon) return;
      onUpdateLocation(addon.id, {
        location: newAddress,
        latitude: lat,
        longitude: lng,
      });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    },
    [addon, onUpdateLocation]
  );

  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    let isSubscribed = true;

    async function initMap() {
      const L = (await import("leaflet")).default;

      if (!isSubscribed || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const defaultLat = coords?.lat || -25.54778; // Foz / Brasil fallback
      const defaultLng = coords?.lng || -54.58806;
      const initialZoom = coords ? 16 : 13;

      const map = L.map(mapContainerRef.current).setView([defaultLat, defaultLng], initialZoom);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

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
          setResolvedAddress(displayName);

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
              popupAnchor: [0, -32],
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

          triggerSave(addressInput || displayName, lat, lng);
        }
      } catch (err) {
        console.error("Erro na busca de endereço:", err);
      } finally {
        setIsSearching(false);
      }
    },
    [addressInput, triggerSave]
  );

  const googleMapsUrl = coords
    ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`
    : addressInput
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressInput)}`
    : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-xs"
          />

          {/* Lateral Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="fixed top-0 right-0 h-full w-full max-w-xl bg-surface border-l border-border shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface-subtle">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-text-title text-sm">
                    Localização do Adicional
                  </h3>
                  <p className="text-xs text-text-muted truncate max-w-xs">
                    {addon?.title || "Selecione o local"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <AnimatePresence>
                  {justSaved && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-status-success font-semibold flex items-center gap-1 bg-status-success-bg px-2.5 py-1 rounded-full"
                    >
                      <Check size={12} /> Salvo
                    </motion.span>
                  )}
                </AnimatePresence>

                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-title hover:bg-surface-muted transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto">
              {/* Caixa de Busca */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                  <Navigation size={13} className="text-primary" />
                  <span>Endereço, Atração ou Ponto de Encontro</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={addressInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAddressInput(val);
                      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                      searchTimerRef.current = setTimeout(() => {
                        handleSearchAddress(val);
                      }, 1000);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                        handleSearchAddress();
                      }
                    }}
                    placeholder="Ex: Cataratas do Iguaçu, Macuco Safari, Restaurante Rafain..."
                    className="w-full pl-9 pr-24 py-2.5 rounded-xl border border-border bg-surface-subtle text-text-body text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface transition-all"
                  />
                  <Search
                    size={16}
                    className="absolute left-3 text-text-muted pointer-events-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                      handleSearchAddress();
                    }}
                    disabled={isSearching || !addressInput.trim()}
                    className="absolute right-2 px-3 py-1 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    {isSearching ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      "Buscar"
                    )}
                  </button>
                </div>
              </div>

              {/* Endereço Resolvido / Confirmado */}
              {resolvedAddress && (
                <div className="p-3 rounded-xl bg-surface-subtle border border-border/80 flex items-start gap-2 text-xs text-text-muted">
                  <Sparkles size={14} className="text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-text-title block">Local geocodificado:</span>
                    <span className="line-clamp-2 leading-relaxed">{resolvedAddress}</span>
                    {coords && (
                      <span className="text-[11px] text-text-muted/70 block mt-1">
                        Lat: {coords.lat.toFixed(5)} | Lng: {coords.lng.toFixed(5)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Mapa Container Leaflet */}
              <div className="flex-1 min-h-[300px] w-full rounded-2xl overflow-hidden border border-border relative shadow-inner">
                <div ref={mapContainerRef} className="w-full h-full" />
                <div className="absolute top-2 right-2 z-[400] bg-surface/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-border/80 text-[11px] font-medium text-text-muted shadow-xs pointer-events-none">
                  Clique no mapa ou arraste o pino para ajustar
                </div>
              </div>

              {/* Ações e Links */}
              <div className="flex items-center justify-between pt-1">
                {googleMapsUrl ? (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold cursor-pointer"
                  >
                    <span>Abrir no Google Maps</span>
                    <ExternalLink size={12} />
                  </a>
                ) : (
                  <span />
                )}

                <button
                  type="button"
                  onClick={() => {
                    triggerSave(addressInput, coords?.lat, coords?.lng);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>Confirmar Localização</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
