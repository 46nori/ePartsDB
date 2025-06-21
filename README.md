# ePartsDB - 電子パーツ在庫管理システム

電子パーツの在庫を効率的に管理するためのWebアプリケーションです。

このプログラムおよびドキュメントは、GitHub CopilotのAgentモードで生成されました。使用したモデルはClaude Sonnet 4 (Preview)です。コード生成に使用した要求仕様は[こちら](URS/Requirement.md)。

## � システム概要

### ✨ 主な特徴

- **2つの運用モード**: リモート閲覧用とローカル編集用
- **ブラウザ内SQLite**: sql.jsによるクライアントサイドデータベース
- **レスポンシブUI**: PC・タブレット・スマートフォン対応
- **静的ホスティング**: GitHub Pages等での簡単デプロイ

### 🚀 基本機能

- **パーツ検索**: カテゴリ別検索・キーワード検索
- **在庫管理**: 在庫数の表示・編集（ローカルモード）
- **パーツ管理**: 詳細表示・編集・追加・削除
- **カテゴリ管理**: カテゴリ名編集・表示順序変更・追加・削除
- **データ同期**: 編集内容のダウンロード・バックアップ

### 🛠 技術スタック

- **フロントエンド**: React 18 + TypeScript + Vite
- **データベース**: SQLite + sql.js (ブラウザ内実行)
- **スタイリング**: Tailwind CSS
- **アイコン**: Lucide React
- **ホスティング**: GitHub Pages (静的)

### 📊 プロジェクト統計

- **総コード行数**: 2,730行（TypeScript/React）
- **プロジェクト全体**: 8,384行（設定・ドキュメント含む）
- **コンポーネント数**: 9個（React TSX）
- **対応ブラウザ**: Chrome, Safari, Firefox, Edge

## � 使い方

### 🌐 リモートモード（データ閲覧用）

GitHub Pagesで公開されているアプリで、データの閲覧のみ可能です。

**アクセス方法:**

- GitHub Pagesのデプロイ済みURLにアクセス

**特徴:**

- 読み取り専用
- パーツ検索・詳細表示のみ
- 最新のデータベース内容を反映

### 💻 ローカルモード（データ管理用）

ローカルサーバーで動作するモードで、データベースの編集・管理が可能です。

> **前提条件**: 「👤 個人運用」セクションの初期セットアップが完了していること

**起動方法:**

```bash
npm run dev
```

**アクセス:**

