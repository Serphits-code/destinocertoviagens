import worldCountriesData from "./worldCountries.json";

export interface CountryData {
  id: string;
  name: string;
  region: "origin" | "south_america" | "americas" | "europe_africa" | "world";
  threshold: number;
  paths: string[];
}

export const worldCountries = worldCountriesData as CountryData[];

export interface DestinationPoint {
  id: string;
  name: string;
  city: string;
  country: string;
  code: string;
  x: number;
  y: number;
  threshold: number;
  flightTimeFromRecife: string;
  distanceKm: string;
  highlights: string[];
  type: "origem" | "nacional" | "internacional";
  flag: string;
}

export const DESTINATIONS: DestinationPoint[] = [
  {
    id: "recife",
    name: "Recife (Marco Zero)",
    city: "Recife",
    country: "Brasil",
    code: "REC",
    x: 322.47,
    y: 546.55,
    threshold: 0.0,
    flightTimeFromRecife: "Ponto de Origem",
    distanceKm: "0 km",
    highlights: ["Marco Zero", "Praia de Boa Viagem", "Frevo & Cultura", "Hub Destino Certo"],
    type: "origem",
    flag: "🇧🇷",
  },
  {
    id: "noronha",
    name: "Fernando de Noronha",
    city: "Noronha",
    country: "Brasil",
    code: "FEN",
    x: 338.0,
    y: 532.0,
    threshold: 0.08,
    flightTimeFromRecife: "1h 10m",
    distanceKm: "545 km",
    highlights: ["Baía do Sancho", "Mergulho com Golfinhos", "Paraíso Ecológico"],
    type: "nacional",
    flag: "🇧🇷",
  },
  {
    id: "salvador",
    name: "Salvador",
    city: "Salvador",
    country: "Brasil",
    code: "SSA",
    x: 312.0,
    y: 572.0,
    threshold: 0.12,
    flightTimeFromRecife: "1h 25m",
    distanceKm: "675 km",
    highlights: ["Pelourinho", "Farol da Barra", "Culinária Baiana"],
    type: "nacional",
    flag: "🇧🇷",
  },
  {
    id: "rio",
    name: "Rio de Janeiro",
    city: "Rio de Janeiro",
    country: "Brasil",
    code: "GIG",
    x: 300.0,
    y: 602.0,
    threshold: 0.16,
    flightTimeFromRecife: "2h 50m",
    distanceKm: "1.870 km",
    highlights: ["Cristo Redentor", "Pão de Açúcar", "Copacabana"],
    type: "nacional",
    flag: "🇧🇷",
  },
  {
    id: "saopaulo",
    name: "São Paulo",
    city: "São Paulo",
    country: "Brasil",
    code: "GRU",
    x: 292.0,
    y: 606.0,
    threshold: 0.18,
    flightTimeFromRecife: "3h 10m",
    distanceKm: "2.130 km",
    highlights: ["Avenida Paulista", "Gastronomia Internacional", "Centro Financeiro"],
    type: "nacional",
    flag: "🇧🇷",
  },
  {
    id: "foz",
    name: "Foz do Iguaçu",
    city: "Foz do Iguaçu",
    country: "Brasil",
    code: "IGU",
    x: 272.0,
    y: 600.0,
    threshold: 0.22,
    flightTimeFromRecife: "4h 15m (com escala)",
    distanceKm: "2.680 km",
    highlights: ["Cataratas do Iguaçu", "Parque das Aves", "Marco das Três Fronteiras"],
    type: "nacional",
    flag: "🇧🇷",
  },
  {
    id: "buenosaires",
    name: "Buenos Aires",
    city: "Buenos Aires",
    country: "Argentina",
    code: "EZE",
    x: 275.0,
    y: 628.0,
    threshold: 0.26,
    flightTimeFromRecife: "5h 15m direto",
    distanceKm: "3.780 km",
    highlights: ["Caminito", "Shows de Tango", "Puerto Madero", "Teatro Colón"],
    type: "internacional",
    flag: "🇦🇷",
  },
  {
    id: "santiago",
    name: "Santiago",
    city: "Santiago",
    country: "Chile",
    code: "SCL",
    x: 250.0,
    y: 636.0,
    threshold: 0.32,
    flightTimeFromRecife: "6h 40m",
    distanceKm: "4.700 km",
    highlights: ["Cordilheira dos Andes", "Vinhedos do Valle Central", "Sky Costanera"],
    type: "internacional",
    flag: "🇨🇱",
  },
  {
    id: "bogota",
    name: "Bogotá",
    city: "Bogotá",
    country: "Colômbia",
    code: "BOG",
    x: 226.0,
    y: 512.0,
    threshold: 0.36,
    flightTimeFromRecife: "6h 20m",
    distanceKm: "4.560 km",
    highlights: ["Museu do Ouro", "Monserrate", "Café Colombiano"],
    type: "internacional",
    flag: "🇨🇴",
  },
  {
    id: "lisboa",
    name: "Lisboa",
    city: "Lisboa",
    country: "Portugal",
    code: "LIS",
    x: 386.0,
    y: 430.0,
    threshold: 0.44,
    flightTimeFromRecife: "7h 15m direto (TAP)",
    distanceKm: "5.840 km",
    highlights: ["Torre de Belém", "Pastéis de Nata", "Bairro Alto", "Porta de Entrada da Europa"],
    type: "internacional",
    flag: "🇵🇹",
  },
  {
    id: "madrid",
    name: "Madrid",
    city: "Madrid",
    country: "Espanha",
    code: "MAD",
    x: 398.0,
    y: 423.0,
    threshold: 0.48,
    flightTimeFromRecife: "8h 30m",
    distanceKm: "6.290 km",
    highlights: ["Museo del Prado", "Gran Vía", "Puerta del Sol", "Estádio Santiago Bernabéu"],
    type: "internacional",
    flag: "🇪🇸",
  },
  {
    id: "paris",
    name: "Paris",
    city: "Paris",
    country: "França",
    code: "CDG",
    x: 410.0,
    y: 407.0,
    threshold: 0.52,
    flightTimeFromRecife: "9h 30m",
    distanceKm: "7.050 km",
    highlights: ["Torre Eiffel", "Museu do Louvre", "Champs-Élysées", "Catedral de Notre-Dame"],
    type: "internacional",
    flag: "🇫🇷",
  },
  {
    id: "roma",
    name: "Roma",
    city: "Roma",
    country: "Itália",
    code: "FCO",
    x: 428.0,
    y: 421.0,
    threshold: 0.55,
    flightTimeFromRecife: "10h 10m",
    distanceKm: "7.460 km",
    highlights: ["Coliseu", "Fontana di Trevi", "Vaticano", "Gastronomia Italiana"],
    type: "internacional",
    flag: "🇮🇹",
  },
  {
    id: "london",
    name: "Londres",
    city: "Londres",
    country: "Reino Unido",
    code: "LHR",
    x: 402.0,
    y: 385.0,
    threshold: 0.58,
    flightTimeFromRecife: "10h 00m",
    distanceKm: "7.350 km",
    highlights: ["Big Ben", "London Eye", "Tower Bridge", "Palácio de Buckingham"],
    type: "internacional",
    flag: "🇬🇧",
  },
  {
    id: "miami",
    name: "Miami / Orlando",
    city: "Flórida",
    country: "Estados Unidos",
    code: "MIA",
    x: 215.0,
    y: 465.0,
    threshold: 0.62,
    flightTimeFromRecife: "8h 10m direto",
    distanceKm: "6.100 km",
    highlights: ["Parques da Disney & Universal", "South Beach", "Compras & Entretenimento"],
    type: "internacional",
    flag: "🇺🇸",
  },
  {
    id: "newyork",
    name: "Nova York",
    city: "Nova York",
    country: "Estados Unidos",
    code: "JFK",
    x: 230.0,
    y: 425.0,
    threshold: 0.66,
    flightTimeFromRecife: "9h 40m",
    distanceKm: "6.850 km",
    highlights: ["Times Square", "Estátua da Liberdade", "Central Park", "Broadway"],
    type: "internacional",
    flag: "🇺🇸",
  },
  {
    id: "cairo",
    name: "Cairo",
    city: "Cairo",
    country: "Egito",
    code: "CAI",
    x: 485.0,
    y: 458.0,
    threshold: 0.70,
    flightTimeFromRecife: "12h 30m",
    distanceKm: "8.650 km",
    highlights: ["Pirâmides de Gizé", "Esfinge", "Cruzeiro pelo Rio Nilo"],
    type: "internacional",
    flag: "🇪🇬",
  },
  {
    id: "capetown",
    name: "Cidade do Cabo",
    city: "Cape Town",
    country: "África do Sul",
    code: "CPT",
    x: 468.0,
    y: 630.0,
    threshold: 0.72,
    flightTimeFromRecife: "8h 30m direto",
    distanceKm: "6.120 km",
    highlights: ["Table Mountain", "Cabo da Boa Esperança", "Safáris & Vinhedos"],
    type: "internacional",
    flag: "🇿🇦",
  },
  {
    id: "dubai",
    name: "Dubai",
    city: "Dubai",
    country: "Emirados Árabes",
    code: "DXB",
    x: 535.0,
    y: 467.0,
    threshold: 0.78,
    flightTimeFromRecife: "14h 20m",
    distanceKm: "11.100 km",
    highlights: ["Burj Khalifa", "Dubai Mall", "Safári no Deserto", "Ilhas Palm"],
    type: "internacional",
    flag: "🇦🇪",
  },
  {
    id: "tokyo",
    name: "Tóquio",
    city: "Tóquio",
    country: "Japão",
    code: "HND",
    x: 710.0,
    y: 430.0,
    threshold: 0.85,
    flightTimeFromRecife: "23h 00m (com conexão)",
    distanceKm: "17.400 km",
    highlights: ["Shibuya Crossing", "Monte Fuji", "Templos Históricos", "Tecnologia de Ponta"],
    type: "internacional",
    flag: "🇯🇵",
  },
  {
    id: "sydney",
    name: "Sydney",
    city: "Sydney",
    country: "Austrália",
    code: "SYD",
    x: 685.0,
    y: 675.0,
    threshold: 0.90,
    flightTimeFromRecife: "21h 30m (com conexão)",
    distanceKm: "15.200 km",
    highlights: ["Sydney Opera House", "Bondi Beach", "Harbour Bridge"],
    type: "internacional",
    flag: "🇦🇺",
  },
];

