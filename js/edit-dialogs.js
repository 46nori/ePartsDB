/* 編集ダイアログ管理モジュール */

// ダイアログコンテナを作成
function createDialogContainer() {
  let container = document.getElementById('dialog-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'dialog-container';
    document.body.appendChild(container);
  }
  return container;
}

// ダイアログを閉じる
function closeDialog() {
  const container = document.getElementById('dialog-container');
  if (container) {
    container.innerHTML = '';
  }
}

// エスケープキーでダイアログを閉じる
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeDialog();
  }
});

// オーバーレイクリックでダイアログを閉じる
function setupDialogOverlayClose(overlayElement) {
  overlayElement.addEventListener('click', function(e) {
    if (e.target === overlayElement) {
      closeDialog();
    }
  });
}

// カテゴリ選択肢を読み込む関数
function loadCategoriesForSelect(selectId) {
  const selectElement = document.getElementById(selectId);
  if (!selectElement) return;
  
  try {
    if (!window.db) {
      throw new Error('データベースが初期化されていません');
    }
    
    const stmt = window.db.prepare('SELECT id, name FROM categories ORDER BY name ASC');
    
    // 既存のオプションをクリア（最初のデフォルトオプション以外）
    while (selectElement.children.length > 1) {
      selectElement.removeChild(selectElement.lastChild);
    }
    
    while (stmt.step()) {
      const category = stmt.getAsObject();
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      selectElement.appendChild(option);
    }
    stmt.free();
    
  } catch (error) {
    console.error('カテゴリ読み込みエラー:', error);
    selectElement.innerHTML = '<option value="">エラー: カテゴリを読み込めませんでした</option>';
  }
}

