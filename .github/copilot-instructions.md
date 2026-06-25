# ePartsDB - 電子パーツ在庫管理システム

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## プロジェクト概要
ePartsDBは、電子パーツの在庫を管理するためのWebアプリケーションです。

### 技術スタック
- **フロントエンド**: React 18 + TypeScript + Vite 6
- **データベース**: SQLite + sql.js 1.14（npmパッケージからWASMをバンドル、`src/utils/sqljs.ts`）
- **スタイリング**: Tailwind CSS 3
- **アイコン**: Lucide React 1.x
- **テスト**: Vitest（`tests/database/`）
- **Lint**: ESLint 9（`eslint.config.js`、flat config）

### 主な機能
- パーツのカテゴリ検索・キーワード検索
- 在庫数の表示・編集（ローカルモードのみ）
- パーツ詳細情報の表示
- レスポンシブデザイン
- 環境自動判別（ローカル/リモート）

### アーキテクチャの特徴
- Single Page Application (SPA)
- 静的ホスティング対応（GitHub Pages想定、base: `/ePartsDB/`）
- ブラウザ内SQLiteデータベース
- 環境によるUI切り替え（読み取り専用/編集可能）

### コーディング規約
- TypeScriptの型安全性を重視
- 関数コンポーネント + Hooksを使用
- Tailwind CSSによるユーティリティファーストなスタイリング
- レスポンシブデザインの実装
- 開発専用ログは `src/utils/devLog.ts` の `devLog` を使用
- 本番でも確認すべき異常系は `console.warn` / `console.error` を使用

### データベース設計
- categories: パーツカテゴリ
- parts: 電子パーツ基本情報
- inventory: 在庫情報

データベースファイル（`public/database/eparts.db`）はGitHubで管理され、ブラウザで直接読み込まれる。
`gh-pages`ブランチのDBが本番最新。developでは `npm run sync:db` で同期する。

### 開発コマンド
- `npm run dev` - 開発サーバー
- `npm test` - DB互換性テスト
- `npm run lint` - ESLint
- `npm run sync:db` - gh-pagesからeparts.dbを同期
- `npm run build` - 本番ビルド

### CI
プッシュ時に lint・test・build を実行（Node.js 22）。デプロイは `gh-pages` のみ。
