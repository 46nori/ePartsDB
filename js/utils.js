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
    
    console.log('🌐 環境判定 (CONFIG連携):', { hostname, protocol });
    
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
    console.log('判定結果:', result ? 'ローカル' : 'リモート');
    
    return result;
  }
  
  /**
   * パーツ名のフォーマット（データシートリンク対応）
   * @param {string} name - パーツ名
   * @param {string} datasheetUrl - データシートURL
   * @returns {string} フォーマット済みHTML
   */
  static formatPartName(name, datasheetUrl) {
    // ❌ 修正前: this.escapeHtml(name || '');
    // ✅ 修正後: AppUtils.escapeHtml(name || '');
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
   * デバッグ用ログ
   * @param {string} message - メッセージ
   * @param {string} context - コンテキスト
   * @param {any} data - 追加データ
   */
  static log(message, context = 'App', data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${context}] ${message}`;
    
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }
  
  /**
   * エラーログ
   * @param {Error|string} error - エラー
   * @param {string} context - コンテキスト
   */
  static logError(error, context = 'App') {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${timestamp}] [${context}] ERROR: ${errorMessage}`, error);
  }
  
  /**
   * 警告ログ
   * @param {string} message - 警告メッセージ
   * @param {string} context - コンテキスト
   */
  static logWarn(message, context = 'App') {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [${context}] WARN: ${message}`);
  }
}

// グローバル公開（後方互換性のため）
window.AppUtils = AppUtils;
window.escapeHtml = AppUtils.escapeHtml;
window.validateInput = AppUtils.validateInput;
window.formatPartName = AppUtils.formatPartName;
window.formatStockQuantityEditable = (qty, partId) => AppUtils.formatStockQuantity(qty, partId, true);
window.formatStockQuantity = AppUtils.formatStockQuantityReadOnly;
window.getCellValue = AppUtils.getCellValue;
window.updateStockCellStyle = AppUtils.updateStockCellStyle;

console.log('✅ AppUtils class loaded successfully');