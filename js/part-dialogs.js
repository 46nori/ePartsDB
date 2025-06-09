console.log('🔧 part-dialogs.js 統合版読み込み開始 - タイムスタンプ:', new Date().toISOString());

// ===== カテゴリ取得・管理機能 =====
function getAllCategories() {
  console.log('📋 カテゴリ一覧を取得中...');
  
  try {
    if (!window.db) {
      console.warn('⚠️ データベースが初期化されていません');
      return [];
    }

    const result = window.db.exec("SELECT id, name FROM categories ORDER BY name");
    
    if (result.length === 0) {
      console.log('📋 カテゴリテーブルにデータがありません');
      return [];
    }

    const categories = result[0].values.map(row => ({
      id: row[0],
      name: row[1]
    }));

    console.log(`✅ データベースからカテゴリを取得しました (${categories.length}件)`, categories);
    return categories;
    
  } catch (error) {
    console.error('❌ カテゴリ取得エラー:', error);
    return [];
  }
}

function loadCategoriesForSelect() {
  console.log('🔍 カテゴリ選択肢を読み込み中...');
  
  const categories = getAllCategories();
  
  if (categories.length === 0) {
    console.warn('⚠️ カテゴリが見つかりません');
    return '';
  }

  const options = categories.map(category => 
    `<option value="${category.id}">${category.name}</option>`
  ).join('');
  
  console.log(`✅ カテゴリ選択肢を読み込みました (${categories.length}件)`);
  return options;
}

// ===== パーツ取得・管理機能 =====
function getPartById(id) {
  console.log('🔍 パーツ詳細を取得中:', id);
  
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

    console.log('✅ パーツ詳細を取得しました:', result);
    return result;
    
  } catch (error) {
    console.error('❌ パーツ取得エラー:', error);
    throw error;
  }
}

// ===== CRUD操作：削除機能 =====
function deletePart(partId) {
  console.log('🗑️ パーツ削除処理開始:', partId);
  
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
    console.log(`✅ パーツID ${partId} を削除しました`);
    
    return true;
    
  } catch (error) {
    window.db.exec('ROLLBACK');
    console.error('❌ パーツ削除エラー:', error);
    throw error;
  }
}

