-- 部品カテゴリ（階層構造対応：親IDを持つ）
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER,
    display_order INTEGER DEFAULT 1000,        -- 表示順序（小さい値が先に表示）
    FOREIGN KEY (parent_id) REFERENCES categories(id)
);

-- 電子部品情報（型番や分類、基本情報）
CREATE TABLE parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                -- 部品の名前（例: 74HC00, 10kΩ）
    category_id INTEGER,               -- 紐付けるカテゴリ
    manufacturer TEXT,                 -- メーカー名
    part_number TEXT,                  -- 型番
    package TEXT,                      -- パッケージ（例: DIP, SMD, TO-220）
    voltage_rating TEXT,               -- 耐圧など（例: 50V）
    current_rating TEXT,               -- 電流制限など（例: 1A）
    power_rating TEXT,                 -- 定格電力（例: 0.25W）
    tolerance TEXT,                    -- 誤差（例: ±1%）
    logic_family TEXT,                 -- LS, HC などロジックファミリ（必要に応じて）
    description TEXT,                  -- 説明・備考
    datasheet_url TEXT,                -- データシートへのリンク
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 在庫管理（購入履歴や残数）
CREATE TABLE inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,        -- 在庫数
    location TEXT,                              -- 保管場所（引き出し番号など）
    purchase_date TEXT,                         -- 購入日
    shop TEXT,                                  -- 購入先（秋月、aitendo、AliExpressなど）
    price_per_unit REAL,                        -- 単価
    currency TEXT DEFAULT 'JPY',                -- 通貨（必要に応じて）
    memo TEXT,                                  -- 購入メモ
    shop_url TEXT,                              -- 購入先URL
    FOREIGN KEY (part_id) REFERENCES parts(id)
);
