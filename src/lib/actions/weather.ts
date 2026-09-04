"use server";

export interface DailyClimateItem {
  date: string; // "01/01"
  tempMax: number;
  tempMin: number;
  tempMean: number;
  precipitation: number;
  weatherCode: number;
  description: string;
}

export interface DestinationClimateResult {
  destinationName: string;
  country: string;
  state?: string;
  periodLabel: string;
  isHistoricalAverage: boolean;
  tempMaxAvg: number;
  tempMinAvg: number;
  tempMeanAvg: number;
  classification: {
    label: string; // Ex: "Muito Quente", "Frio de Serra"
    badgeColor: string;
    icon: string; // "sun" | "flame" | "snowflake" | "cloud" | "cloud-sun"
    summary: string;
  };
  rainAssessment: {
    label: string;
    totalMm: number;
    hasRainChance: boolean;
  };
  packingTips: string;
  daily: DailyClimateItem[];
}

const TOURISM_ALIASES: Record<string, string> = {
  "foz iguacu": "Foz do Iguaçu",
  "foz iguaçu": "Foz do Iguaçu",
  "foz": "Foz do Iguaçu",
  "noronha": "Fernando de Noronha",
  "porto": "Porto de Galinhas",
  "sampa": "São Paulo",
  "rio": "Rio de Janeiro",
  "floripa": "Florianópolis",
  "morro": "Morro de São Paulo",
  "jalapao": "Jalapão",
  "jalapão": "Jalapão",
  "chapadadosveadeiros": "Chapada dos Veadeiros",
};

function extractDestinationFromTitle(title: string): string {
  if (!title) return "";
  let clean = title.trim();

  // Remove prefixos comuns de pacotes
  clean = clean.replace(
    /^(pacote|excurs[aã]o|viagem|roteiro|grupo|carnaval|r[eé]veillon|tour|f[eé]rias)\s+(de\s+|para\s+|em\s+)?/i,
    ""
  );

  // Remove sufixos de ano ou mês no final (ex: "2027", "Julho 2026")
  clean = clean.replace(
    /\s+(20\d\d|janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)$/i,
    ""
  );

  clean = clean.replace(/^[-–—:\s]+/, "").trim();

  const normalized = clean.toLowerCase();
  if (TOURISM_ALIASES[normalized]) {
    return TOURISM_ALIASES[normalized];
  }

  return clean || title.trim();
}

function getWeatherDescription(code: number): string {
  if (code === 0) return "Céu limpo / Ensolarado";
  if (code === 1 || code === 2) return "Parcialmente nublado";
  if (code === 3) return "Nublado";
  if (code === 45 || code === 48) return "Nevoeiro / Neblina";
  if (code >= 51 && code <= 55) return "Garoa / Chuva leve";
  if (code >= 61 && code <= 65) return "Chuva moderada";
  if (code >= 71 && code <= 77) return "Neve / Geada";
  if (code >= 80 && code <= 82) return "Pancadas de chuva rápida";
  if (code >= 95 && code <= 99) return "Tempestade / Trovoadas";
  return "Tempo variável";
}

function classifyTemperature(tempMeanAvg: number, tempMaxAvg: number): {
  label: string;
  badgeColor: string;
  icon: string;
  summary: string;
} {
  if (tempMaxAvg >= 32 || tempMeanAvg >= 28) {
    return {
      label: "Muito Quente",
      badgeColor: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      icon: "flame",
      summary: "Dias com calor intenso e sol forte na maior parte do tempo.",
    };
  }
  if (tempMeanAvg >= 23) {
    return {
      label: "Quente / Praia",
      badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      icon: "sun",
      summary: "Clima quente e agradável, ideal para passeios e atividades ao ar livre.",
    };
  }
  if (tempMeanAvg >= 18) {
    return {
      label: "Ameno / Agradável",
      badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      icon: "cloud-sun",
      summary: "Temperaturas confortáveis. Dias frescos sem extremos de frio ou calor.",
    };
  }
  if (tempMeanAvg >= 13) {
    return {
      label: "Frio / Casaco",
      badgeColor: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
      icon: "cloud",
      summary: "Clima frio. Noites e manhãs com temperaturas baixas, exigindo casaco.",
    };
  }
  return {
    label: "Frio Intenso / Serra",
    badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    icon: "snowflake",
    summary: "Frio rigoroso típico de inverno serrano. Uso recomendado de roupas térmicas.",
  };
}

