/**
 * Destino Certo - Gerenciador de Blocos e Cards no Design System Moderno
 */

const BlockManager = {
  container: null,
  currentPackage: null,
  collapsedBlocks: new Set(),

  init(containerElement, initialPackage) {
    this.container = containerElement;
    this.currentPackage = initialPackage;
    this.renderAllBlocks();
    this.calculateTotals();
  },

  getPackageData() {
    return this.currentPackage;
  },

  setPackageData(packageData) {
    this.currentPackage = packageData;
    this.renderAllBlocks();
    this.calculateTotals();
    this.triggerAutoSave();
  },

  triggerAutoSave() {
    StorageManager.saveCurrentPackage(this.currentPackage);
    this.calculateTotals();
    const saveIndicator = document.getElementById('save-indicator');
    if (saveIndicator) {
      saveIndicator.innerHTML = '<span>✓</span> Salvo';
      saveIndicator.classList.add('saved');
      setTimeout(() => {
        saveIndicator.classList.remove('saved');
      }, 1500);
    }
  },

  // ----------------------------------------------------
  // CÁLCULO DE TOTAIS EM TEMPO REAL PARA O SUMMARY WIDGET
  // ----------------------------------------------------
  calculateTotals() {
    let totalCost = 0;
    let totalProfit = 0;

    const slots = parseFloat(document.getElementById('pkg-slots')?.innerText || '20') || 20;

    if (this.currentPackage?.blocks) {
      this.currentPackage.blocks.forEach(block => {
        const d = block.data;

        // Itens Inclusos
        if (block.categoryId === 'itens_inclusos' && d.rows) {
          d.rows.forEach(r => {
            const c = parseFloat(String(r.custo || '0').replace(',', '.')) || 0;
            totalCost += c;
          });
        }

        // Personalizados
        if (block.categoryId === 'personalizados' && d.rows) {
          d.rows.forEach(r => {
            const c = parseFloat(String(r.custo || '0').replace(',', '.')) || 0;
            const l = parseFloat(String(r.lucro || '0').replace(',', '.')) || 0;
            totalCost += c;
            totalProfit += l;
          });
        }

        // Aéreo
        if (block.categoryId === 'aereo') {
          const c = parseFloat(String(d.custoUnitario || '0').replace(',', '.')) || 0;
          totalCost += c;
        }

        // Hospedagem
        if (block.categoryId === 'hospedagem' && d.rooms) {
          d.rooms.forEach(r => {
            const p = parseFloat(String(r.porPessoa || '0').replace(',', '.')) || 0;
            if (p > 0) {
              totalCost += p;
            }
          });
        }

        // Rodoviário
        if (block.categoryId === 'rodoviario') {
          const c = parseFloat(String(d.rateioPorPessoa || '0').replace(',', '.')) || 0;
          totalCost += c;
        }

        // Guias
        if (block.categoryId === 'guias') {
          const c = parseFloat(String(d.rateioPorPessoa || '0').replace(',', '.')) || 0;
          totalCost += c;
        }

        // Custom
        if (block.categoryId === 'personalizada' && d.rows) {
          d.rows.forEach(r => {
            const c = parseFloat(String(r.valor || r.custo || '0').replace(',', '.')) || 0;
            totalCost += c;
          });
        }
      });
    }

    const totalPackagePrice = totalCost + totalProfit;
    const grandTotalGroup = totalPackagePrice * slots;

    // Atualiza widgets na tela
    const elCost = document.getElementById('widget-total-cost');
    const elProfit = document.getElementById('widget-total-profit');
    const elPackage = document.getElementById('widget-package-price');
    const elGrandTotal = document.getElementById('widget-grand-total');

    const fmt = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (elCost) elCost.innerText = `R$ ${fmt(totalCost)}`;
    if (elProfit) elProfit.innerText = `R$ ${fmt(totalProfit * slots)}`;
    if (elPackage) elPackage.innerText = `R$ ${fmt(totalPackagePrice)}`;
    if (elGrandTotal) elGrandTotal.innerText = `R$ ${fmt(grandTotalGroup)}`;
  },

  // Alterna minimizar/expandir um card
  toggleCardCollapse(blockId) {
    const card = document.getElementById(`card-${blockId}`);
    if (this.collapsedBlocks.has(blockId)) {
      this.collapsedBlocks.delete(blockId);
      if (card) card.classList.remove('is-collapsed');
    } else {
      this.collapsedBlocks.add(blockId);
      if (card) card.classList.add('is-collapsed');
    }
  },

  expandAllCards() {
    this.collapsedBlocks.clear();
    document.querySelectorAll('.ds-card').forEach(card => card.classList.remove('is-collapsed'));
  },

  collapseAllCards() {
    this.currentPackage.blocks.forEach(b => this.collapsedBlocks.add(b.id));
    document.querySelectorAll('.ds-card').forEach(card => card.classList.add('is-collapsed'));
  },

  draggedIndex: null,

  // Cria a barra divisória interativa de inserção entre cards
  createInsertDivider(index) {
    const divider = document.createElement('div');
    divider.className = 'ds-insert-divider no-print';
    divider.dataset.insertIndex = index;

    divider.innerHTML = `
      <div class="divider-line"></div>
      <button class="btn-insert-between" onclick="App.openAddBlockModal('templates', ${index})" title="Inserir card nesta posição">
        <span class="insert-icon">➕</span>
        <span class="insert-label">Inserir card aqui</span>
      </button>
      <div class="divider-line"></div>
    `;

    // Suporte para soltar card arrastado diretamente no divisor
    divider.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      divider.classList.add('drop-active');
    });

    divider.addEventListener('dragleave', (e) => {
      if (!divider.contains(e.relatedTarget)) {
        divider.classList.remove('drop-active');
      }
    });

    divider.addEventListener('drop', (e) => {
      e.preventDefault();
      divider.classList.remove('drop-active');
      const fromIndex = BlockManager.draggedIndex;
      if (fromIndex === null || fromIndex === undefined) return;

      let targetIndex = index;
      if (fromIndex < targetIndex) {
        targetIndex--;
      }
      BlockManager.reorderBlock(fromIndex, targetIndex);
    });

    return divider;
  },

  // Renderiza todos os cards com divisores de inserção intermediários
  renderAllBlocks() {
    if (!this.container) return;
    this.container.innerHTML = '';

    if (!this.currentPackage.blocks || this.currentPackage.blocks.length === 0) {
      this.container.innerHTML = `
        <div class="ds-empty-state">
          <div class="empty-icon">📦</div>
          <h3>Nenhum item adicionado ao pacote</h3>
          <p>Clique em <strong>"+ Adicionar Card"</strong> ou selecione uma predefinição para começar a montar o pacote.</p>
          <button class="btn btn-primary" onclick="App.openAddBlockModal('templates', 0)">
            <span>➕</span> Adicionar Primeiro Item
          </button>
        </div>
      `;
      return;
    }

    const totalBlocks = this.currentPackage.blocks.length;

    // Divisor no topo (posição 0)
    this.container.appendChild(this.createInsertDivider(0));

    this.currentPackage.blocks.forEach((block, index) => {
      const cardEl = this.createCardElement(block, index, totalBlocks);
      this.container.appendChild(cardEl);

      // Divisor após cada card (posição index + 1)
      this.container.appendChild(this.createInsertDivider(index + 1));
    });
  },

  // Cria o elemento de Card no Design System com Drag & Drop e Botões de Ordenação
  createCardElement(block, index, totalBlocks = 1) {
    const isCollapsed = this.collapsedBlocks.has(block.id);
    const catDef = CATEGORY_DEFINITIONS[block.categoryId] || CATEGORY_DEFINITIONS.personalizada;

    const card = document.createElement('div');
    card.className = `ds-card ${isCollapsed ? 'is-collapsed' : ''}`;
    card.id = `card-${block.id}`;
    card.dataset.blockId = block.id;
    card.dataset.blockIndex = index;
    card.setAttribute('draggable', 'true');

    // Card Header Bar
    const cardHeader = document.createElement('div');
    cardHeader.className = 'ds-card-header';
    cardHeader.innerHTML = `
      <div class="ds-card-left-group">
        <div class="ds-card-drag-handle no-print" title="Arrastar para reorganizar o card">
          <span>⠿</span>
        </div>
        <div class="ds-card-title-group" onclick="BlockManager.toggleCardCollapse('${block.id}')" title="Clique para minimizar ou expandir">
          <span class="ds-card-icon">${catDef.icon}</span>
          <h3 class="ds-card-title">${block.data.title || catDef.name}</h3>
        </div>
      </div>

      <div class="ds-card-header-actions no-print">
        <div class="ds-reorder-quick-actions">
          <button class="btn-card-icon btn-reorder-up" onclick="BlockManager.moveBlock(${index}, -1)" ${index === 0 ? 'disabled' : ''} title="Mover card para cima">
            ↑
          </button>
          <button class="btn-card-icon btn-reorder-down" onclick="BlockManager.moveBlock(${index}, 1)" ${index === totalBlocks - 1 ? 'disabled' : ''} title="Mover card para baixo">
            ↓
          </button>
        </div>

        <button class="btn-link-action" onclick="BlockManager.addRowToBlock('${block.id}')" title="Adicionar Linha / Item">
          <span>⊕</span> Adicionar Item
        </button>

        <button class="btn-card-icon" onclick="PresetManager.openSaveCardTemplateModal('${block.id}')" title="Salvar este card como modelo reutilizável">
          💾 Salvar Modelo
        </button>

        <button class="btn-card-icon" onclick="BlockManager.toggleCardCollapse('${block.id}')" title="Minimizar ou Expandir">
          ${isCollapsed ? '➕' : '➖'}
        </button>

        <div class="ds-dropdown">
          <button class="btn-card-icon btn-card-menu" title="Mais opções">⋮</button>
          <div class="ds-dropdown-menu">
            <button onclick="BlockManager.moveBlock(${index}, -1)" ${index === 0 ? 'disabled' : ''}>⬆️ Mover para cima</button>
            <button onclick="BlockManager.moveBlock(${index}, 1)" ${index === totalBlocks - 1 ? 'disabled' : ''}>⬇️ Mover para baixo</button>
            <button onclick="App.openAddBlockModal('templates', ${index})">➕ Inserir card antes deste</button>
            <button onclick="App.openAddBlockModal('templates', ${index + 1})">➕ Inserir card após este</button>
            <button onclick="BlockManager.duplicateBlock('${block.id}')">📋 Duplicar Card</button>
            <button class="text-danger" onclick="BlockManager.removeBlock('${block.id}')">🗑️ Excluir Card</button>
          </div>
        </div>
      </div>
    `;

    // Configuração dos Eventos de Drag & Drop no Card
    card.addEventListener('dragstart', (e) => {
      // Ignora se o arrasto começou em inputs, botões ou selects
      const targetTag = e.target.tagName;
      if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A'].includes(targetTag)) {
        e.preventDefault();
        return;
      }

      BlockManager.draggedIndex = index;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));

      setTimeout(() => {
        card.classList.add('is-dragging');
      }, 0);
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('is-dragging');
      BlockManager.draggedIndex = null;
      document.querySelectorAll('.ds-card').forEach(c => {
        c.classList.remove('drag-over-top', 'drag-over-bottom');
      });
      document.querySelectorAll('.ds-insert-divider').forEach(d => {
        d.classList.remove('drop-active');
      });
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      if (BlockManager.draggedIndex === null || BlockManager.draggedIndex === index) {
        return;
      }

      const rect = card.getBoundingClientRect();
      const midY = rect.top + (rect.height / 2);

      if (e.clientY < midY) {
        card.classList.add('drag-over-top');
        card.classList.remove('drag-over-bottom');
      } else {
        card.classList.add('drag-over-bottom');
        card.classList.remove('drag-over-top');
      }
    });

    card.addEventListener('dragleave', (e) => {
      if (!card.contains(e.relatedTarget)) {
        card.classList.remove('drag-over-top', 'drag-over-bottom');
      }
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over-top', 'drag-over-bottom');

      const fromIndex = BlockManager.draggedIndex;
      if (fromIndex === null || fromIndex === undefined || fromIndex === index) return;

      const rect = card.getBoundingClientRect();
      const isTopHalf = e.clientY < (rect.top + (rect.height / 2));

      let targetIndex = isTopHalf ? index : index + 1;
      if (fromIndex < targetIndex) {
        targetIndex--;
      }

      BlockManager.reorderBlock(fromIndex, targetIndex);
    });

    // Card Collapsible Body
    const cardBodyWrapper = document.createElement('div');
    cardBodyWrapper.className = 'ds-card-body-wrapper';

    const cardBody = document.createElement('div');
    cardBody.className = 'ds-card-body';

    // Conteúdo da tabela específico por categoria
    switch (block.categoryId) {
      case 'itens_inclusos':
        cardBody.innerHTML = this.renderItensInclusos(block);
        break;
      case 'personalizados':
        cardBody.innerHTML = this.renderPersonalizados(block);
        break;
      case 'aereo':
        cardBody.innerHTML = this.renderAereo(block);
        break;
      case 'hospedagem':
        cardBody.innerHTML = this.renderHospedagem(block);
        break;
      case 'rodoviario':
        cardBody.innerHTML = this.renderRodoviario(block);
        break;
      case 'guias':
        cardBody.innerHTML = this.renderGuias(block);
        break;
      case 'personalizada':
      default:
        cardBody.innerHTML = this.renderPersonalizada(block);
        break;
    }

    cardBodyWrapper.appendChild(cardBody);
    card.appendChild(cardHeader);
    card.appendChild(cardBodyWrapper);

    return card;
  },

  // ----------------------------------------------------
  // RENDERIZADORES DE TABELAS MODERNAS
  // ----------------------------------------------------

  // 1. Itens Inclusos (Tabela Principal)
  renderItensInclusos(block) {
    const data = block.data;
    const rows = data.rows || [];

    let rowsHtml = rows.map((r, rIdx) => {
      const stripeColor = r.color || '#D97706';
      return `
        <tr style="border-left: 4px solid ${stripeColor};">
          <td class="col-type">
            <span class="row-type-icon">${r.icon || '📦'}</span>
            <input type="text" class="ds-input ds-input-clean" value="${r.type}" 
                   oninput="BlockManager.updateItensInclusosRow('${block.id}', ${rIdx}, 'type', this.value)">
          </td>
          <td class="col-provider">
            <input type="text" class="ds-input" placeholder="Ex: Fornecedor / Empresa..." value="${r.fornecedor || ''}"
                   oninput="BlockManager.updateItensInclusosRow('${block.id}', ${rIdx}, 'fornecedor', this.value)">
          </td>
          <td class="col-cost">
            <input type="text" class="ds-input ds-input-number" value="${r.custo || '0,00'}"
                   oninput="BlockManager.updateItensInclusosRow('${block.id}', ${rIdx}, 'custo', this.value)">
          </td>
          <td class="col-status">
            ${this.renderStatusSelect(r.status, `BlockManager.updateItensInclusosRow('${block.id}', ${rIdx}, 'status', this.value)`)}
          </td>
          <td class="col-actions no-print">
            <button class="btn-row-delete" title="Remover item" onclick="BlockManager.removeRowFromBlock('${block.id}', ${rIdx})">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <table class="ds-table">
        <thead>
          <tr>
            <th style="width: 25%;">TIPO DE ITEM</th>
            <th style="width: 35%;">FORNECEDOR</th>
            <th style="width: 18%; text-align: right;">CUSTO ESTIMADO (R$)</th>
            <th style="width: 16%; text-align: center;">STATUS DA RESERVA</th>
            <th style="width: 6%;" class="no-print">AÇÕES</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  },

  // 2. Personalizados & Lucro
  renderPersonalizados(block) {
    const data = block.data;
    const rows = data.rows || [];

    let rowsHtml = rows.map((r, rIdx) => `
      <tr>
        <td class="col-name">
          <input type="text" class="ds-input" placeholder="Nome do item..." value="${r.nome || ''}"
                 oninput="BlockManager.updatePersonalizadosRow('${block.id}', ${rIdx}, 'nome', this.value)">
        </td>
        <td class="col-cost">
          <input type="text" class="ds-input ds-input-number" value="${r.custo || '0,00'}"
                 oninput="BlockManager.updatePersonalizadosRow('${block.id}', ${rIdx}, 'custo', this.value)">
        </td>
        <td class="col-profit">
          <input type="text" class="ds-input ds-input-number" value="${r.lucro || '0,00'}"
                 oninput="BlockManager.updatePersonalizadosRow('${block.id}', ${rIdx}, 'lucro', this.value)">
        </td>
        <td class="col-actions no-print">
          <button class="btn-row-delete" title="Remover item" onclick="BlockManager.removeRowFromBlock('${block.id}', ${rIdx})">🗑️</button>
        </td>
      </tr>
    `).join('');

    return `
      <table class="ds-table">
        <thead>
          <tr>
            <th style="width: 45%;">NOME DO ITEM</th>
            <th style="width: 25%; text-align: right;">CUSTO (R$)</th>
            <th style="width: 25%; text-align: right;">LUCRO (R$)</th>
            <th style="width: 5%;" class="no-print">AÇÕES</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  },

  // 3. Aéreo Detalhado
  renderAereo(block) {
    const data = block.data;
    const flights = data.flights || [];

    let flightsHtml = flights.map((f, fIdx) => `
      <tr>
        <td><input type="text" class="ds-input" style="font-weight:700;" value="${f.cia || 'AZUL'}" oninput="BlockManager.updateAereoFlight('${block.id}', ${fIdx}, 'cia', this.value)"></td>
        <td><input type="text" class="ds-input" value="${f.voo || ''}" oninput="BlockManager.updateAereoFlight('${block.id}', ${fIdx}, 'voo', this.value)"></td>
        <td><input type="text" class="ds-input" value="${f.origem || ''}" oninput="BlockManager.updateAereoFlight('${block.id}', ${fIdx}, 'origem', this.value)"></td>
        <td><input type="text" class="ds-input" value="${f.saida || ''}" oninput="BlockManager.updateAereoFlight('${block.id}', ${fIdx}, 'saida', this.value)"></td>
        <td><input type="text" class="ds-input" value="${f.chegada || ''}" oninput="BlockManager.updateAereoFlight('${block.id}', ${fIdx}, 'chegada', this.value)"></td>
        <td><input type="text" class="ds-input" value="${f.destino || ''}" oninput="BlockManager.updateAereoFlight('${block.id}', ${fIdx}, 'destino', this.value)"></td>
        <td>${this.renderStatusSelect(f.status || 'CONFIRMADO', `BlockManager.updateAereoFlight('${block.id}', ${fIdx}, 'status', this.value)`)}</td>
        <td class="no-print"><button class="btn-row-delete" onclick="BlockManager.removeAereoFlight('${block.id}', ${fIdx})">🗑️</button></td>
      </tr>
    `).join('');

    return `
      <div class="ds-meta-grid">
        <div class="ds-meta-item">
          <label>Portal da Reserva</label>
          <input type="text" class="ds-input" value="${data.portal || 'Discovery'}" oninput="BlockManager.updateField('${block.id}', 'portal', this.value)">
        </div>
        <div class="ds-meta-item">
          <label>Localizador</label>
          <input type="text" class="ds-input bold" value="${data.localizador || 'YNDK3D'}" oninput="BlockManager.updateField('${block.id}', 'localizador', this.value)">
        </div>
        <div class="ds-meta-item">
          <label>Nº de Vagas</label>
          <input type="text" class="ds-input" value="${data.vagas || '20'}" oninput="BlockManager.updateField('${block.id}', 'vagas', this.value)">
        </div>
        <div class="ds-meta-item">
          <label>Custo Unitário (R$)</label>
          <input type="text" class="ds-input ds-input-number bold" value="${data.custoUnitario || '1177.91'}" oninput="BlockManager.updateField('${block.id}', 'custoUnitario', this.value)">
        </div>
      </div>

      <div class="mt-2">
        <div class="ds-table-subhead">Trechos de Voo (Ida e Volta)</div>
        <table class="ds-table">
          <thead>
            <tr>
              <th>CIA</th>
              <th>VOO</th>
              <th>ORIGEM</th>
              <th>SAÍDA</th>
              <th>CHEGADA</th>
              <th>DESTINO</th>
              <th style="text-align: center;">STATUS</th>
              <th class="no-print"></th>
            </tr>
          </thead>
          <tbody>
            ${flightsHtml}
          </tbody>
        </table>
        <div class="mt-1 no-print">
          <button class="btn-link-action" onclick="BlockManager.addAereoFlight('${block.id}')">⊕ Adicionar Trecho de Voo</button>
        </div>
      </div>
    `;
  },

  // 4. Hospedagem Detalhada
  renderHospedagem(block) {
    const data = block.data;
    const rooms = data.rooms || [];

    let roomsHtml = rooms.map((rm, rIdx) => `
      <tr>
        <td><strong>${rm.tipo}</strong></td>
        <td><input type="text" class="ds-input ds-input-number" value="${rm.diaria || '0,00'}" oninput="BlockManager.updateRoom('${block.id}', ${rIdx}, 'diaria', this.value)"></td>
        <td><input type="text" class="ds-input ds-input-number" value="${rm.totalQuarto || '0,00'}" oninput="BlockManager.updateRoom('${block.id}', ${rIdx}, 'totalQuarto', this.value)"></td>
        <td><input type="text" class="ds-input ds-input-number bold text-primary" value="${rm.porPessoa || '0,00'}" oninput="BlockManager.updateRoom('${block.id}', ${rIdx}, 'porPessoa', this.value)"></td>
        <td><input type="text" class="ds-input" style="text-align:center;" value="${rm.qtd || '1'}" oninput="BlockManager.updateRoom('${block.id}', ${rIdx}, 'qtd', this.value)"></td>
        <td><input type="text" class="ds-input ${rm.totalPeriodo.includes('Cortesia') ? 'badge-cortesia-input' : ''}" value="${rm.totalPeriodo || '0,00'}" oninput="BlockManager.updateRoom('${block.id}', ${rIdx}, 'totalPeriodo', this.value)"></td>
      </tr>
    `).join('');

    return `
      <div class="ds-meta-grid">
        <div class="ds-meta-item">
          <label>Hotel</label>
          <input type="text" class="ds-input bold" value="${data.hotel || ''}" oninput="BlockManager.updateField('${block.id}', 'hotel', this.value)">
        </div>
        <div class="ds-meta-item">
          <label>Cidade</label>
          <input type="text" class="ds-input" value="${data.cidade || ''}" oninput="BlockManager.updateField('${block.id}', 'cidade', this.value)">
        </div>
        <div class="ds-meta-item">
          <label>Quantidade de Diárias</label>
          <input type="text" class="ds-input" value="${data.diarias || '4'}" oninput="BlockManager.updateField('${block.id}', 'diarias', this.value)">
        </div>
        <div class="ds-meta-item">
          <label>Período</label>
          <input type="text" class="ds-input" value="${data.periodo || ''}" oninput="BlockManager.updateField('${block.id}', 'periodo', this.value)">
        </div>
      </div>

      <div class="mt-2">
        <div class="ds-table-subhead">Quartos Contratados</div>
        <table class="ds-table">
          <thead>
            <tr>
              <th>QUARTO</th>
              <th style="text-align: right;">VALOR DIÁRIA</th>
              <th style="text-align: right;">TOTAL QUARTO</th>
              <th style="text-align: right;">POR PESSOA</th>
              <th style="text-align: center;">QTD</th>
              <th style="text-align: right;">TOTAL NO PERÍODO</th>
            </tr>
          </thead>
          <tbody>
            ${roomsHtml}
          </tbody>
        </table>
      </div>
    `;
  },

  // 5. Rodoviário
  renderRodoviario(block) {
    const data = block.data;
    return `
      <div class="ds-meta-grid">
        <div class="ds-meta-item">
          <label>Empresa / Fornecedor</label>
          <input type="text" class="ds-input bold" value="${data.empresa || ''}" oninput="BlockManager.updateField('${block.id}', 'empresa', this.value)">
        </div>
        <div class="ds-meta-item">
          <label>Veículo Contratado</label>
          <input type="text" class="ds-input" value="${data.veiculo || ''}" oninput="BlockManager.updateField('${block.id}', 'veiculo', this.value)">
        </div>
        <div class="ds-meta-item">
          <label>Valor do Contrato (R$)</label>
          <input type="text" class="ds-input ds-input-number bold" value="${data.valorContrato || ''}" oninput="BlockManager.updateField('${block.id}', 'valorContrato', this.value)">
        </div>
        <div class="ds-meta-item">
          <label>Rateio por Passageiro (R$)</label>
          <input type="text" class="ds-input ds-input-number bold text-primary" value="${data.rateioPorPessoa || ''}" oninput="BlockManager.updateField('${block.id}', 'rateioPorPessoa', this.value)">
        </div>
      </div>
      <div class="ds-meta-grid mt-1">
        <div class="ds-meta-item" style="grid-column: 1 / -1;">
          <label>Itinerário / Descrição dos Serviços</label>
          <input type="text" class="ds-input" value="${data.itinerario || ''}" oninput="BlockManager.updateField('${block.id}', 'itinerario', this.value)">
        </div>
      </div>
    `;
  },

  // 6. Guias
  renderGuias(block) {
    const data = block.data;
    const roteiro = data.roteiro || [];

    let roteiroHtml = roteiro.map((rot, rIdx) => `
      <tr>
        <td style="width: 120px;"><input type="text" class="ds-input" value="${rot.horario || ''}" oninput="BlockManager.updateRoteiro('${block.id}', ${rIdx}, 'horario', this.value)"></td>
        <td><input type="text" class="ds-input" value="${rot.atividade || ''}" oninput="BlockManager.updateRoteiro('${block.id}', ${rIdx}, 'atividade', this.value)"></td>
        <td style="width: 130px;">${this.renderStatusSelect(rot.status || 'CONFIRMADO', `BlockManager.updateRoteiro('${block.id}', ${rIdx}, 'status', this.value)`)}</td>
        <td style="width: 40px;" class="no-print"><button class="btn-row-delete" onclick="BlockManager.removeRoteiro('${block.id}', ${rIdx})">🗑️</button></td>
      </tr>
    `).join('');

    return `
      <div class="ds-meta-grid">
        <div class="ds-meta-item">
          <label>Nome do Guia</label>
          <input type="text" class="ds-input bold" value="${data.guias?.[0]?.nome || ''}" oninput="BlockManager.updateGuia('${block.id}', 0, 'nome', this.value)">
        </div>
        <div class="ds-meta-item">
          <label>Tipo / Credencial</label>
          <input type="text" class="ds-input" value="${data.guias?.[0]?.tipo || ''}" oninput="BlockManager.updateGuia('${block.id}', 0, 'tipo', this.value)">
        </div>
        <div class="ds-meta-item">
          <label>Diárias</label>
          <input type="text" class="ds-input" value="${data.guias?.[0]?.diarias || '5'}" oninput="BlockManager.updateGuia('${block.id}', 0, 'diarias', this.value)">
        </div>
        <div class="ds-meta-item">
          <label>Rateio por Passageiro (R$)</label>
          <input type="text" class="ds-input ds-input-number bold text-primary" value="${data.rateioPorPessoa || '102.00'}" oninput="BlockManager.updateField('${block.id}', 'rateioPorPessoa', this.value)">
        </div>
      </div>

      <div class="mt-2">
        <div class="ds-table-subhead">Cronograma e Roteiro de Atividades</div>
        <table class="ds-table">
          <thead>
            <tr>
              <th>HORÁRIO</th>
              <th>ATIVIDADE</th>
              <th style="text-align: center;">STATUS</th>
              <th class="no-print"></th>
            </tr>
          </thead>
          <tbody>
            ${roteiroHtml}
          </tbody>
        </table>
        <div class="mt-1 no-print">
          <button class="btn-link-action" onclick="BlockManager.addRoteiro('${block.id}')">⊕ Adicionar Horário no Roteiro</button>
        </div>
      </div>
    `;
  },

  // 7. Customizada
  renderPersonalizada(block) {
    const data = block.data;
    const rows = data.rows || [];

    let rowsHtml = rows.map((r, rIdx) => `
      <tr>
        <td><input type="text" class="ds-input" value="${r.item || ''}" oninput="BlockManager.updateCustomRow('${block.id}', ${rIdx}, 'item', this.value)"></td>
        <td><input type="text" class="ds-input" value="${r.fornecedor || ''}" oninput="BlockManager.updateCustomRow('${block.id}', ${rIdx}, 'fornecedor', this.value)"></td>
        <td><input type="text" class="ds-input ds-input-number" value="${r.valor || '0,00'}" oninput="BlockManager.updateCustomRow('${block.id}', ${rIdx}, 'valor', this.value)"></td>
        <td>${this.renderStatusSelect(r.status || 'CONFIRMADO', `BlockManager.updateCustomRow('${block.id}', ${rIdx}, 'status', this.value)`)}</td>
        <td class="no-print"><button class="btn-row-delete" onclick="BlockManager.removeRowFromBlock('${block.id}', ${rIdx})">🗑️</button></td>
      </tr>
    `).join('');

    return `
      <table class="ds-table">
        <thead>
          <tr>
            <th style="width: 35%;">ITEM</th>
            <th style="width: 30%;">FORNECEDOR</th>
            <th style="width: 20%; text-align: right;">VALOR (R$)</th>
            <th style="width: 15%; text-align: center;">STATUS</th>
            <th class="no-print"></th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  },

  // Renderiza o badge/select de status idêntico ao design
  renderStatusSelect(currentStatus, onchangeCode) {
    const st = (currentStatus || 'CONFIRMADO').toUpperCase();
    let badgeClass = 'status-confirmado';
    if (st.includes('PEND')) badgeClass = 'status-pendente';
    if (st.includes('COT')) badgeClass = 'status-cotado';

    return `
      <div class="status-badge-wrapper ${badgeClass}">
        <select class="status-select" onchange="${onchangeCode}">
          <option value="PENDENTE" ${st === 'PENDENTE' ? 'selected' : ''}>PENDENTE</option>
          <option value="COTADO" ${st === 'COTADO' ? 'selected' : ''}>COTADO</option>
          <option value="CONFIRMADO" ${st === 'CONFIRMADO' ? 'selected' : ''}>CONFIRMADO</option>
        </select>
      </div>
    `;
  },

  // ----------------------------------------------------
  // GESTÃO DE LINHAS E DADOS
  // ----------------------------------------------------
  addRowToBlock(blockId) {
    const block = this.findBlock(blockId);
    if (!block) return;

    if (block.categoryId === 'itens_inclusos') {
      block.data.rows.push({ type: 'Novo Item', icon: '📦', color: '#D97706', fornecedor: 'Ex: Fornecedor', custo: '0.00', status: 'PENDENTE' });
    } else if (block.categoryId === 'personalizados') {
      block.data.rows.push({ nome: 'Novo Item Customizado', custo: '0.00', lucro: '0.00' });
    } else if (block.categoryId === 'personalizada') {
      block.data.rows.push({ item: 'Novo Item', fornecedor: '', valor: '0.00', status: 'PENDENTE' });
    } else {
      this.addNewBlock(block.categoryId);
      return;
    }

    this.renderAllBlocks();
    this.triggerAutoSave();
  },

  removeRowFromBlock(blockId, rowIdx) {
    const block = this.findBlock(blockId);
    if (block && block.data.rows) {
      block.data.rows.splice(rowIdx, 1);
      this.renderAllBlocks();
      this.triggerAutoSave();
    }
  },

  updateItensInclusosRow(blockId, rowIdx, key, val) {
    const b = this.findBlock(blockId);
    if (b && b.data.rows[rowIdx]) {
      b.data.rows[rowIdx][key] = val;
      this.triggerAutoSave();
    }
  },

  updatePersonalizadosRow(blockId, rowIdx, key, val) {
    const b = this.findBlock(blockId);
    if (b && b.data.rows[rowIdx]) {
      b.data.rows[rowIdx][key] = val;
      this.triggerAutoSave();
    }
  },

  updateField(blockId, key, val) {
    const b = this.findBlock(blockId);
    if (b) {
      b.data[key] = val;
      this.triggerAutoSave();
    }
  },

  updateAereoFlight(blockId, fIdx, key, val) {
    const b = this.findBlock(blockId);
    if (b && b.data.flights[fIdx]) {
      b.data.flights[fIdx][key] = val;
      this.triggerAutoSave();
    }
  },

  addAereoFlight(blockId) {
    const b = this.findBlock(blockId);
    if (b) {
      b.data.flights.push({ cia: 'AZUL', voo: '', origem: '', saida: '', chegada: '', destino: '', status: 'CONFIRMADO' });
      this.renderAllBlocks();
      this.triggerAutoSave();
    }
  },

  removeAereoFlight(blockId, fIdx) {
    const b = this.findBlock(blockId);
    if (b && b.data.flights) {
      b.data.flights.splice(fIdx, 1);
      this.renderAllBlocks();
      this.triggerAutoSave();
    }
  },

  updateRoom(blockId, rIdx, key, val) {
    const b = this.findBlock(blockId);
    if (b && b.data.rooms[rIdx]) {
      b.data.rooms[rIdx][key] = val;
      this.triggerAutoSave();
    }
  },

  updateGuia(blockId, gIdx, key, val) {
    const b = this.findBlock(blockId);
    if (b && b.data.guias[gIdx]) {
      b.data.guias[gIdx][key] = val;
      this.triggerAutoSave();
    }
  },

  updateRoteiro(blockId, rIdx, key, val) {
    const b = this.findBlock(blockId);
    if (b && b.data.roteiro[rIdx]) {
      b.data.roteiro[rIdx][key] = val;
      this.triggerAutoSave();
    }
  },

  addRoteiro(blockId) {
    const b = this.findBlock(blockId);
    if (b) {
      b.data.roteiro.push({ horario: '00:00', atividade: 'Nova Atividade', status: 'CONFIRMADO' });
      this.renderAllBlocks();
      this.triggerAutoSave();
    }
  },

  removeRoteiro(blockId, rIdx) {
    const b = this.findBlock(blockId);
    if (b && b.data.roteiro) {
      b.data.roteiro.splice(rIdx, 1);
      this.renderAllBlocks();
      this.triggerAutoSave();
    }
  },

  updateCustomRow(blockId, rIdx, key, val) {
    const b = this.findBlock(blockId);
    if (b && b.data.rows[rIdx]) {
      b.data.rows[rIdx][key] = val;
      this.triggerAutoSave();
    }
  },

  // ----------------------------------------------------
  // GESTÃO DE CARDS (ADICIONAR, MOVER, DUPLICAR, DELETAR)
  // ----------------------------------------------------
  addBlockFromTemplate(templateId, insertIndex = null) {
    const templates = StorageManager.getCardTemplates();
    const tmpl = templates.find(t => t.id === templateId);
    if (!tmpl) return;

    const newBlock = {
      id: 'block_' + tmpl.categoryId + '_' + Date.now(),
      categoryId: tmpl.categoryId,
      data: JSON.parse(JSON.stringify(tmpl.data))
    };

    if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex <= this.currentPackage.blocks.length) {
      this.currentPackage.blocks.splice(insertIndex, 0, newBlock);
    } else {
      this.currentPackage.blocks.push(newBlock);
    }

    this.renderAllBlocks();
    this.triggerAutoSave();

    setTimeout(() => {
      const el = document.getElementById(`card-${newBlock.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('card-just-added');
        setTimeout(() => el.classList.remove('card-just-added'), 1200);
      }
    }, 100);
  },

  addNewBlock(categoryId, customTitle = null, insertIndex = null) {
    const catDef = CATEGORY_DEFINITIONS[categoryId] || CATEGORY_DEFINITIONS.personalizada;
    const newBlockData = JSON.parse(JSON.stringify(catDef.defaultData));

    if (customTitle) newBlockData.title = customTitle;

    const newBlock = {
      id: 'block_' + categoryId + '_' + Date.now(),
      categoryId: categoryId,
      data: newBlockData
    };

    if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex <= this.currentPackage.blocks.length) {
      this.currentPackage.blocks.splice(insertIndex, 0, newBlock);
    } else {
      this.currentPackage.blocks.push(newBlock);
    }

    this.renderAllBlocks();
    this.triggerAutoSave();

    setTimeout(() => {
      const el = document.getElementById(`card-${newBlock.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('card-just-added');
        setTimeout(() => el.classList.remove('card-just-added'), 1200);
      }
    }, 100);
  },

  removeBlock(blockId) {
    if (confirm('Deseja realmente excluir este card?')) {
      this.currentPackage.blocks = this.currentPackage.blocks.filter(b => b.id !== blockId);
      this.collapsedBlocks.delete(blockId);
      this.renderAllBlocks();
      this.triggerAutoSave();
    }
  },

  duplicateBlock(blockId) {
    const blockIndex = this.currentPackage.blocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1) return;

    const original = this.currentPackage.blocks[blockIndex];
    const cloned = {
      id: 'block_' + original.categoryId + '_' + Date.now(),
      categoryId: original.categoryId,
      data: JSON.parse(JSON.stringify(original.data))
    };
    cloned.data.title = cloned.data.title + ' (Cópia)';

    this.currentPackage.blocks.splice(blockIndex + 1, 0, cloned);
    this.renderAllBlocks();
    this.triggerAutoSave();

    setTimeout(() => {
      const el = document.getElementById(`card-${cloned.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('card-just-added');
        setTimeout(() => el.classList.remove('card-just-added'), 1200);
      }
    }, 100);
  },

  moveBlock(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= this.currentPackage.blocks.length) return;

    const temp = this.currentPackage.blocks[index];
    this.currentPackage.blocks[index] = this.currentPackage.blocks[targetIndex];
    this.currentPackage.blocks[targetIndex] = temp;

    this.renderAllBlocks();
    this.triggerAutoSave();

    setTimeout(() => {
      const el = document.getElementById(`card-${temp.id}`);
      if (el) {
        el.classList.add('card-just-moved');
        setTimeout(() => el.classList.remove('card-just-moved'), 700);
      }
    }, 50);
  },

  reorderBlock(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= this.currentPackage.blocks.length || toIndex >= this.currentPackage.blocks.length) return;

    const [movedItem] = this.currentPackage.blocks.splice(fromIndex, 1);
    this.currentPackage.blocks.splice(toIndex, 0, movedItem);

    this.renderAllBlocks();
    this.triggerAutoSave();

    setTimeout(() => {
      const el = document.getElementById(`card-${movedItem.id}`);
      if (el) {
        el.classList.add('card-just-moved');
        setTimeout(() => el.classList.remove('card-just-moved'), 700);
      }
    }, 50);
  },

  findBlock(blockId) {
    return this.currentPackage.blocks.find(b => b.id === blockId);
  }
};
