import { describe, it, expect, vi, beforeEach } from 'vitest'

// domain-rank ships a large JSON file; replace with a minimal fixture so tests
// run fast and deterministically.
vi.mock('domain-rank/data/domain-rank-merged.json', () => ({
  default: {
    'example.com': ['Example', 100],
    'github.com': ['GitHub', 50],
    'wikipedia.org': ['Wikipedia', 200],
  },
}))

import { ENGINES, DEFAULT_ENGINE } from 'search-autocomplete'
import { createAutocompleteHandler } from 'search-autocomplete/server'

const { GET } = createAutocompleteHandler()

const engineSpies = () =>
  Object.fromEntries(
    Object.keys(ENGINES).map((name) => [name, vi.spyOn(ENGINES, name as keyof typeof ENGINES)]),
  ) as Record<keyof typeof ENGINES, ReturnType<typeof vi.spyOn>>

function getRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/agent/autocomplete')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new Request(url) as any
}

let spies: ReturnType<typeof engineSpies>
let mockDefault: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  spies = engineSpies()
  for (const spy of Object.values(spies)) spy.mockResolvedValue([])
  mockDefault = spies[DEFAULT_ENGINE]
})

describe('createAutocompleteHandler GET', () => {
  it('returns empty suggestions when query is missing', async () => {
    const res = await GET(getRequest({}))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.suggestions).toEqual([])
    expect(data.domains).toEqual([])
    expect(mockDefault).not.toHaveBeenCalled()
  })

  it('returns suggestions from the single default engine', async () => {
    mockDefault.mockResolvedValue(['hello world', 'hello there'])
    const res = await GET(getRequest({ q: 'hello' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.suggestions).toEqual(['hello world', 'hello there'])
    const called = Object.values(spies).filter((s) => s.mock.calls.length > 0)
    expect(called).toEqual([mockDefault])
  })

  it('respects the limit parameter', async () => {
    mockDefault.mockResolvedValue(Array.from({ length: 20 }, (_, i) => `suggestion ${i}`))
    const res = await GET(getRequest({ q: 'test', limit: '3' }))
    const data = await res.json()
    expect(data.suggestions).toHaveLength(3)
  })

  it('defaults limit to 8', async () => {
    mockDefault.mockResolvedValue(Array.from({ length: 20 }, (_, i) => `s${i}`))
    const res = await GET(getRequest({ q: 'test' }))
    const data = await res.json()
    expect(data.suggestions.length).toBeLessThanOrEqual(8)
  })

  it('returns domain suggestions when query matches a known domain name', async () => {
    const res = await GET(getRequest({ q: 'github' }))
    const data = await res.json()
    const domains: Array<{ domain: string }> = data.domains
    expect(domains.some((d) => d.domain === 'github.com')).toBe(true)
  })

  it('asks only the first engine named in the legacy backends parameter', async () => {
    spies.bing.mockResolvedValue(['custom result'])
    await GET(getRequest({ q: 'test', backends: 'bing,brave' }))
    expect(spies.bing).toHaveBeenCalledWith('test', expect.objectContaining({ locale: 'en-US' }))
    expect(spies.brave).not.toHaveBeenCalled()
  })

  it('falls back to a suffix when full query yields nothing', async () => {
    mockDefault
      .mockResolvedValueOnce([])             // full query
      .mockResolvedValueOnce(['world news']) // suffix "world"
    const res = await GET(getRequest({ q: 'hello world' }))
    expect(mockDefault).toHaveBeenCalledTimes(2)
    const data = await res.json()
    expect(data.suggestions).toEqual(['hello world news'])
  })

  it('recognizes a real domain not present in the ranked dataset', async () => {
    const res = await GET(getRequest({ q: 'red.com' }))
    const data = await res.json()
    const domains: Array<{ domain: string; rank: number }> = data.domains
    const match = domains.find((d) => d.domain === 'red.com')
    expect(match).toBeDefined()
    expect(match!.rank).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('does not treat a filename-like string as a domain', async () => {
    const res = await GET(getRequest({ q: 'note.txt' }))
    const data = await res.json()
    const domains: Array<{ domain: string }> = data.domains
    expect(domains.some((d) => d.domain === 'note.txt')).toBe(false)
  })

  it('does not duplicate a domain already found via the ranked-dataset fuzzy match', async () => {
    const res = await GET(getRequest({ q: 'example.com' }))
    const data = await res.json()
    const domains: Array<{ domain: string }> = data.domains
    expect(domains.filter((d) => d.domain === 'example.com')).toHaveLength(1)
  })

  it('treats an engine outage as no suggestions rather than an error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockDefault.mockRejectedValue(new Error('network failure'))
    const res = await GET(getRequest({ q: 'error case' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.suggestions).toEqual([])
  })
})
