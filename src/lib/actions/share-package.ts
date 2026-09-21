// src/lib/actions/share-package.ts
"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export interface PublicFlight {
  cia?: string;
  voo?: string;
  origem?: string;
  destino?: string;
  saida?: string;
  chegada?: string;
  tipo?: string;
  status?: string;
}

export interface PublicLodging {
  hotel: string;
  cidade?: string;
  diarias?: string;
  periodo?: string;
  observation?: string;
  roomTypes?: string[];
}

export interface PublicTransport {
  empresa?: string;
  veiculo?: string;
  itinerario?: string;
  observation?: string;
  ar?: string;
  wifi?: string;
  agua?: string;
  banheiro?: string;
}

export interface PublicGuide {
  nome: string;
  tipo?: string;
  telefone?: string;
  observation?: string;
  schedule?: Array<{ horario?: string; atividade?: string }>;
}

export interface PublicDestination {
  name: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface PublicTripData {
  found: boolean;
  reason?: "NOT_FOUND" | "INACTIVE";
  excursionId?: string;
  title?: string;
  destination?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  hasPassword?: boolean;
  destinations: PublicDestination[];
  itinerary: any[];
  flights: PublicFlight[];
  airlineLocator?: string;
  lodgings: PublicLodging[];
  transports: PublicTransport[];
  guides: PublicGuide[];
  includedItems: Array<{ title: string; icon?: string }>;
  customInclusions: string[];
}

/**
 * Gera um código único e limpo para o link (ex: noronha-4920)
 */
function generateSlug(name: string): string {
  const clean = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${clean || "viagem"}-${rand}`;
}

/**
 * Obtém as configurações de compartilhamento da excursão
 */
export async function getShareConfig(excursionId: string) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  const excursion = await db.excursion.findUnique({
    where: { id: excursionId },
    select: {
      id: true,
      name: true,
      shareCode: true,
      sharePassword: true,
      isShareActive: true,
    },
  });

  if (!excursion) throw new Error("Excursão não encontrada");

  let shareCode = excursion.shareCode;
  if (!shareCode) {
    shareCode = generateSlug(excursion.name);
    await db.excursion.update({
      where: { id: excursionId },
      data: { shareCode },
    });
  }

  return {
    shareCode,
    sharePassword: excursion.sharePassword || "",
    isShareActive: excursion.isShareActive ?? true,
    excursionName: excursion.name,
  };
}

/**
 * Salva as configurações de compartilhamento (senha, status ativo/inativo, link)
 */
export async function updateShareConfig(
  excursionId: string,
  data: {
    shareCode?: string;
    sharePassword?: string;
    isShareActive?: boolean;
  }
) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  const updateData: any = {};
  if (data.shareCode !== undefined) {
    updateData.shareCode = data.shareCode.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");
  }
  if (data.sharePassword !== undefined) {
    updateData.sharePassword = data.sharePassword.trim() || null;
  }
  if (data.isShareActive !== undefined) {
    updateData.isShareActive = Boolean(data.isShareActive);
  }

  const updated = await db.excursion.update({
    where: { id: excursionId },
    data: updateData,
    select: {
      id: true,
      shareCode: true,
      sharePassword: true,
      isShareActive: true,
    },
  });

  return {
    success: true,
    shareCode: updated.shareCode,
    sharePassword: updated.sharePassword || "",
    isShareActive: updated.isShareActive,
  };
}

/**
 * Busca dados estritamente públicos e sanitizados para o cliente (ZERO VALORES / CUSTOS)
 */
export async function getPublicTripData(shareCode: string): Promise<PublicTripData> {
  const cleanCode = shareCode.trim().toLowerCase();

  const excursion = await db.excursion.findFirst({
    where: {
      OR: [{ shareCode: cleanCode }, { id: cleanCode }],
    },
    include: {
      blocks: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!excursion) {
    return { found: false, reason: "NOT_FOUND", destinations: [], itinerary: [], flights: [], lodgings: [], transports: [], guides: [], includedItems: [], customInclusions: [] };
  }

  if (excursion.isShareActive === false) {
    return { found: false, reason: "INACTIVE", destinations: [], itinerary: [], flights: [], lodgings: [], transports: [], guides: [], includedItems: [], customInclusions: [] };
  }

  // Sanitização rigorosa de blocos — REMOÇÃO TOTAL DE QUALQUER CUSTO OU VALOR
  const flights: PublicFlight[] = [];
  let airlineLocator: string | undefined;
  const lodgings: PublicLodging[] = [];
  const transports: PublicTransport[] = [];
  const guides: PublicGuide[] = [];
  const includedItems: Array<{ title: string; icon?: string }> = [];
  const customInclusions: string[] = [];

  for (const b of excursion.blocks) {
    const d: any = b.configJson || {};

    if (b.type === "aereo") {
      if (d.localizador) airlineLocator = d.localizador;
      if (Array.isArray(d.flights)) {
        for (const f of d.flights) {
          flights.push({
            cia: f.cia,
            voo: f.voo,
            origem: f.origem,
            destino: f.destino,
            saida: f.saida,
            chegada: f.chegada,
            tipo: f.tipo,
            status: f.status,
          });
        }
      }
    } else if (b.type === "hospedagem") {
      const roomTypes: string[] = [];
      if (Array.isArray(d.rooms)) {
        for (const r of d.rooms) {
          if (r.tipo && !roomTypes.includes(r.tipo)) roomTypes.push(r.tipo);
        }
      }
      lodgings.push({
        hotel: d.hotel || b.title || "Hospedagem",
        cidade: d.cidade,
        diarias: d.diarias ? `${d.diarias} diárias` : undefined,
        periodo: d.periodo,
        observation: d.observation,
        roomTypes,
      });
    } else if (b.type === "rodoviario") {
      transports.push({
        empresa: d.empresa,
        veiculo: d.veiculo,
        itinerario: d.itinerario,
        observation: d.observation,
        ar: d.ar,
        wifi: d.wifi,
        agua: d.agua,
        banheiro: d.banheiro,
      });
    } else if (b.type === "guias") {
      const scheduleList: Array<{ horario?: string; atividade?: string }> = [];
      if (Array.isArray(d.roteiro)) {
        for (const rot of d.roteiro) {
          scheduleList.push({
            horario: rot.horario,
            atividade: rot.atividade,
          });
        }
      }
      for (const g of d.guias || []) {
        guides.push({
          nome: g.nome,
          tipo: g.tipo,
          telefone: g.telefone,
          observation: d.observation,
          schedule: scheduleList,
        });
      }
      if (!d.guias || d.guias.length === 0) {
        guides.push({
          nome: "Guia Acompanhante Credenciado",
          observation: d.observation,
          schedule: scheduleList,
        });
      }
    } else if (b.type === "itens_inclusos" && Array.isArray(d.rows)) {
      for (const r of d.rows) {
        if (r.type || r.fornecedor) {
          includedItems.push({
            title: r.type || r.fornecedor,
            icon: r.icon,
          });
        }
      }
    } else if (b.type === "personalizados" && Array.isArray(d.rows)) {
      for (const r of d.rows) {
        if (r.nome) customInclusions.push(r.nome);
      }
    }
  }

  // Destinos e coordenadas
  const rawDests = (excursion.destinationsJson as any) || [];
  const destinations: PublicDestination[] = [];
  if (Array.isArray(rawDests) && rawDests.length > 0) {
    for (const rd of rawDests) {
      if (rd?.name) {
        destinations.push({
          name: rd.name,
          latitude: rd.latitude ?? null,
          longitude: rd.longitude ?? null,
        });
      }
    }
  } else if (excursion.destination) {
    destinations.push({
      name: excursion.destination,
      latitude: excursion.latitude,
      longitude: excursion.longitude,
    });
  }

  return {
    found: true,
    excursionId: excursion.id,
    title: excursion.name,
    destination: excursion.destination,
    periodStart: excursion.periodStart ? excursion.periodStart.toISOString().slice(0, 10) : null,
    periodEnd: excursion.periodEnd ? excursion.periodEnd.toISOString().slice(0, 10) : null,
    hasPassword: Boolean(excursion.sharePassword && excursion.sharePassword.trim() !== ""),
    destinations,
    itinerary: (excursion.itineraryJson as any) || [],
    flights,
    airlineLocator,
    lodgings,
    transports,
    guides,
    includedItems,
    customInclusions,
  };
}

/**
 * Verifica a senha de acesso digitada pelo viajante
 */
export async function verifyTripPassword(shareCode: string, passwordAttempt: string) {
  const cleanCode = shareCode.trim().toLowerCase();
  const excursion = await db.excursion.findFirst({
    where: {
      OR: [{ shareCode: cleanCode }, { id: cleanCode }],
    },
    select: {
      sharePassword: true,
      isShareActive: true,
    },
  });

  if (!excursion || excursion.isShareActive === false) {
    return { success: false, message: "Viagem não encontrada ou link inativo." };
  }

  const expectedPassword = excursion.sharePassword ? excursion.sharePassword.trim() : "";
  if (!expectedPassword) {
    return { success: true };
  }

  if (passwordAttempt.trim() === expectedPassword) {
    return { success: true };
  }

  return { success: false, message: "Senha incorreta. Verifique e tente novamente." };
}
