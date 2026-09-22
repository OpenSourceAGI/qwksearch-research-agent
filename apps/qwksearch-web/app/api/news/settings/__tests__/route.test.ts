/**
 * @fileoverview The public settings the homepage news widget reads before it
 * fetches anything. Nothing here may be user-specific or secret.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/news/settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/news/settings')>()),
  getNewsWidgetSettings: vi.fn(),
}))

import { DEFAULT_NEWS_WIDGET_SETTINGS, getNewsWidgetSettings } from '@/lib/news/settings'
import { GET } from '../route'

const mockSettings = getNewsWidgetSettings as unknown as ReturnType<typeof vi.fn>

const request = () => new Request('https://qwksearch.com/api/news/settings')

beforeEach(() => {
  mockSettings.mockResolvedValue(DEFAULT_NEWS_WIDGET_SETTINGS)
})

describe('GET /api/news/settings', () => {
  it('serves the widget’s display settings', async () => {
    mockSettings.mockResolvedValue({
      ...DEFAULT_NEWS_WIDGET_SETTINGS,
      enabled: false,
      maxTopics: 9,
      defaultTopics: 'fusion, shipping',
    })

    const body = await (await GET(request())).json()

    expect(body).toEqual({
      enabled: false,
      allowUserTopics: true,
      defaultTopics: 'fusion, shipping',
      maxTopics: 9,
      showImages: true,
    })
  })

  it('does not expose the operational settings', async () => {
    const body = await (await GET(request())).json()

    // Cache and retention windows are the server's business; leaking them
    // only tells a caller how to time a cache-busting loop.
    expect(body).not.toHaveProperty('cacheMinutes')
    expect(body).not.toHaveProperty('retentionDays')
  })

  it('is cacheable, but only briefly — switching the widget off must take effect', async () => {
    const response = await GET(request())

    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60')
  })
})
