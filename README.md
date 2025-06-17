# ePartsDB - 電子パーツ在庫管理システム

電子パーツの在庫を効率的に管理するためのWebアプリケーションです。

このプログラムおよびドキュメントは、GitHub CopilotのAgentモードで生成されました。使用したモデルはClaude Sonnet 4 (Preview)です。コード生成に使用した要求仕様は[こちら](URS/Requirement.md)。

## 🚀 機能

### ✅ 基本機能
- **パーツ検索**: カテゴリ別検索とキーワード検索
- **在庫管理**: パーツの在庫数表示・編集
- **詳細情報**: パーツの詳細情報表示
- **パーツ編集**: パーツ情報の編集
- **パーツ追加**: 新規パーツの追加
- **パーツ削除**: 不要なパーツの削除
- **データ同期**: データベースファイルのダウンロード
- **レスポンシブUI**: スマートフォン・タブレット対応

### 🔧 運用モード

このシステムには2つの運用モードがあります：

- **リモートモード** (GitHub Pages等): 読み取り専用、データ閲覧用
- **ローカルモード**: 編集・追加・削除が可能、データ管理用

ローカルモードはデータベースの編集・管理を行うための本格的な運用モードです。

### 🌟 高度な機能
- **ブラウザ内SQLite**: sql.jsによるクライアントサイドデータベース
- **環境自動判別**: デプロイ環境を自動判別してUI切り替え
- **ブラウザ別ダウンロード対応**: Chrome/Safari/Firefox対応
- **ダウンロード場所ガイド**: ブラウザ・OS別の保存場所案内

## 🛠 技術スタック

- **フロントエンド**: React 18 + TypeScript + Vite
- **データベース**: SQLite + sql.js (ブラウザ内実行)
- **スタイリング**: Tailwind CSS
- **アイコン**: Lucide React
- **ホスティング**: GitHub Pages (静的)
- **ビルドツール**: Vite
- **型チェック**: TypeScript

## 📊 プロジェクト統計

- **総コード行数**: 2,277行（TypeScript/React）
- **プロジェクト全体**: 7,271行（設定・ドキュメント含む）
- **コンポーネント数**: 6個（React TSX）
- **主要機能**: 検索・編集・追加・削除・同期
- **対応ブラウザ**: Chrome, Safari, Firefox, Edge

## 📦 セットアップ

### 依存関係のインストール

```bash
npm install
```

## 🚀 運用方法

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

**起動方法:**
```bash
npm run dev
```

**アクセス:**
- ブラウザで `http://localhost:5173` を開く

**特徴:**
- 編集・追加・削除が可能
- リアルタイムでデータ変更
- データベースファイルのダウンロード機能

**データ更新フロー:**
1. ローカルモードでデータを編集
2. 「同期（ダウンロード）」ボタンで更新されたeparts.dbをダウンロード
3. ダウンロードしたeparts.dbを`public/database/eparts.db`に配置
4. Gitでコミット・プッシュ
5. 次回のGitHub Pagesデプロイ時にリモートモードへ反映

## 🚢 デプロイ

### ブランチ構成と運用方式

このプロジェクトは**デュアルブランチ運用**を採用しています：

- **`main`ブランチ**:
  - 🧑‍💻 **開発・リリース管理用**
  - アプリケーションのソースコード
  - クリーンなサンプルデータベース
  - ドキュメント・設定ファイル
  - GitHub Actions: ビルドのみ（デプロイなし）

- **`gh-pages`ブランチ**:
  - 👤 **個人運用・実デプロイ用**
  - `main`の最新コード + 個人データベース
  - 実際の在庫管理データ
  - GitHub Actions: ビルド + GitHub Pagesデプロイ
  - 📱 実際にアクセスするURL: `https://[username].github.io/ePartsDB/`

### 🔄 初期セットアップ（個人利用向け）

#### 推奨手順: GitHub Actions + デュアルブランチ運用

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

## 📊 継続運用の流れ

### 🧑‍💻 **開発者フロー（mainブランチ）**

新機能の開発・バグ修正：

```bash
git checkout main
git pull origin main
# ... 開発作業 ...
git add .
git commit -m "機能追加: XXX"
git push origin main  # ビルドのみ、デプロイなし
```

### 👤 **個人利用者フロー（gh-pagesブランチ）**

#### パターン1: データベースのみ更新（日常運用）

