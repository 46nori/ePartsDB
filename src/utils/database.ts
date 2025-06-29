import { Category, PartWithInventory } from '../types';

// 開発環境でのみログ出力する関数
const devLog = (message: string, ...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log(message, ...args);
  }
};

// サンプルデータの型定義
interface SampleData {
  categories: Category[];
  parts: PartWithInventory[];
}

// sql.jsをrequire形式で読み込む簡易版
// NOTE: パフォーマンス最適化のため、sql.jsはCDNから動的読み込みを使用
export class DatabaseManager {
  private hasChanges = false;
  private sampleData: SampleData | null = null;
  private useSampleData = true;
  private db?: any; // sql.js Database instance

  /**
   * データベースを初期化する
   */
  async initialize(): Promise<void> {
    try {
      // 1. script要素でsql.jsを動的読み込み
      await this.loadSqlJs();
      
      // 2. データベースファイル読み込み
      await this.loadDatabase();
      
      this.useSampleData = false;
    } catch (error) {
      console.error('SQLiteデータベース初期化エラー:', error);
      this.initializeWithSampleData();
    }
  }

  /**
   * sql.jsをスクリプトタグで読み込む
   */
  private loadSqlJs(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 既に読み込まれている場合
      if ((window as any).initSqlJs) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://sql.js.org/dist/sql-wasm.js';
      script.onload = () => {
        resolve();
      };
      script.onerror = () => {
        reject(new Error('sql.jsの読み込みに失敗しました'));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * SQLiteデータベースファイルを読み込む
   */
  private async loadDatabase(): Promise<void> {
    try {
      // sql.jsを初期化
      const SQL = await (window as any).initSqlJs({
        locateFile: (file: string) => `https://sql.js.org/dist/${file}`
      });
      
      // データベースファイルを取得
      const response = await fetch('./database/eparts.db');
      if (!response.ok) {
        throw new Error(`データベースファイルが見つかりません (status: ${response.status})`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const db = new SQL.Database(uint8Array);
      
      // データベースの内容を確認
      this.verifyDatabase(db);
      this.db = db;
      
    } catch (error) {
      console.error('データベース読み込みエラー:', error);
      throw error;
    }
  }

  /**
   * データベースの内容を確認する
   */
  private verifyDatabase(db: any): void {
    try {
      // データベースの基本的な確認のみ実行
      db.exec("SELECT name FROM sqlite_master WHERE type='table'");
    } catch (error) {
      console.error('データベース確認エラー:', error);
    }
  }

  /**
   * カテゴリ一覧を取得する
   */
  getCategories(): Category[] {
    // サンプルデータモードの場合
    if (this.useSampleData && this.sampleData) {
      return this.sampleData.categories.sort((a: Category, b: Category) => a.display_order - b.display_order);
    }
    
    const db = this.db;
    if (!db) {
      console.warn('データベースが初期化されていません');
      return [];
    }

    try {
      const result = db.exec('SELECT id, name, parent_id, display_order FROM categories ORDER BY display_order');
      if (result.length === 0) return [];

      const categories: Category[] = [];
      const rows = result[0];
      
      for (let i = 0; i < rows.values.length; i++) {
        const row = rows.values[i];
        categories.push({
          id: row[0],
          name: row[1],
          parent_id: row[2],
          display_order: row[3]
        });
      }

      return categories;
    } catch (error) {
      console.error('カテゴリ取得エラー:', error);
      return [];
    }
  }

  /**
   * パーツと在庫情報を取得する
   */
  getPartsWithInventory(categoryId?: number, keyword?: string): PartWithInventory[] {
    // サンプルデータモードの場合
    if (this.useSampleData && this.sampleData) {
      let filteredParts = this.sampleData.parts;

      if (categoryId) {
        filteredParts = filteredParts.filter((part: PartWithInventory) => part.category_id === categoryId);
      }

      if (keyword && keyword.trim()) {
        const searchTerm = keyword.toLowerCase();
        filteredParts = filteredParts.filter((part: PartWithInventory) => 
          part.name.toLowerCase().includes(searchTerm) ||
          (part.part_number && part.part_number.toLowerCase().includes(searchTerm)) ||
          (part.manufacturer && part.manufacturer.toLowerCase().includes(searchTerm)) ||
          (part.description && part.description.toLowerCase().includes(searchTerm))
        );
      }

      return filteredParts;
    }

    const db = this.db;
    if (!db) {
      console.warn('データベースが初期化されていません');
      return [];
    }

    try {
      let query: string;
      let params: any[] = [];

      const baseQuery = `
        SELECT 
          p.id,
          p.name,
          p.category_id,
          p.manufacturer,
          p.part_number,
          p.package,
          p.description,
          p.created_at,
          COALESCE(i.quantity, 0) as quantity,
          COALESCE(i.location, '') as location,
          p.voltage_rating,
          p.current_rating,
          p.power_rating,
          p.tolerance,
          p.logic_family,
          p.datasheet_url,
          i.purchase_date,
          i.shop,
          i.price_per_unit,
          COALESCE(i.currency, 'JPY') as currency,
          i.memo
        FROM parts p
        LEFT JOIN inventory i ON p.id = i.part_id
      `;

      if (categoryId && keyword && keyword.trim()) {
        // カテゴリとキーワード両方
        query = baseQuery + `
          WHERE p.category_id = ? AND (
            p.name LIKE ? OR 
            p.part_number LIKE ? OR 
            p.manufacturer LIKE ? OR 
            p.description LIKE ?
          ) ORDER BY p.name
        `;
        const searchTerm = `%${keyword.trim()}%`;
        params = [categoryId, searchTerm, searchTerm, searchTerm, searchTerm];
      } else if (categoryId) {
        // カテゴリのみ
        query = baseQuery + ' WHERE p.category_id = ? ORDER BY p.name';
        params = [categoryId];
      } else if (keyword && keyword.trim()) {
        // キーワードのみ
        query = baseQuery + `
          WHERE (
            p.name LIKE ? OR 
            p.part_number LIKE ? OR 
            p.manufacturer LIKE ? OR 
            p.description LIKE ?
          ) ORDER BY p.name
        `;
        const searchTerm = `%${keyword.trim()}%`;
        params = [searchTerm, searchTerm, searchTerm, searchTerm];
      } else {
        // 条件なし（全件）
        query = baseQuery + ' ORDER BY p.name';
        params = [];
      }

      let result;
      if (params.length > 0) {
        // パラメータがある場合はprepareを使用
        const stmt = db.prepare(query);
        stmt.bind(params);
        result = [];
        while (stmt.step()) {
          const row = stmt.get();
          result.push(row);
        }
        stmt.free();
        
        // sql.jsのexec形式に合わせて結果を整形
        if (result.length > 0) {
          const columns = Object.keys(result[0]).map((_, index) => index);
          const values = result.map(row => Object.values(row));
          result = [{ columns, values }];
        } else {
          result = [];
        }
      } else {
        // パラメータがない場合はexecを使用
        result = db.exec(query);
      }

      if (result.length === 0) return [];

      const parts: PartWithInventory[] = [];
      const rows = result[0];

      for (let i = 0; i < rows.values.length; i++) {
        const row = rows.values[i];
        parts.push({
          id: row[0],
          name: row[1],
          category_id: row[2],
          manufacturer: row[3],
          part_number: row[4],
          package: row[5],
          description: row[6],
          created_at: row[7],
          quantity: row[8],
          location: row[9],
          voltage_rating: row[10],
          current_rating: row[11],
          power_rating: row[12],
          tolerance: row[13],
          logic_family: row[14],
          datasheet_url: row[15],
          purchase_date: row[16],
          shop: row[17],
          price_per_unit: row[18],
          currency: row[19],
          memo: row[20]
        });
      }

      return parts;
    } catch (error) {
      console.error('パーツ取得エラー:', error);
      return [];
    }
  }

  /**
   * 在庫数量を更新する
   */
  updateInventoryQuantity(partId: number, quantity: number): void {
    if (this.useSampleData) {
      // サンプルデータモードでも在庫変更をサポート
      if (this.sampleData) {
        const part = this.sampleData.parts.find((p: PartWithInventory) => p.id === partId);
        if (part) {
          part.quantity = quantity;
          this.hasChanges = true;
          devLog(`サンプルデータの在庫を更新: パーツID ${partId} -> ${quantity}`);
        }
      }
      return;
    }

    const db = this.db;
    if (!db) {
      console.warn('データベースが初期化されていません');
      return;
    }

    try {
      // 在庫レコードの存在確認
      const checkStmt = db.prepare('SELECT id FROM inventory WHERE part_id = ?');
      checkStmt.bind([partId]);
      const hasRecord = checkStmt.step();
      checkStmt.free();
      
      if (hasRecord) {
        // 更新
        const updateStmt = db.prepare('UPDATE inventory SET quantity = ? WHERE part_id = ?');
        updateStmt.bind([quantity, partId]);
        updateStmt.step();
        updateStmt.free();
      } else {
        // 新規作成
        const insertStmt = db.prepare('INSERT INTO inventory (part_id, quantity) VALUES (?, ?)');
        insertStmt.bind([partId, quantity]);
        insertStmt.step();
        insertStmt.free();
      }

      this.hasChanges = true;
      devLog(`データベースの在庫を更新: パーツID ${partId} -> ${quantity}`);
    } catch (error) {
      console.error('在庫更新エラー:', error);
    }
  }

  /**
   * パーツを削除する
   */
  deletePart(partId: number): boolean {
    if (this.useSampleData) {
      // サンプルデータモードでもパーツ削除をサポート
      if (this.sampleData) {
        const partIndex = this.sampleData.parts.findIndex((p: PartWithInventory) => p.id === partId);
        if (partIndex >= 0) {
          this.sampleData.parts.splice(partIndex, 1);
          this.hasChanges = true;
          devLog(`サンプルデータからパーツを削除: パーツID ${partId}`);
          return true;
        }
      }
      return false;
    }

    const db = this.db;
    if (!db) {
      console.warn('データベースが初期化されていません');
      return false;
    }

    try {
      // トランザクション開始
      db.exec('BEGIN TRANSACTION');

      // 在庫レコードを削除
      const deleteInventoryStmt = db.prepare('DELETE FROM inventory WHERE part_id = ?');
      deleteInventoryStmt.bind([partId]);
      deleteInventoryStmt.step();
      deleteInventoryStmt.free();

      // パーツレコードを削除
      const deletePartStmt = db.prepare('DELETE FROM parts WHERE id = ?');
      deletePartStmt.bind([partId]);
      deletePartStmt.step();
      deletePartStmt.free();

      // トランザクション完了
      db.exec('COMMIT');

      this.hasChanges = true;
      devLog(`データベースからパーツを削除: パーツID ${partId}`);
      return true;
    } catch (error) {
      // エラー時はロールバック
      try {
        db.exec('ROLLBACK');
      } catch (rollbackError) {
        console.error('ロールバックエラー:', rollbackError);
      }
      console.error('パーツ削除エラー:', error);
      return false;
    }
  }

  /**
   * 変更状態を取得する
   */
  getHasChanges(): boolean {
    return this.hasChanges;
  }

  /**
   * データベースをダウンロードする
   */
  async downloadDatabase(): Promise<boolean> {
    if (this.useSampleData) {
      // サンプルデータモードでは実際のダウンロードはできないが、
      // 変更フラグをリセットして同期済み状態にする
      this.hasChanges = false;
      devLog('サンプルデータモードで変更フラグをリセットしました（同期完了扱い）');
      return true;
    }

    const db = this.db;
    if (!db) {
      devLog('データベースが初期化されていません');
      return false;
    }

    try {
      const data = db.export();
      const blob = new Blob([data], { type: 'application/octet-stream' });
      
      // showSaveFilePicker APIが利用可能かチェック
      if ('showSaveFilePicker' in window) {
        try {
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: 'eparts.db',
            startIn: 'downloads', // ダウンロードフォルダから開始
            types: [{
              description: 'Database files',
              accept: { 'application/octet-stream': ['.db'] }
            }]
          });
          
          const writableStream = await fileHandle.createWritable();
          await writableStream.write(blob);
          await writableStream.close();
          
          devLog('ファイル保存が完了しました');
          this.hasChanges = false;
          return true;
          
        } catch (error: any) {
          if (error.name === 'AbortError') {
            devLog('ファイル保存がキャンセルされました');
            return true; // 変更フラグはリセットしない
          } else {
            console.error('ファイル保存エラー:', error);
            return false;
          }
        }
      } else {
        // フォールバック: 従来のダウンロード方式（Safari、Firefox等）
        devLog('showSaveFilePicker APIが利用できません。従来方式でダウンロードします。');
        
        return new Promise((resolve) => {
          try {
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'eparts.db';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // 短時間待機してからリソースを解放し、変更フラグをリセット
            setTimeout(() => {
              URL.revokeObjectURL(url);
              
              // ブラウザ別のダウンロード先案内を表示
              this.showDownloadLocationGuide();
              
              // 従来方式では直接ダウンロードフォルダーに保存されるため
              // ファイル保存ダイアログでのキャンセルは発生しない
              // ダウンロード開始が成功したら変更フラグをリセット
              devLog('ダウンロードが完了しました（従来方式）');
              this.hasChanges = false;
              resolve(true);
            }, 500); // 500ms待機
            
          } catch (error) {
            console.error('ファイル書き込みエラー:', error);
            // 書き込み失敗時は変更フラグを維持してリトライ可能にする
            resolve(false);
          }
        });
      }
    } catch (error) {
      console.error('データベースダウンロードエラー:', error);
      return false;
    }
  }

  /**
   * データベースを元の状態にリセットする
   */
  async resetDatabase(): Promise<void> {
    if (this.useSampleData) {
      this.initializeWithSampleData();
      this.hasChanges = false;
      return;
    }

    try {
      await this.loadDatabase();
      this.hasChanges = false;
    } catch (error) {
      console.error('データベースリセットエラー:', error);
    }
  }

  /**
   * サンプルデータで初期化する
   */
  private initializeWithSampleData(): void {
    this.sampleData = {
      categories: [
        { id: 1, name: '抵抗', display_order: 100 },
        { id: 2, name: 'コンデンサ', display_order: 200 },
        { id: 3, name: 'ダイオード', display_order: 300 },
        { id: 4, name: 'トランジスタ', display_order: 400 },
        { id: 5, name: 'オペアンプ', display_order: 500 },
        { id: 6, name: 'マイコン', display_order: 600 },
        { id: 7, name: 'メモリ', display_order: 700 }
      ],
      parts: [
        {
          id: 1,
          name: '10kΩ 抵抗',
          category_id: 1,
          manufacturer: 'KOA',
          part_number: 'CF1/4CT52R103J',
          package: 'カーボン 1/4W',
          description: '一般的な10kΩカーボン抵抗',
          created_at: '2025-01-01 00:00:00',
          quantity: 50,
          location: '引き出し A-1',
          voltage_rating: '250V',
          power_rating: '0.25W',
          tolerance: '±5%',
          purchase_date: '2025-01-15',
          shop: '秋月電子通商',
          price_per_unit: 10,
          currency: 'JPY',
          memo: '基板用抵抗として購入'
        },
        {
          id: 2,
          name: '1μF セラミックコンデンサ',
          category_id: 2,
          manufacturer: 'Murata',
          part_number: 'GRM188R61C105KA93D',
          package: '0603',
          description: '高周波回路用セラミックコンデンサ',
          created_at: '2025-01-01 00:00:00',
          quantity: 25,
          location: '引き出し B-2',
          voltage_rating: '16V',
          tolerance: '±10%',
          purchase_date: '2025-01-20',
          shop: 'Digi-Key',
          price_per_unit: 25,
          currency: 'JPY',
          memo: 'SMD実装用'
        },
        {
          id: 3,
          name: '1N4148 ダイオード',
          category_id: 3,
          manufacturer: 'ON Semiconductor',
          part_number: '1N4148',
          package: 'DO-35',
          description: '高速スイッチングダイオード',
          created_at: '2025-01-01 00:00:00',
          quantity: 100,
          location: '引き出し C-3',
          voltage_rating: '100V',
          current_rating: '200mA',
          purchase_date: '2025-01-10',
          shop: '千石電商',
          price_per_unit: 15,
          currency: 'JPY',
          memo: 'スイッチング回路用'
        },
        {
          id: 4,
          name: '2N3904 NPNトランジスタ',
          category_id: 4,
          manufacturer: 'ON Semiconductor',
          part_number: '2N3904',
          package: 'TO-92',
          description: '汎用NPNトランジスタ',
          created_at: '2025-01-01 00:00:00',
          quantity: 75,
          location: '引き出し D-1',
          voltage_rating: '40V',
          current_rating: '200mA',
          purchase_date: '2025-01-25',
          shop: 'RSコンポーネンツ',
          price_per_unit: 30,
          currency: 'JPY',
          memo: 'アンプ回路用トランジスタ'
        },
        {
          id: 5,
          name: 'LM358 オペアンプ',
          category_id: 5,
          manufacturer: 'Texas Instruments',
          part_number: 'LM358N',
          package: 'DIP-8',
          description: 'デュアル汎用オペアンプ',
          created_at: '2025-01-01 00:00:00',
          quantity: 30,
          location: '引き出し E-2',
          voltage_rating: '32V',
          power_rating: '500mW',
          logic_family: 'Analog',
          purchase_date: '2025-02-01',
          shop: 'マルツエレック',
          price_per_unit: 80,
          currency: 'JPY',
          memo: 'アナログ回路用IC'
        },
        {
          id: 6,
          name: '74HC00 NAND ゲート',
          category_id: 5,
          manufacturer: 'Texas Instruments',
          part_number: '74HC00N',
          package: 'DIP-14',
          description: 'クワッド2入力NANDゲート',
          created_at: '2025-01-01 00:00:00',
          quantity: 20,
          location: '引き出し E-3',
          voltage_rating: '5V',
          logic_family: 'HC',
          purchase_date: '2025-02-05',
          shop: 'エレショップ',
          price_per_unit: 120,
          currency: 'JPY',
          memo: 'デジタル回路用ロジックIC'
        }
      ]
    };
    
    this.useSampleData = true;
  }

  /**
   * 同期完了マークを設定する（手動確認用）
   */
  markAsSaved(): void {
    this.hasChanges = false;
  }

  /**
   * パーツ情報を更新する
   */
  updatePart(partId: number, updatedPart: Partial<PartWithInventory>): boolean {
    if (this.useSampleData) {
      // サンプルデータモードでもパーツ更新をサポート
      if (this.sampleData) {
        const partIndex = this.sampleData.parts.findIndex((p: PartWithInventory) => p.id === partId);
        if (partIndex >= 0) {
          // パーツ情報を更新（IDと在庫数は除く）
          const currentPart = this.sampleData.parts[partIndex];
          this.sampleData.parts[partIndex] = {
            ...currentPart,
            ...updatedPart,
            id: partId, // IDは変更しない
            quantity: currentPart.quantity // 在庫数は別途管理
          };
          this.hasChanges = true;
          devLog(`サンプルデータのパーツを更新: パーツID ${partId}`);
          return true;
        }
      }
      return false;
    }

    const db = this.db;
    if (!db) {
      console.warn('データベースが初期化されていません');
      return false;
    }

    try {
      // パーツ情報を更新（在庫数は除く）
      const updateStmt = db.prepare(`
        UPDATE parts SET
          name = ?,
          category_id = ?,
          manufacturer = ?,
          part_number = ?,
          package = ?,
          voltage_rating = ?,
          current_rating = ?,
          power_rating = ?,
          tolerance = ?,
          logic_family = ?,
          description = ?,
          datasheet_url = ?
        WHERE id = ?
      `);
      
      updateStmt.bind([
        updatedPart.name || '',
        updatedPart.category_id || null,
        updatedPart.manufacturer || '',
        updatedPart.part_number || '',
        updatedPart.package || '',
        updatedPart.voltage_rating || '',
        updatedPart.current_rating || '',
        updatedPart.power_rating || '',
        updatedPart.tolerance || '',
        updatedPart.logic_family || '',
        updatedPart.description || '',
        updatedPart.datasheet_url || '',
        partId
      ]);
      
      updateStmt.step();
      updateStmt.free();

      // 在庫情報を更新
      const inventoryFields = ['location', 'purchase_date', 'shop', 'price_per_unit', 'currency', 'memo'];
      const hasInventoryUpdate = inventoryFields.some(field => updatedPart[field as keyof PartWithInventory] !== undefined);
      
      if (hasInventoryUpdate) {
        const updateInventoryStmt = db.prepare(`
          UPDATE inventory SET 
            location = ?,
            purchase_date = ?,
            shop = ?,
            price_per_unit = ?,
            currency = ?,
            memo = ?
          WHERE part_id = ?
        `);
        
        updateInventoryStmt.bind([
          updatedPart.location || '',
          updatedPart.purchase_date || null,
          updatedPart.shop || '',
          updatedPart.price_per_unit || null,
          updatedPart.currency || 'JPY',
          updatedPart.memo || '',
          partId
        ]);
        
        updateInventoryStmt.step();
        updateInventoryStmt.free();
      }

      this.hasChanges = true;
      devLog(`データベースのパーツを更新: パーツID ${partId}`);
      return true;
    } catch (error) {
      console.error('パーツ更新エラー:', error);
      return false;
    }
  }

  /**
   * 新しいパーツを追加する
   */
  addPart(newPart: Omit<PartWithInventory, 'id' | 'created_at'>): number | null {
    if (this.useSampleData) {
      // サンプルデータモードでもパーツ追加をサポート
      if (this.sampleData) {
        // 新しいIDを生成（既存の最大ID + 1）
        const maxId = Math.max(...this.sampleData.parts.map((p: PartWithInventory) => p.id), 0);
        const newId = maxId + 1;
        
        const partWithId: PartWithInventory = {
          ...newPart,
          id: newId,
          created_at: new Date().toISOString()
        };
        
        this.sampleData.parts.push(partWithId);
        this.hasChanges = true;
        devLog(`サンプルデータに新しいパーツを追加: パーツID ${newId}`);
        return newId;
      }
      return null;
    }

    const db = this.db;
    if (!db) {
      console.warn('データベースが初期化されていません');
      return null;
    }

    try {
      // トランザクション開始
      db.exec('BEGIN TRANSACTION');

      // パーツテーブルに追加
      const insertPartStmt = db.prepare(`
        INSERT INTO parts (
          name, category_id, manufacturer, part_number, package,
          voltage_rating, current_rating, power_rating, tolerance,
          logic_family, description, datasheet_url, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      
      insertPartStmt.bind([
        newPart.name,
        newPart.category_id || null,
        newPart.manufacturer || '',
        newPart.part_number || '',
        newPart.package || '',
        newPart.voltage_rating || '',
        newPart.current_rating || '',
        newPart.power_rating || '',
        newPart.tolerance || '',
        newPart.logic_family || '',
        newPart.description || '',
        newPart.datasheet_url || ''
      ]);
      
      insertPartStmt.step();
      insertPartStmt.free();

      // 新しく追加されたパーツのIDを取得
      const getIdStmt = db.prepare('SELECT last_insert_rowid() as id');
      getIdStmt.step();
      const result = getIdStmt.get();
      const newPartId = result[0];
      getIdStmt.free();

      // 在庫テーブルに追加
      const insertInventoryStmt = db.prepare(`
        INSERT INTO inventory (part_id, quantity, location, purchase_date, shop, price_per_unit, currency, memo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      insertInventoryStmt.bind([
        newPartId,
        newPart.quantity || 0,
        newPart.location || '',
        newPart.purchase_date || null,
        newPart.shop || '',
        newPart.price_per_unit || null,
        newPart.currency || 'JPY',
        newPart.memo || ''
      ]);
      
      insertInventoryStmt.step();
      insertInventoryStmt.free();

      // トランザクション完了
      db.exec('COMMIT');

      this.hasChanges = true;
      devLog(`データベースに新しいパーツを追加: パーツID ${newPartId}`);
      return newPartId;
    } catch (error) {
      // エラー時はロールバック
      try {
        db.exec('ROLLBACK');
      } catch (rollbackError) {
        console.error('ロールバックエラー:', rollbackError);
      }
      console.error('パーツ追加エラー:', error);
      return null;
    }
  }

  /**
   * カテゴリ情報を更新する（新規追加と削除も含む）
   */
  updateCategories(updatedCategories: Category[], deletedCategoryIds: number[] = []): boolean {
    if (this.useSampleData) {
      // サンプルデータモードでもカテゴリ更新をサポート
      if (this.sampleData) {
        // 削除対象カテゴリに関連するパーツとインベントリを削除
        for (const deletedId of deletedCategoryIds) {
          // 関連するパーツを削除
          this.sampleData.parts = this.sampleData.parts.filter(part => part.category_id !== deletedId);
        }

        // 削除対象カテゴリを現在のカテゴリリストから除外
        const remainingCategories = this.sampleData.categories.filter(
          category => !deletedCategoryIds.includes(category.id)
        );

        // 新規カテゴリ（負のID）に正のIDを割り当て
        let maxId = Math.max(...remainingCategories.map(c => c.id), 0);
        const processedCategories = updatedCategories.map(category => {
          if (category.id < 0) {
            // 新規カテゴリの場合、正のIDを割り当て
            return { ...category, id: ++maxId };
          }
          return { ...category };
        });
        
        this.sampleData.categories = processedCategories;
        this.hasChanges = true;
        devLog('サンプルデータのカテゴリを更新（新規追加・削除含む）', {
          updated: processedCategories.length,
          deleted: deletedCategoryIds.length
        });
        return true;
      }
      return false;
    }

    const db = this.db;
    if (!db) {
      console.warn('データベースが初期化されていません');
      return false;
    }

    try {
      // トランザクション開始
      db.exec('BEGIN TRANSACTION');

      // 削除対象カテゴリの関連データを削除
      for (const deletedId of deletedCategoryIds) {
        // 関連するインベントリを削除（parts経由）
        const deleteInventoryStmt = db.prepare(`
          DELETE FROM inventory 
          WHERE part_id IN (
            SELECT id FROM parts WHERE category_id = ?
          )
        `);
        deleteInventoryStmt.bind([deletedId]);
        deleteInventoryStmt.step();
        deleteInventoryStmt.free();

        // 関連するパーツを削除
        const deletePartsStmt = db.prepare(`
          DELETE FROM parts WHERE category_id = ?
        `);
        deletePartsStmt.bind([deletedId]);
        deletePartsStmt.step();
        deletePartsStmt.free();

        // カテゴリを削除
        const deleteCategoryStmt = db.prepare(`
          DELETE FROM categories WHERE id = ?
        `);
        deleteCategoryStmt.bind([deletedId]);
        deleteCategoryStmt.step();
        deleteCategoryStmt.free();
      }

      // 各カテゴリを処理
      for (const category of updatedCategories) {
        if (category.id < 0) {
          // 新規カテゴリの場合はINSERT
          const insertStmt = db.prepare(`
            INSERT INTO categories (name, parent_id, display_order)
            VALUES (?, ?, ?)
          `);
          
          insertStmt.bind([
            category.name,
            category.parent_id || null,
            category.display_order
          ]);
          
          insertStmt.step();
          insertStmt.free();
        } else {
          // 既存カテゴリの場合はUPDATE
          const updateStmt = db.prepare(`
            UPDATE categories SET
              name = ?,
              display_order = ?
            WHERE id = ?
          `);
          
          updateStmt.bind([
            category.name,
            category.display_order,
            category.id
          ]);
          
          updateStmt.step();
          updateStmt.free();
        }
      }

      // トランザクション完了
      db.exec('COMMIT');

      this.hasChanges = true;
      devLog('データベースのカテゴリを更新（新規追加・削除含む）');
      return true;
    } catch (error) {
      // エラー時はロールバック
      try {
        db.exec('ROLLBACK');
      } catch (rollbackError) {
        console.error('ロールバックエラー:', rollbackError);
      }
      console.error('カテゴリ更新エラー:', error);
      return false;
    }
  }

  /**
   * サンプルデータモードかどうかを取得
   */
  getUseSampleData(): boolean {
    return this.useSampleData;
  }

  /**
   * ブラウザ別のダウンロード先案内を表示する
   */
  private showDownloadLocationGuide(): void {
    const browserInfo = this.detectBrowserAndOS();
    
    let message = 'データベースファイル (eparts.db) のダウンロードが完了しました。\n\n';
    
    // 保存先の案内
    message += `保存先: ${browserInfo.downloadPath}\n`;
    if (browserInfo.note) {
      message += `${browserInfo.note}\n`;
    }
    message += '\n';
    
    // 確認方法の案内
    message += `確認方法: ${browserInfo.howToCheck}`;
    
    // 設定変更の案内（必要に応じて）
    if (browserInfo.settingsNote) {
      message += `\n\n注意: ${browserInfo.settingsNote}`;
    }
    
    alert(message);
  }

  /**
   * ブラウザとOSを詳細に判定し、適切なダウンロード情報を返す
   */
  private detectBrowserAndOS(): {
    browser: string;
    os: string;
    downloadPath: string;
    note?: string;
    howToCheck: string;
    settingsNote?: string;
  } {
    const userAgent = navigator.userAgent;
    
    // OSの判定
    let os = 'unknown';
    let downloadFolder = 'ダウンロードフォルダー';
    
    if (/macintosh|mac os x/i.test(userAgent)) {
      os = 'mac';
      downloadFolder = '~/Downloads';
    } else if (/windows nt/i.test(userAgent)) {
      os = 'windows';
      downloadFolder = 'C:\\Users\\[ユーザー名]\\Downloads';
    } else if (/linux/i.test(userAgent)) {
      os = 'linux';
      downloadFolder = '~/Downloads';
    } else if (/android/i.test(userAgent)) {
      os = 'android';
      downloadFolder = 'Download フォルダー';
    } else if (/iphone|ipad/i.test(userAgent)) {
      os = 'ios';
      downloadFolder = 'ファイルアプリの「ダウンロード」';
    }
    
    // ブラウザの判定（より精密に）
    let browser = 'unknown';
    let howToCheck = 'ブラウザのダウンロード履歴を確認してください';
    let settingsNote: string | undefined;
    
    if (/edg/i.test(userAgent)) {
      // Microsoft Edge
      browser = 'edge';
      if (os === 'mac') {
        howToCheck = 'Cmd+Shift+J でダウンロード履歴を表示';
      } else {
        howToCheck = 'Ctrl+J でダウンロード履歴を表示';
      }
      settingsNote = 'Edgeの設定で「ダウンロード時に保存場所を確認する」が有効な場合は、指定した場所に保存されます';
    } else if (/chrome/i.test(userAgent) && !/edg/i.test(userAgent)) {
      // Google Chrome
      browser = 'chrome';
      if (os === 'mac') {
        howToCheck = 'Cmd+Shift+J でダウンロード履歴を表示';
      } else {
        howToCheck = 'Ctrl+J でダウンロード履歴を表示';
      }
      settingsNote = 'Chromeの設定で「ダウンロード前に各ファイルの保存場所を確認する」が有効な場合は、指定した場所に保存されます';
    } else if (/firefox/i.test(userAgent)) {
      // Firefox
      browser = 'firefox';
      if (os === 'mac') {
        howToCheck = 'Cmd+Shift+Y でダウンロード履歴を表示';
      } else {
        howToCheck = 'Ctrl+Shift+Y でダウンロード履歴を表示';
      }
      settingsNote = 'Firefoxの設定で「ファイルごとに保存先を指定する」が有効な場合は、指定した場所に保存されます';
    } else if (/^((?!chrome|android).)*safari/i.test(userAgent)) {
      // Safari
      browser = 'safari';
      if (os === 'mac') {
        howToCheck = 'Safariのダウンロードボタン（↓）をクリック、またはCmd+Option+L';
      } else if (os === 'ios') {
        howToCheck = 'ファイルアプリを開いて「ダウンロード」フォルダーを確認';
      } else {
        howToCheck = 'Safariのダウンロードボタン（↓）をクリック';
      }
      if (os === 'mac') {
        settingsNote = 'Safariの環境設定で「ダウンロードフォルダー」が変更されている場合は、そちらに保存されます';
      }
    } else if (/opera|opr/i.test(userAgent)) {
      // Opera
      browser = 'opera';
      if (os === 'mac') {
        howToCheck = 'Cmd+Shift+J でダウンロード履歴を表示';
      } else {
        howToCheck = 'Ctrl+J でダウンロード履歴を表示';
      }
    }
    
    // パスの組み立て
    let downloadPath: string;
    let note: string | undefined;
    
    if (os === 'ios') {
      downloadPath = downloadFolder;
      note = 'iOSでは「ファイルアプリ」でダウンロードファイルを管理します';
    } else if (os === 'android') {
      downloadPath = downloadFolder;
      note = 'ファイルマネージャーアプリでダウンロードフォルダーを確認してください';
    } else {
      downloadPath = `${downloadFolder}/eparts.db`;
      if (os === 'mac') {
        note = 'ホームフォルダーのダウンロードフォルダー';
      } else if (os === 'windows') {
        note = 'ユーザーフォルダー内のダウンロードフォルダー';
      }
    }
    
    return {
      browser,
      os,
      downloadPath,
      note,
      howToCheck,
      settingsNote
    };
  }
}
