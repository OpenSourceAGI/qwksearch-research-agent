/**
 * @fileoverview Route tests for the admin rate-limit endpoint: the admin
 * guard, saving settings, and resetting counters.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/admin', () => ({ assertAdmin: vi.fn() }))
vi.mock('@/lib/auth/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/database', () => ({ getQueryDB: vi.fn(() => ({})) }))
vi.mock('@/lib/rate-limit/api-settings', () => ({
  SETTINGS_CACHE_MS: 15_000,
  readApiRateLimitSettings: vi.fn(),
  saveApiRateLimitSettings: vi.fn(),
}))
vi.mock('@/lib/rate-limit/api-limiter', () => ({
  countOpenWindows: vi.fn(),
  listActiveBuckets: vi.fn(),
  resetCounters: vi.fn(),
}))

import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/auth/admin'
import { getSession } from '@/lib/auth/session'
import { readApiRateLimitSettings, saveApiRateLimitSettings } from '@/lib/rate-limit/api-settings'
import { countOpenWindows, listActiveBuckets, resetCounters } from '@/lib/rate-limit/api-limiter'
import { DEFAULT_API_RATE_LIMIT_SETTINGS } from '@/lib/rate-limit/api-rules'
import { jsonRequest } from '../../../__tests__/helpers/fake-db'
import { GET, POST } from '../route'

const mockAssertAdmin = assertAdmin as unknown as ReturnType<typeof vi.fn>
const mockGetSession = getSession as unknown as ReturnType<typeof vi.fn>
const mockRead = readApiRateLimitSettings as unknown as ReturnType<typeof vi.fn>
const mockSave = saveApiRateLimitSettings as unknown as ReturnType<typeof vi.fn>
const mockList = listActiveBuckets as unknown as ReturnType<typeof vi.fn>
const mockCount = countOpenWindows as unknown as ReturnType<typeof vi.fn>
const mockReset = resetCounters as unknown as ReturnType<typeof vi.fn>

const BUCKET = {
  bucket: '1.1.1.1|default',
  clientKey: '1.1.1.1',
  rule: 'default',
  windowStart: 60,
  count: 4,
  expiresAt: 120,
}

const post = (body: unknown) =>
  POST(jsonRequest('http://localhost/api/admin/rate-limit', 'POST', body))

beforeEach(() => {
  vi.clearAllMocks()
  mockAssertAdmin.mockResolvedValue(null)
  mockGetSession.mockResolvedValue({ user: { email: 'admin@example.com' } })
  mockRead.mockResolvedValue(DEFAULT_API_RATE_LIMIT_SETTINGS)
  mockList.mockResolvedValue([BUCKET])
  mockCount.mockResolvedValue(1)
})

describe('admin guard', () => {
  it('refuses a non-admin on every method without touching storage', async () => {
    mockAssertAdmin.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))

    expect((await GET()).status).toBe(403)
    expect((await post({ enabled: false })).status).toBe(403)
    expect((await post({ action: 'reset' })).status).toBe(403)
    expect(mockSave).not.toHaveBeenCalled()
    expect(mockReset).not.toHaveBeenCalled()
  })
})

describe('GET /api/admin/rate-limit', () => {
  it('returns the settings and the open windows', async () => {
    const body = await (await GET()).json()

    expect(body.settings).toEqual(DEFAULT_API_RATE_LIMIT_SETTINGS)
    expect(body.activity).toEqual({ buckets: [BUCKET], openWindows: 1, error: null })
    expect(body.settingsCacheSeconds).toBe(15)
  })

  it('still returns the settings when the counters cannot be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockList.mockRejectedValue(new Error('no such table: api_rate_limit_counters'))

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.settings).toEqual(DEFAULT_API_RATE_LIMIT_SETTINGS)
    expect(body.activity.error).toContain('no such table')
  })
})

describe('POST /api/admin/rate-limit', () => {
  it('saves only the known settings fields, recording who saved them', async () => {
    mockSave.mockResolvedValue({ ...DEFAULT_API_RATE_LIMIT_SETTINGS, requestsPerWindow: 10 })

    const res = await post({ requestsPerWindow: 10, windowSeconds: 30, sneaky: 'x' })

    expect(res.status).toBe(200)
    expect(mockSave).toHaveBeenCalledWith({}, { requestsPerWindow: 10, windowSeconds: 30 }, 'admin@example.com')
    expect((await res.json()).settings.requestsPerWindow).toBe(10)
  })

  it('rejects a body with no known settings, or that is not JSON', async () => {
    expect((await post({ nothing: true })).status).toBe(400)
    expect((await post([1, 2])).status).toBe(400)

    const bad = new Request('http://localhost/api/admin/rate-limit', { method: 'POST', body: '{' })
    expect((await POST(bad as any)).status).toBe(400)
    expect(mockSave).not.toHaveBeenCalled()
  })

  it('resets one bucket, or every bucket', async () => {
    mockReset.mockResolvedValue(1)

    const one = await (await post({ action: 'reset', bucket: BUCKET.bucket })).json()
    expect(mockReset).toHaveBeenLastCalledWith({}, BUCKET.bucket)
    expect(one.deleted).toBe(1)

    await post({ action: 'reset' })
    expect(mockReset).toHaveBeenLastCalledWith({}, undefined)
  })

  it('reports a failed save instead of pretending it worked', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockSave.mockRejectedValue(new Error('D1 is down'))

    const res = await post({ enabled: false })

    expect(res.status).toBe(500)
    expect((await res.json()).message).toBe('D1 is down')
  })
})
