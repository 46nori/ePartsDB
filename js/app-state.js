/* アプリケーション状態管理 */

class AppState {
  constructor() {
    // データベース関連
    this.db = null;
    this.originalDb = null;
    
    // ビュー状態
    this.currentView = 'categories';
    this.currentTab = 'categories';
    this.currentCategoryId = null;
    this.currentCategoryName = '';
    
    // ソート状態
    this.currentSortColumn = '';
    this.currentSortDirection = 'asc';
    
    // 環境情報
    this.isLocalEnvironment = AppUtils.checkLocalEnvironment();
    
    // 変更追跡
    this.hasLocalChanges = false;
    this.localChanges = {
      added: [],
      modified: [],
      deleted: [],
      inventory: []
    };
    
    AppUtils.log('AppState initialized', 'State', {
      isLocal: this.isLocalEnvironment,
      currentView: this.currentView
    });
  }
  
  /**
   * データベース設定
   * @param {Database} db - 作業用データベース
   * @param {Database} originalDb - マスターデータベース（オプション）
   */
  setDatabase(db, originalDb = null) {
    this.db = db;
    this.originalDb = originalDb || db;
    
    // グローバル公開（後方互換性）
    window.db = db;
    
    AppUtils.log('Database set', 'State', {
      hasOriginal: !!originalDb,
      isLocal: this.isLocalEnvironment
    });
  }
  
  /**
   * ビュー状態更新
   * @param {string} view - ビュー名（'categories', 'parts', 'search'）
   * @param {number|null} categoryId - カテゴリID（オプション）
   * @param {string} categoryName - カテゴリ名（オプション）
   */
  setCurrentView(view, categoryId = null, categoryName = '') {
    const previousView = this.currentView;
    
    this.currentView = view;
    this.currentCategoryId = categoryId;
    this.currentCategoryName = categoryName;
    
    // グローバル変数更新（後方互換性）
    window.currentView = view;
    window.currentCategoryId = categoryId;
    window.currentCategoryName = categoryName;
    
    AppUtils.log(`View changed: ${previousView} → ${view}`, 'State', {
      categoryId,
      categoryName
    });
  }
  
  /**
   * タブ状態更新
   * @param {string} tab - タブ名
   */
  setCurrentTab(tab) {
    const previousTab = this.currentTab;
    this.currentTab = tab;
    
    AppUtils.log(`Tab changed: ${previousTab} → ${tab}`, 'State');
  }
  
  /**
   * ソート状態更新
   * @param {string} column - ソート列
   * @param {string} direction - ソート方向（'asc' or 'desc'）
   */
  setSortState(column, direction) {
    this.currentSortColumn = column;
    this.currentSortDirection = direction;
    
    AppUtils.log(`Sort state: ${column} ${direction}`, 'State');
  }
  
  /**
   * 変更追跡
   * @param {string} type - 変更タイプ（'added', 'modified', 'deleted', 'inventory'）
   * @param {Object} data - 変更データ
   */
  trackChange(type, data) {
    if (!this.isLocalEnvironment || !CONFIG.FEATURES.ENABLE_CHANGE_TRACKING) {
      return;
    }
    
    const changeRecord = {
      ...data,
      timestamp: new Date().toISOString(),
      id: this.generateChangeId()
    };
    
    this.localChanges[type].push(changeRecord);
    this.hasLocalChanges = true;
    
    AppUtils.log(`Change tracked: ${type}`, 'State', changeRecord);
  }
  
  /**
   * 変更ID生成
   * @returns {string} ユニークな変更ID
   */
  generateChangeId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 変更統計取得
   * @returns {Object} 変更統計
   */
  getChangeStats() {
    const stats = {
      added: this.localChanges.added.length,
      modified: this.localChanges.modified.length,
      deleted: this.localChanges.deleted.length,
      inventory: this.localChanges.inventory.length
    };
    
    stats.total = Object.values(stats).reduce((sum, count) => sum + count, 0);
    
    return stats;
  }
  
