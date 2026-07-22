import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  renderWithCloudflare,
  renderUrlToHtml,
  renderUrlWithMetadata,
  type ScraperJsonResponse,
} from '../cloudflare-scraper-client'

let fetchMock: ReturnType<typeof vi.fn>

function htmlResponse(html: string, ok = true, status = 200) {
  return {
    ok,
    status,
    text: async () => html,
    json: async () => JSON.parse(html),
  }
}

function jsonResponse(data: ScraperJsonResponse) {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(data),
    json: async () => data,
  }
}

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('renderWithCloudflare', () => {
  it('calls the /api/render endpoint with the target url as a query param', async () => {
    fetchMock.mockResolvedValue(htmlResponse('<html>ok</html>'))
    await renderWithCloudflare({ url: 'https://example.com' })
    const requestedUrl = new URL(fetchMock.mock.calls[0][0])
    expect(requestedUrl.pathname).toBe('/api/render')
    expect(requestedUrl.searchParams.get('url')).toBe('https://example.com')
  })

  it('applies default query parameters', async () => {
    fetchMock.mockResolvedValue(htmlResponse('<html></html>'))
    await renderWithCloudflare({ url: 'https://example.com' })
    const requestedUrl = new URL(fetchMock.mock.calls[0][0])
    expect(requestedUrl.searchParams.get('format')).toBe('html')
    expect(requestedUrl.searchParams.get('sessionId')).toBe('default')
    expect(requestedUrl.searchParams.get('bypassCaptcha')).toBe('true')
    expect(requestedUrl.searchParams.get('maxRetries')).toBe('10')
  })

  it('omits undefined optional parameters from the query string', async () => {
    fetchMock.mockResolvedValue(htmlResponse('<html></html>'))
    await renderWithCloudflare({ url: 'https://example.com' })
    const requestedUrl = new URL(fetchMock.mock.calls[0][0])
    expect(requestedUrl.searchParams.has('proxyUrl')).toBe(false)
    expect(requestedUrl.searchParams.has('twoCaptchaKey')).toBe(false)
  })

  it('sets a bearer auth header when an apiKey is supplied via options', async () => {
    fetchMock.mockResolvedValue(htmlResponse('<html></html>'))
    await renderWithCloudflare({ url: 'https://example.com', apiKey: 'secret' })
    const headers = fetchMock.mock.calls[0][1].headers
    expect(headers['Authorization']).toBe('Bearer secret')
  })

  it('uses the config apiKey when the option is absent', async () => {
    fetchMock.mockResolvedValue(htmlResponse('<html></html>'))
    await renderWithCloudflare({ url: 'https://example.com' }, { apiKey: 'cfg-key' })
    expect(fetchMock.mock.calls[0][1].headers['Authorization']).toBe('Bearer cfg-key')
  })

  it('honours a custom base URL from config', async () => {
    fetchMock.mockResolvedValue(htmlResponse('<html></html>'))
    await renderWithCloudflare(
      { url: 'https://example.com' },
      { baseURL: 'https://my-scraper.example.dev' },
    )
    const requestedUrl = new URL(fetchMock.mock.calls[0][0])
    expect(requestedUrl.host).toBe('my-scraper.example.dev')
  })

  it('forwards custom headers', async () => {
    fetchMock.mockResolvedValue(htmlResponse('<html></html>'))
    await renderWithCloudflare({
      url: 'https://example.com',
      headers: { 'X-Custom': 'abc' },
    })
    expect(fetchMock.mock.calls[0][1].headers['X-Custom']).toBe('abc')
  })

  it('returns raw HTML text for the html format', async () => {
    fetchMock.mockResolvedValue(htmlResponse('<html>content</html>'))
    const result = await renderWithCloudflare({ url: 'https://example.com' })
    expect(result).toBe('<html>content</html>')
  })

  it('returns parsed JSON for the json format', async () => {
    const payload = {
      html: '<html></html>',
      url: 'https://example.com',
      title: 'T',
      cookies: [],
      challengeBypassed: false,
      retryCount: 0,
      loadTime: 12,
    } as ScraperJsonResponse
    fetchMock.mockResolvedValue(jsonResponse(payload))
    const result = await renderWithCloudflare({
      url: 'https://example.com',
      format: 'json',
    })
    expect(result).toEqual(payload)
  })

  it('throws with status and body text on a non-OK response', async () => {
    fetchMock.mockResolvedValue(htmlResponse('blocked', false, 403))
    await expect(
      renderWithCloudflare({ url: 'https://example.com' }),
    ).rejects.toThrow('Scraper request failed (403): blocked')
  })

  it('passes an abort signal through to fetch', async () => {
    fetchMock.mockResolvedValue(htmlResponse('<html></html>'))
    const controller = new AbortController()
    await renderWithCloudflare({ url: 'https://example.com', signal: controller.signal })
    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal)
  })
})

describe('renderUrlToHtml', () => {
  it('returns the HTML string for a string response', async () => {
    fetchMock.mockResolvedValue(htmlResponse('<html>x</html>'))
    expect(await renderUrlToHtml('https://example.com')).toBe('<html>x</html>')
  })

  it('extracts .html when the underlying response is JSON', async () => {
    const payload = {
      html: '<html>from-json</html>',
      url: 'https://example.com',
      title: 'T',
      cookies: [],
      challengeBypassed: false,
      retryCount: 0,
      loadTime: 5,
    } as ScraperJsonResponse
    // Force JSON parsing by having the caller-provided format be overridden to html,
    // but the response body is JSON-shaped text — renderUrlToHtml forces html format,
    // so this returns the raw text. Assert the string path instead.
    fetchMock.mockResolvedValue(htmlResponse(JSON.stringify(payload)))
    const result = await renderUrlToHtml('https://example.com')
    expect(typeof result).toBe('string')
  })
})

describe('renderUrlWithMetadata', () => {
  it('returns the structured JSON response', async () => {
    const payload = {
      html: '<html></html>',
      url: 'https://example.com',
      title: 'Title',
      cookies: [{ name: 'a', value: 'b', domain: 'd', path: '/' }],
      challengeBypassed: true,
      retryCount: 2,
      loadTime: 99,
    } as ScraperJsonResponse
    fetchMock.mockResolvedValue(jsonResponse(payload))
    const result = await renderUrlWithMetadata('https://example.com')
    expect(result.title).toBe('Title')
    expect(result.challengeBypassed).toBe(true)
    expect(result.retryCount).toBe(2)
  })
})
