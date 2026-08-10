/**
 * @fileoverview Route tests for the user-memories endpoints.
 *
 * Each memories route file keeps its own module-level `memoriesStore` Map, so
 * a memory created through the collection endpoint is not visible to the
 * per-id endpoints. The tests below exercise each module against its own
 * store and pin that isolation explicitly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/database', () => ({ getDB: vi.fn() }))

import { getSession } from '@/lib/auth/session'
import { jsonRequest } from '../../../__tests__/helpers/fake-db'
import { GET, POST } from '../route'
import { GET as GET_ONE, PUT, DELETE } from '../[id]/route'
import { POST as RECORD_USAGE } from '../[id]/usage/route'

const mockGetSession = getSession as unknown as ReturnType<typeof vi.fn>

const signedIn = (id = 'user-1') => mockGetSession.mockResolvedValue({ user: { id } })
const signedOut = () => mockGetSession.mockResolvedValue(null)

const listRequest = (search = '') =>
  new Request(`http://localhost/api/user/memories${search}`) as any

const idContext = (id: string) => ({ params: { id } }) as any

const memory = (overrides: Record<string, unknown> = {}) => ({
  name: 'Preferred editor',
  type: 'user',
  content: 'Uses vim keybindings',
  ...overrides,
})

/** Creates memories through the collection endpoint for the given user. */
async function seed(user: string, ...bodies: Record<string, unknown>[]) {
  signedIn(user)
  for (const body of bodies) {
    await POST(jsonRequest('http://localhost/api/user/memories', 'POST', body))
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/user/memories', () => {
  it('401s without a session', async () => {
    signedOut()

    const res = await POST(jsonRequest('http://localhost/api/user/memories', 'POST', memory()))

    expect(res.status).toBe(401)
    expect((await res.json()).message).toBe('Unauthorized')
  })

  it('requires name, type and content', async () => {
    signedIn()

    for (const invalid of [
      { type: 'user', content: 'c' },
      { name: 'n', content: 'c' },
      { name: 'n', type: 'user' },
    ]) {
      const res = await POST(jsonRequest('http://localhost/api/user/memories', 'POST', invalid))

      expect(res.status).toBe(400)
      expect((await res.json()).message).toMatch(/Missing required fields/)
    }
  })

  it('rejects an unknown memory type', async () => {
    signedIn()

    const res = await POST(
      jsonRequest('http://localhost/api/user/memories', 'POST', memory({ type: 'nonsense' })),
    )

    expect(res.status).toBe(400)
    expect((await res.json()).message).toBe('Invalid memory type')
  })

  it('accepts every documented memory type', async () => {
    signedIn('types-user')

    for (const type of ['user', 'feedback', 'project', 'reference', 'conversation']) {
      const res = await POST(
        jsonRequest('http://localhost/api/user/memories', 'POST', memory({ type })),
      )

      expect(res.status).toBe(201)
    }
  })

  it('returns the new id with 201', async () => {
    signedIn('create-user')

    const res = await POST(jsonRequest('http://localhost/api/user/memories', 'POST', memory()))
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.id).toMatch(/^mem_/)
    expect(data.message).toMatch(/created successfully/)
  })

  it('reports a bad body as a 500', async () => {
    signedIn()

    const res = await POST(
      new Request('http://localhost/api/user/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{not json',
      }) as any,
    )

    expect(res.status).toBe(500)
  })
})

describe('GET /api/user/memories', () => {
  it('401s without a session', async () => {
    signedOut()

    expect((await GET(listRequest())).status).toBe(401)
  })

  it('returns an empty list for a user with no memories', async () => {
    signedIn('empty-user')

    expect(await (await GET(listRequest())).json()).toEqual([])
  })

  it('returns the memories it stored, defaulting the optional fields', async () => {
    await seed('list-user', memory())
    signedIn('list-user')

    const [stored] = await (await GET(listRequest())).json()

    expect(stored).toMatchObject({
      userId: 'list-user',
      name: 'Preferred editor',
      description: '',
      importance: 5,
      accessCount: 0,
      tags: [],
      metadata: {},
    })
  })

  it('clamps importance into 1..10', async () => {
    await seed(
      'clamp-user',
      memory({ name: 'low', importance: -4 }),
      memory({ name: 'high', importance: 99 }),
    )
    signedIn('clamp-user')

    const stored = await (await GET(listRequest())).json()
    const byName = Object.fromEntries(stored.map((m: any) => [m.name, m.importance]))

    expect(byName.low).toBe(1)
    expect(byName.high).toBe(10)
  })

  it('filters by type', async () => {
    await seed(
      'type-user',
      memory({ name: 'a', type: 'user' }),
      memory({ name: 'b', type: 'project' }),
    )
    signedIn('type-user')

    const stored = await (await GET(listRequest('?type=project'))).json()

    expect(stored.map((m: any) => m.name)).toEqual(['b'])
  })

  it('filters by minimum importance', async () => {
    await seed(
      'importance-user',
      memory({ name: 'low', importance: 2 }),
      memory({ name: 'high', importance: 9 }),
    )
    signedIn('importance-user')

    const stored = await (await GET(listRequest('?importance=5'))).json()

    expect(stored.map((m: any) => m.name)).toEqual(['high'])
  })

  it('searches name, description, content and tags case-insensitively', async () => {
    await seed(
      'search-user',
      memory({ name: 'Vim setup', content: 'x' }),
      memory({ name: 'b', content: 'x', description: 'About EMACS' }),
      memory({ name: 'c', content: 'nano notes' }),
      memory({ name: 'd', content: 'x', tags: ['helix'] }),
      memory({ name: 'e', content: 'unrelated' }),
    )
    signedIn('search-user')

    const names = async (q: string) =>
      (await (await GET(listRequest(`?search=${q}`))).json()).map((m: any) => m.name)

    expect(await names('vim')).toEqual(['Vim setup'])
    expect(await names('emacs')).toEqual(['b'])
    expect(await names('NANO')).toEqual(['c'])
    expect(await names('helix')).toEqual(['d'])
    expect(await names('nothing-matches')).toEqual([])
  })

  it('sorts by importance, highest first', async () => {
    await seed(
      'sort-user',
      memory({ name: 'mid', importance: 5 }),
      memory({ name: 'top', importance: 10 }),
      memory({ name: 'low', importance: 1 }),
    )
    signedIn('sort-user')

    const stored = await (await GET(listRequest())).json()

    expect(stored.map((m: any) => m.name)).toEqual(['top', 'mid', 'low'])
  })

  it('honours the limit parameter', async () => {
    await seed('limit-user', memory({ name: 'a' }), memory({ name: 'b' }), memory({ name: 'c' }))
    signedIn('limit-user')

    expect(await (await GET(listRequest('?limit=2'))).json()).toHaveLength(2)
  })

  it('keeps each user memories separate', async () => {
    await seed('alice', memory({ name: 'alice-note' }))
    await seed('bob', memory({ name: 'bob-note' }))

    signedIn('alice')
    const forAlice = await (await GET(listRequest())).json()

    expect(forAlice.map((m: any) => m.name)).toEqual(['alice-note'])
  })

  it('reports a session failure as a 500', async () => {
    mockGetSession.mockRejectedValue(new Error('auth down'))

    expect((await GET(listRequest())).status).toBe(500)
  })
})

