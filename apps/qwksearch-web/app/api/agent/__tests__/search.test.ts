import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('extract-webpage/search/public-searxng', () => ({
  searchWeb: vi.fn(),
  searchSearxng: vi.fn(),
}))

import { searchWeb } from 'extract-webpage/search/public-searxng'
import { createSearchHandler } from 'research-agent-ui/api'

const mockSearchWeb = searchWeb as ReturnType<typeof vi.fn>

const handler = createSearchHandler({ searxngDomain: 'https://search.example.com' })

function getRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/agent/search')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new Request(url) as any
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createSearchHandler GET', () => {
  it('returns 400 when query is missing', async () => {
    const res = await handler.GET(getRequest({}))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/query parameter is required/i)
  })

  it('returns search results for a valid query', async () => {
    const results = [{ url: 'https://example.com', title: 'Example' }]
    mockSearchWeb.mockResolvedValue({ results })

    const res = await handler.GET(getRequest({ q: 'hello world' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.results).toEqual(results)
    expect(data.elapsedTime).toBeGreaterThanOrEqual(0)
  })

  it('retries with public searxng when first call returns empty results', async () => {
    const fallbackResults = [{ url: 'https://fallback.com', title: 'Fallback' }]
    mockSearchWeb
      .mockResolvedValueOnce({ results: [] })
      .mockResolvedValueOnce({ results: fallbackResults })

    const res = await handler.GET(getRequest({ q: 'empty first' }))
    expect(mockSearchWeb).toHaveBeenCalledTimes(2)
    const data = await res.json()
    expect(data.results).toEqual(fallbackResults)
  })

  it('returns empty results when both attempts yield nothing', async () => {
    mockSearchWeb.mockResolvedValue(null)

    const res = await handler.GET(getRequest({ q: 'nothing' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.results).toEqual([])
  })

  it('handles array results (legacy format) directly', async () => {
    const results = [{ url: 'https://a.com' }, { url: 'https://b.com' }]
    mockSearchWeb.mockResolvedValue(results)

    const res = await handler.GET(getRequest({ q: 'array format' }))
    const data = await res.json()
    expect(data.results).toEqual(results)
  })

  it('forwards cat, page, lang, safesearch parameters to searchWeb', async () => {
    mockSearchWeb.mockResolvedValue({ results: [] })

    await handler.GET(getRequest({
      q: 'test',
      cat: 'news',
      page: '3',
      lang: 'fr-FR',
      safesearch: 'true',
    }))

    expect(mockSearchWeb).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({
        category: 'news',
        page: 3,
        lang: 'fr-FR',
        safesearch: true,
      }),
    )
  })

  it('returns 500 when searchWeb throws', async () => {
    mockSearchWeb.mockRejectedValue(new Error('searxng down'))
    const res = await handler.GET(getRequest({ q: 'fail' }))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Search failed')
  })
})
