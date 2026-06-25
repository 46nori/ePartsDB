# ファイル一覧 (URS/)

## 要求仕様書

Requirement.md

## データベーススキーマ

schema.sql

## SQLiteデーターベースのサンプル

| File                 | Content            |
|----------------------|--------------------|
| empty-eparts.db      | 空   　　　 　　　　　|
| category-eparts.db   | カテゴリデータだけ存在 |
| sample-eparts.db     | 340個程度のサンプル（gh-pages更新時に同期） |

### 空DBの生成例

`empty-eparts.db`の生成方法:

```bash
sqlite3 empty-eparts.db < schema.sql
```

## 本番DB（developブランチ）

`public/database/eparts.db`は`gh-pages`ブランチの本番DBと同期して管理する。

```bash
npm run sync:db
npm test
```
