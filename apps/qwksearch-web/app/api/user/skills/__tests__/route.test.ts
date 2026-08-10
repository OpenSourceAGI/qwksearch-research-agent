/**
 * @fileoverview Route tests for the three skill-preference endpoints: the
 * database-backed agent-skills route and the two in-memory enabled-skills
 * routes (single toggle and batch update).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/database', () => ({ getDB: vi.fn() }))

import { getSession } from '@/lib/auth/session'
import { getDB } from '@/lib/database'
import { createFakeDb, jsonRequest, type FakeDb } from '../../../__tests__/helpers/fake-db'
import { GET as GET_AGENT_SKILLS, POST as POST_AGENT_SKILL } from '../../agent-skills/route'
import { GET as GET_ENABLED, POST as POST_ENABLED } from '../../enabled-skills/route'
import { POST as POST_BATCH } from '../../enabled-skills/batch/route'

const mockGetSession = getSession as unknown as ReturnType<typeof vi.fn>
const mockGetDB = getDB as unknown as ReturnType<typeof vi.fn>

const signedIn = (id = 'user-1') => mockGetSession.mockResolvedValue({ user: { id } })
const signedOut = () => mockGetSession.mockResolvedValue(null)

function fakeDb(options: Parameters<typeof createFakeDb>[0] = {}): FakeDb {
  const db = createFakeDb(options)
  mockGetDB.mockReturnValue(db)
  return db
}

const getRequest = (path: string) => new Request(`http://localhost${path}`) as any

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/user/agent-skills', () => {
  it('401s without a session', async () => {
    signedOut()

    const res = await GET_AGENT_SKILLS()

    expect(res.status).toBe(401)
    expect((await res.json()).message).toBe('Unauthorized')
  })

  it('returns the stored preferences', async () => {
    signedIn()
    fakeDb({ select: [{ skillId: 'web-search', enabled: true }] })

    expect(await (await GET_AGENT_SKILLS()).json()).toEqual([
      { skillId: 'web-search', enabled: true },
    ])
  })
})

describe('POST /api/user/agent-skills', () => {
  const post = (body: unknown) =>
    POST_AGENT_SKILL(jsonRequest('http://localhost/api/user/agent-skills', 'POST', body))

  it('401s without a session', async () => {
    signedOut()

    expect((await post({ skillId: 'web-search', enabled: true })).status).toBe(401)
  })

  it('requires a skillId and a boolean enabled flag', async () => {
    signedIn()
    fakeDb()

    for (const invalid of [
      { enabled: true },
      { skillId: 'web-search' },
      { skillId: 'web-search', enabled: 'yes' },
    ]) {
      const res = await post(invalid)

      expect(res.status).toBe(400)
      expect((await res.json()).message).toMatch(/skillId and enabled are required/)
    }
  })

  it('updates an existing preference rather than inserting', async () => {
    signedIn()
    const db = fakeDb({ select: [{ id: 'row-1' }] })

    const res = await post({ skillId: 'web-search', enabled: false })

    expect(res.status).toBe(200)
    expect(db.calls.update).toHaveLength(1)
    expect(db.calls.set[0][0]).toMatchObject({ enabled: false })
    expect(db.calls.insert).toBeUndefined()
  })

  it('inserts a new preference when none exists', async () => {
    signedIn('user-9')
    const db = fakeDb({ select: [] })

    const res = await post({ skillId: 'pdf-analysis', enabled: true })

    expect(res.status).toBe(200)
    expect((await res.json()).message).toBe('Skill preference updated')
    expect(db.calls.values[0][0]).toMatchObject({
      userId: 'user-9',
      skillId: 'pdf-analysis',
      enabled: true,
    })
    expect((db.calls.values[0][0] as any).id).toMatch(/^skill_/)
  })
})

describe('GET /api/user/enabled-skills', () => {
  it('401s without a session', async () => {
    signedOut()

    expect((await GET_ENABLED(getRequest('/api/user/enabled-skills'))).status).toBe(401)
  })

  it('seeds the default skill set, all enabled, on first read', async () => {
    signedIn('skills-fresh')

    const skills = await (await GET_ENABLED(getRequest('/api/user/enabled-skills'))).json()

    expect(skills).toHaveLength(12)
    expect(skills.every((s: any) => s.enabled)).toBe(true)
    expect(skills.map((s: any) => s.id)).toContain('web-search')
  })

  it('returns the same set on a second read', async () => {
    signedIn('skills-stable')

    const first = await (await GET_ENABLED(getRequest('/api/user/enabled-skills'))).json()
    const second = await (await GET_ENABLED(getRequest('/api/user/enabled-skills'))).json()

    expect(second).toEqual(first)
  })

  it('reports a session failure as a 500', async () => {
    mockGetSession.mockRejectedValue(new Error('auth down'))

    expect((await GET_ENABLED(getRequest('/api/user/enabled-skills'))).status).toBe(500)
  })
})

describe('POST /api/user/enabled-skills', () => {
  const post = (body: unknown) =>
    POST_ENABLED(jsonRequest('http://localhost/api/user/enabled-skills', 'POST', body))

  it('401s without a session', async () => {
    signedOut()

    expect((await post({ skillId: 'web-search', enabled: false })).status).toBe(401)
  })

  it('requires a skillId and a boolean enabled flag', async () => {
    signedIn()

    for (const invalid of [{ enabled: false }, { skillId: 'web-search' }, {}]) {
      const res = await post(invalid)

      expect(res.status).toBe(400)
      expect((await res.json()).message).toMatch(/Missing required fields/)
    }
  })

  it('toggles a default skill off and reflects it in the next read', async () => {
    signedIn('skills-toggle')

    const res = await post({ skillId: 'web-search', enabled: false })

    expect(res.status).toBe(200)
    expect((await res.json()).message).toBe('Skill disabled successfully')

    const skills = await (await GET_ENABLED(getRequest('/api/user/enabled-skills'))).json()
    expect(skills.find((s: any) => s.id === 'web-search').enabled).toBe(false)
  })

  it('adds a skill outside the default set', async () => {
    signedIn('skills-extra')

    const res = await post({ skillId: 'custom-skill', enabled: true })

    expect((await res.json()).message).toBe('Skill enabled successfully')

    const skills = await (await GET_ENABLED(getRequest('/api/user/enabled-skills'))).json()
    expect(skills.map((s: any) => s.id)).toContain('custom-skill')
  })

  it('reports a bad body as a 500', async () => {
    signedIn()

    const res = await POST_ENABLED(
      new Request('http://localhost/api/user/enabled-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{not json',
      }) as any,
    )

    expect(res.status).toBe(500)
  })
})

describe('POST /api/user/enabled-skills/batch', () => {
  const post = (body: unknown) =>
    POST_BATCH(jsonRequest('http://localhost/api/user/enabled-skills/batch', 'POST', body))

  it('401s without a session', async () => {
    signedOut()

    expect((await post({ updates: [{ skillId: 'a', enabled: true }] })).status).toBe(401)
  })

  it('rejects a missing or empty updates array', async () => {
    signedIn()

    for (const invalid of [{}, { updates: [] }, { updates: 'nope' }]) {
      const res = await post(invalid)

      expect(res.status).toBe(400)
      expect((await res.json()).message).toBe('Invalid updates array')
    }
  })

  it('rejects an update missing a skillId or a boolean flag', async () => {
    signedIn()

    for (const updates of [[{ enabled: true }], [{ skillId: 'a' }], [{ skillId: 'a', enabled: 1 }]]) {
      const res = await post({ updates })

      expect(res.status).toBe(400)
      expect((await res.json()).message).toMatch(/must have skillId and enabled/)
    }
  })

  it('applies every update and echoes them back', async () => {
    signedIn('batch-user')

    const res = await post({
      updates: [
        { skillId: 'web-search', enabled: false },
        { skillId: 'pdf-analysis', enabled: true },
      ],
    })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.message).toBe('Updated 2 skills')
    expect(data.results).toEqual([
      { skillId: 'web-search', enabled: false },
      { skillId: 'pdf-analysis', enabled: true },
    ])
  })

  it('updates a skill it already stored rather than duplicating it', async () => {
    signedIn('batch-repeat')

    await post({ updates: [{ skillId: 'web-search', enabled: false }] })
    const res = await post({ updates: [{ skillId: 'web-search', enabled: true }] })

    expect((await res.json()).results).toEqual([{ skillId: 'web-search', enabled: true }])
  })

  it('reports a bad body as a 500', async () => {
    signedIn()

    const res = await POST_BATCH(
      new Request('http://localhost/api/user/enabled-skills/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{not json',
      }) as any,
    )

    expect(res.status).toBe(500)
  })
})
