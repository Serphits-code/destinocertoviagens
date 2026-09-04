// Definições de categorias migradas de legacy/js/categories.js
import type { CategoryDefinition } from "./editor-types";

export const CATEGORY_DEFINITIONS: Record<string, CategoryDefinition> = {
  itens_inclusos: {
    id: "itens_inclusos",
    name: "Itens Inclusos",
    icon: "📦",
    description:
      "Custos gerais e serviços inclusos no pacote com fornecedor e status de reserva",
    defaultData: {
      title: "Itens Inclusos",
      rows: [
        { type: "Aéreo", icon: "✈️", color: "#D97706", fornecedor: "LATAM Airlines / Azul", custo: "1177.91", status: "PENDENTE" },
        { type: "Transporte Rodoviário", icon: "🚌", color: "#B45309", fornecedor: "Viação / Van Hygor", custo: "112.00", status: "COTADO" },
        { type: "Hospedagem", icon: "🏨", color: "#2563EB", fornecedor: "Tarobá Hotel Foz", custo: "580.00", status: "CONFIRMADO" },
        { type: "Guia Acompanhante", icon: "🧭", color: "#059669", fornecedor: "George Guia Credenciado", custo: "102.00", status: "CONFIRMADO" },
        { type: "Kit Lanche & Brindes", icon: "🎁", color: "#7C3AED", fornecedor: "Kit Viagem Destino Certo", custo: "50.00", status: "CONFIRMADO" },
      ],
      observation: "",
    },
  },
  personalizados: {
    id: "personalizados",
    name: "Personalizados",
    icon: "🧮",
    description: "Despesas adicionais, ingressos, taxas e margem de lucro por item",
    defaultData: {
      title: "Personalizados",
      rows: [
        { nome: "Despesa com motorista", custo: "150.00", lucro: "50.00" },
        { nome: "Ingressos Parques", custo: "80.00", lucro: "40.00" },
        { nome: "Brindes e Mimos", custo: "30.00", lucro: "20.00" },
      ],
      observation: "",
    },
  },
  aereo: {
    id: "aereo",
    name: "Aéreo Detalhado",
    icon: "✈️",
    description: "Voos de ida e volta, localizador, conexões, sinal e status",
    defaultData: {
      title: "Aéreo",
      portal: "Discovery",
      vagas: "20",
      localizador: "YNDK3D",
      flights: [
        { cia: "AZUL", voo: "4605", origem: "REC", saida: "02:45", chegada: "05:20", destino: "CNF", tipo: "Ida", status: "CONFIRMADO" },
        { cia: "AZUL", voo: "2599", origem: "CNF", saida: "08:30", chegada: "10:45", destino: "FOZ", tipo: "Ida", status: "CONFIRMADO" },
        { cia: "AZUL", voo: "5022", origem: "FOZ", saida: "14:45", chegada: "16:20", destino: "CGH", tipo: "Volta", status: "CONFIRMADO" },
        { cia: "AZUL", voo: "4243", origem: "CGH", saida: "18:15", chegada: "21:20", destino: "REC", tipo: "Volta", status: "CONFIRMADO" },
      ],
      custoUnitario: "1177.91",
      custoTotal: "23558.20",
      sinal: "1800.00",
      status: "CONFIRMADO",
      observation: "* Sem RAV.",
    },
  },
  hospedagem: {
    id: "hospedagem",
    name: "Hospedagem Detalhada",
    icon: "🏨",
    description: "Hotel, diárias, quartos contratados (Single, Duplo, Triplo) e cortesias",
    defaultData: {
      title: "Hospedagem",
      hotel: "Tarobá Hotel",
      cidade: "Foz do Iguaçu",
      diarias: "4",
      periodo: "09 a 13/05/2026",
      reserva: "45357",
      localizador: "275140RES49207",
      rooms: [
        { tipo: "Single", diaria: "220.00", totalQuarto: "880.00", porPessoa: "880.00", qtd: "1", totalPeriodo: "0.00 (Cortesia)" },
        { tipo: "Duplo", diaria: "290.00", totalQuarto: "1160.00", porPessoa: "580.00", qtd: "5", totalPeriodo: "5800.00" },
        { tipo: "Triplo", diaria: "360.00", totalQuarto: "1440.00", porPessoa: "480.00", qtd: "3", totalPeriodo: "4320.00" },
      ],
      totalReserva: "9840.00",
      sinal: "30% SINAL 12/03/2026",
      status: "CONFIRMADO",
      observation: "Cortesia concedida no quarto duplo solteiro.",
    },
  },
  rodoviario: {
    id: "rodoviario",
    name: "Transporte Rodoviário",
    icon: "🚌",
    description: "Empresa, veículo, comodidades, valor do contrato e rateio por passageiro",
    defaultData: {
      title: "Transporte Rodoviário",
      empresa: "Hygor Turismo",
      atendente: "Carlos",
      veiculo: "Micro-ônibus / Van Executiva",
      vagas: "20",
      wifi: "SIM",
      banheiro: "SIM",
      ar: "SIM",
      agua: "SIM",
      itinerario: "Saída de Cachoeirinha até Aeroporto / Destino",
      valorContrato: "2000.00",
      cancelamento: "Sem multa até 15 dias antes",
      rateioPorPessoa: "112.00",
      status: "COTADO",
      observation: "",
    },
  },
  guias: {
    id: "guias",
    name: "Guias e Monitores",
    icon: "🧭",
    description: "Informações do guia acompanhante/local, honorários e cronograma",
    defaultData: {
      title: "Guias e Monitores",
      guias: [
        { nome: "George Silva", tipo: "Acompanhante", telefone: "(81) 98888-7777", diarias: "5", valorTotal: "750.00", status: "CONFIRMADO" },
      ],
      rateioPorPessoa: "102.00",
      roteiro: [
        { horario: "08:00", atividade: "Saída do Hotel", status: "CONFIRMADO" },
        { horario: "09:00", atividade: "Passeio Parque das Cataratas", status: "CONFIRMADO" },
        { horario: "12:30", atividade: "Almoço no Restaurante Porto Canoas", status: "CONFIRMADO" },
        { horario: "15:00", atividade: "Parque das Aves", status: "CONFIRMADO" },
        { horario: "18:00", atividade: "Retorno ao Hotel", status: "CONFIRMADO" },
      ],
      observation: "",
    },
  },
  personalizada: {
    id: "personalizada",
    name: "Tabela Customizada",
    icon: "✨",
    description: "Crie uma tabela com colunas e linhas que você mesmo define",
    defaultData: {
      title: "Tabela Customizada",
      rows: [
        { item: "Seguro Viagem GTA", fornecedor: "GTA Seguros", valor: "45.00", status: "CONFIRMADO" },
        { item: "Transfer Noturno", fornecedor: "Receptivo Local", valor: "60.00", status: "PENDENTE" },
      ],
      observation: "",
    },
  },
  servicos_inclusos: {
    id: "servicos_inclusos",
    name: "Serviços Inclusos (Duplo/Triplo)",
    icon: "💰",
    description:
      "Tabela de serviços com valores por tipo de quarto: valor sem lucro, lucro, à vista, a prazo e taxa do cartão",
    defaultData: {
      title: "Tabela de Serviços Inclusos",
      extraColumns: [],
      rows: [
        { servico: "Aéreo", duplo: "1177.91", triplo: "1177.91" },
        { servico: "Hotel Tarobá", duplo: "580.00", triplo: "480.00" },
        { servico: "Rodoviário 1", duplo: "112.00", triplo: "112.00" },
        { servico: "Rodoviário 2 + Guia", duplo: "353.00", triplo: "353.00" },
        { servico: "Despesas do Guia", duplo: "102.00", triplo: "102.00" },
        { servico: "Kit Lanche e reunião", duplo: "30.00", triplo: "30.00" },
        { servico: "Brinde", duplo: "20.00", triplo: "20.00" },
      ],
      summaryRows: [
        { label: "Valor sem lucro", duplo: "2374.91", triplo: "2274.91" },
        { label: "Lucro", duplo: "255.09", triplo: "255.09" },
        { label: "Valor Total à vista", duplo: "2630.00", triplo: "2530.00" },
        { label: "Valor Total a prazo", duplo: "2800.00", triplo: "2700.00" },
        { label: "Taxa do cartão", duplo: "75.14", triplo: "72.25" },
      ],
      observation: "",
    },
  },
  criancas: {
    id: "criancas",
    name: "Tabela para Crianças",
    icon: "🧒",
    description: "Valores e itens inclusos por faixa etária infantil",
    defaultData: {
      title: "Tabela para Crianças",
      rows: [
        { idade: "0 - 1", inclusos: "—", valor: "FREE", valor2: "FREE" },
        {
          idade: "2 - 5",
          inclusos: "Aéreo + Rodoviário 1 + Rodoviário 2 + Guia + Despesas do guia + Kit lanche + Brinde + Lucro",
          valor: "2050.00",
          valor2: "2200.00",
        },
      ],
      observation: "",
    },
  },
  roteiro_dias: {
    id: "roteiro_dias",
    name: "Roteiro por Dias",
    icon: "🗓️",
    description: "Roteiro da viagem organizado dia a dia",
    defaultData: {
      title: "Roteiro",
      days: [
        { dia: "DIA 1", descricao: "Chegada, almoço e Paraguai (noite livre)" },
        { dia: "DIA 2", descricao: "Paraguai, Noite Rafain" },
        { dia: "DIA 3", descricao: "Argentina: Manhã livre (Cataratas Argentinas) Noite Argentina" },
        { dia: "DIA 4", descricao: "Cataratas Brasileiras e Parque das Aves, Noite Marco 3 Fronteiras" },
        { dia: "DIA 5", descricao: "Manhã livre (Itaipu ou Aquário). Retorno" },
      ],
      observation: "",
    },
  },
};

export const CATEGORY_LIST = Object.values(CATEGORY_DEFINITIONS);
