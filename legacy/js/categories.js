/**
 * Destino Certo - Definições de Categorias baseadas no Design System Moderno
 */

const CATEGORY_DEFINITIONS = {
  itens_inclusos: {
    id: 'itens_inclusos',
    name: 'Itens Inclusos',
    shortName: 'Itens Inclusos',
    icon: '📦',
    accentColor: '#C86D3B',
    description: 'Custos gerais e serviços inclusos no pacote com fornecedor e status de reserva',
    defaultData: {
      title: 'Itens Inclusos',
      columns: ['TIPO DE ITEM', 'FORNECEDOR / DESCRIÇÃO', 'CUSTO ESTIMADO (R$)', 'STATUS DA RESERVA'],
      rows: [
        { type: 'Aéreo', icon: '✈️', color: '#D97706', fornecedor: 'LATAM Airlines / Azul', custo: '1177.91', status: 'PENDENTE' },
        { type: 'Transporte Rodoviário', icon: '🚌', color: '#B45309', fornecedor: 'Viação / Van Hygor', custo: '112.00', status: 'COTADO' },
        { type: 'Hospedagem', icon: '🏨', color: '#2563EB', fornecedor: 'Tarobá Hotel Foz', custo: '580.00', status: 'CONFIRMADO' },
        { type: 'Guia Acompanhante', icon: '🧭', color: '#059669', fornecedor: 'George Guia Credenciado', custo: '102.00', status: 'CONFIRMADO' },
        { type: 'Kit Lanche & Brindes', icon: '🎁', color: '#7C3AED', fornecedor: 'Kit Viagem Destino Certo', custo: '50.00', status: 'CONFIRMADO' }
      ],
      observation: ''
    }
  },

  personalizados: {
    id: 'personalizados',
    name: 'Personalizados',
    shortName: 'Personalizados',
    icon: '🧮',
    accentColor: '#D97706',
    description: 'Despesas adicionais, ingressos, taxas e margem de lucro por item',
    defaultData: {
      title: 'Personalizados',
      columns: ['NOME DO ITEM', 'CUSTO (R$)', 'LUCRO (R$)'],
      rows: [
        { nome: 'Despesa com motorista', custo: '150.00', lucro: '50.00' },
        { nome: 'Ingressos Parques', custo: '80.00', lucro: '40.00' },
        { nome: 'Brindes e Mimos', custo: '30.00', lucro: '20.00' }
      ],
      observation: ''
    }
  },

  aereo: {
    id: 'aereo',
    name: 'Aéreo Detalhado',
    shortName: 'Aéreo',
    icon: '✈️',
    accentColor: '#D97706',
    description: 'Voos de ida e volta, localizador, conexões, sinal e status',
    defaultData: {
      title: 'Aéreo',
      portal: 'Discovery',
      vagas: '20',
      localizador: 'YNDK3D',
      flights: [
        { cia: 'AZUL', voo: '4605', origem: 'REC', saida: '02:45', chegada: '05:20', destino: 'CNF', tipo: 'Ida', status: 'CONFIRMADO' },
        { cia: 'AZUL', voo: '2599', origem: 'CNF', saida: '08:30', chegada: '10:45', destino: 'FOZ', tipo: 'Ida', status: 'CONFIRMADO' },
        { cia: 'AZUL', voo: '5022', origem: 'FOZ', saida: '14:45', chegada: '16:20', destino: 'CGH', tipo: 'Volta', status: 'CONFIRMADO' },
        { cia: 'AZUL', voo: '4243', origem: 'CGH', saida: '18:15', chegada: '21:20', destino: 'REC', tipo: 'Volta', status: 'CONFIRMADO' }
      ],
      custoUnitario: '1177.91',
      custoTotal: '23558.20',
      sinal: '1800.00',
      status: 'CONFIRMADO',
      observation: '* Sem RAV.'
    }
  },

  hospedagem: {
    id: 'hospedagem',
    name: 'Hospedagem Detalhada',
    shortName: 'Hospedagem',
    icon: '🏨',
    accentColor: '#2563EB',
    description: 'Hotel, quantidade de diárias, quartos contratados (Single, Duplo, Triplo) e cortesias',
    defaultData: {
      title: 'Hospedagem',
      hotel: 'Tarobá Hotel',
      cidade: 'Foz do Iguaçu',
      diarias: '4',
      periodo: '09 a 13/05/2026',
      reserva: '45357',
      localizador: '275140RES49207',
      rooms: [
        { tipo: 'Single', diaria: '220.00', totalQuarto: '880.00', porPessoa: '880.00', qtd: '1', totalPeriodo: '0.00 (Cortesia)' },
        { tipo: 'Duplo', diaria: '290.00', totalQuarto: '1160.00', porPessoa: '580.00', qtd: '5', totalPeriodo: '5800.00' },
        { tipo: 'Triplo', diaria: '360.00', totalQuarto: '1440.00', porPessoa: '480.00', qtd: '3', totalPeriodo: '4320.00' }
      ],
      totalReserva: '9840.00',
      sinal: '30% SINAL 12/03/2026',
      status: 'CONFIRMADO',
      observation: 'Cortesia concedida no quarto duplo solteiro.'
    }
  },

  rodoviario: {
    id: 'rodoviario',
    name: 'Transporte Rodoviário',
    shortName: 'Rodoviário',
    icon: '🚌',
    accentColor: '#B45309',
    description: 'Empresa, veículo, comodidades, valor do contrato e rateio por passageiro',
    defaultData: {
      title: 'Transporte Rodoviário',
      empresa: 'Hygor Turismo',
      atendente: 'Carlos',
      veiculo: 'Micro-ônibus / Van Executiva',
      vagas: '20',
      wifi: 'SIM',
      banheiro: 'SIM',
      ar: 'SIM',
      agua: 'SIM',
      itinerario: 'Saída de Cachoeirinha até Aeroporto / Destino',
      valorContrato: '2000.00',
      cancelamento: 'Sem multa até 15 dias antes',
      rateioPorPessoa: '112.00',
      status: 'COTADO',
      observation: ''
    }
  },

  guias: {
    id: 'guias',
    name: 'Guias e Monitores',
    shortName: 'Guias',
    icon: '🧭',
    accentColor: '#059669',
    description: 'Informações do guia acompanhante/local, honorários e cronograma',
    defaultData: {
      title: 'Guias e Monitores',
      guias: [
        { nome: 'George Silva', tipo: 'Acompanhante', telefone: '(81) 98888-7777', diarias: '5', valorTotal: '750.00', status: 'CONFIRMADO' }
      ],
      rateioPorPessoa: '102.00',
      roteiro: [
        { horario: '08:00', atividade: 'Saída do Hotel', status: 'CONFIRMADO' },
        { horario: '09:00', atividade: 'Passeio Parque das Cataratas', status: 'CONFIRMADO' },
        { horario: '12:30', atividade: 'Almoço no Restaurante Porto Canoas', status: 'CONFIRMADO' },
        { horario: '15:00', atividade: 'Parque das Aves', status: 'CONFIRMADO' },
        { horario: '18:00', atividade: 'Retorno ao Hotel', status: 'CONFIRMADO' }
      ],
      observation: ''
    }
  },

  personalizada: {
    id: 'personalizada',
    name: 'Tabela Customizada',
    shortName: 'Customizada',
    icon: '✨',
    accentColor: '#4F46E5',
    description: 'Crie uma tabela com colunas e linhas que você mesmo define',
    defaultData: {
      title: 'Tabela Customizada',
      columns: ['ITEM', 'FORNECEDOR', 'VALOR (R$)', 'STATUS'],
      rows: [
        { item: 'Seguro Viagem GTA', fornecedor: 'GTA Seguros', valor: '45.00', status: 'CONFIRMADO' },
        { item: 'Transfer Noturno', fornecedor: 'Receptivo Local', valor: '60.00', status: 'PENDENTE' }
      ],
      observation: ''
    }
  }
};