// 新しいパーツを保存する関数
function saveNewPart(formData) {
  try {
    if (!window.db) {
      throw new Error('データベースが初期化されていません');
    }
    
    // フォームデータの検証
    const errors = validateFormData(formData);
    if (errors.length > 0) {
      alert('入力エラー:\n' + errors.join('\n'));
      return false;
    }
    
    // パーツをデータベースに挿入
    const stmt = window.db.prepare(`
      INSERT INTO parts (category_id, name, part_number, manufacturer, logic_family, package, description, datasheet_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.bind([
      formData.category_id,
      formData.name,
      formData.part_number,
      formData.manufacturer,
      formData.logic_family,
      formData.package,
      formData.description,
      formData.datasheet_url
    ]);
    
    stmt.step();
    const partId = window.db.exec('SELECT last_insert_rowid()')[0].values[0][0];
    stmt.free();
    
    // 初期在庫数を設定
    if (formData.quantity > 0) {
      const inventoryStmt = window.db.prepare(`
        INSERT INTO inventory (part_id, quantity) VALUES (?, ?)
      `);
      inventoryStmt.bind([partId, formData.quantity]);
      inventoryStmt.step();
      inventoryStmt.free();
    }
    
    // 変更を追跡（ローカル環境の場合）
    if (window.isLocalEnvironment && typeof window.trackChange === 'function') {
      window.trackChange('added', {
        id: partId,
        ...formData,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('パーツ追加完了:', formData.name);
    return true;
    
  } catch (error) {
    console.error('パーツ保存エラー:', error);
    throw new Error(`パーツの保存に失敗しました: ${error.message}`);
  }
}

// パーツを削除する関数
function deletePart(partId) {
  try {
    if (!window.db) {
      throw new Error('データベースが初期化されていません');
    }
    
    // パーツ情報を取得（変更追跡用）
    const selectStmt = window.db.prepare('SELECT * FROM parts WHERE id = ?');
    selectStmt.bind([partId]);
    let partData = null;
    if (selectStmt.step()) {
      partData = selectStmt.getAsObject();
    }
    selectStmt.free();
    
    if (!partData) {
      throw new Error('削除対象のパーツが見つかりません');
    }
    
    // 在庫データを削除
    const inventoryStmt = window.db.prepare('DELETE FROM inventory WHERE part_id = ?');
    inventoryStmt.bind([partId]);
    inventoryStmt.step();
    inventoryStmt.free();
    
    // パーツを削除
    const deleteStmt = window.db.prepare('DELETE FROM parts WHERE id = ?');
    deleteStmt.bind([partId]);
    deleteStmt.step();
    deleteStmt.free();
    
    // 変更を追跡（ローカル環境の場合）
    if (window.isLocalEnvironment && typeof window.trackChange === 'function') {
      window.trackChange('deleted', {
        id: partId,
        name: partData.name,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('パーツ削除完了:', partData.name);
    return true;
    
  } catch (error) {
    console.error('パーツ削除エラー:', error);
    throw new Error(`パーツの削除に失敗しました: ${error.message}`);
  }
}

// パーツを編集する関数
function updatePart(partId, formData) {
  try {
    if (!window.db) {
      throw new Error('データベースが初期化されていません');
    }
    
    // フォームデータの検証
    const errors = validateFormData(formData);
    if (errors.length > 0) {
      alert('入力エラー:\n' + errors.join('\n'));
      return false;
    }
    
    // パーツ情報を更新
    const stmt = window.db.prepare(`
      UPDATE parts 
      SET category_id = ?, name = ?, part_number = ?, manufacturer = ?, 
          logic_family = ?, package = ?, description = ?, datasheet_url = ?
      WHERE id = ?
    `);
    
    stmt.bind([
      formData.category_id,
      formData.name,
      formData.part_number,
      formData.manufacturer,
      formData.logic_family,
      formData.package,
      formData.description,
      formData.datasheet_url,
      partId
    ]);
    
    stmt.step();
    stmt.free();
    
    // 変更を追跡（ローカル環境の場合）
    if (window.isLocalEnvironment && typeof window.trackChange === 'function') {
      window.trackChange('modified', {
        id: partId,
        ...formData,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('パーツ更新完了:', formData.name);
    return true;
    
  } catch (error) {
    console.error('パーツ更新エラー:', error);
    throw new Error(`パーツの更新に失敗しました: ${error.message}`);
  }
}

// パーツ編集ダイアログを表示する関数
window.showEditPartDialog = function(partId) {
  try {
    if (!window.db) {
      throw new Error('データベースが初期化されていません');
    }
    
    // パーツ情報を取得
    const stmt = window.db.prepare('SELECT * FROM parts WHERE id = ?');
    stmt.bind([partId]);
    
    let partData = null;
    if (stmt.step()) {
      partData = stmt.getAsObject();
    }
    stmt.free();
    
    if (!partData) {
      throw new Error('編集対象のパーツが見つかりません');
    }
    
    const content = `
      <div class="modal-header">
        <h2 class="modal-title">パーツの編集</h2>
        <button class="modal-close" type="button">&times;</button>
      </div>
      <div class="modal-body">
        <form id="edit-part-form">
          <div class="form-group">
            <label class="form-label" for="edit-category">カテゴリ *</label>
            <select class="form-select" id="edit-category" required>
              <option value="">カテゴリを選択してください</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label" for="edit-name">パーツ名 *</label>
            <input type="text" class="form-input" id="edit-name" required maxlength="100" value="${escapeHtml(partData.name || '')}">
          </div>
          
          <div class="form-group">
            <label class="form-label" for="edit-part-number">型番</label>
            <input type="text" class="form-input" id="edit-part-number" maxlength="50" value="${escapeHtml(partData.part_number || '')}">
          </div>
          
          <div class="form-group">
            <label class="form-label" for="edit-manufacturer">メーカー</label>
            <input type="text" class="form-input" id="edit-manufacturer" maxlength="50" value="${escapeHtml(partData.manufacturer || '')}">
          </div>
          
          <div class="form-group">
            <label class="form-label" for="edit-logic-family">種別</label>
            <input type="text" class="form-input" id="edit-logic-family" maxlength="30" value="${escapeHtml(partData.logic_family || '')}">
          </div>
          
          <div class="form-group">
            <label class="form-label" for="edit-package">外形</label>
            <input type="text" class="form-input" id="edit-package" maxlength="30" value="${escapeHtml(partData.package || '')}">
          </div>
          
          <div class="form-group">
            <label class="form-label" for="edit-description">説明</label>
            <textarea class="form-textarea" id="edit-description" maxlength="200">${escapeHtml(partData.description || '')}</textarea>
          </div>
          
          <div class="form-group">
            <label class="form-label" for="edit-datasheet-url">データシートURL</label>
            <input type="url" class="form-input" id="edit-datasheet-url" maxlength="200" value="${escapeHtml(partData.datasheet_url || '')}">
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').querySelector('.modal-close').click()">キャンセル</button>
        <button type="submit" class="btn-primary" id="update-part-btn">更新</button>
      </div>
    `;
    
    const { overlay, modal } = showModal(content);
    
    // カテゴリ選択肢を読み込み
    loadCategoriesForSelect('edit-category');
    
    // 現在のカテゴリを選択
    setTimeout(() => {
      const categorySelect = document.getElementById('edit-category');
      if (categorySelect && partData.category_id) {
        categorySelect.value = partData.category_id;
      }
    }, 100);
    
    // フォーム送信処理
    const form = modal.querySelector('#edit-part-form');
    const updateBtn = modal.querySelector('#update-part-btn');
    
    const handleSubmit = (e) => {
      e.preventDefault();
      updateBtn.disabled = true;
      updateBtn.textContent = '更新中...';
      
      const formData = {
        category_id: parseInt(document.getElementById('edit-category').value),
        name: document.getElementById('edit-name').value.trim(),
        part_number: document.getElementById('edit-part-number').value.trim() || null,
        manufacturer: document.getElementById('edit-manufacturer').value.trim() || null,
        logic_family: document.getElementById('edit-logic-family').value.trim() || null,
        package: document.getElementById('edit-package').value.trim() || null,
        description: document.getElementById('edit-description').value.trim() || null,
        datasheet_url: document.getElementById('edit-datasheet-url').value.trim() || null
      };
      
      try {
        const success = updatePart(partId, formData);
        if (success) {
          closeModal(overlay);
          if (typeof window.refreshCurrentView === 'function') {
            window.refreshCurrentView();
          }
        }
      } catch (error) {
        console.error('パーツ更新エラー:', error);
        alert(`更新に失敗しました: ${error.message}`);
      } finally {
        updateBtn.disabled = false;
        updateBtn.textContent = '更新';
      }
    };
    
    form.addEventListener('submit', handleSubmit);
    updateBtn.addEventListener('click', handleSubmit);
    
    // 最初のフィールドにフォーカス
    setTimeout(() => {
      const firstInput = modal.querySelector('#edit-name');
      if (firstInput) firstInput.focus();
    }, 100);
    
  } catch (error) {
    console.error('編集ダイアログ表示エラー:', error);
    alert(`編集機能でエラーが発生しました: ${error.message}`);
  }
};

// 在庫変更ダイアログ
window.showInventoryDialog = function(partId, partName, currentQuantity) {
  const content = `
    <div class="modal-header">
      <h2 class="modal-title">在庫数の変更</h2>
      <button class="modal-close" type="button">&times;</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">パーツ名</label>
        <div style="padding: 8px; background: #f8f9fa; border-radius: 4px; margin-bottom: 16px;">
          ${escapeHtml(partName)}
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label" for="inventory-quantity">在庫数</label>
        <input type="number" class="form-input" id="inventory-quantity" min="0" max="9999" value="${currentQuantity || 0}">
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').querySelector('.modal-close').click()">キャンセル</button>
      <button type="button" class="btn-primary" id="update-inventory-btn">更新</button>
    </div>
  `;
  
  const { overlay, modal } = showModal(content);
  
  const updateBtn = modal.querySelector('#update-inventory-btn');
  updateBtn.addEventListener('click', () => {
    const newQuantity = parseInt(document.getElementById('inventory-quantity').value) || 0;
    
    try {
      // 在庫数を更新（この関数は app.js で定義されている想定）
      if (typeof window.updateStock === 'function') {
        window.updateStock(partId, newQuantity);
      } else {
        // 直接データベースを更新
        updateInventory(partId, newQuantity);
      }
      
      closeModal(overlay);
      if (typeof window.refreshCurrentView === 'function') {
        window.refreshCurrentView();
      }
    } catch (error) {
      console.error('在庫更新エラー:', error);
      alert(`在庫更新に失敗しました: ${error.message}`);
    }
  });
  
  // 入力フィールドにフォーカス
  setTimeout(() => {
    const input = modal.querySelector('#inventory-quantity');
    if (input) {
      input.focus();
      input.select();
    }
  }, 100);
};

// 在庫数を直接更新する関数
function updateInventory(partId, quantity) {
  try {
    if (!window.db) {
      throw new Error('データベースが初期化されていません');
    }
    
    // 既存の在庫レコードをチェック
    const checkStmt = window.db.prepare('SELECT quantity FROM inventory WHERE part_id = ?');
    checkStmt.bind([partId]);
    
    let hasRecord = false;
    if (checkStmt.step()) {
      hasRecord = true;
    }
    checkStmt.free();
    
    if (hasRecord) {
      // 既存レコードを更新
      const updateStmt = window.db.prepare('UPDATE inventory SET quantity = ? WHERE part_id = ?');
      updateStmt.bind([quantity, partId]);
      updateStmt.step();
      updateStmt.free();
    } else {
      // 新しいレコードを挿入
      const insertStmt = window.db.prepare('INSERT INTO inventory (part_id, quantity) VALUES (?, ?)');
      insertStmt.bind([partId, quantity]);
      insertStmt.step();
      insertStmt.free();
    }
    
    // 変更を追跡（ローカル環境の場合）
    if (window.isLocalEnvironment && typeof window.trackChange === 'function') {
      window.trackChange('inventory', {
        part_id: partId,
        quantity: quantity,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('在庫更新完了:', partId, quantity);
    return true;
    
  } catch (error) {
    console.error('在庫更新エラー:', error);
    throw new Error(`在庫の更新に失敗しました: ${error.message}`);
  }
}

// HTMLエスケープ関数
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// フォーム検証関数（修正版）
function validateFormData(formData) {
  const errors = [];
  
  // 必須フィールドチェック
  if (!formData.name || formData.name.trim() === '') {
    errors.push('パーツ名は必須です');
  }
  
  if (!formData.category_id || parseInt(formData.category_id) <= 0) {
    errors.push('カテゴリを選択してください');
  }
  
  // 文字数制限チェック
  if (formData.name && formData.name.length > 100) {
    errors.push('パーツ名は100文字以内で入力してください');
  }
  
  if (formData.part_number && formData.part_number.length > 50) {
    errors.push('型番は50文字以内で入力してください');
  }
  
  if (formData.manufacturer && formData.manufacturer.length > 50) {
    errors.push('メーカー名は50文字以内で入力してください');
  }
  
  if (formData.description && formData.description.length > 200) {
    errors.push('説明は200文字以内で入力してください');
  }
  
  // URL形式チェック
  if (formData.datasheet_url && formData.datasheet_url.trim() !== '') {
    try {
      const url = new URL(formData.datasheet_url);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        errors.push('データシートURLはhttp://またはhttps://で始まる必要があります');
      }
    } catch (e) {
      errors.push('データシートURLの形式が正しくありません');
    }
  }
  
  return errors;
}

// エラー表示
function showFormErrors(errors) {
  const errorContainer = document.getElementById('form-errors');
  if (!errorContainer) return;
  
  if (errors.length > 0) {
    errorContainer.innerHTML = `
      <div class="form-error">
        <h4>⚠️ 入力エラー</h4>
        <ul>
          ${errors.map(error => `<li>${error}</li>`).join('')}
        </ul>
      </div>
    `;
    errorContainer.style.display = 'block';
  } else {
    errorContainer.style.display = 'none';
  }
}

// カテゴリ選択肢を取得
function getCategoryOptions() {
  const stmt = window.db.prepare('SELECT id, name FROM categories ORDER BY name ASC');
  const categories = [];
  
  while (stmt.step()) {
    categories.push(stmt.getAsObject());
  }
  stmt.free();
  
  return categories;
}

// モーダル表示関数（共通）
function showModal(content, options = {}) {
  // 既存のモーダルを削除
  const existingModal = document.querySelector('.modal-overlay');
  if (existingModal) {
    existingModal.remove();
  }
  
  // モーダルオーバーレイを作成
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  // モーダルコンテンツを作成
  const modal = document.createElement('div');
  modal.className = 'modal';
  
  if (options.className) {
    modal.classList.add(options.className);
  }
  
  modal.innerHTML = content;
  overlay.appendChild(modal);
  
  // bodyに追加
  document.body.appendChild(overlay);
  
  // ESCキーでモーダルを閉じる
  const handleEscKey = (e) => {
    if (e.key === 'Escape') {
      closeModal(overlay, handleEscKey);
    }
  };
  
  document.addEventListener('keydown', handleEscKey);
  
  // オーバーレイクリックでモーダルを閉じる
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal(overlay, handleEscKey);
    }
  });
  
  // 閉じるボタンの設定
  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closeModal(overlay, handleEscKey);
    });
  }
  
  return { overlay, modal };
}

// モーダル閉じる関数
function closeModal(overlay, escHandler) {
  if (escHandler) {
    document.removeEventListener('keydown', escHandler);
  }
  
  overlay.classList.add('closing');
  
  setTimeout(() => {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }, 300);
}

// パーツ追加ダイアログ（修正版）
window.showAddPartDialog = function() {
  const content = `
    <div class="modal-header">
      <h2 class="modal-title">新しいパーツを追加</h2>
      <button class="modal-close" type="button">&times;</button>
    </div>
    <div class="modal-body">
      <form id="add-part-form">
        <div class="form-group">
          <label class="form-label" for="add-category">カテゴリ *</label>
          <select class="form-select" id="add-category" required>
            <option value="">カテゴリを選択してください</option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label" for="add-name">パーツ名 *</label>
          <input type="text" class="form-input" id="add-name" required maxlength="100">
        </div>
        
        <div class="form-group">
          <label class="form-label" for="add-part-number">型番</label>
          <input type="text" class="form-input" id="add-part-number" maxlength="50">
        </div>
        
        <div class="form-group">
          <label class="form-label" for="add-manufacturer">メーカー</label>
          <input type="text" class="form-input" id="add-manufacturer" maxlength="50">
        </div>
        
        <div class="form-group">
          <label class="form-label" for="add-logic-family">種別</label>
          <input type="text" class="form-input" id="add-logic-family" maxlength="30">
        </div>
        
        <div class="form-group">
          <label class="form-label" for="add-package">外形</label>
          <input type="text" class="form-input" id="add-package" maxlength="30">
        </div>
        
        <div class="form-group">
          <label class="form-label" for="add-description">説明</label>
          <textarea class="form-textarea" id="add-description" maxlength="200"></textarea>
        </div>
        
        <div class="form-group">
          <label class="form-label" for="add-datasheet-url">データシートURL</label>
          <input type="url" class="form-input" id="add-datasheet-url" maxlength="200">
        </div>
        
        <div class="form-group">
          <label class="form-label" for="add-quantity">初期在庫数</label>
          <input type="number" class="form-input" id="add-quantity" min="0" max="9999" value="0">
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').querySelector('.modal-close').click()">キャンセル</button>
      <button type="submit" class="btn-primary" id="save-part-btn">保存</button>
    </div>
  `;
  
  const { overlay, modal } = showModal(content);
  
  // カテゴリ選択肢を読み込み
  loadCategoriesForSelect('add-category');
  
  // フォーム送信処理
  const form = modal.querySelector('#add-part-form');
  const saveBtn = modal.querySelector('#save-part-btn');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';
    
    // フォームデータを取得して保存処理を実行
    const formData = {
      category_id: parseInt(document.getElementById('add-category').value),
      name: document.getElementById('add-name').value.trim(),
      part_number: document.getElementById('add-part-number').value.trim() || null,
      manufacturer: document.getElementById('add-manufacturer').value.trim() || null,
      logic_family: document.getElementById('add-logic-family').value.trim() || null,
      package: document.getElementById('add-package').value.trim() || null,
      description: document.getElementById('add-description').value.trim() || null,
      datasheet_url: document.getElementById('add-datasheet-url').value.trim() || null,
      quantity: parseInt(document.getElementById('add-quantity').value) || 0
    };
    
    try {
      // パーツを保存
      const success = saveNewPart(formData);
      if (success) {
        closeModal(overlay);
        if (typeof window.refreshCurrentView === 'function') {
          window.refreshCurrentView();
        }
      }
    } catch (error) {
      console.error('パーツ保存エラー:', error);
      alert(`保存に失敗しました: ${error.message}`);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '保存';
    }
  };
  
  form.addEventListener('submit', handleSubmit);
  saveBtn.addEventListener('click', handleSubmit);
  
  // 最初のフィールドにフォーカス
  setTimeout(() => {
    const firstInput = modal.querySelector('#add-category');
    if (firstInput) firstInput.focus();
  }, 100);
};

// 削除確認ダイアログ（修正版 - パーツ名の取得を改善）
window.showDeleteConfirmDialog = function(partId, partName) {
  console.log('削除確認ダイアログ:', partId, partName);
  
  // パーツ名が渡されていない場合は、データベースから取得
  if (!partName || partName === 'undefined') {
    try {
      if (!window.db) {
        throw new Error('データベースが初期化されていません');
      }
      
      const stmt = window.db.prepare('SELECT name FROM parts WHERE id = ?');
      stmt.bind([partId]);
      
      if (stmt.step()) {
        const result = stmt.getAsObject();
        partName = result.name || '不明なパーツ';
      } else {
        partName = '不明なパーツ';
      }
      stmt.free();
      
    } catch (error) {
      console.error('パーツ名取得エラー:', error);
      partName = '不明なパーツ';
    }
  }
  
  const content = `
    <div class="modal-header">
      <h2 class="modal-title">パーツの削除</h2>
      <button class="modal-close" type="button">&times;</button>
    </div>
    <div class="modal-body">
      <div class="confirm-dialog">
        <span class="confirm-icon">⚠️</span>
        <div class="confirm-message">本当に削除しますか？</div>
        <div class="confirm-details">「${escapeHtml(partName)}」を削除します。<br>この操作は取り消せません。</div>
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').querySelector('.modal-close').click()">キャンセル</button>
      <button type="button" class="btn-danger" id="confirm-delete-btn">削除</button>
    </div>
  `;
  
  const { overlay, modal } = showModal(content, { className: 'confirm-dialog' });
  
  const confirmBtn = modal.querySelector('#confirm-delete-btn');
  confirmBtn.addEventListener('click', () => {
    try {
      // 削除処理を実行
      const success = deletePart(partId);
      if (success) {
        closeModal(overlay);
        if (typeof window.refreshCurrentView === 'function') {
          window.refreshCurrentView();
        }
      }
    } catch (error) {
      console.error('削除エラー:', error);
      alert(`削除に失敗しました: ${error.message}`);
    }
  });
};

// グローバル関数として公開
window.closeDialog = closeDialog;