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
cp ~/Downloads/eparts.db public/database/eparts.db
git add public/database/eparts.db
git commit -m "在庫データ更新: [変更内容]"
git push origin gh-pages
# → 自動デプロイ実行
```

## ⚙️ GitHub Actions設定

### 🔄 実行ポリシー

- **トリガー**: `main`, `gh-pages` 両ブランチ
- **ビルド**: 両ブランチで実行
- **デプロイ**: `gh-pages`ブランチのみ

### 🎯 なぜ両ブランチでビルドするのか

#### `main` ブランチでのビルド目的

- **早期エラー検出**: 開発段階でのビルドエラーを即座に発見
- **品質保証**: `gh-pages` にマージする前の事前検証
- **開発効率**: 壊れたコードが本番に到達するリスクを最小化

#### `gh-pages` ブランチでのビルド目的

- **本番デプロイ**: 実際のGitHub Pagesへの配信
- **最終検証**: デプロイ直前の最終ビルドチェック

### 📊 リソース使用量

- **`main` ブランチ**: ビルドのみ（約2-3分）
- **`gh-pages` ブランチ**: ビルド + デプロイ（約3-5分）
- **月間コスト**: GitHub Actions無料枠内で運用可能

### 🔧 代替設定オプション

必要に応じて以下の設定変更が可能：

1. **効率重視**: `gh-pages` のみでビルド実行
2. **品質重視**: 現在の設定（両ブランチでビルド）
3. **分離型**: CI用とCD用のワークフローを分離

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
