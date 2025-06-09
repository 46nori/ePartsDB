/**
 * Phase 4: 同期機能マネージャー
 * 既存機能を一切変更せず、シームレスに統合
 */

class SyncManager {
  
  /**
   * 同期メイン処理
   * 既存のwindow.appStateシステムを活用
   */
  static async syncToMaster() {
    AppUtils.log('同期開始', 'SYNC', 'INFO');
    
    // 同期前の詳細チェック
    if (!window.originalDb) {
      const errorMsg = 'マスターデータベースが初期化されていません。ページを再読み込みしてください。';
      AppUtils.log('同期前チェックエラー', 'SYNC', 'ERROR', { originalDb: false });
      alert(errorMsg);
      return;
    }
    
    if (!window.SQLInstance) {
      const errorMsg = 'SQLライブラリが初期化されていません。ページを再読み込みしてください。';
      AppUtils.log('同期前チェックエラー', 'SYNC', 'ERROR', { sqlInstance: false });
      alert(errorMsg);
      return;
    }
    
    if (!window.getAppState) {
      const errorMsg = 'アプリケーション状態が初期化されていません。ページを再読み込みしてください。';
      AppUtils.log('同期前チェックエラー', 'SYNC', 'ERROR', { appState: false });
      alert(errorMsg);
      return;
    }
    
    AppUtils.log('同期前チェック完了', 'SYNC', 'DEBUG', {
      originalDb: !!window.originalDb,
      sqlInstance: !!window.SQLInstance,
      appState: !!window.getAppState
    });
    
    try {
      // 1. 変更データ収集（既存APIを利用）
      const state = window.getAppState();
      if (!state || !state.hasLocalChanges) {
        alert('同期する変更がありません。');
        return;
      }
      
      const changes = state.getAllChanges();
      const stats = state.getChangeStats();
      
      AppUtils.log('変更データ収集完了', 'SYNC', 'INFO', stats);
      
      // 2. 確認ダイアログ表示
      const confirmed = await this.showSyncConfirmDialog(stats);
      if (!confirmed) {
        AppUtils.log('同期キャンセル', 'SYNC', 'INFO');
        return;
      }
      
      // 3. マスターDB更新
      const newMasterDb = await this.applyChangesToMaster(changes);
      
      // 4. ファイルダウンロード
      await this.downloadAsEpartsDb(newMasterDb);
      
      // 5. 状態クリア（既存APIを利用）
      state.clearChanges();
      
      // 6. UI更新（既存機能を利用）
      if (typeof window.refreshCurrentView === 'function') {
        window.refreshCurrentView();
      }
      
      AppUtils.log('同期完了', 'SYNC', 'INFO', { totalChanges: stats.total });
      
      // 7. 完了メッセージ
      alert(`同期が完了しました！

📊 変更統計:
• パーツ追加: ${stats.added}件
• パーツ編集: ${stats.modified}件  
• パーツ削除: ${stats.deleted}件
• 在庫更新: ${stats.inventory}件

📋 次の手順:
1. 新しいeparts.dbがダウンロードされました
2. プロジェクトフォルダで既存ファイルを置き換えてください
3. ページを再読み込みして変更を確認してください`);
      
    } catch (error) {
      AppUtils.log('同期エラー', 'SYNC', 'ERROR', { error: error.message });
      alert(`同期に失敗しました: ${error.message}`);
    }
  }
  
