// 電子パーツ在庫ビューア - メインアプリケーション

// DOMが完全に読み込まれた後に実行されるようにする
document.addEventListener('DOMContentLoaded', function() {
  let db;
  const statusElement = document.getElementById('status');
  const categoriesView = document.getElementById('categories-view');
  const partsView = document.getElementById('parts-view');
  const searchView = document.getElementById('search-view');
  const viewControls = document.getElementById('view-controls');
  const tabsContainer = document.getElementById('tabs-container');
  const pageTitle = document.getElementById('page-title');
  
  // タイトルクリックでトップに戻る
  if (pageTitle) {
    pageTitle.addEventListener('click', function() {
      // 現在のタブが「search」の場合は「categories」に切り替える
      if (currentTab !== 'categories') {
        // 明示的にカテゴリタブをアクティブにする
        currentTab = 'categories';
        
        // タブ表示を更新
        const categoriesTab = document.getElementById('categories-tab');
        const searchTab = document.getElementById('search-tab');
        
        if (categoriesTab && searchTab) {
          categoriesTab.className = 'tab active';
          searchTab.className = 'tab';
        }
        
        // カテゴリ検索もリセット
        const categorySearch = document.getElementById('categorySearch');
        if (categorySearch) {
          categorySearch.value = '';
        }
      }
      
      // カテゴリ一覧を表示
      showCategories();
    });
    
    // ホバー時にタイトルの色を変更し、クリック可能なことを示す
    pageTitle.addEventListener('mouseover', function() {
      this.style.color = '#3498db';
    });
    
    pageTitle.addEventListener('mouseout', function() {
      this.style.color = '#2c3e50';
    });
  }
  
  // データベースファイルのURL
  const DB_URL = './eparts.db';

  // 現在のビュー状態を管理
  let currentView = 'categories'; // 'categories' または 'parts'
  let currentTab = 'categories';  // 'categories' または 'search'
  let currentCategoryId = null;
  let currentCategoryName = '';
  
  // タブ切り替え用のイベントリスナーを設定
  function setupTabs() {
    const categoriesTab = document.getElementById('categories-tab');
    const searchTab = document.getElementById('search-tab');
    
    if (categoriesTab && searchTab) {
      categoriesTab.addEventListener('click', function() {
        switchTab('categories');
      });
      
      searchTab.addEventListener('click', function() {
        switchTab('search');
      });
    }
  }
  
  // タブを切り替える関数
  function switchTab(tabName) {
    currentTab = tabName;
    
    // タブのクラスを更新
    const categoriesTab = document.getElementById('categories-tab');
    const searchTab = document.getElementById('search-tab');
    
    if (categoriesTab && searchTab) {
      categoriesTab.className = tabName === 'categories' ? 'tab active' : 'tab';
      searchTab.className = tabName === 'search' ? 'tab active' : 'tab';
      
      // ビュー表示を切り替え
      if (tabName === 'categories') {
        categoriesView.style.display = 'block';
        searchView.style.display = 'none';
        partsView.style.display = 'none';
        
        // カテゴリ一覧を表示
        if (currentView !== 'parts') {
          currentView = 'categories';
          updateViewControls();
        }
      } else if (tabName === 'search') {
        categoriesView.style.display = 'none';
        searchView.style.display = 'block';
        partsView.style.display = 'none';
        
        // 検索ビューを初期化（必ずリセット）
        showSearchView(true); // 検索フォームをリセット
        
        if (currentView !== 'parts') {
          currentView = 'search';
          updateViewControls();
        }
      }
    }
  }
  
  // 全パーツ検索ビューを表示
  function showSearchView(resetForm = false) {
    // 既存の検索コンテナがある場合
    const existingContainer = searchView.querySelector('.search-container');
    
    // resetFormがtrueの場合は常に新しいフォームを作成
    if (!existingContainer || resetForm) {
      const searchForm = `
        <div class="search-container">
          <input type="text" id="globalSearchInput" placeholder="部品名、型番、種別、説明などで検索">
          <button id="globalSearchButton">検索</button>
        </div>
        <div id="globalSearchResults"></div>
      `;
      
      // 検索ビューの内容を完全にリセット
      searchView.innerHTML = searchForm;
      
      // 検索ボタンのイベントリスナーを設定
      const globalSearchButton = document.getElementById('globalSearchButton');
      if (globalSearchButton) {
        globalSearchButton.addEventListener('click', performGlobalSearch);
      }
      
      const globalSearchInput = document.getElementById('globalSearchInput');
      if (globalSearchInput) {
        globalSearchInput.addEventListener('keypress', function(event) {
          if (event.key === 'Enter') {
            performGlobalSearch();
          }
        });
        
        // フォーカスを検索ボックスに設定
        globalSearchInput.focus();
      }
    }
  }
  
  // 在庫数の表示スタイルを適用する関数
  function formatStockQuantity(quantity) {
    const qty = quantity !== null ? quantity : 0;
    let className = '';
    
    if (qty === 0) {
      className = 'stock-zero';
    } else if (qty < 5) {  // 5未満を少ない在庫として黄色表示
      className = 'stock-low';
    }
    // 5以上は通常表示（クラスなし）
    
    return className ? `<span class="${className}">${qty}</span>` : qty;
  }
  
  // 全パーツ検索を実行（修正）
  function performGlobalSearch(sortField = 'categories.id, parts.name', sortDirection = 'ASC') {
    if (!db) {
      statusElement.textContent = 'データベースがまだ読み込まれていません。';
      statusElement.className = 'status error';
      return;
    }
    
    const globalSearchInput = document.getElementById('globalSearchInput');
    if (!globalSearchInput) return;
    
    const keyword = globalSearchInput.value.trim();
    
    try {
      let sql;
      let params = {};
      
      if (keyword === '') {
        // 空のクエリの場合は全パーツを表示（カテゴリID順）
        sql = `
          SELECT 
            parts.id,
            parts.name, 
            parts.logic_family, 
            parts.part_number, 
            parts.description,
            inventory.quantity,
            categories.name AS category_name,
            categories.id AS category_id
          FROM parts
          LEFT JOIN inventory ON parts.id = inventory.part_id
          LEFT JOIN categories ON parts.category_id = categories.id
          ORDER BY categories.id, parts.name
        `;
      } else {
        // 検索キーワードがある場合
        sql = `
          SELECT 
            parts.id,
            parts.name, 
            parts.logic_family, 
            parts.part_number, 
            parts.description,
            inventory.quantity,
            categories.name AS category_name,
            categories.id AS category_id
          FROM parts
          LEFT JOIN inventory ON parts.id = inventory.part_id
          LEFT JOIN categories ON parts.category_id = categories.id
          WHERE 
            parts.name LIKE $kw 
            OR parts.part_number LIKE $kw 
            OR parts.description LIKE $kw
            OR parts.logic_family LIKE $kw
          ORDER BY parts.name
        `;
        params = { $kw: `%${keyword}%` };
      }
      
      const stmt = db.prepare(sql);
      if (keyword !== '') {
        stmt.bind(params);
      }
      
      let rows = [];
      let html = `<table>
        <tr>
          <th>在庫数</th>
          <th>部品名</th>
          <th>種別</th>
          <th>型番</th>
          <th>説明</th>
          <th>カテゴリ</th>
        </tr>`;
      
      let hasResults = false;
      
      while (stmt.step()) {
        hasResults = true;
        const row = stmt.getAsObject();
        rows.push(row);
        html += `<tr>
          <td style="text-align: right;">${formatStockQuantity(row.quantity)}</td>
          <td>${escapeHtml(row.name || '')}</td>
          <td>${escapeHtml(row.logic_family || '')}</td>
          <td>${escapeHtml(row.part_number || '')}</td>
          <td>${escapeHtml(row.description || '')}</td>
          <td>
            <a href="#" onclick="selectCategory(${row.category_id}, '${escapeHtml(row.category_name || '')}'); return false;">
              ${escapeHtml(row.category_name || '未分類')}
            </a>
          </td>
        </tr>`;
      }
      
      html += '</table>';
      
      const globalSearchResults = document.getElementById('globalSearchResults');
      
      if (hasResults) {
        globalSearchResults.innerHTML = html;
        statusElement.textContent = keyword ? 
          `検索結果: 「${escapeHtml(keyword)}」に一致する部品が${rows.length}件見つかりました。` :
          `全パーツ一覧（${rows.length}件）`;
        statusElement.className = 'status';
      } else {
        globalSearchResults.innerHTML = '<p>該当する部品が見つかりませんでした。</p>';
        statusElement.textContent = keyword ? 
          `「${escapeHtml(keyword)}」に一致する部品は見つかりませんでした。` :
          `データベースにパーツが登録されていません。`;
        statusElement.className = 'status';
      }
    } catch (error) {
      console.error('グローバル検索エラー:', error);
      statusElement.textContent = `検索中にエラーが発生しました: ${error.message}`;
      statusElement.className = 'status error';
      document.getElementById('globalSearchResults').innerHTML = '';
    }
  }
  
  // Safari対応のWASMロード処理の変更
  function initDb() {
    // Safari用にwasmBinaryのキャッシュバスティング
    const wasmUrl = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm';
    
    initSqlJs({ 
      locateFile: file => {
        if (file.endsWith('.wasm')) {
          return `${wasmUrl}?t=${new Date().getTime()}`; // キャッシュ回避
        }
        return `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`;
      }
    })
    .then(SQL => {
      statusElement.textContent = 'データベースファイルをダウンロード中...';
      
      // XMLHttpRequestを使用してSafariでも確実に動作させる
      const xhr = new XMLHttpRequest();
      xhr.open('GET', DB_URL, true);
      xhr.responseType = 'arraybuffer';
      
      xhr.onload = function() {
        if (xhr.status === 200) {
          try {
            const buffer = xhr.response;
            db = new SQL.Database(new Uint8Array(buffer));
            statusElement.textContent = 'データベースの読み込みが完了しました。';
            statusElement.className = 'status';
            
            // タブコンテナを表示
            tabsContainer.style.display = 'block';
            // タブ切り替え機能を設定
            setupTabs();
            
            // 初期表示としてカテゴリ一覧を表示
            showCategories();
          } catch (e) {
            console.error('データベース作成エラー:', e);
            statusElement.textContent = `データベース作成エラー: ${e.message}`;
            statusElement.className = 'status error';
          }
        } else {
          console.error('データベースファイルが読み込めませんでした');
          statusElement.textContent = `エラー: HTTP ${xhr.status} - データベースファイルが見つかりませんでした。`;
          statusElement.className = 'status error';
        }
      };
      
      xhr.onerror = function() {
        console.error('ネットワークエラー');
        statusElement.textContent = 'ネットワークエラー: データベースファイルをダウンロードできませんでした。';
        statusElement.className = 'status error';
      };
      
      xhr.send();
    })
    .catch(error => {
      console.error('SQL.js初期化エラー:', error);
      statusElement.textContent = `SQL.jsの読み込みに失敗しました: ${error.message}`;
      statusElement.className = 'status error';
    });
  }
  
  // カテゴリ一覧表示関数の修正
  function showCategories() {
    if (!db) {
      statusElement.textContent = 'データベースがまだ読み込まれていません。';
      statusElement.className = 'status error';
      return;
    }
    
    try {
      // 検索バーをカテゴリビュー内に追加（値はクリアする）
      const searchBar = `
        <div class="search-container">
          <input type="text" id="categorySearch" placeholder="カテゴリ検索">
          <button id="categorySearchButton">検索</button>
        </div>
        <h2>カテゴリを選択してください</h2>
      `;
      
      // カテゴリ一覧の取得 - ID順で表示
      const sql = `
        SELECT id, name FROM categories
        ORDER BY id ASC
      `;
      
      const stmt = db.prepare(sql);
      
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
      
      if (hasCategories) {
        categoriesView.innerHTML = html;
        statusElement.textContent = 'データベースの読み込みが完了しました。';
        statusElement.className = 'status';
      } else {
        categoriesView.innerHTML = searchBar + '<p>カテゴリが見つかりませんでした。</p>';
        statusElement.textContent = 'カテゴリ情報が登録されていません。';
        statusElement.className = 'status';
      }
      
      // 検索ボタンのイベントリスナーを設定
      const categorySearchButton = document.getElementById('categorySearchButton');
      if (categorySearchButton) {
        categorySearchButton.addEventListener('click', searchCategories);
      }
      
      const categorySearch = document.getElementById('categorySearch');
      if (categorySearch) {
        categorySearch.addEventListener('keypress', function(event) {
          if (event.key === 'Enter') {
            searchCategories();
          }
        });
      }
      
      // ビューの切り替え部分を修正
      currentView = 'categories';
      updateViewControls();
      
      // タブの状態を更新
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
      categoriesView.innerHTML = '';
    }
  }
  
  // カテゴリが選択されたときの処理
  window.selectCategory = function(categoryId, categoryName) {
    currentCategoryId = categoryId;
    currentCategoryName = categoryName;
    
    // パーツ一覧表示に切り替え
    showPartsByCategory(categoryId, categoryName);
  };
  
  // カテゴリ別のパーツ一覧を表示する関数
  function showPartsByCategory(categoryId, categoryName) {
    if (!db) {
      statusElement.textContent = 'データベースがまだ読み込まれていません。';
      statusElement.className = 'status error';
      return;
    }
    
    // デフォルトのソート設定
    let sortField = 'parts.name';
    let sortDirection = 'ASC';
    
    showSortedParts(categoryId, categoryName, sortField, sortDirection);
  }
  
  // ソート機能付きでパーツ一覧を表示
  function showSortedParts(categoryId, categoryName, sortField = 'inventory.quantity', sortDirection = 'DESC') {
    try {
      const sql = `
        SELECT parts.name, parts.logic_family, parts.part_number, parts.description, inventory.quantity
        FROM parts
        LEFT JOIN inventory ON parts.id = inventory.part_id
        WHERE parts.category_id = $categoryId
        ORDER BY ${sortField} ${sortDirection}
      `;
      
      const stmt = db.prepare(sql);
      stmt.bind({ $categoryId: categoryId });
      
      let rows = [];
      let html = `<table>
        <tr>
          <th class="sortable" data-field="inventory.quantity" data-direction="${sortField === 'inventory.quantity' ? (sortDirection === 'ASC' ? 'DESC' : 'ASC') : 'ASC'}">
            在庫数 ${sortField === 'inventory.quantity' ? (sortDirection === 'ASC' ? '▲' : '▼') : ''}
          </th>
          <th class="sortable" data-field="parts.name" data-direction="${sortField === 'parts.name' ? (sortDirection === 'ASC' ? 'DESC' : 'ASC') : 'ASC'}">
            部品名 ${sortField === 'parts.name' ? (sortDirection === 'ASC' ? '▲' : '▼') : ''}
          </th>
          <th class="sortable" data-field="parts.logic_family" data-direction="${sortField === 'parts.logic_family' ? (sortDirection === 'ASC' ? 'DESC' : 'ASC') : 'ASC'}">
            種別 ${sortField === 'parts.logic_family' ? (sortDirection === 'ASC' ? '▲' : '▼') : ''}
          </th>
          <th class="sortable" data-field="parts.part_number" data-direction="${sortField === 'parts.part_number' ? (sortDirection === 'ASC' ? 'DESC' : 'ASC') : 'ASC'}">
            型番 ${sortField === 'parts.part_number' ? (sortDirection === 'ASC' ? '▲' : '▼') : ''}
          </th>
          <th>説明</th>
        </tr>`;
      
      let hasResults = false;
      
      while (stmt.step()) {
        hasResults = true;
        const row = stmt.getAsObject();
        rows.push(row);
        html += `<tr>
          <td style="text-align: right;">${formatStockQuantity(row.quantity)}</td>
          <td>${escapeHtml(row.name || '')}</td>
          <td>${escapeHtml(row.logic_family || '')}</td>
          <td>${escapeHtml(row.part_number || '')}</td>
          <td>${escapeHtml(row.description || '')}</td>
        </tr>`;
      }
      
      html += '</table>';
      
      // 検索フォームを追加
      const searchForm = `
        <div class="search-container">
          <input type="text" id="queryInput" placeholder="このカテゴリ内を検索（空欄で全件表示）">
          <button id="searchButton">検索</button>
        </div>
      `;
      
      if (hasResults) {
        partsView.innerHTML = searchForm + html;
        statusElement.textContent = `カテゴリ「${escapeHtml(categoryName)}」の部品一覧（${rows.length}件）`;
        statusElement.className = 'status';
      } else {
        partsView.innerHTML = searchForm + '<p>このカテゴリには部品が登録されていません。</p>';
        statusElement.textContent = `カテゴリ「${escapeHtml(categoryName)}」には部品が登録されていません。`;
        statusElement.className = 'status';
      }
      
      // ソート機能のイベントリスナーを追加
      const sortableHeaders = document.querySelectorAll('.sortable');
      sortableHeaders.forEach(header => {
        header.addEventListener('click', function() {
          const field = this.dataset.field;
          const direction = this.dataset.direction;
          showSortedParts(categoryId, categoryName, field, direction);
        });
        // クリック可能なことを視覚的に示す
        header.style.cursor = 'pointer';
      });
      
      // 検索ボタンにイベントリスナーを追加
      const searchButton = document.getElementById('searchButton');
      if (searchButton) {
        searchButton.addEventListener('click', function() {
          searchPartsInCategory(categoryId, categoryName);
        });
      }
      
      const queryInput = document.getElementById('queryInput');
      if (queryInput) {
        queryInput.addEventListener('keypress', function(event) {
          if (event.key === 'Enter') {
            searchPartsInCategory(categoryId, categoryName);
          }
        });
      }
      
      // ビューを切り替え
      currentView = 'parts';
      updateViewControls();
      categoriesView.style.display = 'none';
      partsView.style.display = 'block';
      searchView.style.display = 'none';
      
    } catch (error) {
      console.error('パーツ読み込みエラー:', error);
      statusElement.textContent = `パーツ情報の取得中にエラーが発生しました: ${error.message}`;
      statusElement.className = 'status error';
      partsView.innerHTML = '';
    }
  }
  
  // カテゴリ内のパーツを検索する（修正）
  function searchPartsInCategory(categoryId, categoryName) {
    if (!db) {
      statusElement.textContent = 'データベースがまだ読み込まれていません。';
      statusElement.className = 'status error';
      return;
    }
    
    const queryInput = document.getElementById('queryInput');
    if (!queryInput) return;
    
    try {
      const keyword = queryInput.value.trim();
      let sql, params;
      
      if (keyword === '') {
        // 空のクエリの場合はカテゴリ内の全件表示
        sql = `
          SELECT parts.name, parts.logic_family, parts.part_number, parts.description, inventory.quantity
          FROM parts
          LEFT JOIN inventory ON parts.id = inventory.part_id
          WHERE parts.category_id = $categoryId
          ORDER BY parts.name
        `;
        params = { $categoryId: categoryId };
      } else {
        // 検索キーワードがある場合
        sql = `
          SELECT parts.name, parts.logic_family, parts.part_number, parts.description, inventory.quantity
          FROM parts
          LEFT JOIN inventory ON parts.id = inventory.part_id
          WHERE parts.category_id = $categoryId 
          AND (parts.name LIKE $kw OR parts.part_number LIKE $kw OR parts.description LIKE $kw OR parts.logic_family LIKE $kw)
          ORDER BY parts.name
        `;
        params = { 
          $categoryId: categoryId,
          $kw: `%${keyword}%` 
        };
      }
      
      const stmt = db.prepare(sql);
      stmt.bind(params);
      
      let html = `<table>
        <tr>
          <th>部品名</th>
          <th>種別</th>
          <th>型番</th>
          <th>説明</th>
          <th>在庫数</th>
        </tr>`;
      
      let hasResults = false;
      
      while (stmt.step()) {
        hasResults = true;
        const row = stmt.getAsObject();
        rows.push(row);
        html += `<tr>
          <td>${escapeHtml(row.name || '')}</td>
          <td>${escapeHtml(row.logic_family || '')}</td>
          <td>${escapeHtml(row.part_number || '')}</td>
          <td>${escapeHtml(row.description || '')}</td>
          <td style="text-align: right;">${formatStockQuantity(row.quantity)}</td>
        </tr>`;
      }
      
      html += '</table>';
      
      // 検索フォームは再表示しない
      const searchForm = partsView.querySelector('.search-container');
      
      if (hasResults) {
        partsView.innerHTML = '';
        if (searchForm) partsView.appendChild(searchForm);
        partsView.innerHTML += html;
        
        // 検索ボタンのイベントリスナーを再設定
        const searchButton = document.getElementById('searchButton');
        if (searchButton) {
          searchButton.addEventListener('click', function() {
            searchPartsInCategory(categoryId, categoryName);
          });
        }
        
        const newQueryInput = document.getElementById('queryInput');
        if (newQueryInput) {
          newQueryInput.value = keyword;
          newQueryInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
              searchPartsInCategory(categoryId, categoryName);
            }
          });
        }
        
        statusElement.textContent = keyword ? 
          `カテゴリ「${escapeHtml(categoryName)}」で「${escapeHtml(keyword)}」の検索結果（${rows.length}件）` :
          `カテゴリ「${escapeHtml(categoryName)}」の部品一覧（${rows.length}件）`;
        statusElement.className = 'status';
      } else {
        partsView.innerHTML = '';
        if (searchForm) partsView.appendChild(searchForm);
        partsView.innerHTML += '<p>該当する部品が見つかりませんでした。</p>';
        
        // 検索ボタンのイベントリスナーを再設定
        const searchButton = document.getElementById('searchButton');
        if (searchButton) {
          searchButton.addEventListener('click', function() {
            searchPartsInCategory(categoryId, categoryName);
          });
        }
        
        const newQueryInput = document.getElementById('queryInput');
        if (newQueryInput) {
          newQueryInput.value = keyword;
          newQueryInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
              searchPartsInCategory(categoryId, categoryName);
            }
          });
        }
        
        statusElement.textContent = `カテゴリ「${escapeHtml(categoryName)}」で「${escapeHtml(keyword)}」に一致する部品はありません。`;
        statusElement.className = 'status';
      }
      
    } catch (error) {
      console.error('検索エラー:', error);
      statusElement.textContent = `検索中にエラーが発生しました: ${error.message}`;
      statusElement.className = 'status error';
    }
  }
  
  // ビュー切り替えコントロールを更新
  function updateViewControls() {
    if (currentView === 'categories' || currentView === 'search') {
      // カテゴリ一覧表示時と検索表示時は戻るボタンを表示しない
      viewControls.innerHTML = '';
    } else if (currentView === 'parts') {
      // パーツ一覧表示時のみ戻るボタンを表示
      viewControls.innerHTML = `
        <button id="backButton" class="back-button">← カテゴリ一覧に戻る</button>
      `;
      
      const backButton = document.getElementById('backButton');
      if (backButton) {
        backButton.addEventListener('click', showCategories);
      }
    }
  }
  
  // カテゴリを検索
  function searchCategories() {
    if (!db) {
      statusElement.textContent = 'データベースがまだ読み込まれていません。';
      statusElement.className = 'status error';
      return;
    }
    
    const categorySearch = document.getElementById('categorySearch');
    if (!categorySearch) return;
    
    try {
      const keyword = categorySearch.value.trim();
      
      // 検索バーを再表示する
      const searchBar = `
        <div class="search-container">
          <input type="text" id="categorySearch" placeholder="カテゴリ検索" value="${escapeHtml(keyword)}">
          <button id="categorySearchButton">検索</button>
        </div>
      `;
      
      let sql;
      
      if (keyword === '') {
        // 空の検索の場合は全カテゴリ表示（ID順）
        sql = `
          SELECT id, name FROM categories
          ORDER BY id ASC
        `;
      } else {
        // 検索キーワードがある場合（ID順）
        sql = `
          SELECT id, name FROM categories
          WHERE name LIKE '%${keyword}%'
          ORDER BY id ASC
        `;
      }
      
      const stmt = db.prepare(sql);
      
      let html = searchBar;
      
      // キーワードがある場合は検索結果のタイトル、なければ標準タイトル
      if (keyword !== '') {
        html += `<h2>「${escapeHtml(keyword)}」の検索結果</h2>`;
      } else {
        html += `<h2>カテゴリを選択してください</h2>`;
      }
      
      html += '<div class="category-container">';
      let hasCategories = false;
      let count = 0;
      
      while (stmt.step()) {
        hasCategories = true;
        count++;
        const category = stmt.getAsObject();
        html += `
          <div class="category-card" onclick="selectCategory(${category.id}, '${escapeHtml(category.name)}')">
            <h3>${escapeHtml(category.name)}</h3>
          </div>
        `;
      }
      
      html += '</div>';
      
      if (hasCategories) {
        categoriesView.innerHTML = html;
        statusElement.textContent = keyword ? 
          `「${escapeHtml(keyword)}」の検索結果: ${count}件のカテゴリが見つかりました。` :
          'データベースの読み込みが完了しました。';
        statusElement.className = 'status';
      } else {
        // カテゴリが見つからない場合も
        html = `
          ${searchBar}
          <h2>検索結果</h2>
          <p>該当するカテゴリが見つかりませんでした。</p>
        `;
        categoriesView.innerHTML = html;
        statusElement.textContent = `「${escapeHtml(keyword)}」に一致するカテゴリはありません。`;
        statusElement.className = 'status';
      }
      
      // 検索ボタンのイベントリスナーを再設定
      const categorySearchButton = document.getElementById('categorySearchButton');
      if (categorySearchButton) {
        categorySearchButton.addEventListener('click', searchCategories);
      }
      
      const newCategorySearch = document.getElementById('categorySearch');
      if (newCategorySearch) {
        newCategorySearch.addEventListener('keypress', function(event) {
          if (event.key === 'Enter') {
            searchCategories();
          }
        });
      }
      
      // ビューの状態を明示的に設定
      currentView = 'categories';
      updateViewControls();
      
    } catch (error) {
      console.error('カテゴリ検索エラー:', error);
      statusElement.textContent = `検索中にエラーが発生しました: ${error.message}`;
      statusElement.className = 'status error';
      categoriesView.innerHTML = '';
    }
  }
  
  // HTML特殊文字をエスケープする関数（XSS対策）
  function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return unsafe
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  // データベースの初期化
  initDb();
});