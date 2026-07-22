import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Control the KV binding returned via the cloudflare context.
const getCloudflareContext = vi.fn()
vi.mock('../../cloudflare-context', () => ({
  getCloudflareContext: () => getCloudflareContext(),
}))

import {
  storeCredentials,
  getCredentials,
  deleteCredentials,
  hasCredentials,
} from '../credentials'

const KV_PREFIX = 'notebooklm:creds:'

function createKV() {
  const store = new Map<string, string>()
  return {
    put: vi.fn(async (k: string, v: string) => {
      store.set(k, v)
    }),
    get: vi.fn(async (k: string) => (store.has(k) ? store.get(k)! : null)),
    delete: vi.fn(async (k: string) => {
      store.delete(k)
    }),
    _store: store,
  }
}

let kv: ReturnType<typeof createKV>

beforeEach(() => {
  kv = createKV()
  getCloudflareContext.mockReturnValue({ env: { KV: kv }, cf: undefined, ctx: null })
})

afterEach(() => {
  vi.clearAllMocks()
})

const sampleCreds = {
  googleEmail: 'user@example.com',
  cookies: [{ name: 'SID', value: 'abc', domain: '.google.com', path: '/' }],
}

describe('storeCredentials', () => {
  it('writes a record with userId, createdAt and a 7-day TTL', async () => {
    await storeCredentials('user-1', sampleCreds)
    expect(kv.put).toHaveBeenCalledTimes(1)
    const [key, raw, opts] = kv.put.mock.calls[0]
    expect(key).toBe(KV_PREFIX + 'user-1')
    const record = JSON.parse(raw)
    expect(record.userId).toBe('user-1')
    expect(typeof record.createdAt).toBe('number')
    expect(record.googleEmail).toBe('user@example.com')
    expect(opts.expirationTtl).toBe(60 * 60 * 24 * 7)
  })

  it('throws when the KV binding is missing', async () => {
    getCloudflareContext.mockReturnValue({ env: {}, cf: undefined, ctx: null })
    await expect(storeCredentials('u', sampleCreds)).rejects.toThrow(
      'KV binding not available',
    )
  })
})

describe('getCredentials', () => {
  it('returns null when no record exists', async () => {
    expect(await getCredentials('nobody')).toBeNull()
  })

  it('returns the stored record', async () => {
    await storeCredentials('user-2', sampleCreds)
    const creds = await getCredentials('user-2')
    expect(creds?.googleEmail).toBe('user@example.com')
  })

  it('deletes and returns null for an expired record', async () => {
    const expired = { ...sampleCreds, expiresAt: Date.now() - 1000 }
    kv._store.set(KV_PREFIX + 'user-3', JSON.stringify({ ...expired, userId: 'user-3', createdAt: 0 }))
    expect(await getCredentials('user-3')).toBeNull()
    expect(kv.delete).toHaveBeenCalledWith(KV_PREFIX + 'user-3')
  })

  it('returns a record whose expiry is still in the future', async () => {
    const future = { ...sampleCreds, expiresAt: Date.now() + 60_000 }
    kv._store.set(KV_PREFIX + 'user-4', JSON.stringify({ ...future, userId: 'user-4', createdAt: 0 }))
    expect(await getCredentials('user-4')).not.toBeNull()
  })

  it('throws when the KV binding is missing', async () => {
    getCloudflareContext.mockReturnValue({ env: {}, cf: undefined, ctx: null })
    await expect(getCredentials('u')).rejects.toThrow('KV binding not available')
  })
})

describe('deleteCredentials', () => {
  it('deletes the record from KV', async () => {
    await storeCredentials('user-5', sampleCreds)
    await deleteCredentials('user-5')
    expect(kv.delete).toHaveBeenCalledWith(KV_PREFIX + 'user-5')
    expect(await getCredentials('user-5')).toBeNull()
  })

  it('throws when the KV binding is missing', async () => {
    getCloudflareContext.mockReturnValue({ env: {}, cf: undefined, ctx: null })
    await expect(deleteCredentials('u')).rejects.toThrow('KV binding not available')
  })
})

describe('hasCredentials', () => {
  it('returns true when a record exists', async () => {
    await storeCredentials('user-6', sampleCreds)
    expect(await hasCredentials('user-6')).toBe(true)
  })

  it('returns false when no record exists', async () => {
    expect(await hasCredentials('ghost')).toBe(false)
  })
})
