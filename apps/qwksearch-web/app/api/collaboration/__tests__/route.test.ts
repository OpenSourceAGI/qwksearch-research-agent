/**
 * @fileoverview Route tests for the two endpoints the collaboration server
 * asks before it lets a socket sync a document: who the token belongs to, and
 * what that user may do to the document.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/database', () => ({ getDB: vi.fn() }))
vi.mock('@/lib/auth', () => ({ initAuth: vi.fn() }))

import { getDB } from '@/lib/database'
import { initAuth } from '@/lib/auth'
import { createFakeDb } from '../../__tests__/helpers/fake-db'
import { GET as SESSION } from '../session/route'
import { GET as ACCESS } from '../access/route'

const mockGetDB = getDB as unknown as ReturnType<typeof vi.fn>
const mockInitAuth = initAuth as unknown as ReturnType<typeof vi.fn>

/** Both routes read `nextUrl` and `headers`, which a bare Request lacks. */
function request(path: string, headers: Record<string, string> = {}) {
  const url = new URL(`http://localhost${path}`)
  return { nextUrl: url, url: url.toString(), headers: new Headers(headers) } as any
}

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.REASON_COLLAB_SECRET
})

describe('GET /api/collaboration/session', () => {
  /** Captures the headers the route hands Better Auth. */
  function withSession(user: { id: string; name?: string } | null) {
    const getSession = vi.fn().mockResolvedValue(user ? { user } : null)
    mockInitAuth.mockResolvedValue({ api: { getSession } })
    return getSession
  }

  it('answers with the user behind the bearer token', async () => {
    const getSession = withSession({ id: 'u1', name: 'Ada' })

    const res = await SESSION(request('/api/collaboration/session', { authorization: 'Bearer tok' }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: 'u1', name: 'Ada' })
    // The token is presented to Better Auth as the session cookie it is.
    const headers = getSession.mock.calls[0][0].headers as Headers
    expect(headers.get('cookie')).toContain('better-auth.session_token=tok')
  })

  it('falls back to the display name when the user has none', async () => {
    withSession({ id: 'u1' })

    const res = await SESSION(request('/api/collaboration/session', { authorization: 'Bearer tok' }))

    expect(await res.json()).toEqual({ id: 'u1', name: 'u1' })
  })

  it('passes a cookie-authenticated request through untouched', async () => {
    const getSession = withSession({ id: 'u1', name: 'Ada' })

    await SESSION(request('/api/collaboration/session', { cookie: 'better-auth.session_token=abc' }))

    const headers = getSession.mock.calls[0][0].headers as Headers
    expect(headers.get('cookie')).toBe('better-auth.session_token=abc')
  })

  it('rejects a token that resolves to no session', async () => {
    withSession(null)

    const res = await SESSION(request('/api/collaboration/session', { authorization: 'Bearer bad' }))

    expect(res.status).toBe(401)
  })

  it('reports an auth failure as a 500', async () => {
    mockInitAuth.mockRejectedValue(new Error('auth down'))

    const res = await SESSION(request('/api/collaboration/session', { authorization: 'Bearer tok' }))

    expect(res.status).toBe(500)
  })
})

describe('GET /api/collaboration/access', () => {
  const path = (documentId: string, userId: string) =>
    `/api/collaboration/access?documentId=${documentId}&userId=${userId}`

  it('grants write to the owner', async () => {
    mockGetDB.mockReturnValue(createFakeDb({ select: [{ id: 7, userId: 'u1' }] }))

    const res = await ACCESS(request(path('7', 'u1')))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ role: 'write' })
  })

  it('grants write on an unowned document', async () => {
    mockGetDB.mockReturnValue(createFakeDb({ select: [{ id: 7, userId: null }] }))

    expect(await (await ACCESS(request(path('7', 'u1')))).json()).toEqual({ role: 'write' })
  })

  it('refuses a user who does not own the document', async () => {
    mockGetDB.mockReturnValue(createFakeDb({ select: [{ id: 7, userId: 'owner' }] }))

    const res = await ACCESS(request(path('7', 'mallory')))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ role: null })
  })

  it('reports an unknown document as a 404 with no role', async () => {
    mockGetDB.mockReturnValue(createFakeDb({ select: [] }))

    const res = await ACCESS(request(path('7', 'u1')))

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ role: null })
  })

  it('rejects a non-numeric document id without querying', async () => {
    const db = createFakeDb({ select: [] })
    mockGetDB.mockReturnValue(db)

    const res = await ACCESS(request(path('not-a-doc', 'u1')))

    expect(res.status).toBe(404)
    expect(db.calls.select).toBeUndefined()
  })

  it('requires both parameters', async () => {
    mockGetDB.mockReturnValue(createFakeDb({ select: [] }))

    expect((await ACCESS(request('/api/collaboration/access?userId=u1'))).status).toBe(400)
    expect((await ACCESS(request('/api/collaboration/access?documentId=7'))).status).toBe(400)
  })

  it('rejects a caller that does not know the shared secret', async () => {
    process.env.REASON_COLLAB_SECRET = 's3cret'
    const db = createFakeDb({ select: [{ id: 7, userId: 'u1' }] })
    mockGetDB.mockReturnValue(db)

    const res = await ACCESS(request(path('7', 'u1'), { 'x-collaboration-secret': 'guess1' }))

    expect(res.status).toBe(401)
    expect(db.calls.select).toBeUndefined()
  })

  it('answers the collaboration server that knows the secret', async () => {
    process.env.REASON_COLLAB_SECRET = 's3cret'
    mockGetDB.mockReturnValue(createFakeDb({ select: [{ id: 7, userId: 'u1' }] }))

    const res = await ACCESS(request(path('7', 'u1'), { 'x-collaboration-secret': 's3cret' }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ role: 'write' })
  })

  it('refuses to answer at all in production without a configured secret', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const db = createFakeDb({ select: [{ id: 7, userId: 'u1' }] })
    mockGetDB.mockReturnValue(db)

    const res = await ACCESS(request(path('7', 'u1')))

    expect(res.status).toBe(503)
    expect(db.calls.select).toBeUndefined()
  })

  it('reports a query failure as a 500', async () => {
    mockGetDB.mockImplementation(() => {
      throw new Error('db down')
    })

    const res = await ACCESS(request(path('7', 'u1')))

    expect(res.status).toBe(500)
  })
})
