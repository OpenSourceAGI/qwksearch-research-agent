/**
 * The Scalar API reference moved from `/api/docs` up to `/api`. Both halves of
 * that move are load-bearing and neither fails loudly: a viewer served from the
 * wrong path is a 404 people meet before they meet the API, and a dropped
 * redirect quietly breaks the `/api/docs` badge in every published README —
 * including the copies on npm, which cannot be edited.
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/server', () => ({
  NextResponse: class {
    static redirect(url: URL | string, status = 307) {
      return new Response(null, { status, headers: { Location: String(url) } })
    }

    constructor(body: BodyInit | null, init?: ResponseInit) {
      return new Response(body, init)
    }
  },
}))

vi.mock('@/lib/config/site', () => ({ config: { appName: 'QwkSearch' } }))

vi.mock('@/lib/cors', () => ({
  withCors: (handler: (req?: Request) => Promise<Response>) => handler,
  corsPreflight: () => new Response(null, { status: 204 }),
}))

describe('GET /api', () => {
  it('serves the Scalar viewer pointed at the OpenAPI spec', async () => {
    const route = await import('../route')
    const response = await route.GET()
    const html = await response.text()

    expect(response.headers.get('Content-Type')).toContain('text/html')
    expect(html).toContain('id="api-reference"')
    expect(html).toContain(`data-url="${route.OPENAPI_SPEC_URL}"`)
    expect(html).toContain('@scalar/api-reference')
  })

  it('points at a spec route this app actually serves', async () => {
    const route = await import('../route')

    // `/api/openapi` is a real route module, not a URL someone typed once.
    await expect(import('../openapi/route')).resolves.toBeTruthy()
    expect(route.OPENAPI_SPEC_URL).toBe('/api/openapi')
  })
})

describe('GET /api/docs', () => {
  it('permanently redirects to the reference at its new home', async () => {
    const route = await import('../docs/route')
    const response = await route.GET(new Request('https://qwksearch.com/api/docs'))

    expect(response.status).toBe(308)
    expect(new URL(response.headers.get('Location')!).pathname).toBe('/api')
  })

  it('answers HEAD the same way, so a link checker sees the move', async () => {
    const route = await import('../docs/route')
    const response = await route.HEAD(new Request('https://qwksearch.com/api/docs'))

    expect(response.status).toBe(308)
  })
})
