/**
 * @fileoverview Tests for CORS helpers used by public agent API routes.
 * Verifies that cross-origin requests from any site are allowed with appropriate
 * headers, preflight requests return 204 with permitted methods and headers,
 * and same-origin requests pass through untouched.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { withCors, corsPreflight } from '../cors'
import * as apiKeyAuth from '../auth/api-key'

const ORIGIN_A = 'https://debate-ai.com'
const ORIGIN_EXTERNAL = 'https://some-other-app.com'
const ORIGIN_LOCALHOST = 'http://localhost:3000'

/** A request carrying (or omitting) an Origin header. */
function request(origin?: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  if (origin) headers.set('origin', origin)
  return new Request('http://localhost/api/agent/search', { ...init, headers })
}

describe('withCors', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('adds the allow-origin header for any origin', async () => {
    const handler = withCors(async () => Response.json({ ok: true }))

    const res = await handler(request(ORIGIN_EXTERNAL))

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN_EXTERNAL)
    expect(res.headers.get('Vary')).toContain('Origin')
  })

  it('allows the debate-ai origin', async () => {
    const handler = withCors(async () => Response.json({ ok: true }))

    const res = await handler(request(ORIGIN_A))

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN_A)
  })

  it('allows localhost dev origins', async () => {
    const handler = withCors(async () => Response.json({ ok: true }))

    const res = await handler(request(ORIGIN_LOCALHOST))

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN_LOCALHOST)
  })

  it('passes same-origin requests (no Origin header) straight through', async () => {
    const original = Response.json({ ok: true })
    const handler = withCors(async () => original)

    const res = await handler(request())

    expect(res).toBe(original)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('tolerates a minimal request mock with no headers property', async () => {
    const original = Response.json({ ok: true })
    const handler = withCors(async () => original)

    const res = await handler({ url: 'http://localhost/api/agent/search' } as unknown as Request)

    expect(res).toBe(original)
  })

  it('preserves status, statusText and the handler body', async () => {
    const handler = withCors(async () =>
      new Response('rate limited', { status: 429, statusText: 'Too Many Requests' }),
    )

    const res = await handler(request(ORIGIN_EXTERNAL))

    expect(res.status).toBe(429)
    expect(res.statusText).toBe('Too Many Requests')
    expect(await res.text()).toBe('rate limited')
  })

  it('keeps the headers the handler already set', async () => {
    const handler = withCors(async () =>
      new Response('data: hi\n\n', { headers: { 'Content-Type': 'text/event-stream' } }),
    )

    const res = await handler(request(ORIGIN_EXTERNAL))

    expect(res.headers.get('Content-Type')).toBe('text/event-stream')
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN_EXTERNAL)
  })

  it('appends to a Vary header the handler already set instead of replacing it', async () => {
    const handler = withCors(async () =>
      new Response(null, { headers: { Vary: 'Accept-Encoding' } }),
    )

    const res = await handler(request(ORIGIN_EXTERNAL))

    const vary = res.headers.get('Vary') ?? ''
    expect(vary).toContain('Accept-Encoding')
    expect(vary).toContain('Origin')
  })

  it('forwards the request and extra route args to the wrapped handler', async () => {
    const inner = vi.fn(async () => Response.json({ ok: true }))
    const handler = withCors(inner)
    const req = request(ORIGIN_EXTERNAL)
    const ctx = { params: Promise.resolve({ id: 'abc' }) }

    await handler(req, ctx)

    expect(inner).toHaveBeenCalledWith(req, ctx)
  })

  it('supports a synchronous handler', async () => {
    const handler = withCors(() => Response.json({ ok: true }))

    const res = await handler(request(ORIGIN_EXTERNAL))

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN_EXTERNAL)
  })

  it('lets a handler rejection propagate', async () => {
    const handler = withCors(async () => {
      throw new Error('boom')
    })

    await expect(handler(request(ORIGIN_EXTERNAL))).rejects.toThrow('boom')
  })

  it('returns 401 with CORS headers when API key is required and missing', async () => {
    vi.spyOn(apiKeyAuth, 'checkApiAuth').mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    })

    const handler = withCors(async () => Response.json({ ok: true }))
    const res = await handler(request(ORIGIN_EXTERNAL))

    expect(res.status).toBe(401)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN_EXTERNAL)
  })

  it('skips API key check when skipApiKeyCheck is set to true', async () => {
    const checkSpy = vi.spyOn(apiKeyAuth, 'checkApiAuth')

    const handler = withCors(async () => Response.json({ ok: true }), {
      skipApiKeyCheck: true,
    })
    const res = await handler(request(ORIGIN_EXTERNAL))

    expect(res.status).toBe(200)
    expect(checkSpy).not.toHaveBeenCalled()
  })
})

describe('corsPreflight', () => {
  it('answers preflight from any origin with permitted methods and headers', () => {
    const res = corsPreflight(request(ORIGIN_EXTERNAL, { method: 'OPTIONS' }))

    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN_EXTERNAL)
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET')
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('OPTIONS')
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('X-API-Key')
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Authorization')
    expect(res.headers.get('Vary')).toBe('Origin')
  })

  it('answers preflight with no Origin header using fallback wildcard', () => {
    const res = corsPreflight(request(undefined, { method: 'OPTIONS' }))

    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})