export interface FlightRoute {
  id: string;
  destId: string;
  destName: string;
  path: string;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  controlPoint: { x: number; y: number };
  threshold: number;
}

const RECIFE_X = 322.47;
const RECIFE_Y = 546.55;

export const FLIGHT_ROUTES: FlightRoute[] = DESTINATIONS.filter(
  (d) => d.id !== "recife"
).map((dest) => {
  const sx = RECIFE_X;
  const sy = RECIFE_Y;
  const dx = dest.x;
  const dy = dest.y;

  const mx = (sx + dx) / 2;
  const my = (sy + dy) / 2;
  const vx = dx - sx;
  const vy = dy - sy;
  const dist = Math.hypot(vx, vy);

  let nx = -vy / dist;
  let ny = vx / dist;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }

  const curvature = Math.min(55, Math.max(12, dist * 0.22));
  const cx = mx + nx * curvature;
  const cy = my + ny * curvature;

  const path = `M ${sx.toFixed(1)},${sy.toFixed(1)} Q ${cx.toFixed(1)},${cy.toFixed(1)} ${dx.toFixed(1)},${dy.toFixed(1)}`;

  return {
    id: `route-recife-${dest.id}`,
    destId: dest.id,
    destName: dest.name,
    path,
    startPoint: { x: sx, y: sy },
    endPoint: { x: dx, y: dy },
    controlPoint: { x: cx, y: cy },
    threshold: dest.threshold,
  };
});

