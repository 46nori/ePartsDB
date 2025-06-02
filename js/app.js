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

  console.log('アプリケーション開始 - DOM読み込み完了');
  console.log('環境:', isLocalEnvironment ? 'ローカル' : 'リモート');

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

  // 変更追跡関数（グローバルに公開）
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
          console.log('ダイアログ関数の読み込み完了');
          resolve(true);
        } else if (attempts < maxAttempts) {
          setTimeout(checkFunctions, 100);
        } else {
          console.warn('ダイアログ関数の読み込みタイムアウト');
          resolve(false);
        }
      };
      
      checkFunctions();
    });
  }

  // 環境UI作成
  function createEnvironmentUI() {
    console.log('環境UI作成開始');
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
    console.log('環境UI作成完了');
    
    // ローカル環境のボタンイベント設定（ダイアログ読み込み後）
    if (isLocalEnvironment) {
      waitForDialogFunctions().then((loaded) => {
        if (loaded) {
          setupLocalEnvironmentEvents();
        } else {
          console.error('ダイアログ関数の読み込みに失敗しました');
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
          if (hasLocalChanges) {
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
          if (hasLocalChanges) {
            if (confirm('未保存の変更が失われます。マスターデータベースに戻しますか？')) {
              resetToMaster();
            }
          } else {
            alert('変更がないため、リセットは不要です。');
          }
        });
      }
      console.log('ローカル環境イベント設定完了');
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
          if (hasLocalChanges) {
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

  // グローバル変数として公開（local-database.jsから参照）
  window.trackLocalChange = trackChange;
  window.currentView = currentView;
  window.currentCategoryId = currentCategoryId;
  window.currentCategoryName = currentCategoryName;

  // UI更新関数をグローバルに公開
  window.refreshCurrentView = function() {
    if (currentView === 'categories') {
      showCategories();
    } else if (currentView === 'parts' && currentCategoryId) {
      showPartsByCategory(currentCategoryId, currentCategoryName);
    } else if (currentView === 'search') {
      doSearch();
    }
  };

  // タブ設定
  function setupTabs() {
    console.log('タブ設定開始');
    const categoriesTab = document.getElementById('categories-tab');
    const searchTab = document.getElementById('search-tab');
    
    if (categoriesTab) {
      categoriesTab.addEventListener('click', () => {
        switchTab('categories');
      });
    }
    
    if (searchTab) {
      searchTab.addEventListener('click', () => {
        switchTab('search');
      });
    }
    console.log('タブ設定完了');
  }

  // タブ切り替え
  function switchTab(tabName) {
    currentTab = tabName;
    
    // タブのアクティブ状態を更新
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    const activeTab = document.getElementById(`${tabName}-tab`);
    if (activeTab) {
      activeTab.classList.add('active');
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
    console.log('カテゴリ表示開始');
    currentView = 'categories';
    window.currentView = currentView;
    
    // ビューの表示/非表示
    categoriesView.style.display = 'block';
    partsView.style.display = 'none';
    if (searchView) searchView.style.display = 'none';
    
    updateViewControls();
    
    try {
      const stmt = db.prepare('SELECT id, name FROM categories ORDER BY name ASC');
      const categories = [];
      
      while (stmt.step()) {
        categories.push(stmt.getAsObject());
      }
      stmt.free();
      
      console.log('カテゴリ取得完了:', categories.length, '件');
      
      const categoryContainer = categoriesView.querySelector('.category-container');
      if (categoryContainer) {
        categoryContainer.innerHTML = categories.map(category => `
          <div class="category-card" onclick="selectCategory(${category.id}, '${escapeHtml(category.name)}')">
            <h3>${escapeHtml(category.name)}</h3>
          </div>
        `).join('');
      }
      
    } catch (error) {
      console.error('カテゴリ表示エラー:', error);
      statusElement.textContent = `エラー: ${error.message}`;
      statusElement.className = 'status error';
    }
  }

  // カテゴリ選択
  function selectCategory(categoryId, categoryName) {
    const validId = validateInput(categoryId, 'number');
    const validName = validateInput(categoryName, 'string', 100);
    
    if (validId === 0) {
      console.error('Invalid category ID');
      return;
    }
    
    currentCategoryId = validId;
    currentCategoryName = validName;
    
    // グローバル変数を更新
    window.currentCategoryId = validId;
    window.currentCategoryName = validName;
    
    showPartsByCategory(validId, validName);
  }

  // 在庫数セルのフォーマット（修正版 - +/-ボタンを削除）
  function formatStockQuantityEditable(quantity, partId) {
    const qty = quantity !== null ? quantity : 0;
    let stockClass = '';
    if (qty === 0) stockClass = 'stock-zero';
    else if (qty < 5) stockClass = 'stock-low';
    
    if (isLocalEnvironment) {
      return `
        <div class="stock-editor" data-part-id="${partId}">
          <input type="number" class="stock-input ${stockClass}" value="${qty}" min="0" max="9999" step="1">
        </div>
      `;
    } else {
      return `<span class="${stockClass}">${qty}</span>`;
    }
  }

  // 在庫数セルのフォーマット（読み取り専用版）
  function formatStockQuantity(quantity) {
    const qty = quantity !== null ? quantity : 0;
    if (qty === 0) return `<span class="stock-zero">${qty}</span>`;
    if (qty < 5) return `<span class="stock-low">${qty}</span>`;
    return qty;
  }

  // パーツ一覧表示（修正版）
  function showPartsByCategory(categoryId, categoryName) {
    currentView = 'parts';
    window.currentView = currentView;
    
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
          <table class="sortable-table">
            <thead>
              <tr>
                <th>在庫数</th>
                <th>部品名</th>
                <th>種別</th>
                <th>型番</th>
                <th>外形</th>
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
      
      // イベントリスナー設定
      if (isLocalEnvironment) {
        setupRowActionEvents('parts-view');
        setupStockEditorEvents('parts-view');
      }
      
    } catch (error) {
      console.error('パーツ表示エラー:', error);
      statusElement.textContent = `エラー: ${error.message}`;
      statusElement.className = 'status error';
    }
  }

  // 検索ビュー表示
  function showSearchView() {
    currentView = 'search';
    window.currentView = currentView;
    
    // ビューの表示/非表示
    categoriesView.style.display = 'none';
    partsView.style.display = 'none';
    if (searchView) searchView.style.display = 'block';
    
    updateViewControls();
    
    // 検索UIを作成
    if (searchView) {
      searchView.innerHTML = `
        <h2>全パーツ検索</h2>
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
    }
  }

  // 検索実行
  function doSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    
    if (!searchInput || !searchResults) return;
    
    const searchTerm = validateInput(searchInput.value, 'search', 100);
    
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
        // 検索ワードがある場合は部分一致検索（1文字以上で検索可能）
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
      
      // 検索結果のHTML生成
      let resultsHtml = '';
      
      if (searchTerm.length === 0) {
        resultsHtml += `<h3>全パーツ一覧: ${results.length}件</h3>`;
      } else {
        resultsHtml += `<h3>「${escapeHtml(searchTerm)}」の検索結果: ${results.length}件</h3>`;
      }
      
      resultsHtml += `
        <div class="table-container">
          <table class="sortable-table">
            <thead>
              <tr>
                <th>在庫数</th>
                <th>部品名</th>
                <th>種別</th>
                <th>型番</th>
                <th>外形</th>
                <th>説明</th>
                <th>カテゴリ</th>
                ${isLocalEnvironment ? '<th>操作</th>' : ''}
              </tr>
            </thead>
            <tbody>
      `;
      
      if (results.length === 0) {
        if (searchTerm.length === 0) {
          resultsHtml += `
            <tr>
              <td colspan="${isLocalEnvironment ? '8' : '7'}" style="text-align: center; padding: 20px; color: #6c757d;">
                データベースにパーツが登録されていません
              </td>
            </tr>
          `;
        } else {
          resultsHtml += `
            <tr>
              <td colspan="${isLocalEnvironment ? '8' : '7'}" style="text-align: center; padding: 20px; color: #6c757d;">
                「${escapeHtml(searchTerm)}」に一致するパーツが見つかりませんでした
              </td>
            </tr>
          `;
        }
      } else {
        results.forEach(part => {
          resultsHtml += `
            <tr>
              <td>${formatStockQuantityEditable(part.quantity, part.id)}</td>
              <td>${formatPartName(part.name, part.datasheet_url)}</td>
              <td>${escapeHtml(part.logic_family || '')}</td>
              <td>${escapeHtml(part.part_number || '')}</td>
              <td>${escapeHtml(part.package || '')}</td>
              <td>${escapeHtml(part.description || '')}</td>
              <td><a href="#" class="category-link" onclick="selectCategory(${part.category_id}, '${escapeHtml(part.category_name)}')">${escapeHtml(part.category_name || '')}</a></td>
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
      
      resultsHtml += `
            </tbody>
          </table>
        </div>
      `;
      
      searchResults.innerHTML = resultsHtml;
      
      // イベントリスナー設定
      if (isLocalEnvironment) {
        setupRowActionEvents('search-results');
        setupStockEditorEvents('search-results');
      }
      
    } catch (error) {
      console.error('検索エラー:', error);
      searchResults.innerHTML = `<p class="error">検索中にエラーが発生しました: ${error.message}</p>`;
    }
  }

  // ビューコントロール更新
  function updateViewControls() {
    window.currentView = currentView; // グローバル変数を更新
    
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

  // 在庫編集イベント設定（修正版 - +/-ボタンのイベントを削除）
  function setupStockEditorEvents(containerId) {
    if (!isLocalEnvironment) return;
    
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // 在庫入力フィールドの変更イベント
    container.querySelectorAll('.stock-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const partId = parseInt(e.target.closest('.stock-editor').dataset.partId, 10);
        const newQuantity = parseInt(e.target.value, 10) || 0;
        updateStock(partId, newQuantity);
      });
      
      input.addEventListener('blur', (e) => {
        const partId = parseInt(e.target.closest('.stock-editor').dataset.partId, 10);
        const newQuantity = parseInt(e.target.value, 10) || 0;
        updateStock(partId, newQuantity);
      });
      
      // Enterキーでの更新
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const partId = parseInt(e.target.closest('.stock-editor').dataset.partId, 10);
          const newQuantity = parseInt(e.target.value, 10) || 0;
          updateStock(partId, newQuantity);
          e.target.blur(); // フォーカスを外す
        }
      });
    });
  }

  // 在庫更新関数
  function updateStock(partId, newQuantity) {
    if (!isLocalEnvironment || !db) return;
    
    try {
      // 現在の在庫レコードを確認
      const checkStmt = db.prepare('SELECT * FROM inventory WHERE part_id = ?');
      checkStmt.bind([partId]);
      const exists = checkStmt.step();
      checkStmt.free();
      
      let stmt;
      if (exists) {
        // 更新
        stmt = db.prepare('UPDATE inventory SET quantity = ? WHERE part_id = ?');
        stmt.bind([newQuantity, partId]);
      } else {
        // 新規作成
        stmt = db.prepare('INSERT INTO inventory (part_id, quantity) VALUES (?, ?)');
        stmt.bind([partId, newQuantity]);
      }
      
      stmt.step();
      stmt.free();
      
      // 変更追跡
      trackChange('inventory', {
        part_id: partId,
        quantity: newQuantity,
        timestamp: new Date().toISOString()
      });
      
      // 在庫数セルの色を更新
      updateStockCellStyle(partId, newQuantity);
      
      console.log(`在庫更新: パーツID ${partId} → ${newQuantity}`);
      
    } catch (error) {
      console.error('在庫更新エラー:', error);
      alert(`在庫の更新に失敗しました: ${error.message}`);
    }
  }

  // 在庫セルのスタイル更新
  function updateStockCellStyle(partId, quantity) {
    const stockInputs = document.querySelectorAll(`.stock-editor[data-part-id="${partId}"] .stock-input`);
    
    stockInputs.forEach(input => {
      // 既存のクラスを削除
      input.classList.remove('stock-zero', 'stock-low');
      
      // 新しいクラスを追加
      if (quantity === 0) {
        input.classList.add('stock-zero');
      } else if (quantity < 5) {
        input.classList.add('stock-low');
      }
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

  // ユーティリティ関数
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

  // グローバル関数として公開
  window.selectCategory = selectCategory;

  // データベース初期化
  function initDb() {
    console.log('データベース初期化開始');
    statusElement.textContent = 'SQL.jsライブラリを読み込み中...';
    
    if (typeof initSqlJs === 'undefined') {
      console.error('initSqlJs未定義');
      statusElement.textContent = 'エラー: SQL.jsライブラリが読み込まれていません';
      statusElement.className = 'status error';
      return;
    }
    
    console.log('SQL.js初期化開始');
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
      console.log('データベースファイル取得開始:', DB_URL);
      
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
      console.log('マスターデータベース作成開始');
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
      
      // グローバルにdbを公開（重要！）
      window.db = db;
      console.log('window.dbを設定完了');
      
      // 基本的なテストクエリを実行
      console.log('テストクエリ実行');
      const testStmt = db.prepare('SELECT name FROM sqlite_master WHERE type="table" LIMIT 1');
      const hasTable = testStmt.step();
      testStmt.free();
      
      if (!hasTable) {
        throw new Error('データベースにテーブルが見つかりません');
      }
      
      console.log('テストクエリ成功');
      return db;
    })
    .then(() => {
      console.log('データベース初期化完了');
      console.log('環境:', isLocalEnvironment ? 'ローカル（編集可能）' : 'リモート（読み取り専用）');
      console.log('window.db:', typeof window.db);
      
      statusElement.textContent = 'データベースの読み込みが完了しました。';
      statusElement.className = 'status';
      
      // 環境UIを作成
      try {
        createEnvironmentUI();
      } catch (error) {
        console.error('環境UI作成エラー:', error);
        statusElement.textContent = 'データベースは読み込まれましたが、UIの初期化でエラーが発生しました。';
      }
      
      console.log('タブコンテナ表示');
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
  console.log('初期化開始');
  initDb();

}); // DOMContentLoaded終了