```bash
git checkout gh-pages
npm run dev  # ローカルで在庫管理

# データ編集後、ダウンロードしたDBファイルを配置
cp ~/Downloads/eparts.db public/database/eparts.db

git add public/database/eparts.db
git commit -m "在庫データ更新: [変更内容]"
git push origin gh-pages  # 🚀 自動ビルド・デプロイ実行
```

#### パターン2: 最新機能を取り込み + DB更新

```bash
git checkout gh-pages
git merge main  # mainの最新機能を取り込み

# 必要に応じてデータベース更新
cp ~/Downloads/eparts.db public/database/eparts.db

git add .
git commit -m "機能更新 + 在庫データ更新"
git push origin gh-pages  # 🚀 自動ビルド・デプロイ実行
```

### 🎯 **運用のメリット**

- ✅ **分離された管理**: 開発と個人運用が独立
- ✅ **柔軟な更新**: 機能・データを独立して更新可能
- ✅ **自動デプロイ**: gh-pagesプッシュで自動反映
- ✅ **データ保護**: 個人DBがmainブランチに混入しない
- ✅ **履歴管理**: 個人DBの変更履歴もGitで管理

## � GitHub Pagesへのデプロイ

### 方式1: GitHub Actions（推奨）

GitHub ActionsによるCI/CDパイプラインを使用した自動デプロイです。

1. **GitHub Pagesの設定**
   - GitHubリポジトリの「Settings」タブ → 「Pages」
   - **Source**: 「GitHub Actions」を選択

2. **自動デプロイ**
   - `gh-pages` ブランチにプッシュすると自動でビルド・デプロイ実行
   - `.github/workflows/deploy.yml` でワークフロー定義済み
   - 手動実行も可能（「Actions」タブから「Run workflow」）

### 方式2: 手動デプロイ（代替案）

GitHub Actionsが使用できない場合の手動デプロイ方法です。

1. **GitHub Pagesの設定**
   - GitHubリポジトリの「Settings」タブ → 「Pages」
   - **Source**: 「Deploy from a branch」を選択
   - **Branch**: `gh-pages` を選択、**Folder**: `/ (root)` を選択

2. **手動デプロイ手順**

   ```bash
   # 1. mainブランチで開発・変更
   git checkout main
   # ... コード変更 ...
   git add .
   git commit -m "機能追加"
   git push origin main

   # 2. gh-pagesブランチでデプロイ
   git checkout gh-pages
   git merge main          # mainの変更を取り込み
   npm run build          # ビルド実行
   cp -r dist/* .         # ビルド済みファイルをルートに配置
   git add -A
   git commit -m "デプロイ: [変更内容]"
   git push origin gh-pages
   ```

### 📋 デプロイ確認

- **GitHub Actions使用時**: 「Actions」タブでワークフロー実行状況を確認
- **手動デプロイ時**: 「Settings」→「Pages」でデプロイ状況を確認
- 公開URL（`https://[username].github.io/ePartsDB/`）でアプリケーション動作確認

### 🔄 データベース更新の反映

1. ローカルモードでデータを編集
2. 「同期（ダウンロード）」でeparts.dbをダウンロード
3. ダウンロードしたファイルを`public/database/eparts.db`に配置
4. 変更をコミット・プッシュ

   ```bash
   # データベースファイルを更新
   cp ~/Downloads/eparts.db public/database/eparts.db
   git add public/database/eparts.db
   git commit -m "在庫データ更新: [変更内容]"
   git push origin gh-pages  # GitHub Actions使用時
   ```

5. GitHub Actionsが自動実行され、更新されたデータがリモートモードに反映

## 🗄 データベース

データベースは`public/database/eparts.db`に配置されています。

### スキーマ

- `categories`: パーツカテゴリ
- `parts`: 電子パーツ基本情報  
- `inventory`: 在庫情報

詳細なスキーマ定義は `URS/schema.sql` を参照してください。

### 📁 データベースファイル管理

**重要**: データベースファイルは`public/database/eparts.db`の**1箇所のみ**で管理されます。

- ✅ **本番・開発共通**: `public/database/eparts.db`
- ✅ **Vite自動処理**: ビルド時に`dist/database/eparts.db`に自動コピー

データベース更新時は`public/database/eparts.db`のみ更新すればOKです。

## 📱 使用方法

### パーツ検索（全モード共通）

1. **カテゴリ検索**: カテゴリボタンをクリック
2. **キーワード検索**: 検索ボックスにキーワードを入力
3. **詳細表示**: パーツ行の情報アイコンをクリック

### データ管理（ローカルモードのみ）

#### 在庫編集

