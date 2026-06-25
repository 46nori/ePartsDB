import { describe, expect, it } from 'vitest'
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { EPARTS_DB_PATH } from '../helpers/sqlite'

function sha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex')
}

function readGhPagesDb(): Buffer {
  return execSync('git show gh-pages:public/database/eparts.db', {
    encoding: 'buffer',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

describe('gh-pages eparts.db sync', () => {
  it('public/database/eparts.db matches gh-pages branch', () => {
    let ghPagesDb: Buffer
    try {
      ghPagesDb = readGhPagesDb()
    } catch (error) {
      throw new Error(
        'gh-pages branch is not available. Run: git fetch origin gh-pages:gh-pages',
        { cause: error }
      )
    }

    const localDb = readFileSync(EPARTS_DB_PATH)

    expect(sha256(localDb)).toBe(sha256(ghPagesDb))
  })
})
