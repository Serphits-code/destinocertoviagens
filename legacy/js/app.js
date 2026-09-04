/**
 * Destino Certo - Aplicação Principal e Orquestração
 */

const App = {
  currentPickerTab: 'templates', // 'templates' ou 'categories'

  init() {
    console.log('Inicializando Destino Certo Package Editor com Suporte a Modelos de Cards...');

    const initialPackage = StorageManager.loadCurrentPackage();
    this.initHeaderFields(initialPackage);

    const container = document.getElementById('blocks-container');
    BlockManager.init(container, initialPackage);

    this.setupEventListeners();
    this.renderCategoryPicker();
  },

  initHeaderFields(packageData) {
    const nameEl = document.getElementById('pkg-name');
    const datesEl = document.getElementById('pkg-dates');
    const slotsEl = document.getElementById('pkg-slots');

    if (nameEl) {
      nameEl.innerText = packageData.packageName || 'MPACOTE FOZ DO IGUAÇU';
      nameEl.addEventListener('blur', () => {
        const pkg = BlockManager.getPackageData();
        pkg.packageName = nameEl.innerText.trim();
        BlockManager.triggerAutoSave();
      });
    }

    if (datesEl) {
      datesEl.innerText = packageData.packageDates || '09/05 – 13/05';
      datesEl.addEventListener('blur', () => {
        const pkg = BlockManager.getPackageData();
        pkg.packageDates = datesEl.innerText.trim();
        BlockManager.triggerAutoSave();
      });
    }

    if (slotsEl) {
      slotsEl.innerText = packageData.packageSlots || '20';
      slotsEl.addEventListener('blur', () => {
        const pkg = BlockManager.getPackageData();
        pkg.packageSlots = slotsEl.innerText.trim();
        BlockManager.triggerAutoSave();
      });
    }
  },

  setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });

    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.closeAllModals();
        }
      });
    });
  },

  // Alterna as abas no modal de adicionar card
  setPickerTab(tabName) {
    this.currentPickerTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    this.renderCategoryPicker();
  },

  // Renderiza as opções de Modelos de Cards Salvos ou Categorias Padrão
  renderCategoryPicker() {
    const contentContainer = document.getElementById('category-picker-content');
    if (!contentContainer) return;

    if (this.currentPickerTab === 'templates') {
      const templates = StorageManager.getCardTemplates();
      
      let html = `
        <div class="templates-grid">
      `;

      if (templates.length === 0) {
        html += `
          <div class="empty-state-sm" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
            <p>Nenhum modelo de card salvo ainda.</p>
            <button class="btn btn-sm btn-primary" onclick="App.setPickerTab('categories')">Criar a partir de Categoria Base</button>
          </div>
        `;
      } else {
        templates.forEach(t => {
          const cat = CATEGORY_DEFINITIONS[t.categoryId] || CATEGORY_DEFINITIONS.personalizada;
          html += `
            <div class="template-card-item">
              <div class="template-card-top">
                <span class="tmpl-icon">${cat.icon}</span>
                <div class="tmpl-meta">
                  <strong class="tmpl-name">${t.name}</strong>
                  <span class="tmpl-badge">${cat.shortName}</span>
                </div>
              </div>
              <p class="tmpl-desc">${t.description || 'Modelo de card personalizado'}</p>
              <div class="tmpl-actions">
                <button class="btn btn-sm btn-primary" onclick="App.selectTemplateToAdd('${t.id}')">
                  ➕ Inserir Card
                </button>
                ${t.isCustom ? `
                  <button class="btn btn-xs btn-danger" title="Excluir este modelo" onclick="PresetManager.deleteCardTemplateConfirm('${t.id}', '${t.name}')">
                    🗑️
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        });
      }

      html += `</div>`;
      contentContainer.innerHTML = html;

    } else {
      // Categorias Padrão
      let html = '<div class="category-picker-grid">';
      Object.keys(CATEGORY_DEFINITIONS).forEach(catKey => {
        const cat = CATEGORY_DEFINITIONS[catKey];
        html += `
          <div class="category-card" onclick="App.selectCategoryToAdd('${cat.id}')">
            <div class="category-icon">${cat.icon}</div>
            <div class="category-name">${cat.name}</div>
            <div class="category-desc">${cat.description}</div>
            <button class="btn btn-sm btn-category-add">Adicionar +</button>
          </div>
        `;
      });
      html += '</div>';
      contentContainer.innerHTML = html;
    }
  },

  pendingInsertIndex: null,

  openAddBlockModal(defaultTab = 'templates', targetIndex = null) {
    this.currentPickerTab = defaultTab;
    this.pendingInsertIndex = (typeof targetIndex === 'number' && targetIndex >= 0) ? targetIndex : null;

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === defaultTab);
    });
    this.renderCategoryPicker();
    const modal = document.getElementById('add-block-modal');
    if (modal) modal.classList.add('active');
  },

  closeAddBlockModal() {
    this.pendingInsertIndex = null;
    const modal = document.getElementById('add-block-modal');
    if (modal) modal.classList.remove('active');
  },

  // Seleciona um modelo de card salvo para inserir
  selectTemplateToAdd(templateId) {
    const insertIdx = this.pendingInsertIndex;
    this.pendingInsertIndex = null;
    BlockManager.addBlockFromTemplate(templateId, insertIdx);
    this.closeAddBlockModal();
  },

  // Seleciona uma categoria em branco para inserir
  selectCategoryToAdd(categoryId) {
    const insertIdx = this.pendingInsertIndex;
    if (categoryId === 'personalizada') {
      this.closeAddBlockModal();
      this.pendingInsertIndex = insertIdx; // preserva para o modal customizado
      this.openCustomBlockModal();
      return;
    }

    this.pendingInsertIndex = null;
    BlockManager.addNewBlock(categoryId, null, insertIdx);
    this.closeAddBlockModal();
  },

  openCustomBlockModal() {
    const modal = document.getElementById('custom-block-modal');
    if (modal) modal.classList.add('active');
  },

  closeCustomBlockModal() {
    this.pendingInsertIndex = null;
    const modal = document.getElementById('custom-block-modal');
    if (modal) modal.classList.remove('active');
  },

  confirmCreateCustomBlock() {
    const titleInput = document.getElementById('custom-block-title');
    const colsInput = document.getElementById('custom-block-cols');
    const rowsInput = document.getElementById('custom-block-rows');

    const title = titleInput?.value.trim() || 'TABELA PERSONALIZADA';
    const colsStr = colsInput?.value.trim() || 'ITEM, DESCRIÇÃO, VALOR UNITÁRIO, QUANTIDADE, VALOR TOTAL';
    const rowCount = parseInt(rowsInput?.value, 10) || 3;

    const cols = colsStr.split(',').map(c => c.trim()).filter(c => c.length > 0);
    const rows = [];

    for (let i = 0; i < rowCount; i++) {
      const row = new Array(cols.length).fill('');
      row[0] = `Item ${i + 1}`;
      rows.push(row);
    }

    const newBlock = {
      id: 'block_custom_' + Date.now(),
      categoryId: 'personalizada',
      data: {
        title: title.toUpperCase(),
        subtitle: '',
        columns: cols,
        rows: rows,
        observation: ''
      }
    };

    const pkg = BlockManager.getPackageData();
    const insertIdx = this.pendingInsertIndex;
    this.pendingInsertIndex = null;

    if (typeof insertIdx === 'number' && insertIdx >= 0 && insertIdx <= pkg.blocks.length) {
      pkg.blocks.splice(insertIdx, 0, newBlock);
    } else {
      pkg.blocks.push(newBlock);
    }

    BlockManager.renderAllBlocks();
    BlockManager.triggerAutoSave();

    this.closeCustomBlockModal();

    setTimeout(() => {
      const el = document.getElementById(`card-${newBlock.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('card-just-added');
        setTimeout(() => el.classList.remove('card-just-added'), 1200);
      }
    }, 100);
  },

  clearAllBlocks() {
    if (confirm('Deseja realmente limpar todos os cards deste pacote?')) {
      const pkg = BlockManager.getPackageData();
      pkg.blocks = [];
      BlockManager.renderAllBlocks();
      BlockManager.triggerAutoSave();
    }
  },

  printPackage() {
    window.print();
  },

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
