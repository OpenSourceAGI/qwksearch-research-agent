import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/cloudflare/context', () => ({
  getCloudflareContext: vi.fn(),
}))

// The route now reads admin settings from D1 and writes fetched articles to
// it. Both modules degrade to "no database" on their own, but stubbing them
// here keeps these tests about the route: caching, the API key, and which
// topics reach the upstream.
vi.mock('@/lib/news/settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/news/settings')>()),
  getNewsWidgetSettings: vi.fn(),
}))
vi.mock('@/lib/news/store', () => ({
  storeTrendingNews: vi.fn(async () => 0),
  readStoredTrendingNews: vi.fn(async () => null),
}))

// Only the request handler is stubbed: the route's cache keys are built with
// the package's real `parseTopicLimit`, which is the point of that normalising.
vi.mock('trending-news-api/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('trending-news-api/server')>()),
  handleTrendingNewsRequest: vi.fn(),
}))

import { getCloudflareContext } from '@/lib/cloudflare/context'
import { handleTrendingNewsRequest } from 'trending-news-api/server'
import {
  DEFAULT_NEWS_WIDGET_SETTINGS,
  getNewsWidgetSettings,
  type NewsWidgetSettings,
} from '@/lib/news/settings'
import { readStoredTrendingNews, storeTrendingNews } from '@/lib/news/store'
import { GET } from '../route'

const mockContext = getCloudflareContext as ReturnType<typeof vi.fn>
const mockHandle = handleTrendingNewsRequest as ReturnType<typeof vi.fn>
const mockSettings = getNewsWidgetSettings as ReturnType<typeof vi.fn>
const mockStore = storeTrendingNews as ReturnType<typeof vi.fn>
const mockReadStored = readStoredTrendingNews as ReturnType<typeof vi.fn>

/** The site settings for a test, defaulting to the shipped defaults. */
function siteSettings(overrides: Partial<NewsWidgetSettings> = {}) {
  mockSettings.mockResolvedValue({ ...DEFAULT_NEWS_WIDGET_SETTINGS, ...overrides })
}

/** The topics the route asked the upstream handler for, on call `index`. */
function requestedTopics(index = 0): string | null {
  const [request] = mockHandle.mock.calls[index]
  return new URL((request as Request).url).searchParams.get('topics')
}

/** A KV binding that records what the route stores. */
function fakeKV(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial))
  return {
    store,
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value)
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key)
    }),
  }
}

/**
 * The cache keys holding served answers, with the long-lived "last good" and
 * failure-marker copies filtered out — those share a key prefix, not a meaning.
 */
function answerKeys(kv: ReturnType<typeof fakeKV>): string[] {
  return [...kv.store.keys()].filter((key) => !key.includes(':stale'))
}

function stubEnv(env: Record<string, unknown>) {
  mockContext.mockReturnValue({ env, cf: undefined, ctx: null })
}

/** A fresh Response per call — a Response body can only be read once. */
function upstream(body: unknown, status = 200) {
  mockHandle.mockImplementation(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }),
  )
}

const request = (query = '') =>
  new Request(`https://qwksearch.com/api/news/trending${query}`)

const TOPICS = { source: 'wikipedia_daily_top', date: '2024-01-01', topics: [{ topic: 'Eclipse' }] }

