# ePartsDB - 電子パーツ在庫管理システム

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## プロジェクト概要
ePartsDBは、電子パーツの在庫を管理するためのWebアプリケーションです。

### 技術スタック
- **フロントエンド**: React + TypeScript + Vite
- **データベース**: SQLite + sql.js (ブラウザ内実行)
- **スタイリング**: Tailwind CSS
- **アイコン**: Lucide React

### 主な機能
- パーツのカテゴリ検索・キーワード検索
- 在庫数の表示・編集（ローカルモードのみ）
- パーツ詳細情報の表示
- レスポンシブデザイン
- 環境自動判別（ローカル/リモート）

### アーキテクチャの特徴
- Single Page Application (SPA)
- 静的ホスティング対応（GitHub Pages想定）
- ブラウザ内SQLiteデータベース
- 環境によるUI切り替え（読み取り専用/編集可能）

### コーディング規約
- TypeScriptの型安全性を重視
- 関数コンポーネント + Hooksを使用
- Tailwind CSSによるユーティリティファーストなスタイリング
- レスポンシブデザインの実装

### データベース設計
- categories: パーツカテゴリ
- parts: 電子パーツ基本情報
- inventory: 在庫情報

データベースファイル（eparts.db）はGitHubで管理され、ブラウザで直接読み込まれます。
