/**
 * @fileoverview Unit tests for API key extraction, validation, and authentication guard.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  extractApiKey,
  validateApiKey,
  isApiKeyRequired,
  checkApiAuth,
} from '../api-key'
import configManager from '@/lib/config'
import * as envModule from '@/lib/config/env'
import * as dbModule from '@/lib/database'
import * as sessionModule from '@/lib/auth/session'

vi.mock('@/lib/database', () => ({
  getDB: vi.fn(),
}))

vi.mock('@/lib/config', () => ({
  default: {
    getConfig: vi.fn(),
  },
}))

vi.mock('@/lib/config/env', () => ({
  getEnv: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}))

describe('extractApiKey', () => {
  it('extracts from X-API-Key header', () => {
    const req = new Request('http://localhost/api/test', {
      headers: { 'x-api-key': 'qwk_12345' },
    })
    expect(extractApiKey(req)).toBe('qwk_12345')
  })

  it('extracts from Authorization: Bearer header', () => {
    const req = new Request('http://localhost/api/test', {
      headers: { authorization: 'Bearer qwk_67890' },
    })
    expect(extractApiKey(req)).toBe('qwk_67890')
  })

  it('extracts from Authorization: ApiKey header', () => {
    const req = new Request('http://localhost/api/test', {
      headers: { authorization: 'ApiKey qwk_apikey123' },
    })
    expect(extractApiKey(req)).toBe('qwk_apikey123')
  })

  it('extracts from apiKey query parameter', () => {
    const req = new Request('http://localhost/api/test?apiKey=qwk_querykey')
    expect(extractApiKey(req)).toBe('qwk_querykey')
  })

  it('extracts from api_key query parameter', () => {
    const req = new Request('http://localhost/api/test?api_key=qwk_querykey2')
    expect(extractApiKey(req)).toBe('qwk_querykey2')
  })

  it('returns null when no API key is provided', () => {
    const req = new Request('http://localhost/api/test')
    expect(extractApiKey(req)).toBeNull()
  })

  it('returns null for empty request or falsy object', () => {
    expect(extractApiKey(null as any)).toBeNull()
  })
})

describe('validateApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates against master API_KEY env variable', async () => {
    vi.spyOn(envModule, 'getEnv').mockImplementation((key) => {
      if (key === 'API_KEY') return 'master-secret-key'
      return undefined
    })

    const result = await validateApiKey('master-secret-key')
    expect(result.valid).toBe(true)
    expect(result.user?.id).toBe('master')
  })

  it('validates against database user records', async () => {
    vi.spyOn(envModule, 'getEnv').mockReturnValue(undefined)

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: 'user-1',
              name: 'Alice',
              email: 'alice@example.com',
              apiKey: 'qwk_alicekey',
            },
          ]),
        }),
      }),
    })

    vi.spyOn(dbModule, 'getDB').mockReturnValue({
      select: mockSelect,
    } as any)

    const result = await validateApiKey('qwk_alicekey')
    expect(result.valid).toBe(true)
    expect(result.user?.name).toBe('Alice')
  })

  it('returns invalid when key is not found in database', async () => {
    vi.spyOn(envModule, 'getEnv').mockReturnValue(undefined)

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    })

    vi.spyOn(dbModule, 'getDB').mockReturnValue({
      select: mockSelect,
    } as any)

    const result = await validateApiKey('qwk_nonexistent')
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('invalid_key')
  })

  it('returns missing_key for empty key', async () => {
    const result = await validateApiKey('')
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('missing_key')
  })
})

describe('isApiKeyRequired', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns true when configManager has requireApiKey=true', () => {
    vi.spyOn(configManager, 'getConfig').mockReturnValue(true)
    expect(isApiKeyRequired()).toBe(true)
  })

  it('returns true when configManager has requireApiKey="true"', () => {
    vi.spyOn(configManager, 'getConfig').mockReturnValue('true')
    expect(isApiKeyRequired()).toBe(true)
  })

  it('returns false when configManager has requireApiKey=false', () => {
    vi.spyOn(configManager, 'getConfig').mockReturnValue(false)
    expect(isApiKeyRequired()).toBe(false)
  })

  it('falls back to REQUIRE_API_KEY environment variable', () => {
    vi.spyOn(configManager, 'getConfig').mockReturnValue(undefined)
    vi.spyOn(envModule, 'getEnv').mockImplementation((key) => {
      if (key === 'REQUIRE_API_KEY') return 'true'
      return undefined
    })
    expect(isApiKeyRequired()).toBe(true)
  })
})

describe('checkApiAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('authorizes request when API key is not required', async () => {
    vi.spyOn(configManager, 'getConfig').mockReturnValue(false)
    vi.spyOn(envModule, 'getEnv').mockReturnValue(undefined)

    const req = new Request('http://localhost/api/search')
    const result = await checkApiAuth(req)
    expect(result.authorized).toBe(true)
  })

  it('authorizes request when API key is required and valid key is provided', async () => {
    vi.spyOn(configManager, 'getConfig').mockReturnValue(true)
    vi.spyOn(envModule, 'getEnv').mockImplementation((key) => {
      if (key === 'API_KEY') return 'valid-master-key'
      return undefined
    })

    const req = new Request('http://localhost/api/search', {
      headers: { 'x-api-key': 'valid-master-key' },
    })
    const result = await checkApiAuth(req)
    expect(result.authorized).toBe(true)
    expect(result.user?.id).toBe('master')
  })

  it('authorizes request via session fallback when user is logged in', async () => {
    vi.spyOn(configManager, 'getConfig').mockReturnValue(true)
    vi.spyOn(envModule, 'getEnv').mockReturnValue(undefined)
    vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
      user: { id: 'session-user-1', name: 'Logged In User', email: 'user@test.com' },
      session: { id: 'sess-1', userId: 'session-user-1', expiresAt: new Date() },
    })

    const req = new Request('http://localhost/api/search')
    const result = await checkApiAuth(req)
    expect(result.authorized).toBe(true)
    expect(result.user?.name).toBe('Logged In User')
  })

  it('rejects request with 401 when API key is required and no credentials provided', async () => {
    vi.spyOn(configManager, 'getConfig').mockReturnValue(true)
    vi.spyOn(envModule, 'getEnv').mockReturnValue(undefined)
    vi.spyOn(sessionModule, 'getSession').mockResolvedValue(null)

    const req = new Request('http://localhost/api/search')
    const result = await checkApiAuth(req)
    expect(result.authorized).toBe(false)
    expect(result.response?.status).toBe(401)
  })
})
