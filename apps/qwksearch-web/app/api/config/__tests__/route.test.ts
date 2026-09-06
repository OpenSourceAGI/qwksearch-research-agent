import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data, opts = {}) => {
      const status = opts?.status || 200
      const response = new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
        ...opts,
      })
      return response
    },
  },
}))

// Mock heavy dependencies before importing the route
vi.mock('@/lib/config', () => ({
  default: {
    getCurrentConfig: vi.fn(),
    getUIConfigSections: vi.fn(),
    updateConfig: vi.fn(),
  },
}))

vi.mock('chat-agent-toolkit/models/registry', () => ({
  default: vi.fn().mockImplementation(() => ({
    getActiveProviders: vi.fn().mockResolvedValue([]),
  })),
}))

vi.mock('@/lib/config/env', () => ({
  getEnv: vi.fn(),
}))

// POST is admin-only; default to an authorized admin so the existing
// behavior tests exercise the handler body. The guard itself is covered in
// the dedicated tests below and in lib/auth/__tests__/admin.test.ts.
vi.mock('@/lib/auth/admin', () => ({
  assertAdmin: vi.fn(),
}))

import { assertAdmin } from '@/lib/auth/admin'
import configManager from '@/lib/config'
import { getEnv } from '@/lib/config/env'
import ModelRegistry from 'chat-agent-toolkit/models/registry'
import { GET, POST } from '../route'

const mockGetCurrentConfig = configManager.getCurrentConfig as ReturnType<typeof vi.fn>
const mockGetUIConfigSections = configManager.getUIConfigSections as ReturnType<typeof vi.fn>
const mockUpdateConfig = configManager.updateConfig as ReturnType<typeof vi.fn>
const mockGetEnv = getEnv as ReturnType<typeof vi.fn>
const mockModelRegistry = ModelRegistry as unknown as ReturnType<typeof vi.fn>

const baseConfig = () => ({
  modelProviders: [],
  search: { tavilyApiKey: '' },
})

beforeEach(() => {
  vi.clearAllMocks()
  mockGetCurrentConfig.mockReturnValue(baseConfig())
  mockGetUIConfigSections.mockReturnValue([])
  mockGetEnv.mockReturnValue(undefined)
  // restoreMocks (vitest config) wipes the factory implementation before each
  // test, so re-establish the default ModelRegistry behavior here.
  mockModelRegistry.mockImplementation(() => ({
    getActiveProviders: vi.fn().mockResolvedValue([]),
  }))
  // null = authorized; tests for the guard override this per-case.
  ;(assertAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(null)
})

function makeRequest(method = 'GET', body?: unknown) {
  return new Request('http://localhost/api/config', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as any
}

describe('GET /api/config', () => {
  it('returns values and fields from config manager', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('values')
    expect(data).toHaveProperty('fields')
  })

  it('merges active chat models into matching modelProvider entries', async () => {
    mockGetCurrentConfig.mockReturnValue({
      modelProviders: [{ id: 'openai', chatModels: [] }],
      search: { tavilyApiKey: '' },
    })
    mockModelRegistry.mockImplementation(() => ({
      getActiveProviders: vi.fn().mockResolvedValue([
        { id: 'openai', chatModels: [{ key: 'gpt-4o' }] },
      ]),
    }))

    const res = await GET(makeRequest())
    const data = await res.json()
    expect(data.values.modelProviders[0].chatModels).toEqual([{ key: 'gpt-4o' }])
  })

  it('strips the site-default Tavily key so users do not see it', async () => {
    mockGetEnv.mockReturnValue('site-secret-key')
    mockGetCurrentConfig.mockReturnValue({
      modelProviders: [],
      search: { tavilyApiKey: 'site-secret-key' },
    })

    const res = await GET(makeRequest())
    const data = await res.json()
    expect(data.values.search.tavilyApiKey).toBe('')
  })

  it('preserves a user-supplied Tavily key that differs from the env key', async () => {
    mockGetEnv.mockReturnValue('site-secret-key')
    mockGetCurrentConfig.mockReturnValue({
      modelProviders: [],
      search: { tavilyApiKey: 'user-own-key' },
    })

    const res = await GET(makeRequest())
    const data = await res.json()
    expect(data.values.search.tavilyApiKey).toBe('user-own-key')
  })

  it('returns 500 when config manager throws', async () => {
    mockGetCurrentConfig.mockImplementation(() => { throw new Error('db down') })
    const res = await GET(makeRequest())
    expect(res.status).toBe(500)
  })
})

describe('POST /api/config', () => {
  it('rejects non-admin callers without touching the config', async () => {
    ;(assertAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    )
    const res = await POST(makeRequest('POST', { key: 'theme', value: 'dark' }))
    expect(res.status).toBe(403)
    expect(mockUpdateConfig).not.toHaveBeenCalled()
  })

  it('calls updateConfig and returns 200', async () => {
    const res = await POST(makeRequest('POST', { key: 'theme', value: 'dark' }))
    expect(res.status).toBe(200)
    expect(mockUpdateConfig).toHaveBeenCalledWith('theme', 'dark')
    const data = await res.json()
    expect(data.message).toMatch(/success/i)
  })

  it('returns 400 when key is missing', async () => {
    const res = await POST(makeRequest('POST', { value: 'dark' }))
    expect(res.status).toBe(400)
    expect(mockUpdateConfig).not.toHaveBeenCalled()
  })

  it('returns 400 when value is missing', async () => {
    const res = await POST(makeRequest('POST', { key: 'theme' }))
    expect(res.status).toBe(400)
    expect(mockUpdateConfig).not.toHaveBeenCalled()
  })

  it('returns 400 when body is empty object', async () => {
    const res = await POST(makeRequest('POST', {}))
    expect(res.status).toBe(400)
  })

  it('returns 500 when updateConfig throws', async () => {
    mockUpdateConfig.mockImplementation(() => { throw new Error('write failed') })
    const res = await POST(makeRequest('POST', { key: 'theme', value: 'dark' }))
    expect(res.status).toBe(500)
  })
})
