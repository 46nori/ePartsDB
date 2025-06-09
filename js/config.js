/* アプリケーション設定 */

const CONFIG = {
  // データベース設定
  DATABASE: {
    URL: './eparts.db',
    CDN_BASE: 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/',
    RETRY_ATTEMPTS: 50
  },
  
  // 在庫閾値
  THRESHOLDS: {
    STOCK_LOW: 5,
    STOCK_ZERO: 0
  },
  
  // UI設定
  UI: {
    DIALOG_LOAD_TIMEOUT: 5000,
    STATUS_AUTO_HIDE: 3000,
    SEARCH_PLACEHOLDER: 'パーツ名、型番、メーカーで検索（空白で全件表示）',
    SEARCH_HELP_MESSAGE: '検索ワードを入力して「検索」ボタンを押すか、空白で「検索」を押すと全件表示されます。<br><strong>1文字以上で部分一致検索が可能です。</strong>',
    STATUS_CLEAR_DELAY: 3000,  // ステータスメッセージクリア時間
    DIALOG_TIMEOUT: 500,       // ダイアログアニメーション
    DEBOUNCE_DELAY: 300        // 検索入力遅延
  },
  
  // 機能フラグ
  FEATURES: {
    ENABLE_LOCAL_EDITING: true,
    ENABLE_SORTING: true,
    ENABLE_SEARCH: true,
    ENABLE_CHANGE_TRACKING: true
  },
  
  // テーブル列インデックス
  TABLE_COLUMNS: {
    STOCK: 0,
    PART_NAME: 1,
    LOGIC_FAMILY: 2,
    PART_NUMBER: 3,
    PACKAGE: 4,
    DESCRIPTION: 5,
    CATEGORY: 6, // 検索結果でのみ使用
    ACTIONS: 7   // ローカル環境でのみ使用
  },
  
  // CSS クラス名
  CSS_CLASSES: {
    STOCK_ZERO: 'stock-zero',
    STOCK_LOW: 'stock-low',
    SORTABLE: 'sortable',
    SORT_ASC: 'sort-asc',
    SORT_DESC: 'sort-desc',
    TAB_ACTIVE: 'active',
    STATUS_ERROR: 'error'
  },
  
  // 環境判定用ホスト名
  LOCAL_HOSTS: [
    'localhost',
    '127.0.0.1',
    '',
    '.local'
  ],
  
  // 環境UI テンプレート
  ENV_UI: {
    LOCAL_ICON: '💻',
    REMOTE_ICON: '🌐',
    LOCAL_TEXT: 'ローカル環境（編集可能）',
    REMOTE_TEXT: 'リモート環境（読み取り専用）'
  },
  
  // ログ制御設定
  DEBUG: {
    ENABLED: false, // 本番環境では false、開発時は true
    LEVELS: ['ERROR', 'WARN', 'INFO', 'DEBUG'],
    MODULES: {
      DATABASE: true,
      DIALOGS: true,
      APP: true,
      UTILS: true
    }
  },
  
  // 🚨 統一：全制限値をLIMITSセクションに統合
  LIMITS: {
    // 基本フィールド制限
    MAX_QUANTITY: 9999,
    PART_NAME: 100,        // 旧VALIDATION.PART_NAME_MAX
    MANUFACTURER: 50,      // 旧VALIDATION.MANUFACTURER_MAX
    PART_NUMBER: 50,       // 旧VALIDATION.PART_NUMBER_MAX
    DESCRIPTION: 500,      // 旧VALIDATION.DESCRIPTION_MAX（500を採用、より実用的）
    MEMO: 500,
    LOCATION: 100,
    SHOP: 100,
    MAX_PRICE: 999999.99,
    
    // 検索・その他制限
    SEARCH_TERM_MAX: 100,  // 旧VALIDATION.SEARCH_TERM_MAX
    PACKAGE_MAX: 20,       // 旧VALIDATION.PACKAGE_MAX
    URL_MAX: 255,          // 旧VALIDATION.URL_MAX
    
    // 電気特性専用制限値
    ELECTRICAL: {
      VOLTAGE_RATING: 50,    // 耐圧入力制限
      CURRENT_RATING: 50,    // 電流制限入力制限
      POWER_RATING: 50,      // 定格電力入力制限
      TOLERANCE: 20,         // 誤差入力制限
      LOGIC_FAMILY: 50       // ロジックファミリ入力制限
    }
  }
};

// フリーズして変更を防止
Object.freeze(CONFIG);

// グローバル公開
window.CONFIG = CONFIG;