function generatePackingTips(
  classification: { label: string; icon: string },
  rainAssessment: { hasRainChance: boolean; totalMm: number },
  tempMinAvg: number,
  tempMaxAvg: number
): string {
  const tips: string[] = [];

  if (classification.icon === "flame" || classification.icon === "sun") {
    tips.push("Roupas leves e frescas (algodão/linho)");
    tips.push("Protetor solar, boné/óculos de sol");
    tips.push("Roupas de banho para piscina/praia/passeios");
    if (tempMinAvg < 21) {
      tips.push("Agasalho leve para ambientes com ar-condicionado ou noites frescas");
    }
  } else if (classification.icon === "snowflake" || classification.icon === "cloud") {
    tips.push("Casacos pesados ou jaquetas corta-vento");
    tips.push("Meias quentes e calçados fechados confortáveis");
    tips.push("Gorro, cachecol ou luvas para passeios noturnos");
    if (tempMaxAvg > 16) {
      tips.push("Roupas em camadas para variação de temperatura à tarde");
    }
  } else {
    tips.push("Roupas confortáveis de meia-estação");
    tips.push("Agasalho leve ou cardigã para as noites");
    tips.push("Calçados confortáveis para caminhadas e tours");
  }

  if (rainAssessment.hasRainChance) {
    tips.push("Guarda-chuva compacto ou capa de chuva");
  }

  return tips.join(" · ");
}

interface Coordinates {
  latitude: number;
  longitude: number;
  name: string;
  country: string;
  state?: string;
}

async function resolveCoordinates(query: string): Promise<Coordinates | null> {
  const clean = extractDestinationFromTitle(query);

  // 1. Tentar Open-Meteo Geocoding
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      clean
    )}&count=1&language=pt&format=json`;
    const geoRes = await fetch(geoUrl, { next: { revalidate: 86400 } });
    const geoData = await geoRes.json();

    if (geoData.results && geoData.results.length > 0) {
      const p = geoData.results[0];
      return {
        latitude: p.latitude,
        longitude: p.longitude,
        name: p.name,
        country: p.country || "Brasil",
        state: p.admin1,
      };
    }
  } catch (e) {
    // continua para o fallback
  }

  // 2. Fallback: OpenStreetMap Nominatim (reconhece praticamente qualquer variação ou grafia)
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      clean
    )}&format=json&limit=1`;
    const nomRes = await fetch(nomUrl, {
      headers: { "User-Agent": "DestinoCerto-Turismo/1.0" },
      next: { revalidate: 86400 },
    });
    const nomData = await nomRes.json();

    if (nomData && nomData.length > 0) {
      const p = nomData[0];
      const parts = (p.display_name || "").split(",").map((s: string) => s.trim());
      const country = parts[parts.length - 1] || "Brasil";
      const state = parts.length > 2 ? parts[parts.length - 3] : undefined;

      return {
        latitude: parseFloat(p.lat),
        longitude: parseFloat(p.lon),
        name: p.name || parts[0],
        country,
        state,
      };
    }
  } catch (e) {
    // ignore
  }

  return null;
}

import { requireAuth } from "@/lib/auth-guards";

// Cache em memória para clima e geocoding (TTL de 6 horas)
// Evita requisições repetitivas a Open-Meteo e Nominatim ao alternar abas ou arrastar pin
const climateMemoryCache = new Map<
  string,
  { data: DestinationClimateResult; timestamp: number }
>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 horas

