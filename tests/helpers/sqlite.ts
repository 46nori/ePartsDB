import initSqlJs, { type Database } from 'sql.js'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

export const EPARTS_DB_PATH = path.join(projectRoot, 'public/database/eparts.db')

/** URS/schema.sql に定義されたテーブルとカラム */
export const EXPECTED_SCHEMA: Record<string, string[]> = {
  categories: ['id', 'name', 'parent_id', 'display_order'],
  parts: [
    'id',
    'name',
    'category_id',
    'manufacturer',
    'part_number',
    'package',
    'voltage_rating',
    'current_rating',
    'power_rating',
    'tolerance',
    'logic_family',
    'description',
    'datasheet_url',
    'created_at',
  ],
  inventory: [
    'id',
    'part_id',
    'quantity',
    'location',
    'purchase_date',
    'shop',
    'price_per_unit',
    'currency',
    'memo',
    'shop_url',
  ],
}

let sqlPromise: ReturnType<typeof initSqlJs> | null = null

export async function getSqlJs() {
  if (!sqlPromise) {
    sqlPromise = initSqlJs()
  }
  return sqlPromise
}

export async function openEpartsDb(): Promise<Database> {
  const SQL = await getSqlJs()
  const buffer = readFileSync(EPARTS_DB_PATH)
  return new SQL.Database(buffer)
}

export function queryScalar(db: Database, sql: string, params: unknown[] = []): unknown {
  const stmt = db.prepare(sql)
  try {
    if (params.length > 0) {
      stmt.bind(params)
    }
    if (!stmt.step()) {
      return undefined
    }
    return stmt.get()[0]
  } finally {
    stmt.free()
  }
}

export function queryCount(db: Database, sql: string, params: unknown[] = []): number {
  const value = queryScalar(db, sql, params)
  return Number(value)
}

export function getTableColumns(db: Database, tableName: string): string[] {
  const stmt = db.prepare(`PRAGMA table_info(${tableName})`)
  const columns: string[] = []
  try {
    while (stmt.step()) {
      columns.push(String(stmt.get()[1]))
    }
  } finally {
    stmt.free()
  }
  return columns
}

export function getTableNames(db: Database): string[] {
  const result = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  if (result.length === 0) {
    return []
  }
  return result[0].values.map((row) => String(row[0]))
}

export function isSqliteFile(data: Uint8Array): boolean {
  const header = new TextDecoder().decode(data.slice(0, 16))
  return header.startsWith('SQLite format 3')
}
