"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Search,
  MapPin,
  Loader2,
  Navigation,
  Check,
  Plus,
  Trash2,
  Route,
  Sparkles,
} from "lucide-react";
import "leaflet/dist/leaflet.css";

export interface DestinationStop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface DestinationMapPickerProps {
  initialStops?: DestinationStop[];
  onStopsChange: (stops: DestinationStop[]) => void;
  activeStopIndex?: number;
  onActiveStopChange?: (index: number) => void;
}

interface SearchSuggestion {
  displayName: string;
  shortName: string;
  lat: number;
  lon: number;
}

const POPULAR_DESTINATIONS = [
  { name: "Foz do Iguaçu, PR", lat: -25.54778, lng: -54.58806 },
  { name: "Gramado, RS", lat: -29.37861, lng: -50.87389 },
  { name: "Canela, RS", lat: -29.36556, lng: -50.81444 },
  { name: "Maceió, AL", lat: -9.66583, lng: -35.73528 },
  { name: "Maragogi, AL", lat: -9.01222, lng: -35.2225 },
  { name: "Porto de Galinhas, PE", lat: -8.50389, lng: -35.00556 },
  { name: "Garanhuns, PE", lat: -8.89111, lng: -36.49472 },
  { name: "Cachoeirinha, PE", lat: -8.48733, lng: -36.23719 },
];

