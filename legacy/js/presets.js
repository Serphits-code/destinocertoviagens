/**
 * Destino Certo - Gerenciamento de Modelos de Cards (Predefinições de Blocos) e Pacotes
 */

const PresetManager = {
  activeBlockIdToSave: null,

  // ----------------------------------------------------
  // MODELOS DE CARDS / BLOCOS INDIVIDUAIS
  // ----------------------------------------------------

  // Abre modal para salvar um card específico como modelo
  openSaveCardTemplateModal(blockId) {
    this.activeBlockIdToSave = blockId;
    const block = BlockManager.findBlock(blockId);
    if (!block) return;

    const nameInput = document.getElementById('card-template-name');
    if (nameInput) {
      nameInput.value = block.data.title || 'Meu Modelo de Card';
    }

    const modal = document.getElementById('save-card-template-modal');
    if (modal) modal.classList.add('active');
  },

  closeSaveCardTemplateModal() {
    this.activeBlockIdToSave = null;
    const modal = document.getElementById('save-card-template-modal');
    if (modal) modal.classList.remove('active');
  },

  confirmSaveCardTemplate() {
    if (!this.activeBlockIdToSave) return;
    const block = BlockManager.findBlock(this.activeBlockIdToSave);
    if (!block) return;

    const nameInput = document.getElementById('card-template-name');
    const templateName = nameInput ? nameInput.value.trim() : '';

    if (!templateName) {
      alert('Por favor, informe um nome para o modelo do card.');
      return;
    }

    const success = StorageManager.saveCardTemplate(templateName, block.categoryId, block.data);

    if (success) {
      this.closeSaveCardTemplateModal();
      alert(`Modelo "${templateName}" salvo com sucesso! Agora você pode inseri-lo a qualquer momento ao clicar no botão (+).`);
      App.renderCategoryPicker(); // Atualiza a lista no modal de adicionar
    } else {
      alert('Erro ao salvar o modelo de card.');
    }
  },

  deleteCardTemplateConfirm(templateId, templateName) {
    if (confirm(`Deseja realmente excluir o modelo "${templateName}"?`)) {
      StorageManager.deleteCardTemplate(templateId);
      App.renderCategoryPicker();
    }
  },

  // ----------------------------------------------------
  // PREDEFINIÇÕES DE PACOTES COMPLETOS
  // ----------------------------------------------------

  openPresetsModal() {
    this.renderPresetsList();
    const modal = document.getElementById('presets-modal');
    if (modal) modal.classList.add('active');
  },

  closePresetsModal() {
    const modal = document.getElementById('presets-modal');
    if (modal) modal.classList.remove('active');
  },

  openSavePresetModal() {
    const pkg = BlockManager.getPackageData();
    const nameInput = document.getElementById('new-preset-name');
    if (nameInput) {
      nameInput.value = pkg.packageName || 'Meu Pacote Personalizado';
    }
    const modal = document.getElementById('save-preset-modal');
    if (modal) modal.classList.add('active');
  },

  closeSavePresetModal() {
    const modal = document.getElementById('save-preset-modal');
    if (modal) modal.classList.remove('active');
  },

  confirmSavePreset() {
    const nameInput = document.getElementById('new-preset-name');
    const name = nameInput ? nameInput.value.trim() : '';

    if (!name) {
      alert('Por favor, digite um nome para a predefinição.');
      return;
    }

    const currentData = BlockManager.getPackageData();
    const success = StorageManager.savePreset(name, currentData);

    if (success) {
      this.closeSavePresetModal();
      alert(`Predefinição de pacote "${name}" salva com sucesso!`);
    } else {
      alert('Ocorreu um erro ao salvar a predefinição.');
    }
  },

  renderPresetsList() {
    const container = document.getElementById('presets-list-container');
    if (!container) return;

    const presets = StorageManager.getPresets();
    const presetNames = Object.keys(presets);

    if (presetNames.length === 0) {
      container.innerHTML = `
        <div class="empty-state-sm">
          <p>Nenhuma predefinição de pacote encontrada.</p>
        </div>
      `;
      return;
    }

    let html = '';
    presetNames.forEach(name => {
      const p = presets[name];
      const blockCount = p.blocks ? p.blocks.length : 0;
      const categoriesSummary = p.blocks 
        ? p.blocks.map(b => CATEGORY_DEFINITIONS[b.categoryId]?.shortName || b.categoryId).join(', ')
        : 'Vazio';

      const isDefault = Object.keys(DEFAULT_PRESETS).includes(name);

      html += `
        <div class="preset-card">
          <div class="preset-info">
            <div class="preset-name">
              <strong>${name}</strong>
              ${isDefault ? '<span class="badge-default">Padrão</span>' : '<span class="badge-custom">Salva</span>'}
            </div>
            <div class="preset-details">
              <span>📅 ${p.packageDates || 'Sem data'}</span> • 
              <span>👥 ${p.packageSlots || '0'} vagas</span> • 
              <span>📦 ${blockCount} cards (${categoriesSummary})</span>
            </div>
          </div>
          <div class="preset-actions">
            <button class="btn btn-sm btn-primary" onclick="PresetManager.applyPreset('${name}')">
              📥 Carregar
            </button>
            ${!isDefault ? `
              <button class="btn btn-sm btn-danger" onclick="PresetManager.deletePresetConfirm('${name}')">
                🗑️
              </button>
            ` : ''}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  applyPreset(name) {
    const presets = StorageManager.getPresets();
    const preset = presets[name];

    if (!preset) {
      alert('Predefinição não encontrada.');
      return;
    }

    if (confirm(`Deseja carregar a predefinição "${name}"? Os dados atuais serão substituídos.`)) {
      const clonedPreset = JSON.parse(JSON.stringify(preset));
      
      const nameEl = document.getElementById('pkg-name');
      const datesEl = document.getElementById('pkg-dates');
      const slotsEl = document.getElementById('pkg-slots');

      if (nameEl) nameEl.innerText = clonedPreset.packageName || '';
      if (datesEl) datesEl.innerText = clonedPreset.packageDates || '';
      if (slotsEl) slotsEl.innerText = clonedPreset.packageSlots || '';

      BlockManager.setPackageData(clonedPreset);
      this.closePresetsModal();
    }
  },

  deletePresetConfirm(name) {
    if (confirm(`Deseja realmente excluir a predefinição "${name}"?`)) {
      StorageManager.deletePreset(name);
      this.renderPresetsList();
    }
  },

  exportPackage() {
    const data = BlockManager.getPackageData();
    const fileName = (data.packageName || 'pacote')
      .toLowerCase()
      .replace(/[^a-z0-9]/gi, '_') + '.json';
    StorageManager.exportToJSON(data, fileName);
  },

  exportAllPresets() {
    const dataToExport = {
      packagePresets: StorageManager.getPresets(),
      cardTemplates: StorageManager.getCardTemplates()
    };
    StorageManager.exportToJSON(dataToExport, 'todos-modelos-destino-certo.json');
  },

  importPackageFile(fileInput) {
    const file = fileInput.files[0];
    if (!file) return;

    StorageManager.importFromJSON(file, (err, data) => {
      if (err) {
        alert(err.message);
        return;
      }

      if (data && (data.blocks || Array.isArray(data))) {
        const pkgData = data.blocks ? data : {
          packageName: 'Pacote Importado',
          packageDates: '',
          packageSlots: '',
          blocks: data
        };

        const nameEl = document.getElementById('pkg-name');
        const datesEl = document.getElementById('pkg-dates');
        const slotsEl = document.getElementById('pkg-slots');

        if (nameEl) nameEl.innerText = pkgData.packageName || '';
        if (datesEl) datesEl.innerText = pkgData.packageDates || '';
        if (slotsEl) slotsEl.innerText = pkgData.packageSlots || '';

        BlockManager.setPackageData(pkgData);
        alert('Pacote importado com sucesso!');
      } else {
        alert('Formato de arquivo JSON incompatível.');
      }

      fileInput.value = '';
    });
  }
};
