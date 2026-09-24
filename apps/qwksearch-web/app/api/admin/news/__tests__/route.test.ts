/**
 * @fileoverview Route tests for the admin news-widget endpoint: the admin
 * guard, saving settings, and the archive actions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/admin', () => ({ assertAdmin: vi.fn() }))
vi.mock('@/lib/auth/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/news/settings', () => ({
  getNewsWidgetSettings: vi.fn(),
  saveNewsWidgetSettings: vi.fn(),
}))
vi.mock('@/lib/news/store', () => ({
  clearStoredNews: vi.fn(),
  getNewsStoreStats: vi.fn(),
  pruneStoredNews: vi.fn(),
  readStoredTopicArticles: vi.fn(),
}))
vi.mock('@/lib/news/trending', () => ({
  getNewsApiKey: vi.fn(),
  refreshStoredNews: vi.fn(),
}))

import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/auth/admin'
import { getSession } from '@/lib/auth/session'
import { getNewsWidgetSettings, saveNewsWidgetSettings } from '@/lib/news/settings'
import {
  clearStoredNews,
  getNewsStoreStats,
  pruneStoredNews,
  readStoredTopicArticles,
} from '@/lib/news/store'
import { getNewsApiKey, refreshStoredNews } from '@/lib/news/trending'
import { jsonRequest } from '../../../__tests__/helpers/fake-db'
import { GET, POST, DELETE } from '../route'

const mockAssertAdmin = assertAdmin as unknown as ReturnType<typeof vi.fn>
const mockGetSession = getSession as unknown as ReturnType<typeof vi.fn>
const mockGetSettings = getNewsWidgetSettings as unknown as ReturnType<typeof vi.fn>
const mockSaveSettings = saveNewsWidgetSettings as unknown as ReturnType<typeof vi.fn>
const mockStats = getNewsStoreStats as unknown as ReturnType<typeof vi.fn>
const mockClear = clearStoredNews as unknown as ReturnType<typeof vi.fn>
const mockPrune = pruneStoredNews as unknown as ReturnType<typeof vi.fn>
const mockTopicArticles = readStoredTopicArticles as unknown as ReturnType<typeof vi.fn>
const mockApiKey = getNewsApiKey as unknown as ReturnType<typeof vi.fn>
const mockRefresh = refreshStoredNews as unknown as ReturnType<typeof vi.fn>

const SETTINGS = {
  enabled: true,
  defaultTopics: '',
  allowUserTopics: true,
  maxTopics: 6,
  showImages: true,
  cacheMinutes: 10,
  retentionDays: 30,
}

const STATS = { articleCount: 3, topicCount: 2, lastFetchedAt: null, topTopics: [] }

const getRequest = (query = '') =>
  ({ nextUrl: new URL(`http://localhost/api/admin/news${query}`) }) as any

const post = (body: unknown) =>
  POST(jsonRequest('http://localhost/api/admin/news', 'POST', body))

beforeEach(() => {
  vi.clearAllMocks()
  mockAssertAdmin.mockResolvedValue(null)
  mockGetSession.mockResolvedValue({ user: { email: 'admin@example.com' } })
  mockGetSettings.mockResolvedValue(SETTINGS)
  mockStats.mockResolvedValue(STATS)
  mockApiKey.mockReturnValue('a-key')
})

describe('admin guard', () => {
  const forbidden = () =>
    mockAssertAdmin.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))

  it('refuses a non-admin on every method', async () => {
    forbidden()

    expect((await GET(getRequest())).status).toBe(403)
    expect((await post({ enabled: false })).status).toBe(403)
    expect((await DELETE()).status).toBe(403)
    // Nothing was read or written on the way to the refusal.
    expect(mockSaveSettings).not.toHaveBeenCalled()
    expect(mockClear).not.toHaveBeenCalled()
  })
})

describe('GET /api/admin/news', () => {
  it('returns the settings, the archive stats and whether a key is set', async () => {
    const body = await (await GET(getRequest())).json()

    expect(body).toEqual({ settings: SETTINGS, stats: STATS, apiKeyConfigured: true })
  })

  it('reports a missing API key without ever returning the key itself', async () => {
    mockApiKey.mockReturnValue('super-secret')

    const text = await (await GET(getRequest())).text()

    expect(text).not.toContain('super-secret')
    expect(JSON.parse(text).apiKeyConfigured).toBe(true)

    mockApiKey.mockReturnValue(undefined)
    expect((await (await GET(getRequest())).json()).apiKeyConfigured).toBe(false)
  })

  it('returns one topic’s stored articles when asked for a topic', async () => {
    mockTopicArticles.mockResolvedValue([{ title: 'One' }])

    const body = await (await GET(getRequest('?topic=Eclipse'))).json()

    expect(mockTopicArticles).toHaveBeenCalledWith('Eclipse')
    expect(body).toEqual({ topic: 'Eclipse', articles: [{ title: 'One' }] })
  })
})

describe('POST /api/admin/news', () => {
  it('saves the named settings, attributed to the signed-in admin', async () => {
    mockSaveSettings.mockResolvedValue({ ...SETTINGS, enabled: false })

    const body = await (await post({ enabled: false, defaultTopics: 'fusion' })).json()

    expect(mockSaveSettings).toHaveBeenCalledWith(
      { enabled: false, defaultTopics: 'fusion' },
      'admin@example.com',
    )
    expect(body.settings.enabled).toBe(false)
  })

  it('ignores keys that are not settings', async () => {
    mockSaveSettings.mockResolvedValue(SETTINGS)

    await post({ enabled: false, id: 'not-global', updatedBy: 'someone-else' })

    expect(mockSaveSettings).toHaveBeenCalledWith({ enabled: false }, 'admin@example.com')
  })

  it('400s a body with no known settings in it', async () => {
    const res = await post({ nonsense: true })

    expect(res.status).toBe(400)
    expect(mockSaveSettings).not.toHaveBeenCalled()
  })

  it('400s an unparseable body', async () => {
    const res = await POST(
      new Request('http://localhost/api/admin/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      }) as any,
    )

    expect(res.status).toBe(400)
  })

  it('fetches and stores on the refresh action', async () => {
    mockRefresh.mockResolvedValue({ stored: 12, topics: 3 })

    const body = await (await post({ action: 'refresh' })).json()

    expect(body).toEqual({ stored: 12, topics: 3, stats: STATS })
    expect(mockSaveSettings).not.toHaveBeenCalled()
  })

  it('passes an upstream failure back to the admin instead of claiming success', async () => {
    mockRefresh.mockResolvedValue({
      stored: 0,
      topics: 0,
      error: 'THENEWSAPI_API_KEY is not configured',
    })

    const body = await (await post({ action: 'refresh' })).json()

    expect(body.error).toBe('THENEWSAPI_API_KEY is not configured')
  })

  it('prunes with the configured retention window', async () => {
    mockPrune.mockResolvedValue(7)

    const body = await (await post({ action: 'prune' })).json()

    expect(mockPrune).toHaveBeenCalledWith(30)
    expect(body.deleted).toBe(7)
  })

  it('500s a failed save rather than reporting it as stored', async () => {
    mockSaveSettings.mockRejectedValue(new Error('Database unavailable'))

    const res = await post({ enabled: false })

    expect(res.status).toBe(500)
  })
})

describe('DELETE /api/admin/news', () => {
  it('empties the archive and reports what it removed', async () => {
    mockClear.mockResolvedValue(42)

    const body = await (await DELETE()).json()

    expect(body).toEqual({ deleted: 42, stats: STATS })
  })

  it('500s a failed clear', async () => {
    mockClear.mockRejectedValue(new Error('Database unavailable'))

    expect((await DELETE()).status).toBe(500)
  })
})
