"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";

export type SocialConnectionMode = "TODOS" | "RESERVA" | "EXCURSAO";

export interface SocialNode {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  tripsCount: number;
  companionsCount: number;
  color: string;
  radius: number;
  isHub?: boolean;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface SocialLink {
  id: string;
  source: string;
  target: string;
  weight: number;
  trips: string[];
}

export interface SocialGraphData {
  mode?: SocialConnectionMode;
  nodes: SocialNode[];
  links: SocialLink[];
  stats: {
    totalConnectedClients: number;
    totalConnections: number;
    topDestinations: Array<{ name: string; count: number }>;
    largestGroups: Array<{ customerName: string; companionsCount: number }>;
  };
}

// Cores flat minimalistas calibradas com o visual cósmico do Obsidian Graph View
function pickColor(companionsCount: number): string {
  if (companionsCount >= 350) return "#f97316"; // Super Hub (George) - Laranja sol radiante
  if (companionsCount >= 100) return "#fb923c"; // Grandes hubs - Âmbar quente
  if (companionsCount >= 30) return "#34d399";  // Médios-altos - Esmeralda
  if (companionsCount >= 10) return "#38bdf8";  // Médios - Ciano
  if (companionsCount >= 4) return "#a78bfa";   // Pequenos - Violeta pastel
  return "#94a3b8";                             // Conexões mínimas - Cinza ardósia clássico do Obsidian
}

export async function getCustomerSocialGraph(params?: {
  mode?: SocialConnectionMode;
  minConnections?: number;
  limit?: number;
  query?: string;
}): Promise<SocialGraphData> {
  await requireAuth();

  const minConn = params?.minConnections ?? 1;
  const maxNodesLimit = params?.limit ?? 550;
  const searchQuery = params?.query?.trim().toLowerCase() || "";

  // 1. Busca todas as viagens dos clientes
  const allTrips = await db.customerTrip.findMany({
    select: {
      customerId: true,
      groupName: true,
      companionsJson: true,
      customer: {
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
        },
      },
    },
  });

  const customerMap = new Map<
    string,
    {
      id: string;
      name: string;
      city?: string | null;
      state?: string | null;
      tripsCount: number;
      companionsSet: Set<string>;
    }
  >();

  const pairWeights = new Map<
    string,
    { source: string; target: string; weight: number; trips: Set<string> }
  >();

  const getPairKey = (id1: string, id2: string) =>
    id1 < id2 ? `${id1}___${id2}` : `${id2}___${id1}`;

  const addConnection = (
    id1: string,
    id2: string,
    cust1: any,
    cust2: any,
    tripName?: string | null
  ) => {
    if (!id1 || !id2 || id1 === id2) return;

    if (!customerMap.has(id1)) {
      customerMap.set(id1, {
        id: id1,
        name: cust1?.name?.trim() || "Passageiro",
        city: cust1?.city,
        state: cust1?.state,
        tripsCount: 0,
        companionsSet: new Set(),
      });
    }
    if (!customerMap.has(id2)) {
      customerMap.set(id2, {
        id: id2,
        name: cust2?.name?.trim() || "Passageiro",
        city: cust2?.city,
        state: cust2?.state,
        tripsCount: 0,
        companionsSet: new Set(),
      });
    }

    customerMap.get(id1)!.companionsSet.add(id2);
    customerMap.get(id2)!.companionsSet.add(id1);

    const pairKey = getPairKey(id1, id2);
    const pair = pairWeights.get(pairKey) || {
      source: id1 < id2 ? id1 : id2,
      target: id1 < id2 ? id2 : id1,
      weight: 0,
      trips: new Set<string>(),
    };
    pair.weight++;
    if (tripName) pair.trips.add(tripName);
    pairWeights.set(pairKey, pair);
  };

  // 2. Registra histórico e processa conexões de viagem compartilhada:
  // A) Conexões diretas da mesma reserva / voucher (companionsJson)
  allTrips.forEach((trip) => {
    const mainId = trip.customerId;
    const mainCust = trip.customer;
    if (!mainCust) return;

    if (!customerMap.has(mainId)) {
      customerMap.set(mainId, {
        id: mainId,
        name: mainCust.name?.trim() || "Passageiro",
        city: mainCust.city,
        state: mainCust.state,
        tripsCount: 0,
        companionsSet: new Set(),
      });
    }
    customerMap.get(mainId)!.tripsCount++;

    const rawComps = trip.companionsJson as any[];
    if (Array.isArray(rawComps) && rawComps.length > 0) {
      rawComps.forEach((comp) => {
        const compId = comp?.customerId;
        if (compId && compId !== mainId) {
          addConnection(
            mainId,
            compId,
            mainCust,
            { name: comp.name, city: mainCust.city, state: mainCust.state },
            trip.groupName
          );
        }
      });
    }
  });

  // B) Conexões de pessoas que viajaram juntas na mesma excursão / grupo / pacote (groupName)
  const groupMap = new Map<string, Array<{ customerId: string; customer: any }>>();
  allTrips.forEach((trip) => {
    if (!trip.groupName || !trip.customer) return;
    const g = trip.groupName.trim();
    if (!g) return;

    if (!groupMap.has(g)) groupMap.set(g, []);
    groupMap.get(g)!.push({
      customerId: trip.customerId,
      customer: trip.customer,
    });
  });

