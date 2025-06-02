/* 電子パーツ在庫ビューア - ローカル編集機能対応版 */

document.addEventListener('DOMContentLoaded', function() {
  let db;
  let originalDb; // マスターデータベース
  const statusElement = document.getElementById('status');
  const categoriesView = document.getElementById('categories-view');
  const partsView = document.getElementById('parts-view');
  const searchView = document.getElementById('search-view');
  const viewControls = document.getElementById('view-controls');
  const tabsContainer = document.getElementById('tabs-container');
  const pageTitle = document.getElementById('page-title');
  
  const DB_URL = './eparts.db';
  let currentView = 'categories';
  let currentTab = 'categories';
  let currentCategoryId = null;
  let currentCategoryName = '';
  let currentSortColumn = '';
  let currentSortDirection = 'asc';
  
  // ローカル編集機能の新規変数
  const isLocalEnvironment = checkLocalEnvironment();
  let hasLocalChanges = false;
  let localChanges = {
    added: [],
    modified: [],
    deleted: [],
    inventory: []
  };

  // 環境判定関数
  function checkLocalEnvironment() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '' ||
      protocol === 'file:' ||
      hostname.endsWith('.local')
    );
  }

  // 変更追跡関数
  function trackChange(type, data) {
    if (!isLocalEnvironment) return;
    
    localChanges[type].push(data);
    hasLocalChanges = true;
    updateChangeIndicator();
    updateSyncButton();
  }

  // 変更インジケーター更新
  function updateChangeIndicator() {
    const indicator = document.getElementById('change-indicator');
    if (!indicator) return;
    
    const totalChanges = Object.values(localChanges).reduce((sum, arr) => sum + arr.length, 0);
    
    if (totalChanges > 0) {
      indicator.textContent = `未保存の変更: ${totalChanges}件`;
      indicator.style.display = 'inline-block';
    } else {
      indicator.style.display = 'none';
    }
  }

  // 同期ボタン更新
  function updateSyncButton() {
    const syncBtn = document.getElementById('sync-btn');
    if (!syncBtn) return;
    
    syncBtn.disabled = !hasLocalChanges;
    syncBtn.textContent = hasLocalChanges ? '📤 同期' : '📤 同期（変更なし）';
  }

  // 環境UI作成
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
    
    // ステータス要素の後に挿入
    statusElement.parentNode.insertBefore(envContainer, tabsContainer);
    
    // ローカル環境のボタンイベント設定
    if (isLocalEnvironment) {
      setupLocalEnvironmentEvents();
    }
  }

  // ローカル環境イベント設定
  function setupLocalEnvironmentEvents() {
    setTimeout(() => {
      const addPartBtn = document.getElementById('add-part-btn');
      const syncBtn = document.getElementById('sync-btn');
      const resetBtn = document.getElementById('reset-btn');

      if (addPartBtn) {
        addPartBtn.addEventListener('click', () => {
          if (typeof showAddPartDialog === 'function') {
            showAddPartDialog();
          } else {
            alert('パーツ追加機能（Phase 3で実装予定）');
          }
        });
      }

      if (syncBtn) {
        syncBtn.addEventListener('click', () => {
          if (hasLocalChanges) {
            if (typeof syncToMaster === 'function') {
              syncToMaster();
            } else {
              alert('同期機能（Phase 4で実装予定）');
            }
          }
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          if (hasLocalChanges) {
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

  // マスターに戻す
  function resetToMaster() {
    if (!originalDb) {
      alert('マスターデータベースが利用できません');
      return;
    }
    
    try {
      // 作業用データベースを再作成
      const masterData = originalDb.export();
      db.close();
      db = new window.SQLInstance.Database(masterData);
      
      // 変更履歴をクリア
      localChanges = { added: [], modified: [], deleted: [], inventory: [] };
      hasLocalChanges = false;
      updateChangeIndicator();
      updateSyncButton();
      
      // UI再描画
      if (currentView === 'categories') {
        showCategories();
      } else if (currentView === 'parts' && currentCategoryId) {
        showPartsByCategory(currentCategoryId, currentCategoryName);
      }
      
      statusElement.textContent = 'マスターデータベースに戻しました';
      statusElement.className = 'status';
      
    } catch (error) {
      console.error('リセットエラー:', error);
      statusElement.textContent = `リセットに失敗しました: ${error.message}`;
      statusElement.className = 'status error';
    }
  }

  // 既存のユーティリティ関数（変更なし）
  function formatStockQuantity(quantity) {
    const qty = quantity !== null ? quantity : 0;
    if (qty === 0) return `<span class="stock-zero">${qty}</span>`;
    if (qty < 5) return `<span class="stock-low">${qty}</span>`;
    return qty;
  }
  
  function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;")
      .replace(/`/g, "&#x60;")
      .replace(/=/g, "&#x3D;");
  }
  
  function validateInput(input, type = 'string', maxLength = 255) {
    if (input === null || input === undefined) {
      return '';
    }
    
    const str = String(input).trim();
    
    switch (type) {
      case 'number':
        const num = parseInt(str, 10);
        return isNaN(num) ? 0 : Math.max(0, num);
      case 'string':
        return str.substring(0, maxLength);
      case 'search':
        return str.substring(0, maxLength).replace(/[<>\"'&;()]/g, '');
      default:
        return str.substring(0, maxLength);
    }
  }
  
  function formatPartName(name, datasheetUrl) {
    const partName = escapeHtml(name || '');
    
    if (datasheetUrl && datasheetUrl.trim() !== '') {
      try {
        const url = new URL(datasheetUrl);
        if (url.protocol === 'https:' || url.protocol === 'http:') {
          return `<a href="${escapeHtml(datasheetUrl)}" target="_blank" rel="noopener noreferrer">${partName}</a>`;
        }
      } catch (e) {
        console.warn('Invalid URL detected:', datasheetUrl);
      }
    }
    
    return partName;
  }

  // タブとナビゲーション機能（変更なし）
  function setupTabs() {
    const categoriesTab = document.getElementById('categories-tab');
    const searchTab = document.getElementById('search-tab');
    
    if (categoriesTab) {
      categoriesTab.onclick = () => switchTab('categories');
    }
    
    if (searchTab) {
      searchTab.onclick = () => switchTab('search');
    }
    
    if (pageTitle) {
      pageTitle.onclick = function() {
        if (currentTab !== 'categories') {
          switchTab('categories');
        }
        showCategories();
      };
      
      pageTitle.onmouseover = function() {
        this.style.color = '#3498db';
      };
      
      pageTitle.onmouseout = function() {
        this.style.color = '#2c3e50';
      };
    }
  }
  
  function switchTab(tabName) {
    currentTab = tabName;
    
    const categoriesTab = document.getElementById('categories-tab');
    const searchTab = document.getElementById('search-tab');
    
    if (categoriesTab && searchTab) {
      categoriesTab.className = tabName === 'categories' ? 'tab active' : 'tab';
      searchTab.className = tabName === 'search' ? 'tab active' : 'tab';
      
      if (tabName === 'categories') {
        categoriesView.style.display = 'block';
        searchView.style.display = 'none';
        partsView.style.display = 'none';
        if (currentView !== 'parts') {
          currentView = 'categories';
          updateViewControls();
        }
      } else if (tabName === 'search') {
        categoriesView.style.display = 'none';
        searchView.style.display = 'block';
        partsView.style.display = 'none';
        showSearchView(true);
        if (currentView !== 'parts') {
          currentView = 'search';
          updateViewControls();
        }
      }
    }
  }
  
  function updateViewControls() {
    if (currentView === 'categories' || currentView === 'search') {
      viewControls.innerHTML = '';
    } else if (currentView === 'parts') {
      viewControls.innerHTML = `
        <button id="backButton" class="back-button">← カテゴリ一覧に戻る</button>
      `;
      
      const backButton = document.getElementById('backButton');
      if (backButton) {
        backButton.onclick = () => showCategories();
      }
    }
  }

  // 検索機能（変更なし）
  function showSearchView(resetForm = false) {
    const existingContainer = searchView.querySelector('.search-container');
    
    if (!existingContainer || resetForm) {
      searchView.innerHTML = `
        <div class="search-container">
          <input type="text" id="globalSearchInput" placeholder="部品名、型番、種別、説明などで検索">
          <button id="globalSearchButton">検索</button>
        </div>
        <div id="globalSearchResults"></div>
      `;
      
      setupSearchEvents();
      
      const input = document.getElementById('globalSearchInput');
      if (input) input.focus();
    }
  }
  
  function setupSearchEvents() {
    const button = document.getElementById('globalSearchButton');
    const input = document.getElementById('globalSearchInput');
    
    if (button) {
      button.onclick = () => doSearch();
    }
    
    if (input) {
      input.onkeypress = function(event) {
        if (event.key === 'Enter') {
          doSearch();
        }
      };
    }
  }

  // テーブル生成とソート機能（行アクションボタン追加）
  function createSortableTable(data, tableType = 'global') {
    let html = '<table class="sortable-table">';
    
    if (tableType === 'global') {
      html += `<thead>
        <tr>
          <th class="sortable" data-column="quantity" style="text-align: right; width: 80px;">
            在庫数 <span class="sort-indicator"></span>
          </th>
          <th class="sortable" data-column="name">
            部品名 <span class="sort-indicator"></span>
          </th>
          <th class="sortable" data-column="logic_family">
            種別 <span class="sort-indicator"></span>
          </th>
          <th class="sortable" data-column="part_number">
            型番 <span class="sort-indicator"></span>
          </th>
          <th class="sortable" data-column="package">
            外形 <span class="sort-indicator"></span>
          </th>
          <th data-column="description">説明</th>
          <th data-column="category_name">カテゴリ</th>`;
      
      // ローカル環境の場合はアクション列を追加
      if (isLocalEnvironment) {
        html += `<th class="actions-column" style="width: 140px;">操作</th>`;
      }
      
      html += `</tr></thead>`;
    } else {
      html += `<thead>
        <tr>
          <th class="sortable" data-column="quantity" style="text-align: right; width: 80px;">
            在庫数 <span class="sort-indicator"></span>
          </th>
          <th class="sortable" data-column="name">
            部品名 <span class="sort-indicator"></span>
          </th>
          <th class="sortable" data-column="logic_family">
            種別 <span class="sort-indicator"></span>
          </th>
          <th class="sortable" data-column="part_number">
            型番 <span class="sort-indicator"></span>
          </th>
          <th class="sortable" data-column="package">
            外形 <span class="sort-indicator"></span>
          </th>
          <th data-column="description">説明</th>
          <th data-column="manufacturer">メーカー</th>`;
      
      // ローカル環境の場合はアクション列を追加
      if (isLocalEnvironment) {
        html += `<th class="actions-column" style="width: 140px;">操作</th>`;
      }
      
      html += `</tr></thead>`;
    }
    
    html += '<tbody>';
    
    data.forEach(row => {
      const quantity = row.quantity !== null && row.quantity !== undefined ? row.quantity : 0;
      const categoryId = validateInput(row.category_id, 'number') || 0;
      const categoryName = escapeHtml(row.category_name || '未分類');
      const partId = row.id;
      
      html += '<tr>';
      html += `<td style="text-align: right;">${formatStockQuantity(quantity)}</td>`;
      html += `<td>${formatPartName(row.name, row.datasheet_url)}</td>`;
      html += `<td>${escapeHtml(row.logic_family || '')}</td>`;
      html += `<td>${escapeHtml(row.part_number || '')}</td>`;
      html += `<td>${escapeHtml(row.package || '')}</td>`;
      html += `<td>${escapeHtml(row.description || '')}</td>`;
      
      if (tableType === 'global') {
        html += `<td>
          <a href="#" class="category-link" data-category-id="${categoryId}" data-category-name="${categoryName}">
            ${categoryName}
          </a>
        </td>`;
      } else {
        html += `<td>${escapeHtml(row.manufacturer || '')}</td>`;
      }
      
      // ローカル環境の場合はアクションボタンを追加
      if (isLocalEnvironment) {
        html += `<td class="actions" style="white-space: nowrap;">
          <button class="btn-edit" data-part-id="${partId}" title="パーツを編集">✏️</button>
          <button class="btn-inventory" data-part-id="${partId}" title="在庫を変更">📦</button>
          <button class="btn-delete" data-part-id="${partId}" title="パーツを削除">🗑️</button>
        </td>`;
      }
      
      html += '</tr>';
    });
    
    html += '</tbody></table>';
    
    return html;
  }

  // 行アクションボタンのイベント設定
  function setupRowActionEvents(containerId) {
    if (!isLocalEnvironment) return;
    
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // 編集ボタン
    container.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const partId = parseInt(btn.dataset.partId, 10);
        if (typeof showEditPartDialog === 'function') {
          showEditPartDialog(partId);
        } else {
          alert(`パーツID ${partId} の編集機能（Phase 3で実装予定）`);
        }
      });
    });
    
    // 在庫ボタン
    container.querySelectorAll('.btn-inventory').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const partId = parseInt(btn.dataset.partId, 10);
        if (typeof showInventoryDialog === 'function') {
          showInventoryDialog(partId);
        } else {
          alert(`パーツID ${partId} の在庫変更機能（Phase 3で実装予定）`);
        }
      });
    });
    
    // 削除ボタン
    container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const partId = parseInt(btn.dataset.partId, 10);
        if (typeof showDeleteConfirmDialog === 'function') {
          showDeleteConfirmDialog(partId);
        } else {
          if (confirm(`パーツID ${partId} を削除しますか？\n（Phase 3で詳細な削除機能を実装予定）`)) {
            alert('削除機能は Phase 3 で実装されます');
          }
        }
      });
    });
  }

  // ソート機能（変更なし、但しsetupRowActionEventsを追加）
  function sortData(data, column, direction) {
    return data.sort((a, b) => {
      let valueA = a[column];
      let valueB = b[column];
      
      if (valueA === null || valueA === undefined) valueA = '';
      if (valueB === null || valueB === undefined) valueB = '';
      
      if (column === 'quantity') {
        valueA = Number(valueA) || 0;
        valueB = Number(valueB) || 0;
      } else {
        valueA = String(valueA).toLowerCase();
        valueB = String(valueB).toLowerCase();
      }
      
      let comparison = 0;
      if (valueA > valueB) {
        comparison = 1;
      } else if (valueA < valueB) {
        comparison = -1;
      }
      
      return direction === 'desc' ? comparison * -1 : comparison;
    });
  }

  function updateSortIndicators(activeColumn, direction, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const headers = container.querySelectorAll('th.sortable');
    
    headers.forEach(header => {
      header.classList.remove('sort-asc', 'sort-desc');
      const indicator = header.querySelector('.sort-indicator');
      if (indicator) {
        indicator.textContent = '';
      }
    });
    
    const activeHeader = container.querySelector(`th.sortable[data-column="${activeColumn}"]`);
    if (activeHeader) {
      activeHeader.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  }

  function setupTableSorting(data, tableType, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const headers = container.querySelectorAll('th.sortable');
    
    headers.forEach((header) => {
      const column = header.dataset.column;
      header.style.cursor = 'pointer';
      header.title = `${header.textContent.replace(/\s*[↑↓]\s*$/, '').trim()}でソート`;
      
      header.replaceWith(header.cloneNode(true));
    });
    
    const newHeaders = container.querySelectorAll('th.sortable');
    newHeaders.forEach((header) => {
      const column = header.dataset.column;
      header.style.cursor = 'pointer';
      
      header.addEventListener('click', function(e) {
        e.preventDefault();
        
        if (currentSortColumn === column) {
          currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          currentSortColumn = column;
          currentSortDirection = 'asc';
        }
        
        const sortedData = sortData([...data], column, currentSortDirection);
        const newTable = createSortableTable(sortedData, tableType);
        container.innerHTML = newTable;
        
        updateSortIndicators(column, currentSortDirection, containerId);
        setupTableSorting(sortedData, tableType, containerId);
        
        // 行アクションボタンのイベントを再設定
        setupRowActionEvents(containerId);
      });
    });
    
    if (tableType === 'global') {
      setupCategoryLinksInTable(containerId);
    }
    
    // 行アクションボタンのイベントを設定
    setupRowActionEvents(containerId);
  }

  function setupCategoryLinksInTable(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const categoryLinks = container.querySelectorAll('.category-link');
    categoryLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        
        const categoryId = parseInt(this.dataset.categoryId, 10);
        const categoryName = this.dataset.categoryName;
        
        if (isNaN(categoryId) || categoryId <= 0) {
          console.error('Invalid category ID');
          return;
        }
        
        selectCategory(categoryId, categoryName);
      });
    });
  }

  // 検索結果表示の共通関数（setupRowActionEvents追加）
  function displaySearchResults(rows, searchTerm, containerId, tableType, categoryName = '') {
    const results = document.getElementById(containerId);
    if (!results) return;
    
    if (rows.length > 0) {
      const tableHtml = createSortableTable(rows, tableType);
      results.innerHTML = tableHtml;
      
      setTimeout(() => {
        setupTableSorting(rows, tableType, containerId);
      }, 100);
      
      // ステータス表示
      if (categoryName) {
        if (searchTerm === '') {
          statusElement.textContent = `カテゴリ「${categoryName}」に${rows.length}件のパーツが登録されています`;
        } else {
          statusElement.textContent = `カテゴリ「${categoryName}」内の「${escapeHtml(searchTerm)}」検索結果: ${rows.length}件のパーツが見つかりました`;
        }
      } else {
        if (searchTerm === '') {
          statusElement.textContent = `${rows.length}件のパーツが登録されています（ヘッダークリックでソート）`;
        } else {
          statusElement.textContent = `「${escapeHtml(searchTerm)}」の検索結果: ${rows.length}件のパーツが見つかりました（ヘッダークリックでソート）`;
        }
      }
      statusElement.className = 'status';
    } else {
      results.innerHTML = '<p>該当するパーツが見つかりませんでした。</p>';
      
      if (categoryName) {
        if (searchTerm === '') {
          statusElement.textContent = `カテゴリ「${categoryName}」にはパーツが登録されていません`;
        } else {
          statusElement.textContent = `カテゴリ「${categoryName}」内で「${escapeHtml(searchTerm)}」に一致するパーツは見つかりませんでした`;
        }
      } else {
        if (searchTerm === '') {
          statusElement.textContent = 'パーツが登録されていません';
        } else {
          statusElement.textContent = `「${escapeHtml(searchTerm)}」に一致するパーツは見つかりませんでした`;
        }
      }
      statusElement.className = 'status';
    }
  }

  // 検索機能（統一版）
  function doSearch() {
    try {
      statusElement.textContent = '検索中...';
      statusElement.className = 'status loading';
      
      const input = document.getElementById('globalSearchInput');
      const searchTerm = validateInput(input ? input.value.trim() : '', 'search', 100);
      
      let sql, params = [];
      
      if (searchTerm === '') {
        sql = `
          SELECT parts.*, categories.name AS category_name, categories.id AS category_id, inventory.quantity
          FROM parts
          LEFT JOIN categories ON parts.category_id = categories.id
          LEFT JOIN inventory ON parts.id = inventory.part_id
          ORDER BY categories.id, parts.name ASC
        `;
      } else {
        sql = `
          SELECT parts.*, categories.name AS category_name, categories.id AS category_id, inventory.quantity
          FROM parts
          LEFT JOIN categories ON parts.category_id = categories.id
          LEFT JOIN inventory ON parts.id = inventory.part_id
          WHERE (
            parts.name LIKE '%' || ? || '%' OR
            parts.part_number LIKE '%' || ? || '%' OR
            parts.description LIKE '%' || ? || '%' OR
            parts.logic_family LIKE '%' || ? || '%' OR
            parts.package LIKE '%' || ? || '%' OR
            categories.name LIKE '%' || ? || '%'
          )
          ORDER BY categories.id, parts.name ASC
        `;
        params = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];
      }
      
      const stmt = db.prepare(sql);
      if (params.length > 0) {
        stmt.bind(params);
      }
      
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();

      displaySearchResults(rows, searchTerm, 'globalSearchResults', 'global');
      
    } catch (error) {
      console.error('検索エラー:', error);
      statusElement.textContent = 'エラーが発生しました: 検索処理に失敗しました';
      statusElement.className = 'status error';
    }
  }

  // カテゴリ内検索機能（統一版）
  function doCategoryPartsSearch(categoryId, categoryName) {
    try {
      const input = document.getElementById('categoryPartsSearch');
      const searchTerm = validateInput(input ? input.value.trim() : '', 'search', 100);
      const validCategoryId = validateInput(categoryId, 'number');
      const validCategoryName = validateInput(categoryName, 'string', 100);
      
      let sql, params;
      
      if (searchTerm === '') {
        sql = `
          SELECT parts.*, categories.name AS category_name, categories.id AS category_id, inventory.quantity
          FROM parts
          LEFT JOIN categories ON parts.category_id = categories.id
          LEFT JOIN inventory ON parts.id = inventory.part_id
          WHERE parts.category_id = ?
          ORDER BY parts.name ASC
        `;
        params = [validCategoryId];
      } else {
        sql = `
          SELECT parts.*, categories.name AS category_name, categories.id AS category_id, inventory.quantity
          FROM parts
          LEFT JOIN categories ON parts.category_id = categories.id
          LEFT JOIN inventory ON parts.id = inventory.part_id
          WHERE parts.category_id = ? AND (
            parts.name LIKE '%' || ? || '%' OR
            parts.part_number LIKE '%' || ? || '%' OR
            parts.description LIKE '%' || ? || '%' OR
            parts.logic_family LIKE '%' || ? || '%' OR
            parts.package LIKE '%' || ? || '%' OR
            parts.manufacturer LIKE '%' || ? || '%'
          )
          ORDER BY parts.name ASC
        `;
        params = [validCategoryId, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];
      }
      
      const stmt = db.prepare(sql);
      stmt.bind(params);
      
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();

      displaySearchResults(rows, searchTerm, 'categoryPartsResults', 'category', validCategoryName);
      
    } catch (error) {
      console.error('カテゴリ内検索エラー:', error);
      statusElement.textContent = 'エラーが発生しました: 検索処理に失敗しました';
      statusElement.className = 'status error';
    }
  }
  
  function setupCategoryPartsSearchEvents(categoryId, categoryName) {
    const button = document.getElementById('categoryPartsSearchButton');
    const input = document.getElementById('categoryPartsSearch');
    
    if (button) {
      button.onclick = () => doCategoryPartsSearch(categoryId, categoryName);
    }
    
    if (input) {
      input.onkeypress = function(event) {
        if (event.key === 'Enter') {
          doCategoryPartsSearch(categoryId, categoryName);
        }
      };
    }
  }
  
  function showPartsByCategory(categoryId, categoryName) {
    if (!db) {
      statusElement.textContent = 'データベースがまだ読み込まれていません。';
      statusElement.className = 'status error';
      return;
    }
    
    try {
      statusElement.textContent = `カテゴリ「${categoryName}」のパーツを読み込み中...`;
      statusElement.className = 'status loading';
      
      const searchBar = `
        <div class="search-container">
          <input type="text" id="categoryPartsSearch" placeholder="このカテゴリ内でパーツを検索">
          <button id="categoryPartsSearchButton">検索</button>
        </div>
      `;
      
      const sql = `
        SELECT parts.*, categories.name AS category_name, categories.id AS category_id, inventory.quantity
        FROM parts
        LEFT JOIN categories ON parts.category_id = categories.id
        LEFT JOIN inventory ON parts.id = inventory.part_id
        WHERE parts.category_id = ?
        ORDER BY parts.name ASC
      `;
      
      const stmt = db.prepare(sql);
      stmt.bind([categoryId]);
      
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      
      let html = `
        <h2>カテゴリ「${escapeHtml(categoryName)}」のパーツ一覧</h2>
        ${searchBar}
        <div id="categoryPartsResults">
      `;
      
      if (rows.length > 0) {
        html += createSortableTable(rows, 'category');
        statusElement.textContent = `カテゴリ「${categoryName}」に${rows.length}件のパーツが登録されています`;
        statusElement.className = 'status';
      } else {
        html += '<p>このカテゴリにはまだパーツが登録されていません。</p>';
        statusElement.textContent = `カテゴリ「${categoryName}」にはパーツが登録されていません`;
        statusElement.className = 'status';
      }
      
      html += '</div>';
      partsView.innerHTML = html;
      
      if (rows.length > 0) {
        setupTableSorting(rows, 'category', 'categoryPartsResults');
      }
      
      setupCategoryPartsSearchEvents(categoryId, categoryName);
      
      currentView = 'parts';
      updateViewControls();
      
      categoriesView.style.display = 'none';
      partsView.style.display = 'block';
      searchView.style.display = 'none';
      
    } catch (error) {
      console.error('カテゴリ別パーツ表示エラー:', error);
      statusElement.textContent = `エラーが発生しました: ${error.message}`;
      statusElement.className = 'status error';
      
      partsView.innerHTML = `
        <h2>カテゴリ「${escapeHtml(categoryName)}」のパーツ一覧</h2>
        <p>パーツの読み込み中にエラーが発生しました。</p>
      `;
    }
  }
  
  function showCategories() {
    if (!db) {
      statusElement.textContent = 'データベースがまだ読み込まれていません。';
      statusElement.className = 'status error';
      return;
    }
    
    try {
      const stmt = db.prepare('SELECT id, name FROM categories ORDER BY id ASC');
      
      let html = '<h2>カテゴリを選択してください</h2><div class="category-container">';
      let hasCategories = false;
      
      while (stmt.step()) {
        hasCategories = true;
        const category = stmt.getAsObject();
        
        html += `
          <div class="category-card" data-category-id="${escapeHtml(category.id)}" data-category-name="${escapeHtml(category.name)}">
            <h3>${escapeHtml(category.name)}</h3>
          </div>
        `;
      }
      
      html += '</div>';
      stmt.free();
      
      if (hasCategories) {
        categoriesView.innerHTML = html;
        setupCategoryCardEvents();
        statusElement.textContent = 'データベースの読み込みが完了しました。';
        statusElement.className = 'status';
      } else {
        categoriesView.innerHTML = '<h2>カテゴリを選択してください</h2><p>カテゴリが見つかりませんでした。</p>';
        statusElement.textContent = 'カテゴリ情報が登録されていません。';
        statusElement.className = 'status';
      }
      
      currentView = 'categories';
      updateViewControls();
      
      if (currentTab !== 'categories') {
        switchTab('categories');
      } else {
        categoriesView.style.display = 'block';
        partsView.style.display = 'none';
        searchView.style.display = 'none';
      }
      
    } catch (error) {
      console.error('カテゴリ読み込みエラー:', error);
      statusElement.textContent = `カテゴリ情報の取得中にエラーが発生しました`;
      statusElement.className = 'status error';
    }
  }

  function setupCategoryCardEvents() {
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
      card.addEventListener('click', function() {
        const categoryId = parseInt(this.dataset.categoryId, 10);
        const categoryName = this.dataset.categoryName;
        
        if (isNaN(categoryId) || categoryId <= 0) {
          console.error('Invalid category ID');
          return;
        }
        
        if (!categoryName || categoryName.trim() === '') {
          console.error('Invalid category name');
          return;
        }
        
        selectCategory(categoryId, categoryName);
      });
      
      card.style.cursor = 'pointer';
    });
  }
  
  function selectCategory(categoryId, categoryName) {
    const validId = validateInput(categoryId, 'number');
    const validName = validateInput(categoryName, 'string', 100);
    
    if (validId === 0) {
      console.error('Invalid category ID');
      return;
    }
    
    currentCategoryId = validId;
    currentCategoryName = validName;
    showPartsByCategory(validId, validName);
  }

  // データベース初期化（ダブルDB対応）
  function initDb() {
    console.log('データベース初期化開始');
    statusElement.textContent = 'SQL.jsライブラリを読み込み中...';
    
    if (typeof initSqlJs === 'undefined') {
      statusElement.textContent = 'エラー: SQL.jsライブラリが読み込まれていません';
      statusElement.className = 'status error';
      return;
    }
    
    initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    })
    .then(SQL => {
      console.log('SQL.js読み込み完了:', typeof SQL);
      statusElement.textContent = 'データベースファイルをダウンロード中...';
      
      if (!SQL || typeof SQL.Database !== 'function') {
        throw new Error('SQL.jsの初期化に失敗しました');
      }
      
      window.SQLInstance = SQL;
      
      return fetch(DB_URL);
    })
    .then(response => {
      console.log('データベースファイル取得:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - データベースファイルが見つかりませんでした`);
      }
      return response.arrayBuffer();
    })
    .then(buffer => {
      console.log('データベースバッファ取得完了:', buffer.byteLength, 'bytes');
      
      if (!window.SQLInstance) {
        throw new Error('SQLインスタンスが利用できません');
      }
      
      // マスターデータベース作成
      originalDb = new window.SQLInstance.Database(new Uint8Array(buffer));
      console.log('マスターデータベース作成完了');
      
      // 作業用データベース作成
      if (isLocalEnvironment) {
        console.log('ローカル環境: 作業用データベースを作成');
        const workingData = originalDb.export();
        db = new window.SQLInstance.Database(workingData);
      } else {
        console.log('リモート環境: 読み取り専用データベース');
        db = originalDb;
      }
      
      // 基本的なテストクエリを実行
      const testStmt = db.prepare('SELECT name FROM sqlite_master WHERE type="table" LIMIT 1');
      const hasTable = testStmt.step();
      testStmt.free();
      
      if (!hasTable) {
        throw new Error('データベースにテーブルが見つかりません');
      }
      
      return db;
    })
    .then(() => {
      console.log('データベース初期化完了');
      console.log('環境:', isLocalEnvironment ? 'ローカル（編集可能）' : 'リモート（読み取り専用）');
      
      statusElement.textContent = 'データベースの読み込みが完了しました。';
      statusElement.className = 'status';
      
      // 環境UIを作成
      createEnvironmentUI();
      
      tabsContainer.style.display = 'block';
      setupTabs();
      showCategories();
    })
    .catch(error => {
      console.error('データベース初期化エラー:', error);
      statusElement.textContent = `エラー: ${error.message}`;
      statusElement.className = 'status error';
      
      console.error('エラー詳細:', {
        error: error,
        initSqlJs: typeof initSqlJs,
        SQLInstance: typeof window.SQLInstance,
        isLocal: isLocalEnvironment
      });
    });
  }
  
  // アプリケーション開始
  initDb();
});