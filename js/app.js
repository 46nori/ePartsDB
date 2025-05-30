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
  
  // データベースファイルのURL
  const DB_URL = './eparts.db';

  // 現在のビュー状態を管理
  let currentView = 'categories'; // 'categories' または 'parts'
  let currentTab = 'categories';  // 'categories' または 'search'
  let currentCategoryId = null;
  let currentCategoryName = '';
  
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
  
  // 部品名の表示を生成する関数（データシートリンク対応）
  function formatPartName(name, datasheetUrl) {
    const partName = escapeHtml(name || '');
    
    if (datasheetUrl && datasheetUrl.trim() !== '') {
      // データシートURLがある場合はハイパーリンクにする
      return `<a href="${escapeHtml(datasheetUrl)}" target="_blank" rel="noopener noreferrer">${partName}</a>`;
    } else {
      // データシートURLがない場合は通常のテキスト
      return partName;
    }
  }
  
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
  
  // 全パーツ検索のイベントリスナーを設定する関数
  function setupGlobalSearchEvents() {
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
      
      // イベントリスナーを設定
      setupGlobalSearchEvents();
      
      // フォーカスを検索ボックスに設定
      const globalSearchInput = document.getElementById('globalSearchInput');
      if (globalSearchInput) {
        globalSearchInput.focus();
      }
    }
  }
  
  // 全パーツ検索を実行（修正）
  function performGlobalSearch(sortField = 'categories.id, parts.name', sortDirection = 'ASC') {
    try {
      statusElement.textContent = '検索中...';
      statusElement.className = 'status loading';
      
      // 検索ワードを取得
      const globalSearchInput = document.getElementById('globalSearchInput');
      const searchTerm = globalSearchInput ? globalSearchInput.value.trim() : '';
      
      let sql;
      let params = [];
      
      if (searchTerm === '') {
        // 検索ワードが空の場合は全パーツを表示
        sql = `
          SELECT parts.*, categories.name AS category_name, categories.id AS category_id, inventory.quantity
          FROM parts
          LEFT JOIN categories ON parts.category_id = categories.id
          LEFT JOIN inventory ON parts.id = inventory.part_id
          ORDER BY ${sortField} ${sortDirection}
        `;
      } else {
        // 検索ワードがある場合はフィルタリング
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
          ORDER BY ${sortField} ${sortDirection}
        `;
        params = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];
      }
      
      const stmt = db.prepare(sql);
      if (params.length > 0) {
        stmt.bind(params);
      }
      
      let html = `<table>
        <tr>
          <th style="text-align: right; width: 80px;">在庫数</th>
          <th>部品名</th>
          <th>種別</th>
          <th>型番</th>
          <th>外形</th>
          <th>説明</th>
          <th>カテゴリ</th>
        </tr>`;

      let hasResults = false;
      const rows = [];

      while (stmt.step()) {
        hasResults = true;
        const row = stmt.getAsObject();
        rows.push(row);
        html += `<tr>
          <td style="text-align: right;">${formatStockQuantity(row.quantity)}</td>
          <td>${formatPartName(row.name, row.datasheet_url)}</td>
          <td>${escapeHtml(row.logic_family || '')}</td>
          <td>${escapeHtml(row.part_number || '')}</td>
          <td>${escapeHtml(row.package || '')}</td>
          <td>${escapeHtml(row.description || '')}</td>
          <td>
            <a href="#" onclick="selectCategory(${row.category_id}, '${escapeHtml(row.category_name || '')}'); return false;">
              ${escapeHtml(row.category_name || '未分類')}
            </a>
          </td>
        </tr>`;
      }

      html += '</table>';
      stmt.free();

      if (hasResults) {
        // 検索フォームを保持したまま結果を表示
        const globalSearchResults = document.getElementById('globalSearchResults');
        if (globalSearchResults) {
          globalSearchResults.innerHTML = html;
        } else {
          // 検索フォームと結果を含むHTMLを作成
          const searchForm = `
            <div class="search-container">
              <input type="text" id="globalSearchInput" placeholder="部品名、型番、種別、説明などで検索" value="${escapeHtml(searchTerm)}">
              <button id="globalSearchButton">検索</button>
            </div>
            <div id="globalSearchResults">${html}</div>
          `;
          searchView.innerHTML = searchForm;
          
          // イベントリスナーを再設定
          setupGlobalSearchEvents();
        }
        
        // ステータスメッセージの更新
        if (searchTerm === '') {
          statusElement.textContent = `${rows.length}件のパーツが登録されています`;
        } else {
          statusElement.textContent = `「${searchTerm}」の検索結果: ${rows.length}件のパーツが見つかりました`;
        }
        statusElement.className = 'status';
      } else {
        // 検索フォームを保持
        const globalSearchResults = document.getElementById('globalSearchResults');
        if (globalSearchResults) {
          globalSearchResults.innerHTML = '<p>該当するパーツが見つかりませんでした。</p>';
        }
        
        if (searchTerm === '') {
          statusElement.textContent = 'パーツが登録されていません';
        } else {
          statusElement.textContent = `「${searchTerm}」に一致するパーツは見つかりませんでした`;
        }
        statusElement.className = 'status';
      }
    } catch (error) {
      console.error('全パーツ検索エラー:', error);
      statusElement.textContent = 'エラーが発生しました: ' + error.message;
      statusElement.className = 'status error';
    }
  }
  
  // Safari対応のWASMロード処理
  function initDb() {
    console.log('データベース初期化開始');
    statusElement.textContent = 'SQL.jsライブラリを読み込み中...';
    
    // SQL.jsライブラリのロード
    initSqlJs({ 
      locateFile: file => {
        return `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`;
      }
    })
    .then(SQL => {
      console.log('SQL.js読み込み完了');
      statusElement.textContent = 'データベースファイルをダウンロード中...';
      
      // データベースファイルのロード
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
      console.log('データベースファイル読み込み完了');
      // データベースの作成
      const SQL = window.initSqlJs.__SQL__;
      if (!SQL) {
        // SQL.jsが正しく読み込まれていない場合の再取得
        return initSqlJs({ 
          locateFile: file => {
            return `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`;
          }
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
      console.log('データベース作成完了');
      statusElement.textContent = 'データベースの読み込みが完了しました。';
      statusElement.className = 'status';
      
      // タブコンテナを表示
      tabsContainer.style.display = 'block';
      // タブ切り替え機能を設定
      setupTabs();
      
      // 初期表示としてカテゴリ一覧を表示
      showCategories();
    })
    .catch(error => {
      console.error('データベース初期化エラー:', error);
      statusElement.textContent = `エラー: ${error.message}`;
      statusElement.className = 'status error';
    });
  }
  
  // カテゴリ一覧表示関数
  function showCategories() {
    console.log('カテゴリ一覧表示開始');
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
      
      console.log('カテゴリ一覧表示完了');
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
  
  // ソート機能のイベントリスナーを追加する関数
  function addSortEventListeners(categoryId, categoryName) {
    const sortableHeaders = document.querySelectorAll('th.sortable');
    
    sortableHeaders.forEach(header => {
      header.addEventListener('click', function() {
        const sortField = this.getAttribute('data-field');
        const sortDirection = this.getAttribute('data-direction');
        
        // ソートを実行
        showSortedParts(categoryId, categoryName, sortField, sortDirection);
      });
    });
  }
  
  // ソート機能付きでパーツ一覧を表示
  function showSortedParts(categoryId, categoryName, sortField = 'inventory.quantity', sortDirection = 'DESC') {
    try {
      statusElement.textContent = 'パーツ一覧を読み込み中...';
      statusElement.className = 'status loading';
      
      const stmt = db.prepare(`
        SELECT parts.*, inventory.quantity
        FROM parts
        LEFT JOIN inventory ON parts.id = inventory.part_id
        WHERE parts.category_id = ?
        ORDER BY ${sortField} ${sortDirection}
      `);
      
      stmt.bind([categoryId]);
      
      let html = `<table>
        <tr>
          <th class="sortable" data-field="inventory.quantity" data-direction="${sortField === 'inventory.quantity' ? (sortDirection === 'ASC' ? 'DESC' : 'ASC') : 'ASC'}" style="text-align: right; width: 80px;">
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
          <th class="sortable" data-field="parts.package" data-direction="${sortField === 'parts.package' ? (sortDirection === 'ASC' ? 'DESC' : 'ASC') : 'ASC'}">
            外形 ${sortField === 'parts.package' ? (sortDirection === 'ASC' ? '▲' : '▼') : ''}
          </th>
          <th>説明</th>
        </tr>`;

    let hasResults = false;
    const rows = [];

    while (stmt.step()) {
      hasResults = true;
      const row = stmt.getAsObject();
      rows.push(row);
      html += `<tr>
        <td style="text-align: right;">${formatStockQuantity(row.quantity)}</td>
        <td>${formatPartName(row.name, row.datasheet_url)}</td>
        <td>${escapeHtml(row.logic_family || '')}</td>
        <td>${escapeHtml(row.part_number || '')}</td>
        <td>${escapeHtml(row.package || '')}</td>
        <td>${escapeHtml(row.description || '')}</td>
      </tr>`;
    }

    html += '</table>';
    stmt.free();

    if (hasResults) {
      partsView.innerHTML = html;
      statusElement.textContent = `「${categoryName}」に${rows.length}個のパーツがあります`;
      statusElement.className = 'status';
      
      // ソート機能のイベントリスナーを追加
      addSortEventListeners(categoryId, categoryName);
    } else {
      partsView.innerHTML = '<p>このカテゴリにはパーツがありません。</p>';
      statusElement.textContent = `「${categoryName}」にはパーツがありません`;
      statusElement.className = 'status';
    }
    
    // ビューの切り替え
    currentView = 'parts';
    updateViewControls();
    
    // タブがカテゴリでない場合は切り替える
    if (currentTab !== 'categories') {
      switchTab('categories');
    } else {
      categoriesView.style.display = 'none';
      partsView.style.display = 'block';
      searchView.style.display = 'none';
    }
    
  } catch (error) {
    console.error('パーツ一覧表示エラー:', error);
    statusElement.textContent = 'エラーが発生しました: ' + error.message;
    statusElement.className = 'status error';
  }
}
  
  // カテゴリ内にパーツ検索用の検索バーを追加する関数
  function addCategorySearchBar(categoryId, categoryName) {
    const searchBarHtml = `
      <div class="search-container">
        <input type="text" id="categorySearch" placeholder="このカテゴリ内でパーツを検索">
        <button id="categorySearchButton">検索</button>
      </div>
    `;
    
    // パーツビューの最初に検索バーを追加
    partsView.insertAdjacentHTML('afterbegin', searchBarHtml);
    
    // 検索ボタンのイベントリスナーを設定
    const categorySearchButton = document.getElementById('categorySearchButton');
    if (categorySearchButton) {
      categorySearchButton.addEventListener('click', function() {
        searchPartsInCategory(categoryId, categoryName);
      });
    }
    
    const categorySearch = document.getElementById('categorySearch');
    if (categorySearch) {
      categorySearch.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
          searchPartsInCategory(categoryId, categoryName);
        }
      });
    }
  }
  
  // カテゴリ内のパーツを検索する
  function searchPartsInCategory(categoryId, categoryName) {
    const searchTerm = document.getElementById('categorySearch').value.trim();
    
    if (!searchTerm) {
      showSortedParts(categoryId, categoryName);
      return;
    }
    
    try {
      statusElement.textContent = '検索中...';
      statusElement.className = 'status loading';
      
      const stmt = db.prepare(`
        SELECT parts.*, inventory.quantity
        FROM parts
        LEFT JOIN inventory ON parts.id = inventory.part_id
        WHERE parts.category_id = ? AND (
          parts.name LIKE '%' || ? || '%' OR
          parts.part_number LIKE '%' || ? || '%' OR
          parts.description LIKE '%' || ? || '%' OR
          parts.package LIKE '%' || ? || '%'
        )
        ORDER BY parts.name
      `);
      
      stmt.bind([categoryId, searchTerm, searchTerm, searchTerm, searchTerm]);
      
      let html = `<table>
        <tr>
          <th>部品名</th>
          <th>種別</th>
          <th>型番</th>
          <th>外形</th>
          <th>説明</th>
          <th style="text-align: right; width: 80px;">在庫数</th>
        </tr>`;
      
      let hasResults = false;
      const rows = [];
      
      while (stmt.step()) {
        hasResults = true;
        const row = stmt.getAsObject();
        rows.push(row);
        html += `<tr>
          <td>${formatPartName(row.name, row.datasheet_url)}</td>
          <td>${escapeHtml(row.logic_family || '')}</td>
          <td>${escapeHtml(row.part_number || '')}</td>
          <td>${escapeHtml(row.package || '')}</td>
          <td>${escapeHtml(row.description || '')}</td>
          <td style="text-align: right;">${formatStockQuantity(row.quantity)}</td>
        </tr>`;
      }
      
      html += '</table>';
      stmt.free();
      
      if (hasResults) {
        partsView.innerHTML = html;
        statusElement.textContent = `「${categoryName}」で「${searchTerm}」を含むパーツが${rows.length}件見つかりました`;
        statusElement.className = 'status';
      } else {
        partsView.innerHTML = '<p>該当するパーツが見つかりませんでした。</p>';
        statusElement.textContent = `「${categoryName}」で「${searchTerm}」を含むパーツは見つかりませんでした`;
        statusElement.className = 'status';
      }
    } catch (error) {
      console.error('カテゴリ内検索エラー:', error);
      statusElement.textContent = 'エラーが発生しました: ' + error.message;
      statusElement.className = 'status error';
    }
  }
  
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
    
    // パーツ表示後に検索バーを追加
    setTimeout(() => {
      if (!document.getElementById('categorySearch')) {
        addCategorySearchBar(categoryId, categoryName);
      }
    }, 100);
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
      let params = [];
      
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
          WHERE name LIKE '%' || ? || '%'
          ORDER BY id ASC
        `;
        params = [keyword];
      }
      
      const stmt = db.prepare(sql);
      if (params.length > 0) {
        stmt.bind(params);
      }
      
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
      stmt.free();
      
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
  
  // データベースの初期化
  console.log('アプリケーション開始');
  initDb();
});