  groupMap.forEach((passengers, groupName) => {
    const uniqueMap = new Map(passengers.map((p) => [p.customerId, p.customer]));
    const uniquePassengers = Array.from(uniqueMap.entries());
    if (uniquePassengers.length < 2) return;

    for (let i = 0; i < uniquePassengers.length; i++) {
      const [idA, custA] = uniquePassengers[i];
      for (let j = i + 1; j < uniquePassengers.length; j++) {
        const [idB, custB] = uniquePassengers[j];
        addConnection(idA, idB, custA, custB, groupName);
      }
    }
  });

  // 3. Filtra nós pelo critério mínimo de conexões ou busca
  let candidateCustomers = Array.from(customerMap.values()).filter(
    (c) => c.companionsSet.size >= minConn
  );

  let selectedCustomers: typeof candidateCustomers = [];

  if (searchQuery) {
    const directMatches = candidateCustomers.filter((c) =>
      c.name.toLowerCase().includes(searchQuery)
    );
    const directMatchIds = new Set(directMatches.map((c) => c.id));
    const neighborIds = new Set<string>();
    directMatches.forEach((c) => {
      c.companionsSet.forEach((nid) => neighborIds.add(nid));
    });
    const allConnectedIds = new Set([...directMatchIds, ...neighborIds]);
    selectedCustomers = candidateCustomers
      .filter((c) => allConnectedIds.has(c.id))
      .sort((a, b) => b.companionsSet.size - a.companionsSet.size)
      .slice(0, maxNodesLimit);
  } else {
    // Sem busca: Ordena por relevância e garante inclusão TOTAL de todos os companheiros dos super-hubs (como George)
    candidateCustomers.sort((a, b) => b.companionsSet.size - a.companionsSet.size);

    // Identifica os super-hubs da agência (ex: George Augusto com 427 conexões)
    const topSuperHubs = candidateCustomers.filter((c) => c.companionsSet.size >= 350);

    const selectedMap = new Map<string, (typeof candidateCustomers)[0]>();

    // 1. Adiciona os super-hubs e TODOS os seus companheiros diretos (garante 100% dos 427 companheiros de George!)
    topSuperHubs.forEach((hub) => {
      selectedMap.set(hub.id, hub);
      hub.companionsSet.forEach((compId) => {
        const comp = customerMap.get(compId);
        if (comp) selectedMap.set(comp.id, comp);
      });
    });

    // 2. Preenche com os demais clientes mais conectados até atingir o limite
    for (const c of candidateCustomers) {
      if (selectedMap.size >= maxNodesLimit) break;
      if (!selectedMap.has(c.id)) selectedMap.set(c.id, c);
    }

    selectedCustomers = Array.from(selectedMap.values());
  }

  const selectedIdsSet = new Set(selectedCustomers.map((c) => c.id));

  // 4. Constrói a lista de nós com alta discrepância visual de tamanho (Obsidian Galaxy Scaling)
  const nodes: SocialNode[] = selectedCustomers.map((c) => {
    const companionsCount = c.companionsSet.size;

    // Alta discrepância de diâmetro:
    // Passageiros periféricos (1 conexão): 3.5px (diâmetro 7px - pontinho sutil)
    // Conexão baixa (5 conexões): ~5.2px (diâmetro 10.4px)
    // Conexão média (20 conexões): ~8.1px (diâmetro 16.2px)
    // Grandes viajantes (80 conexões): ~15.9px (diâmetro 31.8px)
    // Frequentadores centrais (200 conexões): ~28.5px (diâmetro 57px)
    // Super-hubs como George (400+ conexões): 45px (diâmetro 90px - SOL CENTRAL GIGANTESCO!)
    const radius = Math.min(
      45,
      Math.max(3.5, 3.5 + Math.pow(companionsCount / 427, 0.72) * 41.5)
    );

    return {
      id: c.id,
      name: c.name?.trim() || "Passageiro",
      city: c.city,
      state: c.state,
      tripsCount: c.tripsCount,
      companionsCount,
      color: pickColor(companionsCount),
      radius,
      isHub: companionsCount >= 80,
    };
  });

  // 5. Filtra arestas cujos dois nós estão selecionados no grafo
  // GARANTE que 100% dos links diretos para super-hubs (como George) fiquem SEMPRE presentes
  const directHubLinks: SocialLink[] = [];
  const otherLinks: SocialLink[] = [];

  const superHubIds = new Set(nodes.filter((n) => n.companionsCount >= 350).map((n) => n.id));

  pairWeights.forEach((val, key) => {
    if (selectedIdsSet.has(val.source) && selectedIdsSet.has(val.target)) {
      const isDirectToSuperHub =
        superHubIds.has(val.source) || superHubIds.has(val.target);

      const linkObj: SocialLink = {
        id: key,
        source: val.source,
        target: val.target,
        weight: val.weight,
        trips: Array.from(val.trips),
      };

      if (isDirectToSuperHub) {
        directHubLinks.push(linkObj);
      } else {
        otherLinks.push(linkObj);
      }
    }
  });

  // Prioriza outros links por quantidade de viagens em conjunto (peso)
  otherLinks.sort((a, b) => b.weight - a.weight);

  // Mantém TODOS os links diretos dos super-hubs (ex: todas as 427 de George) + até 1800 links entre outros passageiros
  const links: SocialLink[] = [...directHubLinks, ...otherLinks.slice(0, 1800)];

  const largestGroups = nodes
    .slice(0, 5)
    .map((n) => ({ customerName: n.name, companionsCount: n.companionsCount }));

  return {
    mode: "TODOS",
    nodes,
    links,
    stats: {
      totalConnectedClients: nodes.length,
      totalConnections: links.length,
      topDestinations: [],
      largestGroups,
    },
  };
}
