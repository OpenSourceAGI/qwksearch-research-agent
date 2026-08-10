/**
 * @fileoverview Route tests for session listing and revocation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/database', () => ({ getDB: vi.fn() }))
vi.mock('@/lib/auth', () => ({ initAuth: vi.fn() }))
vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }))
vi.mock('@/lib/cloudflare/ip-geolocation', () => ({ detectVpnAndLocation: vi.fn() }))

import { getSession } from '@/lib/auth/session'
import { getDB } from '@/lib/database'
import { initAuth } from '@/lib/auth'
import { detectVpnAndLocation } from '@/lib/cloudflare/ip-geolocation'
import { createFakeDb, routeContext, type FakeDb } from '../../../__tests__/helpers/fake-db'
import { GET, DELETE } from '../route'
import { DELETE as DELETE_ONE } from '../[id]/route'

const mockGetSession = getSession as unknown as ReturnType<typeof vi.fn>
const mockGetDB = getDB as unknown as ReturnType<typeof vi.fn>
const mockInitAuth = initAuth as unknown as ReturnType<typeof vi.fn>
const mockDetectVpn = detectVpnAndLocation as unknown as ReturnType<typeof vi.fn>

const revokeOtherSessions = vi.fn()
const revokeSession = vi.fn()

const currentSession = (sessionId = 'sess-current') => ({
  user: { id: 'user-1' },
  session: { id: sessionId },
})

function setup(options: Parameters<typeof createFakeDb>[0] = {}): FakeDb {
  const db = createFakeDb(options)
  mockGetDB.mockReturnValue(db)
  mockGetSession.mockResolvedValue(currentSession())
  mockInitAuth.mockResolvedValue({ api: { revokeOtherSessions, revokeSession } })
  return db
}

const storedSession = (overrides: Record<string, unknown> = {}) => ({
  id: 'sess-current',
  token: 'tok',
  ipAddress: '1.2.3.4',
  userAgent: 'UA',
  city: 'Berlin',
  state: 'BE',
  isVpn: 0,
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  revokeOtherSessions.mockResolvedValue(undefined)
  revokeSession.mockResolvedValue(undefined)
  mockDetectVpn.mockResolvedValue({ city: 'Paris', state: 'IDF', isVpn: true })
})

describe('GET /api/user/sessions', () => {
  it('401s without a session', async () => {
    mockGetSession.mockResolvedValue(null)

    const res = await GET()

    expect(res.status).toBe(401)
    expect((await res.json()).message).toBe('Unauthorized')
  })

  it('returns the stored sessions and flags the current one', async () => {
    setup({ select: [storedSession(), storedSession({ id: 'sess-other', isVpn: 1 })] })

    const data = await (await GET()).json()

    expect(data).toHaveLength(2)
    expect(data[0].isCurrent).toBe(true)
    expect(data[1].isCurrent).toBe(false)
  })

  it('coerces the stored VPN flag to a boolean', async () => {
    setup({ select: [storedSession({ isVpn: 1 })] })

    expect((await (await GET()).json())[0].isVpn).toBe(true)
  })

  it('leaves an already-enriched session alone', async () => {
    setup({ select: [storedSession()] })

    const data = await (await GET()).json()

    expect(mockDetectVpn).not.toHaveBeenCalled()
    expect(data[0].city).toBe('Berlin')
  })

  it('looks up the location when it is missing and writes it back', async () => {
    const db = setup({ select: [storedSession({ city: null, state: null, isVpn: null })] })

    const data = await (await GET()).json()

    expect(mockDetectVpn).toHaveBeenCalledWith('1.2.3.4')
    expect(data[0]).toMatchObject({ city: 'Paris', state: 'IDF', isVpn: true })
    expect(db.calls.set[0][0]).toEqual({ city: 'Paris', state: 'IDF', isVpn: 1 })
  })

  it('keeps a stored field and fills only what is missing', async () => {
    setup({ select: [storedSession({ city: 'Berlin', state: null, isVpn: null })] })

    const data = await (await GET()).json()

    expect(data[0].city).toBe('Berlin')
    expect(data[0].state).toBe('IDF')
  })

  it('writes 0 when the lookup reports no VPN', async () => {
    mockDetectVpn.mockResolvedValue({ city: 'Paris', state: 'IDF', isVpn: false })
    const db = setup({ select: [storedSession({ city: null, state: null, isVpn: null })] })

    await GET()

    expect(db.calls.set[0][0].isVpn).toBe(0)
  })
})

describe('DELETE /api/user/sessions', () => {
  it('401s without a session', async () => {
    mockGetSession.mockResolvedValue(null)

    expect((await DELETE()).status).toBe(401)
  })

  it('revokes every other session', async () => {
    setup()

    const res = await DELETE()

    expect(res.status).toBe(200)
    expect((await res.json()).message).toMatch(/revoked successfully/)
    expect(revokeOtherSessions).toHaveBeenCalledTimes(1)
  })

  it('reports a revoke failure as a 500', async () => {
    setup()
    revokeOtherSessions.mockRejectedValue(new Error('auth down'))

    const res = await DELETE()

    expect(res.status).toBe(500)
    expect((await res.json()).message).toMatch(/Failed to revoke sessions/)
  })
})

describe('DELETE /api/user/sessions/[id]', () => {
  const request = new Request('http://localhost/api/user/sessions/sess-other', {
    method: 'DELETE',
  }) as any

  it('401s without a session', async () => {
    mockGetSession.mockResolvedValue(null)

    expect((await DELETE_ONE(request, routeContext({ id: 'sess-other' }))).status).toBe(401)
  })

  it('404s when the session does not belong to the caller', async () => {
    setup({ select: [] })

    const res = await DELETE_ONE(request, routeContext({ id: 'sess-other' }))

    expect(res.status).toBe(404)
    expect((await res.json()).message).toBe('Session not found.')
    expect(revokeSession).not.toHaveBeenCalled()
  })

  it('revokes the session by its token', async () => {
    setup({ select: [{ token: 'tok-other' }] })

    const res = await DELETE_ONE(request, routeContext({ id: 'sess-other' }))

    expect(res.status).toBe(200)
    expect(revokeSession).toHaveBeenCalledWith(
      expect.objectContaining({ body: { token: 'tok-other' } }),
    )
  })

  it('reports a revoke failure as a 500', async () => {
    setup({ select: [{ token: 'tok-other' }] })
    revokeSession.mockRejectedValue(new Error('auth down'))

    const res = await DELETE_ONE(request, routeContext({ id: 'sess-other' }))

    expect(res.status).toBe(500)
    expect((await res.json()).message).toMatch(/Failed to revoke session/)
  })
})
