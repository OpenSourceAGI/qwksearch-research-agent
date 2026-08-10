/**
 * @fileoverview Route tests for the research-quotes endpoints.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/database/turso', () => ({
  tursoQueries: {
    getQuotesByDocument: vi.fn(),
    createQuote: vi.fn(),
    updateQuote: vi.fn(),
    deleteQuote: vi.fn(),
  },
}))

import { tursoQueries } from '@/lib/database/turso'
import { jsonRequest, routeContext } from '../../../__tests__/helpers/fake-db'
import { GET, POST } from '../route'
import { PUT, DELETE } from '../[id]/route'

const queries = tursoQueries as unknown as Record<string, ReturnType<typeof vi.fn>>

function getRequest(search = '') {
  const url = new URL(`http://localhost/api/doc/quotes${search}`)
  return { url: url.toString(), nextUrl: url } as any
}

beforeEach(() => {
  vi.clearAllMocks()
  queries.getQuotesByDocument.mockResolvedValue([])
  queries.createQuote.mockResolvedValue(undefined)
  queries.updateQuote.mockResolvedValue(undefined)
  queries.deleteQuote.mockResolvedValue(undefined)
})

describe('GET /api/doc/quotes', () => {
  it('requires a documentId', async () => {
    const res = await GET(getRequest())

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/documentId is required/)
    expect(queries.getQuotesByDocument).not.toHaveBeenCalled()
  })

  it('returns the quotes for a document', async () => {
    queries.getQuotesByDocument.mockResolvedValue([{ id: 'q1', text: 'hello', tags: null }])

    const res = await GET(getRequest('?documentId=doc-1'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(1)
    expect(queries.getQuotesByDocument).toHaveBeenCalledWith('doc-1')
  })

  it('parses stored tag JSON back into an array', async () => {
    queries.getQuotesByDocument.mockResolvedValue([
      { id: 'q1', text: 'hello', tags: JSON.stringify(['a', 'b']) },
    ])

    const data = await (await GET(getRequest('?documentId=doc-1'))).json()

    expect(data.data[0].tags).toEqual(['a', 'b'])
  })

  it('leaves tags undefined when none are stored', async () => {
    queries.getQuotesByDocument.mockResolvedValue([{ id: 'q1', text: 'hello', tags: null }])

    const data = await (await GET(getRequest('?documentId=doc-1'))).json()

    expect(data.data[0].tags).toBeUndefined()
  })

  it('reports a query failure as a 500', async () => {
    queries.getQuotesByDocument.mockRejectedValue(new Error('db down'))

    const res = await GET(getRequest('?documentId=doc-1'))

    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('db down')
  })
})

describe('POST /api/doc/quotes', () => {
  const body = (overrides: Record<string, unknown> = {}) => ({
    documentId: 'doc-1',
    text: 'a quote',
    ...overrides,
  })

  it('requires documentId and text', async () => {
    for (const invalid of [{ text: 'x' }, { documentId: 'doc-1' }, {}]) {
      const res = await POST(jsonRequest('http://localhost/api/doc/quotes', 'POST', invalid))

      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/documentId and text are required/)
    }
    expect(queries.createQuote).not.toHaveBeenCalled()
  })

  it('creates a quote and echoes it back with 201', async () => {
    const res = await POST(
      jsonRequest('http://localhost/api/doc/quotes', 'POST', body({ source: 'Book', author: 'A' })),
    )
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data).toMatchObject({ documentId: 'doc-1', text: 'a quote', source: 'Book' })
    expect(typeof data.data.id).toBe('string')
    expect(Number.isNaN(new Date(data.data.createdAt).getTime())).toBe(false)
  })

  it('serialises tags and nulls the optional fields', async () => {
    await POST(
      jsonRequest('http://localhost/api/doc/quotes', 'POST', body({ tags: ['x'] })),
    )

    const args = queries.createQuote.mock.calls[0]
    expect(args[3]).toBeNull() // source
    expect(args[4]).toBeNull() // author
    expect(args[5]).toBeNull() // url
    expect(args[6]).toBeNull() // pageNumber
    expect(args[7]).toBe(JSON.stringify(['x']))
  })

  it('passes null for tags when none are supplied', async () => {
    await POST(jsonRequest('http://localhost/api/doc/quotes', 'POST', body()))

    expect(queries.createQuote.mock.calls[0][7]).toBeNull()
  })

  it('reports a write failure as a 500', async () => {
    queries.createQuote.mockRejectedValue(new Error('insert failed'))

    const res = await POST(jsonRequest('http://localhost/api/doc/quotes', 'POST', body()))

    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('insert failed')
  })

  it('reports an unparseable body as a 500', async () => {
    const request = new Request('http://localhost/api/doc/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    }) as any

    expect((await POST(request)).status).toBe(500)
  })
})

describe('PUT /api/doc/quotes/[id]', () => {
  it('requires text', async () => {
    const res = await PUT(
      jsonRequest('http://localhost/api/doc/quotes/q1', 'PUT', { source: 'Book' }),
      routeContext({ id: 'q1' }),
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/text is required/)
    expect(queries.updateQuote).not.toHaveBeenCalled()
  })

  it('updates the quote and echoes the new values', async () => {
    const res = await PUT(
      jsonRequest('http://localhost/api/doc/quotes/q1', 'PUT', {
        text: 'updated',
        tags: ['t'],
        pageNumber: 12,
      }),
      routeContext({ id: 'q1' }),
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data).toMatchObject({ id: 'q1', text: 'updated', pageNumber: 12 })
    expect(queries.updateQuote).toHaveBeenCalledWith(
      'updated',
      null,
      null,
      null,
      12,
      JSON.stringify(['t']),
      'q1',
    )
  })

  it('reports a write failure as a 500', async () => {
    queries.updateQuote.mockRejectedValue(new Error('update failed'))

    const res = await PUT(
      jsonRequest('http://localhost/api/doc/quotes/q1', 'PUT', { text: 'x' }),
      routeContext({ id: 'q1' }),
    )

    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('update failed')
  })
})

describe('DELETE /api/doc/quotes/[id]', () => {
  it('deletes the quote and echoes its id', async () => {
    const res = await DELETE(
      jsonRequest('http://localhost/api/doc/quotes/q1', 'DELETE'),
      routeContext({ id: 'q1' }),
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ success: true, data: { id: 'q1' } })
    expect(queries.deleteQuote).toHaveBeenCalledWith('q1')
  })

  it('reports a delete failure as a 500', async () => {
    queries.deleteQuote.mockRejectedValue(new Error('delete failed'))

    const res = await DELETE(
      jsonRequest('http://localhost/api/doc/quotes/q1', 'DELETE'),
      routeContext({ id: 'q1' }),
    )

    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('delete failed')
  })

  it('falls back to a generic message for an error with none', async () => {
    queries.deleteQuote.mockRejectedValue({})

    const res = await DELETE(
      jsonRequest('http://localhost/api/doc/quotes/q1', 'DELETE'),
      routeContext({ id: 'q1' }),
    )

    expect((await res.json()).error).toBe('Failed to delete quote')
  })
})
