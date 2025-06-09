/* ローカルデータベース操作モジュール */

AppUtils.log('local-database.js読み込み完了', 'DATABASE', 'INFO');

// ===== データベース初期化 =====
window.initializeDatabase = function() {
  // データベース初期化の実装
  // （実装内容は既存のものを維持）
};

// ===== CRUD操作 =====
// パーツ追加
window.addPart = function(partData) {
  AppUtils.log('パーツ追加処理開始', 'DATABASE', 'DEBUG', { name: partData.name, category_id: partData.category_id });
  
  return new Promise((resolve, reject) => {
    try {
      if (!window.db) {
        reject(new Error('データベースが初期化されていません'));
        return;
      }

      // トランザクション開始
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
        partData.name, partData.category_id, partData.manufacturer,
        partData.part_number, partData.package, partData.voltage_rating,
        partData.current_rating, partData.power_rating, partData.tolerance,
        partData.logic_family, partData.description, partData.datasheet_url
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
        partId, partData.quantity || 1, partData.location, partData.purchase_date,
        partData.shop, partData.price_per_unit, partData.currency, partData.memo
      ]);
      invStmt.free();

      window.db.exec('COMMIT');
      
      AppUtils.log('パーツ追加完了', 'DATABASE', 'INFO', { partId, name: partData.name });
      
      // 変更を追跡
      if (typeof window.trackLocalChange === 'function') {
        window.trackLocalChange('added', { id: partId, ...partData });
      }
      
      // 直接呼び出し
      if (typeof window.refreshCurrentView === 'function') {
        window.refreshCurrentView();
      }
      
      // ステータス更新
      const statusElement = document.getElementById('status');
      if (statusElement) {
        statusElement.textContent = `パーツ「${partData.name}」を追加しました`;
        statusElement.className = 'status';
      }
      
      resolve(partId);
      
    } catch (error) {
      // エラー時はロールバック
      try {
        if (window.db) {
          window.db.exec('ROLLBACK');
        }
      } catch (rollbackError) {
        AppUtils.log('ロールバックエラー', 'DATABASE', 'ERROR', { error: rollbackError.message });
      }
      
      AppUtils.log('パーツ追加エラー', 'DATABASE', 'ERROR', { error: error.message });
      
      reject(new Error(`パーツの追加に失敗しました: ${error.message}`));
    }
  });
};

// パーツ更新
window.updatePart = function(partId, partData) {
  AppUtils.log('パーツ更新処理開始', 'DATABASE', 'DEBUG', { partId, name: partData.name });
  
  return new Promise((resolve, reject) => {
    try {
      if (!window.db) {
        reject(new Error('データベースが初期化されていません'));
        return;
      }

      // トランザクション開始
      window.db.exec('BEGIN TRANSACTION');

      // パーツ基本情報を更新（タイムスタンプカラム除外）
      const partStmt = window.db.prepare(`
        UPDATE parts SET 
          name = ?, category_id = ?, manufacturer = ?, part_number = ?,
          package = ?, voltage_rating = ?, current_rating = ?, power_rating = ?,
          tolerance = ?, logic_family = ?, description = ?, datasheet_url = ?
        WHERE id = ?
      `);
      
      partStmt.run([
        partData.name, partData.category_id, partData.manufacturer, partData.part_number,
        partData.package, partData.voltage_rating, partData.current_rating, partData.power_rating,
        partData.tolerance, partData.logic_family, partData.description, partData.datasheet_url,
        partId
      ]);
      partStmt.free();

      // 在庫情報を更新（存在する場合）
      if (partData.quantity !== undefined || partData.location !== undefined) {
        const invStmt = window.db.prepare(`
          UPDATE inventory SET 
            quantity = COALESCE(?, quantity),
            location = COALESCE(?, location),
            purchase_date = COALESCE(?, purchase_date),
            shop = COALESCE(?, shop),
            price_per_unit = COALESCE(?, price_per_unit),
            currency = COALESCE(?, currency),
            memo = COALESCE(?, memo)
          WHERE part_id = ?
        `);
        
        invStmt.run([
          partData.quantity, partData.location, partData.purchase_date, partData.shop,
          partData.price_per_unit, partData.currency, partData.memo, partId
        ]);
        invStmt.free();
      }

      window.db.exec('COMMIT');
      
      AppUtils.log('パーツ更新完了', 'DATABASE', 'INFO', { partId, name: partData.name });
      
      // 変更を追跡
      if (typeof window.trackLocalChange === 'function') {
        window.trackLocalChange('modified', { id: partId, ...partData });
      }
      
      // 直接呼び出し
      if (typeof window.refreshCurrentView === 'function') {
        window.refreshCurrentView();
      }
      
      // ステータス更新
      const statusElement = document.getElementById('status');
      if (statusElement) {
        statusElement.textContent = `パーツ「${partData.name}」を更新しました`;
        statusElement.className = 'status';
      }
      
      resolve();
      
    } catch (error) {
      AppUtils.log('パーツ更新エラー', 'DATABASE', 'ERROR', { partId, error: error.message });
      
      reject(new Error(`パーツの更新に失敗しました: ${error.message}`));
    }
  });
};

