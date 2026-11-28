/**
 * @fileoverview Route tests for the admin review endpoints of card-text
 * suggestions: admin guard, status filter and counts, and approve / reject.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/database', () => ({ getQueryDB: vi.fn() }))
vi.mock('@/lib/auth/admin', () => ({ assertAdmin: vi.fn() }))
vi.mock('@/lib/auth/session', () => ({ getSession: vi.fn() }))

import { getQueryDB } from '@/lib/database'
import { assertAdmin } from '@/lib/auth/admin'
import { getSession } from '@/lib/auth/session'
import { createFakeDb, jsonRequest, type FakeDb } from '../../../__tests__/helpers/fake-db'
import { GET, PATCH } from '../route'

const mockGetQueryDB = getQueryDB as unknown as ReturnType<typeof vi.fn>
const mockAssertAdmin = assertAdmin as unknown as ReturnType<typeof vi.fn>
const mockGetSession = getSession as unknown as ReturnType<typeof vi.fn>

function setup(options: Parameters<typeof createFakeDb>[0] = {}): FakeDb {
  const db = createFakeDb(options)
  mockGetQueryDB.mockReturnValue(db)
  return db
}

function listRequest(search = '') {
  const url = new URL(`http://localhost/api/admin/card-text-submissions${search}`)
  return { nextUrl: url, url: url.toString() } as any
}

const patch = (payload: unknown) =>
  PATCH(jsonRequest('http://localhost/api/admin/card-text-submissions', 'PATCH', payload))

beforeEach(() => {
  vi.clearAllMocks()
  mockAssertAdmin.mockResolvedValue(undefined)
  mockGetSession.mockResolvedValue({ user: { email: 'admin@example.org' } })
})

describe('GET /api/admin/card-text-submissions', () => {
  it('returns the guard response for a non-admin', async () => {
    mockAssertAdmin.mockResolvedValue(Response.json({ error: 'Forbidden' }, { status: 403 }))
    const db = setup()
    const res = await GET(listRequest())
    expect(res.status).toBe(403)
    expect(db.calls.select).toBeUndefined()
  })

  it('lists pending submissions with per-status counts', async () => {
    const rows = [{ id: 7, status: 'pending', referenceKey: 'ref-2' }]
    setup({
      select: (i) =>
        i === 0
          ? rows
          : [
              { status: 'pending', value: 30 },
              { status: 'approved', value: 4 },
            ],
    })
    const res = await GET(listRequest())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      submissions: rows,
      page: 1,
      limit: 25,
      matched: 30,
      pageCount: 2,
      counts: { pending: 30, approved: 4, rejected: 0 },
    })
  })

  it('counts every status for the all tab', async () => {
    setup({
      select: (i) =>
        i === 0
          ? []
          : [
              { status: 'pending', value: 1 },
              { status: 'rejected', value: 2 },
            ],
    })
    const body = await (await GET(listRequest('?status=all&limit=500'))).json()
    expect(body.matched).toBe(3)
    expect(body.limit).toBe(100)
  })

  it('rejects an unknown status filter', async () => {
    setup()
    expect((await GET(listRequest('?status=spam'))).status).toBe(400)
  })
})

describe('PATCH /api/admin/card-text-submissions', () => {
  it('returns the guard response for a non-admin', async () => {
    mockAssertAdmin.mockResolvedValue(Response.json({ error: 'Forbidden' }, { status: 403 }))
    const db = setup()
    expect((await patch({ id: 1, status: 'approved' })).status).toBe(403)
    expect(db.calls.update).toBeUndefined()
  })

  it('approves a submission and records who reviewed it', async () => {
    const db = setup({ update: [{ id: 1, status: 'approved' }] })
    const res = await patch({ id: 1, status: 'approved' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ submission: { id: 1, status: 'approved' } })
    expect(db.calls.set[0][0]).toMatchObject({ status: 'approved', reviewedBy: 'admin@example.org' })
  })

  it('clears the review when sent back to pending', async () => {
    const db = setup({ update: [{ id: 1, status: 'pending' }] })
    await patch({ id: 1, status: 'pending' })
    expect(db.calls.set[0][0]).toEqual({ status: 'pending', reviewedAt: null, reviewedBy: null })
  })

  it('rejects a missing id or an invalid status', async () => {
    const db = setup()
    expect((await patch({ status: 'approved' })).status).toBe(400)
    expect((await patch({ id: '1', status: 'approved' })).status).toBe(400)
    expect((await patch({ id: 1, status: 'spam' })).status).toBe(400)
    expect(db.calls.update).toBeUndefined()
  })

  it('returns 404 for an unknown submission', async () => {
    setup({ update: [] })
    expect((await patch({ id: 99, status: 'rejected' })).status).toBe(404)
  })
})
