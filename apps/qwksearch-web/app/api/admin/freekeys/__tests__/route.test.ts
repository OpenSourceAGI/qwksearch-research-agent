/**
 * @fileoverview Route tests for the admin free-key diagnostics endpoint.
 * It reports where each provider key is visible, masks the keys themselves,
 * lists the free models the database knows about, and live-tests them —
 * either one representative model per provider (summary mode) or every free
 * model for a named provider (`?testAll=`).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/auth/admin', () => ({ assertAdmin: vi.fn() }))
vi.mock('@/lib/auth/session', () => ({ getSession: vi.fn() }))
vi.mock('chat-agent-toolkit/config/environment-variables', () => ({ getEnv: vi.fn() }))
vi.mock('chat-agent-toolkit/models/registry', () => ({ default: vi.fn() }))
vi.mock('chat-agent-toolkit/config/language-models-database', () => ({
  LANGUAGE_MODELS: [
    {
      provider: 'NVIDIA',
      models: [
        { id: 'nv/free-a', name: 'Free A', free: true, type: 'text-generation', contextLength: 8000 },
        { id: 'nv/free-b', name: 'Free B', free: true, type: 'text', contextLength: 4000 },
        { id: 'nv/paid', name: 'Paid', free: false, type: 'text-generation', contextLength: 8000 },
        { id: 'nv/free-image', name: 'Image', free: true, type: 'image', contextLength: 0 },
      ],
    },
    {
      provider: 'OpenRouter',
      models: [
        { id: 'or/other', name: 'Other', free: true, type: 'text', contextLength: 1000 },
        {
          id: 'meta-llama/llama-3.3-70b-instruct:free',
          name: 'Llama 3.3',
          free: true,
          type: 'text-generation',
          contextLength: 128000,
        },
      ],
    },
    {
      provider: 'AnyAPI',
      models: [
        { id: 'any/other', name: 'Other', free: true, type: 'text', contextLength: 1000 },
        { id: 'deepseek/deepseek-v3:free', name: 'DeepSeek', free: true, type: 'text', contextLength: 64000 },
      ],
    },
  ],
}))

import { assertAdmin } from '@/lib/auth/admin'
import { getSession } from '@/lib/auth/session'
import { getEnv } from 'chat-agent-toolkit/config/environment-variables'
import ModelRegistry from 'chat-agent-toolkit/models/registry'
import { GET } from '../route'

const mockAssertAdmin = assertAdmin as unknown as ReturnType<typeof vi.fn>
const mockGetSession = getSession as unknown as ReturnType<typeof vi.fn>
const mockGetEnv = getEnv as unknown as ReturnType<typeof vi.fn>
const mockRegistry = ModelRegistry as unknown as ReturnType<typeof vi.fn>

const getActiveProviders = vi.fn()

/**
 * Stand the mocked registry up as a constructor — the route calls
 * `new ModelRegistry()`, which needs a `function` implementation.
 */
function stubRegistry() {
  mockRegistry.mockImplementation(function () {
    return { getActiveProviders }
  })
}

/** Serves the given env map to the route, and undefined for anything else. */
function env(values: Record<string, string | undefined>) {
  mockGetEnv.mockImplementation((key: string) => values[key])
}

/** The minimal NextRequest shape this route reads: a query string. */
function request(query = '') {
  const url = new URL(`http://localhost/api/admin/freekeys${query}`)
  return { url: url.toString(), nextUrl: url } as any
}

let fetchMock: ReturnType<typeof vi.fn>

/** A successful chat-completion response. */
const chatOk = () => new Response('{}', { status: 200 })
/** A `/models` listing response. */
const modelsListing = (ids: string[]) =>
  new Response(JSON.stringify({ data: ids.map((id) => ({ id })) }), { status: 200 })

