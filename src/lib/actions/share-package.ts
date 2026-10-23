// src/lib/actions/share-package.ts
"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export interface PublicFlight {
  id?: string;
  cia?: string;
  voo?: string;
  origem?: string;
  destino?: string;
  saida?: string;
  chegada?: string;
  tipo?: string;
  status?: string;
  conexaoDeId?: string;
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

export interface PersonalizedLodging {
  hotelName: string;
  cidade?: string;
  diarias?: string;
  periodo?: string;
  quartoNumero: string;
  quartoTipo: string;
  roomMates: Array<{ nome: string; tipo: string }>;
  observation?: string;
}

export interface PersonalizedAddon {
  id: string;
  title: string;
  location?: string;
  observation?: string;
  voucherCode?: string;
  voucherEmitted?: boolean;
}

export interface PersonalizedPassenger {
  guestId: string;
  nome: string;
  documento: string;
  tipo: string;
  lodgings: PersonalizedLodging[];
  addons: PersonalizedAddon[];
}

export interface AuthenticateTripResult {
  success: boolean;
  message?: string;
  mode?: "passenger" | "master";
  passenger?: PersonalizedPassenger;
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
  hasRoomGuests?: boolean;
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
      blocks: {
        where: { type: "hospedagem" },
        select: {
          id: true,
          title: true,
          configJson: true,
        },
      },
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

  // Estatísticas da Rooming List para exibir no modal
  let totalRoomGuests = 0;
  const guestPreviews: Array<{ name: string; hotel: string; maskedDoc: string }> = [];

  for (const b of excursion.blocks || []) {
    const d = (b.configJson || {}) as any;
    const roomList = Array.isArray(d.roomList) ? d.roomList : [];
    for (const r of roomList) {
      for (const h of r.hospedes || []) {
        if (h.nome) {
          totalRoomGuests++;
          const cleanDoc = (h.documento || "").replace(/\D/g, "");
          const maskedDoc =
            cleanDoc.length >= 6
              ? `${cleanDoc.slice(0, 3)}.***.***-${cleanDoc.slice(-2)}`
              : h.documento || "Sem documento";

          guestPreviews.push({
            name: h.nome,
            hotel: r.hotelName || d.hotel || b.title || "Hospedagem",
            maskedDoc,
          });
        }
      }
    }
  }

  return {
    shareCode,
    sharePassword: excursion.sharePassword || "",
    isShareActive: excursion.isShareActive ?? true,
    excursionName: excursion.name,
    totalRoomGuests,
    guestPreviews: guestPreviews.slice(0, 15),
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
    return {
      found: false,
      reason: "NOT_FOUND",
      destinations: [],
      itinerary: [],
      flights: [],
      lodgings: [],
      transports: [],
      guides: [],
      includedItems: [],
      customInclusions: [],
    };
  }

  if (excursion.isShareActive === false) {
    return {
      found: false,
      reason: "INACTIVE",
      destinations: [],
      itinerary: [],
      flights: [],
      lodgings: [],
      transports: [],
      guides: [],
      includedItems: [],
      customInclusions: [],
    };
  }

  // Sanitização rigorosa de blocos — REMOÇÃO TOTAL DE QUALQUER CUSTO OU VALOR
  const flights: PublicFlight[] = [];
  let airlineLocator: string | undefined;
  const lodgings: PublicLodging[] = [];
  const transports: PublicTransport[] = [];
  const guides: PublicGuide[] = [];
  const includedItems: Array<{ title: string; icon?: string }> = [];
  const customInclusions: string[] = [];
  let hasRoomGuests = false;

