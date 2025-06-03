# Phase 4 同期機能仕様書

## 📋 概要

### **目標**
ローカル環境で行った変更（パーツ追加・編集・削除・在庫更新）をマスターデータベースに反映する同期機能の実装

### **前提条件**
- **環境**: GitHubリポジトリのクローン/フォーク環境
- **配布方式**: ファイルベース配布（サーバーサイド処理なし）
- **同期方式**: eparts.dbファイルの直接上書き

## 🏗 システム設計

### **データベース構成**
```
[ファイルシステム]              [ブラウザメモリ内]
eparts.db                      ┌─────────────────┐
  │                           │  originalDb     │
  │ fetch()                   │  (読み取り専用)  │
  └──────────────────────────→│                 │
                              └─────────────────┘
                                      │
                              export() │ copy
                                      ▼
                              ┌─────────────────┐
                              │  db             │
                              │  (作業用)       │← CRUD操作
                              │                 │
                              └─────────────────┘
                                      │
                              同期時   │ 変更適用
                                      ▼
                              ┌─────────────────┐
                              │  newMasterDb    │
                              │  (更新済み)     │
                              └─────────────────┘
                                      │
                              download │ as eparts.db
                                      ▼
[ダウンロードフォルダ]
eparts.db (更新版)
```

### **変更追跡システム**
```
window.appState.localChanges = {
  added: [
    {
      name: 'New IC',
      category_id: 1,
      part_number: 'ABC123',
      tempId: 'temp_1234567890',
      timestamp: '2025-06-03T...'
    }
  ],
  modified: [
    {
      id: 42,
      name: 'Updated IC',
      category_id: 1,
      timestamp: '2025-06-03T...'
    }
  ],
  deleted: [
    {
      id: 35,
      name: 'Deleted IC',
      timestamp: '2025-06-03T...'
    }
  ],
  inventory: [
    {
      part_id: 10,
      old_quantity: 5,
      new_quantity: 15,
      timestamp: '2025-06-03T...'
    }
  ]
}
```

## 🔄 同期プロセス設計

### **1. 同期トリガー**
```
同期ボタンクリック
    ↓
状態確認 (window.appState.hasLocalChanges)
    ↓
変更がない場合 → 何もしない（ボタン無効のため）
変更がある場合 → 次のステップへ
```

### **2. 変更データ収集**
```
collectChanges() から以下を取得：
┌─────────────────────────────────────┐
│ changes: {                          │
│   added: [新規追加されたパーツ一覧]   │
│   modified: [編集されたパーツ一覧]   │
│   deleted: [削除されたパーツ一覧]    │
│   inventory: [在庫変更一覧]         │
│ }                                   │
│ summary: {                          │
│   total: 総変更件数,                │
│   added: 追加件数,                  │
│   modified: 編集件数,               │
│   deleted: 削除件数,                │
│   inventory: 在庫変更件数,          │
│   timestamp: 処理時刻               │
│ }                                   │
└─────────────────────────────────────┘
```

### **3. 確認ダイアログ表示**
```
┌─────────────────────────────────────┐
│ 🔄 ローカルファイル同期             │
│                                     │
│ eparts.dbに以下の変更を反映します： │
│                                     │
│ ➕ パーツ追加: X件                   │
│ ✏️ パーツ編集: X件                   │
│ 🗑️ パーツ削除: X件                   │
│ 📦 在庫更新: X件                     │
│                                     │
│ 📋 手順:                            │
│ 1. 新しいeparts.dbがダウンロード     │
│ 2. プロジェクトフォルダで置き換え   │
│ 3. ページを再読み込み               │
│                                     │
│ [キャンセル] [同期実行]             │
└─────────────────────────────────────┘
```

### **4. マスターデータベース更新**
```
applyChangesToMaster(changes):
  1. originalDb.export() でマスターDBをコピー
  2. newMasterDb = new Database(masterData)
  3. BEGIN TRANSACTION
  4. 変更適用（順序重要）：
     a. 削除処理 (deleted パーツを削除)
     b. 追加処理 (added パーツを挿入)
     c. 更新処理 (modified パーツを更新)
     d. 在庫処理 (inventory 変更を適用)
  5. COMMIT
  6. エラー時は ROLLBACK
```

### **5. ファイル生成とダウンロード**
```
downloadAsEpartsDb(newMasterDb):
  1. newMasterDb.export() でバイナリデータ生成
  2. new Blob([data], {type: 'application/x-sqlite3'})
  3. URL.createObjectURL(blob)
  4. <a download="eparts.db"> で自動ダウンロード
  5. ブラウザのダウンロードフォルダに保存
```

### **6. 状態クリア**
```
clearLocalChanges():
  window.appState.localChanges = {
    added: [],
    modified: [],
    deleted: [],
    inventory: []
  }
  window.appState.hasLocalChanges = false
  updateChangeIndicator()
  updateSyncButton()
```