export async function getDestinationClimate(params: {
  destination?: string;
  latitude?: number;
  longitude?: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}): Promise<{
  success: boolean;
  climate?: DestinationClimateResult;
  error?: string;
}> {
  try {
    await requireAuth();

    if (!params.startDate || !params.endDate) {
      return { success: false, error: "Período incompleto." };
    }

    // Chave de cache com aproximação de 3 casas decimais (~110m)
    const cacheLat = params.latitude !== undefined ? params.latitude.toFixed(3) : "";
    const cacheLng = params.longitude !== undefined ? params.longitude.toFixed(3) : "";
    const cacheKey = `${(params.destination || "").toLowerCase().trim()}_${cacheLat}_${cacheLng}_${params.startDate}_${params.endDate}`;

    const cached = climateMemoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return { success: true, climate: cached.data };
    }

    let latitude: number;
    let longitude: number;
    let cityName = params.destination?.trim() || "";
    let country = "Brasil";
    let state: string | undefined;

    if (params.latitude !== undefined && params.longitude !== undefined) {
      latitude = params.latitude;
      longitude = params.longitude;

      if (!cityName) {
        // Reverse geocoding para pegar o nome do local onde o pin está
        try {
          const revUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
          const revRes = await fetch(revUrl, {
            headers: { "User-Agent": "DestinoCerto-Turismo/1.0" },
            next: { revalidate: 86400 },
          });
          const revData = await revRes.json();
          cityName =
            revData.address?.city ||
            revData.address?.town ||
            revData.address?.municipality ||
            revData.address?.village ||
            revData.name ||
            "Local selecionado";
          state = revData.address?.state;
          country = revData.address?.country || "Brasil";
        } catch (e) {
          cityName = "Local selecionado";
        }
      }
    } else {
      const rawDestination = (params.destination || "").trim();
      if (!rawDestination) {
        return { success: false, error: "Destino ou coordenadas não informadas." };
      }

      const place = await resolveCoordinates(rawDestination);
      if (!place) {
        return {
          success: false,
          error: `Não encontramos as coordenadas para "${rawDestination}".`,
        };
      }
      latitude = place.latitude;
      longitude = place.longitude;
      cityName = place.name;
      country = place.country;
      state = place.state;
    }

    // Determinar datas de consulta:
    // Se a viagem for no futuro (> 14 dias) ou em anos futuros como 2027,
    // consultamos o arquivo histórico consolidado (2024) para a mesma semana do ano!
    const startD = new Date(params.startDate);
    const endD = new Date(params.endDate);

    const now = new Date();
    const diffDaysFromNow = (startD.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    let isHistorical = false;
    let queryStartDate = params.startDate;
    let queryEndDate = params.endDate;
    let apiUrl = "";

    if (diffDaysFromNow > 14 || diffDaysFromNow < -2) {
      isHistorical = true;
      const targetYear = 2024;
      const startMonth = String(startD.getUTCMonth() + 1).padStart(2, "0");
      const startDay = String(startD.getUTCDate()).padStart(2, "0");
      const endMonth = String(endD.getUTCMonth() + 1).padStart(2, "0");
      const endDay = String(endD.getUTCDate()).padStart(2, "0");

      queryStartDate = `${targetYear}-${startMonth}-${startDay}`;
      queryEndDate = `${targetYear}-${endMonth}-${endDay}`;

      if (queryEndDate < queryStartDate) {
        queryEndDate = `${targetYear + 1}-${endMonth}-${endDay}`;
      }

      apiUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${queryStartDate}&end_date=${queryEndDate}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,weather_code&timezone=America%2FSao_Paulo`;
    } else {
      apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,weather_code&timezone=America%2FSao_Paulo&start_date=${params.startDate}&end_date=${params.endDate}`;
    }

    const weatherRes = await fetch(apiUrl, { next: { revalidate: 3600 } });
    const weatherData = await weatherRes.json();

    if (!weatherData.daily || !weatherData.daily.time) {
      return {
        success: false,
        error: "Não foi possível obter dados meteorológicos para este intervalo.",
      };
    }

    const daily = weatherData.daily;
    const count = daily.time.length;

    let sumMax = 0;
    let sumMin = 0;
    let sumMean = 0;
    let sumPrecip = 0;

    const dailyList: DailyClimateItem[] = [];

    for (let i = 0; i < count; i++) {
      const max = daily.temperature_2m_max[i] ?? 0;
      const min = daily.temperature_2m_min[i] ?? 0;
      const mean = daily.temperature_2m_mean[i] ?? (max + min) / 2;
      const precip = daily.precipitation_sum[i] ?? 0;
      const code = daily.weather_code[i] ?? 0;

      sumMax += max;
      sumMin += min;
      sumMean += mean;
      sumPrecip += precip;

      const parts = daily.time[i].split("-");
      const dayLabel = `${parts[2]}/${parts[1]}`;

      dailyList.push({
        date: dayLabel,
        tempMax: Math.round(max * 10) / 10,
        tempMin: Math.round(min * 10) / 10,
        tempMean: Math.round(mean * 10) / 10,
        precipitation: Math.round(precip * 10) / 10,
        weatherCode: code,
        description: getWeatherDescription(code),
      });
    }

    const tempMaxAvg = Math.round((sumMax / count) * 10) / 10;
    const tempMinAvg = Math.round((sumMin / count) * 10) / 10;
    const tempMeanAvg = Math.round((sumMean / count) * 10) / 10;
    const totalPrecip = Math.round(sumPrecip * 10) / 10;

    const classification = classifyTemperature(tempMeanAvg, tempMaxAvg);

    let rainLabel = "Época Seca / Predomínio de Sol";
    let hasRainChance = false;
    if (totalPrecip >= 20 || dailyList.some((d) => d.precipitation >= 8)) {
      rainLabel = "Pancadas frequentes / Chuva";
      hasRainChance = true;
    } else if (totalPrecip >= 5 || dailyList.some((d) => d.precipitation >= 2)) {
      rainLabel = "Possibilidade de pancadas isoladas";
      hasRainChance = true;
    }

    const packingTips = generatePackingTips(
      classification,
      { hasRainChance, totalMm: totalPrecip },
      tempMinAvg,
      tempMaxAvg
    );

    const periodLabel = `${startD.getUTCDate().toString().padStart(2, "0")}/${(
      startD.getUTCMonth() + 1
    )
      .toString()
      .padStart(2, "0")} a ${endD.getUTCDate().toString().padStart(2, "0")}/${(
      endD.getUTCMonth() + 1
    )
      .toString()
      .padStart(2, "0")}`;

    const climateResult: DestinationClimateResult = {
      destinationName: cityName,
      country,
      state,
      periodLabel,
      isHistoricalAverage: isHistorical,
      tempMaxAvg,
      tempMinAvg,
      tempMeanAvg,
      classification,
      rainAssessment: {
        label: rainLabel,
        totalMm: totalPrecip,
        hasRainChance,
      },
      packingTips,
      daily: dailyList,
    };

    climateMemoryCache.set(cacheKey, { data: climateResult, timestamp: Date.now() });

    return {
      success: true,
      climate: climateResult,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Falha ao consultar clima.",
    };
  }
}