  /**
   * 確認ダイアログ表示
   * 既存のモーダルパターンに準拠
   */
  static showSyncConfirmDialog(stats) {
    return new Promise((resolve) => {
      const dialogHtml = `
        <div class="modal-overlay" id="sync-confirm-modal" style="display: flex;">
          <div class="modal-content sync-confirm">
            <div class="modal-header">
              <h2>🔄 ローカルファイル同期</h2>
              <button class="modal-close" type="button">&times;</button>
            </div>
            
            <div class="modal-body">
              <p class="sync-description">
                eparts.dbに以下の変更を反映します：
              </p>
              
              <div class="change-summary">
                <div class="change-item">➕ パーツ追加: <strong>${stats.added}</strong>件</div>
                <div class="change-item">✏️ パーツ編集: <strong>${stats.modified}</strong>件</div>
                <div class="change-item">🗑️ パーツ削除: <strong>${stats.deleted}</strong>件</div>
                <div class="change-item">📦 在庫更新: <strong>${stats.inventory}</strong>件</div>
                <div class="change-total">合計: <strong>${stats.total}</strong>件の変更</div>
              </div>
              
              <div class="sync-instructions">
                <h4>📋 手順:</h4>
                <ol>
                  <li>新しいeparts.dbがダウンロードされます</li>
                  <li>プロジェクトフォルダで既存ファイルを置き換えてください</li>
                  <li>ページを再読み込みして変更を確認してください</li>
                </ol>
              </div>
              
              <div class="backup-notice">
                <p><strong>💡 推奨:</strong> 置き換え前に現在のeparts.dbをバックアップしてください</p>
              </div>
            </div>
            
            <div class="modal-footer">
              <button type="button" class="btn-secondary" id="sync-cancel-btn">キャンセル</button>
              <button type="button" class="btn-primary" id="sync-confirm-btn">同期実行</button>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', dialogHtml);
      
      const modal = document.getElementById('sync-confirm-modal');
      const closeBtn = modal.querySelector('.modal-close');
      const cancelBtn = document.getElementById('sync-cancel-btn');
      const confirmBtn = document.getElementById('sync-confirm-btn');
      
      const cleanup = () => {
        modal.remove();
        document.removeEventListener('keydown', escHandler);
      };
      
      const handleCancel = () => {
        cleanup();
        resolve(false);
      };
      
      const handleConfirm = () => {
        cleanup();
        resolve(true);
      };
      
      // イベントリスナー設定（既存パターンに準拠）
      closeBtn.onclick = handleCancel;
      cancelBtn.onclick = handleCancel;
      confirmBtn.onclick = handleConfirm;
      
      // ESCキー対応（既存パターンと同じ）
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          handleCancel();
        }
      };
      document.addEventListener('keydown', escHandler);
      
      AppUtils.log('同期確認ダイアログ表示', 'SYNC', 'DEBUG', stats);
    });
  }
  
  /**
   * マスターDBに変更適用
   * 既存のトランザクション処理パターンに準拠
   */
  static async applyChangesToMaster(changes) {
    // マスターDB存在確認を強化
    if (!window.originalDb) {
      AppUtils.log('マスターデータベース未初期化', 'SYNC', 'ERROR');
      throw new Error('マスターデータベースが初期化されていません。ページを再読み込みしてください。');
    }
    
    if (!window.SQLInstance) {
      AppUtils.log('SQLインスタンス未初期化', 'SYNC', 'ERROR');
      throw new Error('SQLライブラリが初期化されていません。ページを再読み込みしてください。');
    }
    
    AppUtils.log('マスターDB更新開始', 'SYNC', 'INFO', {
      originalDbExists: !!window.originalDb,
      sqlInstanceExists: !!window.SQLInstance,
      changesCount: {
        added: changes.added.length,
        modified: changes.modified.length,
        deleted: changes.deleted.length,
        inventory: changes.inventory.length
      }
    });
    
    let newMasterDb = null;
    
    try {
      // マスターDBをコピー
      const masterData = window.originalDb.export();
      newMasterDb = new window.SQLInstance.Database(masterData);
      
      AppUtils.log('マスターDBコピー完了', 'SYNC', 'DEBUG');
      
      newMasterDb.exec('BEGIN TRANSACTION');
      
      // 1. 削除処理（先に実行）
      if (changes.deleted && changes.deleted.length > 0) {
        AppUtils.log(`削除処理開始: ${changes.deleted.length}件`, 'SYNC', 'DEBUG');
        
        for (const item of changes.deleted) {
          AppUtils.log('削除処理', 'SYNC', 'DEBUG', { id: item.id, name: item.name });
          
          // 在庫削除
          const invDelStmt = newMasterDb.prepare('DELETE FROM inventory WHERE part_id = ?');
          invDelStmt.run([item.id]);
          invDelStmt.free();
          
          // パーツ削除
          const partDelStmt = newMasterDb.prepare('DELETE FROM parts WHERE id = ?');
          partDelStmt.run([item.id]);
          partDelStmt.free();
        }
        
        AppUtils.log('削除処理完了', 'SYNC', 'DEBUG');
      }
      
      // 2. 追加処理
      if (changes.added && changes.added.length > 0) {
        AppUtils.log(`追加処理開始: ${changes.added.length}件`, 'SYNC', 'DEBUG');
        
        for (const item of changes.added) {
          AppUtils.log('追加処理', 'SYNC', 'DEBUG', { name: item.name });
          
          // 新しいIDを取得
          const maxIdResult = newMasterDb.exec('SELECT COALESCE(MAX(id), 0) + 1 as new_id FROM parts');
          const newId = maxIdResult[0].values[0][0];
          
          // パーツ追加
          const partStmt = newMasterDb.prepare(`
            INSERT INTO parts (
              id, name, category_id, manufacturer, part_number, package,
              voltage_rating, current_rating, power_rating, tolerance, logic_family,
              description, datasheet_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          partStmt.run([
            newId, 
            item.name, 
            item.category_id,
            item.manufacturer || null,
            item.part_number || null, 
            item.package || null, 
            item.voltage_rating || null,
            item.current_rating || null, 
            item.power_rating || null, 
            item.tolerance || null,
            item.logic_family || null, 
            item.description || null, 
            item.datasheet_url || null
          ]);
          partStmt.free();
          
          // 初期在庫追加
          const invStmt = newMasterDb.prepare(`
            INSERT INTO inventory (
              part_id, quantity, location, purchase_date, shop,
              price_per_unit, currency, memo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          invStmt.run([
            newId, 
            item.initial_stock || 0, 
            item.location || null,
            item.purchase_date || null, 
            item.shop || null,
            item.price_per_unit || null, 
            item.currency || 'JPY',
            item.memo || null
          ]);
          invStmt.free();
        }
        
        AppUtils.log('追加処理完了', 'SYNC', 'DEBUG');
      }
      
      // 3. 更新処理
      if (changes.modified && changes.modified.length > 0) {
        AppUtils.log(`更新処理開始: ${changes.modified.length}件`, 'SYNC', 'DEBUG');
        
        for (const item of changes.modified) {
          AppUtils.log('更新処理', 'SYNC', 'DEBUG', { id: item.id, name: item.changes.name });
          
          const updateStmt = newMasterDb.prepare(`
            UPDATE parts SET 
              name = ?, category_id = ?, manufacturer = ?, part_number = ?,
              package = ?, voltage_rating = ?, current_rating = ?, power_rating = ?,
              tolerance = ?, logic_family = ?, description = ?, datasheet_url = ?
            WHERE id = ?
          `);
          
          const changes_data = item.changes;
          updateStmt.run([
            changes_data.name, 
            changes_data.category_id, 
            changes_data.manufacturer || null,
            changes_data.part_number || null, 
            changes_data.package || null, 
            changes_data.voltage_rating || null,
            changes_data.current_rating || null, 
            changes_data.power_rating || null, 
            changes_data.tolerance || null,
            changes_data.logic_family || null, 
            changes_data.description || null, 
            changes_data.datasheet_url || null,
            item.id
          ]);
          updateStmt.free();
        }
        
        AppUtils.log('更新処理完了', 'SYNC', 'DEBUG');
      }
      
      // 4. 在庫更新処理
      if (changes.inventory && changes.inventory.length > 0) {
        AppUtils.log(`在庫更新処理開始: ${changes.inventory.length}件`, 'SYNC', 'DEBUG');
        
        for (const item of changes.inventory) {
          AppUtils.log('在庫更新処理', 'SYNC', 'DEBUG', { 
            partId: item.part_id, 
            quantity: item.new_quantity 
          });
          
          // 既存在庫チェック
          const checkStmt = newMasterDb.prepare('SELECT COUNT(*) FROM inventory WHERE part_id = ?');
          checkStmt.bind([item.part_id]);
          checkStmt.step();
          const exists = checkStmt.get()[0] > 0;
          checkStmt.free();
          
          if (exists) {
            // 在庫更新
            const updateStmt = newMasterDb.prepare('UPDATE inventory SET quantity = ? WHERE part_id = ?');
            updateStmt.run([item.new_quantity, item.part_id]);
            updateStmt.free();
          } else {
            // 在庫追加
            const insertStmt = newMasterDb.prepare('INSERT INTO inventory (part_id, quantity) VALUES (?, ?)');
            insertStmt.run([item.part_id, item.new_quantity]);
            insertStmt.free();
          }
        }
        
        AppUtils.log('在庫更新処理完了', 'SYNC', 'DEBUG');
      }
      
      newMasterDb.exec('COMMIT');
      
      AppUtils.log('マスターDB更新完了', 'SYNC', 'INFO');
      return newMasterDb;
      
    } catch (error) {
      AppUtils.log('マスターDB更新エラー', 'SYNC', 'ERROR', { error: error.message });
      
      if (newMasterDb) {
        try {
          newMasterDb.exec('ROLLBACK');
        } catch (rollbackError) {
          AppUtils.log('ロールバックエラー', 'SYNC', 'ERROR', { error: rollbackError.message });
        }
      }
      
      throw new Error(`データベース更新に失敗しました: ${error.message}`);
    }
  }
  
  /**
   * eparts.dbとしてダウンロード
   * ブラウザの標準ダウンロードAPI使用
   */
  static async downloadAsEpartsDb(database) {
    AppUtils.log('ファイルダウンロード開始', 'SYNC', 'INFO');
    
    try {
      const data = database.export();
      const blob = new Blob([data], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'eparts.db';
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      
      AppUtils.log('ファイルダウンロード完了', 'SYNC', 'INFO');
      
    } catch (error) {
      AppUtils.log('ファイルダウンロードエラー', 'SYNC', 'ERROR', { error: error.message });
      throw error;
    }
  }
}

// グローバル公開（既存パターンに準拠）
window.SyncManager = SyncManager;
window.syncToMaster = () => SyncManager.syncToMaster();

AppUtils.log('同期マネージャー読み込み完了', 'SYNC', 'INFO');