export function DestinationMapPicker({
  initialStops,
  onStopsChange,
  activeStopIndex = 0,
  onActiveStopChange,
}: DestinationMapPickerProps) {
  const [stops, setStops] = useState<DestinationStop[]>(() => {
    if (initialStops && initialStops.length > 0) return initialStops;
    return [
      {
        id: "stop_1",
        name: "Cachoeirinha, Pernambuco",
        latitude: -8.48733,
        longitude: -36.23719,
      },
    ];
  });

  const [activeIdx, setActiveIdx] = useState<number>(activeStopIndex);
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingNewMode, setAddingNewMode] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopsRef = useRef(stops);
  useEffect(() => {
    stopsRef.current = stops;
  }, [stops]);

  const activeIdxRef = useRef(activeIdx);
  useEffect(() => {
    activeIdxRef.current = activeIdx;
  }, [activeIdx]);

  // Sincroniza activeStopIndex externo se fornecido
  useEffect(() => {
    if (activeStopIndex !== undefined && activeStopIndex !== activeIdx) {
      setActiveIdx(activeStopIndex);
    }
  }, [activeStopIndex, activeIdx]);

  const changeActiveIndex = (idx: number) => {
    setActiveIdx(idx);
    if (onActiveStopChange) onActiveStopChange(idx);
    if (mapInstanceRef.current && stopsRef.current[idx]) {
      mapInstanceRef.current.panTo([
        stopsRef.current[idx].latitude,
        stopsRef.current[idx].longitude,
      ]);
    }
  };

  // Reverse geocoding para atualizar nome de uma parada
  const reverseGeocode = useCallback(
    async (idx: number, lat: number, lng: number) => {
      let fullName = "Ponto selecionado";
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { "User-Agent": "DestinoCerto-Turismo/1.0" } }
        );
        const data = await res.json();
        const city =
          data.address?.city ||
          data.address?.town ||
          data.address?.municipality ||
          data.address?.village ||
          data.name ||
          "Ponto selecionado";
        const state = data.address?.state;
        fullName = state ? `${city}, ${state}` : city;
      } catch (err) {
        // fallback
      }

      const next = stopsRef.current.map((s, i) =>
        i === idx
          ? { ...s, name: fullName, latitude: lat, longitude: lng }
          : s
      );
      setStops(next);
      onStopsChange(next);
    },
    [onStopsChange]
  );

  // Redesenha todos os marcadores e polylines no mapa
  const renderMapElements = useCallback(
    async (currentStops: DestinationStop[], selectedIndex: number) => {
      if (!mapInstanceRef.current) return;
      const L = (await import("leaflet")).default;
      const map = mapInstanceRef.current;

      // Limpa marcadores anteriores
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }

      // Adiciona cada parada como um marcador numerado
      currentStops.forEach((stop, idx) => {
        const isSelected = idx === selectedIndex;
        const pinIcon = L.divIcon({
          className: `custom-map-pin-${idx}`,
          html: `
            <div style="
              background: ${isSelected ? "#f66b0e" : "#ea580c"};
              width: ${isSelected ? "38px" : "32px"};
              height: ${isSelected ? "38px" : "32px"};
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 3px solid white;
              box-shadow: 0 4px 14px rgba(0,0,0,0.35);
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: grab;
              transition: all 0.2s ease;
            ">
              <span style="
                color: white;
                font-weight: 800;
                font-size: ${isSelected ? "14px" : "12px"};
                transform: rotate(45deg);
                font-family: sans-serif;
              ">
                ${idx + 1}
              </span>
            </div>
          `,
          iconSize: isSelected ? [38, 38] : [32, 32],
          iconAnchor: isSelected ? [19, 38] : [16, 32],
          popupAnchor: [0, -34],
        });

        const marker = L.marker([stop.latitude, stop.longitude], {
          icon: pinIcon,
          draggable: true,
          title: `${idx + 1}. ${stop.name} (Arraste para reposicionar)`,
        }).addTo(map);

        marker.on("click", () => changeActiveIndex(idx));

        marker.on("dragend", async (e: any) => {
          const { lat, lng } = e.target.getLatLng();
          changeActiveIndex(idx);
          await reverseGeocode(idx, lat, lng);
        });

        markersRef.current.push(marker);
      });

      // Se houver 2 ou mais paradas, traça a linha de rota conectando os pontos
      if (currentStops.length >= 2) {
        const latLngs = currentStops.map((s) => [s.latitude, s.longitude]);
        const polyline = L.polyline(latLngs as any, {
          color: "#f66b0e",
          weight: 3.5,
          dashArray: "6, 8",
          opacity: 0.85,
        }).addTo(map);
        polylineRef.current = polyline;
      }
    },
    [reverseGeocode]
  );

  // Inicialização do Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let isSubscribed = true;

    async function initMap() {
      const L = (await import("leaflet")).default;
      if (!isSubscribed || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const initialLat = stops[0]?.latitude || -8.48733;
      const initialLng = stops[0]?.longitude || -36.23719;

      const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 10);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Clique no mapa: move o pin ativo para onde clicou
      map.on("click", async (e: any) => {
        const { lat, lng } = e.latlng;
        const currentIdx = activeIdxRef.current;
        const targetIdx = currentIdx < stopsRef.current.length ? currentIdx : 0;
        await reverseGeocode(targetIdx, lat, lng);
      });

      renderMapElements(stops, activeIdx);
    }

    initMap();

    return () => {
      isSubscribed = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Redesenha os pins sempre que a lista de paradas ou o item ativo mudar
  useEffect(() => {
    renderMapElements(stops, activeIdx);
  }, [stops, activeIdx, renderMapElements]);

  // Adiciona nova parada a partir de busca ou clique
  const handleSelectLocation = (name: string, lat: number, lng: number) => {
    setSearchInput("");
    setSuggestions([]);

    if (addingNewMode || stops.length === 0) {
      const newStop: DestinationStop = {
        id: `stop_${Date.now()}`,
        name,
        latitude: lat,
        longitude: lng,
      };
      const next = [...stops, newStop];
      setStops(next);
      onStopsChange(next);
      const newIdx = next.length - 1;
      changeActiveIndex(newIdx);
      setAddingNewMode(false);

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([lat, lng], 11);
      }
    } else {
      // Atualiza a parada ativa atual
      const next = stops.map((s, i) =>
        i === activeIdx
          ? { ...s, name, latitude: lat, longitude: lng }
          : s
      );
      setStops(next);
      onStopsChange(next);

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([lat, lng], 12);
      }
    }
  };

  // Remove uma parada
  const handleRemoveStop = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (stops.length <= 1) return;
    const next = stops.filter((_, i) => i !== idx);
    setStops(next);
    onStopsChange(next);
    const newActive = Math.max(0, Math.min(activeIdx, next.length - 1));
    changeActiveIndex(newActive);
  };

  // Busca de endereços
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!val.trim() || val.length < 3) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            val
          )}&format=json&limit=5&countrycodes=br,cl,ar,uy,py,pe`,
          { headers: { "User-Agent": "DestinoCerto-Turismo/1.0" } }
        );
        const data = await res.json();
        const mapped = data.map((item: any) => {
          const parts = (item.display_name || "").split(",");
          return {
            displayName: item.display_name,
            shortName: parts.slice(0, 2).join(",").trim(),
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
          };
        });
        setSuggestions(mapped);
      } catch (err) {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Barra de Pesquisa de Parada */}
      <div className="relative z-20">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={
              addingNewMode
                ? "Buscar nome da nova cidade/parada a adicionar..."
                : `Alterar local da Parada #${activeIdx + 1} (${stops[activeIdx]?.name.split(",")[0] || ""})...`
            }
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-border bg-surface text-text-title text-xs placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs transition-all"
          />
          {isSearching && (
            <Loader2
              size={14}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary animate-spin"
            />
          )}
        </div>

        {/* Dropdown de Resultados da Busca */}
        {suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-surface rounded-xl border border-border shadow-2xl overflow-hidden divide-y divide-border/60 z-30">
            {suggestions.map((s, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectLocation(s.shortName, s.lat, s.lon)}
                className="p-3 hover:bg-surface-subtle cursor-pointer transition-colors flex items-start justify-between gap-2.5 text-xs text-text-title"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <MapPin size={15} className="text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-bold truncate">{s.shortName}</p>
                    <p className="text-[11px] text-text-muted truncate">
                      {s.displayName}
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-bold px-2 py-1 rounded bg-primary/10 text-primary shrink-0">
                  {addingNewMode ? "+ Adicionar à Rota" : "Selecionar"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lista de Paradas / Cidades do Roteiro */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <div className="flex items-center gap-1.5 text-xs text-text-muted shrink-0">
          <Route size={14} className="text-primary" />
          <span className="font-bold text-text-title">
            {stops.length} {stops.length === 1 ? "Parada" : "Cidades / Paradas"}:
          </span>
        </div>

        {stops.map((stop, idx) => {
          const isSelected = idx === activeIdx;
          return (
            <div
              key={stop.id}
              onClick={() => {
                setAddingNewMode(false);
                changeActiveIndex(idx);
              }}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shrink-0 cursor-pointer transition-all shadow-2xs ${
                isSelected
                  ? "bg-primary text-white border-primary shadow-xs scale-[1.02]"
                  : "bg-surface text-text-title hover:bg-surface-subtle border-border"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                  isSelected ? "bg-white text-primary" : "bg-primary/10 text-primary"
                }`}
              >
                {idx + 1}
              </span>
              <span className="max-w-[120px] truncate">{stop.name.split(",")[0]}</span>

              {stops.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => handleRemoveStop(idx, e)}
                  className={`p-0.5 rounded-full transition-colors ml-0.5 ${
                    isSelected
                      ? "hover:bg-white/20 text-white"
                      : "text-text-muted hover:text-status-danger"
                  }`}
                  title="Remover esta parada"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          );
        })}

        {/* Botão para Adicionar Nova Parada */}
        <button
          type="button"
          onClick={() => {
            setAddingNewMode(true);
            setSearchInput("");
          }}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border border-dashed text-xs font-bold shrink-0 transition-all cursor-pointer ${
            addingNewMode
              ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
              : "border-primary/50 text-primary hover:bg-primary/5"
          }`}
        >
          <Plus size={13} />
          <span>+ Adicionar Cidade / Parada</span>
        </button>
      </div>

      {/* Sugestões Rápidas de Destinos */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-[11px] font-semibold text-text-muted shrink-0">
          Sugestões:
        </span>
        {POPULAR_DESTINATIONS.map((d) => (
          <button
            key={d.name}
            type="button"
            onClick={() => handleSelectLocation(d.name, d.lat, d.lng)}
            className="px-2.5 py-1 rounded-lg bg-surface-subtle hover:bg-primary/10 border border-border hover:border-primary/30 text-text-title hover:text-primary text-[11px] font-medium shrink-0 transition-colors cursor-pointer"
          >
            {d.name.split(",")[0]}
          </button>
        ))}
      </div>

      {/* Container do Mapa Leaflet */}
      <div className="relative flex-1 min-h-[350px] rounded-2xl border border-border overflow-hidden shadow-sm">
        <div ref={mapContainerRef} className="w-full h-full min-h-[350px]" />

        {/* Instrução Flutuante sobre o Pin */}
        <div className="absolute top-3 left-3 z-1000 bg-surface/90 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-border/80 shadow-md text-[11px] font-semibold text-text-title flex items-center gap-1.5">
          <Navigation size={13} className="text-primary" />
          <span>
            Pino #{activeIdx + 1} ativo: arraste ou clique para reposicionar esta parada
          </span>
        </div>

        {/* Indicador de Coordenadas da Parada Ativa */}
        <div className="absolute bottom-3 left-3 right-3 z-1000 bg-surface/95 backdrop-blur-xs p-2.5 rounded-xl border border-border shadow-lg flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-primary text-white font-extrabold flex items-center justify-center shrink-0 text-xs">
              {activeIdx + 1}
            </div>
            <div className="min-w-0 truncate">
              <p className="font-bold text-text-title truncate">
                {stops[activeIdx]?.name || "Selecione uma parada"}
              </p>
              <p className="text-[10px] text-text-muted font-mono">
                Lat: {stops[activeIdx]?.latitude.toFixed(5)} · Lng:{" "}
                {stops[activeIdx]?.longitude.toFixed(5)}
              </p>
            </div>
          </div>

          <span className="shrink-0 flex items-center gap-1 text-[11px] text-emerald-600 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            <Check size={12} />
            <span>Ponto Definido</span>
          </span>
        </div>
      </div>
    </div>
  );
}
