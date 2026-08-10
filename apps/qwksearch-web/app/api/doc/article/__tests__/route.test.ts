/**
 * @fileoverview Route tests for article extraction and caching, covering the
 * URL guards, the cache hit path and the three-tier extraction fallback chain.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/database', () => ({ getDB: vi.fn() }))
vi.mock('@/lib/scraper', () => ({
  extractArticleViaScraper: vi.fn(),
  extractViaTavily: vi.fn(),
}))
vi.mock('extract-webpage/url-to-content/url-to-content', () => ({ extractContent: vi.fn() }))
vi.mock('@/lib/config/serverRegistry', () => ({ getTavilyApiKey: vi.fn(() => 'tvly-key') }))

import { getDB } from '@/lib/database'
import { extractArticleViaScraper, extractViaTavily } from '@/lib/scraper'
import { extractContent } from 'extract-webpage/url-to-content/url-to-content'
import { createFakeDb, jsonRequest, type FakeDb } from '../../../__tests__/helpers/fake-db'
import { GET, POST } from '../route'

const mockGetDB = getDB as unknown as ReturnType<typeof vi.fn>
const mockScraper = extractArticleViaScraper as unknown as ReturnType<typeof vi.fn>
const mockTavily = extractViaTavily as unknown as ReturnType<typeof vi.fn>
const mockExtract = extractContent as unknown as ReturnType<typeof vi.fn>

function setup(options: Parameters<typeof createFakeDb>[0] = {}): FakeDb {
  const db = createFakeDb(options)
  mockGetDB.mockReturnValue(db)
  return db
}

/** The route reads `req.nextUrl.searchParams`, which a bare Request lacks. */
function getRequest(url?: string) {
  const target = new URL('http://localhost/api/doc/article')
  if (url !== undefined) target.searchParams.set('url', url)
  return { nextUrl: target, url: target.toString() } as any
}

const ARTICLE = {
  html: '<p>Body</p>',
  title: 'A title',
  source: 'example.com',
  word_count: 120,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockScraper.mockResolvedValue({ error: 'timeout' })
  mockTavily.mockResolvedValue({ error: 'not configured' })
  mockExtract.mockResolvedValue(ARTICLE)
})

describe('GET /api/doc/article URL guards', () => {
  it('requires a url parameter', async () => {
    setup()

    const res = await GET(getRequest())

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/URL parameter is required/)
  })

  it('rejects a URL containing whitespace', async () => {
    setup()

    const res = await GET(getRequest('https://example.com/a b'))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/not an extractable article/)
  })

  it('rejects search-engine result pages', async () => {
    setup()

    for (const url of [
      'https://www.google.com/search?q=cats',
      'https://bing.com/search?q=cats',
      'https://duckduckgo.com/?q=cats',
    ]) {
      expect((await GET(getRequest(url))).status).toBe(400)
    }
  })

  it('short-circuits video URLs with a placeholder article', async () => {
    setup()

    const res = await GET(getRequest('https://vimeo.com/12345'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.isVideo).toBe(true)
    expect(data.cached).toBe(false)
    expect(data.article.title).toBe('Video Content')
    expect(data.article.source).toBe('vimeo.com')
    expect(mockScraper).not.toHaveBeenCalled()
  })

  it('does not treat YouTube as an unextractable video', async () => {
    setup()

    const data = await (await GET(getRequest('https://youtube.com/watch?v=abc'))).json()

    expect(data.isVideo).toBeUndefined()
  })
})

describe('GET /api/doc/article cache hits', () => {
  const cachedRow = {
    url: 'https://example.com/a',
    title: 'Cached title',
    html: '<p>Cached</p>',
    author: 'A',
    followUpQuestions: ['next?'],
    word_count: 42,
  }

  it('returns the cached article and its Q&A history', async () => {
    setup({
      select: (i) => (i === 0 ? [cachedRow] : [{ question: 'q', answer: 'a' }]),
    })

    const res = await GET(getRequest('https://example.com/a'))
    const data = await res.json()

    expect(data.cached).toBe(true)
    expect(data.article.title).toBe('Cached title')
    expect(data.article.followUpQuestions).toEqual(['next?'])
    expect(data.article.qaHistory).toEqual([{ question: 'q', answer: 'a' }])
    expect(mockScraper).not.toHaveBeenCalled()
  })

  it('bumps the hit count on a cache hit', async () => {
    const db = setup({ select: (i) => (i === 0 ? [cachedRow] : []) })

    await GET(getRequest('https://example.com/a'))

    expect(db.calls.update).toHaveLength(1)
    expect(db.calls.set[0][0]).toHaveProperty('hitCount')
  })

  it('maps absent optional columns to undefined', async () => {
    setup({
      select: (i) => (i === 0 ? [{ url: 'https://example.com/a', html: '<p>x</p>' }] : []),
    })

    const data = await (await GET(getRequest('https://example.com/a'))).json()

    expect(data.article.title).toBeUndefined()
    expect(data.article.author).toBeUndefined()
  })

  it('treats a cached row with no html as a miss', async () => {
    setup({ select: (i) => (i === 0 ? [{ url: 'https://example.com/a', html: null }] : []) })

    const data = await (await GET(getRequest('https://example.com/a'))).json()

    expect(data.cached).toBe(false)
    expect(mockScraper).toHaveBeenCalled()
  })
})

