/**
 * @fileoverview Route tests for the saved-articles (favorites) endpoints.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/database', () => ({ getDB: vi.fn() }))
vi.mock('@/lib/auth/session', () => ({ requireUserId: vi.fn() }))

import { getDB } from '@/lib/database'
import { requireUserId } from '@/lib/auth/session'
import { createFakeDb, jsonRequest, type FakeDb } from '../../../__tests__/helpers/fake-db'
import { GET, POST, DELETE } from '../route'

const mockGetDB = getDB as unknown as ReturnType<typeof vi.fn>
const mockRequireUserId = requireUserId as unknown as ReturnType<typeof vi.fn>

function setup(options: Parameters<typeof createFakeDb>[0] = {}): FakeDb {
  const db = createFakeDb(options)
  mockGetDB.mockReturnValue(db)
  mockRequireUserId.mockResolvedValue('user-1')
  return db
}

const getRequest = () => new Request('http://localhost/api/doc/favorites') as any
const deleteRequest = (search = '') =>
  new Request(`http://localhost/api/doc/favorites${search}`, { method: 'DELETE' }) as any

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/doc/favorites', () => {
  it('returns the current user favorites', async () => {
    setup({ query: { favorites: { findMany: [{ id: 1, url: 'https://a.test' }] } } })

    const res = await GET(getRequest())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.favorites).toHaveLength(1)
  })

  it('returns an empty list when there are none', async () => {
    setup()

    expect((await (await GET(getRequest())).json()).favorites).toEqual([])
  })

  it('401s for an unauthenticated caller', async () => {
    mockGetDB.mockReturnValue(createFakeDb())
    mockRequireUserId.mockRejectedValue(new Error('Unauthorized'))

    const res = await GET(getRequest())

    expect(res.status).toBe(401)
    expect((await res.json()).message).toMatch(/Authentication required/)
  })

  it('reports any other failure as a 500', async () => {
    mockGetDB.mockImplementation(() => {
      throw new Error('db down')
    })

    const res = await GET(getRequest())

    expect(res.status).toBe(500)
    expect((await res.json()).message).toMatch(/An error has occurred/)
  })
})

describe('POST /api/doc/favorites', () => {
  const body = (overrides: Record<string, unknown> = {}) => ({
    url: 'https://a.test/article',
    title: 'An article',
    ...overrides,
  })

  it('requires a URL', async () => {
    setup()

    const res = await POST(jsonRequest('http://localhost/api/doc/favorites', 'POST', { title: 'x' }))

    expect(res.status).toBe(400)
    expect((await res.json()).message).toMatch(/URL is required/)
  })

  it('creates a favorite and returns it with 201', async () => {
    const db = setup({ insert: [{ id: 5, url: 'https://a.test/article' }] })

    const res = await POST(
      jsonRequest('http://localhost/api/doc/favorites', 'POST', body({ author: 'A', word_count: 900 })),
    )
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.message).toBe('Favorite added')
    expect(data.favorite).toEqual({ id: 5, url: 'https://a.test/article' })
    expect(db.calls.values[0][0]).toMatchObject({
      userId: 'user-1',
      url: 'https://a.test/article',
      author: 'A',
      word_count: 900,
    })
  })

  it('is idempotent for an article already favorited', async () => {
    const db = setup({ query: { favorites: { findFirst: { id: 5, url: 'https://a.test/article' } } } })

    const res = await POST(jsonRequest('http://localhost/api/doc/favorites', 'POST', body()))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.message).toMatch(/already favorited/)
    expect(db.calls.insert).toBeUndefined()
  })

  it('401s for an unauthenticated caller', async () => {
    mockGetDB.mockReturnValue(createFakeDb())
    mockRequireUserId.mockRejectedValue(new Error('Unauthorized'))

    expect((await POST(jsonRequest('http://localhost/api/doc/favorites', 'POST', body()))).status).toBe(
      401,
    )
  })

  it('reports a write failure as a 500', async () => {
    setup()

    const res = await POST(
      new Request('http://localhost/api/doc/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{not json',
      }) as any,
    )

    expect(res.status).toBe(500)
  })
})

describe('DELETE /api/doc/favorites', () => {
  it('requires a url parameter', async () => {
    setup()

    const res = await DELETE(deleteRequest())

    expect(res.status).toBe(400)
    expect((await res.json()).message).toMatch(/URL parameter is required/)
  })

  it('removes the favorite', async () => {
    const db = setup()

    const res = await DELETE(deleteRequest('?url=https%3A%2F%2Fa.test%2Farticle'))

    expect(res.status).toBe(200)
    expect((await res.json()).message).toBe('Favorite removed')
    expect(db.calls.delete).toHaveLength(1)
  })

  it('401s for an unauthenticated caller', async () => {
    mockGetDB.mockReturnValue(createFakeDb())
    mockRequireUserId.mockRejectedValue(new Error('Unauthorized'))

    expect((await DELETE(deleteRequest('?url=https%3A%2F%2Fa.test'))).status).toBe(401)
  })

  it('reports any other failure as a 500', async () => {
    mockGetDB.mockImplementation(() => {
      throw new Error('db down')
    })

    expect((await DELETE(deleteRequest('?url=https%3A%2F%2Fa.test'))).status).toBe(500)
  })
})
