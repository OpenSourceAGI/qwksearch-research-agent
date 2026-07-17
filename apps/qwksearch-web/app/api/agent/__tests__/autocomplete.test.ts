import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('extract-webpage/suggest-next-words/autocomplete-search-engines', () => ({
  searchAutocompleteMulti: vi.fn(),
}))

// domain-rank ships a large JSON file; replace with a minimal fixture so tests
// run fast and deterministically.
vi.mock('domain-rank/data/domain-rank-merged.json', () => ({
  default: {
    'example.com': ['Example', 100],
    'github.com': ['GitHub', 50],
    'wikipedia.org': ['Wikipedia', 200],
  },
}))

import { searchAutocompleteMulti } from 'extract-webpage/suggest-next-words/autocomplete-search-engines'
import { createAutocompleteHandler } from 'research-agent-ui/api'

const mockAutoComplete = searchAutocompleteMulti as ReturnType<typeof vi.fn>
const handler = createAutocompleteHandler()

function getRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/agent/autocomplete')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new Request(url) as any
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createAutocompleteHandler GET', () => {
  it('returns empty suggestions when query is missing', async () => {
    const res = await handler.GET(getRequest({}))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.suggestions).toEqual([])
    expect(data.domains).toEqual([])
    expect(mockAutoComplete).not.toHaveBeenCalled()
  })

  it('returns autocomplete suggestions for a valid query', async () => {
    mockAutoComplete.mockResolvedValue(['hello world', 'hello there'])
    const res = await handler.GET(getRequest({ q: 'hello' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.suggestions).toEqual(['hello world', 'hello there'])
  })

  it('respects the limit parameter', async () => {
    const manySuggestions = Array.from({ length: 20 }, (_, i) => `suggestion ${i}`)
    mockAutoComplete.mockResolvedValue(manySuggestions)
    const res = await handler.GET(getRequest({ q: 'test', limit: '3' }))
    const data = await res.json()
    expect(data.suggestions).toHaveLength(3)
  })

  it('defaults limit to 8', async () => {
    const manySuggestions = Array.from({ length: 20 }, (_, i) => `s${i}`)
    mockAutoComplete.mockResolvedValue(manySuggestions)
    const res = await handler.GET(getRequest({ q: 'test' }))
    const data = await res.json()
    expect(data.suggestions.length).toBeLessThanOrEqual(8)
  })

  it('returns domain suggestions when query matches a known domain name', async () => {
    mockAutoComplete.mockResolvedValue([])
    const res = await handler.GET(getRequest({ q: 'github' }))
    const data = await res.json()
    const domains: Array<{ domain: string }> = data.domains
    expect(domains.some((d) => d.domain === 'github.com')).toBe(true)
  })

  it('uses custom backends when provided', async () => {
    mockAutoComplete.mockResolvedValue(['custom result'])
    await handler.GET(getRequest({ q: 'test', backends: 'bing,brave' }))
    expect(mockAutoComplete).toHaveBeenCalledWith(
      ['bing', 'brave'],
      'test',
      expect.any(String),
    )
  })

  it('falls back to a suffix when full query yields nothing', async () => {
    mockAutoComplete
      .mockResolvedValueOnce([])           // full query
      .mockResolvedValueOnce(['world news']) // suffix "world"
    const res = await handler.GET(getRequest({ q: 'hello world' }))
    expect(mockAutoComplete).toHaveBeenCalledTimes(2)
    const data = await res.json()
    expect(data.suggestions.length).toBeGreaterThan(0)
  })

  it('returns 500 on unexpected autocomplete error', async () => {
    mockAutoComplete.mockRejectedValue(new Error('network failure'))
    const res = await handler.GET(getRequest({ q: 'error case' }))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.suggestions).toEqual([])
  })
})
