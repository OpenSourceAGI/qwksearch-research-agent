/**
 * @fileoverview Route tests for document share-link creation and resolution.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/database/turso', () => ({
  tursoQueries: {
    getDocument: vi.fn(),
    getShareToken: vi.fn(),
    getShareTokenByDocumentId: vi.fn(),
    createShareToken: vi.fn(),
  },
}))

import { tursoQueries } from '@/lib/database/turso'
import { routeContext } from '../../../__tests__/helpers/fake-db'
import { POST } from '../route'
import { GET } from '../[id]/route'

const queries = tursoQueries as unknown as Record<string, ReturnType<typeof vi.fn>>

/** Share creation reads `request.nextUrl.origin`, which a bare Request lacks. */
function postRequest(body: unknown) {
  const url = new URL('http://localhost/api/doc/share')
  return {
    nextUrl: url,
    json: async () => body,
  } as any
}

beforeEach(() => {
  vi.clearAllMocks()
  queries.getDocument.mockResolvedValue({ id: 'doc-1', title: 'A doc' })
  queries.getShareTokenByDocumentId.mockResolvedValue(undefined)
  queries.getShareToken.mockResolvedValue(undefined)
  queries.createShareToken.mockResolvedValue(undefined)
})

describe('POST /api/doc/share', () => {
  it('requires a documentId', async () => {
    const res = await POST(postRequest({}))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Document ID is required/)
    expect(queries.getDocument).not.toHaveBeenCalled()
  })

  it('404s for a document that does not exist', async () => {
    queries.getDocument.mockResolvedValue(undefined)

    const res = await POST(postRequest({ documentId: 'nope' }))

    expect(res.status).toBe(404)
    expect((await res.json()).error).toMatch(/Document not found/)
  })

  it('mints a share token and returns its URL', async () => {
    const res = await POST(postRequest({ documentId: 'doc-1' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.shareUrl).toBe(`http://localhost/share/${data.data.shareId}`)
    expect(queries.createShareToken).toHaveBeenCalledWith(
      data.data.shareId,
      'doc-1',
      expect.any(String),
    )
  })

  it('reuses an existing token rather than minting a second one', async () => {
    queries.getShareTokenByDocumentId.mockResolvedValue({ id: 'existing-token' })

    const data = await (await POST(postRequest({ documentId: 'doc-1' }))).json()

    expect(data.data.shareId).toBe('existing-token')
    expect(data.data.shareUrl).toBe('http://localhost/share/existing-token')
    expect(queries.createShareToken).not.toHaveBeenCalled()
  })

  it('reports a failure as a 500', async () => {
    queries.getDocument.mockRejectedValue(new Error('db down'))

    const res = await POST(postRequest({ documentId: 'doc-1' }))

    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('db down')
  })
})

describe('GET /api/doc/share/[id]', () => {
  const request = { url: 'http://localhost/api/doc/share/tok' } as any

  it('404s for an unknown token', async () => {
    const res = await GET(request, routeContext({ id: 'tok' }))

    expect(res.status).toBe(404)
    expect((await res.json()).error).toMatch(/Share link not found/)
  })

  it('returns the shared document', async () => {
    queries.getShareToken.mockResolvedValue({ id: 'tok', documentId: 'doc-1' })

    const res = await GET(request, routeContext({ id: 'tok' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ success: true, data: { id: 'doc-1', title: 'A doc' } })
    expect(queries.getDocument).toHaveBeenCalledWith('doc-1')
  })

  it('410s for an expired token', async () => {
    queries.getShareToken.mockResolvedValue({
      id: 'tok',
      documentId: 'doc-1',
      expiresAt: '2000-01-01T00:00:00.000Z',
    })

    const res = await GET(request, routeContext({ id: 'tok' }))

    expect(res.status).toBe(410)
    expect((await res.json()).error).toMatch(/expired/)
    expect(queries.getDocument).not.toHaveBeenCalled()
  })

  it('honours a token that has not expired yet', async () => {
    queries.getShareToken.mockResolvedValue({
      id: 'tok',
      documentId: 'doc-1',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    })

    expect((await GET(request, routeContext({ id: 'tok' }))).status).toBe(200)
  })

  it('404s when the token points at a missing document', async () => {
    queries.getShareToken.mockResolvedValue({ id: 'tok', documentId: 'gone' })
    queries.getDocument.mockResolvedValue(undefined)

    const res = await GET(request, routeContext({ id: 'tok' }))

    expect(res.status).toBe(404)
    expect((await res.json()).error).toMatch(/Document not found/)
  })

  it('reports a lookup failure as a 500', async () => {
    queries.getShareToken.mockRejectedValue(new Error('db down'))

    const res = await GET(request, routeContext({ id: 'tok' }))

    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('db down')
  })
})