beforeEach(() => {
  vi.clearAllMocks()
  stubRegistry()
  mockAssertAdmin.mockResolvedValue(null)
  mockGetSession.mockResolvedValue(null)
  getActiveProviders.mockResolvedValue([])
  env({})
  fetchMock = vi.fn().mockResolvedValue(chatOk())
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('GET /api/admin/freekeys authorization', () => {
  it('returns the guard response for a non-admin without doing any work', async () => {
    mockAssertAdmin.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    )

    const res = await GET(request())

    expect(res.status).toBe(403)
    expect(mockGetEnv).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('GET /api/admin/freekeys summary mode', () => {
  it('lists only the free text models for each provider', async () => {
    const body = await (await GET(request())).json()

    // The paid model and the image model are both filtered out.
    expect(body.nvidia.freeModelCount).toBe(2)
    expect(body.nvidia.freeModels.map((m: { id: string }) => m.id)).toEqual([
      'nv/free-a',
      'nv/free-b',
    ])
  })

  it('reports each free model with its name and context length', async () => {
    const body = await (await GET(request())).json()

    expect(body.nvidia.freeModels[0]).toEqual({
      id: 'nv/free-a',
      name: 'Free A',
      contextLength: 8000,
    })
  })

  it('reports a key as unconfigured and skips its live test when unset', async () => {
    const body = await (await GET(request())).json()

    expect(body.nvidia.keyConfigured).toBe(false)
    expect(body.nvidia.keyMasked).toBeNull()
    expect(body.nvidia.liveTest).toEqual({ skipped: true, reason: 'no API key' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('masks a long key to its first eight and last four characters', async () => {
    env({ NVIDIA_API_KEY: 'nvapi-abcdefghijklmnop' })

    const body = await (await GET(request())).json()

    expect(body.nvidia.keyConfigured).toBe(true)
    expect(body.nvidia.keyMasked).toBe('nvapi-ab...mnop')
    expect(body.nvidia.keyMasked).not.toContain('cdefghijkl')
  })

  it('masks a short key to its first four characters only', async () => {
    env({ NVIDIA_API_KEY: 'short-key' })

    const body = await (await GET(request())).json()

    expect(body.nvidia.keyMasked).toBe('shor...')
  })

  it('falls back to the documented base URLs when none are configured', async () => {
    const body = await (await GET(request())).json()

    expect(body.nvidia.baseUrl).toBe('https://integrate.api.nvidia.com/v1')
    expect(body.openrouter.baseUrl).toBe('https://openrouter.ai/api/v1')
    expect(body.anyapi.baseUrl).toBe('https://api.anyapi.ai/v1')
  })

  it('honours a configured base URL override', async () => {
    env({ NVIDIA_BASE_URL: 'https://nvidia.internal/v1' })

    const body = await (await GET(request())).json()

    expect(body.nvidia.baseUrl).toBe('https://nvidia.internal/v1')
  })

  it('live-tests the first free model when the key is set', async () => {
    env({ NVIDIA_API_KEY: 'nvapi-key' })

    const body = await (await GET(request())).json()

    expect(body.nvidia.liveTest).toMatchObject({ model: 'nv/free-a', ok: true, status: 200 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://integrate.api.nvidia.com/v1/chat/completions')
    expect(init.headers.Authorization).toBe('Bearer nvapi-key')
    expect(JSON.parse(init.body)).toMatchObject({ model: 'nv/free-a', max_tokens: 5, stream: false })
  })

  it('prefers the known-good Llama model for the OpenRouter probe', async () => {
    env({ OPENROUTER_API_KEY: 'or-key' })

    const body = await (await GET(request())).json()

    expect(body.openrouter.liveTest.model).toBe('meta-llama/llama-3.3-70b-instruct:free')
  })

  it('prefers the known-good DeepSeek model for the AnyAPI probe', async () => {
    env({ ANY_API_KEY: 'any-key' })

    const body = await (await GET(request())).json()

    expect(body.anyapi.liveTest.model).toBe('deepseek/deepseek-v3:free')
  })

  it('sends the OpenRouter attribution headers, and only to OpenRouter', async () => {
    env({ OPENROUTER_API_KEY: 'or-key', NVIDIA_API_KEY: 'nv-key' })

    await GET(request())

    const orCall = fetchMock.mock.calls.find(([url]) => String(url).includes('openrouter.ai'))
    const nvCall = fetchMock.mock.calls.find(([url]) => String(url).includes('nvidia.com'))
    expect(orCall?.[1].headers['X-Title']).toBe('QwkSearch')
    expect(nvCall?.[1].headers).not.toHaveProperty('X-Title')
  })

  it('reports a failed live test with its status and a truncated body', async () => {
    env({ NVIDIA_API_KEY: 'nvapi-key' })
    fetchMock.mockResolvedValue(new Response('x'.repeat(500), { status: 429 }))

    const body = await (await GET(request())).json()

    expect(body.nvidia.liveTest).toMatchObject({ ok: false, status: 429 })
    expect(body.nvidia.liveTest.error).toHaveLength(200)
  })

  it('reports a network failure as a not-ok live test carrying the message', async () => {
    env({ NVIDIA_API_KEY: 'nvapi-key' })
    fetchMock.mockRejectedValue(new Error('connection reset'))

    const body = await (await GET(request())).json()

    expect(body.nvidia.liveTest).toMatchObject({ ok: false, error: 'connection reset' })
  })

  it('reports which env sources a key is visible through', async () => {
    vi.stubEnv('NVIDIA_API_KEY', 'from-process-env')
    env({ NVIDIA_API_KEY: 'from-process-env' })

    const body = await (await GET(request())).json()

    expect(body.nvidia.key).toMatchObject({
      set: true,
      sources: { processEnv: true, cloudflareEnv: false },
    })
  })

  it('reports a key that no env source exposes as unset', async () => {
    const body = await (await GET(request())).json()

    expect(body.nvidia.key).toEqual({
      set: false,
      masked: null,
      sources: { cloudflareEnv: false, processEnv: false },
    })
  })

  it('reports the provider list guests actually receive', async () => {
    getActiveProviders.mockResolvedValue([
      { name: 'NVIDIA', type: 'nvidia', chatModels: [{ key: 'a' }, { key: 'b' }] },
    ])

    const body = await (await GET(request())).json()

    expect(body.guestProviders.providers).toEqual([
      { name: 'NVIDIA', type: 'nvidia', modelCount: 2 },
    ])
    expect(body.guestProviders.error).toBeNull()
  })

  it('reports a registry failure instead of failing the whole diagnostic', async () => {
    getActiveProviders.mockRejectedValue(new Error('registry unavailable'))

    const res = await GET(request())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.guestProviders.providers).toEqual([])
    expect(body.guestProviders.error).toBe('registry unavailable')
  })

  it('mirrors which providers will load for guests', async () => {
    env({ OPENROUTER_API_KEY: 'or-key' })

    const body = await (await GET(request())).json()

    expect(body.guestLogic).toMatchObject({
      openrouterKeySet: true,
      openrouterWillBeLoaded: true,
      nvidiaWillBeLoaded: false,
      anyapiWillBeLoaded: false,
    })
  })

  it('reports an anonymous request as signed out', async () => {
    const body = await (await GET(request())).json()

    expect(body.auth.session).toEqual({ signedIn: false })
  })

  it('reports the signed-in identity of the calling request', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1', email: 'ada@example.com' } })

    const body = await (await GET(request())).json()

    expect(body.auth.session).toEqual({
      signedIn: true,
      userId: 'user-1',
      email: 'ada@example.com',
    })
  })

  it('reports a session lookup failure without failing the diagnostic', async () => {
    mockGetSession.mockRejectedValue(new Error('cookie decode failed'))

    const body = await (await GET(request())).json()

    expect(body.auth.session).toEqual({ signedIn: false, error: 'cookie decode failed' })
  })

  it('warns that a missing BETTER_AUTH_SECRET invalidates sessions on restart', async () => {
    const body = await (await GET(request())).json()

    expect(body.auth.betterAuthSecretSet).toBe(false)
    expect(body.auth.note).toMatch(/BETTER_AUTH_SECRET is not set/)
  })

  it('confirms sessions survive restarts once the secret is set', async () => {
    env({ BETTER_AUTH_SECRET: 'a-secret', GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret' })

    const body = await (await GET(request())).json()

    expect(body.auth.betterAuthSecretSet).toBe(true)
    expect(body.auth.googleOAuthConfigured).toBe(true)
    expect(body.auth.note).toMatch(/will survive worker restarts/i)
  })

  it('never leaks a raw key into the response', async () => {
    env({
      NVIDIA_API_KEY: 'nvapi-supersecretvalue',
      OPENROUTER_API_KEY: 'or-supersecretvalue',
      ANY_API_KEY: 'any-supersecretvalue',
    })

    const raw = await (await GET(request())).text()

    expect(raw).not.toContain('nvapi-supersecretvalue')
    expect(raw).not.toContain('or-supersecretvalue')
    expect(raw).not.toContain('any-supersecretvalue')
  })
})

describe('GET /api/admin/freekeys?testAll', () => {
  it('tests only the named provider', async () => {
    env({ NVIDIA_API_KEY: 'nv-key', OPENROUTER_API_KEY: 'or-key' })

    const body = await (await GET(request('?testAll=nvidia'))).json()

    expect(Object.keys(body)).toEqual(['nvidia'])
  })

  it('tests every provider for testAll=all', async () => {
    const body = await (await GET(request('?testAll=all'))).json()

    expect(Object.keys(body).sort()).toEqual(['anyapi', 'nvidia', 'openrouter'])
  })

  it('reports a missing key instead of testing', async () => {
    const body = await (await GET(request('?testAll=nvidia'))).json()

    expect(body.nvidia).toEqual({ error: 'NVIDIA_API_KEY not set' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('live-tests every free model for the provider', async () => {
    env({ NVIDIA_API_KEY: 'nv-key' })
    fetchMock.mockImplementation(async (url: string) =>
      String(url).endsWith('/models') ? modelsListing(['nv/free-a', 'nv/free-b']) : chatOk(),
    )

    const body = await (await GET(request('?testAll=nvidia'))).json()

    expect(body.nvidia.upstreamModelsFetched).toBe(true)
    expect(body.nvidia.results).toHaveLength(2)
    expect(body.nvidia.results.every((r: { ok: boolean }) => r.ok)).toBe(true)
  })

  it('skips the live call for a model the provider no longer lists', async () => {
    env({ NVIDIA_API_KEY: 'nv-key' })
    fetchMock.mockImplementation(async (url: string) =>
      String(url).endsWith('/models') ? modelsListing(['nv/free-a']) : chatOk(),
    )

    const body = await (await GET(request('?testAll=nvidia'))).json()

    const dropped = body.nvidia.results.find((r: { model: string }) => r.model === 'nv/free-b')
    expect(dropped).toMatchObject({
      ok: false,
      existsUpstream: false,
      error: 'model not listed by provider /models endpoint',
      ms: 0,
    })
    // Only the listed model reached /chat/completions.
    const chatCalls = fetchMock.mock.calls.filter(([u]) => String(u).endsWith('/chat/completions'))
    expect(chatCalls).toHaveLength(1)
  })

  it('still tests every model when the upstream listing is unavailable', async () => {
    env({ NVIDIA_API_KEY: 'nv-key' })
    fetchMock.mockImplementation(async (url: string) =>
      String(url).endsWith('/models') ? new Response('nope', { status: 500 }) : chatOk(),
    )

    const body = await (await GET(request('?testAll=nvidia'))).json()

    expect(body.nvidia.upstreamModelsFetched).toBe(false)
    expect(body.nvidia.results).toHaveLength(2)
    expect(body.nvidia.results[0].existsUpstream).toBeUndefined()
  })

  it('treats an empty upstream listing as unavailable rather than as "no models exist"', async () => {
    env({ NVIDIA_API_KEY: 'nv-key' })
    fetchMock.mockImplementation(async (url: string) =>
      String(url).endsWith('/models') ? modelsListing([]) : chatOk(),
    )

    const body = await (await GET(request('?testAll=nvidia'))).json()

    expect(body.nvidia.upstreamModelsFetched).toBe(false)
    expect(body.nvidia.results.every((r: { ok: boolean }) => r.ok)).toBe(true)
  })

  it('records a per-model failure without aborting the run', async () => {
    env({ NVIDIA_API_KEY: 'nv-key' })
    fetchMock.mockImplementation(async (url: string, init: RequestInit = {}) => {
      if (String(url).endsWith('/models')) return modelsListing(['nv/free-a', 'nv/free-b'])
      return JSON.parse(String(init.body)).model === 'nv/free-a'
        ? new Response('rate limited', { status: 429 })
        : chatOk()
    })

    const body = await (await GET(request('?testAll=nvidia'))).json()

    const byModel = Object.fromEntries(
      body.nvidia.results.map((r: { model: string }) => [r.model, r]),
    )
    expect(byModel['nv/free-a']).toMatchObject({ ok: false, status: 429 })
    expect(byModel['nv/free-b']).toMatchObject({ ok: true })
  })

  it('ignores an unrecognised testAll value', async () => {
    env({ NVIDIA_API_KEY: 'nv-key' })

    const body = await (await GET(request('?testAll=bogus'))).json()

    expect(body).toEqual({})
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
