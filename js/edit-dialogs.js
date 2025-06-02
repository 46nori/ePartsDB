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

// フォーム検証
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
  if (formData.name && formData.name.length > 255) {
    errors.push('パーツ名は255文字以内で入力してください');
  }
  
  if (formData.part_number && formData.part_number.length > 100) {
    errors.push('型番は100文字以内で入力してください');
  }
  
  if (formData.manufacturer && formData.manufacturer.length > 100) {
    errors.push('メーカー名は100文字以内で入力してください');
  }
  
  if (formData.description && formData.description.length > 1000) {
    errors.push('説明は1000文字以内で入力してください');
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
  
  // 数値チェック
  if (formData.initial_quantity !== undefined) {
    const qty = parseInt(formData.initial_quantity);
    if (isNaN(qty) || qty < 0) {
      errors.push('在庫数は0以上の整数で入力してください');
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

// パーツ追加ダイアログ
window.showAddPartDialog = function() {
  const container = createDialogContainer();
  const categories = getCategoryOptions();
  
  const dialogHtml = `
    <div class="dialog-overlay">
      <div class="dialog add-part-dialog">
        <div class="dialog-header">
          <h3>新しいパーツを追加</h3>
          <button type="button" class="dialog-close" onclick="closeDialog()">×</button>
        </div>
        
        <div id="form-errors" style="display: none;"></div>
        
        <form id="add-part-form">
          <div class="form-group">
            <label for="part-name">パーツ名 *</label>
            <input type="text" id="part-name" name="name" required maxlength="255">
          </div>
          
          <div class="form-group">
            <label for="part-category">カテゴリ *</label>
            <select id="part-category" name="category_id" required>
              <option value="">カテゴリを選択してください</option>
              ${categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('')}
            </select>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="part-number">型番</label>
              <input type="text" id="part-number" name="part_number" maxlength="100">
            </div>
            
            <div class="form-group">
              <label for="part-manufacturer">メーカー</label>
              <input type="text" id="part-manufacturer" name="manufacturer" maxlength="100">
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="part-logic-family">種別</label>
              <input type="text" id="part-logic-family" name="logic_family" maxlength="100">
            </div>
            
            <div class="form-group">
              <label for="part-package">外形</label>
              <input type="text" id="part-package" name="package" maxlength="100">
            </div>
          </div>
          
          <div class="form-group">
            <label for="part-description">説明</label>
            <textarea id="part-description" name="description" rows="3" maxlength="1000"></textarea>
          </div>
          
          <div class="form-group">
            <label for="part-datasheet">データシートURL</label>
            <input type="url" id="part-datasheet" name="datasheet_url" maxlength="500">
          </div>
          
          <div class="form-group">
            <label for="initial-quantity">初期在庫数</label>
            <input type="number" id="initial-quantity" name="initial_quantity" value="0" min="0" max="999999">
          </div>
          
          <div class="dialog-actions">
            <button type="button" class="btn-cancel" onclick="closeDialog()">キャンセル</button>
            <button type="submit" class="btn-primary">追加</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  container.innerHTML = dialogHtml;
  
  // オーバーレイクリック設定
  const overlay = container.querySelector('.dialog-overlay');
  setupDialogOverlayClose(overlay);
  
  // フォーム送信イベント
  const form = document.getElementById('add-part-form');
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(form);
    const partData = {
      name: formData.get('name'),
      category_id: parseInt(formData.get('category_id')),
      part_number: formData.get('part_number'),
      manufacturer: formData.get('manufacturer'),
      logic_family: formData.get('logic_family'),
      package: formData.get('package'),
      description: formData.get('description'),
      datasheet_url: formData.get('datasheet_url'),
      initial_quantity: parseInt(formData.get('initial_quantity') || '0')
    };
    
    // バリデーション
    const errors = validateFormData(partData);
    if (errors.length > 0) {
      showFormErrors(errors);
      return;
    }
    
    // パーツ追加実行
    window.addPart(partData, partData.initial_quantity)
      .then(() => {
        closeDialog();
      })
      .catch(error => {
        showFormErrors([error.message]);
      });
  });
  
  // 最初の入力フィールドにフォーカス
  setTimeout(() => {
    const nameInput = document.getElementById('part-name');
    if (nameInput) nameInput.focus();
  }, 100);
};

// パーツ編集ダイアログ
window.showEditPartDialog = function(partId) {
  window.getPartById(partId)
    .then(partData => {
      const container = createDialogContainer();
      const categories = getCategoryOptions();
      
      const dialogHtml = `
        <div class="dialog-overlay">
          <div class="dialog edit-part-dialog">
            <div class="dialog-header">
              <h3>パーツを編集</h3>
              <button type="button" class="dialog-close" onclick="closeDialog()">×</button>
            </div>
            
            <div id="form-errors" style="display: none;"></div>
            
            <form id="edit-part-form">
              <input type="hidden" name="part_id" value="${partId}">
              
              <div class="form-group">
                <label for="edit-part-name">パーツ名 *</label>
                <input type="text" id="edit-part-name" name="name" required maxlength="255" value="${partData.name || ''}">
              </div>
              
              <div class="form-group">
                <label for="edit-part-category">カテゴリ *</label>
                <select id="edit-part-category" name="category_id" required>
                  <option value="">カテゴリを選択してください</option>
                  ${categories.map(cat => `<option value="${cat.id}" ${cat.id === partData.category_id ? 'selected' : ''}>${cat.name}</option>`).join('')}
                </select>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="edit-part-number">型番</label>
                  <input type="text" id="edit-part-number" name="part_number" maxlength="100" value="${partData.part_number || ''}">
                </div>
                
                <div class="form-group">
                  <label for="edit-part-manufacturer">メーカー</label>
                  <input type="text" id="edit-part-manufacturer" name="manufacturer" maxlength="100" value="${partData.manufacturer || ''}">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="edit-part-logic-family">種別</label>
                  <input type="text" id="edit-part-logic-family" name="logic_family" maxlength="100" value="${partData.logic_family || ''}">
                </div>
                
                <div class="form-group">
                  <label for="edit-part-package">外形</label>
                  <input type="text" id="edit-part-package" name="package" maxlength="100" value="${partData.package || ''}">
                </div>
              </div>
              
              <div class="form-group">
                <label for="edit-part-description">説明</label>
                <textarea id="edit-part-description" name="description" rows="3" maxlength="1000">${partData.description || ''}</textarea>
              </div>
              
              <div class="form-group">
                <label for="edit-part-datasheet">データシートURL</label>
                <input type="url" id="edit-part-datasheet" name="datasheet_url" maxlength="500" value="${partData.datasheet_url || ''}">
              </div>
              
              <div class="dialog-actions">
                <button type="button" class="btn-cancel" onclick="closeDialog()">キャンセル</button>
                <button type="submit" class="btn-primary">更新</button>
              </div>
            </form>
          </div>
        </div>
      `;
      
      container.innerHTML = dialogHtml;
      
      // オーバーレイクリック設定
      const overlay = container.querySelector('.dialog-overlay');
      setupDialogOverlayClose(overlay);
      
      // フォーム送信イベント
      const form = document.getElementById('edit-part-form');
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        const updatedData = {
          name: formData.get('name'),
          category_id: parseInt(formData.get('category_id')),
          part_number: formData.get('part_number'),
          manufacturer: formData.get('manufacturer'),
          logic_family: formData.get('logic_family'),
          package: formData.get('package'),
          description: formData.get('description'),
          datasheet_url: formData.get('datasheet_url')
        };
        
        // バリデーション
        const errors = validateFormData(updatedData);
        if (errors.length > 0) {
          showFormErrors(errors);
          return;
        }
        
        // パーツ更新実行
        window.updatePart(partId, updatedData)
          .then(() => {
            closeDialog();
          })
          .catch(error => {
            showFormErrors([error.message]);
          });
      });
      
      // 最初の入力フィールドにフォーカス
      setTimeout(() => {
        const nameInput = document.getElementById('edit-part-name');
        if (nameInput) nameInput.focus();
      }, 100);
    })
    .catch(error => {
      alert(`パーツ情報の取得に失敗しました: ${error.message}`);
    });
};

// 在庫編集ダイアログ
window.showInventoryDialog = function(partId) {
  window.getPartById(partId)
    .then(partData => {
      const container = createDialogContainer();
      
      const dialogHtml = `
        <div class="dialog-overlay">
          <div class="dialog inventory-dialog">
            <div class="dialog-header">
              <h3>在庫数を変更</h3>
              <button type="button" class="dialog-close" onclick="closeDialog()">×</button>
            </div>
            
            <div class="part-info">
              <p><strong>パーツ名:</strong> ${partData.name}</p>
              <p><strong>型番:</strong> ${partData.part_number || '未設定'}</p>
              <p><strong>現在の在庫:</strong> <span class="current-stock">${partData.quantity || 0}</span>個</p>
            </div>
            
            <div id="form-errors" style="display: none;"></div>
            
            <form id="inventory-form">
              <div class="form-group">
                <label for="new-quantity">新しい在庫数</label>
                <input type="number" id="new-quantity" name="quantity" min="0" max="999999" value="${partData.quantity || 0}" required>
              </div>
              
              <div class="quantity-controls">
                <button type="button" class="qty-btn" onclick="adjustQuantity(-10)">-10</button>
                <button type="button" class="qty-btn" onclick="adjustQuantity(-1)">-1</button>
                <button type="button" class="qty-btn" onclick="adjustQuantity(1)">+1</button>
                <button type="button" class="qty-btn" onclick="adjustQuantity(10)">+10</button>
              </div>
              
              <div class="dialog-actions">
                <button type="button" class="btn-cancel" onclick="closeDialog()">キャンセル</button>
                <button type="submit" class="btn-primary">更新</button>
              </div>
            </form>
          </div>
        </div>
      `;
      
      container.innerHTML = dialogHtml;
      
      // 数量調整ボタン
      window.adjustQuantity = function(delta) {
        const input = document.getElementById('new-quantity');
        if (input) {
          const currentValue = parseInt(input.value) || 0;
          const newValue = Math.max(0, currentValue + delta);
          input.value = newValue;
        }
      };
      
      // オーバーレイクリック設定
      const overlay = container.querySelector('.dialog-overlay');
      setupDialogOverlayClose(overlay);
      
      // フォーム送信イベント
      const form = document.getElementById('inventory-form');
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        const newQuantity = parseInt(formData.get('quantity'));
        
        if (isNaN(newQuantity) || newQuantity < 0) {
          showFormErrors(['在庫数は0以上の整数で入力してください']);
          return;
        }
        
        // 在庫更新実行
        window.updateInventory(partId, newQuantity)
          .then(() => {
            closeDialog();
          })
          .catch(error => {
            showFormErrors([error.message]);
          });
      });
      
      // 数量入力フィールドにフォーカス
      setTimeout(() => {
        const qtyInput = document.getElementById('new-quantity');
        if (qtyInput) {
          qtyInput.focus();
          qtyInput.select();
        }
      }, 100);
    })
    .catch(error => {
      alert(`パーツ情報の取得に失敗しました: ${error.message}`);
    });
};

// 削除確認ダイアログ
window.showDeleteConfirmDialog = function(partId) {
  window.getPartById(partId)
    .then(partData => {
      const container = createDialogContainer();
      
      const dialogHtml = `
        <div class="dialog-overlay">
          <div class="dialog confirm-dialog">
            <div class="dialog-header">
              <h3>⚠️ パーツを削除</h3>
              <button type="button" class="dialog-close" onclick="closeDialog()">×</button>
            </div>
            
            <div class="confirm-content">
              <p>以下のパーツを削除しますか？</p>
              
              <div class="part-info">
                <p><strong>パーツ名:</strong> ${partData.name}</p>
                <p><strong>型番:</strong> ${partData.part_number || '未設定'}</p>
                <p><strong>メーカー:</strong> ${partData.manufacturer || '未設定'}</p>
                <p><strong>在庫数:</strong> ${partData.quantity || 0}個</p>
              </div>
              
              <div class="warning-message">
                <p class="warning">⚠️ この操作は元に戻せません。</p>
                <p>関連する在庫情報も同時に削除されます。</p>
              </div>
            </div>
            
            <div class="dialog-actions">
              <button type="button" class="btn-cancel" onclick="closeDialog()">キャンセル</button>
              <button type="button" class="btn-danger" onclick="confirmDelete(${partId})">削除</button>
            </div>
          </div>
        </div>
      `;
      
      container.innerHTML = dialogHtml;
      
      // 削除実行
      window.confirmDelete = function(partId) {
        window.deletePart(partId)
          .then(() => {
            closeDialog();
          })
          .catch(error => {
            alert(`削除に失敗しました: ${error.message}`);
          });
      };
      
      // オーバーレイクリック設定
      const overlay = container.querySelector('.dialog-overlay');
      setupDialogOverlayClose(overlay);
      
      // キャンセルボタンにフォーカス（安全のため）
      setTimeout(() => {
        const cancelBtn = container.querySelector('.btn-cancel');
        if (cancelBtn) cancelBtn.focus();
      }, 100);
    })
    .catch(error => {
      alert(`パーツ情報の取得に失敗しました: ${error.message}`);
    });
};

// グローバル関数として公開
window.closeDialog = closeDialog;