  /**
   * 変更履歴クリア
   */
  clearChanges() {
    const previousStats = this.getChangeStats();
    
    this.localChanges = {
      added: [],
      modified: [],
      deleted: [],
      inventory: []
    };
    this.hasLocalChanges = false;
    
    AppUtils.log('Changes cleared', 'State', {
      previousTotal: previousStats.total
    });
  }
  
  /**
   * 特定タイプの変更履歴取得
   * @param {string} type - 変更タイプ
   * @returns {Array} 変更履歴
   */
  getChangesByType(type) {
    return [...this.localChanges[type]]; // コピーを返す
  }
  
  /**
   * 全変更履歴取得
   * @returns {Object} 全変更履歴のコピー
   */
  getAllChanges() {
    return {
      added: [...this.localChanges.added],
      modified: [...this.localChanges.modified],
      deleted: [...this.localChanges.deleted],
      inventory: [...this.localChanges.inventory]
    };
  }
  
  /**
   * 状態リセット（データベースはそのまま）
   */
  resetState() {
    AppUtils.log('State reset requested', 'State');
    
    this.currentView = 'categories';
    this.currentTab = 'categories';
    this.currentCategoryId = null;
    this.currentCategoryName = '';
    this.currentSortColumn = '';
    this.currentSortDirection = 'asc';
    
    this.clearChanges();
    
    // グローバル変数も更新
    window.currentView = this.currentView;
    window.currentCategoryId = this.currentCategoryId;
    window.currentCategoryName = this.currentCategoryName;
  }
  
  /**
   * 状態の詳細情報取得（デバッグ用）
   * @returns {Object} 状態の詳細情報
   */
  getStateInfo() {
    return {
      database: {
        hasDb: !!this.db,
        hasOriginalDb: !!this.originalDb
      },
      view: {
        current: this.currentView,
        tab: this.currentTab,
        categoryId: this.currentCategoryId,
        categoryName: this.currentCategoryName
      },
      sort: {
        column: this.currentSortColumn,
        direction: this.currentSortDirection
      },
      environment: {
        isLocal: this.isLocalEnvironment
      },
      changes: this.getChangeStats()
    };
  }
}

// シングルトンインスタンス作成
const appState = new AppState();

// グローバル公開
window.appState = appState;
window.AppState = AppState;

// 後方互換性のためのグローバル変数（既存コードで使用）
window.currentView = appState.currentView;
window.currentTab = appState.currentTab;
window.currentCategoryId = appState.currentCategoryId;
window.currentCategoryName = appState.currentCategoryName;
window.currentSortColumn = appState.currentSortColumn;
window.currentSortDirection = appState.currentSortDirection;
window.isLocalEnvironment = appState.isLocalEnvironment;
window.hasLocalChanges = appState.hasLocalChanges;
window.localChanges = appState.localChanges;

AppUtils.log('AppState module loaded', 'State');

