/**
 * @fileoverview The admin panel's news health check: each dependency of the
 * widget is reported separately, with the upstream's own error message.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/cloudflare/context', () => ({ getCloudflareContext: vi.fn() }))
vi.mock('../settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../settings')>()),
  getNewsWidgetSettings: vi.fn(),
}))
vi.mock('../store', () => ({
  storeTrendingNews: vi.fn(),
  readStoredTrendingNews: vi.fn(),
}))
vi.mock('trending-news-api/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('trending-news-api/server')>()),
  searchNewsForTopic: vi.fn(),
  fetchWikipediaTopPages: vi.fn(),
}))

import { getCloudflareContext } from '@/lib/cloudflare/context'
import { fetchWikipediaTopPages, searchNewsForTopic } from 'trending-news-api/server'
import { DEFAULT_NEWS_WIDGET_SETTINGS, getNewsWidgetSettings } from '../settings'
import { diagnoseNews } from '../trending'

const mockContext = getCloudflareContext as unknown as ReturnType<typeof vi.fn>
const mockSettings = getNewsWidgetSettings as unknown as ReturnType<typeof vi.fn>
const mockSearch = searchNewsForTopic as unknown as ReturnType<typeof vi.fn>
const mockWiki = fetchWikipediaTopPages as unknown as ReturnType<typeof vi.fn>

const check = (checks: { name: string; ok: boolean; detail: string }[], name: string) =>
  checks.find((c) => c.name === name)!

beforeEach(() => {
  delete process.env.THE_NEWS_API_KEY
  mockSettings.mockResolvedValue({ ...DEFAULT_NEWS_WIDGET_SETTINGS })
  mockContext.mockReturnValue({ env: { THE_NEWS_API_KEY: 'k' } })
  mockSearch.mockResolvedValue([{ title: 'x' }])
  mockWiki.mockResolvedValue([{ rank: 1, article: 'Eclipse', views: 10 }])
})

describe('diagnoseNews', () => {
  it('passes every check when the upstreams answer', async () => {
    mockContext.mockReturnValue({ env: { THE_NEWS_API_KEY: 'k', KV: {} } })

    const checks = await diagnoseNews()

    expect(checks.every((c) => c.ok)).toBe(true)
    expect(check(checks, 'Wikipedia trending ranking').detail).toContain('Eclipse')
  })

  it('names a missing API key and skips the News API call', async () => {
    mockContext.mockReturnValue({ env: {} })

    const checks = await diagnoseNews()

    expect(check(checks, 'THE_NEWS_API_KEY').ok).toBe(false)
    expect(check(checks, 'The News API').detail).toBe('Skipped: no API key.')
    expect(mockSearch).not.toHaveBeenCalled()
  })

  it('reports the News API’s own error message', async () => {
    mockSearch.mockRejectedValue(new Error('The News API: Usage limit reached. (usage_limit_reached)'))

    const checks = await diagnoseNews()

    expect(check(checks, 'The News API')).toEqual({
      name: 'The News API',
      ok: false,
      detail: 'The News API: Usage limit reached. (usage_limit_reached)',
    })
  })

  it('reports an unreachable Wikipedia ranking', async () => {
    mockWiki.mockRejectedValue(new Error('Failed to fetch Wikipedia top pages: 429'))

    const checks = await diagnoseNews()

    expect(check(checks, 'Wikipedia trending ranking')).toMatchObject({
      ok: false,
      detail: 'Failed to fetch Wikipedia top pages: 429',
    })
  })

  it('skips Wikipedia when default topics replace the ranking', async () => {
    mockSettings.mockResolvedValue({ ...DEFAULT_NEWS_WIDGET_SETTINGS, defaultTopics: 'climate' })

    const checks = await diagnoseNews()

    expect(mockWiki).not.toHaveBeenCalled()
    expect(check(checks, 'Wikipedia trending ranking').ok).toBe(true)
  })

  it('flags a site that has the widget switched off', async () => {
    mockSettings.mockResolvedValue({ ...DEFAULT_NEWS_WIDGET_SETTINGS, enabled: false })

    const checks = await diagnoseNews()

    expect(check(checks, 'Widget enabled').ok).toBe(false)
  })
})
