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

      AppUtils.log('ファイルダウンロード完了', 'SYNC', 'INFO');

      // 5. 状態クリア（既存APIを利用）
      state.clearChanges();
      AppUtils.log('状態クリア完了', 'SYNC', 'DEBUG');

      // 6. UI更新（既存機能を利用）
      if (typeof window.refreshCurrentView === 'function') {
        window.refreshCurrentView();
      }

      // 状態更新（統合）
      setTimeout(() => {
        this.forceUpdateSyncState();
      }, 100);

      AppUtils.log('同期完了', 'SYNC', 'INFO', { totalChanges: stats.total });
      
    } catch (error) {
      // 🔧 修正: キャンセル時の特別処理
      if (error.message === 'SYNC_CANCELLED') {
        AppUtils.log('同期キャンセル（ファイル保存時）', 'SYNC', 'INFO');
        // キャンセル時は何もしない - 状態も変更データも保持
        return;
      }
      
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
        AppUtils.log(`削除処理開始: ${changes.deleted.length}件`, 'SYNC', 'INFO');
        
        for (const item of changes.deleted) {
          // 在庫削除 → パーツ削除の順序で実行
          const invDelStmt = newMasterDb.prepare('DELETE FROM inventory WHERE part_id = ?');
          invDelStmt.run([item.id]);
          invDelStmt.free();
          
          const partDelStmt = newMasterDb.prepare('DELETE FROM parts WHERE id = ?');
          partDelStmt.run([item.id]);
          partDelStmt.free();
        }
        
        AppUtils.log(`削除処理完了: ${changes.deleted.length}件`, 'SYNC', 'INFO');
      }
      
      // 2. 追加処理
      if (changes.added && changes.added.length > 0) {
        AppUtils.log(`追加処理開始: ${changes.added.length}件`, 'SYNC', 'INFO');
        
        for (const item of changes.added) {
          AppUtils.log('パーツ追加実行', 'SYNC', 'INFO', { name: item.name });
          
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
        AppUtils.log(`更新処理開始: ${changes.modified.length}件`, 'SYNC', 'INFO');
        
        for (const item of changes.modified) {
          AppUtils.log('パーツ更新実行', 'SYNC', 'INFO', { id: item.id, name: item.changes.name });
          
          const updateStmt = newMasterDb.prepare(`
            UPDATE parts SET 
              name = ?, category_id = ?, manufacturer = ?, part_number = ?,
              package = ?, voltage_rating = ?, current_rating = ?, power_rating = ?,
              tolerance = ?, logic_family = ?, description = ?, datasheet_url = ?
            WHERE id = ?
          `);
          
          const modifiedData = item.changes;  // より明確な命名
          updateStmt.run([
            modifiedData.name, 
            modifiedData.category_id, 
            modifiedData.manufacturer || null,
            modifiedData.part_number || null, 
            modifiedData.package || null, 
            modifiedData.voltage_rating || null,
            modifiedData.current_rating || null, 
            modifiedData.power_rating || null, 
            modifiedData.tolerance || null,
            modifiedData.logic_family || null, 
            modifiedData.description || null, 
            modifiedData.datasheet_url || null,
            item.id
          ]);
          updateStmt.free();
        }
        
        AppUtils.log('更新処理完了', 'SYNC', 'DEBUG');
      }
      
      // 4. 在庫更新処理
      if (changes.inventory && changes.inventory.length > 0) {
        AppUtils.log(`在庫更新処理開始: ${changes.inventory.length}件`, 'SYNC', 'INFO');
        
        for (const item of changes.inventory) {
          AppUtils.log('在庫更新実行', 'SYNC', 'INFO', { 
            partId: item.part_id, 
            quantity: item.new_quantity 
          });
          
          // 🔧 改善: UPSERTで1クエリに最適化
          const upsertStmt = newMasterDb.prepare(`
            INSERT INTO inventory (part_id, quantity) VALUES (?, ?)
            ON CONFLICT(part_id) DO UPDATE SET quantity = excluded.quantity
          `);
          upsertStmt.run([item.part_id, item.new_quantity]);
          upsertStmt.free();
        }
        
        AppUtils.log('在庫更新処理完了', 'SYNC', 'INFO');
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
   * File System Access API優先、Safari対応フォールバック
   * CONFIG統合版
   */
  static async downloadAsEpartsDb(database) {
    AppUtils.log('ファイルダウンロード開始', 'SYNC', 'INFO');
    
    try {
      const data = database.export();
      
      // CONFIG からファイル名を取得
      const fileName = CONFIG.DATABASE.URL.replace('./', ''); // 'eparts.db'
      
      // File System Access API対応（Chrome/Edge）
      if ('showSaveFilePicker' in window) {
        try {
          AppUtils.log('File System Access API使用', 'SYNC', 'DEBUG');
          
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: fileName,  // CONFIG参照
            types: [{
              description: 'SQLite Database Files',
              accept: {
                'application/x-sqlite3': ['.db'],
                'application/octet-stream': ['.db']
              }
            }],
            excludeAcceptAllOption: true
          });
          
          const writable = await fileHandle.createWritable();
          await writable.write(data);
          await writable.close();
          
          AppUtils.log('File System Access API保存完了', 'SYNC', 'INFO');
          return;
          
        } catch (error) {
          if (error.name === 'AbortError') {
            AppUtils.log('ファイル保存キャンセル', 'SYNC', 'INFO');
            // 🔧 修正: キャンセル専用エラーをthrow
            throw new Error('SYNC_CANCELLED');
          }
          
          AppUtils.log('File System Access API失敗、フォールバック', 'SYNC', 'WARN', { 
            error: error.message 
          });
        }
      }
      
      // Safari/Firefox用フォールバック
      AppUtils.log('従来ダウンロード方式使用', 'SYNC', 'DEBUG');
      
      const blob = new Blob([data], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;  // CONFIG参照
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      
      AppUtils.log('ファイルダウンロード完了（従来方式）', 'SYNC', 'INFO');
      
    } catch (error) {
      AppUtils.log('ファイルダウンロードエラー', 'SYNC', 'ERROR', { error: error.message });
      throw error;
    }
  }
  
  /**
   * 強制的な同期ボタン・状態更新
   */
  static forceUpdateSyncState() {
    try {
      // 1. 同期ボタンの強制無効化
      const syncBtn = document.getElementById('sync-btn');
      if (syncBtn) {
        syncBtn.disabled = true;
        syncBtn.textContent = '🔄 同期';
        syncBtn.classList.remove('has-changes');
      }
      
      // 2. 変更インジケーターの強制非表示
      const changeIndicators = document.querySelectorAll('.change-indicator, .sync-indicator');
      changeIndicators.forEach(indicator => {
        indicator.style.display = 'none';
      });
      
      // 3. app.js の updateSyncButton 強制呼び出し
      if (typeof window.updateSyncButton === 'function') {
        window.updateSyncButton();
      }
      
      AppUtils.log('強制同期状態更新完了', 'SYNC', 'DEBUG');
      
    } catch (error) {
      AppUtils.log('強制同期状態更新エラー', 'SYNC', 'ERROR', { error: error.message });
    }
  }
}

// グローバル公開（既存パターンに準拠）
window.SyncManager = SyncManager;
window.syncToMaster = () => SyncManager.syncToMaster();

AppUtils.log('同期マネージャー読み込み完了', 'SYNC', 'INFO');
// 同期完了 - サイレント処理（全ブラウザ統一）