// ===== CRUD操作：更新機能 =====
function updatePart(partId, data) {
  console.log('🔄 パーツ更新処理開始:', partId, data);
  
  try {
    if (!window.db) {
      throw new Error('データベースが初期化されていません');
    }

    window.db.exec('BEGIN TRANSACTION');

    // パーツ基本情報を更新
    const partStmt = window.db.prepare(`
      UPDATE parts SET 
        name = ?, category_id = ?, manufacturer = ?, part_number = ?,
        package = ?, voltage_rating = ?, current_rating = ?, power_rating = ?,
        tolerance = ?, logic_family = ?, description = ?, datasheet_url = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `);
    
    partStmt.run([
      data.name, data.category_id, data.manufacturer, data.part_number,
      data.package, data.voltage_rating, data.current_rating, data.power_rating,
      data.tolerance, data.logic_family, data.description, data.datasheet_url,
      partId
    ]);
    partStmt.free();

    // 在庫情報を更新
    const invStmt = window.db.prepare(`
      UPDATE inventory SET 
        quantity = ?, location = ?, purchase_date = ?, shop = ?,
        price_per_unit = ?, currency = ?, memo = ?
      WHERE part_id = ?
    `);
    
    invStmt.run([
      data.quantity, data.location, data.purchase_date, data.shop,
      data.price_per_unit, data.currency, data.memo, partId
    ]);
    invStmt.free();

    window.db.exec('COMMIT');
    console.log(`✅ パーツID ${partId} を更新しました`);
    
    return true;
    
  } catch (error) {
    window.db.exec('ROLLBACK');
    console.error('❌ パーツ更新エラー:', error);
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
  console.log('🗑️ 削除ボタンを生成:', part.id, part.name);
  
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
  console.log('🗑️ 削除確認ダイアログを表示します:', partId);
  
  try {
    // パーツ情報を取得
    const part = getPartById(partId);
    
    if (!part) {
      console.error('❌ パーツが見つかりません:', partId);
      alert('削除対象のパーツが見つかりません');
      return;
    }
    
    // パーツ名の決定（引数優先、なければDBから取得）
    const finalPartName = partName || part.name;
    
    // 🚨 削除：デバッグメッセージを除去
    // console.log('パーツID:', partId);
    // console.log('元のpartName引数:', partName);
    // console.log('最終決定パーツ名:', finalPartName);
    
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
                <h3 class="part-name">🔧 ${escapeHtml(finalPartName)}</h3>
                <p class="part-details">
                  カテゴリ: ${part.category_name || '未分類'}<br>
                  ${part.manufacturer ? `メーカー: ${escapeHtml(part.manufacturer)}<br>` : ''}
                  ${part.part_number ? `型番: ${escapeHtml(part.part_number)}<br>` : ''}
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
    console.error('❌ 削除確認ダイアログエラー:', error);
    alert(`削除確認ダイアログの表示に失敗しました: ${error.message}`);
  }
}

function setupDeleteConfirmDialogEvents(partId, partName) {
  const modal = document.getElementById('delete-confirm-modal');
  const cancelBtn = document.getElementById('cancel-delete-btn');
  const confirmBtn = document.getElementById('confirm-delete-btn');
  const closeBtn = modal.querySelector('.modal-close');
  
  const closeModal = () => {
    console.log('❌ 削除確認モーダルを閉じます');
    if (modal && modal.parentNode) {
      modal.remove();
      console.log('✅ 削除確認モーダルを削除しました');
    }
  };
  
  // キャンセル・閉じる
  if (cancelBtn) {
    cancelBtn.addEventListener('click', (e) => {
      console.log('🚫 キャンセルボタンクリック (削除確認)');
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      console.log('❌ 閉じるボタンクリック (削除確認)');
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });
  }
  
  // モーダル外クリック
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      console.log('👆 モーダル外クリック (削除確認)');
      closeModal();
    }
  });
  
  // ESCキーハンドラー
  const escKeyHandler = (e) => {
    if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
      console.log('⌨️ ESCキー押下 (削除確認ダイアログ)');
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
      
      console.log(`✅ パーツ「${partName}」を削除しました`);
      
      // モーダルを閉じる
      closeModal();
      
      // ビューを更新
      if (typeof window.refreshCurrentView === 'function') {
        window.refreshCurrentView();
      }
      
    } catch (error) {
      console.error('❌ 削除処理エラー:', error);
      alert(`削除に失敗しました: ${error.message}`);
      confirmBtn.disabled = false;
      confirmBtn.textContent = '🗑️ 削除する';
    }
  });
  
  console.log('✅ 削除確認ダイアログイベント設定完了 (ESCキー対応済み)');
}

// ===== ダイアログ：在庫管理 =====
function showInventoryDialog(partId) {
  console.log('📦 在庫管理ダイアログを表示します:', partId);
  
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
                       min="0" max="9999" value="${part.quantity || 0}">
              </div>
              
              <div class="form-group">
                <label class="form-label" for="inventory-location">保管場所</label>
                <input type="text" class="form-input" id="inventory-location" 
                       value="${part.location || ''}" maxlength="100">
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
                         value="${part.shop || ''}" maxlength="100">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="inventory-price">単価</label>
                  <input type="number" class="form-input" id="inventory-price" 
                         min="0" step="0.01" value="${part.price_per_unit || ''}">
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
                <textarea class="form-textarea" id="inventory-memo" maxlength="500">${part.memo || ''}</textarea>
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
    console.error('❌ 在庫管理ダイアログエラー:', error);
    alert(`在庫管理ダイアログの表示に失敗しました: ${error.message}`);
  }
}

function setupInventoryDialogEvents(partId) {
  const modal = document.getElementById('inventory-modal');
  const cancelBtn = document.getElementById('cancel-inventory-btn');
  const saveBtn = document.getElementById('save-inventory-btn');
  const closeBtn = modal.querySelector('.modal-close');
  
  const closeModal = () => {
    console.log('❌ 在庫管理モーダルを閉じます');
    if (modal && modal.parentNode) {
      modal.remove();
      console.log('✅ 在庫管理モーダルを削除しました');
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
      console.log('⌨️ ESCキー押下 (在庫管理ダイアログ)');
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
        price_per_unit: parseFloat(document.getElementById('inventory-price').value) || null,
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
      
      console.log(`✅ パーツID ${partId} の在庫情報を更新しました`);
      
      // ビューを更新
      if (typeof window.refreshCurrentView === 'function') {
        window.refreshCurrentView();
      }
      
      closeModal();
      alert('在庫情報を更新しました');
      
    } catch (error) {
      console.error('❌ 在庫情報更新エラー:', error);
      alert(`在庫情報の更新に失敗しました: ${error.message}`);
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 保存';
    }
  });
}