// パーツ削除
window.deletePart = function(partId) {
  AppUtils.log('パーツ削除処理開始', 'DATABASE', 'DEBUG', { partId });
  
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
      
      AppUtils.log('パーツ削除完了', 'DATABASE', 'INFO', { partId, name: partName });
      
      // 変更を追跡
      if (typeof window.trackLocalChange === 'function') {
        window.trackLocalChange('deleted', { id: partId, name: partName });
      }
      
      // 直接呼び出し
      if (typeof window.refreshCurrentView === 'function') {
        window.refreshCurrentView();
      }
      
      // ステータス更新
      const statusElement = document.getElementById('status');
      if (statusElement) {
        statusElement.textContent = `パーツ「${partName}」を削除しました`;
        statusElement.className = 'status';
      }
      
      resolve();
      
    } catch (error) {
      // エラー時はロールバック
      try {
        if (window.db) {
          window.db.exec('ROLLBACK');
        }
      } catch (rollbackError) {
        AppUtils.log('ロールバックエラー', 'DATABASE', 'ERROR', { error: rollbackError.message });
      }
      
      AppUtils.log('パーツ削除エラー', 'DATABASE', 'ERROR', { partId, error: error.message });
      
      reject(new Error(`パーツの削除に失敗しました: ${error.message}`));
    }
  });
};

// 在庫更新関数（修正版）
window.updateInventory = function(partId, newQuantity) {
  AppUtils.log('在庫更新処理開始', 'DATABASE', 'DEBUG', { partId, newQuantity });
  
  return new Promise((resolve, reject) => {
    try {
      if (!window.db) {
        reject(new Error('データベースが初期化されていません'));
        return;
      }

      try {
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
          AppUtils.log('パーツ名取得エラー', 'DATABASE', 'WARN', { partId, error: error.message });
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
        
        AppUtils.log('在庫更新完了', 'DATABASE', 'INFO', { partId, partName, newQuantity });
        
        // 変更を追跡
        if (typeof window.trackLocalChange === 'function') {
          window.trackLocalChange('inventory', { 
            id: partId, 
            name: partName, 
            quantity: newQuantity,
            action: exists ? 'updated' : 'inserted'
          });
        }
        
        // 直接呼び出し
        if (typeof window.refreshCurrentView === 'function') {
          window.refreshCurrentView();
        }
        
        const statusElement = document.getElementById('status');
        if (statusElement) {
          statusElement.textContent = `「${partName}」の在庫を${newQuantity}個に更新しました`;
          statusElement.className = 'status';
          
          // 定数化されたクリア時間
          setTimeout(() => {
            if (statusElement.textContent.includes(partName)) {
              statusElement.textContent = 'データベースの読み込みが完了しました。';
            }
          }, CONFIG.UI.STATUS_CLEAR_DELAY);
        }
        
        resolve();
      } catch (error) {
        AppUtils.log('在庫更新エラー（内部）', 'DATABASE', 'ERROR', { partId, error: error.message });
        
        reject(new Error(`在庫の更新に失敗しました: ${error.message}`));
      }
    } catch (error) {
      AppUtils.log('在庫更新エラー（外部）', 'DATABASE', 'ERROR', { partId, error: error.message });
    
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
      AppUtils.log('パーツ取得エラー', 'DATABASE', 'ERROR', { partId, error: error.message });
      
      reject(new Error(`パーツ情報の取得に失敗しました: ${error.message}`));
    }
  });
};