- ブラウザで [http://localhost:5173](http://localhost:5173) を開く

**特徴:**

- 編集・追加・削除が可能
- リアルタイムでデータ変更
- データベースファイルのダウンロード機能

> 💡 **初回利用の方**: まず「👤 個人運用」の初期セットアップを実行してください。

### 📱 基本操作

#### パーツ検索（全モード共通）

1. **カテゴリ検索**: カテゴリボタンをクリック
2. **キーワード検索**: 検索ボックスにキーワードを入力
3. **詳細表示**: パーツ行の情報アイコンをクリック

#### データ管理（ローカルモードのみ）

- **在庫編集**: 在庫数の数値を直接編集
- **パーツ編集**: パーツ行の編集ボタンをクリック→情報を編集→保存
- **パーツ追加**: 「パーツの追加」ボタン→必要な情報を入力→保存
- **パーツ削除**: パーツ行の削除ボタン→確認ダイアログで実行
- **カテゴリ管理**: 「カテゴリ編集」ボタン→名前編集・順序変更・追加・削除→保存

## 👤 個人運用

> **重要**: ローカルモード（データ管理）を使用するには、まずこちらの初期セットアップが必要です。

### 🔄 初期セットアップ

1. **リポジトリをフォーク**

   ```bash
   # GitHubでフォーク後
   git clone <your-forked-repository-url>
   cd ePartsDB
   npm install
   ```

2. **個人運用ブランチを作成**

   ```bash
   # gh-pagesブランチを作成（個人運用用）
   git checkout -b gh-pages
   
   # 任意: 個人のデータベースに差し替え
   cp /path/to/your/eparts.db public/database/eparts.db
   
   git add .
   git commit -m "個人運用環境の初期セットアップ"
   git push -u origin gh-pages
   ```

3. **GitHub Pagesの設定**
   - リポジトリの「Settings」→「Pages」
   - **Source**: 「GitHub Actions」を選択

> ✅ **セットアップ完了後**: 上記の「💻 ローカルモード」でデータ管理が可能になります。

### 📊 日常的なデータ更新

```bash
git checkout gh-pages
# ローカルでデータを編集し、DBをダウンロード
cp ~/Downloads/eparts.db public/database/eparts.db
git add public/database/eparts.db
git commit -m "在庫データ更新"
git push origin gh-pages  # 自動デプロイ
```

### 🔄 最新機能の取り込み

```bash
git checkout gh-pages
git merge main  # 最新機能を取り込み（DBは自動保護）
git push origin gh-pages  # 自動デプロイ
```

### 📁 データ更新フロー

1. ローカルモードでデータを編集
2. 「同期（ダウンロード）」ボタンで更新されたeparts.dbをダウンロード
3. ダウンロードしたeparts.dbを`public/database/eparts.db`に配置
4. Gitでコミット・プッシュ
5. 次回のGitHub Pagesデプロイ時にリモートモードへ反映

## � 開発・リリース方法

### 🏗 ブランチ構成（トリプルブランチ運用）

- **`develop`ブランチ**: 機能開発・バグ修正用
- **`main`ブランチ**: リリース版・安定版管理
- **`gh-pages`ブランチ**: 個人運用・実デプロイ用

### �‍💻 開発環境セットアップ

```bash
# リポジトリのクローン
git clone <repository-url>
cd ePartsDB
npm install

# developブランチに切り替えて開発開始
git checkout develop
git pull origin develop
npm run dev  # 開発サーバー起動
```

### 🔄 開発フロー

```bash
# 1. 機能開発
git checkout develop
git pull origin develop
# ... 開発作業 ...
git add .
git commit -m "機能追加: XXX"
git push origin develop

# 2. リリース（メンテナー向け）
git checkout main
git pull origin main
git merge develop
git push origin main
```

### 🚀 mainブランチでのリリース手順

メンテナー向けの詳細なリリース手順：

```bash
# 1. developブランチの準備確認
git checkout develop
git pull origin develop
npm run build  # ビルドエラーがないか確認
npm run preview  # 動作確認

# 2. mainブランチへマージ
git checkout main
git pull origin main
git merge develop

# 3. バージョン更新
npm version patch  # パッチ版上げ（バグ修正）
# または
npm version minor  # マイナー版上げ（新機能）
# または
npm version major  # メジャー版上げ（破壊的変更）

# 4. CHANGELOG.mdの更新
# 新しいバージョンの変更内容を記録

# 5. リリースコミット・タグ作成・プッシュ
git add .
git commit -m "リリース準備: v$(node -p "require('./package.json').version")"
git push origin main
git push --tags  # タグもプッシュ

# 6. GitHubでリリース作成
# GitHub上でReleases → "Create a new release"
# - タグ: 最新のvタグを選択
# - リリースタイトル: "v1.3.0"
# - 説明: CHANGELOG.mdの該当バージョンの内容をコピー
```

### ✅ リリース後の確認事項

- [ ] GitHub Actionsが正常に完了している
- [ ] リリースページが正しく作成されている  
- [ ] タグが正しく作成されている
- [ ] CHANGELOGが最新版を反映している

### 🔨 ビルドコマンド

```bash
npm run build    # 本番ビルド
npm run preview  # ビルド結果をプレビュー
```

## 🗄 データベース

- **ファイル**: `public/database/eparts.db`（1箇所で管理）
- **スキーマ**: categories, parts, inventory
- **詳細**: `URS/schema.sql` を参照

## 🚧 開発状況

### ✅ 実装済み機能

- ✅ パーツ検索（カテゴリ・キーワード）
- ✅ パーツ詳細表示
- ✅ 在庫数編集
- ✅ パーツ情報編集
- ✅ パーツ新規追加
- ✅ パーツ削除
- ✅ カテゴリ編集（名前・表示順序変更）
- ✅ カテゴリ新規追加
- ✅ カテゴリ削除
- ✅ データベース同期（ダウンロード）
- ✅ 環境自動判別
- ✅ レスポンシブUI
- ✅ ブラウザ別ダウンロード対応

### 🎯 品質指標

- ✅ TypeScript型安全性
- ✅ エラーハンドリング
- ✅ ユーザビリティ
- ✅ パフォーマンス最適化
- ✅ セキュリティ対策

## 🚨 トラブルシューティング

- **データベース読み込めない**: `public/database/eparts.db`の存在確認、ブラウザコンソールでエラーチェック
- **GitHub Actionsデプロイ失敗**: Actions タブでエラーログ確認、ローカルビルド成功確認

## 📄 ライセンス

このプロジェクトは MIT License の下でライセンスされています。

詳細については [LICENSE](LICENSE) ファイルを参照してください。
