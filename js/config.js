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
  
  // バリデーション制限
  VALIDATION: {
    PART_NAME_MAX: 100,
    DESCRIPTION_MAX: 200,
    SEARCH_TERM_MAX: 100,
    PART_NUMBER_MAX: 50,
    MANUFACTURER_MAX: 50,
    PACKAGE_MAX: 20,
    URL_MAX: 255
  },
  
  // UI設定
  UI: {
    DIALOG_LOAD_TIMEOUT: 5000,
    STATUS_AUTO_HIDE: 3000,
    SEARCH_PLACEHOLDER: 'パーツ名、型番、メーカーで検索（空白で全件表示）',
    SEARCH_HELP_MESSAGE: '検索ワードを入力して「検索」ボタンを押すか、空白で「検索」を押すと全件表示されます。<br><strong>1文字以上で部分一致検索が可能です。</strong>'
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
  }
};

// フリーズして変更を防止
Object.freeze(CONFIG);

// グローバル公開
window.CONFIG = CONFIG;