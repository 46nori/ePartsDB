/* パーツダイアログ統合モジュール */

AppUtils.log('part-dialogs.js統合版読み込み開始', 'DIALOGS', 'INFO');

function getAllCategories() {
  if (CONFIG.DEBUG.ENABLED && CONFIG.DEBUG.MODULES.DIALOGS) {
    AppUtils.log('カテゴリ一覧取得開始', 'DIALOGS', 'DEBUG');
  }
  
  try {
    if (!window.db) {
      AppUtils.log('データベースが初期化されていません', 'DIALOGS', 'WARN');
      return [];
    }

    const result = window.db.exec("SELECT id, name FROM categories ORDER BY name");
    
    if (result.length === 0) {
      AppUtils.log('カテゴリテーブルにデータがありません', 'DIALOGS', 'INFO');
      return [];
    }

    const categories = result[0].values.map(row => ({
      id: row[0],
      name: row[1]
    }));

    AppUtils.log(`カテゴリ取得完了`, 'DIALOGS', 'DEBUG', { count: categories.length });
    return categories;
    
  } catch (error) {
    AppUtils.log('カテゴリ取得エラー', 'DIALOGS', 'ERROR', error);
    return [];
  }
}

function loadCategoriesForSelect() {
  AppUtils.log('カテゴリ選択肢読み込み開始', 'DIALOGS', 'DEBUG');
  
  const categories = getAllCategories();
  
  if (categories.length === 0) {
    AppUtils.log('カテゴリが見つかりません', 'DIALOGS', 'WARN');
    return '';
  }

  const options = categories.map(category => 
    `<option value="${category.id}">${category.name}</option>`
  ).join('');
  
  AppUtils.log('カテゴリ選択肢読み込み完了', 'DIALOGS', 'DEBUG', { count: categories.length });
  return options;
}

function getPartById(id) {
  AppUtils.log('パーツ詳細取得開始', 'DIALOGS', 'DEBUG', { partId: id });
  
  try {
    if (!window.db) {
      throw new Error('データベースが初期化されていません');
    }

    const stmt = window.db.prepare(`
      SELECT p.*, c.name as category_name, 
             i.quantity, i.location, i.purchase_date, i.shop, 
             i.price_per_unit, i.currency, i.memo
      FROM parts p 
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN inventory i ON p.id = i.part_id
      WHERE p.id = ?
    `);
    
    const result = stmt.getAsObject([id]);
    stmt.free();

    if (!result || Object.keys(result).length === 0) {
      throw new Error(`パーツID ${id} が見つかりません`);
    }

    AppUtils.log('パーツ詳細取得完了', 'DIALOGS', 'DEBUG', { partId: id, name: result.name });
    return result;
    
  } catch (error) {
    AppUtils.log('パーツ取得エラー', 'DIALOGS', 'ERROR', { partId: id, error: error.message });
    throw error;
  }
}

function deletePart(partId) {
  AppUtils.log('パーツ削除処理開始', 'DIALOGS', 'INFO', { partId });
  
  try {
    if (!window.db) {
      throw new Error('データベースが初期化されていません');
    }

    window.db.exec('BEGIN TRANSACTION');

    // 在庫データを削除
    const invStmt = window.db.prepare('DELETE FROM inventory WHERE part_id = ?');
    invStmt.run([partId]);
    invStmt.free();

    // パーツデータを削除
    const partStmt = window.db.prepare('DELETE FROM parts WHERE id = ?');
    const result = partStmt.run([partId]);
    partStmt.free();

    if (result.changes === 0) {
      throw new Error('削除対象のパーツが見つかりません');
    }

    window.db.exec('COMMIT');
    AppUtils.log('パーツ削除完了', 'DIALOGS', 'INFO', { partId });
    
    return true;
    
  } catch (error) {
    window.db.exec('ROLLBACK');
    AppUtils.log('パーツ削除エラー', 'DIALOGS', 'ERROR', { partId, error: error.message });
    throw error;
  }
}

function updatePart(partId, data) {
  AppUtils.log('パーツ更新処理開始', 'DIALOGS', 'INFO', { partId, name: data.name });
  
  try {
    if (!window.db) {
      throw new Error('データベースが初期化されていません');
    }

    // パーツを更新（タイムスタンプカラム除外）
    window.db.exec('BEGIN TRANSACTION');

    const stmt = window.db.prepare(`
      UPDATE parts SET 
        name = ?, category_id = ?, manufacturer = ?, part_number = ?,
        package = ?, voltage_rating = ?, current_rating = ?, power_rating = ?,
        tolerance = ?, logic_family = ?, description = ?, datasheet_url = ?
      WHERE id = ?
    `);
    
    stmt.run([
      data.name, data.category_id, data.manufacturer, data.part_number,
      data.package, data.voltage_rating, data.current_rating, data.power_rating,
      data.tolerance, data.logic_family, data.description, data.datasheet_url,
      partId
    ]);
    stmt.free();

    window.db.exec('COMMIT');
    AppUtils.log('パーツ更新完了', 'DIALOGS', 'INFO', { partId, name: data.name });
    
    return true;
    
  } catch (error) {
    window.db.exec('ROLLBACK');
    AppUtils.log('パーツ更新エラー', 'DIALOGS', 'ERROR', { partId, error: error.message });
    throw error;
  }
}