  for (const b of excursion.blocks) {
    const d: any = b.configJson || {};

    if (b.type === "aereo") {
      if (d.localizador) airlineLocator = d.localizador;
      if (Array.isArray(d.flights)) {
        for (const f of d.flights) {
          flights.push({
            id: f.id,
            cia: f.cia,
            voo: f.voo,
            origem: f.origem,
            destino: f.destino,
            saida: f.saida,
            chegada: f.chegada,
            tipo: f.tipo,
            status: f.status,
            conexaoDeId: f.conexaoDeId,
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
      if (Array.isArray(d.roomList)) {
        for (const r of d.roomList) {
          if (Array.isArray(r.hospedes) && r.hospedes.length > 0) {
            hasRoomGuests = true;
          }
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
    hasRoomGuests,
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
 * Autentica o passageiro pelo seu CPF na Rooming List ou pela Senha Master da viagem.
 * Retorna dados rigorosamente personalizados para aquele passageiro (apenas o seu hotel e seus extras).
 */
export async function authenticateTripGuest(params: {
  shareCode: string;
  cpf?: string;
  password?: string;
}): Promise<AuthenticateTripResult> {
  const { shareCode, cpf, password } = params;
  const cleanCode = shareCode.trim().toLowerCase();

  const excursion = await db.excursion.findFirst({
    where: {
      OR: [{ shareCode: cleanCode }, { id: cleanCode }],
    },
    include: {
      blocks: {
        where: { type: "hospedagem" },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!excursion || excursion.isShareActive === false) {
    return { success: false, message: "Viagem não encontrada ou link temporariamente inativo." };
  }

  // Se informou senha master da viagem
  if (password && password.trim()) {
    const expectedPassword = excursion.sharePassword ? excursion.sharePassword.trim() : "";
    if (expectedPassword && password.trim() === expectedPassword) {
      return { success: true, mode: "master" };
    }
    if (!cpf) {
      return { success: false, message: "Senha incorreta. Verifique e tente novamente." };
    }
  }

  // Autenticação pelo CPF do passageiro
  if (!cpf || !cpf.trim()) {
    return { success: false, message: "Informe seu CPF para acessar seus dados da viagem." };
  }

  const cleanInputCpf = cpf.replace(/\D/g, "");
  if (!cleanInputCpf || cleanInputCpf.length < 5) {
    return { success: false, message: "Por favor, digite um CPF válido com números." };
  }

  // Coleta todos os hóspedes da roomlist em todos os blocos de hospedagem
  interface GuestMatchCandidate {
    guest: {
      id: string;
      customerId?: string;
      nome: string;
      documento: string;
      tipo: string;
      observacao?: string;
      birthDate?: string | null;
    };
    room: {
      numero: string;
      tipo: string;
      hotelName?: string;
      hospedes: any[];
    };
    block: any;
  }

  const allCandidates: GuestMatchCandidate[] = [];
  const customerIdsToCheck: string[] = [];

  for (const b of excursion.blocks) {
    const d: any = b.configJson || {};
    const roomList = Array.isArray(d.roomList) ? d.roomList : [];
    for (const r of roomList) {
      const hospedes = Array.isArray(r.hospedes) ? r.hospedes : [];
      for (const h of hospedes) {
        if (h && (h.nome || h.documento)) {
          allCandidates.push({ guest: h, room: r, block: b });
          if (h.customerId) customerIdsToCheck.push(h.customerId);
        }
      }
    }
  }

  if (allCandidates.length === 0) {
    return {
      success: false,
      message:
        "Nenhum passageiro foi cadastrado ainda na Rooming List desta viagem. Caso possua uma senha de acesso, tente pela opção de Senha Geral.",
    };
  }

  // 1. Busca direta por CPF/documento na roomlist
  let matchedCandidate = allCandidates.find((c) => {
    const docClean = (c.guest.documento || "").replace(/\D/g, "");
    if (docClean && docClean === cleanInputCpf) return true;
    if (c.guest.documento && c.guest.documento.trim().toLowerCase() === cpf.trim().toLowerCase()) return true;
    return false;
  });

  // 2. Se não encontrou direto no campo documento, mas o passageiro foi vinculado a um Customer com CPF
  if (!matchedCandidate && customerIdsToCheck.length > 0) {
    const customers = await db.customer.findMany({
      where: { id: { in: customerIdsToCheck } },
      select: { id: true, cpf: true, name: true },
    });
    const matchedCustomer = customers.find((cust) => {
      const cCpf = (cust.cpf || "").replace(/\D/g, "");
      return cCpf && cCpf === cleanInputCpf;
    });

    if (matchedCustomer) {
      matchedCandidate = allCandidates.find((c) => c.guest.customerId === matchedCustomer.id);
    }
  }

  if (!matchedCandidate) {
    return {
      success: false,
      message:
        "CPF não localizado na lista de passageiros desta viagem. Verifique o número digitado ou fale com seu agente da Destino Certo.",
    };
  }

  const matchedGuest = matchedCandidate.guest;

  // Monta a acomodação personalizada: coleta todos os quartos e hotéis onde este passageiro específico está alocado
  const lodgings: PersonalizedLodging[] = [];

  for (const b of excursion.blocks) {
    const d: any = b.configJson || {};
    const roomList = Array.isArray(d.roomList) ? d.roomList : [];

    for (const r of roomList) {
      const hospedes = Array.isArray(r.hospedes) ? r.hospedes : [];
      const isGuestInThisRoom = hospedes.some(
        (h: any) =>
          h.id === matchedGuest.id ||
          ((h.documento || "").replace(/\D/g, "") === cleanInputCpf && cleanInputCpf !== "")
      );

      if (isGuestInThisRoom) {
        const roomMates = hospedes
          .filter(
            (h: any) =>
              h.id !== matchedGuest.id &&
              (h.documento || "").replace(/\D/g, "") !== cleanInputCpf
          )
          .map((h: any) => ({
            nome: h.nome || "Hóspede",
            tipo: h.tipo || "Adulto",
          }));

        lodgings.push({
          hotelName: r.hotelName || d.hotel || b.title || "Hospedagem",
          cidade: d.cidade,
          diarias: d.diarias ? `${d.diarias} diárias` : undefined,
          periodo: d.periodo,
          quartoNumero: r.numero
            ? (r.numero.trim().toLowerCase().startsWith("quarto") ? r.numero.trim() : `Quarto nº ${r.numero.trim()}`)
            : "Quarto a confirmar",
          quartoTipo: r.tipo || "Acomodação Padrão",
          roomMates,
          observation: d.observation,
        });
      }
    }
  }

  // Se por alguma razão o hóspede estava na room list mas não alocado em quarto específico
  if (lodgings.length === 0) {
    lodgings.push({
      hotelName: matchedCandidate.room?.hotelName || matchedCandidate.block?.title || "Hospedagem Confirmada",
      quartoNumero: matchedCandidate.room?.numero ? `Quarto nº ${matchedCandidate.room.numero}` : "Quarto a confirmar",
      quartoTipo: matchedCandidate.room?.tipo || "Padrão",
      roomMates: [],
    });
  }

  // Coleta os adicionais/passeios contratados ESPECIFICAMENTE por este passageiro
  const rawAddons = (excursion.addonsJson as any) || {};
  const addonsList: any[] = Array.isArray(rawAddons)
    ? rawAddons
    : Array.isArray(rawAddons.addons)
    ? rawAddons.addons
    : [];

  const personalizedAddons: PersonalizedAddon[] = [];
  for (const addon of addonsList) {
    const assignedIds: string[] = Array.isArray(addon.assignedGuestIds) ? addon.assignedGuestIds : [];
    if (assignedIds.includes(matchedGuest.id)) {
      const voucherInfo = addon.vouchers?.[matchedGuest.id];
      personalizedAddons.push({
        id: addon.id,
        title: addon.title,
        location: addon.location,
        observation: addon.observation,
        voucherCode: voucherInfo?.voucherCode,
        voucherEmitted: Boolean(voucherInfo?.emitted),
      });
    }
  }

  return {
    success: true,
    mode: "passenger",
    passenger: {
      guestId: matchedGuest.id,
      nome: matchedGuest.nome,
      documento: matchedGuest.documento || cpf,
      tipo: matchedGuest.tipo || "Adulto",
      lodgings,
      addons: personalizedAddons,
    },
  };
}

/**
 * Compatibilidade: Verifica a senha de acesso digitada pelo viajante
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
