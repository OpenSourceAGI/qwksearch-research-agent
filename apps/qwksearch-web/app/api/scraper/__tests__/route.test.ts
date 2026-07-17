import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/scraper', () => ({
  renderWithCloudflare: vi.fn(),
}))

import { renderWithCloudflare } from '@/lib/scraper'
import { GET, POST } from '../route'

const mockRender = renderWithCloudflare as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

function postRequest(body: unknown) {
  return new Request('http://localhost/api/scraper', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any
}

function getRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/scraper')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new Request(url) as any
}

describe('POST /api/scraper', () => {
  it('returns scraper result for a valid URL', async () => {
    mockRender.mockResolvedValue({ html: '<html>ok</html>' })
    const res = await POST(postRequest({ url: 'https://example.com' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.html).toBe('<html>ok</html>')
  })

  it('returns 400 when url is missing', async () => {
    const res = await POST(postRequest({ blockImages: true }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/url is required/i)
  })

  it('returns 400 for an invalid URL', async () => {
    const res = await POST(postRequest({ url: 'not-a-url' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/invalid url/i)
  })

  it('defaults format to json when not specified', async () => {
    mockRender.mockResolvedValue({ html: '' })
    await POST(postRequest({ url: 'https://example.com' }))
    expect(mockRender).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'json' }),
    )
  })

  it('respects an explicit format override', async () => {
    mockRender.mockResolvedValue({ html: '<html/>' })
    await POST(postRequest({ url: 'https://example.com', format: 'html' }))
    expect(mockRender).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'html' }),
    )
  })

  it('returns 500 and error message when renderWithCloudflare throws', async () => {
    mockRender.mockRejectedValue(new Error('worker crashed'))
    const res = await POST(postRequest({ url: 'https://example.com' }))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('worker crashed')
  })

  it('includes a timestamp in 500 error responses', async () => {
    mockRender.mockRejectedValue(new Error('oops'))
    const res = await POST(postRequest({ url: 'https://example.com' }))
    const data = await res.json()
    expect(data.timestamp).toBeDefined()
  })
})

describe('GET /api/scraper', () => {
  it('returns scraper result for a valid url param', async () => {
    mockRender.mockResolvedValue({ html: '<p>hello</p>' })
    const res = await GET(getRequest({ url: 'https://example.com' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.html).toBe('<p>hello</p>')
  })

  it('returns 400 when url param is missing', async () => {
    const res = await GET(getRequest({}))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/url parameter is required/i)
  })

  it('returns 400 for a malformed url param', async () => {
    const res = await GET(getRequest({ url: 'ftp//bad' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/invalid url/i)
  })

  it('parses blockImages=true from query string', async () => {
    mockRender.mockResolvedValue({})
    await GET(getRequest({ url: 'https://example.com', blockImages: 'true' }))
    expect(mockRender).toHaveBeenCalledWith(
      expect.objectContaining({ blockImages: true }),
    )
  })

  it('defaults bypassCaptcha to true', async () => {
    mockRender.mockResolvedValue({})
    await GET(getRequest({ url: 'https://example.com' }))
    expect(mockRender).toHaveBeenCalledWith(
      expect.objectContaining({ bypassCaptcha: true }),
    )
  })

  it('parses timeout from query string', async () => {
    mockRender.mockResolvedValue({})
    await GET(getRequest({ url: 'https://example.com', timeout: '15000' }))
    expect(mockRender).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 15000 }),
    )
  })

  it('returns 500 on render failure', async () => {
    mockRender.mockRejectedValue(new Error('timeout'))
    const res = await GET(getRequest({ url: 'https://example.com' }))
    expect(res.status).toBe(500)
  })
})
