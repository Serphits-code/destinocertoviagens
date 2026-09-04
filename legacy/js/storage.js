/**
 * Destino Certo - Armazenamento Local, Modelos de Cards e Pacotes
 */

const STORAGE_KEYS = {
  CURRENT_PACKAGE: 'destino_certo_current_package',
  CARD_TEMPLATES: 'destino_certo_card_templates',
  PACKAGE_PRESETS: 'destino_certo_package_presets'
};

const DEFAULT_CARD_TEMPLATES = [
  {
    id: 'tmpl_itens_inclusos',
    name: 'Itens Inclusos (Geral)',
    categoryId: 'itens_inclusos',
    description: 'Tabela padrão com Aéreo, Rodoviário, Hospedagem e Guias com status',
    data: JSON.parse(JSON.stringify(CATEGORY_DEFINITIONS.itens_inclusos.defaultData))
  },
  {
    id: 'tmpl_personalizados_custos',
    name: 'Personalizados & Lucro',
    categoryId: 'personalizados',
    description: 'Despesas com motorista, ingressos, brindes e margem de lucro',
    data: JSON.parse(JSON.stringify(CATEGORY_DEFINITIONS.personalizados.defaultData))
  },
  {
    id: 'tmpl_aereo_azul',
    name: 'Aéreo Azul - Detalhado',
    categoryId: 'aereo',
    description: 'Voos de ida e volta AZUL com localizador e status',
    data: JSON.parse(JSON.stringify(CATEGORY_DEFINITIONS.aereo.defaultData))
  },
  {
    id: 'tmpl_hosp_taroba',
    name: 'Hospedagem Tarobá Hotel',
    categoryId: 'hospedagem',
    description: 'Quartos Single, Duplo e Triplo com diárias e cortesia',
    data: JSON.parse(JSON.stringify(CATEGORY_DEFINITIONS.hospedagem.defaultData))
  },
  {
    id: 'tmpl_rod_van',
    name: 'Transporte Rodoviário',
    categoryId: 'rodoviario',
    description: 'Veículo com Wi-fi, Banheiro, Ar e rateio por passageiro',
    data: JSON.parse(JSON.stringify(CATEGORY_DEFINITIONS.rodoviario.defaultData))
  },
  {
    id: 'tmpl_guias_roteiro',
    name: 'Guias e Monitores + Roteiro',
    categoryId: 'guias',
    description: 'Diárias de guiamento, despesas e grade de horários',
    data: JSON.parse(JSON.stringify(CATEGORY_DEFINITIONS.guias.defaultData))
  }
];

const StorageManager = {
  saveCurrentPackage(packageData) {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_PACKAGE, JSON.stringify(packageData));
      return true;
    } catch (e) {
      console.error('Erro ao salvar pacote:', e);
      return false;
    }
  },

  loadCurrentPackage() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_PACKAGE);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Erro ao carregar pacote:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_PRESETS['Pacote Foz do Iguaçu (Padrão)']));
  },

  getCardTemplates() {
    try {
      const custom = JSON.parse(localStorage.getItem(STORAGE_KEYS.CARD_TEMPLATES) || '[]');
      return [...DEFAULT_CARD_TEMPLATES, ...custom];
    } catch (e) {
      return [...DEFAULT_CARD_TEMPLATES];
    }
  },

  saveCardTemplate(name, categoryId, blockData) {
    try {
      const custom = JSON.parse(localStorage.getItem(STORAGE_KEYS.CARD_TEMPLATES) || '[]');
      const newTemplate = {
        id: 'card_tmpl_' + Date.now(),
        name: name.trim(),
        categoryId: categoryId,
        description: `Modelo salvo de ${CATEGORY_DEFINITIONS[categoryId]?.shortName || 'Bloco'}`,
        data: JSON.parse(JSON.stringify(blockData)),
        isCustom: true,
        createdAt: new Date().toLocaleDateString('pt-BR')
      };
      custom.unshift(newTemplate);
      localStorage.setItem(STORAGE_KEYS.CARD_TEMPLATES, JSON.stringify(custom));
      return true;
    } catch (e) {
      console.error('Erro ao salvar modelo de card:', e);
      return false;
    }
  },

  deleteCardTemplate(templateId) {
    try {
      let custom = JSON.parse(localStorage.getItem(STORAGE_KEYS.CARD_TEMPLATES) || '[]');
      custom = custom.filter(t => t.id !== templateId);
      localStorage.setItem(STORAGE_KEYS.CARD_TEMPLATES, JSON.stringify(custom));
      return true;
    } catch (e) {
      return false;
    }
  },

  getPresets() {
    try {
      const custom = JSON.parse(localStorage.getItem(STORAGE_KEYS.PACKAGE_PRESETS) || '{}');
      return { ...DEFAULT_PRESETS, ...custom };
    } catch (e) {
      return { ...DEFAULT_PRESETS };
    }
  },

  savePreset(name, packageData) {
    try {
      const custom = JSON.parse(localStorage.getItem(STORAGE_KEYS.PACKAGE_PRESETS) || '{}');
      custom[name] = JSON.parse(JSON.stringify(packageData));
      localStorage.setItem(STORAGE_KEYS.PACKAGE_PRESETS, JSON.stringify(custom));
      return true;
    } catch (e) {
      return false;
    }
  },

  deletePreset(name) {
    try {
      const custom = JSON.parse(localStorage.getItem(STORAGE_KEYS.PACKAGE_PRESETS) || '{}');
      if (custom[name]) {
        delete custom[name];
        localStorage.setItem(STORAGE_KEYS.PACKAGE_PRESETS, JSON.stringify(custom));
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  },

  exportToJSON(data, filename = 'pacote-destino-certo.json') {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  importFromJSON(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        callback(null, parsed);
      } catch (err) {
        callback(new Error('Arquivo JSON inválido.'));
      }
    };
    reader.readAsText(file);
  }
};
