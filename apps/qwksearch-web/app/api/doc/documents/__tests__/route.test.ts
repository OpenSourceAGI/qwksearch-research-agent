/**
 * @fileoverview Route tests for the document CRUD endpoints, covering the
 * owner-based access checks and the anonymous (local-storage mode) path.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/database', () => ({ getDB: vi.fn() }))
vi.mock('@/lib/auth', () => ({ initAuth: vi.fn() }))

import { getDB } from '@/lib/database'
import { initAuth } from '@/lib/auth'
import { createFakeDb, jsonRequest, routeContext, type FakeDb } from '../../../__tests__/helpers/fake-db'
import { GET, POST } from '../route'
import { GET as GET_ONE, PUT, DELETE } from '../[id]/route'

const mockGetDB = getDB as unknown as ReturnType<typeof vi.fn>
const mockInitAuth = initAuth as unknown as ReturnType<typeof vi.fn>

/** Points `getDB()` at a fresh fake and `initAuth()` at the given session. */
function setup(options: Parameters<typeof createFakeDb>[0] = {}, userId: string | null = null): FakeDb {
  const db = createFakeDb(options)
  mockGetDB.mockReturnValue(db)
  mockInitAuth.mockResolvedValue({
    api: { getSession: vi.fn().mockResolvedValue(userId ? { user: { id: userId } } : null) },
  })
  return db
}

const request = (headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/doc/documents', { headers }) as any

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/doc/documents', () => {
  it('returns the documents the query yields', async () => {
    setup({ select: [{ id: 1, title: 'One' }] })

    const res = await GET(request())

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([{ id: 1, title: 'One' }])
  })

  it('scopes the query to the signed-in user', async () => {
    const db = setup({ select: [] }, 'user-1')

    await GET(request())

    expect(db.calls.where).toHaveLength(1)
    expect(db.calls.orderBy).toHaveLength(1)
  })

  it('falls back to the anonymous scope with no session', async () => {
    const db = setup({ select: [] })

    await GET(request())

    expect(db.calls.select).toHaveLength(1)
    expect(db.calls.where).toHaveLength(1)
  })

  it('reports a query failure as a 500', async () => {
    mockGetDB.mockImplementation(() => {
      throw new Error('db down')
    })
    mockInitAuth.mockResolvedValue({ api: { getSession: vi.fn() } })

    const res = await GET(request())

    expect(res.status).toBe(500)
    expect((await res.json()).error).toMatch(/Failed to fetch documents/)
  })
})

describe('POST /api/doc/documents', () => {
  it('creates a document and returns the inserted row', async () => {
    const db = setup({ insert: [{ id: 7, title: 'New' }] }, 'user-1')

    const res = await POST(
      jsonRequest('http://localhost/api/doc/documents', 'POST', { title: 'New', content: 'body' }),
    )

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: 7, title: 'New' })
    expect(db.calls.values[0][0]).toMatchObject({
      title: 'New',
      content: 'body',
      userId: 'user-1',
      isFolder: 0,
    })
  })

  it('defaults the name and title to "Untitled"', async () => {
    const db = setup({ insert: [{ id: 1 }] })

    await POST(jsonRequest('http://localhost/api/doc/documents', 'POST', {}))

    expect(db.calls.values[0][0]).toMatchObject({ name: 'Untitled', title: 'Untitled', content: '' })
  })

  it('falls back to the title when no name is given', async () => {
    const db = setup({ insert: [{ id: 1 }] })

    await POST(jsonRequest('http://localhost/api/doc/documents', 'POST', { title: 'A title' }))

    expect(db.calls.values[0][0].name).toBe('A title')
  })

  it('marks folders as expanded folders', async () => {
    const db = setup({ insert: [{ id: 1 }] })

    await POST(
      jsonRequest('http://localhost/api/doc/documents', 'POST', { name: 'F', isFolder: true }),
    )

    expect(db.calls.values[0][0]).toMatchObject({ isFolder: 1, isExpanded: 1 })
  })

  it('serialises metadata and nulls it when absent', async () => {
    const withMeta = setup({ insert: [{ id: 1 }] })
    await POST(
      jsonRequest('http://localhost/api/doc/documents', 'POST', { metadata: { a: 1 } }),
    )
    expect(withMeta.calls.values[0][0].metadata).toBe(JSON.stringify({ a: 1 }))

    const withoutMeta = setup({ insert: [{ id: 1 }] })
    await POST(jsonRequest('http://localhost/api/doc/documents', 'POST', {}))
    expect(withoutMeta.calls.values[0][0].metadata).toBeNull()
  })

  it('reports a write failure as a 500', async () => {
    setup({ insert: [{ id: 1 }] })
    const res = await POST(
      new Request('http://localhost/api/doc/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{not json',
      }) as any,
    )

    expect(res.status).toBe(500)
    expect((await res.json()).error).toMatch(/Failed to create document/)
  })
})