// ===== UI関連：フォーマット機能 =====
function formatStockQuantityEditable(quantity, partId) {
  return `
    <span class="stock-quantity editable" data-part-id="${partId}" data-original="${quantity}">
      ${quantity}
    </span>
  `;
}

function formatPartName(part) {
  let name = part.name || '名前不明';
  
  if (part.manufacturer && part.part_number) {
    name += ` (${part.manufacturer} ${part.part_number})`;
  } else if (part.part_number) {
    name += ` (${part.part_number})`;
  }
  
  return name;
}

// ===== 削除ボタン生成関数 =====
function createDeleteButton(part) {
  AppUtils.log('削除ボタン生成', 'DIALOGS', 'DEBUG', { partId: part.id, name: part.name });
  
  // HTMLエスケープ処理
  const escapeHtml = (text) => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  };
  
  const safePartName = escapeHtml(part.name || '');
  
  return `
    <button class="btn-delete" 
            data-part-id="${part.id}" 
            data-part-name="${safePartName}"
            title="削除">
      🗑️
    </button>
  `;
}

// ===== ダイアログ：削除確認 =====
function showDeleteConfirmDialog(partId, partName) {
  AppUtils.log('削除確認ダイアログ表示開始', 'DIALOGS', 'INFO', { partId });
  
  try {
    // パーツ情報を取得
    const part = getPartById(partId);
    
    if (!part) {
      AppUtils.log('削除対象パーツが見つかりません', 'DIALOGS', 'ERROR', { partId });
      alert('削除対象のパーツが見つかりません');
      return;
    }
    
    // パーツ名の決定（引数優先、なければDBから取得）
    const finalPartName = partName || part.name;
    
    // 既存のモーダルを削除
    const existingModal = document.getElementById('delete-confirm-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    const modalHtml = `
      <div id="delete-confirm-modal" class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h2 class="modal-title">🗑️ パーツ削除確認</h2>
            <button class="modal-close" type="button">&times;</button>
          </div>
          
          <div class="modal-body">
            <div class="delete-warning">
              <p class="warning-text">
                以下のパーツとその在庫情報を削除します。<br>
                この操作は取り消すことができません。
              </p>
              
              <div class="part-info-delete">
                <h3 class="part-name">🔧 ${finalPartName}</h3>
                <p class="part-details">
                  カテゴリ: ${part.category_name || '未分類'}<br>
                  ${part.manufacturer ? `メーカー: ${part.manufacturer}<br>` : ''}
                  ${part.part_number ? `型番: ${part.part_number}<br>` : ''}
                  現在の在庫: ${part.quantity || 0}個
                </p>
              </div>
              
              <p class="confirmation-text">
                本当に削除してもよろしいですか？
              </p>
            </div>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn-secondary" id="cancel-delete-btn">キャンセル</button>
            <button type="button" class="btn-danger" id="confirm-delete-btn">🗑️ 削除する</button>
          </div>
        </div>
      </div>
    `;
    
    // モーダルをDOMに追加
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // イベントリスナー設定
    setupDeleteConfirmDialogEvents(partId, finalPartName);
    
    // モーダル表示
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
      modal.style.display = 'flex';
    }
    
  } catch (error) {
    AppUtils.log('削除確認ダイアログエラー', 'DIALOGS', 'ERROR', { partId, error: error.message });
    alert(`削除確認ダイアログの表示に失敗しました: ${error.message}`);
  }
}

function setupDeleteConfirmDialogEvents(partId, partName) {
  const modal = document.getElementById('delete-confirm-modal');
  const cancelBtn = document.getElementById('cancel-delete-btn');
  const confirmBtn = document.getElementById('confirm-delete-btn');
  const closeBtn = modal.querySelector('.modal-close');
  
  const closeModal = () => {
    AppUtils.log('削除確認モーダルを閉じます', 'DIALOGS', 'DEBUG');
    if (modal && modal.parentNode) {
      modal.remove();
      AppUtils.log('削除確認モーダル削除完了', 'DIALOGS', 'DEBUG');
    }
  };
  
  // キャンセル・閉じる
  if (cancelBtn) {
    cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });
  }
  
  // モーダル外クリック
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // ESCキーハンドラー
  const escKeyHandler = (e) => {
    if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
      closeModal();
      document.removeEventListener('keydown', escKeyHandler);
    }
  };
  document.addEventListener('keydown', escKeyHandler);
  
  // 削除実行
  confirmBtn.addEventListener('click', async () => {
    try {
      confirmBtn.disabled = true;
      confirmBtn.textContent = '削除中...';
      
      // パーツを削除
      deletePart(partId);
      
      AppUtils.log('パーツ削除完了（UI操作）', 'DIALOGS', 'INFO', { partId, partName });
      
      // モーダルを閉じる
      closeModal();
      
      // ビューを更新
      if (typeof window.refreshCurrentView === 'function') {
        window.refreshCurrentView();
      }
      
    } catch (error) {
      AppUtils.log('削除処理エラー（UI操作）', 'DIALOGS', 'ERROR', { partId, error: error.message });
      alert(`削除に失敗しました: ${error.message}`);
      confirmBtn.disabled = false;
      confirmBtn.textContent = '🗑️ 削除する';
    }
  });
  
  AppUtils.log('削除確認ダイアログイベント設定完了', 'DIALOGS', 'DEBUG');
}

function showInventoryDialog(partId) {
  AppUtils.log('在庫管理ダイアログ表示開始', 'DIALOGS', 'INFO', { partId });
  
  try {
    const part = getPartById(partId);
    
    // 既存のモーダルを削除
    const existingModal = document.getElementById('inventory-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    const modalHtml = `
      <div id="inventory-modal" class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h2 class="modal-title">📦 在庫管理</h2>
            <button class="modal-close" type="button">&times;</button>
          </div>
          
          <div class="modal-body">
            <div class="part-info">
              <h3>🔧 ${part.name}</h3>
              <p class="part-details">
                カテゴリ: ${part.category_name || '未分類'}<br>
                ${part.manufacturer ? `メーカー: ${part.manufacturer}<br>` : ''}
                ${part.part_number ? `型番: ${part.part_number}` : ''}
              </p>
            </div>
            
            <form id="inventory-form">
              <div class="form-group">
                <label class="form-label" for="inventory-quantity">在庫数</label>
                <input type="number" class="form-input" id="inventory-quantity" 
                       min="0" max="${CONFIG.LIMITS.MAX_QUANTITY}" value="${part.quantity || 0}">
              </div>
              
              <div class="form-group">
                <label class="form-label" for="inventory-location">保管場所</label>
                <input type="text" class="form-input" id="inventory-location" 
                       value="${part.location || ''}" maxlength="${CONFIG.LIMITS.LOCATION}">
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="inventory-purchase-date">購入日</label>
                  <input type="date" class="form-input" id="inventory-purchase-date" 
                         value="${part.purchase_date || ''}">
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="inventory-shop">購入店舗</label>
                  <input type="text" class="form-input" id="inventory-shop" 
                         value="${part.shop || ''}" maxlength="${CONFIG.LIMITS.SHOP}">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="inventory-price">単価</label>
                  <input type="number" class="form-input" id="inventory-price" 
                         min="0" max="${CONFIG.LIMITS.MAX_PRICE}" step="0.01" value="${part.price_per_unit || ''}">
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="inventory-currency">通貨</label>
                  <select class="form-select" id="inventory-currency">
                    <option value="JPY" ${part.currency === 'JPY' ? 'selected' : ''}>JPY (円)</option>
                    <option value="USD" ${part.currency === 'USD' ? 'selected' : ''}>USD (ドル)</option>
                    <option value="EUR" ${part.currency === 'EUR' ? 'selected' : ''}>EUR (ユーロ)</option>
                    <option value="CNY" ${part.currency === 'CNY' ? 'selected' : ''}>CNY (人民元)</option>
                  </select>
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label" for="inventory-memo">メモ</label>
                <textarea class="form-textarea" id="inventory-memo" maxlength="${CONFIG.LIMITS.MEMO}">${part.memo || ''}</textarea>
              </div>
            </form>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn-secondary" id="cancel-inventory-btn">キャンセル</button>
            <button type="button" class="btn-primary" id="save-inventory-btn">💾 保存</button>
          </div>
        </div>
      </div>
    `;
    
    // モーダルをDOMに追加
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // イベントリスナー設定
    setupInventoryDialogEvents(partId);
    
    // モーダル表示
    const modal = document.getElementById('inventory-modal');
    if (modal) {
      modal.style.display = 'flex';
    }
    
  } catch (error) {
    AppUtils.log('在庫管理ダイアログエラー', 'DIALOGS', 'ERROR', { partId, error: error.message });
    alert(`在庫管理ダイアログの表示に失敗しました: ${error.message}`);
  }
}

function setupInventoryDialogEvents(partId) {
  const modal = document.getElementById('inventory-modal');
  const cancelBtn = document.getElementById('cancel-inventory-btn');
  const saveBtn = document.getElementById('save-inventory-btn');
  const closeBtn = modal.querySelector('.modal-close');
  
  const closeModal = () => {
    AppUtils.log('在庫管理モーダルを閉じます', 'DIALOGS', 'DEBUG');
    if (modal && modal.parentNode) {
      modal.remove();
      AppUtils.log('在庫管理モーダル削除完了', 'DIALOGS', 'DEBUG');
    }
  };
  
  // キャンセル・閉じる
  cancelBtn.addEventListener('click', closeModal);
  closeBtn.addEventListener('click', closeModal);
  
  // モーダル外クリック
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  // ESCキーハンドラー
  const escKeyHandler = (e) => {
    if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
      AppUtils.log('ESCキー押下（在庫管理ダイアログ）', 'DIALOGS', 'DEBUG');
      closeModal();
      document.removeEventListener('keydown', escKeyHandler);
    }
  };
  document.addEventListener('keydown', escKeyHandler);
  
  // 保存処理
  saveBtn.addEventListener('click', async () => {
    try {
      saveBtn.disabled = true;
      saveBtn.textContent = '保存中...';
      
      const inventoryData = {
        quantity: parseInt(document.getElementById('inventory-quantity').value) || 0,
        location: document.getElementById('inventory-location').value.trim() || null,
        purchase_date: document.getElementById('inventory-purchase-date').value.trim() || null,
        shop: document.getElementById('inventory-shop').value.trim() || null,
        price_per_unit: document.getElementById('inventory-price').value ? parseFloat(document.getElementById('inventory-price').value) : null,
        currency: document.getElementById('inventory-currency').value.trim() || null,
        memo: document.getElementById('inventory-memo').value.trim() || null
      };
      
      // 在庫情報を更新
      const stmt = window.db.prepare(`
        UPDATE inventory SET 
          quantity = ?, location = ?, purchase_date = ?, shop = ?,
          price_per_unit = ?, currency = ?, memo = ?
        WHERE part_id = ?
      `);
      
      stmt.run([
        inventoryData.quantity, inventoryData.location, inventoryData.purchase_date,
        inventoryData.shop, inventoryData.price_per_unit, inventoryData.currency,
        inventoryData.memo, partId
      ]);
      stmt.free();
      
      AppUtils.log('在庫情報更新完了', 'DIALOGS', 'INFO', { partId });
      
      // ビューを更新
      if (typeof window.refreshCurrentView === 'function') {
        window.refreshCurrentView();
      }
      
      closeModal();
      alert('在庫情報を更新しました');
      
    } catch (error) {
      AppUtils.log('在庫情報更新エラー', 'DIALOGS', 'ERROR', { partId, error: error.message });
      alert(`在庫情報の更新に失敗しました: ${error.message}`);
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 保存';
    }
  });
}

// ===== ダイアログ：パーツ追加（完全版・CONFIG適用） =====
function showAddPartDialog() {
  AppUtils.log('パーツ追加ダイアログ表示開始', 'DIALOGS', 'INFO');
  
  const categories = getAllCategories();
  
  if (!categories || categories.length === 0) {
    alert('カテゴリが読み込まれていません。しばらく待ってから再試行してください。');
    return;
  }
  
  // 既存のモーダルを削除
  const existingModal = document.getElementById('add-part-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const modalHtml = `
    <div id="add-part-modal" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">🔧 新しいパーツを追加</h2>
          <button class="modal-close" type="button">&times;</button>
        </div>
        
        <div class="modal-body">
          <form id="add-part-form">
            <!-- 基本情報 -->
            <div class="form-group">
              <label class="form-label" for="add-part-name">パーツ名 <span class="required">*</span></label>
              <input type="text" class="form-input" id="add-part-name" required maxlength="${CONFIG.LIMITS.PART_NAME}" 
                     placeholder="例: 74HC00, 1kΩ抵抗">
            </div>
            
            <div class="form-group">
              <label class="form-label" for="add-part-category">カテゴリ <span class="required">*</span></label>
              <select class="form-select" id="add-part-category" required>
                <option value="">カテゴリを選択してください</option>
                ${categories.map(cat => 
                  `<option value="${cat.id}">${cat.name}</option>`
                ).join('')}
              </select>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="add-manufacturer">メーカー</label>
                <input type="text" class="form-input" id="add-manufacturer" maxlength="${CONFIG.LIMITS.MANUFACTURER}" 
                       placeholder="例: Texas Instruments">
              </div>
              
              <div class="form-group">
                <label class="form-label" for="add-part-number">型番</label>
                <input type="text" class="form-input" id="add-part-number" maxlength="${CONFIG.LIMITS.PART_NUMBER}" 
                       placeholder="例: SN74HC00N">
              </div>
            </div>

            <!-- ⚡ 電気特性セクション（完全CONFIG定数適用） -->
            <div class="form-section">
              <h4>⚡ 電気特性</h4>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="add-part-voltage-rating">耐圧</label>
                  <input type="text" class="form-input" id="add-part-voltage-rating" 
                         maxlength="${CONFIG.LIMITS.ELECTRICAL.VOLTAGE_RATING}"
                         placeholder="例: 50V, 3.3V, ±15V">
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="add-part-current-rating">電流制限</label>
                  <input type="text" class="form-input" id="add-part-current-rating" 
                         maxlength="${CONFIG.LIMITS.ELECTRICAL.CURRENT_RATING}"
                         placeholder="例: 1A, 20mA">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="add-part-power-rating">定格電力</label>
                  <input type="text" class="form-input" id="add-part-power-rating" 
                         maxlength="${CONFIG.LIMITS.ELECTRICAL.POWER_RATING}"
                         placeholder="例: 0.25W, 1W">
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="add-part-tolerance">誤差</label>
                  <input type="text" class="form-input" id="add-part-tolerance" 
                         maxlength="${CONFIG.LIMITS.ELECTRICAL.TOLERANCE}"
                         placeholder="例: ±1%, ±5%">
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label" for="add-part-logic-family">ロジックファミリ</label>
                <input type="text" class="form-input" id="add-part-logic-family" 
                       maxlength="${CONFIG.LIMITS.ELECTRICAL.LOGIC_FAMILY}"
                       placeholder="例: LS, HC, CMOS">
              </div>
            </div>
            
            <!-- 物理仕様 -->
            <div class="form-group">
              <label class="form-label" for="add-part-package">パッケージ</label>
              <input type="text" class="form-input" id="add-part-package" 
                     maxlength="${CONFIG.LIMITS.PACKAGE_MAX}" 
                     placeholder="例: DIP-14, SOT-23, 0603">
            </div>
            
            <div class="form-group">
              <label class="form-label" for="add-description">説明</label>
              <textarea class="form-textarea" id="add-description" maxlength="${CONFIG.LIMITS.DESCRIPTION}"
                        placeholder="部品の機能や用途を記載..."></textarea>
            </div>
            
            <div class="form-group">
              <label class="form-label" for="add-part-datasheet">データシートURL</label>
              <input type="url" class="form-input" id="add-part-datasheet" 
                     maxlength="${CONFIG.LIMITS.URL_MAX}" 
                     placeholder="https://example.com/datasheet.pdf">
            </div>

            <!-- 📦 在庫・購入情報セクション（完全保持） -->
            <div class="form-section">
              <h4>📦 在庫・購入情報</h4>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="add-quantity">初期在庫数</label>
                  <input type="number" class="form-input" id="add-quantity" min="0" max="${CONFIG.LIMITS.MAX_QUANTITY}" 
                         value="1" placeholder="1">
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="add-location">保管場所</label>
                  <input type="text" class="form-input" id="add-location" maxlength="${CONFIG.LIMITS.LOCATION}"
                         placeholder="例: 棚A-1, 引き出し2">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="add-purchase-date">購入日</label>
                  <input type="date" class="form-input" id="add-purchase-date">
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="add-shop">購入店舗</label>
                  <input type="text" class="form-input" id="add-shop" maxlength="${CONFIG.LIMITS.SHOP}"
                         placeholder="例: 秋月電子、DigiKey">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="add-price">単価</label>
                  <input type="number" class="form-input" id="add-price" min="0" max="${CONFIG.LIMITS.MAX_PRICE}" step="0.01"
                         placeholder="0.00">
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="add-currency">通貨</label>
                  <select class="form-select" id="add-currency">
                    <option value="JPY" selected>JPY (円)</option>
                    <option value="USD">USD (ドル)</option>
                    <option value="EUR">EUR (ユーロ)</option>
                    <option value="CNY">CNY (人民元)</option>
                  </select>
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label" for="add-memo">メモ</label>
                <textarea class="form-textarea" id="add-memo" maxlength="${CONFIG.LIMITS.MEMO}"
                          placeholder="特記事項、使用予定など..."></textarea>
              </div>
            </div>
          </form>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn-secondary" id="cancel-add-btn">キャンセル</button>
          <button type="submit" class="btn-primary" id="save-add-btn">🔧 追加</button>
        </div>
      </div>
    </div>
  `;
  
  // モーダルをDOMに追加
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // イベントリスナー設定
  setupAddPartDialogEvents();
  
  // モーダル表示
  const modal = document.getElementById('add-part-modal');
  if (modal) {
    modal.style.display = 'flex';
    
    // フォーカス設定
    setTimeout(() => {
      const firstInput = modal.querySelector('#add-part-name');
      if (firstInput) firstInput.focus();
    }, 100);
  }
}

function setupAddPartDialogEvents() {
  const modal = document.getElementById('add-part-modal');
  const cancelBtn = document.getElementById('cancel-add-btn');
  const saveBtn = document.getElementById('save-add-btn');
  const closeBtn = modal.querySelector('.modal-close');
  
  const closeModal = () => {
    AppUtils.log('追加モーダルを閉じます', 'DIALOGS', 'DEBUG');
    if (modal && modal.parentNode) {
      modal.remove();
      AppUtils.log('追加モーダル削除完了', 'DIALOGS', 'DEBUG');
    }
  };
  
  // キャンセルボタン
  if (cancelBtn) {
    cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });
  }
  
  // 閉じるボタン
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });
  }
  
  // モーダル外クリック
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // ESCキーハンドラー
  const escKeyHandler = (e) => {
    if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
      closeModal();
      document.removeEventListener('keydown', escKeyHandler);
    }
  };
  document.addEventListener('keydown', escKeyHandler);
  
  AppUtils.log('追加ダイアログイベント設定完了', 'DIALOGS', 'DEBUG');
  
  // 保存処理（全機能対応）
  saveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    
    try {
      saveBtn.disabled = true;
      saveBtn.textContent = '追加中...';
      
      const formData = {
        // 基本情報
        name: document.getElementById('add-part-name').value.trim(),
        category_id: parseInt(document.getElementById('add-part-category').value) || null,
        manufacturer: document.getElementById('add-manufacturer').value.trim() || null,
        part_number: document.getElementById('add-part-number').value.trim() || null,
        package: document.getElementById('add-part-package').value.trim() || null,
        description: document.getElementById('add-description').value.trim() || null,
        datasheet_url: document.getElementById('add-part-datasheet').value.trim() || null,
        
        // ⚡ 電気特性（完全保持）
        voltage_rating: document.getElementById('add-part-voltage-rating').value.trim() || null,
        current_rating: document.getElementById('add-part-current-rating').value.trim() || null,
        power_rating: document.getElementById('add-part-power-rating').value.trim() || null,
        tolerance: document.getElementById('add-part-tolerance').value.trim() || null,
        logic_family: document.getElementById('add-part-logic-family').value.trim() || null,
        
        // 📦 在庫・購入情報（完全保持）
        quantity: parseInt(document.getElementById('add-quantity').value) || 1,
        location: document.getElementById('add-location').value.trim() || null,
        purchase_date: document.getElementById('add-purchase-date').value.trim() || null,
        shop: document.getElementById('add-shop').value.trim() || null,
        price_per_unit: document.getElementById('add-price').value ? parseFloat(document.getElementById('add-price').value) : null,
        currency: document.getElementById('add-currency').value.trim() || null,
        memo: document.getElementById('add-memo').value.trim() || null
      };
      
      // バリデーション
      if (!formData.name || !formData.category_id) {
        alert('パーツ名とカテゴリは必須です');
        saveBtn.disabled = false;
        saveBtn.textContent = '🔧 追加';
        return;
      }

      // データベース保存処理（updated_at/created_atカラム除外）
      window.db.exec('BEGIN TRANSACTION');

      // パーツデータを挿入（タイムスタンプカラム除外）
      const stmt = window.db.prepare(`
        INSERT INTO parts (
          name, category_id, manufacturer, part_number, package,
          voltage_rating, current_rating, power_rating, tolerance, logic_family,
          description, datasheet_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run([
        formData.name, formData.category_id, formData.manufacturer,
        formData.part_number, formData.package, formData.voltage_rating,
        formData.current_rating, formData.power_rating, formData.tolerance,
        formData.logic_family, formData.description, formData.datasheet_url
      ]);
      
      const partId = window.db.exec("SELECT last_insert_rowid()")[0].values[0][0];
      stmt.free();

      // 在庫データを挿入
      const invStmt = window.db.prepare(`
        INSERT INTO inventory (
          part_id, quantity, location, purchase_date, shop, 
          price_per_unit, currency, memo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      invStmt.run([
        partId, formData.quantity, formData.location, formData.purchase_date,
        formData.shop, formData.price_per_unit, formData.currency, formData.memo
      ]);
      invStmt.free();

      window.db.exec('COMMIT');

      AppUtils.log('パーツ追加完了', 'DIALOGS', 'INFO', { partId, name: formData.name });

      // ビューを更新
      if (typeof window.refreshCurrentView === 'function') {
        window.refreshCurrentView();
      }

      closeModal();
      // alert(`パーツ「${formData.name}」を追加しました`); ← この行を削除
  
    } catch (error) {
      AppUtils.log('パーツ追加エラー（UI操作）', 'DIALOGS', 'ERROR', { error: error.message });
      alert(`パーツの追加に失敗しました: ${error.message}`); // エラー時のみ保持
      saveBtn.disabled = false;
      saveBtn.textContent = '🔧 追加';
    }
  });
}

function showEditPartDialog(partId) {
  AppUtils.log('パーツ編集ダイアログ表示開始', 'DIALOGS', 'INFO', { partId });
  
  try {
    const part = getPartById(partId);
    const categories = getAllCategories();
    
    if (!categories || categories.length === 0) {
      alert('カテゴリが読み込まれていません。しばらく待ってから再試行してください。');
      return;
    }
    
    // 既存のモーダルを削除
    const existingModal = document.getElementById('edit-part-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    const modalHtml = `
      <div id="edit-part-modal" class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h2 class="modal-title">🔧 パーツ編集</h2>
            <button class="modal-close" type="button">&times;</button>
          </div>
          
          <div class="modal-body">
            <form id="edit-part-form">
              <!-- 基本情報 -->
              <div class="form-group">
                <label class="form-label" for="edit-part-name">パーツ名 <span class="required">*</span></label>
                <input type="text" class="form-input" id="edit-part-name" required maxlength="${CONFIG.LIMITS.PART_NAME}" 
                       value="${part.name || ''}" placeholder="例: 74HC00, 1kΩ抵抗">
              </div>
              
              <div class="form-group">
                <label class="form-label" for="edit-part-category">カテゴリ <span class="required">*</span></label>
                <select class="form-select" id="edit-part-category" required>
                  <option value="">カテゴリを選択してください</option>
                  ${categories.map(cat => 
                    `<option value="${cat.id}" ${cat.id === part.category_id ? 'selected' : ''}>${cat.name}</option>`
                  ).join('')}
                </select>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="edit-part-manufacturer">メーカー</label>
                  <input type="text" class="form-input" id="edit-part-manufacturer" maxlength="${CONFIG.LIMITS.MANUFACTURER}" 
                         value="${part.manufacturer || ''}" placeholder="例: Texas Instruments">
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="edit-part-number">型番</label>
                  <input type="text" class="form-input" id="edit-part-number" maxlength="${CONFIG.LIMITS.PART_NUMBER}" 
                         value="${part.part_number || ''}" placeholder="例: SN74HC00N">
                </div>
              </div>

              <!-- ⚡ 電気特性セクション（完全保持） -->
              <div class="form-section">
                <h4>⚡ 電気特性</h4>
                
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label" for="edit-part-voltage-rating">耐圧</label>
                    <input type="text" class="form-input" id="edit-part-voltage-rating" 
                           maxlength="${CONFIG.LIMITS.ELECTRICAL.VOLTAGE_RATING}"
                           value="${part.voltage_rating || ''}" placeholder="例: 50V, 3.3V, ±15V">
                  </div>
                  
                  <div class="form-group">
                    <label class="form-label" for="edit-part-current-rating">電流制限</label>
                    <input type="text" class="form-input" id="edit-part-current-rating" 
                           maxlength="${CONFIG.LIMITS.ELECTRICAL.CURRENT_RATING}"
                           value="${part.current_rating || ''}" placeholder="例: 1A, 20mA">
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label" for="edit-part-power-rating">定格電力</label>
                    <input type="text" class="form-input" id="edit-part-power-rating" 
                           maxlength="${CONFIG.LIMITS.ELECTRICAL.POWER_RATING}"
                           value="${part.power_rating || ''}" placeholder="例: 0.25W, 1W">
                  </div>
                  
                  <div class="form-group">
                    <label class="form-label" for="edit-part-tolerance">誤差</label>
                    <input type="text" class="form-input" id="edit-part-tolerance" 
                           maxlength="${CONFIG.LIMITS.ELECTRICAL.TOLERANCE}"
                           value="${part.tolerance || ''}" placeholder="例: ±1%, ±5%">
                  </div>
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="edit-part-logic-family">ロジックファミリ</label>
                  <input type="text" class="form-input" id="edit-part-logic-family" 
                         maxlength="${CONFIG.LIMITS.ELECTRICAL.LOGIC_FAMILY}"
                         value="${part.logic_family || ''}" placeholder="例: LS, HC, CMOS">
                </div>
              </div>
              
              <!-- 物理仕様 -->
              <div class="form-group">
                <label class="form-label" for="edit-part-package">パッケージ</label>
                <input type="text" class="form-input" id="edit-part-package" 
                       maxlength="${CONFIG.LIMITS.PACKAGE_MAX}" 
                       value="${part.package || ''}" placeholder="例: DIP-14, SOT-23, 0603">
              </div>
              
              <div class="form-group">
                <label class="form-label" for="edit-part-description">説明</label>
                <textarea class="form-textarea" id="edit-part-description" maxlength="${CONFIG.LIMITS.DESCRIPTION}"
                          placeholder="部品の機能や用途を記載...">${part.description || ''}</textarea>
              </div>
              
              <div class="form-group">
                <label class="form-label" for="edit-part-datasheet">データシートURL</label>
                <input type="url" class="form-input" id="edit-part-datasheet" 
                       maxlength="${CONFIG.LIMITS.URL_MAX}" 
                       value="${part.datasheet_url || ''}" placeholder="https://example.com/datasheet.pdf">
              </div>
            </form>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn-secondary" id="cancel-edit-btn">キャンセル</button>
            <button type="submit" class="btn-primary" id="save-edit-btn">💾 更新</button>
          </div>
        </div>
      </div>
    `;
    
    // モーダルをDOMに追加
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // モーダル要素を取得
    const modal = document.getElementById('edit-part-modal');
    if (modal) {
      modal.style.display = 'flex';
      
      // イベントリスナー設定
      setupEditPartDialogEvents(partId, modal);
      
      // フォーカス設定
      setTimeout(() => {
        const firstInput = modal.querySelector('#edit-part-name');
        if (firstInput) {
          firstInput.focus();
        }
      }, 100);
    }
    
  } catch (error) {
    AppUtils.log('パーツ編集ダイアログエラー', 'DIALOGS', 'ERROR', { partId, error: error.message });
    alert(`パーツ編集ダイアログの表示に失敗しました: ${error.message}`);
  }
}

function setupEditPartDialogEvents(partId, modal) {
  AppUtils.log('編集ダイアログイベント設定開始', 'DIALOGS', 'DEBUG', { partId });
  
  if (!modal) {
    AppUtils.log('モーダル要素がnullです', 'DIALOGS', 'ERROR', { partId });
    return;
  }
  
  const cancelBtn = document.getElementById('cancel-edit-btn');
  const saveBtn = document.getElementById('save-edit-btn');
  const closeBtn = modal.querySelector('.modal-close');
  
  const closeModal = () => {
    AppUtils.log('編集モーダルを閉じます', 'DIALOGS', 'DEBUG');
    if (modal && modal.parentNode) {
      modal.remove();
      AppUtils.log('編集モーダル削除完了', 'DIALOGS', 'DEBUG');
    }
  };
  
  // キャンセルボタン
  if (cancelBtn) {
    cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });
  }
  
  // 閉じるボタン
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });
  }
  
  // モーダル外クリック
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // ESCキー
  const escKeyHandler = (e) => {
    if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
      closeModal();
      document.removeEventListener('keydown', escKeyHandler);
    }
  };
  document.addEventListener('keydown', escKeyHandler);
  
  // 保存ボタン（全機能対応）
  if (saveBtn) {
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      try {
        saveBtn.disabled = true;
        saveBtn.textContent = '更新中...';
        
        // フォームデータ収集
        const formData = {
          name: document.getElementById('edit-part-name').value.trim(),
          category_id: parseInt(document.getElementById('edit-part-category').value) || null,
          manufacturer: document.getElementById('edit-part-manufacturer').value.trim() || null,
          part_number: document.getElementById('edit-part-number').value.trim() || null,
          package: document.getElementById('edit-part-package').value.trim() || null,
          voltage_rating: document.getElementById('edit-part-voltage-rating').value.trim() || null,
          current_rating: document.getElementById('edit-part-current-rating').value.trim() || null,
          power_rating: document.getElementById('edit-part-power-rating').value.trim() || null,
          tolerance: document.getElementById('edit-part-tolerance').value.trim() || null,
          logic_family: document.getElementById('edit-part-logic-family').value.trim() || null,
          description: document.getElementById('edit-part-description').value.trim() || null,
          datasheet_url: document.getElementById('edit-part-datasheet').value.trim() || null
        };
        
        // バリデーション
        if (!formData.name || !formData.category_id) {
          alert('パーツ名とカテゴリは必須です');
          saveBtn.disabled = false;
          saveBtn.textContent = '💾 更新';
          return;
        }
        
        // 更新処理
        updatePart(partId, formData);
        
        AppUtils.log('パーツ編集完了（UI操作）', 'DIALOGS', 'INFO', { partId, name: formData.name });
        
        // ビューを更新
        if (typeof window.refreshCurrentView === 'function') {
          window.refreshCurrentView();
        }
        
        closeModal();
        // alert(`パーツ「${formData.name}」を更新しました`); ← この行を削除
  
      } catch (error) {
        AppUtils.log('パーツ編集エラー（UI操作）', 'DIALOGS', 'ERROR', { partId, error: error.message });
        alert(`パーツの更新に失敗しました: ${error.message}`); // エラー時のみ保持
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 更新';
      }
    });
  }
  
  AppUtils.log('編集ダイアログイベント設定完了', 'DIALOGS', 'DEBUG', { partId });
}

// ===== グローバル関数登録（使用中のものみ） =====
// メイン機能
window.showAddPartDialog = showAddPartDialog;
window.showEditPartDialog = showEditPartDialog;
window.showInventoryDialog = showInventoryDialog;
window.showDeleteConfirmDialog = showDeleteConfirmDialog;

// カテゴリ・パーツ管理
window.getAllCategories = getAllCategories;
window.loadCategoriesForSelect = loadCategoriesForSelect;
window.getPartById = getPartById;

// CRUD操作
window.deletePart = deletePart;
window.updatePart = updatePart;

// UI関連
window.formatStockQuantityEditable = formatStockQuantityEditable;
window.formatPartName = formatPartName;
window.createDeleteButton = createDeleteButton;

AppUtils.log('part-dialogs.js 完全版読み込み完了', 'DIALOGS', 'INFO');
AppUtils.log('保持された機能: 電気特性入力、在庫・購入情報、CONFIG定数適用、全CRUD操作', 'DIALOGS', 'DEBUG');