// ===== ダイアログ：パーツ追加（完全版） =====
function showAddPartDialog() {
  console.log('🆕 統合版 showAddPartDialog 実行');
  
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
              <input type="text" class="form-input" id="add-part-name" required maxlength="100" 
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
                <label class="form-label" for="add-part-manufacturer">メーカー</label>
                <input type="text" class="form-input" id="add-part-manufacturer" maxlength="50" 
                       placeholder="例: Texas Instruments">
              </div>
              
              <div class="form-group">
                <label class="form-label" for="add-part-number">型番</label>
                <input type="text" class="form-input" id="add-part-number" maxlength="50" 
                       placeholder="例: SN74HC00N">
              </div>
            </div>

            <!-- ⚡ 電気特性セクション -->
            <div class="form-section">
              <h4>⚡ 電気特性</h4>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="add-part-voltage-rating">耐圧</label>
                  <input type="text" class="form-input" id="add-part-voltage-rating" maxlength="50"
                         placeholder="例: 50V, 3.3V, ±15V">
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="add-part-current-rating">電流制限</label>
                  <input type="text" class="form-input" id="add-part-current-rating" maxlength="50"
                         placeholder="例: 1A, 20mA">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="add-part-power-rating">定格電力</label>
                  <input type="text" class="form-input" id="add-part-power-rating" maxlength="50"
                         placeholder="例: 0.25W, 1W">
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="add-part-tolerance">誤差</label>
                  <input type="text" class="form-input" id="add-part-tolerance" maxlength="20"
                         placeholder="例: ±1%, ±5%">
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label" for="add-part-logic-family">ロジックファミリ</label>
                <input type="text" class="form-input" id="add-part-logic-family" maxlength="50"
                       placeholder="例: LS, HC, CMOS">
              </div>
            </div>
            
            <!-- 物理仕様 -->
            <div class="form-group">
              <label class="form-label" for="add-part-package">パッケージ</label>
              <input type="text" class="form-input" id="add-part-package" maxlength="20" 
                     placeholder="例: DIP-14, SOT-23, 0603">
            </div>
            
            <div class="form-group">
              <label class="form-label" for="add-part-description">説明</label>
              <textarea class="form-textarea" id="add-part-description" maxlength="200"
                        placeholder="部品の機能や用途を記載..."></textarea>
            </div>
            
            <div class="form-group">
              <label class="form-label" for="add-part-datasheet">データシートURL</label>
              <input type="url" class="form-input" id="add-part-datasheet" maxlength="255" 
                     placeholder="https://example.com/datasheet.pdf">
            </div>

            <!-- 📦 在庫・購入情報セクション -->
            <div class="form-section">
              <h4>📦 在庫・購入情報</h4>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="add-part-stock">初期在庫数</label>
                  <input type="number" class="form-input" id="add-part-stock" min="0" max="9999" 
                         value="1" placeholder="1">
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="add-part-location">保管場所</label>
                  <input type="text" class="form-input" id="add-part-location" maxlength="100"
                         placeholder="例: 棚A-1, 引き出し2">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="add-part-purchase-date">購入日</label>
                  <input type="date" class="form-input" id="add-part-purchase-date">
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="add-part-shop">購入店舗</label>
                  <input type="text" class="form-input" id="add-part-shop" maxlength="100"
                         placeholder="例: 秋月電子、DigiKey">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="add-part-price">単価</label>
                  <input type="number" class="form-input" id="add-part-price" min="0" step="0.01"
                         placeholder="0.00">
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="add-part-currency">通貨</label>
                  <select class="form-select" id="add-part-currency">
                    <option value="JPY" selected>JPY (円)</option>
                    <option value="USD">USD (ドル)</option>
                    <option value="EUR">EUR (ユーロ)</option>
                    <option value="CNY">CNY (人民元)</option>
                  </select>
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label" for="add-part-memo">メモ</label>
                <textarea class="form-textarea" id="add-part-memo" maxlength="500"
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
    console.log('❌ 追加モーダルを閉じます');
    if (modal && modal.parentNode) {
      modal.remove();
      console.log('✅ 追加モーダルを削除しました');
    }
  };
  
  // キャンセルボタン
  if (cancelBtn) {
    cancelBtn.addEventListener('click', (e) => {
      console.log('🚫 キャンセルボタンクリック (追加ダイアログ)');
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });
  }
  
  // 閉じるボタン
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      console.log('❌ 閉じるボタンクリック (追加ダイアログ)');
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });
  }
  
  // モーダル外クリック
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      console.log('👆 モーダル外クリック (追加ダイアログ)');
      closeModal();
    }
  });
  
  // ESCキーハンドラー
  const escKeyHandler = (e) => {
    if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
      console.log('⌨️ ESCキー押下 (追加ダイアログ)');
      closeModal();
      document.removeEventListener('keydown', escKeyHandler);
    }
  };
  document.addEventListener('keydown', escKeyHandler);
  
  console.log('✅ 追加ダイアログイベント設定完了 (ESCキー対応済み)');
  
  // 保存処理
  saveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    
    try {
      saveBtn.disabled = true;
      saveBtn.textContent = '追加中...';
      
      // データ収集とバリデーション
      const formData = {
        name: document.getElementById('add-part-name').value.trim(),
        category_id: parseInt(document.getElementById('add-part-category').value) || null,
        manufacturer: document.getElementById('add-part-manufacturer').value.trim() || null,
        part_number: document.getElementById('add-part-number').value.trim() || null,
        package: document.getElementById('add-part-package').value.trim() || null,
        voltage_rating: document.getElementById('add-part-voltage-rating').value.trim() || null,
        current_rating: document.getElementById('add-part-current-rating').value.trim() || null,
        power_rating: document.getElementById('add-part-power-rating').value.trim() || null,
        tolerance: document.getElementById('add-part-tolerance').value.trim() || null,
        logic_family: document.getElementById('add-part-logic-family').value.trim() || null,
        description: document.getElementById('add-part-description').value.trim() || null,
        datasheet_url: document.getElementById('add-part-datasheet').value.trim() || null,
        quantity: parseInt(document.getElementById('add-part-stock').value) || 1,
        location: document.getElementById('add-part-location').value.trim() || null,
        purchase_date: document.getElementById('add-part-purchase-date').value.trim() || null,
        shop: document.getElementById('add-part-shop').value.trim() || null,
        price_per_unit: parseFloat(document.getElementById('add-part-price').value) || null,
        currency: document.getElementById('add-part-currency').value.trim() || null,
        memo: document.getElementById('add-part-memo').value.trim() || null
      };
      
      // バリデーション
      if (!formData.name || !formData.category_id) {
        alert('パーツ名とカテゴリは必須です');
        saveBtn.disabled = false;
        saveBtn.textContent = '🔧 追加';
        return;
      }

      // データベース保存処理
      window.db.exec('BEGIN TRANSACTION');
      
      // パーツデータを挿入
      const stmt = window.db.prepare(`
        INSERT INTO parts (
          name, category_id, manufacturer, part_number, package,
          voltage_rating, current_rating, power_rating, tolerance, logic_family,
          description, datasheet_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
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

      console.log(`✅ パーツ「${formData.name}」を追加しました (ID: ${partId})`);

      // ビューを更新
      if (typeof window.refreshCurrentView === 'function') {
        window.refreshCurrentView();
      }

      closeModal();
      alert(`パーツ「${formData.name}」を追加しました`);

    } catch (error) {
      window.db.exec('ROLLBACK');
      console.error('❌ パーツ追加エラー:', error);
      alert(`パーツの追加に失敗しました: ${error.message}`);
      saveBtn.disabled = false;
      saveBtn.textContent = '🔧 追加';
    }
  });
}

// ===== ダイアログ：パーツ編集（修正版） =====
function showEditPartDialog(partId) {
  console.log('🔧 パーツ編集ダイアログを表示します:', partId);
  
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
      console.log('🗑️ 既存の編集モーダルを削除');
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
                <input type="text" class="form-input" id="edit-part-name" required maxlength="100" 
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
                  <input type="text" class="form-input" id="edit-part-manufacturer" maxlength="50" 
                         value="${part.manufacturer || ''}" placeholder="例: Texas Instruments">
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="edit-part-number">型番</label>
                  <input type="text" class="form-input" id="edit-part-number" maxlength="50" 
                         value="${part.part_number || ''}" placeholder="例: SN74HC00N">
                </div>
              </div>

              <!-- ⚡ 電気特性セクション -->
              <div class="form-section">
                <h4>⚡ 電気特性</h4>
                
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label" for="edit-part-voltage-rating">耐圧</label>
                    <input type="text" class="form-input" id="edit-part-voltage-rating" maxlength="50"
                           value="${part.voltage_rating || ''}" placeholder="例: 50V, 3.3V, ±15V">
                  </div>
                  
                  <div class="form-group">
                    <label class="form-label" for="edit-part-current-rating">電流制限</label>
                    <input type="text" class="form-input" id="edit-part-current-rating" maxlength="50"
                           value="${part.current_rating || ''}" placeholder="例: 1A, 20mA">
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label" for="edit-part-power-rating">定格電力</label>
                    <input type="text" class="form-input" id="edit-part-power-rating" maxlength="50"
                           value="${part.power_rating || ''}" placeholder="例: 0.25W, 1W">
                  </div>
                  
                  <div class="form-group">
                    <label class="form-label" for="edit-part-tolerance">誤差</label>
                    <input type="text" class="form-input" id="edit-part-tolerance" maxlength="20"
                           value="${part.tolerance || ''}" placeholder="例: ±1%, ±5%">
                  </div>
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="edit-part-logic-family">ロジックファミリ</label>
                  <input type="text" class="form-input" id="edit-part-logic-family" maxlength="50"
                         value="${part.logic_family || ''}" placeholder="例: LS, HC, CMOS">
                </div>
              </div>
              
              <!-- 物理仕様 -->
              <div class="form-group">
                <label class="form-label" for="edit-part-package">パッケージ</label>
                <input type="text" class="form-input" id="edit-part-package" maxlength="20" 
                       value="${part.package || ''}" placeholder="例: DIP-14, SOT-23, 0603">
              </div>
              
              <div class="form-group">
                <label class="form-label" for="edit-part-description">説明</label>
                <textarea class="form-textarea" id="edit-part-description" maxlength="200"
                          placeholder="部品の機能や用途を記載...">${part.description || ''}</textarea>
              </div>
              
              <div class="form-group">
                <label class="form-label" for="edit-part-datasheet">データシートURL</label>
                <input type="url" class="form-input" id="edit-part-datasheet" maxlength="255" 
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
    console.log('✅ 編集モーダルをDOMに追加');
    
    // モーダル要素を取得
    const modal = document.getElementById('edit-part-modal');
    if (modal) {
      modal.style.display = 'flex';
      console.log('✅ 編集モーダルを表示');
      
      // イベントリスナー設定
      setupEditPartDialogEventsReal(partId, modal);
      
      // フォーカス設定
      setTimeout(() => {
        const firstInput = modal.querySelector('#edit-part-name');
        if (firstInput) {
          firstInput.focus();
          console.log('✅ フォーカス設定完了');
        }
      }, 100);
    } else {
      console.error('❌ 編集モーダル要素が見つかりません');
    }
    
  } catch (error) {
    console.error('❌ パーツ編集ダイアログエラー:', error);
    alert(`パーツ編集ダイアログの表示に失敗しました: ${error.message}`);
  }
}

function setupEditPartDialogEventsReal(partId, modal) {
  console.log('🔧 編集ダイアログイベント設定開始 (Real版):', partId);
  
  if (!modal) {
    console.error('❌ モーダル要素がnullです');
    return;
  }
  
  const cancelBtn = document.getElementById('cancel-edit-btn');
  const saveBtn = document.getElementById('save-edit-btn');
  const closeBtn = modal.querySelector('.modal-close');
  
  console.log('🔍 ボタン要素確認:');
  console.log('  - cancelBtn:', !!cancelBtn);
  console.log('  - saveBtn:', !!saveBtn);
  console.log('  - closeBtn:', !!closeBtn);
  
  const closeModal = () => {
    console.log('❌ 編集モーダルを閉じます (Real版)');
    if (modal && modal.parentNode) {
      modal.remove();
      console.log('✅ 編集モーダルを削除しました (Real版)');
    }
  };
  
  // キャンセルボタン
  if (cancelBtn) {
    console.log('🎯 キャンセルボタンのイベントリスナーを設定');
    cancelBtn.addEventListener('click', (e) => {
      console.log('🚫 キャンセルボタンクリック (Real版)');
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });
  } else {
    console.error('❌ キャンセルボタンが見つかりません');
  }
  
  // 閉じるボタン
  if (closeBtn) {
    console.log('🎯 閉じるボタンのイベントリスナーを設定');
    closeBtn.addEventListener('click', (e) => {
      console.log('❌ 閉じるボタンクリック (Real版)');
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });
  } else {
    console.error('❌ 閉じるボタンが見つかりません');
  }
  
  // モーダル外クリック
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      console.log('👆 モーダル外クリック (Real版)');
      closeModal();
    }
  });
  
  // ESCキー（モーダル固有のハンドラー）
  const escKeyHandler = (e) => {
    if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
      console.log('⌨️ ESCキー押下 (Real版)');
      closeModal();
      document.removeEventListener('keydown', escKeyHandler);
    }
  };
  document.addEventListener('keydown', escKeyHandler);
  
  // 保存ボタン
  if (saveBtn) {
    console.log('🎯 保存ボタンのイベントリスナーを設定');
    saveBtn.addEventListener('click', (e) => {
      console.log('💾 更新ボタンクリック (Real版)');
      e.preventDefault();
      e.stopPropagation();
      
      try {
        saveBtn.disabled = true;
        saveBtn.textContent = '更新中...';
        
        // データ収集
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
        
        console.log('📝 フォームデータ:', formData);
        
        // バリデーション
        if (!formData.name || !formData.category_id) {
          alert('パーツ名とカテゴリは必須です');
          saveBtn.disabled = false;
          saveBtn.textContent = '💾 更新';
          return;
        }

        // パーツを更新
        window.db.exec('BEGIN TRANSACTION');
        
        const stmt = window.db.prepare(`
          UPDATE parts SET 
            name = ?, category_id = ?, manufacturer = ?, part_number = ?,
            package = ?, voltage_rating = ?, current_rating = ?, power_rating = ?,
            tolerance = ?, logic_family = ?, description = ?, datasheet_url = ?,
            updated_at = datetime('now')
          WHERE id = ?
        `);
        
        stmt.run([
          formData.name, formData.category_id, formData.manufacturer, formData.part_number,
          formData.package, formData.voltage_rating, formData.current_rating, formData.power_rating,
          formData.tolerance, formData.logic_family, formData.description, formData.datasheet_url,
          partId
        ]);
        stmt.free();

        window.db.exec('COMMIT');

        console.log(`✅ パーツID ${partId} を更新しました`);

        // ビューを更新
        if (typeof window.refreshCurrentView === 'function') {
          window.refreshCurrentView();
        }

        closeModal();
        alert(`パーツ「${formData.name}」を更新しました`);

      } catch (error) {
        window.db.exec('ROLLBACK');
        console.error('❌ パーツ更新エラー:', error);
        alert(`パーツの更新に失敗しました: ${error.message}`);
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 更新';
      }
    });
  } else {
    console.error('❌ 保存ボタンが見つかりません');
  }
  
  console.log('✅ 編集ダイアログイベント設定完了 (Real版)');
}

// ===== グローバル関数登録（使用中のもののみ） =====
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

console.log('✅ part-dialogs.js 軽量版読み込み完了 - 使用中の関数のみ');
console.log('📊 登録された関数一覧:');
console.log('  - メイン機能:', ['showAddPartDialog', 'showEditPartDialog', 'showInventoryDialog', 'showDeleteConfirmDialog']);
console.log('  - データ管理:', ['getAllCategories', 'getPartById', 'deletePart', 'updatePart']);
console.log('  - UI関連:', ['formatStockQuantityEditable', 'formatPartName', 'createDeleteButton']);
console.log('🎯 削除された未使用関数:', ['addPart', 'saveNewPart', 'addPartComplete', 'updatePartComplete', 'saveNewPartWithElectricalSpecs', 'createDialogContainer', 'closeDialog', 'setupDialogOverlayClose', 'setupEditPartDialogEventsCompat']);