const DEFAULT_PRESETS = {
  'Pacote Foz do Iguaçu (Padrão)': {
    packageName: 'PACOTE FOZ DO IGUAÇU',
    packageDates: '09/05 – 13/05/2026',
    packageSlots: '20',
    blocks: [
      {
        id: 'block_itens_1',
        categoryId: 'itens_inclusos',
        data: JSON.parse(JSON.stringify(CATEGORY_DEFINITIONS.itens_inclusos.defaultData))
      },
      {
        id: 'block_personalizados_1',
        categoryId: 'personalizados',
        data: JSON.parse(JSON.stringify(CATEGORY_DEFINITIONS.personalizados.defaultData))
      },
      {
        id: 'block_aereo_1',
        categoryId: 'aereo',
        data: JSON.parse(JSON.stringify(CATEGORY_DEFINITIONS.aereo.defaultData))
      },
      {
        id: 'block_hospedagem_1',
        categoryId: 'hospedagem',
        data: JSON.parse(JSON.stringify(CATEGORY_DEFINITIONS.hospedagem.defaultData))
      },
      {
        id: 'block_rodoviario_1',
        categoryId: 'rodoviario',
        data: JSON.parse(JSON.stringify(CATEGORY_DEFINITIONS.rodoviario.defaultData))
      },
      {
        id: 'block_guias_1',
        categoryId: 'guias',
        data: JSON.parse(JSON.stringify(CATEGORY_DEFINITIONS.guias.defaultData))
      }
    ]
  }
};