describe('GET /api/doc/documents/[id]', () => {
  it('returns a document the caller owns', async () => {
    setup({ select: [{ id: 1, userId: 'user-1', title: 'Mine' }] }, 'user-1')

    const res = await GET_ONE(request(), routeContext({ id: '1' }))

    expect(res.status).toBe(200)
    expect((await res.json()).title).toBe('Mine')
  })

  it('returns an unowned document to an anonymous caller', async () => {
    setup({ select: [{ id: 1, userId: null, title: 'Public' }] })

    expect((await GET_ONE(request(), routeContext({ id: '1' }))).status).toBe(200)
  })

  it('404s for a missing document', async () => {
    setup({ select: [] })

    const res = await GET_ONE(request(), routeContext({ id: '99' }))

    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Document not found')
  })

  it('403s when the document belongs to someone else', async () => {
    setup({ select: [{ id: 1, userId: 'someone-else' }] }, 'user-1')

    const res = await GET_ONE(request(), routeContext({ id: '1' }))

    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('Unauthorized')
  })

  it('reports a lookup failure as a 500', async () => {
    mockGetDB.mockImplementation(() => {
      throw new Error('db down')
    })
    mockInitAuth.mockResolvedValue({ api: { getSession: vi.fn() } })

    expect((await GET_ONE(request(), routeContext({ id: '1' }))).status).toBe(500)
  })
})

describe('PUT /api/doc/documents/[id]', () => {
  const put = (body: unknown, id = '1') =>
    PUT(jsonRequest(`http://localhost/api/doc/documents/${id}`, 'PUT', body), routeContext({ id }))

  it('updates only the supplied fields', async () => {
    const db = setup({ select: [{ id: 1, userId: 'user-1' }], update: [{ id: 1, title: 'New' }] }, 'user-1')

    const res = await put({ title: 'New' })

    expect(res.status).toBe(200)
    const patch = db.calls.set[0][0] as Record<string, unknown>
    expect(patch.title).toBe('New')
    expect(patch).not.toHaveProperty('content')
    expect(patch.updatedAt).toEqual(expect.any(String))
  })

  it('maps every optional field it is given', async () => {
    const db = setup({ select: [{ id: 1, userId: null }], update: [{ id: 1 }] })

    await put({
      title: 'T',
      name: 'N',
      content: 'C',
      parentId: 4,
      isExpanded: true,
      metadata: { a: 1 },
    })

    expect(db.calls.set[0][0]).toMatchObject({
      title: 'T',
      name: 'N',
      content: 'C',
      parentId: 4,
      isExpanded: 1,
      metadata: JSON.stringify({ a: 1 }),
    })
  })

  it('stores a collapsed flag as 0', async () => {
    const db = setup({ select: [{ id: 1, userId: null }], update: [{ id: 1 }] })

    await put({ isExpanded: false })

    expect(db.calls.set[0][0].isExpanded).toBe(0)
  })

  it('404s for a missing document', async () => {
    setup({ select: [] })

    expect((await put({ title: 'x' })).status).toBe(404)
  })

  it('403s when the document belongs to someone else', async () => {
    setup({ select: [{ id: 1, userId: 'other' }], update: [] }, 'user-1')

    expect((await put({ title: 'x' })).status).toBe(403)
  })

  it('reports a write failure as a 500', async () => {
    setup({ select: [{ id: 1, userId: null }] })

    const res = await PUT(
      new Request('http://localhost/api/doc/documents/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: '{not json',
      }) as any,
      routeContext({ id: '1' }),
    )

    expect(res.status).toBe(500)
    expect((await res.json()).error).toMatch(/Failed to update document/)
  })
})

describe('DELETE /api/doc/documents/[id]', () => {
  const del = (id = '1') =>
    DELETE(jsonRequest(`http://localhost/api/doc/documents/${id}`, 'DELETE'), routeContext({ id }))

  it('deletes a document the caller owns', async () => {
    const db = setup({ select: [{ id: 1, userId: 'user-1' }] }, 'user-1')

    const res = await del()

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(db.calls.delete).toHaveLength(1)
  })

  it('404s for a missing document', async () => {
    setup({ select: [] })

    expect((await del('99')).status).toBe(404)
  })

  it('403s when the document belongs to someone else', async () => {
    const db = setup({ select: [{ id: 1, userId: 'other' }] }, 'user-1')

    expect((await del()).status).toBe(403)
    expect(db.calls.delete).toBeUndefined()
  })

  it('reports a delete failure as a 500', async () => {
    mockGetDB.mockImplementation(() => {
      throw new Error('db down')
    })
    mockInitAuth.mockResolvedValue({ api: { getSession: vi.fn() } })

    expect((await del()).status).toBe(500)
  })
})
