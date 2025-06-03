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