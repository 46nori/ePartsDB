/* 共通ユーティリティ関数 */

class AppUtils {
  /**
   * HTML エスケープ
   * @param {any} unsafe - エスケープする値
   * @returns {string} エスケープされた文字列
   */
  static escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;")
      .replace(/`/g, "&#x60;")
      .replace(/=/g, "&#x3D;");
  }
  
  /**
   * 入力検証とサニタイズ
   * @param {any} input - 検証する入力値
   * @param {string} type - 検証タイプ（'string', 'number', 'search'）
   * @param {number} maxLength - 最大長（デフォルト: 255）
   * @returns {string|number} 検証済みの値
   */
  static validateInput(input, type = 'string', maxLength = 255) {
    if (input === null || input === undefined) {
      return '';
    }
    
    const str = String(input).trim();
    
    switch (type) {
      case 'number':
        const num = parseInt(str, 10);
        return isNaN(num) ? 0 : Math.max(0, num);
      case 'string':
        return str.substring(0, maxLength);
      case 'search':
        // 検索用：危険な文字を除去
        return str.substring(0, maxLength).replace(/[<>\"'&;()]/g, '');
      default:
        return str.substring(0, maxLength);
    }
  }
  
  /**
   * ローカル環境判定（CONFIG連携版）
   * @returns {boolean} ローカル環境の場合true
   */
  static checkLocalEnvironment() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // 🚨 修正: 統一ログシステムを使用
    AppUtils.log(`環境判定開始`, 'UTILS', 'DEBUG', { hostname, protocol });
    
    // CONFIG.LOCAL_HOSTSを活用（フォールバック付き）
    const LOCAL_HOSTS = (typeof CONFIG !== 'undefined' && CONFIG.LOCAL_HOSTS) ? 
      CONFIG.LOCAL_HOSTS : ['localhost', '127.0.0.1', '', '.local'];
    
    // ホスト名による判定
    const isLocalHost = LOCAL_HOSTS.some(host => {
      if (host === '') {
        return hostname === ''; // file://プロトコル
      }
      return hostname === host || hostname.endsWith(host);
    });
    
    // file://プロトコルによる判定
    const isFileProtocol = protocol === 'file:';
    
    const result = isLocalHost || isFileProtocol;
    
    // 🚨 修正: 統一ログシステムを使用
    AppUtils.log(`環境判定完了: ${result ? 'ローカル' : 'リモート'}`, 'UTILS', 'INFO');
    
    return result;
  }
  
  /**
   * パーツ名のフォーマット（データシートリンク対応）
   * @param {string} name - パーツ名
   * @param {string} datasheetUrl - データシートURL
   * @returns {string} フォーマット済みHTML
   */
  static formatPartName(name, datasheetUrl) {
    const partName = AppUtils.escapeHtml(name || '');
    
    if (datasheetUrl && datasheetUrl.trim() !== '') {
      try {
        const url = new URL(datasheetUrl);
        if (url.protocol === 'https:' || url.protocol === 'http:') {
          return `<a href="${AppUtils.escapeHtml(datasheetUrl)}" target="_blank" rel="noopener noreferrer">${partName}</a>`;
        }
      } catch (e) {
        console.warn('Invalid URL detected:', datasheetUrl);
      }
    }
    
    return partName;
  }
  
  /**
   * 在庫数のフォーマット（編集可能版）
   * @param {number} quantity - 在庫数
   * @param {number} partId - パーツID
   * @param {boolean} isEditable - 編集可能かどうか
   * @returns {string} フォーマット済みHTML
   */
  static formatStockQuantity(quantity, partId, isEditable = false) {
    const qty = quantity !== null ? quantity : 0;
    let stockClass = '';
    
    // CONFIG が未定義の場合のフォールバック
    const STOCK_ZERO = (typeof CONFIG !== 'undefined' && CONFIG.THRESHOLDS) ? CONFIG.THRESHOLDS.STOCK_ZERO : 0;
    const STOCK_LOW = (typeof CONFIG !== 'undefined' && CONFIG.THRESHOLDS) ? CONFIG.THRESHOLDS.STOCK_LOW : 5;
    const STOCK_ZERO_CLASS = (typeof CONFIG !== 'undefined' && CONFIG.CSS_CLASSES) ? CONFIG.CSS_CLASSES.STOCK_ZERO : 'stock-zero';
    const STOCK_LOW_CLASS = (typeof CONFIG !== 'undefined' && CONFIG.CSS_CLASSES) ? CONFIG.CSS_CLASSES.STOCK_LOW : 'stock-low';
    
    if (qty === STOCK_ZERO) {
      stockClass = STOCK_ZERO_CLASS;
    } else if (qty < STOCK_LOW) {
      stockClass = STOCK_LOW_CLASS;
    }
    
    if (isEditable) {
      return `
        <div class="stock-editor" data-part-id="${partId}">
          <input type="number" class="stock-input ${stockClass}" value="${qty}" min="0" max="9999" step="1">
        </div>
      `;
    } else {
      return `<span class="${stockClass}">${qty}</span>`;
    }
  }
  
  /**
   * 在庫数のフォーマット（読み取り専用版）
   * @param {number} quantity - 在庫数
   * @returns {string} フォーマット済みHTML
   */
  static formatStockQuantityReadOnly(quantity) {
    const qty = quantity !== null ? quantity : 0;
    
    // CONFIG が未定義の場合のフォールバック
    const STOCK_ZERO = (typeof CONFIG !== 'undefined' && CONFIG.THRESHOLDS) ? CONFIG.THRESHOLDS.STOCK_ZERO : 0;
    const STOCK_LOW = (typeof CONFIG !== 'undefined' && CONFIG.THRESHOLDS) ? CONFIG.THRESHOLDS.STOCK_LOW : 5;
    const STOCK_ZERO_CLASS = (typeof CONFIG !== 'undefined' && CONFIG.CSS_CLASSES) ? CONFIG.CSS_CLASSES.STOCK_ZERO : 'stock-zero';
    const STOCK_LOW_CLASS = (typeof CONFIG !== 'undefined' && CONFIG.CSS_CLASSES) ? CONFIG.CSS_CLASSES.STOCK_LOW : 'stock-low';
    
    if (qty === STOCK_ZERO) {
      return `<span class="${STOCK_ZERO_CLASS}">${qty}</span>`;
    }
    if (qty < STOCK_LOW) {
      return `<span class="${STOCK_LOW_CLASS}">${qty}</span>`;
    }
    return qty;
  }
  
  /**
   * セルの値を安全に取得（テーブルソート用）
   * @param {HTMLElement} cell - セル要素
   * @param {number} columnIndex - カラムインデックス
   * @returns {string} セル値
   */
  static getCellValue(cell, columnIndex) {
    if (!cell) return '';
    
    if (columnIndex === 0) { // 在庫数列
      const input = cell.querySelector('.stock-input');
      if (input) {
        return input.value || '0';
      }
      return cell.textContent.trim();
    }
    
    // リンクがある場合はテキストのみ取得
    const link = cell.querySelector('a');
    if (link) {
      return link.textContent.trim();
    }
    
    return cell.textContent.trim();
  }

  /**
   * 在庫セルのスタイル更新
   * @param {number} partId - パーツID
   * @param {number} quantity - 在庫数
   */
  static updateStockCellStyle(partId, quantity) {
    const stockInputs = document.querySelectorAll(`.stock-editor[data-part-id="${partId}"] .stock-input`);
    
    stockInputs.forEach(input => {
      // 既存のクラスを削除
      input.classList.remove('stock-zero', 'stock-low');
      
      // CONFIG が未定義の場合のフォールバック
      const STOCK_LOW_THRESHOLD = (typeof CONFIG !== 'undefined' && CONFIG.THRESHOLDS) ? 
        CONFIG.THRESHOLDS.STOCK_LOW : 5;
      
      // 新しいクラスを追加
      if (quantity === 0) {
        input.classList.add('stock-zero');
      } else if (quantity < STOCK_LOW_THRESHOLD) {
        input.classList.add('stock-low');
      }
    });
  }
  
  /**
   * 統一ログ出力システム
   * @param {string} message - ログメッセージ
   * @param {string} module - モジュール名（DATABASE, DIALOGS, APP, UTILS）
   * @param {string} level - ログレベル（ERROR, WARN, INFO, DEBUG）
   * @param {*} data - 追加データ（オプション）
   */
  static log(message, module = 'APP', level = 'INFO', data = null) {
    // CONFIG が利用できない場合は通常のconsole.logにフォールバック
    if (typeof CONFIG === 'undefined' || !CONFIG.DEBUG) {
      console.log(`[${module}] ${message}`, data || '');
      return;
    }
    
    // デバッグが無効、または対象モジュールが無効の場合は出力しない
    if (!CONFIG.DEBUG.ENABLED || !CONFIG.DEBUG.MODULES[module]) {
      return;
    }
    
    // ログレベルが設定に含まれていない場合は出力しない
    if (!CONFIG.DEBUG.LEVELS.includes(level)) {
      return;
    }
    
    // ログレベルに応じたアイコンと色分け
    const icons = {
      'ERROR': '❌',
      'WARN': '⚠️',
      'INFO': 'ℹ️',
      'DEBUG': '🔍'
    };
    
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const icon = icons[level] || 'ℹ️';
    const prefix = `${icon} [${timestamp}] ${module}`;
    
    // データがある場合は一緒に出力
    if (data !== null) {
      console.log(`${prefix}: ${message}`, data);
    } else {
      console.log(`${prefix}: ${message}`);
    }
  }
  
  /**
   * エラーログ専用ショートカット
   */
  static logError(message, module = 'APP', data = null) {
    this.log(message, module, 'ERROR', data);
  }
  
  /**
   * 警告ログ専用ショートカット
   */
  static logWarn(message, module = 'APP', data = null) {
    this.log(message, module, 'WARN', data);
  }
  
  /**
   * デバッグログ専用ショートカット
   */
  static logDebug(message, module = 'APP', data = null) {
    this.log(message, module, 'DEBUG', data);
  }
}

// 🚨 グローバル関数整理: AppUtilsクラスのみをグローバル公開
window.AppUtils = AppUtils;

// 🚨 修正: 統一ログシステムを使用
AppUtils.log('AppUtils class loaded successfully (ログ最適化版)', 'UTILS', 'INFO');
AppUtils.log('使用方法: AppUtils.escapeHtml(), AppUtils.log() など', 'UTILS', 'DEBUG');