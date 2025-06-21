# ブランチ運用戦略

## 🎯 ブランチ構成

### `main` ブランチ
- **目的**: リリース管理・安定版
- **内容**: 
  - 安定版のアプリケーションコード
  - リリース済みの機能
  - 本番環境対応済みのコード
- **GitHub Actions**: ビルドのみ（デプロイなし）
- **使用者**: エンドユーザー・本番環境

### `develop` ブランチ
- **目的**: 開発統合・機能開発
- **内容**:
  - 開発中の最新機能
  - 機能統合・テスト用コード
  - 次期リリース候補
- **GitHub Actions**: ビルドのみ（デプロイなし）
- **使用者**: 開発者・コントリビューター

### `gh-pages` ブランチ  
- **目的**: 個人運用・実デプロイ
- **内容**:
  - `main`からマージされた安定版コード
  - 個人の実際のパーツDB
  - 運用固有の設定
- **GitHub Actions**: ビルド + GitHub Pagesデプロイ
- **使用者**: エンドユーザー（個人）

## 🔄 運用フロー

### 開発フロー（開発者向け）

```bash
# 1. 機能開発
git checkout develop
git pull origin develop
# ... 開発作業 ...
git add .
git commit -m "機能追加: XXX"
git push origin develop

# 2. テスト確認
npm run dev  # ローカルで動作確認
npm run build  # ビルドエラーがないか確認
```

### リリースフロー（メンテナー向け）

```bash
# 1. developの機能をmainにマージ
git checkout main
git pull origin main
git merge develop
git push origin main

# 2. リリースタグ作成（オプション）
git tag v1.x.x
git push origin v1.x.x
```

### 運用フロー（個人利用者向け）

```bash
# 1. 最新機能を取り込み（必要時）
git checkout gh-pages
git merge main  # 安定版を取り込み
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

- **トリガー**: `main`, `develop`, `gh-pages` 全ブランチ
- **ビルド**: 全ブランチで実行
- **デプロイ**: `gh-pages`ブランチのみ

### 🎯 各ブランチでのビルド目的

#### `develop` ブランチでのビルド目的

- **早期エラー検出**: 開発段階でのビルドエラーを即座に発見
- **統合テスト**: 複数機能の統合時の問題を検出
- **開発効率**: 壊れたコードがmainに到達するリスクを最小化

#### `main` ブランチでのビルド目的

- **リリース前検証**: 安定版コードの最終確認
- **品質保証**: `gh-pages` にマージする前の事前検証
- **リリース準備**: 本番環境対応の最終チェック

#### `gh-pages` ブランチでのビルド目的

- **本番デプロイ**: 実際のGitHub Pagesへの配信
- **最終検証**: デプロイ直前の最終ビルドチェック

### 📊 リソース使用量

- **`develop` ブランチ**: ビルドのみ（約2-3分）
- **`main` ブランチ**: ビルドのみ（約2-3分）
- **`gh-pages` ブランチ**: ビルド + デプロイ（約3-5分）
- **月間コスト**: GitHub Actions無料枠内で運用可能

### 🔧 代替設定オプション

必要に応じて以下の設定変更が可能：

1. **効率重視**: `gh-pages` のみでビルド実行
2. **品質重視**: 現在の設定（全ブランチでビルド）
3. **分離型**: CI用とCD用のワークフローを分離

## 🎁 メリット

1. **明確な役割分離**: 開発(develop)・安定版(main)・運用(gh-pages)が独立
2. **安全なリリース**: developでテスト後mainにマージする安全な流れ
3. **柔軟な更新**: 機能更新とDB更新を独立して実行可能
4. **品質保証**: 段階的な検証によるコード品質の向上
5. **安全性**: 個人データがdevelop/mainブランチに混入しない
6. **自動化**: gh-pagesプッシュで自動デプロイ
7. **バックアップ**: 個人DBもGitで履歴管理

## 🚀 初期セットアップ

```bash
# リポジトリクローン
git clone <repository-url>
cd ePartsDB

# 開発ブランチ作成（まだない場合）
git checkout -b develop
git push -u origin develop

# 個人運用ブランチ作成
git checkout -b gh-pages
git push -u origin gh-pages

# GitHub Pages設定: GitHub Actions使用
```

## 🔄 ブランチ移行手順

既存のmainブランチからの移行：

```bash
# 1. 現在のmainからdevelopを作成
git checkout main
git checkout -b develop
git push -u origin develop

# 2. 今後の開発はdevelopで実施
# 3. mainは安定版のリリース専用に変更
```
