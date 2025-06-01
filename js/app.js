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
  
  function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return unsafe.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  function formatPartName(name, datasheetUrl) {
    const partName = escapeHtml(name || '');
    if (datasheetUrl && datasheetUrl.trim() !== '') {
      return `<a href="${escapeHtml(datasheetUrl)}" target="_blank" rel="noopener noreferrer">${partName}</a>`;
    }
    return partName;
  }
  
  // タブ機能
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
  
  // 全パーツ検索の検索関数を修正（ソート表示対応）
  function doSearch() {
    try {
      console.log('検索開始');
      
      statusElement.textContent = '検索中...';
      statusElement.className = 'status loading';
      
      const input = document.getElementById('globalSearchInput');
      const searchTerm = input ? input.value.trim() : '';
      
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
        
        const searchString = String(searchTerm);
        params = [searchString, searchString, searchString, searchString, searchString, searchString];
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
          // ソート可能なテーブルを生成（確実にクラスを適用）
          const tableHtml = createSortableTable(rows, 'global');
          results.innerHTML = `<div class="table-container">${tableHtml}</div>`;
          
          // 短い遅延後にソート機能を設定（DOM更新を確実にするため）
          setTimeout(() => {
            setupTableSorting(rows, 'global', 'globalSearchResults');
            
            // 初期ソート状態を表示（デフォルトで部品名昇順）
            currentSortColumn = 'name';
            currentSortDirection = 'asc';
            updateSortIndicators('name', 'asc');
          }, 10);
        }
        
        if (searchTerm === '') {
          statusElement.textContent = `${rows.length}件のパーツが登録されています（クリックでソート可能）`;
        } else {
          statusElement.textContent = `「${searchTerm}」の検索結果: ${rows.length}件のパーツが見つかりました（クリックでソート可能）`;
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
          statusElement.textContent = `「${searchTerm}」に一致するパーツは見つかりませんでした`;
        }
        statusElement.className = 'status';
      }
      
    } catch (error) {
      console.error('検索エラー:', error);
      statusElement.textContent = 'エラーが発生しました: ' + error.message;
      statusElement.className = 'status error';
    }
  }
  
  // ソートインジケーターを更新する関数を改良
  function updateSortIndicators(activeColumn, direction) {
    console.log(`ソートインジケーター更新: ${activeColumn} ${direction}`);
    
    // すべてのソートインジケーターをクリア
    const indicators = document.querySelectorAll('.sort-indicator');
    indicators.forEach(indicator => {
      indicator.textContent = '';
      indicator.parentElement.classList.remove('sort-asc', 'sort-desc');
    });
    
    // アクティブな列のインジケーターを設定
    const activeHeaders = document.querySelectorAll(`[data-column="${activeColumn}"]`);
    activeHeaders.forEach(activeHeader => {
      if (activeHeader.classList.contains('sortable')) {
        const indicator = activeHeader.querySelector('.sort-indicator');
        if (indicator) {
          indicator.textContent = direction === 'asc' ? ' ↑' : ' ↓';
          activeHeader.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');
          console.log(`インジケーター設定完了: ${activeColumn} ${direction}`);
        }
      }
    });
  }
  
  // テーブルヘッダーにソートイベントを設定する関数を改良
  function setupTableSorting(data, tableType, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`Container not found: ${containerId}`);
      return;
    }
    
    const headers = container.querySelectorAll('th.sortable');
    console.log(`ソート可能ヘッダー数: ${headers.length}`);
    
    headers.forEach((header, index) => {
      const column = header.dataset.column;
      console.log(`ヘッダー${index}: ${column}`);
      
      header.style.cursor = 'pointer';
      header.title = `${header.textContent.trim()}でソート`;
      
      // 既存のイベントリスナーを削除
      header.onclick = null;
      
      header.onclick = function(e) {
        e.preventDefault();
        console.log(`ソート実行: ${column}`);
        
        const clickedColumn = this.dataset.column;
        
        // 同じ列をクリックした場合は方向を変更、違う列の場合は昇順から開始
        if (currentSortColumn === clickedColumn) {
          currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          currentSortColumn = clickedColumn;
          currentSortDirection = 'asc';
        }
        
        console.log(`ソート設定: ${currentSortColumn} ${currentSortDirection}`);
        
        // データをソート
        const sortedData = sortData([...data], clickedColumn, currentSortDirection);
        
        // テーブルを再描画
        const newTable = createSortableTable(sortedData, tableType);
        container.innerHTML = newTable;
        
        // ソートインジケーターを更新
        setTimeout(() => {
          updateSortIndicators(clickedColumn, currentSortDirection);
          
          // イベントリスナーを再設定
          setupTableSorting(sortedData, tableType, containerId);
        }, 10);
      };
    });
    
    // 初期状態のインジケーターを設定
    if (currentSortColumn && currentSortDirection) {
      updateSortIndicators(currentSortColumn, currentSortDirection);
    }
  }
  
  /* ...existing code... */  // ソート機能の追加
  let currentSortColumn = '';
  let currentSortDirection = 'asc';

  // ソート可能なテーブルを生成する関数
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
      const categoryId = row.category_id || 0;
      const categoryName = row.category_name || '未分類';
      
      html += '<tr>';
      html += `<td style="text-align: right;">${formatStockQuantity(quantity)}</td>`;
      html += `<td>${formatPartName(row.name, row.datasheet_url)}</td>`;
      html += `<td>${escapeHtml(row.logic_family || '')}</td>`;
      html += `<td>${escapeHtml(row.part_number || '')}</td>`;
      html += `<td>${escapeHtml(row.package || '')}</td>`;
      html += `<td>${escapeHtml(row.description || '')}</td>`;
      
      if (tableType === 'global') {
        html += `<td>
          <a href="#" onclick="selectCategory(${categoryId}, '${escapeHtml(categoryName)}'); return false;">
            ${escapeHtml(categoryName)}
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
  function updateSortIndicators(activeColumn, direction) {
    // すべてのソートインジケーターをクリア
    const indicators = document.querySelectorAll('.sort-indicator');
    indicators.forEach(indicator => {
      indicator.textContent = '';
      indicator.parentElement.classList.remove('sort-asc', 'sort-desc');
    });
    
    // アクティブな列のインジケーターを設定
    const activeHeader = document.querySelector(`[data-column="${activeColumn}"]`);
    if (activeHeader) {
      const indicator = activeHeader.querySelector('.sort-indicator');
      if (indicator) {
        indicator.textContent = direction === 'asc' ? ' ↑' : ' ↓';
        activeHeader.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');
      }
    }
  }

  // テーブルヘッダーにソートイベントを設定する関数
  function setupTableSorting(data, tableType, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const headers = container.querySelectorAll('th.sortable');
    headers.forEach(header => {
      header.style.cursor = 'pointer';
      header.onclick = function() {
        const column = this.dataset.column;
        
        // 同じ列をクリックした場合は方向を変更、違う列の場合は昇順から開始
        if (currentSortColumn === column) {
          currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          currentSortColumn = column;
          currentSortDirection = 'asc';
        }
        
        // データをソート
        const sortedData = sortData([...data], column, currentSortDirection);
        
        // テーブルを再描画
        const newTable = createSortableTable(sortedData, tableType);
        container.innerHTML = newTable;
        
        // ソートインジケーターを更新
        updateSortIndicators(column, currentSortDirection);
        
        // イベントリスナーを再設定
        setupTableSorting(sortedData, tableType, containerId);
      };
    });
  }
  
  // 全パーツ検索の検索関数を修正
  function doSearch() {
    try {
      console.log('検索開始');
      
      statusElement.textContent = '検索中...';
      statusElement.className = 'status loading';
      
      const input = document.getElementById('globalSearchInput');
      const searchTerm = input ? input.value.trim() : '';
      
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
        
        const searchString = String(searchTerm);
        params = [searchString, searchString, searchString, searchString, searchString, searchString];
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
          // ソート可能なテーブルを生成
          const tableHtml = createSortableTable(rows, 'global');
          results.innerHTML = tableHtml;
          
          // ソート機能を設定
          setupTableSorting(rows, 'global', 'globalSearchResults');
        }
        
        if (searchTerm === '') {
          statusElement.textContent = `${rows.length}件のパーツが登録されています`;
        } else {
          statusElement.textContent = `「${searchTerm}」の検索結果: ${rows.length}件のパーツが見つかりました`;
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
          statusElement.textContent = `「${searchTerm}」に一致するパーツは見つかりませんでした`;
        }
        statusElement.className = 'status';
      }
      
    } catch (error) {
      console.error('検索エラー:', error);
      statusElement.textContent = 'エラーが発生しました: ' + error.message;
      statusElement.className = 'status error';
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
      const SQL = window.initSqlJs.__SQL__ || window.SQL;
      if (!SQL) {
        return initSqlJs({
          locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
        }).then(SQL => {
          db = new SQL.Database(new Uint8Array(buffer));
          return db;
        });
      } else {
        db = new SQL.Database(new Uint8Array(buffer));
        return db;
      }
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
  
  // カテゴリ表示
  function showCategories() {
    if (!db) {
      statusElement.textContent = 'データベースがまだ読み込まれていません。';
      statusElement.className = 'status error';
      return;
    }
    
    try {
      const searchBar = `
        <div class="search-container">
          <input type="text" id="categorySearch" placeholder="カテゴリ検索">
          <button id="categorySearchButton">検索</button>
        </div>
        <h2>カテゴリを選択してください</h2>
      `;
      
      const stmt = db.prepare('SELECT id, name FROM categories ORDER BY id ASC');
      
      let html = searchBar + '<div class="category-container">';
      let hasCategories = false;
      
      while (stmt.step()) {
        hasCategories = true;
        const category = stmt.getAsObject();
        html += `
          <div class="category-card" onclick="selectCategory(${category.id}, '${escapeHtml(category.name)}')">
            <h3>${escapeHtml(category.name)}</h3>
          </div>
        `;
      }
      
      html += '</div>';
      stmt.free();
      
      if (hasCategories) {
        categoriesView.innerHTML = html;
        statusElement.textContent = 'データベースの読み込みが完了しました。';
        statusElement.className = 'status';
      } else {
        categoriesView.innerHTML = searchBar + '<p>カテゴリが見つかりませんでした。</p>';
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
      statusElement.textContent = `カテゴリ情報の取得中にエラーが発生しました: ${error.message}`;
      statusElement.className = 'status error';
    }
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
  
  // カテゴリ別パーツ表示機能（完全実装版）
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
  
  // カテゴリ内パーツ検索機能
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
  
  // カテゴリ内パーツ検索実行を修正
  function doCategoryPartsSearch(categoryId, categoryName) {
    try {
      const input = document.getElementById('categoryPartsSearch');
      const searchTerm = input ? input.value.trim() : '';
      
      console.log(`カテゴリ内検索: "${searchTerm}" in category ${categoryName}`);
      
      let sql, params;
      
      if (searchTerm === '') {
        // 検索ワードが空の場合は全パーツを表示
        sql = `
          SELECT parts.*, categories.name AS category_name, categories.id AS category_id, inventory.quantity
          FROM parts
          LEFT JOIN categories ON parts.category_id = categories.id
          LEFT JOIN inventory ON parts.id = inventory.part_id
          WHERE parts.category_id = ?
          ORDER BY parts.name ASC
        `;
        params = [categoryId];
      } else {
        // 検索ワードがある場合はフィルタリング
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
        
        const searchString = String(searchTerm);
        params = [categoryId, searchString, searchString, searchString, searchString, searchString, searchString];
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

      // 検索結果を表示
      const resultsContainer = document.getElementById('categoryPartsResults');
      if (resultsContainer) {
        if (hasResults) {
          // ソート可能なテーブルを生成
          const tableHtml = createSortableTable(rows, 'category');
          resultsContainer.innerHTML = tableHtml;
          
          // ソート機能を設定
          setupTableSorting(rows, 'category', 'categoryPartsResults');
          
          if (searchTerm === '') {
            statusElement.textContent = `カテゴリ「${categoryName}」に${rows.length}件のパーツが登録されています`;
          } else {
            statusElement.textContent = `カテゴリ「${categoryName}」内の「${searchTerm}」検索結果: ${rows.length}件のパーツが見つかりました`;
          }
          statusElement.className = 'status';
        } else {
          if (searchTerm === '') {
            resultsContainer.innerHTML = '<p>このカテゴリにはまだパーツが登録されていません。</p>';
            statusElement.textContent = `カテゴリ「${categoryName}」にはパーツが登録されていません`;
          } else {
            resultsContainer.innerHTML = '<p>該当するパーツが見つかりませんでした。</p>';
            statusElement.textContent = `カテゴリ「${categoryName}」内で「${searchTerm}」に一致するパーツは見つかりませんでした`;
          }
          statusElement.className = 'status';
        }
      }
      
    } catch (error) {
      console.error('カテゴリ内検索エラー:', error);
      statusElement.textContent = 'エラーが発生しました: ' + error.message;
      statusElement.className = 'status error';
    }
  }
  
  // グローバル関数
  window.selectCategory = function(categoryId, categoryName) {
    currentCategoryId = categoryId;
    currentCategoryName = categoryName;
    showPartsByCategory(categoryId, categoryName);
  };
  
  // タイトルクリック
  if (pageTitle) {
    pageTitle.onclick = function() {
      if (currentTab !== 'categories') {
        currentTab = 'categories';
        
        const categoriesTab = document.getElementById('categories-tab');
        const searchTab = document.getElementById('search-tab');
        
        if (categoriesTab && searchTab) {
          categoriesTab.className = 'tab active';
          searchTab.className = 'tab';
        }
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
  
  // アプリ開始
  initDb();
});