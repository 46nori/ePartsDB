/* 電子パーツ在庫ビューア - Option 1: 最小限修正版 */

document.addEventListener('DOMContentLoaded', function() {

  // ===== utils.js関数への参照（統一版） =====
  const formatPartName = AppUtils.formatPartName;
  const escapeHtml = AppUtils.escapeHtml;
  const validateInput = AppUtils.validateInput;
  const formatStockQuantityEditable = (qty, partId) => AppUtils.formatStockQuantity(qty, partId, true);
  const formatStockQuantity = AppUtils.formatStockQuantityReadOnly;
  const getCellValue = AppUtils.getCellValue;
  const updateStockCellStyle = AppUtils.updateStockCellStyle;
  
  // ===== 簡素化された状態管理 =====
  const isLocalEnvironment = AppUtils.checkLocalEnvironment();
  const getState = () => window.appState;
  const setState = (updates) => Object.assign(window.appState, updates);
  const trackChange = (type, data) => {
    if (window.appState && window.appState.trackChange) {
      window.appState.trackChange(type, data);
    }
    
    // UI更新
    updateChangeIndicator();
    updateSyncButton();
  };
  
  // ===== local-database.js関数への参照（統一版） =====
  const updateStock = (partId, newQuantity) => {
    if (typeof window.updateInventory === 'function') {
      return window.updateInventory(partId, newQuantity);
    } else {
      return Promise.reject(new Error('在庫更新機能が利用できません'));
    }
  };

  // データベース関連変数
  let db;
  let originalDb; // マスターデータベース
  
  // DOM要素への参照
  const statusElement = document.getElementById('status');
  const categoriesView = document.getElementById('categories-view');
  const partsView = document.getElementById('parts-view');
  const searchView = document.getElementById('search-view');
  const viewControls = document.getElementById('view-controls');
  const tabsContainer = document.getElementById('tabs-container');
  const pageTitle = document.getElementById('page-title');
  
  const DB_URL = './eparts.db';

  console.log('🚀 アプリケーション初期化開始 (Option 1: 最小限修正)');

  // 変更インジケーター更新
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

  // 同期ボタン更新
  function updateSyncButton() {
    const syncBtn = document.getElementById('sync-btn');
    if (!syncBtn) return;
    
    const state = getState();
    if (!state) return;
    
    syncBtn.disabled = !state.hasLocalChanges;
    syncBtn.textContent = state.hasLocalChanges ? '📤 同期' : '📤 同期（変更なし）';
  }

  // ダイアログ関数の読み込み待機
  function waitForDialogFunctions() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 50; // 5秒間待機
      
      const checkFunctions = () => {
        attempts++;
        
        if (typeof window.showAddPartDialog === 'function' &&
            typeof window.showEditPartDialog === 'function' &&
            typeof window.showInventoryDialog === 'function' &&
            typeof window.showDeleteConfirmDialog === 'function') {
          console.log('✅ ダイアログ関数の読み込み完了');
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

  // 環境UI作成
  function createEnvironmentUI() {
    console.log('🖥️ UI初期化開始 (簡素化状態管理)');
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
    console.log('✅ UI初期化完了');
    
    // ローカル環境のボタンイベント設定（ダイアログ読み込み後）
    if (isLocalEnvironment) {
      waitForDialogFunctions().then((loaded) => {
        if (loaded) {
          setupLocalEnvironmentEvents();
        } else {
          console.error('❌ ダイアログ関数の読み込みに失敗しました');
          setupLocalEnvironmentEventsWithFallback();
        }
      });
    }
  }

  // ローカル環境イベント設定
  function setupLocalEnvironmentEvents() {
    console.log('ローカル環境イベント設定開始');
    setTimeout(() => {
      const addPartBtn = document.getElementById('add-part-btn');
      const syncBtn = document.getElementById('sync-btn');
      const resetBtn = document.getElementById('reset-btn');

      if (addPartBtn) {
        addPartBtn.addEventListener('click', () => {
          console.log('パーツ追加ボタンクリック');
          if (typeof window.showAddPartDialog === 'function') {
            window.showAddPartDialog();
          } else {
            console.error('showAddPartDialog関数が見つかりません');
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
      console.log('✅ ローカル環境イベント設定完了');
    }, 500);
  }

  // フォールバックイベント設定
  function setupLocalEnvironmentEventsWithFallback() {
    console.log('フォールバックイベント設定開始');
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
      console.log('フォールバックイベント設定完了');
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
      
      // グローバルdbを更新
      window.db = db;
      
      // 状態をリセット
      setState({
        hasLocalChanges: false,
        localChanges: { added: [], modified: [], deleted: [], inventory: [] }
      });
      
      updateChangeIndicator();
      updateSyncButton();
      
      // UI再描画
      const state = getState();
      if (state.currentView === 'categories') {
        showCategories();
      } else if (state.currentView === 'parts' && state.currentCategoryId) {
        showPartsByCategory(state.currentCategoryId, state.currentCategoryName);
      }
      
      statusElement.textContent = 'マスターデータベースに戻しました';
      statusElement.className = 'status';
      
    } catch (error) {
      console.error('リセットエラー:', error);
      statusElement.textContent = `リセットに失敗しました: ${error.message}`;
      statusElement.className = 'status error';
    }
  }

  // グローバル変数として公開（後方互換性のため最小限）
  window.trackLocalChange = trackChange;
  
  // 状態管理の統一アクセス（推奨方法）
  window.getAppState = getState;
  window.setAppState = setState;

  // UI更新関数をグローバルに公開
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

  // タブ設定（簡素化版）
  function setupTabs() {
    console.log('📑 タブ設定開始 (簡素化状態管理)');
    const categoriesTab = document.getElementById('categories-tab');
    const searchTab = document.getElementById('search-tab');
    
    // 初期状態でカテゴリタブをアクティブに設定
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
    console.log('✅ タブ設定完了');
  }

  // タブ切り替え（簡素化版）
  function switchTab(tabName) {
    console.log('🔄 タブ切り替え:', tabName);
    
    // 状態更新
    setState({
      currentTab: tabName
    });
    
    // すべてのタブからアクティブ状態を削除
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    // 選択されたタブにアクティブ状態を追加
    const activeTab = document.getElementById(`${tabName}-tab`);
    if (activeTab) {
      activeTab.classList.add('active');
      console.log('✅ タブ切り替え完了:', tabName);
    }
    
    // ビューを切り替え
    if (tabName === 'categories') {
      showCategories();
    } else if (tabName === 'search') {
      showSearchView();
    }
  }

  // カテゴリ表示
  function showCategories() {
    console.log('📂 カテゴリ一覧表示開始');
    
    // 状態更新
    setState({
      currentView: 'categories'
    });
    
    // ビューの表示/非表示
    categoriesView.style.display = 'block';
    partsView.style.display = 'none';
    if (searchView) searchView.style.display = 'none';
    
    updateViewControls();
    
    try {
      // display_order昇順でソート、display_orderフィールドも取得
      const stmt = db.prepare('SELECT id, name, display_order FROM categories ORDER BY display_order ASC, name ASC');
      const categories = [];
      
      while (stmt.step()) {
        categories.push(stmt.getAsObject());
      }
      stmt.free();
      
      console.log('✅ カテゴリ表示完了:', categories.length, '件');
      
      const categoryContainer = categoriesView.querySelector('.category-container');
      if (categoryContainer) {
        categoryContainer.innerHTML = categories.map(category => {
          // display_orderから色範囲を計算（100ごと）
          const orderRange = Math.floor((category.display_order || 1000) / 100);
          const clampedRange = Math.min(orderRange, 9); // 最大9に制限（0-9の10段階）
          
          return `
            <div class="category-card" data-order-range="${clampedRange}" onclick="selectCategory(${category.id}, '${escapeHtml(category.name)}')">
              <h3>${escapeHtml(category.name)}</h3>
            </div>
          `;
        }).join('');
      }
      
    } catch (error) {
      console.error('❌ カテゴリ表示エラー:', error);
      statusElement.textContent = `エラー: ${error.message}`;
      statusElement.className = 'status error';
    }
  }

  // カテゴリ選択（簡素化版）
  function selectCategory(categoryId, categoryName) {
    const validId = validateInput(categoryId, 'number');
    const validName = validateInput(categoryName, 'string', 100);
    
    if (validId === 0) {
      console.error('Invalid category ID');
      return;
    }
    
    // 状態更新
    setState({
      currentCategoryId: validId,
      currentCategoryName: validName
    });
    
    showPartsByCategory(validId, validName);
  }

  // テーブルソート機能
  function initTableSort(tableElement) {
    const headers = tableElement.querySelectorAll('th');
    
    headers.forEach((header, index) => {
      // 操作列はソート対象外
      if (header.textContent.includes('操作')) return;
      
      header.style.cursor = 'pointer';
      header.classList.add('sortable');
      
      header.addEventListener('click', () => {
        sortTable(tableElement, index, header);
      });
    });
  }

  // テーブルソート実行
  function sortTable(table, columnIndex, headerElement) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    // データが存在しない場合はソートしない
    if (rows.length <= 1 || rows[0].cells.length <= columnIndex) return;
    
    // 現在のソート状態を取得
    const currentSort = headerElement.dataset.sort || 'none';
    let newSort = 'asc';
    
    if (currentSort === 'asc') {
      newSort = 'desc';
    } else if (currentSort === 'desc') {
      newSort = 'asc';
    }
    
    // 他のヘッダーのソート状態をリセット
    table.querySelectorAll('th').forEach(th => {
      th.dataset.sort = 'none';
      th.classList.remove('sort-asc', 'sort-desc');
    });
    
    // 現在のヘッダーにソート状態を設定
    headerElement.dataset.sort = newSort;
    headerElement.classList.add(`sort-${newSort}`);
    
    // ソート実行
    rows.sort((a, b) => {
      const aCell = a.cells[columnIndex];
      const bCell = b.cells[columnIndex];
      
      if (!aCell || !bCell) return 0;
      
      let aValue = getCellValue(aCell, columnIndex);
      let bValue = getCellValue(bCell, columnIndex);
      
      // 数値比較（在庫数列）
      if (columnIndex === 0) { // 在庫数列
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
        return newSort === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // 文字列比較
      const comparison = aValue.localeCompare(bValue, 'ja', { numeric: true });
      return newSort === 'asc' ? comparison : -comparison;
    });
    
    // ソート結果をテーブルに反映
    rows.forEach(row => tbody.appendChild(row));
  }

  // パーツ一覧表示（簡素化版）
  function showPartsByCategory(categoryId, categoryName) {
    console.log('🔧 パーツ一覧表示開始:', categoryName);
    
    // 状態更新
    setState({
      currentView: 'parts'
    });
    
    // ビューの表示/非表示
    categoriesView.style.display = 'none';
    partsView.style.display = 'block';
    if (searchView) searchView.style.display = 'none';
    
    updateViewControls();
    
    try {
      const sql = `
        SELECT parts.*, inventory.quantity
        FROM parts
        LEFT JOIN inventory ON parts.id = inventory.part_id
        WHERE parts.category_id = ?
        ORDER BY parts.name ASC
      `;
      
      const stmt = db.prepare(sql);
      stmt.bind([categoryId]);
      const parts = [];
      
      while (stmt.step()) {
        parts.push(stmt.getAsObject());
      }
      stmt.free();
      
      // パーツ一覧のHTML生成
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
      console.log('✅ パーツ一覧表示完了:', parts.length, '件');
      
      // ソート機能を初期化
      const table = document.getElementById('parts-table');
      if (table && parts.length > 0) {
        initTableSort(table);
      }
      
      // イベントリスナー設定
      if (isLocalEnvironment) {
        setupRowActionEvents('parts-view');
        setupStockEditorEvents('parts-view');
      }
      
    } catch (error) {
      console.error('❌ パーツ表示エラー:', error);
      statusElement.textContent = `エラー: ${error.message}`;
      statusElement.className = 'status error';
    }
  }

  // 検索ビュー表示（簡素化版）
  function showSearchView() {
    console.log('🔍 検索ビュー表示開始');
    
    // 状態更新
    setState({
      currentView: 'search'
    });
    
    // ビューの表示/非表示
    categoriesView.style.display = 'none';
    partsView.style.display = 'none';
    if (searchView) searchView.style.display = 'block';
    
    updateViewControls();
    
    // 検索UIを作成
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
      
      // 検索イベント設定
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
      
      console.log('✅ 検索ビュー表示完了');
    }
  }

  // 検索実行
  function doSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    
    if (!searchInput || !searchResults) return;
    
    const searchTerm = validateInput(searchInput.value, 'search', 100);
    console.log('🔍 検索実行:', `"${searchTerm}"`);
    
    try {
      let sql, stmt, results = [];
      
      if (searchTerm.length === 0) {
        // 検索ワードがない場合は全件表示
        sql = `
          SELECT parts.*, categories.name AS category_name, inventory.quantity
          FROM parts
          LEFT JOIN categories ON parts.category_id = categories.id
          LEFT JOIN inventory ON parts.id = inventory.part_id
          ORDER BY parts.name ASC
        `;
        
        stmt = db.prepare(sql);
        
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        
      } else {
        // 検索ワードがある場合は部分一致検索
        sql = `
          SELECT parts.*, categories.name AS category_name, inventory.quantity
          FROM parts
          LEFT JOIN categories ON parts.category_id = categories.id
          LEFT JOIN inventory ON parts.id = inventory.part_id
          WHERE parts.name LIKE ? OR parts.part_number LIKE ? OR parts.manufacturer LIKE ?
          ORDER BY parts.name ASC
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
      console.log('✅ 検索完了:', `"${searchTerm}"`, '->', results.length, '件');
      
    } catch (error) {
      console.error('❌ 検索結果表示エラー:', error);
      searchResults.innerHTML = `<p class="error">検索中にエラーが発生しました: ${error.message}</p>`;
    }
  }

  // 検索結果表示
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
      
      // ソート機能を初期化
      const table = container.querySelector('.sortable-table');
      if (table && results.length > 0) {
        initTableSort(table);
      }
      
      // イベントリスナー設定
      if (isLocalEnvironment) {
        setupRowActionEvents(container.id);
        setupStockEditorEvents(container.id);
      }
      
    } catch (error) {
      console.error('❌ 検索結果表示エラー:', error);
      container.innerHTML = `<p class="error">検索結果の表示中にエラーが発生しました: ${error.message}</p>`;
    }
  }

  // テーブル生成
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

  // ビューコントロール更新
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

  // 在庫編集イベント設定
  function setupStockEditorEvents(containerId) {
    if (!isLocalEnvironment) return;
    
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // 在庫入力フィールドの変更イベント
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
      
      // Enterキーでの更新
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const partId = parseInt(e.target.closest('.stock-editor').dataset.partId, 10);
          const newQuantity = parseInt(e.target.value, 10) || 0;
          updateStockFromInput(partId, newQuantity, e.target);
          e.target.blur(); // フォーカスを外す
        }
      });
    });
  }

  // 在庫更新（local-database.js使用）
  function updateStockFromInput(partId, newQuantity, inputElement) {
    if (!isLocalEnvironment || !db) return;
    
    updateStock(partId, newQuantity)
      .then(() => {
        // 在庫数セルの色を更新
        updateStockCellStyle(partId, newQuantity);
        console.log(`✅ 在庫更新成功: パーツID ${partId} → ${newQuantity}`);
      })
      .catch(error => {
        console.error('❌ 在庫更新エラー:', error);
        // 入力値を元に戻す
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
        
        console.log('編集ボタンクリック:', partId);
        if (typeof window.showEditPartDialog === 'function') {
          window.showEditPartDialog(partId);
        } else {
          console.error('showEditPartDialog関数が見つかりません');
          alert('編集機能が読み込まれていません。ページを再読み込みしてください。');
        }
      });
    });
    
    // 削除ボタン
    container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const partId = parseInt(btn.dataset.partId, 10);
        
        console.log('削除ボタンクリック:', partId);
        if (typeof window.showDeleteConfirmDialog === 'function') {
          window.showDeleteConfirmDialog(partId);
        } else {
          console.error('showDeleteConfirmDialog関数が見つかりません');
          if (confirm(`パーツID ${partId} を削除しますか？`)) {
            alert('削除機能が読み込まれていません。ページを再読み込みしてください。');
          }
        }
      });
    });
  }

  // グローバル関数として公開
  window.selectCategory = selectCategory;

  // データベース初期化
  function initDb() {
    console.log('🔄 データベース初期化開始 (Option 1)');
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
      console.log('データベースバッファ取得完了:', buffer.byteLength, 'bytes');
      
      // マスターデータベース作成
      originalDb = new window.SQLInstance.Database(new Uint8Array(buffer));
      
      // 作業用データベース作成
      if (isLocalEnvironment) {
        console.log('✅ Database loaded (editable mode)');
        const workingData = originalDb.export();
        db = new window.SQLInstance.Database(workingData);
      } else {
        console.log('Database loaded (read-only mode)');
        db = originalDb;
      }
      
      // グローバルにdbを公開
      window.db = db;
      
      // テストクエリ実行
      const testStmt = db.prepare('SELECT COUNT(*) as count FROM categories');
      testStmt.step();
      const categoryCount = testStmt.get()[0];
      testStmt.free();
      
      console.log('✅ データベース接続OK - カテゴリ数:', categoryCount);
      
      return db;
    })
    .then(() => {
      console.log('🎉 データベース準備完了 (Option 1)');
      console.log('環境:', isLocalEnvironment ? 'ローカル（編集可能）' : 'リモート（読み取り専用）');
      
      statusElement.textContent = 'データベースの読み込みが完了しました。';
      statusElement.className = 'status';
      
      // 環境UIを作成
      createEnvironmentUI();
      
      console.log('タブコンテナ表示');
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

  // アプリケーション開始（簡素化版）
  console.log('🚀 初期化開始 (Option 1)');
  
  // window.appStateが利用可能になってからDB初期化
  if (window.appState) {
    console.log('✅ AppState利用可能 - 直接初期化');
    initDb();
  } else {
    console.log('⚠️ AppState待機中...');
    // app-state.jsの読み込み待機
    let attempts = 0;
    const maxAttempts = 50;
    const checkAppState = () => {
      attempts++;
      if (window.appState) {
        console.log('✅ AppState読み込み完了');
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

}); // DOMContentLoaded終了

console.log('✅ ePartsDB app.js loaded successfully (Option 1: 最小限修正)');