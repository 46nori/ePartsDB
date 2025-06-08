/* ローカルデータベース操作モジュール */

// 現在のビューを更新
function refreshCurrentView() {
  // app.jsで定義された関数を呼び出し
  if (typeof window.refreshCurrentView === 'function') {
    window.refreshCurrentView();
  } else {
    console.warn('refreshCurrentView関数が見つかりません');
  }
}

// パーツ追加
window.addPart = function(partData, initialQuantity = 0) {
  return new Promise((resolve, reject) => {
    try {
      // window.dbが利用可能かチェック
      if (!window.db) {
        reject(new Error('データベースが初期化されていません'));
        return;
      }

      // トランザクション開始
      window.db.exec('BEGIN TRANSACTION');
      
      // パーツを追加
      const partSql = `
        INSERT INTO parts (name, category_id, part_number, manufacturer, logic_family, package, description, datasheet_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const partStmt = window.db.prepare(partSql);
      partStmt.run([
        partData.name,
        partData.category_id,
        partData.part_number || null,
        partData.manufacturer || null,
        partData.logic_family || null,
        partData.package || null,
        partData.description || null,
        partData.datasheet_url || null
      ]);
      partStmt.free();
      
      // 追加されたパーツのIDを取得
      const getIdStmt = window.db.prepare('SELECT last_insert_rowid() as id');
      getIdStmt.step();
      const newPartId = getIdStmt.get()[0];
      getIdStmt.free();
      
      // 在庫情報を追加
      const inventorySql = `INSERT INTO inventory (part_id, quantity) VALUES (?, ?)`;
      const inventoryStmt = window.db.prepare(inventorySql);
      inventoryStmt.run([newPartId, initialQuantity]);
      inventoryStmt.free();
      
      // トランザクション完了
      window.db.exec('COMMIT');
      
      // 変更を追跡
      if (typeof window.trackLocalChange === 'function') {
        window.trackLocalChange('added', { id: newPartId, ...partData, quantity: initialQuantity });
      }
      
      // UI更新
      refreshCurrentView();
      
      // ステータス更新
      const statusElement = document.getElementById('status');
      if (statusElement) {
        statusElement.textContent = `パーツ「${partData.name}」を追加しました`;
        statusElement.className = 'status';
      }
      
      console.log('パーツ追加完了:', { id: newPartId, name: partData.name });
      resolve(newPartId);
      
    } catch (error) {
      // エラー時はロールバック
      try {
        if (window.db) {
          window.db.exec('ROLLBACK');
        }
      } catch (rollbackError) {
        console.error('ロールバックエラー:', rollbackError);
      }
      
      console.error('パーツ追加エラー:', error);
      reject(new Error(`パーツの追加に失敗しました: ${error.message}`));
    }
  });
};

// パーツ更新
window.updatePart = function(partId, partData) {
  return new Promise((resolve, reject) => {
    try {
      if (!window.db) {
        reject(new Error('データベースが初期化されていません'));
        return;
      }

      const sql = `
        UPDATE parts 
        SET name = ?, category_id = ?, part_number = ?, manufacturer = ?, 
            logic_family = ?, package = ?, description = ?, datasheet_url = ?
        WHERE id = ?
      `;
      
      const stmt = window.db.prepare(sql);
      stmt.run([
        partData.name,
        partData.category_id,
        partData.part_number || null,
        partData.manufacturer || null,
        partData.logic_family || null,
        partData.package || null,
        partData.description || null,
        partData.datasheet_url || null,
        partId
      ]);
      stmt.free();
      
      // 変更を追跡
      if (typeof window.trackLocalChange === 'function') {
        window.trackLocalChange('modified', { id: partId, ...partData });
      }
      
      // UI更新
      refreshCurrentView();
      
      // ステータス更新
      const statusElement = document.getElementById('status');
      if (statusElement) {
        statusElement.textContent = `パーツ「${partData.name}」を更新しました`;
        statusElement.className = 'status';
      }
      
      console.log('パーツ更新完了:', { id: partId, name: partData.name });
      resolve();
      
    } catch (error) {
      console.error('パーツ更新エラー:', error);
      reject(new Error(`パーツの更新に失敗しました: ${error.message}`));
    }
  });
};

// パーツ削除
window.deletePart = function(partId) {
  return new Promise((resolve, reject) => {
    try {
      if (!window.db) {
        reject(new Error('データベースが初期化されていません'));
        return;
      }

      // 削除前にパーツ情報を取得（ログ用）
      const getPartStmt = window.db.prepare('SELECT name FROM parts WHERE id = ?');
      getPartStmt.bind([partId]);
      let partName = 'Unknown';
      if (getPartStmt.step()) {
        partName = getPartStmt.get()[0];
      }
      getPartStmt.free();
      
      // トランザクション開始
      window.db.exec('BEGIN TRANSACTION');
      
      // 在庫情報を削除
      const deleteInventoryStmt = window.db.prepare('DELETE FROM inventory WHERE part_id = ?');
      deleteInventoryStmt.run([partId]);
      deleteInventoryStmt.free();
      
      // パーツを削除
      const deletePartStmt = window.db.prepare('DELETE FROM parts WHERE id = ?');
      deletePartStmt.run([partId]);
      deletePartStmt.free();
      
      // トランザクション完了
      window.db.exec('COMMIT');
      
      // 変更を追跡
      if (typeof window.trackLocalChange === 'function') {
        window.trackLocalChange('deleted', { id: partId, name: partName });
      }
      
      // UI更新
      refreshCurrentView();
      
      // ステータス更新
      const statusElement = document.getElementById('status');
      if (statusElement) {
        statusElement.textContent = `パーツ「${partName}」を削除しました`;
        statusElement.className = 'status';
      }
      
      console.log('パーツ削除完了:', { id: partId, name: partName });
      resolve();
      
    } catch (error) {
      // エラー時はロールバック
      try {
        if (window.db) {
          window.db.exec('ROLLBACK');
        }
      } catch (rollbackError) {
        console.error('ロールバックエラー:', rollbackError);
      }
      
      console.error('パーツ削除エラー:', error);
      reject(new Error(`パーツの削除に失敗しました: ${error.message}`));
    }
  });
};

// 在庫更新関数（修正版）
window.updateInventory = function(partId, newQuantity) {
  return new Promise((resolve, reject) => {
    try {
      if (!window.db) {
        reject(new Error('データベースが初期化されていません'));
        return;
      }

      // パーツ名を取得（エラーメッセージ用）
      let partName = `パーツID ${partId}`;
      try {
        const nameStmt = window.db.prepare('SELECT name FROM parts WHERE id = ?');
        nameStmt.bind([partId]);
        if (nameStmt.step()) {
          partName = nameStmt.get()[0] || partName;
        }
        nameStmt.free();
      } catch (error) {
        console.warn('パーツ名取得エラー:', error);
      }

      // 修正版: 明示的な存在チェックとUPSERT処理
      const checkSql = 'SELECT COUNT(*) as count FROM inventory WHERE part_id = ?';
      const checkStmt = window.db.prepare(checkSql);
      checkStmt.bind([partId]);
      checkStmt.step();
      const exists = checkStmt.get()[0] > 0;
      checkStmt.free();

      let stmt;
      if (exists) {
        // 既存レコードの更新
        const updateSql = 'UPDATE inventory SET quantity = ? WHERE part_id = ?';
        stmt = window.db.prepare(updateSql);
        stmt.bind([newQuantity, partId]);
      } else {
        // 新規レコードの挿入
        const insertSql = 'INSERT INTO inventory (part_id, quantity) VALUES (?, ?)';
        stmt = window.db.prepare(insertSql);
        stmt.bind([partId, newQuantity]);
      }
      
      stmt.run();
      stmt.free();
      
      console.log(`✅ 在庫更新成功: ${partName} → ${newQuantity}個`);
      
      // 変更を追跡
      if (typeof window.trackLocalChange === 'function') {
        window.trackLocalChange('inventory', { 
          id: partId, 
          name: partName, 
          quantity: newQuantity,
          action: exists ? 'updated' : 'inserted'
        });
      }
      
      // UI更新
      if (typeof window.refreshCurrentView === 'function') {
        window.refreshCurrentView();
      }
      
      // ステータス更新
      const statusElement = document.getElementById('status');
      if (statusElement) {
        statusElement.textContent = `「${partName}」の在庫を${newQuantity}個に更新しました`;
        statusElement.className = 'status';
        
        // 3秒後にステータスをクリア
        setTimeout(() => {
          if (statusElement.textContent.includes(partName)) {
            statusElement.textContent = 'データベースの読み込みが完了しました。';
          }
        }, 3000);
      }
      
      resolve();
      
    } catch (error) {
      console.error('❌ 在庫更新エラー:', error);
      reject(new Error(`在庫の更新に失敗しました: ${error.message}`));
    }
  });
};

// パーツ情報取得
window.getPartById = function(partId) {
  return new Promise((resolve, reject) => {
    try {
      if (!window.db) {
        reject(new Error('データベースが初期化されていません'));
        return;
      }

      const sql = `
        SELECT parts.*, categories.name AS category_name, inventory.quantity
        FROM parts
        LEFT JOIN categories ON parts.category_id = categories.id
        LEFT JOIN inventory ON parts.id = inventory.part_id
        WHERE parts.id = ?
      `;
      
      const stmt = window.db.prepare(sql);
      stmt.bind([partId]);
      
      if (stmt.step()) {
        const partData = stmt.getAsObject();
        stmt.free();
        resolve(partData);
      } else {
        stmt.free();
        reject(new Error('パーツが見つかりません'));
      }
      
    } catch (error) {
      console.error('パーツ取得エラー:', error);
      reject(new Error(`パーツ情報の取得に失敗しました: ${error.message}`));
    }
  });
};

// ✅ 新規追加: 完全スキーマ対応のパーツ追加関数
function addPartComplete(partData) {
  if (!db) {
    throw new Error('データベースが初期化されていません');
  }
  
  try {
    // トランザクション開始
    db.exec('BEGIN TRANSACTION');
    
    // 1. parts テーブル: 全カラム対応の挿入
    const partStmt = db.prepare(`
      INSERT INTO parts (
        name, category_id, manufacturer, part_number, package,
        voltage_rating, current_rating, power_rating, tolerance,
        logic_family, description, datasheet_url, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    
    const partResult = partStmt.run([
      partData.name || '',
      partData.category_id || null,
      partData.manufacturer || '',
      partData.part_number || '',
      partData.package || '',
      partData.voltage_rating || '',      // 新規対応
      partData.current_rating || '',      // 新規対応
      partData.power_rating || '',        // 新規対応
      partData.tolerance || '',           // 新規対応
      partData.logic_family || '',
      partData.description || '',
      partData.datasheet_url || ''
    ]);
    
    const partId = partResult.lastInsertRowid;
    partStmt.free();
    
    // 2. inventory テーブル: 全カラム対応の挿入
    const inventoryStmt = db.prepare(`
      INSERT INTO inventory (
        part_id, quantity, location, purchase_date,
        shop, price_per_unit, currency, memo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    inventoryStmt.run([
      partId,
      partData.initial_stock || 0,
      partData.location || '',            // 新規対応
      partData.purchase_date || '',       // 新規対応
      partData.shop || '',                // 新規対応
      partData.price_per_unit || null,    // 新規対応
      partData.currency || 'JPY',         // 新規対応
      partData.memo || ''                 // 新規対応
    ]);
    
    inventoryStmt.free();
    
    // トランザクション確定
    db.exec('COMMIT');
    
    AppUtils.log(`パーツ追加成功: ID=${partId}, 名前=${partData.name}`, 'LocalDatabase');
    
    return { success: true, partId: partId };
    
  } catch (error) {
    // エラー時はロールバック
    try {
      db.exec('ROLLBACK');
    } catch (rollbackError) {
      console.error('❌ ロールバックエラー:', rollbackError);
    }
    
    console.error('❌ パーツ追加エラー:', error);
    throw new Error(`パーツの追加に失敗しました: ${error.message}`);
  }
}

// ✅ 新規追加: 完全スキーマ対応のパーツ更新関数
function updatePartComplete(partId, partData) {
  if (!db) {
    throw new Error('データベースが初期化されていません');
  }
  
  try {
    // トランザクション開始
    db.exec('BEGIN TRANSACTION');
    
    // 1. parts テーブルの全カラム更新
    const partStmt = db.prepare(`
      UPDATE parts SET
        name = ?, category_id = ?, manufacturer = ?, part_number = ?, package = ?,
        voltage_rating = ?, current_rating = ?, power_rating = ?, tolerance = ?,
        logic_family = ?, description = ?, datasheet_url = ?
      WHERE id = ?
    `);
    
    partStmt.run([
      partData.name || '',
      partData.category_id || null,
      partData.manufacturer || '',
      partData.part_number || '',
      partData.package || '',
      partData.voltage_rating || '',      // 新規対応
      partData.current_rating || '',      // 新規対応
      partData.power_rating || '',        // 新規対応
      partData.tolerance || '',           // 新規対応
      partData.logic_family || '',
      partData.description || '',
      partData.datasheet_url || '',
      partId
    ]);
    
    partStmt.free();
    
    // 2. inventory テーブルの全カラム更新
    const inventoryStmt = db.prepare(`
      UPDATE inventory SET
        quantity = ?, location = ?, purchase_date = ?,
        shop = ?, price_per_unit = ?, currency = ?, memo = ?
      WHERE part_id = ?
    `);
    
    inventoryStmt.run([
      partData.quantity || 0,
      partData.location || '',            // 新規対応
      partData.purchase_date || '',       // 新規対応
      partData.shop || '',                // 新規対応
      partData.price_per_unit || null,    // 新規対応
      partData.currency || 'JPY',         // 新規対応
      partData.memo || '',                // 新規対応
      partId
    ]);
    
    inventoryStmt.free();
    
    // トランザクション確定
    db.exec('COMMIT');
    
    AppUtils.log(`パーツ更新成功: ID=${partId}, 名前=${partData.name}`, 'LocalDatabase');
    
    return { success: true };
    
  } catch (error) {
    // エラー時はロールバック
    try {
      db.exec('ROLLBACK');
    } catch (rollbackError) {
      console.error('❌ ロールバックエラー:', rollbackError);
    }
    
    console.error('❌ パーツ更新エラー:', error);
    throw new Error(`パーツの更新に失敗しました: ${error.message}`);
  }
}

console.log('local-database.js読み込み完了');