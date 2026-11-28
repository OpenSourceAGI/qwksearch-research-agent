/**
 * @fileoverview Route tests for the public card-text suggestion endpoint:
 * validation errors, the honeypot, per-address rate limiting, the stored row,
 * and CORS for the cross-origin static refdoc page.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/database', () => ({ getQueryDB: vi.fn() }))

import { getQueryDB } from '@/lib/database'
import { createFakeDb, jsonRequest, type FakeDb } from '../../__tests__/helpers/fake-db'
import { OPTIONS, POST } from '../route'
import { SUBMISSIONS_PER_WINDOW } from '@/lib/card-text-submission'

const mockGetQueryDB = getQueryDB as unknown as ReturnType<typeof vi.fn>

const TEXT = 'Counterplans that fiat uniform action distort the literature base and the debate.'
const body = { document: 'https://example.org/paper', documentTitle: 'A Paper', reference: 'ref-2', referenceLabel: "Galloway '20", text: TEXT }
const URL_ = 'http://localhost/api/card-text-submissions'

function setup(recent = 0): FakeDb {
  const db = createFakeDb({ select: [{ value: recent }] })
  mockGetQueryDB.mockReturnValue(db)
  return db
}

const post = (payload: unknown, headers: Record<string, string> = {}) => {
  const request = jsonRequest(URL_, 'POST', payload)
  for (const [k, v] of Object.entries(headers)) request.headers.set(k, v)
  return POST(request)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/card-text-submissions', () => {
  it('stores a valid suggestion as pending with a hashed address', async () => {
    const db = setup()
    const res = await post(body, { 'cf-connecting-ip': '9.9.9.9', Origin: 'https://cdn.example' })

    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ success: true })
    expect(db.calls.insert).toHaveLength(1)

    const [values] = db.calls.values[0] as [Record<string, unknown>]
    expect(values).toMatchObject({
      documentKey: 'https://example.org/paper',
      documentTitle: 'A Paper',
      referenceKey: 'ref-2',
      referenceLabel: "Galloway '20",
      submittedText: TEXT,
      status: 'pending',
    })
    expect(values.submitterIpHash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(values)).not.toContain('9.9.9.9')
  })

  it('answers cross-origin requests without an API key', async () => {
    setup()
    const res = await post(body, { Origin: 'https://cdn.example' })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
  })

  it('answers the CORS preflight', () => {
    const res = OPTIONS(new Request(URL_, { method: 'OPTIONS', headers: { Origin: 'https://cdn.example' } }))
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
  })

  it('rejects an invalid body without touching the database', async () => {
    const db = setup()
    const res = await post({ ...body, text: 'too short' })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('at least')
    expect(db.calls.select).toBeUndefined()
    expect(db.calls.insert).toBeUndefined()
  })

  it('rejects text over the maximum length', async () => {
    const db = setup()
    const res = await post({ ...body, text: 'x'.repeat(50_001) })
    expect(res.status).toBe(400)
    expect(db.calls.insert).toBeUndefined()
  })

  it('rejects malformed JSON', async () => {
    setup()
    const request = new Request(URL_, { method: 'POST', body: '{nope' }) as any
    expect((await POST(request)).status).toBe(400)
  })

  it('rejects an oversized request body', async () => {
    const db = setup()
    const res = await post(body, { 'content-length': String(10 * 1024 * 1024) })
    expect(res.status).toBe(413)
    expect(db.calls.insert).toBeUndefined()
  })

  it('pretends to accept a honeypot hit but stores nothing', async () => {
    const db = setup()
    const res = await post({ ...body, website: 'http://spam.example' })
    expect(res.status).toBe(201)
    expect(db.calls.select).toBeUndefined()
    expect(db.calls.insert).toBeUndefined()
  })

  it('rate limits an address that has sent too many recently', async () => {
    const db = setup(SUBMISSIONS_PER_WINDOW)
    const res = await post(body, { 'cf-connecting-ip': '9.9.9.9' })
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('3600')
    expect(db.calls.insert).toBeUndefined()
  })

  it('allows an address just under the limit', async () => {
    setup(SUBMISSIONS_PER_WINDOW - 1)
    expect((await post(body)).status).toBe(201)
  })

  it('reports a database failure without leaking details', async () => {
    const db = setup()
    db.insert = () => {
      throw new Error('D1 exploded: secret detail')
    }
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await post(body)
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('secret detail')
  })
})