describe('GET /api/doc/article extraction fallback chain', () => {
  it('uses the Cloudflare scraper when it succeeds', async () => {
    setup()
    mockScraper.mockResolvedValue({ html: '<p>Scraped</p>', title: 'Scraped' })

    const data = await (await GET(getRequest('https://example.com/a'))).json()

    expect(data.cached).toBe(false)
    expect(data.article.title).toBe('Scraped')
    expect(mockTavily).not.toHaveBeenCalled()
    expect(mockExtract).not.toHaveBeenCalled()
  })

  it('falls back to Tavily when the scraper returns nothing usable', async () => {
    setup()
    mockTavily.mockResolvedValue({ html: '<p>Tavily</p>', title: 'Tavily' })

    const data = await (await GET(getRequest('https://example.com/a'))).json()

    expect(data.article.title).toBe('Tavily')
    expect(mockTavily).toHaveBeenCalledWith('https://example.com/a', 'tvly-key')
    expect(mockExtract).not.toHaveBeenCalled()
  })

  it('falls back to Tavily when the scraper throws', async () => {
    setup()
    mockScraper.mockRejectedValue(new Error('boom'))
    mockTavily.mockResolvedValue({ html: '<p>Tavily</p>', title: 'Tavily' })

    const data = await (await GET(getRequest('https://example.com/a'))).json()

    expect(data.article.title).toBe('Tavily')
  })

  it('falls back to in-process extraction when Tavily throws', async () => {
    setup()
    mockTavily.mockRejectedValue(new Error('tavily down'))

    const data = await (await GET(getRequest('https://example.com/a'))).json()

    expect(data.article.title).toBe('A title')
    expect(mockExtract).toHaveBeenCalledWith('https://example.com/a')
  })

  it('502s when in-process extraction throws', async () => {
    setup()
    mockExtract.mockRejectedValue(new Error('parse failed'))

    const res = await GET(getRequest('https://example.com/a'))
    const data = await res.json()

    expect(res.status).toBe(502)
    expect(data.error).toBe('Article extraction failed')
    expect(data.detail).toBe('parse failed')
  })

  it('502s when extraction returns no html', async () => {
    setup()
    mockExtract.mockResolvedValue({ title: 'No body' })

    const res = await GET(getRequest('https://example.com/a'))

    expect(res.status).toBe(502)
    expect((await res.json()).error).toMatch(/returned no content/)
  })

  it('502s when the extractor reports an error field', async () => {
    setup()
    mockExtract.mockResolvedValue({ html: '<p>x</p>', error: 'blocked' })

    const res = await GET(getRequest('https://example.com/a'))

    expect(res.status).toBe(502)
    expect((await res.json()).detail).toBe('blocked')
  })

  it('inserts a new cache row after a fresh extraction', async () => {
    const db = setup()

    await GET(getRequest('https://example.com/a'))

    expect(db.calls.insert).toHaveLength(1)
    expect(db.calls.values[0][0]).toMatchObject({
      url: 'https://example.com/a',
      title: 'A title',
      html: '<p>Body</p>',
      hitCount: 1,
    })
  })

  it('overwrites a previously empty cache row instead of inserting', async () => {
    const db = setup({
      select: (i) => (i === 0 ? [{ url: 'https://example.com/a', html: null }] : []),
    })

    await GET(getRequest('https://example.com/a'))

    expect(db.calls.insert).toBeUndefined()
    expect(db.calls.update).toHaveLength(1)
  })

  it('nulls the columns the extractor did not provide', async () => {
    const db = setup()
    mockExtract.mockResolvedValue({ html: '<p>x</p>' })

    await GET(getRequest('https://example.com/a'))

    expect(db.calls.values[0][0]).toMatchObject({
      title: null,
      author: null,
      date: null,
      source: null,
      word_count: null,
    })
  })

  it('reports a database failure as a 500', async () => {
    mockGetDB.mockImplementation(() => {
      throw new Error('db down')
    })

    const res = await GET(getRequest('https://example.com/a'))

    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('Failed to fetch article')
  })
})

describe('POST /api/doc/article', () => {
  const post = (body: unknown) =>
    POST(jsonRequest('http://localhost/api/doc/article', 'POST', body))

  it('requires a url', async () => {
    setup()

    const res = await post({ question: 'q', answer: 'a' })

    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('URL is required')
  })

  it('stores a question and answer pair', async () => {
    const db = setup()

    const res = await post({ url: 'https://example.com/a', question: 'q', answer: 'a' })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(db.calls.values[0][0]).toMatchObject({
      articleUrl: 'https://example.com/a',
      question: 'q',
      answer: 'a',
    })
  })

  it('ignores a half-supplied Q&A pair', async () => {
    const db = setup()

    await post({ url: 'https://example.com/a', question: 'q' })

    expect(db.calls.insert).toBeUndefined()
  })

  it('updates the follow-up questions', async () => {
    const db = setup()

    await post({ url: 'https://example.com/a', followUpQuestions: ['one', 'two'] })

    expect(db.calls.set[0][0]).toEqual({ followUpQuestions: ['one', 'two'] })
  })

  it('ignores follow-up questions that are not an array', async () => {
    const db = setup()

    await post({ url: 'https://example.com/a', followUpQuestions: 'nope' })

    expect(db.calls.update).toBeUndefined()
  })

  it('reports a write failure as a 500', async () => {
    setup()

    const res = await POST(
      new Request('http://localhost/api/doc/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{not json',
      }) as any,
    )

    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('Failed to store article data')
  })
})