export interface StoryMilestone {
  range: [number, number];
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  telemetry: {
    altitude: string;
    coordenadas: string;
    cobertura: string;
    destinosAtivos: string;
  };
}

export const STORY_MILESTONES: StoryMilestone[] = [
  {
    range: [0.0, 0.22],
    badge: "FASE 1 • ORIGEM & NORDESTE",
    title: "Recife: O Marco Zero de Todas as Jornadas",
    subtitle: "Ponto de Partida da Destino Certo Viagens • 08° 03' S, 34° 53' W",
    description:
      "Tudo começa no litoral pernambucano. O radar se ativa no Marco Zero do Recife, traçando as primeiras conexões pelo litoral do Nordeste e Fernando de Noronha.",
    telemetry: {
      altitude: "Zoom 12.0x • Nível Regional",
      coordenadas: "08°03'14\"S / 34°52'52\"W",
      cobertura: "Nordeste & Litoral Brasileiro",
      destinosAtivos: "Recife, Noronha, Salvador",
    },
  },
  {
    range: [0.22, 0.45],
    badge: "FASE 2 • BRASIL & AMÉRICA DO SUL",
    title: "Expansão Continental: A Força da América do Sul",
    subtitle: "Do Atlântico aos Andes • Rotas Nacionais e Latino-Americanas",
    description:
      "O mapa se constrói em direção ao Sul e Oeste: o contorno do Brasil se desenha, alcançando Rio de Janeiro, São Paulo e Foz do Iguaçu, avançando para Buenos Aires, Santiago e Bogotá.",
    telemetry: {
      altitude: "Zoom 5.5x • Nível Continental",
      coordenadas: "15°47'38\"S / 47°52'58\"W",
      cobertura: "América do Sul Completa",
      destinosAtivos: "8 Metrópoles Latino-Americanas",
    },
  },
  {
    range: [0.45, 0.72],
    badge: "FASE 3 • TRAVESSIA DO ATLÂNTICO",
    title: "A Travessia Transatlântica: Europa & África",
    subtitle: "Conexões Históricas • Mais de 6.000 km sem Escalas",
    description:
      "Cruzando o oceano azul profundo! As linhas de voo se estendem diretamente do Recife para Lisboa, Madrid, Paris, Roma e Londres, enquanto o continente africano acende suas rotas.",
    telemetry: {
      altitude: "Zoom 2.8x • Nível Oceânico",
      coordenadas: "28°00'00\"N / 20°00'00\"W",
      cobertura: "Atlântico, Europa & África",
      destinosAtivos: "14 Capitais Internacionais",
    },
  },
  {
    range: [0.72, 1.0],
    badge: "FASE 4 • O MUNDO COMPLETO",
    title: "Destino Certo: O Planeta em 360°",
    subtitle: "Rede Global nos 6 Continentes • O Mundo ao Seu Alcance",
    description:
      "O mapa mundi completo é construído com perfeição geométrica flat design. América do Norte, Ásia e Oceania integrados em uma malha viva de viagens inesquecíveis.",
    telemetry: {
      altitude: "Zoom 1.0x • Visão Global Panorâmica",
      coordenadas: "00°00'00\"N / 00°00'00\"E",
      cobertura: "6 Continentes • 180 Nações",
      destinosAtivos: "Rede Global Total",
    },
  },
];
