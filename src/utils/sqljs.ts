import initSqlJs, { type SqlJsStatic } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url'

let sqlPromise: Promise<SqlJsStatic> | null = null

/**
 * sql.js を初期化する（npm パッケージから WASM をバンドル）
 */
export function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({
      locateFile: () => wasmUrl,
    })
  }
  return sqlPromise
}