// 修正: trackChange() 関数 - 拡張カラム対応
function trackChange(type, data) {
  if (!window.appState) {
    console.warn('⚠️ appState が初期化されていません');
    return;
  }
  
  const timestamp = new Date().toISOString();
  
  switch (type) {
    case 'add':
      window.appState.localChanges.added.push({
        tempId: generateTempId(),
        timestamp: timestamp,
        
        // 基本情報
        name: data.name || '',
        category_id: data.category_id || null,
        manufacturer: data.manufacturer || '',
        part_number: data.part_number || '',
        package: data.package || '',
        description: data.description || '',
        datasheet_url: data.datasheet_url || '',
        
        // ✅ 拡張情報（新規対応）
        voltage_rating: data.voltage_rating || '',
        current_rating: data.current_rating || '',
        power_rating: data.power_rating || '',
        tolerance: data.tolerance || '',
        logic_family: data.logic_family || '',
        
        // ✅ 在庫拡張情報（新規対応）
        initial_stock: data.initial_stock || 0,
        location: data.location || '',
        purchase_date: data.purchase_date || '',
        shop: data.shop || '',
        price_per_unit: data.price_per_unit || null,
        currency: data.currency || 'JPY',
        memo: data.memo || ''
      });
      
      AppUtils.log(`変更追跡: パーツ追加 - ${data.name}`, 'AppState');
      break;
      
    case 'modify':
      // ✅ 変更前後の全カラムデータを記録
      const modifyRecord = {
        id: data.id,
        timestamp: timestamp,
        changes: {
          // 基本情報
          name: data.newValues.name || '',
          category_id: data.newValues.category_id || null,
          manufacturer: data.newValues.manufacturer || '',
          part_number: data.newValues.part_number || '',
          package: data.newValues.package || '',
          description: data.newValues.description || '',
          datasheet_url: data.newValues.datasheet_url || '',
          
          // ✅ 拡張情報（新規対応）
          voltage_rating: data.newValues.voltage_rating || '',
          current_rating: data.newValues.current_rating || '',
          power_rating: data.newValues.power_rating || '',
          tolerance: data.newValues.tolerance || '',
          logic_family: data.newValues.logic_family || '',
          
          // ✅ 在庫拡張情報（新規対応）
          quantity: data.newValues.quantity || 0,
          location: data.newValues.location || '',
          purchase_date: data.newValues.purchase_date || '',
          shop: data.newValues.shop || '',
          price_per_unit: data.newValues.price_per_unit || null,
          currency: data.newValues.currency || 'JPY',
          memo: data.newValues.memo || ''
        },
        original: {
          // 変更前の値（全カラム対応）
          name: data.oldValues.name || '',
          category_id: data.oldValues.category_id || null,
          manufacturer: data.oldValues.manufacturer || '',
          part_number: data.oldValues.part_number || '',
          package: data.oldValues.package || '',
          description: data.oldValues.description || '',
          datasheet_url: data.oldValues.datasheet_url || '',
          
          // ✅ 拡張情報（新規対応）
          voltage_rating: data.oldValues.voltage_rating || '',
          current_rating: data.oldValues.current_rating || '',
          power_rating: data.oldValues.power_rating || '',
          tolerance: data.oldValues.tolerance || '',
          logic_family: data.oldValues.logic_family || '',
          
          // ✅ 在庫拡張情報（新規対応）
          quantity: data.oldValues.quantity || 0,
          location: data.oldValues.location || '',
          purchase_date: data.oldValues.purchase_date || '',
          shop: data.oldValues.shop || '',
          price_per_unit: data.oldValues.price_per_unit || null,
          currency: data.oldValues.currency || 'JPY',
          memo: data.oldValues.memo || ''
        }
      };
      
      window.appState.localChanges.modified.push(modifyRecord);
      
      AppUtils.log(`変更追跡: パーツ変更 - ID:${data.id}, 名前:${data.newValues.name}`, 'AppState');
      break;
      
    case 'delete':
      window.appState.localChanges.deleted.push({
        id: data.id,
        timestamp: timestamp,
        name: data.name || '',
        part_number: data.part_number || ''
      });
      
      AppUtils.log(`変更追跡: パーツ削除 - ID:${data.id}, 名前:${data.name}`, 'AppState');
      break;
      
    case 'inventory':
      window.appState.localChanges.inventory.push({
        part_id: data.part_id,
        timestamp: timestamp,
        old_quantity: data.old_quantity || 0,
        new_quantity: data.new_quantity || 0
      });
      
      AppUtils.log(`変更追跡: 在庫変更 - パーツID:${data.part_id}, ${data.old_quantity} → ${data.new_quantity}`, 'AppState');
      break;
      
    default:
      console.warn('⚠️ 未知の変更タイプ:', type);
      return;
  }
  
  // 状態更新
  window.appState.hasLocalChanges = true;
  
  // UI更新
  updateChangeIndicator();
  updateSyncButton();
  
  // localStorage保存
  saveStateToLocalStorage();
}