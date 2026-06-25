/// <reference types="vite/client" />

declare module 'sql.js/dist/sql-wasm-browser.wasm?url' {
  const url: string
  export default url
}

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  // プロジェクト固有の環境変数をここに追加
  // readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