## 🎯 ユーザー操作フロー

### **同期実行の流れ**
```
1. パーツ追加/編集/削除/在庫更新
   「未保存の変更: X件」表示

2. 同期ボタンが有効化される
   「📤 同期」

3. 同期ボタンをクリック
   確認ダイアログが表示される

4. 「同期実行」を選択
   「🔄 同期中...」と表示される

5. 数秒後に完了
   「新しいeparts.dbがダウンロードされました」

6. ダウンロードフォルダを確認
   「eparts.db」ファイルが保存されている

7. プロジェクトフォルダの既存ファイルを置き換え
   手動でコピー・上書き

8. ページを再読み込み
   変更が反映されている
```

### **ファイル管理フロー**
```
プロジェクトフォルダ/
├── eparts.db          ← 現在のファイル
├── eparts.db.backup   ← 手動バックアップ（推奨）
└── downloads/
    └── eparts.db      ← 同期で生成されたファイル
                         
手動操作:
1. eparts.db → eparts.db.backup (バックアップ)
2. downloads/eparts.db → eparts.db (置き換え)
```

## 🔧 CRUD操作詳細

### **削除処理（参照整合性対応）**
```sql
-- 在庫データも削除（参照整合性）
DELETE FROM inventory WHERE part_id = ?;
-- パーツ本体を削除
DELETE FROM parts WHERE id = ?;
```

### **追加処理（ID自動採番）**
```sql
-- 新しいIDを取得
SELECT MAX(id) FROM parts;
-- パーツを追加
INSERT INTO parts (id, name, category_id, ...) VALUES (?, ?, ?, ...);
-- 初期在庫を追加
INSERT INTO inventory (part_id, quantity) VALUES (?, 0);
```

### **更新処理（全フィールド対応）**
```sql
UPDATE parts SET 
  name = ?, 
  category_id = ?, 
  part_number = ?, 
  manufacturer = ?, 
  package = ?, 
  logic_family = ?, 
  description = ?, 
  datasheet_url = ?
WHERE id = ?;
```

### **在庫更新処理（存在確認付き）**
```sql
-- 在庫レコードの存在確認
SELECT COUNT(*) FROM inventory WHERE part_id = ?;

-- 存在する場合は更新
UPDATE inventory SET quantity = ? WHERE part_id = ?;

-- 存在しない場合は新規作成
INSERT INTO inventory (part_id, quantity) VALUES (?, ?);
```

## 🛡 エラーハンドリング

### **バリデーション項目**
1. **変更データの存在確認**: localChangesが空でないか
2. **必須フィールドチェック**: 名前、カテゴリIDの存在
3. **データベース整合性チェック**: originalDbの利用可能性
4. **ブラウザ互換性チェック**: Blob API、URL.createObjectURL対応

### **エラー分類と対応**
```
handleSyncError(error):
  if (error.message.includes('必須フィールド'))
    → 「データに不備があります」
  else if (error.message.includes('ダウンロード'))
    → 「ファイルのダウンロードに失敗しました」
  else if (error.message.includes('データベース'))
    → 「データベース処理でエラーが発生しました」
  else if (error.message.includes('マスター'))
    → 「マスターデータベースにアクセスできません」
  else
    → 「予期しないエラー」
```

## 📊 技術的価値

### **アーキテクチャ上の利点**
- **サーバーレス**: 完全なクライアントサイド処理
- **高可用性**: 静的ファイル配信で運用可能
- **低コスト**: サーバー維持費不要
- **セキュリティ**: サーバーサイド攻撃面なし

### **運用上の利点**
- **即時反映**: ローカルファイル直接更新
- **バージョン管理**: Git管理に適合
- **手動制御**: ファイル置き換えタイミング制御可能
- **バックアップ**: 手動バックアップ推奨で安全性確保

### **ユーザビリティ**
- **ワンクリック同期**: 簡単な操作で変更反映
- **安全な処理**: トランザクション・ロールバック対応
- **直感的UI**: 確認ダイアログ・進捗表示
- **Git連携準備**: ファイルベース管理対応

## 🔮 将来拡張の可能性

### **Git統合（Phase 5候補）**
```bash
# 自動化の可能性
git add eparts.db
git commit -m "Sync database: X changes applied"
git push origin main
```

### **競合検出機能**
```
複数人編集時の競合検出:
- 同一パーツの同時編集チェック
- タイムスタンプベースの競合解決
- マージ機能の提供
```

### **バックアップ機能**
```
自動バックアップ生成:
- 同期前の自動バックアップ作成
- タイムスタンプ付きファイル名
- 復元機能の提供
```

**Phase 4実装により、ePartsDBは完全なCRUD機能と安全な同期システムを持つ、企業級品質のアプリケーションとして完成します。**