describe('GET /api/news/trending', () => {
  beforeEach(() => {
    delete process.env.THE_NEWS_API_KEY
    siteSettings()
    mockStore.mockResolvedValue(0)
    mockReadStored.mockResolvedValue(null)
  })

  it('serves the trending list with the server-held API key', async () => {
    stubEnv({ THE_NEWS_API_KEY: 'worker-secret' })
    upstream(TOPICS)

    const response = await GET(request('?limit=6'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(TOPICS)
    expect(mockHandle).toHaveBeenCalledWith(expect.any(Request), { apiKey: 'worker-secret' })
  })

  it('falls back to process.env when there is no Worker binding', async () => {
    mockContext.mockImplementation(() => {
      throw new Error('no cloudflare runtime')
    })
    process.env.THE_NEWS_API_KEY = 'env-secret'
    upstream(TOPICS)

    await GET(request())

    expect(mockHandle).toHaveBeenCalledWith(expect.any(Request), { apiKey: 'env-secret' })
  })

  it('never leaks the API key to the caller', async () => {
    stubEnv({ THE_NEWS_API_KEY: 'worker-secret' })
    upstream(TOPICS)

    const response = await GET(request('?limit=6'))

    expect(await response.text()).not.toContain('worker-secret')
  })

  it('caches a successful answer in KV for the next visitor', async () => {
    const kv = fakeKV()
    stubEnv({ THE_NEWS_API_KEY: 'k', KV: kv })
    upstream(TOPICS)

    const first = await GET(request('?limit=6'))
    expect(first.headers.get('X-Trending-News-Cache')).toBe('MISS')
    // A day by default: the ranking this widget reads only changes once a day,
    // so a shorter window would re-fetch an identical body.
    expect(kv.put).toHaveBeenCalledWith('trending-news:v2:top:6', JSON.stringify(TOPICS), {
      expirationTtl: 86400,
    })
    // A second, week-long copy is what a failed refresh falls back on.
    expect(kv.put).toHaveBeenCalledWith('trending-news:last-good:v2:top:6', JSON.stringify(TOPICS), {
      expirationTtl: 604800,
    })

    const second = await GET(request('?limit=6'))
    expect(second.headers.get('X-Trending-News-Cache')).toBe('HIT')
    expect(await second.json()).toEqual(TOPICS)
    // The cached answer is served without asking Wikipedia or The News API again.
    expect(mockHandle).toHaveBeenCalledTimes(1)
  })

  it('keys the cache by topic, so one topic never answers another', async () => {
    const kv = fakeKV()
    stubEnv({ THE_NEWS_API_KEY: 'k', KV: kv })
    upstream({ topic: 'Eclipse', news_count: 0, articles: [] })

    await GET(request('?topic=Eclipse'))
    await GET(request('?topic=Elections'))

    expect(answerKeys(kv)).toEqual([
      'trending-news:v2:topic:eclipse',
      'trending-news:v2:topic:elections',
    ])
  })

  it('normalises the limit so one answer gets one cache entry', async () => {
    const kv = fakeKV()
    stubEnv({ THE_NEWS_API_KEY: 'k', KV: kv })
    upstream(TOPICS)

    await GET(request('?limit=6'))
    await GET(request('?limit=06'))
    // Beyond the server's cap, so it answers with the same 50 topics as any
    // other oversized request.
    await GET(request('?limit=99999'))
    await GET(request('?limit=50'))

    expect([...kv.store.keys()].filter((k) => k.startsWith('trending-news:v2:') && !k.includes(':stale'))).toEqual([
      'trending-news:v2:top:6',
      'trending-news:v2:top:50',
    ])
  })

  it('does not cache a failure as an answer', async () => {
    const kv = fakeKV()
    stubEnv({ THE_NEWS_API_KEY: 'k', KV: kv })
    upstream({ error: 'Failed to fetch Wikipedia trends' }, 500)

    const response = await GET(request())

    expect(response.status).toBe(500)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    // The error body is never stored as the answer for the next visitor...
    expect(answerKeys(kv)).toEqual([])
    // ...only a short-lived marker, so the failing upstream isn't hammered.
    expect(kv.store.get('trending-news:v2:top:25:stale:fail')).toBe('1')
  })

  it('still answers when KV is unavailable', async () => {
    stubEnv({ THE_NEWS_API_KEY: 'k' })
    upstream(TOPICS)

    const response = await GET(request())

    expect(response.headers.get('X-Trending-News-Cache')).toBe('BYPASS')
    expect(await response.json()).toEqual(TOPICS)
  })

  it('survives a KV read that throws', async () => {
    const kv = fakeKV()
    kv.get.mockRejectedValue(new Error('KV unavailable'))
    stubEnv({ THE_NEWS_API_KEY: 'k', KV: kv })
    upstream(TOPICS)

    const response = await GET(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(TOPICS)
  })

  it('passes an unconfigured key through as the handler’s own error', async () => {
    stubEnv({})
    upstream({ error: 'THE_NEWS_API_KEY is not configured' }, 500)

    const response = await GET(request())

    expect(mockHandle).toHaveBeenCalledWith(expect.any(Request), { apiKey: undefined })
    expect(response.status).toBe(500)
  })
})

describe('GET /api/news/trending — admin settings', () => {
  beforeEach(() => {
    delete process.env.THE_NEWS_API_KEY
    siteSettings()
    mockStore.mockResolvedValue(0)
    mockReadStored.mockResolvedValue(null)
    stubEnv({ THE_NEWS_API_KEY: 'k' })
  })

  it('answers an empty list, not an error, when the widget is switched off', async () => {
    siteSettings({ enabled: false })
    upstream(TOPICS)

    const response = await GET(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ source: 'disabled', date: '', topics: [] })
    expect(response.headers.get('X-Trending-News-Cache')).toBe('OFF')
    // Nothing is fetched, so a disabled widget costs no News API quota.
    expect(mockHandle).not.toHaveBeenCalled()
  })

  it('serves the admin default topics when the visitor named none', async () => {
    siteSettings({ defaultTopics: 'fusion power, shipping' })
    upstream(TOPICS)

    await GET(request('?limit=6'))

    expect(requestedTopics()).toBe('fusion power,shipping')
  })

  it('lets a visitor’s own topics override the admin defaults', async () => {
    siteSettings({ defaultTopics: 'fusion power' })
    upstream(TOPICS)

    await GET(request('?topics=local%20elections%2Cbaseball'))

    expect(requestedTopics()).toBe('local elections,baseball')
  })

  it('ignores a visitor’s topics when the site does not allow them', async () => {
    siteSettings({ defaultTopics: 'fusion power', allowUserTopics: false })
    upstream(TOPICS)

    await GET(request('?topics=local%20elections'))

    expect(requestedTopics()).toBe('fusion power')
  })

  it('keys the cache by the resolved topics, not the raw query string', async () => {
    const kv = fakeKV()
    stubEnv({ THE_NEWS_API_KEY: 'k', KV: kv })
    upstream(TOPICS)

    // Same topics, written differently by two visitors.
    await GET(request('?topics=AI%2C%20climate'))
    await GET(request('?topics=climate%2Cai'))

    expect([...kv.store.keys()].filter((k) => k.startsWith('trending-news:v2:') && !k.includes(':stale'))).toEqual([
      'trending-news:v2:topics:ai|climate',
    ])
    expect(mockHandle).toHaveBeenCalledTimes(1)
  })

  it('honours the configured cache window', async () => {
    const kv = fakeKV()
    stubEnv({ THE_NEWS_API_KEY: 'k', KV: kv })
    siteSettings({ cacheMinutes: 30 })
    upstream(TOPICS)

    const response = await GET(request('?limit=6'))

    expect(kv.put).toHaveBeenCalledWith(expect.any(String), expect.any(String), {
      expirationTtl: 1800,
    })
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=1800')
  })
})

describe('GET /api/news/trending — stored articles', () => {
  beforeEach(() => {
    delete process.env.THE_NEWS_API_KEY
    siteSettings()
    mockStore.mockResolvedValue(0)
    mockReadStored.mockResolvedValue(null)
    stubEnv({ THE_NEWS_API_KEY: 'k' })
  })

  it('stores what it fetched', async () => {
    upstream(TOPICS)

    await GET(request('?limit=6'))

    expect(mockStore).toHaveBeenCalledWith(TOPICS)
  })

  it('does not store a single-topic lookup, which is not the widget’s list', async () => {
    upstream({ topic: 'Eclipse', news_count: 0, articles: [] })

    await GET(request('?topic=Eclipse'))

    expect(mockStore).not.toHaveBeenCalled()
  })

  it('serves stored articles when the upstream fails', async () => {
    upstream({ error: 'THE_NEWS_API_KEY is not configured' }, 500)
    mockReadStored.mockResolvedValue({
      source: 'wikipedia_daily_top',
      date: '2024-01-01',
      topics: [{ topic: 'Eclipse', news_count: 1, articles: [] }],
    })

    const response = await GET(request('?limit=6'))

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Trending-News-Cache')).toBe('STORED')
    // Marked stale, and not cached — the next request tries the upstream again.
    expect(await response.json()).toMatchObject({ stale: true })
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=0')
  })

  it('asks the archive for the same topics it was serving', async () => {
    siteSettings({ defaultTopics: 'fusion power, shipping' })
    upstream({ error: 'Failed to fetch news for topics' }, 500)

    await GET(request())

    expect(mockReadStored).toHaveBeenCalledWith(
      expect.objectContaining({ topics: ['fusion power', 'shipping'] }),
    )
  })

  it('treats an empty daily list as a failure: not cached, archive served', async () => {
    const kv = fakeKV()
    stubEnv({ THE_NEWS_API_KEY: 'k', KV: kv })
    upstream({ source: 'wikipedia_daily_top', date: '2024-01-01', topics: [] })
    mockReadStored.mockResolvedValue({
      source: 'wikipedia_daily_top',
      date: '2024-01-01',
      topics: [{ topic: 'Eclipse', news_count: 1, articles: [] }],
    })

    const response = await GET(request('?limit=6'))

    expect(answerKeys(kv)).toEqual([])
    expect(mockStore).not.toHaveBeenCalled()
    expect(response.headers.get('X-Trending-News-Cache')).toBe('STORED')
  })

  it('keeps a last-good copy and serves it when the archive has nothing', async () => {
    const kv = fakeKV()
    stubEnv({ THE_NEWS_API_KEY: 'k', KV: kv })
    upstream(TOPICS)
    await GET(request('?limit=15'))
    expect(kv.put).toHaveBeenCalledWith(
      'trending-news:last-good:v2:top:15',
      JSON.stringify(TOPICS),
      { expirationTtl: 7 * 24 * 60 * 60 },
    )

    // The short cache window has passed; the News API now refuses every search.
    kv.store.delete('trending-news:v2:top:15')
    upstream({ error: 'The News API: Usage limit reached.' }, 502)

    const response = await GET(request('?limit=15'))

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Trending-News-Cache')).toBe('STORED')
    expect(await response.json()).toMatchObject({ ...TOPICS, stale: true })
  })

  it('prefers the archive over the last-good copy', async () => {
    const kv = fakeKV({ 'trending-news:last-good:v2:top:6': JSON.stringify(TOPICS) })
    stubEnv({ THE_NEWS_API_KEY: 'k', KV: kv })
    upstream({ error: 'The News API: Usage limit reached.' }, 502)
    const archived = {
      source: 'wikipedia_daily_top',
      date: '2024-01-02',
      topics: [{ topic: 'Comet', news_count: 1, articles: [] }],
    }
    mockReadStored.mockResolvedValue(archived)

    const response = await GET(request('?limit=6'))

    expect(await response.json()).toMatchObject({ ...archived, stale: true })
  })

  it('does not keep a last-good copy of a single-topic lookup', async () => {
    const kv = fakeKV()
    stubEnv({ THE_NEWS_API_KEY: 'k', KV: kv })
    upstream({ topic: 'Eclipse', news_count: 0, articles: [] })

    await GET(request('?topic=Eclipse'))

    expect([...kv.store.keys()]).toEqual(['trending-news:v2:topic:eclipse'])
  })

  it('still reports the failure when the archive is empty too', async () => {
    upstream({ error: 'Failed to fetch Wikipedia trends' }, 500)

    const response = await GET(request())

    expect(response.status).toBe(500)
  })
})

describe('GET /api/news/trending — surviving an upstream 502', () => {
  beforeEach(() => {
    delete process.env.THE_NEWS_API_KEY
    siteSettings()
    mockStore.mockResolvedValue(0)
    mockReadStored.mockResolvedValue(null)
    stubEnv({ THE_NEWS_API_KEY: 'k' })
  })

  /**
   * A KV holding only the long-lived copy of one good answer — the state a
   * request finds once the day's cache window has expired but the week's
   * fallback has not.
   */
  const withLastGood = (key: string) => ({ [`${key}:stale`]: JSON.stringify(TOPICS) })

  it('serves the last good answer instead of a 502 when the archive is empty', async () => {
    const kv = fakeKV(withLastGood('trending-news:v2:top:6'))
    stubEnv({ THE_NEWS_API_KEY: 'k', KV: kv })
    // The real 502 shape: every News API search for the batch failed.
    upstream({ error: 'The News API: quota exceeded', upstream_status: 429, kind: 'rate_limit' }, 502)

    const response = await GET(request('?limit=6'))

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Trending-News-Cache')).toBe('STALE')
    expect(await response.json()).toMatchObject({ stale: true, topics: TOPICS.topics })
  })

  it('still refreshes from the upstream after serving a stale answer', async () => {
    const kv = fakeKV(withLastGood('trending-news:v2:top:6'))
    stubEnv({ THE_NEWS_API_KEY: 'k', KV: kv })
    upstream({ error: 'The News API: quota exceeded' }, 502)

    await GET(request('?limit=6'))

    // The failure marker is short-lived, so the next request retries rather
    // than pinning the widget to old news for the rest of the day.
    expect(kv.store.get('trending-news:v2:top:6:stale:fail')).toBe('1')
  })

  it('serves the stale answer without re-calling an upstream already failing', async () => {
    const kv = fakeKV({
      ...withLastGood('trending-news:v2:top:6'),
      'trending-news:v2:top:6:stale:fail': '1',
    })
    stubEnv({ THE_NEWS_API_KEY: 'k', KV: kv })
    upstream(TOPICS)

    const response = await GET(request('?limit=6'))

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Trending-News-Cache')).toBe('STALE')
    expect(mockHandle).not.toHaveBeenCalled()
  })

  it('prefers the archive over the KV copy, since it is the more precise match', async () => {
    const kv = fakeKV(withLastGood('trending-news:v2:top:6'))
    stubEnv({ THE_NEWS_API_KEY: 'k', KV: kv })
    upstream({ error: 'The News API: quota exceeded' }, 502)
    mockReadStored.mockResolvedValue({
      source: 'wikipedia_daily_top',
      date: '2024-01-01',
      topics: [{ topic: 'Eclipse', news_count: 1, articles: [] }],
    })

    const response = await GET(request('?limit=6'))

    expect(response.headers.get('X-Trending-News-Cache')).toBe('STORED')
  })

  it('serves stored articles for a single-topic lookup too', async () => {
    upstream({ error: 'The News API: quota exceeded' }, 502)
    mockReadStored.mockResolvedValue({
      source: 'custom_topics',
      date: '2024-01-01',
      topics: [{ topic: 'Eclipse', news_count: 1, articles: [] }],
    })

    const response = await GET(request('?topic=Eclipse'))

    expect(response.status).toBe(200)
    expect(mockReadStored).toHaveBeenCalledWith(
      expect.objectContaining({ topics: ['Eclipse'], limit: 1 }),
    )
  })

  it('reports 503 rather than 502 while cooling down with nothing to show', async () => {
    const kv = fakeKV({ 'trending-news:v2:top:6:stale:fail': '1' })
    stubEnv({ THE_NEWS_API_KEY: 'k', KV: kv })
    upstream(TOPICS)

    const response = await GET(request('?limit=6'))

    // Retry-After makes the client back off; 503 says "try later", where a 502
    // would read as "this endpoint is broken".
    expect(response.status).toBe(503)
    expect(mockHandle).not.toHaveBeenCalled()
  })

  it('collapses concurrent cold requests into one upstream fetch', async () => {
    const kv = fakeKV()
    stubEnv({ THE_NEWS_API_KEY: 'k', KV: kv })
    // Held open so all three requests are demonstrably waiting on the same call.
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    mockHandle.mockImplementation(async () => {
      await gate
      return new Response(JSON.stringify(TOPICS), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })

    const inFlight = Promise.all([
      GET(request('?limit=6')),
      GET(request('?limit=6')),
      GET(request('?limit=6')),
    ])
    await vi.waitFor(() => expect(mockHandle).toHaveBeenCalledTimes(1))
    release()
    const responses = await inFlight

    // Three visitors missing on a cold cache must not mean three searches per
    // topic — that burst is what trips the API's rate limit in the first place.
    expect(mockHandle).toHaveBeenCalledTimes(1)
    for (const response of responses) {
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual(TOPICS)
    }
  })

  it('clears the failure marker once the upstream recovers', async () => {
    const kv = fakeKV({ 'trending-news:v2:top:6:stale:fail': '1' })
    stubEnv({ THE_NEWS_API_KEY: 'k', KV: kv })
    // The marker has expired, so this request goes upstream and succeeds.
    upstream(TOPICS)
    kv.store.delete('trending-news:v2:top:6:stale:fail')

    await GET(request('?limit=6'))

    expect(kv.delete).toHaveBeenCalledWith('trending-news:v2:top:6:stale:fail')
    expect(kv.store.has('trending-news:v2:top:6:stale:fail')).toBe(false)
  })

  it('still reports the 502 when there is no good answer anywhere', async () => {
    upstream({ error: 'The News API: quota exceeded' }, 502)

    const response = await GET(request('?limit=6'))

    expect(response.status).toBe(502)
  })
})
