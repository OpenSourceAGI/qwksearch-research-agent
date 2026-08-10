/**
 * @fileoverview Route tests for listing and unlinking OAuth accounts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/database', () => ({ getDB: vi.fn() }))

import { getSession } from '@/lib/auth/session'
import { getDB } from '@/lib/database'
import { createFakeDb, jsonRequest, type FakeDb } from '../../../__tests__/helpers/fake-db'
import { GET, DELETE } from '../route'

const mockGetSession = getSession as unknown as ReturnType<typeof vi.fn>
const mockGetDB = getDB as unknown as ReturnType<typeof vi.fn>

function setup(options: Parameters<typeof createFakeDb>[0] = {}): FakeDb {
  const db = createFakeDb(options)
  mockGetDB.mockReturnValue(db)
  mockGetSession.mockResolvedValue({ user: { id: 'user-1' } })
  return db
}

const deleteRequest = (body: unknown) =>
  jsonRequest('http://localhost/api/user/accounts', 'DELETE', body)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/user/accounts', () => {
  it('401s without a session', async () => {
    mockGetSession.mockResolvedValue(null)

    const res = await GET()

    expect(res.status).toBe(401)
    expect((await res.json()).message).toBe('Unauthorized')
  })

  it('returns the linked accounts', async () => {
    setup({ select: [{ id: 'a1', providerId: 'github', accountId: '42' }] })

    const data = await (await GET()).json()

    expect(data).toEqual([{ id: 'a1', providerId: 'github', accountId: '42' }])
  })

  it('returns an empty list when nothing is linked', async () => {
    setup()

    expect(await (await GET()).json()).toEqual([])
  })
})

describe('DELETE /api/user/accounts', () => {
  it('401s without a session', async () => {
    mockGetSession.mockResolvedValue(null)

    expect((await DELETE(deleteRequest({ accountId: 'a1' }))).status).toBe(401)
  })

  it('requires an accountId', async () => {
    setup()

    const res = await DELETE(deleteRequest({}))

    expect(res.status).toBe(400)
    expect((await res.json()).message).toMatch(/Account ID is required/)
  })

  it('refuses to unlink the only account', async () => {
    const db = setup({ select: [{ id: 'a1' }] })

    const res = await DELETE(deleteRequest({ accountId: 'a1' }))

    expect(res.status).toBe(400)
    expect((await res.json()).message).toMatch(/only account/)
    expect(db.calls.delete).toBeUndefined()
  })

  it('unlinks an account when another remains', async () => {
    const db = setup({ select: [{ id: 'a1' }, { id: 'a2' }] })

    const res = await DELETE(deleteRequest({ accountId: 'a1' }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(db.calls.delete).toHaveLength(1)
  })

  it('reports a failure as a 500', async () => {
    setup()

    const res = await DELETE(
      new Request('http://localhost/api/user/accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: '{not json',
      }) as any,
    )

    expect(res.status).toBe(500)
    expect((await res.json()).message).toMatch(/Failed to unlink account/)
  })
})
