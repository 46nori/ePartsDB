// 修正: showAddPartDialog() 関数 - 拡張フィールド対応
function showAddPartDialog() {
  const categories = loadCategories();
  
  const modalHtml = `
    <div id="add-part-modal" class="modal">
      <div class="modal-content">
        <h3>➕ パーツ追加</h3>
        <form id="add-part-form">
          <!-- 既存フィールド（変更なし） -->
          <div class="form-group">
            <label for="part-name">パーツ名 *</label>
            <input type="text" id="part-name" required maxlength="100">
          </div>
          
          <div class="form-group">
            <label for="part-category">カテゴリ *</label>
            <select id="part-category" required>
              <option value="">カテゴリを選択してください</option>
              ${categories.map(cat => 
                `<option value="${cat.id}">${AppUtils.escapeHtml(cat.name)}</option>`
              ).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label for="part-manufacturer">メーカー</label>
            <input type="text" id="part-manufacturer" maxlength="50">
          </div>
          
          <div class="form-group">
            <label for="part-number">型番</label>
            <input type="text" id="part-number" maxlength="50">
          </div>
          
          <div class="form-group">
            <label for="part-package">パッケージ</label>
            <input type="text" id="part-package" maxlength="20" placeholder="例: DIP, SMD, TO-220">
          </div>
          
          <!-- ✅ 新規追加: 拡張フィールド -->
          <div class="form-section">
            <h4>📐 電気的特性</h4>
            
            <div class="form-group">
              <label for="part-voltage-rating">耐圧</label>
              <input type="text" id="part-voltage-rating" placeholder="例: 50V">
            </div>
            
            <div class="form-group">
              <label for="part-current-rating">電流制限</label>
              <input type="text" id="part-current-rating" placeholder="例: 1A">
            </div>
            
            <div class="form-group">
              <label for="part-power-rating">定格電力</label>
              <input type="text" id="part-power-rating" placeholder="例: 0.25W">
            </div>
            
            <div class="form-group">
              <label for="part-tolerance">誤差</label>
              <input type="text" id="part-tolerance" placeholder="例: ±1%">
            </div>
            
            <div class="form-group">
              <label for="part-logic-family">ロジックファミリ</label>
              <input type="text" id="part-logic-family" placeholder="例: HC, LS">
            </div>
          </div>
          
          <!-- 既存フィールド（変更なし） -->
          <div class="form-group">
            <label for="part-description">説明</label>
            <textarea id="part-description" maxlength="200"></textarea>
          </div>
          
          <div class="form-group">
            <label for="part-datasheet">データシートURL</label>
            <input type="url" id="part-datasheet" maxlength="255">
          </div>
          
          <div class="form-group">
            <label for="part-stock">初期在庫数</label>
            <input type="number" id="part-stock" min="0" max="9999" value="0">
          </div>
          
          <!-- ✅ 新規追加: 在庫拡張フィールド -->
          <div class="form-section">
            <h4>📦 在庫詳細</h4>
            
            <div class="form-group">
              <label for="part-location">保管場所</label>
              <input type="text" id="part-location" placeholder="例: 引き出し A-1">
            </div>
            
            <div class="form-group">
              <label for="part-purchase-date">購入日</label>
              <input type="date" id="part-purchase-date">
            </div>
            
            <div class="form-group">
              <label for="part-shop">購入先</label>
              <input type="text" id="part-shop" placeholder="例: 秋月電子">
            </div>
            
            <div class="form-group">
              <label for="part-price">単価</label>
              <input type="number" id="part-price" min="0" step="0.01" placeholder="0.00">
            </div>
            
            <div class="form-group">
              <label for="part-currency">通貨</label>
              <select id="part-currency">
                <option value="JPY">JPY (円)</option>
                <option value="USD">USD (ドル)</option>
                <option value="EUR">EUR (ユーロ)</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="part-memo">メモ</label>
              <textarea id="part-memo" placeholder="特記事項など"></textarea>
            </div>
          </div>
          
          <!-- 既存ボタン（変更なし） -->
          <div class="modal-actions">
            <button type="button" id="cancel-add-btn" class="btn-secondary">キャンセル</button>
            <button type="submit" id="save-add-btn" class="btn-primary">保存</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // イベントリスナー設定
  setupAddPartDialogEvents();
  
  // モーダル表示
  showModal('add-part-modal');
}

// 追加: パーツ追加ダイアログのイベント設定
function setupAddPartDialogEvents() {
  // キャンセルボタン
  document.getElementById('cancel-add-btn').addEventListener('click', () => {
    closeModal('add-part-modal');
  });
  
  // 保存ボタン
  document.getElementById('save-add-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    
    try {
      // ✅ 全フィールド対応のデータ収集
      const partData = {
        // 既存フィールド
        name: AppUtils.validateInput(document.getElementById('part-name').value, 'string', 100),
        category_id: parseInt(document.getElementById('part-category').value) || null,
        manufacturer: AppUtils.validateInput(document.getElementById('part-manufacturer').value, 'string', 50),
        part_number: AppUtils.validateInput(document.getElementById('part-number').value, 'string', 50),
        package: AppUtils.validateInput(document.getElementById('part-package').value, 'string', 20),
        description: AppUtils.validateInput(document.getElementById('part-description').value, 'string', 200),
        datasheet_url: AppUtils.validateInput(document.getElementById('part-datasheet').value, 'string', 255),
        initial_stock: AppUtils.validateInput(document.getElementById('part-stock').value, 'number'),
        
        // ✅ 新規フィールド（拡張カラム）
        voltage_rating: AppUtils.validateInput(document.getElementById('part-voltage-rating').value, 'string', 50),
        current_rating: AppUtils.validateInput(document.getElementById('part-current-rating').value, 'string', 50),
        power_rating: AppUtils.validateInput(document.getElementById('part-power-rating').value, 'string', 50),
        tolerance: AppUtils.validateInput(document.getElementById('part-tolerance').value, 'string', 50),
        logic_family: AppUtils.validateInput(document.getElementById('part-logic-family').value, 'string', 50),
        
        // ✅ 在庫拡張フィールド
        location: AppUtils.validateInput(document.getElementById('part-location').value, 'string', 100),
        purchase_date: AppUtils.validateInput(document.getElementById('part-purchase-date').value, 'string', 10),
        shop: AppUtils.validateInput(document.getElementById('part-shop').value, 'string', 100),
        price_per_unit: parseFloat(document.getElementById('part-price').value) || null,
        currency: AppUtils.validateInput(document.getElementById('part-currency').value, 'string', 10),
        memo: AppUtils.validateInput(document.getElementById('part-memo').value, 'string', 500)
      };
      
      // 必須フィールドの検証
      if (!partData.name.trim()) {
        throw new Error('パーツ名は必須です');
      }
      
      if (!partData.category_id) {
        throw new Error('カテゴリの選択は必須です');
      }
      
      // ✅ 完全データでパーツ追加
      const result = await addPartComplete(partData);
      
      if (result.success) {
        // 成功処理
        closeModal('add-part-modal');
        showStatus('パーツが追加されました', 'success');
        
        // 変更追跡
        if (window.appState && window.appState.trackChange) {
          window.appState.trackChange('add', partData);
        }
        
        // 表示更新
        const currentCategory = getCurrentCategory();
        if (currentCategory) {
          loadParts(currentCategory);
        }
        
        AppUtils.log(`パーツ追加完了: ${partData.name}`, 'AddDialog');
      }
      
    } catch (error) {
      console.error('❌ パーツ追加エラー:', error);
      showStatus(`エラー: ${error.message}`, 'error');
    }
  });
}

// 修正: showEditPartDialog() 関数 - 拡張フィールド対応
function showEditPartDialog(partData) {
  const categories = loadCategories();
  
  const modalHtml = `
    <div id="edit-part-modal" class="modal">
      <div class="modal-content">
        <h3>✏️ パーツ編集</h3>
        <form id="edit-part-form">
          <!-- 既存フィールド（変更なし） -->
          <div class="form-group">
            <label for="edit-part-name">パーツ名 *</label>
            <input type="text" id="edit-part-name" required maxlength="100" value="${AppUtils.escapeHtml(partData.name || '')}">
          </div>
          
          <div class="form-group">
            <label for="edit-part-category">カテゴリ *</label>
            <select id="edit-part-category" required>
              <option value="">カテゴリを選択してください</option>
              ${categories.map(cat => 
                `<option value="${cat.id}" ${cat.id === partData.category_id ? 'selected' : ''}>
                  ${AppUtils.escapeHtml(cat.name)}
                </option>`
              ).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label for="edit-part-manufacturer">メーカー</label>
            <input type="text" id="edit-part-manufacturer" maxlength="50" value="${AppUtils.escapeHtml(partData.manufacturer || '')}">
          </div>
          
          <div class="form-group">
            <label for="edit-part-number">型番</label>
            <input type="text" id="edit-part-number" maxlength="50" value="${AppUtils.escapeHtml(partData.part_number || '')}">
          </div>
          
          <div class="form-group">
            <label for="edit-part-package">パッケージ</label>
            <input type="text" id="edit-part-package" maxlength="20" value="${AppUtils.escapeHtml(partData.package || '')}" placeholder="例: DIP, SMD, TO-220">
          </div>
          
          <!-- ✅ 新規追加: 拡張フィールド -->
          <div class="form-section">
            <h4>📐 電気的特性</h4>
            
            <div class="form-group">
              <label for="edit-part-voltage-rating">耐圧</label>
              <input type="text" id="edit-part-voltage-rating" value="${AppUtils.escapeHtml(partData.voltage_rating || '')}" placeholder="例: 50V">
            </div>
            
            <div class="form-group">
              <label for="edit-part-current-rating">電流制限</label>
              <input type="text" id="edit-part-current-rating" value="${AppUtils.escapeHtml(partData.current_rating || '')}" placeholder="例: 1A">
            </div>
            
            <div class="form-group">
              <label for="edit-part-power-rating">定格電力</label>
              <input type="text" id="edit-part-power-rating" value="${AppUtils.escapeHtml(partData.power_rating || '')}" placeholder="例: 0.25W">
            </div>
            
            <div class="form-group">
              <label for="edit-part-tolerance">誤差</label>
              <input type="text" id="edit-part-tolerance" value="${AppUtils.escapeHtml(partData.tolerance || '')}" placeholder="例: ±1%">
            </div>
            
            <div class="form-group">
              <label for="edit-part-logic-family">ロジックファミリ</label>
              <input type="text" id="edit-part-logic-family" value="${AppUtils.escapeHtml(partData.logic_family || '')}" placeholder="例: HC, LS">
            </div>
          </div>
          
          <!-- 既存フィールド（変更なし） -->
          <div class="form-group">
            <label for="edit-part-description">説明</label>
            <textarea id="edit-part-description" maxlength="200">${AppUtils.escapeHtml(partData.description || '')}</textarea>
          </div>
          
          <div class="form-group">
            <label for="edit-part-datasheet">データシートURL</label>
            <input type="url" id="edit-part-datasheet" maxlength="255" value="${AppUtils.escapeHtml(partData.datasheet_url || '')}">
          </div>
          
          <div class="form-group">
            <label for="edit-part-stock">在庫数</label>
            <input type="number" id="edit-part-stock" min="0" max="9999" value="${partData.quantity || 0}">
          </div>
          
          <!-- ✅ 新規追加: 在庫拡張フィールド -->
          <div class="form-section">
            <h4>📦 在庫詳細</h4>
            
            <div class="form-group">
              <label for="edit-part-location">保管場所</label>
              <input type="text" id="edit-part-location" value="${AppUtils.escapeHtml(partData.location || '')}" placeholder="例: 引き出し A-1">
            </div>
            
            <div class="form-group">
              <label for="edit-part-purchase-date">購入日</label>
              <input type="date" id="edit-part-purchase-date" value="${partData.purchase_date || ''}">
            </div>
            
            <div class="form-group">
              <label for="edit-part-shop">購入先</label>
              <input type="text" id="edit-part-shop" value="${AppUtils.escapeHtml(partData.shop || '')}" placeholder="例: 秋月電子">
            </div>
            
            <div class="form-group">
              <label for="edit-part-price">単価</label>
              <input type="number" id="edit-part-price" min="0" step="0.01" value="${partData.price_per_unit || ''}" placeholder="0.00">
            </div>
            
            <div class="form-group">
              <label for="edit-part-currency">通貨</label>
              <select id="edit-part-currency">
                <option value="JPY" ${partData.currency === 'JPY' ? 'selected' : ''}>JPY (円)</option>
                <option value="USD" ${partData.currency === 'USD' ? 'selected' : ''}>USD (ドル)</option>
                <option value="EUR" ${partData.currency === 'EUR' ? 'selected' : ''}>EUR (ユーロ)</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="edit-part-memo">メモ</label>
              <textarea id="edit-part-memo" placeholder="特記事項など">${AppUtils.escapeHtml(partData.memo || '')}</textarea>
            </div>
          </div>
          
          <!-- 既存ボタン（変更なし） -->
          <div class="modal-actions">
            <button type="button" id="cancel-edit-btn" class="btn-secondary">キャンセル</button>
            <button type="submit" id="save-edit-btn" class="btn-primary">保存</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // イベントリスナー設定
  setupEditPartDialogEvents(partData);
  
  // モーダル表示
  showModal('edit-part-modal');
}

// 追加: パーツ編集ダイアログのイベント設定
function setupEditPartDialogEvents(originalData) {
  // キャンセルボタン
  document.getElementById('cancel-edit-btn').addEventListener('click', () => {
    closeModal('edit-part-modal');
  });
  
  // 保存ボタン
  document.getElementById('save-edit-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    
    try {
      // ✅ 全フィールド対応のデータ収集
      const partData = {
        // 既存フィールド
        name: AppUtils.validateInput(document.getElementById('edit-part-name').value, 'string', 100),
        category_id: parseInt(document.getElementById('edit-part-category').value) || null,
        manufacturer: AppUtils.validateInput(document.getElementById('edit-part-manufacturer').value, 'string', 50),
        part_number: AppUtils.validateInput(document.getElementById('edit-part-number').value, 'string', 50),
        package: AppUtils.validateInput(document.getElementById('edit-part-package').value, 'string', 20),
        description: AppUtils.validateInput(document.getElementById('edit-part-description').value, 'string', 200),
        datasheet_url: AppUtils.validateInput(document.getElementById('edit-part-datasheet').value, 'string', 255),
        quantity: AppUtils.validateInput(document.getElementById('edit-part-stock').value, 'number'),
        
        // ✅ 新規フィールド（拡張カラム）
        voltage_rating: AppUtils.validateInput(document.getElementById('edit-part-voltage-rating').value, 'string', 50),
        current_rating: AppUtils.validateInput(document.getElementById('edit-part-current-rating').value, 'string', 50),
        power_rating: AppUtils.validateInput(document.getElementById('edit-part-power-rating').value, 'string', 50),
        tolerance: AppUtils.validateInput(document.getElementById('edit-part-tolerance').value, 'string', 50),
        logic_family: AppUtils.validateInput(document.getElementById('edit-part-logic-family').value, 'string', 50),
        
        // ✅ 在庫拡張フィールド
        location: AppUtils.validateInput(document.getElementById('edit-part-location').value, 'string', 100),
        purchase_date: AppUtils.validateInput(document.getElementById('edit-part-purchase-date').value, 'string', 10),
        shop: AppUtils.validateInput(document.getElementById('edit-part-shop').value, 'string', 100),
        price_per_unit: parseFloat(document.getElementById('edit-part-price').value) || null,
        currency: AppUtils.validateInput(document.getElementById('edit-part-currency').value, 'string', 10),
        memo: AppUtils.validateInput(document.getElementById('edit-part-memo').value, 'string', 500)
      };
      
      // 必須フィールドの検証
      if (!partData.name.trim()) {
        throw new Error('パーツ名は必須です');
      }
      
      if (!partData.category_id) {
        throw new Error('カテゴリの選択は必須です');
      }
      
      // ✅ 完全データでパーツ更新
      const result = await updatePartComplete(originalData.id, partData);
      
      if (result.success) {
        // 成功処理
        closeModal('edit-part-modal');
        showStatus('パーツが更新されました', 'success');
        
        // 変更追跡
        if (window.appState && window.appState.trackChange) {
          window.appState.trackChange('modify', {
            id: originalData.id,
            newValues: partData,
            oldValues: originalData
          });
        }
        
        // 表示更新
        const currentCategory = getCurrentCategory();
        if (currentCategory) {
          loadParts(currentCategory);
        }
        
        AppUtils.log(`パーツ更新完了: ${partData.name}`, 'EditDialog');
      }
      
    } catch (error) {
      console.error('❌ パーツ更新エラー:', error);
      showStatus(`エラー: ${error.message}`, 'error');
    }
  });
}