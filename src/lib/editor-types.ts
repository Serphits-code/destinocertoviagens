// Tipos do Editor de Pacote — paridade com o sistema legado (legacy/js/blocks.js)

export type RowStatus = "PENDENTE" | "COTADO" | "CONFIRMADO" | "CANCELADO";

export interface CustomAgeTier {
  id: string;
  label: string;      // Ex: "Adulto", "Criança 02 a 05 anos", "Criança 06 a 11 anos", "Bebê", etc.
  minAge: number;     // Idade mínima (anos)
  maxAge: number;     // Idade máxima (anos)
  price: string | number; // Valor em R$ para este bloco
}

export interface BlockAgePricing {
  adulto?: number | string;
  crianca?: number | string;
  bebe?: number | string;
  tiers?: CustomAgeTier[];
}

export interface ItensInclusosRow {
  type: string;
  icon: string;
  color: string;
  fornecedor: string;
  custo: string;
  status: RowStatus;
}

export interface PersonalizadosRow {
  nome: string;
  custo: string;
  lucro: string;
}

export interface AereoFlight {
  cia: string;
  voo: string;
  origem: string;
  saida: string;
  chegada: string;
  destino: string;
  tipo: string;
  status: RowStatus;
}

export interface PrazoPagamentoItem {
  id: string;
  data: string;
  valor?: string;
  descricao?: string;
}

export interface AereoBlockData {
  title?: string;
  canalVendaNome?: string;
  canalVendaContato?: string;
  fornecedor?: string;
  canalVenda?: string;
  portal?: string;
  localizador?: string;
  vagas?: string;
  flights?: AereoFlight[];
  custoUnitario?: string;
  custoTotal?: string;
  valorNet?: string;
  valorNetUnitario?: string;
  valorNetTotal?: string;
  sinalUnitario?: string;
  sinalTotal?: string;
  sinal?: string;
  prazoSinal?: string;
  prazoPagamentoTotal?: string;
  prazosPagamentoFinal?: PrazoPagamentoItem[];
  prazoEmissao?: string;
  status?: RowStatus;
  observation?: string;
  agePricing?: BlockAgePricing;
}

export interface HospedagemRoom {
  tipo: string;
  diaria: string;
  totalQuarto: string;
  porPessoa: string;
  qtd: string;
  totalPeriodo: string;
}

export interface HospedagemBlockData {
  title?: string;
  hotel?: string;
  cidade?: string;
  diarias?: string;
  periodo?: string;
  reserva?: string;
  localizador?: string;
  rooms?: HospedagemRoom[];
  totalReserva?: string;
  valorNet?: string;
  valorNetUnitario?: string;
  valorNetTotal?: string;
  sinalUnitario?: string;
  sinalTotal?: string;
  sinal?: string;
  prazoSinal?: string;
  prazoPagamentoTotal?: string;
  prazosPagamentoFinal?: PrazoPagamentoItem[];
  status?: RowStatus;
  observation?: string;
  agePricing?: BlockAgePricing;
}

export interface RodoviarioBlockData {
  title?: string;
  empresa?: string;
  atendente?: string;
  veiculo?: string;
  vagas?: string;
  wifi?: string;
  banheiro?: string;
  ar?: string;
  agua?: string;
  itinerario?: string;
  trajeto?: string;
  tipoTrajeto?: string;
  valorContrato?: string;
  cancelamento?: string;
  rateioPorPessoa?: string;
  status?: RowStatus;
  observation?: string;
  valorNet?: string;
  valorNetUnitario?: string;
  valorNetTotal?: string;
  sinalUnitario?: string;
  sinalTotal?: string;
  sinal?: string;
  prazoSinal?: string;
  prazoPagamentoTotal?: string;
  prazosPagamentoFinal?: PrazoPagamentoItem[];
  agePricing?: BlockAgePricing;
}

export interface GuiaEntry {
  nome: string;
  tipo: string;
  telefone: string;
  diarias: string;
  valorDiaria?: string;
  valorTotal: string;
  status: RowStatus;
}

export interface GuiaDespesa {
  descricao: string;
  valor: string;
}

export interface RoteiroEntry {
  horario: string;
  atividade: string;
  status: RowStatus;
}

export interface PersonalizadaRow {
  item: string;
  fornecedor: string;
  valor: string;
  status: RowStatus;
}

export type BlockCategoryId =
  | "itens_inclusos"
  | "personalizados"
  | "aereo"
  | "hospedagem"
  | "rodoviario"
  | "guias"
  | "personalizada"
  | "servicos_inclusos"
  | "criancas"
  | "roteiro_dias";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BlockData = Record<string, any>;

export interface EditorBlock {
  id: string;
  categoryId: BlockCategoryId;
  title: string;
  order: number;
  collapsed: boolean;
  data: BlockData;
}

export interface CategoryDefinition {
  id: BlockCategoryId;
  name: string;
  icon: string;
  description: string;
  defaultData: BlockData;
}

export interface PackageData {
  id: string;
  name: string;
  periodStart: string | null;
  periodEnd: string | null;
  slots: number;
  blocks: EditorBlock[];
}
