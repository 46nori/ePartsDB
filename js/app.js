/* 電子パーツ在庫ビューア */

document.addEventListener('DOMContentLoaded', function() {

  // ===== utils.js関数への参照 =====
  const formatPartName = AppUtils.formatPartName;
  const escapeHtml = AppUtils.escapeHtml;
  const validateInput = AppUtils.validateInput;
  const formatStockQuantityEditable = (qty, partId) => AppUtils.formatStockQuantity(qty, partId, true);
  const formatStockQuantity = AppUtils.formatStockQuantityReadOnly;
  const getCellValue = AppUtils.getCellValue;
  const updateStockCellStyle = AppUtils.updateStockCellStyle;
  
  // ===== 状態管理 =====
  const isLocalEnvironment = AppUtils.checkLocalEnvironment();
  const getState = () => window.appState;
  const setState = (updates) => Object.assign(window.appState, updates);
  const trackChange = (type, data) => {
    if (window.appState && window.appState.trackChange) {
      window.appState.trackChange(type, data);
    }
    
    updateChangeIndicator();
    updateSyncButton();
  };
  
  // ===== local-database.js関数への参照 =====
  const updateStock = (partId, newQuantity) => {
    if (typeof window.updateInventory === 'function') {
      return window.updateInventory(partId, newQuantity);
    } else {
      return Promise.reject(new Error('在庫更新機能が利用できません'));
    }
  };

  // データベース関連変数
  let db;
  let originalDb;
  
  // DOM要素への参照
  const statusElement = document.getElementById('status');
  const categoriesView = document.getElementById('categories-view');
  const partsView = document.getElementById('parts-view');
  const searchView = document.getElementById('search-view');
  const viewControls = document.getElementById('view-controls');
  const tabsContainer = document.getElementById('tabs-container');
  const pageTitle = document.getElementById('page-title');
  
  const DB_URL = './eparts.db';

  console.log('🚀 アプリケーション初期化開始');

  // ===== UI管理関数 =====
  
  function updateChangeIndicator() {
    const indicator = document.getElementById('change-indicator');
    if (!indicator) return;
    
    const state = getState();
    if (!state || !state.localChanges) return;
    
    const totalChanges = Object.values(state.localChanges).reduce((sum, arr) => sum + arr.length, 0);
    
    if (totalChanges > 0) {
      indicator.textContent = `未保存の変更: ${totalChanges}件`;
      indicator.style.display = 'inline-block';
    } else {
      indicator.style.display = 'none';
    }
  }

  function updateSyncButton() {
    const syncBtn = document.getElementById('sync-btn');
    if (!syncBtn) return;
    
    const state = getState();
    if (!state) return;
    
    syncBtn.disabled = !state.hasLocalChanges;
    syncBtn.textContent = state.hasLocalChanges ? '📤 同期' : '📤 同期（変更なし）';
  }

  function showStatus(message, type = 'info') {
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status ${type}`;
      
      if (type === 'success') {
        setTimeout(() => {
          statusElement.textContent = '';
          statusElement.className = 'status';
        }, 3000);
      }
    }
  }

  // ===== ダイアログ関数管理 =====
  
  function waitForDialogFunctions() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 50;
      
      const checkFunctions = () => {
        attempts++;
        
        if (typeof window.showAddPartDialog === 'function' &&
            typeof window.showEditPartDialog === 'function' &&
            typeof window.showInventoryDialog === 'function' &&
            typeof window.showDeleteConfirmDialog === 'function') {
          resolve(true);
        } else if (attempts < maxAttempts) {
          setTimeout(checkFunctions, 100);
        } else {
          console.warn('⚠️ ダイアログ関数の読み込みタイムアウト');
          resolve(false);
        }
      };
      
      checkFunctions();
    });
  }

  // ===== 環境UI管理 =====
  
  function createEnvironmentUI() {
    const envContainer = document.createElement('div');
    envContainer.className = 'environment-indicator';
    
    if (isLocalEnvironment) {
      envContainer.innerHTML = `
        <div class="env-status local">
          <span class="env-icon">💻</span>
          <span class="env-text">ローカル環境（編集可能）</span>
          <span id="change-indicator" class="change-indicator" style="display: none;">未保存の変更: 0件</span>
        </div>
        <div class="local-actions">
          <button id="add-part-btn" class="btn-action">➕ パーツ追加</button>
          <button id="sync-btn" class="btn-action" disabled>📤 同期（変更なし）</button>
          <button id="reset-btn" class="btn-action">🔄 リセット</button>
        </div>
      `;
    } else {
      envContainer.innerHTML = `
        <div class="env-status remote">
          <span class="env-icon">🌐</span>
          <span class="env-text">リモート環境（読み取り専用）</span>
        </div>
      `;
    }
    
    statusElement.parentNode.insertBefore(envContainer, tabsContainer);
    
    if (isLocalEnvironment) {
      waitForDialogFunctions().then((loaded) => {
        if (loaded) {
          setupLocalEnvironmentEvents();
        } else {
          setupLocalEnvironmentEventsWithFallback();
        }
      });
    }
  }

  function setupLocalEnvironmentEvents() {
    setTimeout(() => {
      const addPartBtn = document.getElementById('add-part-btn');
      const syncBtn = document.getElementById('sync-btn');
      const resetBtn = document.getElementById('reset-btn');

      if (addPartBtn) {
        addPartBtn.addEventListener('click', () => {
          if (typeof window.showAddPartDialog === 'function') {
            window.showAddPartDialog();
          } else {
            alert('パーツ追加機能が読み込まれていません。ページを再読み込みしてください。');
          }
        });
      }

      if (syncBtn) {
        syncBtn.addEventListener('click', () => {
          const state = getState();
          if (state && state.hasLocalChanges) {
            if (typeof window.syncToMaster === 'function') {
              window.syncToMaster();
            } else {
              alert('同期機能（Phase 4で実装予定）');
            }
          }
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          const state = getState();
          if (state && state.hasLocalChanges) {
            if (confirm('未保存の変更が失われます。マスターデータベースに戻しますか？')) {
              resetToMaster();
            }
          } else {
            alert('変更がないため、リセットは不要です。');
          }
        });
      }
    }, 500);
  }

  function setupLocalEnvironmentEventsWithFallback() {
    setTimeout(() => {
      const addPartBtn = document.getElementById('add-part-btn');
      const syncBtn = document.getElementById('sync-btn');
      const resetBtn = document.getElementById('reset-btn');

      if (addPartBtn) {
        addPartBtn.addEventListener('click', () => {
          alert('編集機能は現在利用できません。ページを再読み込みしてから、もう一度お試しください。');
        });
      }

      if (syncBtn) {
        syncBtn.addEventListener('click', () => {
          alert('同期機能（Phase 4で実装予定）');
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          const state = getState();
          if (state && state.hasLocalChanges) {
            if (confirm('未保存の変更が失われます。マスターデータベースに戻しますか？')) {
              resetToMaster();
            }
          } else {
            alert('変更がないため、リセットは不要です。');
          }
        });
      }
    }, 100);
  }

  function resetToMaster() {
    if (!originalDb) {
      alert('マスターデータベースが利用できません');
      return;
    }
    
    try {
      const masterData = originalDb.export();
      db.close();
      db = new window.SQLInstance.Database(masterData);
      
      window.db = db;
      
      setState({
        hasLocalChanges: false,
        localChanges: { added: [], modified: [], deleted: [], inventory: [] }
      });
      
      updateChangeIndicator();
      updateSyncButton();
      
      const state = getState();
      if (state.currentView === 'categories') {
        showCategories();
      } else if (state.currentView === 'parts' && state.currentCategoryId) {
        showPartsByCategory(state.currentCategoryId, state.currentCategoryName);
      }
      
      showStatus('マスターデータベースに戻しました', 'success');
      
    } catch (error) {
      console.error('リセットエラー:', error);
      showStatus(`リセットに失敗しました: ${error.message}`, 'error');
    }
  }

  // ===== タブ管理 =====
  
  function setupTabs() {
    const categoriesTab = document.getElementById('categories-tab');
    const searchTab = document.getElementById('search-tab');
    
    if (categoriesTab) {
      categoriesTab.classList.add('active');
      categoriesTab.addEventListener('click', () => {
        switchTab('categories');
      });
    }
    
    if (searchTab) {
      searchTab.classList.remove('active');
      searchTab.addEventListener('click', () => {
        switchTab('search');
      });
    }
  }

  function switchTab(tabName) {
    setState({
      currentTab: tabName
    });
    
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    const activeTab = document.getElementById(`${tabName}-tab`);
    if (activeTab) {
      activeTab.classList.add('active');
    }
    
    if (tabName === 'categories') {
      showCategories();
    } else if (tabName === 'search') {
      showSearchView();
    }
  }

  // ===== ビュー管理関数 =====
  
  function showCategories() {
    setState({
      currentView: 'categories'
    });
    
    categoriesView.style.display = 'block';
    partsView.style.display = 'none';
    if (searchView) searchView.style.display = 'none';
    
    updateViewControls();
    
    try {
      const stmt = db.prepare(`
        SELECT id, name, parent_id, display_order 
        FROM categories 
        ORDER BY display_order ASC, name ASC
      `);
      const categories = [];
      
      while (stmt.step()) {
        categories.push(stmt.getAsObject());
      }
      stmt.free();
      
      const categoryContainer = categoriesView.querySelector('.category-container');
      if (categoryContainer) {
        categoryContainer.innerHTML = categories.map(category => {
          const orderRange = Math.floor((category.display_order || 1000) / 100);
          const clampedRange = Math.min(orderRange, 9);
          
          return `
            <div class="category-card" data-order-range="${clampedRange}" onclick="selectCategory(${category.id}, '${escapeHtml(category.name)}')">
              <h3>${escapeHtml(category.name)}</h3>
            </div>
          `;
        }).join('');
      }
      
    } catch (error) {
      console.error('❌ カテゴリ表示エラー:', error);
      showStatus(`エラー: ${error.message}`, 'error');
    }
  }

  function selectCategory(categoryId, categoryName) {
    const validId = validateInput(categoryId, 'number');
    const validName = validateInput(categoryName, 'string', 100);
    
    if (validId === 0) {
      console.error('Invalid category ID');
      return;
    }
    
    setState({
      currentCategoryId: validId,
      currentCategoryName: validName
    });
    
    showPartsByCategory(validId, validName);
  }

  function showPartsByCategory(categoryId, categoryName) {
    setState({
      currentView: 'parts'
    });
    
    categoriesView.style.display = 'none';
    partsView.style.display = 'block';
    if (searchView) searchView.style.display = 'none';
    
    updateViewControls();
    
    try {
      const sql = `
        SELECT 
          p.id, p.name, p.category_id, p.manufacturer, p.part_number, p.package,
          p.voltage_rating, p.current_rating, p.power_rating, p.tolerance,
          p.logic_family, p.description, p.datasheet_url, p.created_at,
          i.id as inventory_id, i.quantity, i.location, i.purchase_date,
          i.shop, i.price_per_unit, i.currency, i.memo
        FROM parts p
        LEFT JOIN inventory i ON p.id = i.part_id
        WHERE p.category_id = ?
        ORDER BY p.name ASC
      `;
      
      const stmt = db.prepare(sql);
      stmt.bind([categoryId]);
      const parts = [];
      
      while (stmt.step()) {
        parts.push(stmt.getAsObject());
      }
      stmt.free();
      
      let partsHtml = `
        <h2>${escapeHtml(categoryName)} のパーツ一覧</h2>
        <div class="table-container">
          <table class="sortable-table" id="parts-table">
            <thead>
              <tr>
                <th class="sortable">在庫数</th>
                <th class="sortable">部品名</th>
                <th class="sortable">種別</th>
                <th class="sortable">型番</th>
                <th class="sortable">外形</th>
                <th>説明</th>
                ${isLocalEnvironment ? '<th>操作</th>' : ''}
              </tr>
            </thead>
            <tbody>
      `;
      
      if (parts.length === 0) {
        partsHtml += `
          <tr>
            <td colspan="${isLocalEnvironment ? '7' : '6'}" style="text-align: center; padding: 20px; color: #6c757d;">
              このカテゴリにはパーツが登録されていません
            </td>
          </tr>
        `;
      } else {
        parts.forEach(part => {
          partsHtml += `
            <tr>
              <td>${formatStockQuantityEditable(part.quantity, part.id)}</td>
              <td>${formatPartName(part.name, part.datasheet_url)}</td>
              <td>${escapeHtml(part.logic_family || '')}</td>
              <td>${escapeHtml(part.part_number || '')}</td>
              <td>${escapeHtml(part.package || '')}</td>
              <td>${escapeHtml(part.description || '')}</td>
              ${isLocalEnvironment ? `
                <td class="actions">
                  <button class="btn-edit" data-part-id="${part.id}" title="編集">✏️</button>
                  <button class="btn-delete" data-part-id="${part.id}" title="削除">🗑️</button>
                </td>
              ` : ''}
            </tr>
          `;
        });
      }
      
      partsHtml += `
            </tbody>
          </table>
        </div>
      `;
      
      partsView.innerHTML = partsHtml;
      
      const table = document.getElementById('parts-table');
      if (table && parts.length > 0) {
        initTableSort(table);
      }
      
      if (isLocalEnvironment) {
        setupRowActionEvents('parts-view');
        setupStockEditorEvents('parts-view');
      }
      
    } catch (error) {
      console.error('❌ パーツ表示エラー:', error);
      showStatus(`エラー: ${error.message}`, 'error');
    }
  }

  function showSearchView() {
    setState({
      currentView: 'search'
    });
    
    categoriesView.style.display = 'none';
    partsView.style.display = 'none';
    if (searchView) searchView.style.display = 'block';
    
    updateViewControls();
    
    if (searchView) {
      searchView.innerHTML = `
        <div class="search-container">
          <input type="text" id="search-input" placeholder="パーツ名、型番、メーカーで検索（空白で全件表示）">
          <button id="search-button">検索</button>
        </div>
        <div id="search-results">
          <p style="text-align: center; color: #6c757d; padding: 20px;">
            検索ワードを入力して「検索」ボタンを押すか、空白で「検索」を押すと全件表示されます。<br>
            <strong>1文字以上で部分一致検索が可能です。</strong>
          </p>
        </div>
      `;
      
      const searchInput = document.getElementById('search-input');
      const searchButton = document.getElementById('search-button');
      
      if (searchInput && searchButton) {
        searchButton.addEventListener('click', doSearch);
        searchInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            doSearch();
          }
        });
      }
    }
  }

  function doSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    
    if (!searchInput || !searchResults) return;
    
    const searchTerm = validateInput(searchInput.value, 'search', 100);
    
    try {
      let sql, stmt, results = [];
      
      if (searchTerm.length === 0) {
        sql = `
          SELECT 
            p.id, p.name, p.category_id, p.manufacturer, p.part_number, p.package,
            p.voltage_rating, p.current_rating, p.power_rating, p.tolerance,
            p.logic_family, p.description, p.datasheet_url, p.created_at,
            i.id as inventory_id, i.quantity, i.location, i.purchase_date,
            i.shop, i.price_per_unit, i.currency, i.memo,
            c.name AS category_name
          FROM parts p
          LEFT JOIN categories c ON p.category_id = c.id
          LEFT JOIN inventory i ON p.id = i.part_id
          ORDER BY p.name ASC
        `;
        
        stmt = db.prepare(sql);
        
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        
      } else {
        sql = `
          SELECT 
            p.id, p.name, p.category_id, p.manufacturer, p.part_number, p.package,
            p.voltage_rating, p.current_rating, p.power_rating, p.tolerance,
            p.logic_family, p.description, p.datasheet_url, p.created_at,
            i.id as inventory_id, i.quantity, i.location, i.purchase_date,
            i.shop, i.price_per_unit, i.currency, i.memo,
            c.name AS category_name
          FROM parts p
          LEFT JOIN categories c ON p.category_id = c.id
          LEFT JOIN inventory i ON p.id = i.part_id
          WHERE p.name LIKE ? OR p.part_number LIKE ? OR p.manufacturer LIKE ?
          ORDER BY p.name ASC
        `;
        
        const searchPattern = `%${searchTerm}%`;
        stmt = db.prepare(sql);
        stmt.bind([searchPattern, searchPattern, searchPattern]);
        
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
      }
      
      displaySearchResults(searchResults, results, searchTerm);
      
    } catch (error) {
      console.error('❌ 検索結果表示エラー:', error);
      searchResults.innerHTML = `<p class="error">検索中にエラーが発生しました: ${error.message}</p>`;
    }
  }

  // ===== テーブル管理関数 =====
  
  function initTableSort(tableElement) {
    const headers = tableElement.querySelectorAll('th');
    
    headers.forEach((header, index) => {
      if (header.textContent.includes('操作')) return;
      
      header.style.cursor = 'pointer';
      header.classList.add('sortable');
      
      header.addEventListener('click', () => {
        sortTable(tableElement, index, header);
      });
    });
  }

  function sortTable(table, columnIndex, headerElement) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    if (rows.length <= 1 || rows[0].cells.length <= columnIndex) return;
    
    const currentSort = headerElement.dataset.sort || 'none';
    let newSort = 'asc';
    
    if (currentSort === 'asc') {
      newSort = 'desc';
    } else if (currentSort === 'desc') {
      newSort = 'asc';
    }
    
    table.querySelectorAll('th').forEach(th => {
      th.dataset.sort = 'none';
      th.classList.remove('sort-asc', 'sort-desc');
    });
    
    headerElement.dataset.sort = newSort;
    headerElement.classList.add(`sort-${newSort}`);
    
    rows.sort((a, b) => {
      const aCell = a.cells[columnIndex];
      const bCell = b.cells[columnIndex];
      
      if (!aCell || !bCell) return 0;
      
      let aValue = getCellValue(aCell, columnIndex);
      let bValue = getCellValue(bCell, columnIndex);
      
      if (columnIndex === 0) {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
        return newSort === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      const comparison = aValue.localeCompare(bValue, 'ja', { numeric: true });
      return newSort === 'asc' ? comparison : -comparison;
    });
    
    rows.forEach(row => tbody.appendChild(row));
  }

  function displaySearchResults(container, results, searchTerm) {
    try {
      const tableHtml = generateTable(results, 'global', container.id);
      
      let resultsHtml = '';
      if (searchTerm.length === 0) {
        resultsHtml += `<h3>全パーツ一覧: ${results.length}件</h3>`;
      } else {
        resultsHtml += `<h3>「${escapeHtml(searchTerm)}」の検索結果: ${results.length}件</h3>`;
      }
      
      resultsHtml += tableHtml;
      container.innerHTML = resultsHtml;
      
      const table = container.querySelector('.sortable-table');
      if (table && results.length > 0) {
        initTableSort(table);
      }
      
      if (isLocalEnvironment) {
        setupRowActionEvents(container.id);
        setupStockEditorEvents(container.id);
      }
      
    } catch (error) {
      console.error('❌ 検索結果表示エラー:', error);
      container.innerHTML = `<p class="error">検索結果の表示中にエラーが発生しました: ${error.message}</p>`;
    }
  }

  function generateTable(data, type, containerId) {
    const isGlobal = type === 'global';
    
    let html = `
      <div class="table-container">
        <table class="sortable-table">
          <thead>
            <tr>
              <th class="sortable" data-column="0">在庫数</th>
              <th class="sortable" data-column="1">部品名</th>
              <th class="sortable" data-column="2">種別</th>
              <th class="sortable" data-column="3">型番</th>
              <th class="sortable" data-column="4">外形</th>
              <th data-column="5">説明</th>
              ${isGlobal ? '<th data-column="6">カテゴリ</th>' : '<th data-column="6">メーカー</th>'}
              ${isLocalEnvironment ? '<th>操作</th>' : ''}
            </tr>
          </thead>
          <tbody>
    `;

    if (data.length === 0) {
      html += `
        <tr>
          <td colspan="${isGlobal ? (isLocalEnvironment ? '8' : '7') : (isLocalEnvironment ? '8' : '7')}" style="text-align: center; padding: 20px; color: #6c757d;">
            データが見つかりませんでした
          </td>
        </tr>
      `;
    } else {
      data.forEach(row => {
        const quantity = formatStockQuantityEditable(row.quantity, row.id);
        const partName = formatPartName(row.name, row.datasheet_url);
        const logicFamily = escapeHtml(row.logic_family || '');
        const partNumber = escapeHtml(row.part_number || '');
        const packageType = escapeHtml(row.package || '');
        const description = escapeHtml(row.description || '');

        let lastColumn;
        if (isGlobal) {
          const categoryId = validateInput(row.category_id, 'number') || 0;
          const categoryName = escapeHtml(row.category_name || '未分類');
          lastColumn = `
            <td>
              <a href="#" class="category-link" onclick="selectCategory(${categoryId}, '${escapeHtml(categoryName)}')">
                ${categoryName}
              </a>
            </td>
          `;
        } else {
          const manufacturer = escapeHtml(row.manufacturer || '');
          lastColumn = `<td>${manufacturer}</td>`;
        }

        const actionColumn = isLocalEnvironment ? `
          <td class="actions">
            <button class="btn-edit" data-part-id="${row.id}" title="編集">✏️</button>
            <button class="btn-delete" data-part-id="${row.id}" title="削除">🗑️</button>
          </td>
        ` : '';

        html += `
          <tr>
            <td style="text-align: right;">${quantity}</td>
            <td>${partName}</td>
            <td>${logicFamily}</td>
            <td>${partNumber}</td>
            <td>${packageType}</td>
            <td>${description}</td>
            ${lastColumn}
            ${actionColumn}
          </tr>
        `;
      });
    }

    html += `
          </tbody>
        </table>
      </div>
    `;

    return html;
  }

  function updateViewControls() {
    const state = getState();
    if (!state) return;
    
    if (state.currentView === 'categories' || state.currentView === 'search') {
      viewControls.innerHTML = '';
    } else if (state.currentView === 'parts') {
      viewControls.innerHTML = `
        <button id="backButton" class="back-button">← カテゴリ一覧に戻る</button>
      `;
      
      const backButton = document.getElementById('backButton');
      if (backButton) {
        backButton.onclick = () => showCategories();
      }
    }
  }

  // ===== イベントリスナー設定 =====
  
  function setupStockEditorEvents(containerId) {
    if (!isLocalEnvironment) return;
    
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.querySelectorAll('.stock-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const partId = parseInt(e.target.closest('.stock-editor').dataset.partId, 10);
        const newQuantity = parseInt(e.target.value, 10) || 0;
        updateStockFromInput(partId, newQuantity, e.target);
      });
      
      input.addEventListener('blur', (e) => {
        const partId = parseInt(e.target.closest('.stock-editor').dataset.partId, 10);
        const newQuantity = parseInt(e.target.value, 10) || 0;
        updateStockFromInput(partId, newQuantity, e.target);
      });
      
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const partId = parseInt(e.target.closest('.stock-editor').dataset.partId, 10);
          const newQuantity = parseInt(e.target.value, 10) || 0;
          updateStockFromInput(partId, newQuantity, e.target);
          e.target.blur();
        }
      });
    });
  }

  function updateStockFromInput(partId, newQuantity, inputElement) {
    if (!isLocalEnvironment || !db) return;
    
    updateStock(partId, newQuantity)
      .then(() => {
        updateStockCellStyle(partId, newQuantity);
      })
      .catch(error => {
        console.error('❌ 在庫更新エラー:', error);
        const currentQtyStmt = db.prepare('SELECT quantity FROM inventory WHERE part_id = ?');
        currentQtyStmt.bind([partId]);
        if (currentQtyStmt.step()) {
          const currentQty = currentQtyStmt.get()[0] || 0;
          inputElement.value = currentQty;
        }
        currentQtyStmt.free();
        alert(`在庫の更新に失敗しました: ${error.message}`);
      });
  }

  function setupRowActionEvents(containerId) {
    if (!isLocalEnvironment) return;
    
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const partId = parseInt(btn.dataset.partId, 10);
        
        if (typeof window.showEditPartDialog === 'function') {
          window.showEditPartDialog(partId);
        } else {
          alert('編集機能が読み込まれていません。ページを再読み込みしてください。');
        }
      });
    });
    
    container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const partId = parseInt(btn.dataset.partId, 10);
        
        if (typeof window.showDeleteConfirmDialog === 'function') {
          window.showDeleteConfirmDialog(partId);
        } else {
          if (confirm(`パーツID ${partId} を削除しますか？`)) {
            alert('削除機能が読み込まれていません。ページを再読み込みしてください。');
          }
        }
      });
    });
  }

  // ===== データベース初期化 =====
  
  function initDb() {
    statusElement.textContent = 'SQL.jsライブラリを読み込み中...';
    
    if (typeof initSqlJs === 'undefined') {
      console.error('❌ initSqlJs未定義');
      statusElement.textContent = 'エラー: SQL.jsライブラリが読み込まれていません';
      statusElement.className = 'status error';
      return;
    }
    
    initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    })
    .then(SQL => {
      statusElement.textContent = 'データベースファイルをダウンロード中...';
      
      if (!SQL || typeof SQL.Database !== 'function') {
        throw new Error('SQL.jsの初期化に失敗しました');
      }
      
      window.SQLInstance = SQL;
      return fetch(DB_URL);
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - データベースファイルが見つかりませんでした`);
      }
      return response.arrayBuffer();
    })
    .then(buffer => {
      originalDb = new window.SQLInstance.Database(new Uint8Array(buffer));
      
      if (isLocalEnvironment) {
        const workingData = originalDb.export();
        db = new window.SQLInstance.Database(workingData);
      } else {
        db = originalDb;
      }
      
      window.db = db;
      
      const testStmt = db.prepare('SELECT COUNT(*) as count FROM categories');
      testStmt.step();
      const categoryCount = testStmt.get()[0];
      testStmt.free();
      
      return db;
    })
    .then(() => {
      statusElement.textContent = 'データベースの読み込みが完了しました。';
      statusElement.className = 'status';
      
      createEnvironmentUI();
      
      tabsContainer.style.display = 'block';
      setupTabs();
      showCategories();
    })
    .catch(error => {
      console.error('❌ データベース初期化エラー:', error);
      statusElement.textContent = `エラー: ${error.message}`;
      statusElement.className = 'status error';
    });
  }

  // ===== グローバル公開関数 =====
  
  window.trackLocalChange = trackChange;
  window.getAppState = getState;
  window.setAppState = setState;

  window.refreshCurrentView = function() {
    const state = getState();
    if (!state) return;
    
    if (state.currentView === 'categories') {
      showCategories();
    } else if (state.currentView === 'parts' && state.currentCategoryId) {
      showPartsByCategory(state.currentCategoryId, state.currentCategoryName);
    } else if (state.currentView === 'search') {
      doSearch();
    }
  };

  window.selectCategory = selectCategory;

  // ===== アプリケーション開始 =====
  
  if (window.appState) {
    initDb();
  } else {
    let attempts = 0;
    const maxAttempts = 50;
    const checkAppState = () => {
      attempts++;
      if (window.appState) {
        initDb();
      } else if (attempts < maxAttempts) {
        setTimeout(checkAppState, 100);
      } else {
        console.warn('⚠️ AppState読み込みタイムアウト - 初期化を続行');
        initDb();
      }
    };
    setTimeout(checkAppState, 100);
  }

});

console.log('✅ ePartsDB app.js loaded successfully');