# ブランチ運用戦略

## 🎯 ブランチ構成

### `main` ブランチ
- **目的**: 開発・リリース管理
- **内容**: 
  - 最新のアプリケーションコード
  - サンプル・クリーンなデータベース
  - ドキュメント
- **GitHub Actions**: ビルドのみ（デプロイなし）
- **使用者**: 開発者・コントリビューター

### `gh-pages` ブランチ  
- **目的**: 個人運用・実デプロイ
- **内容**:
  - `main`からマージされた最新コード
  - 個人の実際のパーツDB
  - 運用固有の設定
- **GitHub Actions**: ビルド + GitHub Pagesデプロイ
- **使用者**: エンドユーザー（個人）

## 🔄 運用フロー

### 開発フロー（開発者向け）
```bash
# 1. 機能開発
git checkout main
git pull origin main
# ... 開発作業 ...
git add .
git commit -m "機能追加: XXX"
git push origin main

# 2. テスト確認
npm run dev  # ローカルで動作確認
npm run build  # ビルドエラーがないか確認
```

### 運用フロー（個人利用者向け）
```bash
# 1. 最新機能を取り込み（必要時）
git checkout gh-pages
git merge main
git push origin gh-pages

# 2. データベース更新（日常運用）
git checkout gh-pages
# ローカルでデータ編集後...
cp ~/Downloads/eparts.db database/eparts.db
git add database/eparts.db
git commit -m "在庫データ更新: [変更内容]"
git push origin gh-pages
# → 自動デプロイ実行
```

## ⚙️ GitHub Actions設定

- **トリガー**: `main`, `gh-pages` 両ブランチ
- **ビルド**: 両ブランチで実行
- **デプロイ**: `gh-pages`ブランチのみ

## 🎁 メリット

1. **分離された管理**: 開発と運用が独立
2. **柔軟な更新**: 機能更新とDB更新を独立して実行可能
3. **安全性**: 個人データがmainブランチに混入しない
4. **自動化**: gh-pagesプッシュで自動デプロイ
5. **バックアップ**: 個人DBもGitで履歴管理

## 🚀 初期セットアップ

```bash
# リポジトリクローン
git clone <repository-url>
cd ePartsDB

# 個人運用ブランチ作成
git checkout -b gh-pages
git push -u origin gh-pages

# GitHub Pages設定: GitHub Actions使用
```
