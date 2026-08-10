/**
 * @fileoverview Route tests for the NotebookLM connection status, notebook
 * collection and notebook-sources endpoints.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/notebooklm/credentials', () => ({
  getCredentials: vi.fn(),
  deleteCredentials: vi.fn(),
}))
vi.mock('@/lib/notebooklm/login', () => ({ validateSession: vi.fn() }))
vi.mock('@/lib/notebooklm/client', () => ({ createNotebookLMClient: vi.fn() }))

import { getSession } from '@/lib/auth/session'
import { getCredentials, deleteCredentials } from '@/lib/notebooklm/credentials'
import { createNotebookLMClient } from '@/lib/notebooklm/client'
import { jsonRequest, routeContext } from '../../__tests__/helpers/fake-db'
import { GET as STATUS, DELETE as DISCONNECT } from '../status/route'
import { GET as LIST_NOTEBOOKS, POST as CREATE_NOTEBOOK } from '../notebooks/route'
import { GET as LIST_SOURCES, POST as ADD_SOURCE } from '../notebooks/[id]/sources/route'

const mockGetSession = getSession as unknown as ReturnType<typeof vi.fn>
const mockGetCredentials = getCredentials as unknown as ReturnType<typeof vi.fn>
const mockDeleteCredentials = deleteCredentials as unknown as ReturnType<typeof vi.fn>
const mockCreateClient = createNotebookLMClient as unknown as ReturnType<typeof vi.fn>

const client = {
  listNotebooks: vi.fn(),
  createNotebook: vi.fn(),
  listSources: vi.fn(),
  addSource: vi.fn(),
}

const CREDS = {
  googleEmail: 'a@example.com',
  createdAt: '2024-01-01T00:00:00.000Z',
  expiresAt: '2024-02-01T00:00:00.000Z',
}

const signedIn = () => mockGetSession.mockResolvedValue({ user: { id: 'user-1' } })
const signedOut = () => mockGetSession.mockResolvedValue(null)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockCreateClient.mockReturnValue(client)
  mockGetCredentials.mockResolvedValue(CREDS)
  mockDeleteCredentials.mockResolvedValue(undefined)
  client.listNotebooks.mockResolvedValue([])
  client.createNotebook.mockResolvedValue({ id: 'nb-1', title: 'New' })
  client.listSources.mockResolvedValue([])
  client.addSource.mockResolvedValue({ id: 'src-1' })
})

describe('GET /api/notebooklm/status', () => {
  it('401s without a session', async () => {
    signedOut()

    const res = await STATUS()

    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('Unauthorized')
  })

  it('reports a disconnected account', async () => {
    signedIn()
    mockGetCredentials.mockResolvedValue(null)

    const data = await (await STATUS()).json()

    expect(data.connected).toBe(false)
    expect(data.message).toMatch(/No NotebookLM credentials/)
  })

  it('reports a connected account with its metadata', async () => {
    signedIn()

    const data = await (await STATUS()).json()

    expect(data).toEqual({ connected: true, ...CREDS })
  })

  it('reports a credential lookup failure as a 500', async () => {
    signedIn()
    mockGetCredentials.mockRejectedValue(new Error('kv down'))

    const res = await STATUS()

    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('kv down')
  })
})

describe('DELETE /api/notebooklm/status', () => {
  it('401s without a session', async () => {
    signedOut()

    expect((await DISCONNECT()).status).toBe(401)
  })

  it('removes the stored credentials', async () => {
    signedIn()

    const res = await DISCONNECT()

    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(mockDeleteCredentials).toHaveBeenCalledWith('user-1')
  })

  it('reports a delete failure as a 500', async () => {
    signedIn()
    mockDeleteCredentials.mockRejectedValue(new Error('kv down'))

    const res = await DISCONNECT()

    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('kv down')
  })
})

describe('GET /api/notebooklm/notebooks', () => {
  it('401s without a session', async () => {
    signedOut()

    expect((await LIST_NOTEBOOKS()).status).toBe(401)
  })

  it('403s when the account is not connected', async () => {
    signedIn()
    mockGetCredentials.mockResolvedValue(null)

    const res = await LIST_NOTEBOOKS()

    expect(res.status).toBe(403)
    expect((await res.json()).error).toMatch(/not connected/)
  })

  it('returns the notebooks', async () => {
    signedIn()
    client.listNotebooks.mockResolvedValue([{ id: 'nb-1' }])

    const data = await (await LIST_NOTEBOOKS()).json()

    expect(data.notebooks).toEqual([{ id: 'nb-1' }])
    expect(mockCreateClient).toHaveBeenCalledWith(CREDS)
  })

  it('reports a client failure as a 500', async () => {
    signedIn()
    client.listNotebooks.mockRejectedValue(new Error('upstream 500'))

    const res = await LIST_NOTEBOOKS()

    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('upstream 500')
  })
})

describe('POST /api/notebooklm/notebooks', () => {
  const post = (body: unknown) =>
    CREATE_NOTEBOOK(jsonRequest('http://localhost/api/notebooklm/notebooks', 'POST', body))

  it('401s without a session', async () => {
    signedOut()

    expect((await post({ title: 'New' })).status).toBe(401)
  })

  it('403s when the account is not connected', async () => {
    signedIn()
    mockGetCredentials.mockResolvedValue(null)

    expect((await post({ title: 'New' })).status).toBe(403)
  })

  it('requires a title', async () => {
    signedIn()

    const res = await post({})

    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('title is required')
  })

  it('treats an unparseable body as a missing title', async () => {
    signedIn()

    const res = await CREATE_NOTEBOOK(
      new Request('http://localhost/api/notebooklm/notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{not json',
      }) as any,
    )

    expect(res.status).toBe(400)
  })

  it('creates the notebook and returns 201', async () => {
    signedIn()

    const res = await post({ title: 'New' })

    expect(res.status).toBe(201)
    expect((await res.json()).notebook).toEqual({ id: 'nb-1', title: 'New' })
    expect(client.createNotebook).toHaveBeenCalledWith('New')
  })

  it('reports a client failure as a 500', async () => {
    signedIn()
    client.createNotebook.mockRejectedValue(new Error('quota'))

    expect((await post({ title: 'New' })).status).toBe(500)
  })
})

describe('GET /api/notebooklm/notebooks/[id]/sources', () => {
  const request = new Request('http://localhost/api/notebooklm/notebooks/nb-1/sources') as any

  it('401s without a session', async () => {
    signedOut()

    expect((await LIST_SOURCES(request, routeContext({ id: 'nb-1' }))).status).toBe(401)
  })

  it('403s when the account is not connected', async () => {
    signedIn()
    mockGetCredentials.mockResolvedValue(null)

    expect((await LIST_SOURCES(request, routeContext({ id: 'nb-1' }))).status).toBe(403)
  })

  it('returns the sources for the notebook', async () => {
    signedIn()
    client.listSources.mockResolvedValue([{ id: 'src-1' }])

    const data = await (await LIST_SOURCES(request, routeContext({ id: 'nb-1' }))).json()

    expect(data.sources).toEqual([{ id: 'src-1' }])
    expect(client.listSources).toHaveBeenCalledWith('nb-1')
  })

  it('reports a client failure as a 500', async () => {
    signedIn()
    client.listSources.mockRejectedValue(new Error('upstream'))

    expect((await LIST_SOURCES(request, routeContext({ id: 'nb-1' }))).status).toBe(500)
  })
})

describe('POST /api/notebooklm/notebooks/[id]/sources', () => {
  const post = (body: unknown) =>
    ADD_SOURCE(
      jsonRequest('http://localhost/api/notebooklm/notebooks/nb-1/sources', 'POST', body),
      routeContext({ id: 'nb-1' }),
    )

  it('401s without a session', async () => {
    signedOut()

    expect((await post({ url: 'https://a.test' })).status).toBe(401)
  })

  it('403s when the account is not connected', async () => {
    signedIn()
    mockGetCredentials.mockResolvedValue(null)

    expect((await post({ url: 'https://a.test' })).status).toBe(403)
  })

  it('requires a url or text', async () => {
    signedIn()

    const res = await post({ title: 'Only a title' })

    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('url or text is required')
  })

  it('adds a URL source', async () => {
    signedIn()

    const res = await post({ url: 'https://a.test', title: 'A source' })

    expect(res.status).toBe(201)
    expect(client.addSource).toHaveBeenCalledWith('nb-1', {
      url: 'https://a.test',
      text: undefined,
      title: 'A source',
    })
  })

  it('adds a text source', async () => {
    signedIn()

    await post({ text: 'raw notes' })

    expect(client.addSource).toHaveBeenCalledWith('nb-1', {
      url: undefined,
      text: 'raw notes',
      title: undefined,
    })
  })

  it('reports a client failure as a 500', async () => {
    signedIn()
    client.addSource.mockRejectedValue(new Error('rejected'))

    expect((await post({ url: 'https://a.test' })).status).toBe(500)
  })
})