1. 在庫数の数値を直接編集
2. 「同期（ダウンロード）」ボタンでデータベースファイルをダウンロード

#### パーツ編集

1. パーツ行の編集ボタンをクリック
2. 情報を編集して保存

#### パーツ追加

1. 「パーツの追加」ボタンをクリック
2. 必要な情報を入力して保存

#### パーツ削除

1. パーツ行の削除ボタンをクリック
2. 確認ダイアログで削除を実行

### データベース更新フロー（個人運用）

**個人の`gh-pages`ブランチでの在庫管理:**

1. ローカルモードでデータを編集（在庫数・パーツ情報など）
2. 「同期（ダウンロード）」ボタンをクリック
3. ファイル保存ダイアログで保存場所を選択（デフォルト：ダウンロードフォルダ）
4. ダウンロードした`eparts.db`ファイルを`public/database/`フォルダに移動
5. **`gh-pages`ブランチにコミット・プッシュ**

   ```bash
   git checkout gh-pages
   git add public/database/eparts.db
   git commit -m "在庫データ更新: [変更内容の説明]"
   git push origin gh-pages
   ```

   **注意**: データベースファイルの更新のみの場合、`npm run build`は不要です。

6. GitHub Pagesで個人サイトに自動反映

**保存場所のヒント:**

- Chrome/Edge: ファイル保存ダイアログでプロジェクトフォルダの`public/database/`に直接保存可能
- Safari/Firefox: ダウンロードフォルダに保存後、手動でプロジェクトの`public/database/`フォルダに移動

## 🚧 開発状況

### ✅ 実装済み機能

- ✅ パーツ検索（カテゴリ・キーワード）
- ✅ パーツ詳細表示
- ✅ 在庫数編集
- ✅ パーツ情報編集
- ✅ パーツ新規追加
- ✅ パーツ削除
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

## 🔧 開発者・管理者向け情報

### ブランチの役割分担

**開発者・管理者の場合:**

- `main`ブランチで機能開発・バグ修正
- サンプルデータベースの更新・メンテナンス
- リリース版の配布・管理

**エンドユーザーの場合:**

- `main`からフォーク・クローン
- `gh-pages`ブランチで個人の在庫管理
- 個人データは`main`に反映させない

## 🔧 アプリケーション開発

このセクションはアプリケーション自体の開発に関する情報です。

### 開発要件

- Node.js 18+
- npm または yarn

### 開発環境セットアップ

```bash
git clone <repository-url>
cd ePartsDB
npm install
npm run dev
```

### ビルド構成

**開発用ビルド:**

```bash
npm run dev  # 開発サーバー起動（ローカルモード）
```

**本番用ビルド:**

```bash
npm run build      # 本番ビルド
npm run preview    # ビルド結果をプレビュー
```

**出力:**

- `dist/` フォルダに静的ファイルが生成される
- GitHub Pagesや任意の静的サーバーにデプロイ可能

## � トラブルシューティング

### よくある問題と解決方法

#### 1. GitHub Pagesで「src/main.tsx 404エラー」が発生する

**症状**: `GET https://[username].github.io/src/main.tsx net::ERR_ABORTED 404 (Not Found)`

**原因**: ビルドされていない開発用ファイルが参照されている

**解決方法**:

1. **GitHub Actions使用時**:
   - 「Settings」→「Pages」で「GitHub Actions」を選択
   - `main`ブランチにプッシュして自動ビルド・デプロイを実行

2. **手動デプロイ時**:
   ```bash
   git checkout gh-pages
   npm run build
   cp -r dist/* .
   git add -A
   git commit -m "ビルド済みファイルでデプロイ修正"
   git push origin gh-pages
   ```

#### 2. データベースファイルが読み込めない

**症状**: データベース初期化エラー、データが表示されない

**原因**: データベースファイルのパスが間違っている、またはファイルが存在しない

**解決方法**:

- `public/database/eparts.db`ファイルが存在することを確認
- ビルド時に`dist/database/`にデータベースファイルが含まれることを確認

#### 3. GitHub Actionsがデプロイに失敗する

**症状**: Actions タブでワークフローが失敗している

**解決方法**:

1. エラーログを確認
2. `npm install`や`npm run build`がローカルで成功することを確認
3. リポジトリの「Settings」→「Pages」で「GitHub Actions」が選択されていることを確認

## �📄 ライセンス

このプロジェクトは MIT License の下でライセンスされています。

詳細については [LICENSE](LICENSE) ファイルを参照してください。
