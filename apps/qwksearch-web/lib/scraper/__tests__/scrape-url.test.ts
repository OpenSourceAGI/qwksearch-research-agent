import { describe, expect, it, vi, beforeEach } from 'vitest'

// Prevent real network calls from the cloudflare-scraper-client and
// extract-webpage packages. These are mocked before importing the module under
// test so the module-level imports resolve to the mocked versions.
vi.mock('../cloudflare-scraper-client', () => ({
  renderUrlWithMetadata: vi.fn(),
}))

vi.mock('extract-webpage/url-to-content/url-to-content', () => ({
  extractContent: vi.fn(),
}))

import { renderUrlWithMetadata } from '../cloudflare-scraper-client'
import { extractContent } from 'extract-webpage/url-to-content/url-to-content'
import {
  scrapeUrl,
  extractArticleViaScraper,
  extractViaTavily,
  SCRAPER_DEADLINE_MS,
} from '../scrape-url'

const mockRender = renderUrlWithMetadata as ReturnType<typeof vi.fn>
const mockExtract = extractContent as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.resetAllMocks()
})

// ---------------------------------------------------------------------------
// scrapeUrl
// ---------------------------------------------------------------------------

describe('scrapeUrl', () => {
  it('returns HTML from the scraper client', async () => {
    mockRender.mockResolvedValue({ html: '<html>ok</html>', url: 'https://example.com' })
    const html = await scrapeUrl('https://example.com')
    expect(html).toBe('<html>ok</html>')
  })

  it('throws when scraper returns no HTML', async () => {
    mockRender.mockResolvedValue({ html: null })
    await expect(scrapeUrl('https://example.com')).rejects.toThrow('Scraper returned no HTML')
  })

  it('throws when scraper returns empty string', async () => {
    mockRender.mockResolvedValue({ html: '' })
    await expect(scrapeUrl('https://example.com')).rejects.toThrow('Scraper returned no HTML')
  })

  it('passes blockImages=true by default', async () => {
    mockRender.mockResolvedValue({ html: '<p>hi</p>' })
    await scrapeUrl('https://example.com')
    expect(mockRender).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({ blockImages: true }),
    )
  })
})

// ---------------------------------------------------------------------------
// extractArticleViaScraper — challenge page detection
// ---------------------------------------------------------------------------

