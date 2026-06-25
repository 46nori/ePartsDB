import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  EPARTS_DB_PATH,
  EXPECTED_SCHEMA,
  getSqlJs,
  getTableColumns,
  getTableNames,
  isSqliteFile,
  openEpartsDb,
  queryCount,
  queryScalar,
} from '../helpers/sqlite'

const CATEGORIES_QUERY =
  'SELECT id, name, parent_id, display_order FROM categories ORDER BY display_order'

const PARTS_WITH_INVENTORY_QUERY = `
  SELECT
    p.id,
    p.name,
    p.category_id,
    p.manufacturer,
    p.part_number,
    p.package,
    p.description,
    p.created_at,
    COALESCE(i.quantity, 0) as quantity,
    COALESCE(i.location, '') as location,
    p.voltage_rating,
    p.current_rating,
    p.power_rating,
    p.tolerance,
    p.logic_family,
    p.datasheet_url,
    i.purchase_date,
    i.shop,
    i.shop_url,
    i.price_per_unit,
    COALESCE(i.currency, 'JPY') as currency,
    i.memo
  FROM parts p
  LEFT JOIN inventory i ON p.id = i.part_id
  ORDER BY p.name
`

describe('eparts.db', () => {
  it('exists and has a valid SQLite header', () => {
    const data = readFileSync(EPARTS_DB_PATH)
    expect(data.length).toBeGreaterThan(0)
    expect(isSqliteFile(data)).toBe(true)
  })

  it('contains required tables', async () => {
    const db = await openEpartsDb()
    try {
      const tables = getTableNames(db)
      expect(tables).toContain('categories')
      expect(tables).toContain('parts')
      expect(tables).toContain('inventory')
    } finally {
      db.close()
    }
  })

  it('matches URS/schema.sql column definitions', async () => {
    const db = await openEpartsDb()
    try {
      for (const [table, expectedColumns] of Object.entries(EXPECTED_SCHEMA)) {
        expect(getTableColumns(db, table)).toEqual(expectedColumns)
      }
    } finally {
      db.close()
    }
  })

  it('has production data (not empty)', async () => {
    const db = await openEpartsDb()
    try {
      expect(queryCount(db, 'SELECT COUNT(*) FROM categories')).toBeGreaterThan(0)
      expect(queryCount(db, 'SELECT COUNT(*) FROM parts')).toBeGreaterThan(0)
    } finally {
      db.close()
    }
  })

  it('runs application queries without error', async () => {
    const db = await openEpartsDb()
    try {
      const categories = db.exec(CATEGORIES_QUERY)
      const parts = db.exec(PARTS_WITH_INVENTORY_QUERY)

      expect(categories.length).toBe(1)
      expect(parts.length).toBe(1)
      expect(categories[0].values.length).toBeGreaterThan(0)
      expect(parts[0].values.length).toBeGreaterThan(0)
    } finally {
      db.close()
    }
  })

  it('supports parameterized search queries used by the app', async () => {
    const db = await openEpartsDb()
    try {
      const categoryId = queryScalar(
        db,
        'SELECT id FROM categories ORDER BY display_order LIMIT 1'
      ) as number

      const count = queryCount(
        db,
        `SELECT COUNT(*) FROM parts p
         WHERE p.category_id = ?
           AND (p.name LIKE ? OR p.part_number LIKE ? OR p.manufacturer LIKE ? OR p.description LIKE ?)`,
        [categoryId, '%a%', '%a%', '%a%', '%a%']
      )

      expect(count).toBeGreaterThanOrEqual(0)
    } finally {
      db.close()
    }
  })
})

describe('eparts.db round-trip', () => {
  it('export preserves data and remains a valid SQLite file', async () => {
    const SQL = await getSqlJs()
    const original = readFileSync(EPARTS_DB_PATH)
    const db = new SQL.Database(original)

    try {
      const partsBefore = queryCount(db, 'SELECT COUNT(*) FROM parts')
      const categoriesBefore = queryCount(db, 'SELECT COUNT(*) FROM categories')

      db.run(
        "INSERT INTO categories (name, parent_id, display_order) VALUES ('__vitest_roundtrip__', NULL, 999999)"
      )

      const exported = db.export()
      expect(isSqliteFile(exported)).toBe(true)

      const reloaded = new SQL.Database(exported)
      try {
        expect(queryCount(reloaded, 'SELECT COUNT(*) FROM parts')).toBe(partsBefore)
        expect(queryCount(reloaded, 'SELECT COUNT(*) FROM categories')).toBe(
          categoriesBefore + 1
        )
        expect(
          queryScalar(
            reloaded,
            "SELECT name FROM categories WHERE name = '__vitest_roundtrip__'"
          )
        ).toBe('__vitest_roundtrip__')
      } finally {
        reloaded.close()
      }
    } finally {
      db.close()
    }
  })

  it('supports transactions used by the app', async () => {
    const SQL = await getSqlJs()
    const db = new SQL.Database(readFileSync(EPARTS_DB_PATH))

    try {
      const partsBefore = queryCount(db, 'SELECT COUNT(*) FROM parts')

      db.exec('BEGIN TRANSACTION')
      try {
        db.run("INSERT INTO parts (name, category_id) VALUES ('__vitest_tx_test__', NULL)")
        db.exec('ROLLBACK')
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }

      expect(queryCount(db, 'SELECT COUNT(*) FROM parts')).toBe(partsBefore)
    } finally {
      db.close()
    }
  })
})
