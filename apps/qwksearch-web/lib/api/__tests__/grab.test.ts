import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import grab, { _resetGrabDefaults } from '../grab'

// A helper that builds a fake fetch Response.
function jsonResponse(data: unknown, init: Partial<{ status: number; ok: boolean; contentType: string }> = {}) {
  const { status = 200, contentType = 'application/json' } = init
  return {
    ok: init.ok ?? (status >= 200 && status < 300),
    status,
    statusText: `Status ${status}`,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => data,
    text: async () => (typeof data === 'string' ? data : JSON.stringify(data)),
    arrayBuffer: async () => new ArrayBuffer(8),
    blob: async () => new Blob([JSON.stringify(data)]),
  }
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  _resetGrabDefaults()
  fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  _resetGrabDefaults()
})

describe('grab URL resolution', () => {
  it('resolves a bare path against /api/', async () => {
    await grab('config')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/config')
  })

  it('prefixes a leading api/ path with a slash', async () => {
    await grab('api/doc/article')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/doc/article')
  })

  it('passes absolute URLs through unchanged', async () => {
    await grab('https://example.com/data')
    expect(fetchMock.mock.calls[0][0]).toBe('https://example.com/data')
  })

  it('passes root-relative paths through unchanged', async () => {
    await grab('/health')
    expect(fetchMock.mock.calls[0][0]).toBe('/health')
  })
})

describe('grab query params and body', () => {
  it('appends extra props as query params on GET', async () => {
    await grab('search', { q: 'hello', page: 2 })
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('/api/search?')
    expect(url).toContain('q=hello')
    expect(url).toContain('page=2')
  })

  it('skips null and undefined params', async () => {
    await grab('search', { q: 'x', empty: null, missing: undefined })
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('q=x')
    expect(url).not.toContain('empty')
    expect(url).not.toContain('missing')
  })

  it('sends extra props as a JSON body on POST', async () => {
    await grab('items', { method: 'POST', name: 'widget' })
    const init = fetchMock.mock.calls[0][1]
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ name: 'widget' })
    expect((init.headers as any)['Content-Type']).toBe('application/json')
  })

  it('stringifies a plain-object body and sets JSON content-type', async () => {
    await grab('items', { method: 'POST', body: { a: 1 } })
    const init = fetchMock.mock.calls[0][1]
    expect(JSON.parse(init.body)).toEqual({ a: 1 })
    expect((init.headers as any)['Content-Type']).toBe('application/json')
  })
})

describe('grab responseType handling', () => {
  it('returns parsed JSON by default', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ hello: 'world' }))
    expect(await grab('x')).toEqual({ hello: 'world' })
  })

  it('returns text when responseType=text', async () => {
    fetchMock.mockResolvedValue(jsonResponse('plain', { contentType: 'text/plain' }))
    expect(await grab('x', { responseType: 'text' })).toBe('plain')
  })

  it('returns an ArrayBuffer when responseType=arraybuffer', async () => {
    const result = await grab('x', { responseType: 'arraybuffer' })
    expect(result).toBeInstanceOf(ArrayBuffer)
  })

  it('falls back to text when a non-JSON content-type cannot parse as JSON', async () => {
    const res = jsonResponse('not json', { contentType: 'text/html' })
    res.json = async () => {
      throw new Error('invalid json')
    }
    fetchMock.mockResolvedValue(res)
    expect(await grab('x')).toBe('not json')
  })
})

describe('grab error handling', () => {
  it('throws on a non-OK HTTP response', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, { status: 500, ok: false }))
    await expect(grab('x')).rejects.toThrow('HTTP 500')
  })

  it('propagates a fetch rejection', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))
    await expect(grab('x')).rejects.toThrow('network down')
  })
})

describe('grab setDefaults', () => {
  it('stores defaults without performing a request', async () => {
    const result = await grab('', {
      setDefaults: true,
      headers: { 'User-Agent': 'TestAgent/1.0' },
    })
    expect(result).toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('applies default headers to subsequent requests', async () => {
    await grab('', { setDefaults: true, headers: { 'User-Agent': 'TestAgent/1.0' } })
    await grab('x')
    const init = fetchMock.mock.calls[0][1]
    expect((init.headers as any)['User-Agent']).toBe('TestAgent/1.0')
  })

  it('lets a per-call header override a default header', async () => {
    await grab('', { setDefaults: true, headers: { 'User-Agent': 'Default' } })
    await grab('x', { headers: { 'User-Agent': 'Override' } })
    const init = fetchMock.mock.calls[0][1]
    expect((init.headers as any)['User-Agent']).toBe('Override')
  })
})
