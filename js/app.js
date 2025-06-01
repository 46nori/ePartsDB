// 電子パーツ在庫ビューア - メインアプリケーション

document.addEventListener('DOMContentLoaded', function() {
  let db;
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
  
  // ユーティリティ関数
  function formatStockQuantity(quantity) {
    const qty = quantity !== null ? quantity : 0;
    if (qty === 0) return `<span class="stock-zero">${qty}</span>`;
    if (qty < 5) return `<span class="stock-low">${qty}</span>`;
    return qty;
  }
  
  // 強化されたHTMLエスケープ関数
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
  
  // 入力値検証関数
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
        // 検索用: 危険な文字を除去
        return str.substring(0, maxLength).replace(/[<>\"'&;()]/g, '');
        
      default:
        return str.substring(0, maxLength);
    }
  }
  
  // URL検証付きリンク生成
  function formatPartName(name, datasheetUrl) {
    const partName = escapeHtml(name || '');
    
    if (datasheetUrl && datasheetUrl.trim() !== '') {
      try {
        const url = new URL(datasheetUrl);
        // HTTPSまたはHTTPのみ許可
        if (url.protocol === 'https:' || url.protocol === 'http:') {
          return `<a href="${escapeHtml(datasheetUrl)}" target="_blank" rel="noopener noreferrer">${partName}</a>`;
        }
      } catch (e) {
        console.warn('Invalid URL detected:', datasheetUrl);
      }
    }
    
    return partName;
  }
  
  // タブ機能とページタイトル機能を統合
  function setupTabs() {
    const categoriesTab = document.getElementById('categories-tab');
    const searchTab = document.getElementById('search-tab');
    
    if (categoriesTab) {
      categoriesTab.onclick = function() {
        switchTab('categories');
      };
    }
    
    if (searchTab) {
      searchTab.onclick = function() {
        switchTab('search');
      };
    }
    
    // ページタイトルクリック機能も統合
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
  
  // 検索機能
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
      button.onclick = function() {
        doSearch();
      };
    }
    
    if (input) {
      input.onkeypress = function(event) {
        if (event.key === 'Enter') {
          doSearch();
        }
      };
    }
  }
  
  /* filepath: /Users/m46nori/Documents/GitHub/ePartsDB/js/app.js */
  
  // ソート機能の変数（統一）
  let currentSortColumn = '';
  let currentSortDirection = 'asc';

  // セキュアなテーブル生成
  function createSortableTable(data, tableType = 'global') {
    let html = '<table class="sortable-table">';
    
    if (tableType === 'global') {
      // 全パーツ検索用のヘッダー
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
          <th data-column="category_name">カテゴリ</th>
        </tr>
      </thead>`;
    } else {
      // カテゴリ別パーツ一覧用のヘッダー
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
          <th data-column="manufacturer">メーカー</th>
        </tr>
      </thead>`;
    }
    
    html += '<tbody>';
    
    data.forEach(row => {
      const quantity = row.quantity !== null && row.quantity !== undefined ? row.quantity : 0;
      const categoryId = validateInput(row.category_id, 'number') || 0;
      const categoryName = escapeHtml(row.category_name || '未分類');
      
      html += '<tr>';
      html += `<td style="text-align: right;">${formatStockQuantity(quantity)}</td>`;
      html += `<td>${formatPartName(row.name, row.datasheet_url)}</td>`;
      html += `<td>${escapeHtml(row.logic_family || '')}</td>`;
      html += `<td>${escapeHtml(row.part_number || '')}</td>`;
      html += `<td>${escapeHtml(row.package || '')}</td>`;
      html += `<td>${escapeHtml(row.description || '')}</td>`;
      
      if (tableType === 'global') {
        // XSS対策: data属性を使用してカテゴリリンクを安全に生成
        html += `<td>
          <a href="#" class="category-link" data-category-id="${categoryId}" data-category-name="${categoryName}">
            ${categoryName}
          </a>
        </td>`;
      } else {
        html += `<td>${escapeHtml(row.manufacturer || '')}</td>`;
      }
      
      html += '</tr>';
    });
    
    html += '</tbody></table>';
    
    return html;
  }

  // データをソートする関数
  function sortData(data, column, direction) {
    return data.sort((a, b) => {
      let valueA = a[column];
      let valueB = b[column];
      
      // NULL値の処理
      if (valueA === null || valueA === undefined) valueA = '';
      if (valueB === null || valueB === undefined) valueB = '';
      
      // 数値列の処理
      if (column === 'quantity') {
        valueA = Number(valueA) || 0;
        valueB = Number(valueB) || 0;
      } else {
        // 文字列として比較（大文字小文字を区別しない）
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

  // ソートインジケーターを更新する関数
  function updateSortIndicators(activeColumn, direction, containerId) {
    console.log(`ソートインジケーター更新: ${activeColumn} ${direction} in ${containerId}`);
    
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`Container not found: ${containerId}`);
      return;
    }
    
    // 指定されたコンテナ内のソートインジケーターをクリア
    const headers = container.querySelectorAll('th.sortable');
    
    headers.forEach(header => {
      header.classList.remove('sort-asc', 'sort-desc');
      
      // span要素の矢印をクリア
      const indicator = header.querySelector('.sort-indicator');
      if (indicator) {
        indicator.textContent = '';
      }
    });
    
    // アクティブな列のインジケーターを設定
    const activeHeader = container.querySelector(`th.sortable[data-column="${activeColumn}"]`);
    if (activeHeader) {
      activeHeader.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');
      console.log(`インジケーター設定成功: ${activeColumn} ${direction}`);
    } else {
      console.warn(`Active header not found: ${activeColumn}`);
    }
  }

  // テーブルヘッダーにソートイベントを設定する関数
  function setupTableSorting(data, tableType, containerId) {
    console.log(`Setting up table sorting for ${containerId}`);
    
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`Container not found: ${containerId}`);
      return;
    }
    
    const headers = container.querySelectorAll('th.sortable');
    console.log(`Found ${headers.length} sortable headers`);
    
    headers.forEach((header, index) => {
      const column = header.dataset.column;
      console.log(`Setting up header ${index}: ${column}`);
      
      header.style.cursor = 'pointer';
      header.title = `${header.textContent.replace(/\s*[↑↓]\s*$/, '').trim()}でソート`;
      
      // 既存のイベントリスナーを削除
      header.replaceWith(header.cloneNode(true));
    });
    
    // 新しいヘッダー要素を取得してイベントを設定
    const newHeaders = container.querySelectorAll('th.sortable');
    newHeaders.forEach((header) => {
      const column = header.dataset.column;
      header.style.cursor = 'pointer';
      
      header.addEventListener('click', function(e) {
        e.preventDefault();
        console.log(`Sort clicked: ${column}`);
        
        // 同じ列をクリックした場合は方向を変更、違う列の場合は昇順から開始
        if (currentSortColumn === column) {
          currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          currentSortColumn = column;
          currentSortDirection = 'asc';
        }
        
        console.log(`Sort settings: ${currentSortColumn} ${currentSortDirection}`);
        
        // データをソート
        const sortedData = sortData([...data], column, currentSortDirection);
        
        // テーブルを再描画
        const newTable = createSortableTable(sortedData, tableType);
        container.innerHTML = newTable;
        
        // ソートインジケーターを更新
        updateSortIndicators(column, currentSortDirection, containerId);
        
        // イベントリスナーを再設定
        setupTableSorting(sortedData, tableType, containerId);
      });
    });
    
    // カテゴリリンクのイベント設定（グローバル検索の場合のみ）
    if (tableType === 'global') {
      setupCategoryLinksInTable(containerId);
    }
  }

  // テーブル内のカテゴリリンクのイベント設定
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

  // 検索結果表示の共通関数
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
      
      // ステータス表示
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

  // 簡略化: 全パーツ検索関数
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

  // 簡略化: カテゴリ内検索関数
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
  
  // セキュアな全パーツ検索関数
  function doSearch() {
    try {
      console.log('検索開始');
      
      statusElement.textContent = '検索中...';
      statusElement.className = 'status loading';
      
      const input = document.getElementById('globalSearchInput');
      const rawSearchTerm = input ? input.value.trim() : '';
      
      // 入力値検証
      const searchTerm = validateInput(rawSearchTerm, 'search', 100);
      
      console.log('検索キーワード:', searchTerm);
      
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
      
      let hasResults = false;
      const rows = [];

      while (stmt.step()) {
        hasResults = true;
        const row = stmt.getAsObject();
        rows.push(row);
      }

      stmt.free();

      if (hasResults) {
        const results = document.getElementById('globalSearchResults');
        if (results) {
          const tableHtml = createSortableTable(rows, 'global');
          results.innerHTML = tableHtml;
          
          setTimeout(() => {
            setupTableSorting(rows, 'global', 'globalSearchResults');
          }, 100);
        }
        
        if (searchTerm === '') {
          statusElement.textContent = `${rows.length}件のパーツが登録されています（ヘッダークリックでソート）`;
        } else {
          statusElement.textContent = `「${escapeHtml(searchTerm)}」の検索結果: ${rows.length}件のパーツが見つかりました（ヘッダークリックでソート）`;
        }
        statusElement.className = 'status';
      } else {
        const results = document.getElementById('globalSearchResults');
        if (results) {
          results.innerHTML = '<p>該当するパーツが見つかりませんでした。</p>';
        }
        
        if (searchTerm === '') {
          statusElement.textContent = 'パーツが登録されていません';
        } else {
          statusElement.textContent = `「${escapeHtml(searchTerm)}」に一致するパーツは見つかりませんでした`;
        }
        statusElement.className = 'status';
      }
      
    } catch (error) {
      console.error('検索エラー:', error);
      statusElement.textContent = 'エラーが発生しました: 検索処理に失敗しました';
      statusElement.className = 'status error';
    }
  }

  // セキュアなカテゴリ内検索関数
  function doCategoryPartsSearch(categoryId, categoryName) {
    try {
      const input = document.getElementById('categoryPartsSearch');
      const rawSearchTerm = input ? input.value.trim() : '';
      
      // 入力値検証
      const searchTerm = validateInput(rawSearchTerm, 'search', 100);
      const validCategoryId = validateInput(categoryId, 'number');
      const validCategoryName = validateInput(categoryName, 'string', 100);
      
      console.log(`カテゴリ内検索: "${searchTerm}" in category ${validCategoryName}`);
      
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
      
      let hasResults = false;
      const rows = [];

      while (stmt.step()) {
        hasResults = true;
        const row = stmt.getAsObject();
        rows.push(row);
      }

      stmt.free();

      const resultsContainer = document.getElementById('categoryPartsResults');
      if (resultsContainer) {
        if (hasResults) {
          const tableHtml = createSortableTable(rows, 'category');
          resultsContainer.innerHTML = tableHtml;
          
          setupTableSorting(rows, 'category', 'categoryPartsResults');
          
          if (searchTerm === '') {
            statusElement.textContent = `カテゴリ「${validCategoryName}」に${rows.length}件のパーツが登録されています`;
          } else {
            statusElement.textContent = `カテゴリ「${validCategoryName}」内の「${escapeHtml(searchTerm)}」検索結果: ${rows.length}件のパーツが見つかりました`;
          }
          statusElement.className = 'status';
        } else {
          if (searchTerm === '') {
            resultsContainer.innerHTML = '<p>このカテゴリにはまだパーツが登録されていません。</p>';
            statusElement.textContent = `カテゴリ「${validCategoryName}」にはパーツが登録されていません`;
          } else {
            resultsContainer.innerHTML = '<p>該当するパーツが見つかりませんでした。</p>';
            statusElement.textContent = `カテゴリ「${validCategoryName}」内で「${escapeHtml(searchTerm)}」に一致するパーツは見つかりませんでした`;
          }
          statusElement.className = 'status';
        }
      }
      
    } catch (error) {
      console.error('カテゴリ内検索エラー:', error);
      statusElement.textContent = 'エラーが発生しました: 検索処理に失敗しました';
      statusElement.className = 'status error';
    }
  }
  
  // カテゴリ内検索機能を設定する関数
  function setupCategoryPartsSearchEvents(categoryId, categoryName) {
    const button = document.getElementById('categoryPartsSearchButton');
    const input = document.getElementById('categoryPartsSearch');
    
    if (button) {
      button.onclick = function() {
        doCategoryPartsSearch(categoryId, categoryName);
      };
    }
    
    if (input) {
      input.onkeypress = function(event) {
        if (event.key === 'Enter') {
          doCategoryPartsSearch(categoryId, categoryName);
        }
      };
    }
  }
  
  // カテゴリ別パーツ表示機能
  function showPartsByCategory(categoryId, categoryName) {
    if (!db) {
      statusElement.textContent = 'データベースがまだ読み込まれていません。';
      statusElement.className = 'status error';
      return;
    }
    
    try {
      console.log(`カテゴリ ${categoryName} (ID: ${categoryId}) のパーツを表示`);
      
      statusElement.textContent = `カテゴリ「${categoryName}」のパーツを読み込み中...`;
      statusElement.className = 'status loading';
      
      // カテゴリ内検索バーを追加
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
      
      let hasResults = false;
      const rows = [];
      
      while (stmt.step()) {
        hasResults = true;
        const row = stmt.getAsObject();
        rows.push(row);
      }
      
      stmt.free();
      
      let html = `
        <h2>カテゴリ「${escapeHtml(categoryName)}」のパーツ一覧</h2>
        ${searchBar}
        <div id="categoryPartsResults">
      `;
      
      if (hasResults) {
        // ソート可能なテーブルを生成
        html += createSortableTable(rows, 'category');
        
        statusElement.textContent = `カテゴリ「${categoryName}」に${rows.length}件のパーツが登録されています`;
        statusElement.className = 'status';
      } else {
        html += '<p>このカテゴリにはまだパーツが登録されていません。</p>';
        statusElement.textContent = `カテゴリ「${categoryName}」にはパーツが登録されていません`;
        statusElement.className = 'status';
      }
      
      html += '</div>'; // categoryPartsResults の閉じタグ
      
      partsView.innerHTML = html;
      
      // ソート機能を設定（データがある場合のみ）
      if (hasResults) {
        setupTableSorting(rows, 'category', 'categoryPartsResults');
      }
      
      // カテゴリ内検索機能を設定
      setupCategoryPartsSearchEvents(categoryId, categoryName);
      
      // ビューの切り替え
      currentView = 'parts';
      updateViewControls();
      
      categoriesView.style.display = 'none';
      partsView.style.display = 'block';
      searchView.style.display = 'none';
      
      console.log(`カテゴリ「${categoryName}」のパーツ表示完了: ${rows.length}件`);
      
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
  
  // データベース初期化
  function initDb() {
    console.log('データベース初期化開始');
    statusElement.textContent = 'SQL.jsライブラリを読み込み中...';
    
    initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    })
    .then(SQL => {
      console.log('SQL.js読み込み完了');
      statusElement.textContent = 'データベースファイルをダウンロード中...';
      return fetch(DB_URL);
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - データベースファイルが見つかりませんでした`);
      }
      return response.arrayBuffer();
    })
    .then(buffer => {
      return initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
      }).then(SQL => {
        db = new SQL.Database(new Uint8Array(buffer));
        return db;
      });
    })
    .then(() => {
      console.log('データベース初期化完了');
      statusElement.textContent = 'データベースの読み込みが完了しました。';
      statusElement.className = 'status';
      
      tabsContainer.style.display = 'block';
      setupTabs();
      showCategories();
    })
    .catch(error => {
      console.error('データベース初期化エラー:', error);
      statusElement.textContent = `エラー: ${error.message}`;
      statusElement.className = 'status error';
    });
  }
  
  // カテゴリ表示関数
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
        
        // XSS対策: data属性を使用
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
        
        // セキュアなイベントリスナー設定
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

  // セキュアなカテゴリカードイベント設定
  function setupCategoryCardEvents() {
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
      card.addEventListener('click', function() {
        const categoryId = parseInt(this.dataset.categoryId, 10);
        const categoryName = this.dataset.categoryName;
        
        // 入力値検証
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

  // ビュー制御
  function updateViewControls() {
    if (currentView === 'categories' || currentView === 'search') {
      viewControls.innerHTML = '';
    } else if (currentView === 'parts') {
      viewControls.innerHTML = `
        <button id="backButton" class="back-button">← カテゴリ一覧に戻る</button>
      `;
      
      const backButton = document.getElementById('backButton');
      if (backButton) {
        backButton.onclick = function() {
          showCategories();
        };
      }
    }
  }
  
  // カテゴリ選択
  function selectCategory(categoryId, categoryName) {
    // 入力値検証
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

  // タブとタイトルの統合機能
  setupTabs();
  
  // アプリ開始
  initDb();
});