describe('extractArticleViaScraper', () => {
  const goodExtracted = {
    html: '<p>Article content</p>',
    title: 'Test Title',
    source: 'example.com',
    author: 'Author',
    date: '2024-01-01',
    word_count: 3,
  }

  it('returns an article on success', async () => {
    mockRender.mockResolvedValue({ html: '<html><body><p>Article</p></body></html>', url: 'https://example.com' })
    mockExtract.mockResolvedValue({ ...goodExtracted, error: undefined })

    const result = await extractArticleViaScraper('https://example.com')
    expect(result.error).toBeUndefined()
    expect(result.via).toBe('scraper')
    expect(result.html).toBe('<p>Article content</p>')
  })

  it('sets via="scraper" on success', async () => {
    mockRender.mockResolvedValue({ html: '<html>content</html>', url: 'https://example.com' })
    mockExtract.mockResolvedValue({ ...goodExtracted })
    const result = await extractArticleViaScraper('https://example.com')
    expect(result.via).toBe('scraper')
  })

  it('returns error when scraper returns a Cloudflare challenge page', async () => {
    mockRender.mockResolvedValue({ html: 'Just a moment...', url: 'https://example.com' })
    const result = await extractArticleViaScraper('https://example.com')
    expect(result.error).toBeDefined()
    expect(result.html).toBeUndefined()
  })

  it('returns error when scraper returns AP News challenge page', async () => {
    mockRender.mockResolvedValue({ html: 'Page unavailable | AP News', url: 'https://apnews.com' })
    const result = await extractArticleViaScraper('https://apnews.com/article/test')
    expect(result.error).toBeDefined()
  })

  it('returns error when scraper returns null html', async () => {
    mockRender.mockResolvedValue({ html: null })
    const result = await extractArticleViaScraper('https://example.com')
    expect(result.error).toBeDefined()
  })

  it('returns error when extractor returns an error', async () => {
    mockRender.mockResolvedValue({ html: '<html>good</html>' })
    mockExtract.mockResolvedValue({ error: 'parse failed', html: undefined })
    const result = await extractArticleViaScraper('https://example.com')
    expect(result.error).toBe('parse failed')
  })

  it('returns error when extractor produces no html', async () => {
    mockRender.mockResolvedValue({ html: '<html>good</html>' })
    mockExtract.mockResolvedValue({ html: '', title: 'T' })
    const result = await extractArticleViaScraper('https://example.com')
    expect(result.error).toBeDefined()
  })

  it('returns error on scraper rejection', async () => {
    mockRender.mockRejectedValue(new Error('connection refused'))
    const result = await extractArticleViaScraper('https://example.com')
    expect(result.error).toContain('connection refused')
  })

  it('exposes SCRAPER_DEADLINE_MS as a positive number', () => {
    expect(SCRAPER_DEADLINE_MS).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// extractViaTavily
// ---------------------------------------------------------------------------

describe('extractViaTavily', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns error when no API key is available', async () => {
    vi.stubEnv('TAVILY_API_KEY', '')
    const result = await extractViaTavily('https://example.com')
    expect(result.error).toMatch(/No Tavily API key/)
  })

  it('returns error on non-OK HTTP response', async () => {
    vi.stubEnv('TAVILY_API_KEY', 'test-key')
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Unauthorized', { status: 401 }),
    )
    const result = await extractViaTavily('https://example.com')
    expect(result.error).toMatch(/401/)
  })

  it('returns error when Tavily returns no results', async () => {
    vi.stubEnv('TAVILY_API_KEY', 'test-key')
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [] }), { status: 200 }),
    )
    const result = await extractViaTavily('https://example.com')
    expect(result.error).toMatch(/no content/)
  })

  it('returns error when raw_content is missing', async () => {
    vi.stubEnv('TAVILY_API_KEY', 'test-key')
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [{ url: 'https://example.com' }] }), { status: 200 }),
    )
    const result = await extractViaTavily('https://example.com')
    expect(result.error).toBeDefined()
  })

  it('extracts an article on success', async () => {
    vi.stubEnv('TAVILY_API_KEY', 'test-key')
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [
            {
              url: 'https://example.com/article',
              title: 'Test Article',
              raw_content: 'First paragraph.\n\nSecond paragraph.',
            },
          ],
        }),
        { status: 200 },
      ),
    )
    const result = await extractViaTavily('https://example.com/article')
    expect(result.error).toBeUndefined()
    expect(result.via).toBe('tavily')
    expect(result.title).toBe('Test Article')
    expect(result.html).toContain('<p>')
    expect(result.word_count).toBeGreaterThan(0)
  })

  it('uses explicit apiKey over env var', async () => {
    vi.stubEnv('TAVILY_API_KEY', '')
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [{ url: 'https://example.com', raw_content: 'Hello world.' }],
        }),
        { status: 200 },
      ),
    )
    await extractViaTavily('https://example.com', 'explicit-key')
    expect(spy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer explicit-key' }),
      }),
    )
  })

  it('returns error when fetch rejects', async () => {
    vi.stubEnv('TAVILY_API_KEY', 'test-key')
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network error'))
    const result = await extractViaTavily('https://example.com')
    expect(result.error).toContain('network error')
  })

  it('converts markdown headings to HTML h-tags', async () => {
    vi.stubEnv('TAVILY_API_KEY', 'test-key')
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [{ url: 'https://example.com', raw_content: '## Section Title\n\nBody text.' }],
        }),
        { status: 200 },
      ),
    )
    const result = await extractViaTavily('https://example.com')
    expect(result.html).toContain('<h2>Section Title</h2>')
    expect(result.html).toContain('<p>Body text.</p>')
  })
})