describe('GET /api/user/memories/[id]', () => {
  it('401s without a session', async () => {
    signedOut()

    expect((await GET_ONE(listRequest(), idContext('mem_1'))).status).toBe(401)
  })

  it('404s because the per-id route keeps its own empty store', async () => {
    // Documents the split-store behaviour: this memory exists in the
    // collection route module, but not in this one.
    await seed('split-user', memory())
    signedIn('split-user')

    const res = await GET_ONE(listRequest(), idContext('mem_anything'))

    expect(res.status).toBe(404)
    expect((await res.json()).message).toBe('Memory not found')
  })

  it('reports a session failure as a 500', async () => {
    mockGetSession.mockRejectedValue(new Error('auth down'))

    expect((await GET_ONE(listRequest(), idContext('mem_1'))).status).toBe(500)
  })
})

describe('PUT /api/user/memories/[id]', () => {
  it('401s without a session', async () => {
    signedOut()

    const res = await PUT(
      jsonRequest('http://localhost/api/user/memories/mem_1', 'PUT', { name: 'x' }),
      idContext('mem_1'),
    )

    expect(res.status).toBe(401)
  })

  it('404s for an id this module has never stored', async () => {
    signedIn()

    const res = await PUT(
      jsonRequest('http://localhost/api/user/memories/mem_1', 'PUT', { name: 'x' }),
      idContext('mem_1'),
    )

    expect(res.status).toBe(404)
  })

  it('reports a bad body as a 500', async () => {
    signedIn()

    const res = await PUT(
      new Request('http://localhost/api/user/memories/mem_1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: '{not json',
      }) as any,
      idContext('mem_1'),
    )

    expect(res.status).toBe(500)
  })
})

describe('DELETE /api/user/memories/[id]', () => {
  it('401s without a session', async () => {
    signedOut()

    expect(
      (await DELETE(jsonRequest('http://localhost/api/user/memories/mem_1', 'DELETE'), idContext('mem_1')))
        .status,
    ).toBe(401)
  })

  it('404s for an id this module has never stored', async () => {
    signedIn()

    const res = await DELETE(
      jsonRequest('http://localhost/api/user/memories/mem_1', 'DELETE'),
      idContext('mem_1'),
    )

    expect(res.status).toBe(404)
    expect((await res.json()).message).toBe('Memory not found')
  })

  it('reports a session failure as a 500', async () => {
    mockGetSession.mockRejectedValue(new Error('auth down'))

    expect(
      (await DELETE(jsonRequest('http://localhost/api/user/memories/mem_1', 'DELETE'), idContext('mem_1')))
        .status,
    ).toBe(500)
  })
})

describe('POST /api/user/memories/[id]/usage', () => {
  it('401s without a session', async () => {
    signedOut()

    expect(
      (await RECORD_USAGE(jsonRequest('http://localhost/api/user/memories/mem_1/usage', 'POST'), idContext('mem_1')))
        .status,
    ).toBe(401)
  })

  it('404s for an id this module has never stored', async () => {
    signedIn()

    const res = await RECORD_USAGE(
      jsonRequest('http://localhost/api/user/memories/mem_1/usage', 'POST'),
      idContext('mem_1'),
    )

    expect(res.status).toBe(404)
    expect((await res.json()).message).toBe('Memory not found')
  })

  it('reports a session failure as a 500', async () => {
    mockGetSession.mockRejectedValue(new Error('auth down'))

    const res = await RECORD_USAGE(
      jsonRequest('http://localhost/api/user/memories/mem_1/usage', 'POST'),
      idContext('mem_1'),
    )

    expect(res.status).toBe(500)
  })
})
