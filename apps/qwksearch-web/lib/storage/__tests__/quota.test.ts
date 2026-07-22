import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the database module so the quota helpers run against a controllable DB.
const getDB = vi.fn()
vi.mock('@/lib/database', () => ({ getDB: () => getDB() }))
vi.mock('@/lib/database/schema', () => ({ user: { id: 'id', storageUsedBytes: 'used', storageQuotaBytes: 'quota' } }))

import {
  checkUserStorageQuota,
  incrementUserStorageUsage,
  decrementUserStorageUsage,
  getUserStorageStats,
  DEFAULT_STORAGE_QUOTA_BYTES,
} from '../quota'

// Builds a drizzle-like select chain that resolves to `rows`.
function selectReturning(rows: any[]) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(rows),
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => Promise.resolve(undefined),
      }),
    }),
  }
}

beforeEach(() => {
  getDB.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('checkUserStorageQuota', () => {
  it('uses default quota when the user record is missing', async () => {
    getDB.mockReturnValue(selectReturning([]))
    const result = await checkUserStorageQuota('u1', 100)
    expect(result.quota).toBe(DEFAULT_STORAGE_QUOTA_BYTES)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(DEFAULT_STORAGE_QUOTA_BYTES - 100)
  })

  it('disallows when additional bytes exceed the default quota for a missing user', async () => {
    getDB.mockReturnValue(selectReturning([]))
    const result = await checkUserStorageQuota('u1', DEFAULT_STORAGE_QUOTA_BYTES + 1)
    expect(result.allowed).toBe(false)
  })

  it('computes allowance against an existing user record', async () => {
    getDB.mockReturnValue(
      selectReturning([{ storageUsedBytes: 400, storageQuotaBytes: 1000 }]),
    )
    const result = await checkUserStorageQuota('u1', 500)
    expect(result.used).toBe(400)
    expect(result.quota).toBe(1000)
    expect(result.remaining).toBe(600)
    expect(result.allowed).toBe(true)
  })

  it('disallows when the request exceeds remaining space', async () => {
    getDB.mockReturnValue(
      selectReturning([{ storageUsedBytes: 900, storageQuotaBytes: 1000 }]),
    )
    const result = await checkUserStorageQuota('u1', 200)
    expect(result.allowed).toBe(false)
  })

  it('returns a disallowed result when the query throws', async () => {
    getDB.mockImplementation(() => {
      throw new Error('db down')
    })
    const result = await checkUserStorageQuota('u1', 10)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })
})

describe('incrementUserStorageUsage', () => {
  it('returns true on a successful update', async () => {
    getDB.mockReturnValue(selectReturning([]))
    expect(await incrementUserStorageUsage('u1', 50)).toBe(true)
  })

  it('returns false when the update throws', async () => {
    getDB.mockImplementation(() => {
      throw new Error('boom')
    })
    expect(await incrementUserStorageUsage('u1', 50)).toBe(false)
  })
})

describe('decrementUserStorageUsage', () => {
  it('returns false when the user record is missing', async () => {
    getDB.mockReturnValue(selectReturning([]))
    expect(await decrementUserStorageUsage('u1', 50)).toBe(false)
  })

  it('clamps usage at zero and returns true', async () => {
    let setValue: any
    getDB.mockReturnValue({
      select: () => ({
        from: () => ({
          where: () => ({ limit: () => Promise.resolve([{ storageUsedBytes: 30 }]) }),
        }),
      }),
      update: () => ({
        set: (v: any) => {
          setValue = v
          return { where: () => Promise.resolve(undefined) }
        },
      }),
    })
    const result = await decrementUserStorageUsage('u1', 100)
    expect(result).toBe(true)
    expect(setValue.storageUsedBytes).toBe(0)
  })

  it('subtracts the given bytes from current usage', async () => {
    let setValue: any
    getDB.mockReturnValue({
      select: () => ({
        from: () => ({
          where: () => ({ limit: () => Promise.resolve([{ storageUsedBytes: 200 }]) }),
        }),
      }),
      update: () => ({
        set: (v: any) => {
          setValue = v
          return { where: () => Promise.resolve(undefined) }
        },
      }),
    })
    await decrementUserStorageUsage('u1', 50)
    expect(setValue.storageUsedBytes).toBe(150)
  })

  it('returns false when the query throws', async () => {
    getDB.mockImplementation(() => {
      throw new Error('nope')
    })
    expect(await decrementUserStorageUsage('u1', 10)).toBe(false)
  })
})

describe('getUserStorageStats', () => {
  it('returns defaults for a missing user', async () => {
    getDB.mockReturnValue(selectReturning([]))
    const stats = await getUserStorageStats('u1')
    expect(stats.quota).toBe(DEFAULT_STORAGE_QUOTA_BYTES)
    expect(stats.used).toBe(0)
    expect(stats.allowed).toBe(true)
  })

  it('computes stats from an existing record', async () => {
    getDB.mockReturnValue(
      selectReturning([{ storageUsedBytes: 250, storageQuotaBytes: 1000 }]),
    )
    const stats = await getUserStorageStats('u1')
    expect(stats.used).toBe(250)
    expect(stats.remaining).toBe(750)
    expect(stats.allowed).toBe(true)
  })

  it('marks allowed=false when usage meets or exceeds quota', async () => {
    getDB.mockReturnValue(
      selectReturning([{ storageUsedBytes: 1000, storageQuotaBytes: 1000 }]),
    )
    const stats = await getUserStorageStats('u1')
    expect(stats.allowed).toBe(false)
  })

  it('returns a disallowed result when the query throws', async () => {
    getDB.mockImplementation(() => {
      throw new Error('down')
    })
    const stats = await getUserStorageStats('u1')
    expect(stats.allowed).toBe(false)
    expect(stats.remaining).toBe(0)
  })
})
