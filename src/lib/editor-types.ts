// Tipos do Editor de Pacote — paridade com o sistema legado (legacy/js/blocks.js)

export type RowStatus = "PENDENTE" | "COTADO" | "CONFIRMADO";

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

export interface HospedagemRoom {
  tipo: string;
  diaria: string;
  totalQuarto: string;
  porPessoa: string;
  qtd: string;
  totalPeriodo: string;
}

export interface GuiaEntry {
  nome: string;
  tipo: string;
  telefone: string;
  diarias: string;
  valorTotal: string;
  status: RowStatus;
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
