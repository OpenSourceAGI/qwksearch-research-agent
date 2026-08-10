/**
 * @fileoverview Route tests for the Google Drive integration endpoints:
 * OAuth URL generation, connection status, token read/refresh and file fetch.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const cookieStore = {
  get: vi.fn(),
  set: vi.fn(),
}

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => cookieStore) }))
vi.mock('@/lib/config/env', () => ({ getEnv: vi.fn() }))
vi.mock('@/lib/integrations/googleDocsService', () => ({
  GoogleDocsService: { getAuthUrl: vi.fn() },
}))
vi.mock('@/lib/integrations/googleTokenRefresh', () => ({
  refreshGoogleAccessToken: vi.fn(),
}))

import { getEnv } from '@/lib/config/env'
import { GoogleDocsService } from '@/lib/integrations/googleDocsService'
import { refreshGoogleAccessToken } from '@/lib/integrations/googleTokenRefresh'
import { GET as AUTH_URL } from '../auth/route'
import { GET as AUTH_STATUS } from '../auth/status/route'
import { GET as GET_TOKEN } from '../token/route'
import { POST as REFRESH_TOKEN } from '../refresh-token/route'
import { GET as GET_FILE } from '../files/route'

const mockGetEnv = getEnv as unknown as ReturnType<typeof vi.fn>
const mockGetAuthUrl = GoogleDocsService.getAuthUrl as unknown as ReturnType<typeof vi.fn>
const mockRefresh = refreshGoogleAccessToken as unknown as ReturnType<typeof vi.fn>

/** Points the cookie store at a fixed set of cookies. */
function withCookies(values: Record<string, string>) {
  cookieStore.get.mockImplementation((name: string) =>
    values[name] === undefined ? undefined : { value: values[name] },
  )
}

const bareRequest = () => new Request('http://localhost/api/doc/google-docs/auth') as any

function fileRequest(fileId?: string) {
  const url = new URL('http://localhost/api/doc/google-docs/files')
  if (fileId !== undefined) url.searchParams.set('fileId', fileId)
  return { nextUrl: url, url: url.toString() } as any
}

/** Response stub for the Drive REST calls. */
const driveResponse = (body: unknown, init: { ok?: boolean; status?: number } = {}) => ({
  ok: init.ok ?? true,
  status: init.status ?? 200,
  json: async () => body,
  text: async () => JSON.stringify(body),
  arrayBuffer: async () => new TextEncoder().encode(String(body)).buffer,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  withCookies({})
  mockGetEnv.mockImplementation((key: string) =>
    ({ GOOGLE_CLIENT_ID: 'client-id', GOOGLE_CLIENT_SECRET: 'client-secret' })[key],
  )
  mockGetAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?x=1')
})

describe('GET /api/doc/google-docs/auth', () => {
  it('returns the consent URL', async () => {
    const data = await (await AUTH_URL(bareRequest())).json()

    expect(data.success).toBe(true)
    expect(data.data.authUrl).toContain('accounts.google.com')
  })

  it('falls back to the hosted redirect URI', async () => {
    await AUTH_URL(bareRequest())

    expect(mockGetAuthUrl).toHaveBeenCalledWith(
      expect.objectContaining({ redirectUri: 'https://qwksearch.com/api/google-docs/callback' }),
    )
  })

  it('honours a configured redirect URI', async () => {
    mockGetEnv.mockImplementation(
      (key: string) =>
        ({
          GOOGLE_CLIENT_ID: 'client-id',
          GOOGLE_CLIENT_SECRET: 'client-secret',
          GOOGLE_REDIRECT_URI: 'https://self.test/cb',
        })[key],
    )

    await AUTH_URL(bareRequest())

    expect(mockGetAuthUrl).toHaveBeenCalledWith(
      expect.objectContaining({ redirectUri: 'https://self.test/cb' }),
    )
  })

  it('500s when the OAuth credentials are not configured', async () => {
    mockGetEnv.mockReturnValue(undefined)

    const res = await AUTH_URL(bareRequest())

    expect(res.status).toBe(500)
    expect((await res.json()).error).toMatch(/not configured/)
  })

  it('500s when URL generation throws', async () => {
    mockGetAuthUrl.mockImplementation(() => {
      throw new Error('bad config')
    })

    const res = await AUTH_URL(bareRequest())

    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('bad config')
  })
})

describe('GET /api/doc/google-docs/auth/status', () => {
  it('reports a disconnected account', async () => {
    const data = await (await AUTH_STATUS(bareRequest())).json()

    expect(data).toEqual({
      success: true,
      isConnected: false,
      hasAccessToken: false,
      hasRefreshToken: false,
    })
  })

  it('reports a connected account holding both tokens', async () => {
    withCookies({ google_access_token: 'at', google_refresh_token: 'rt' })

    const data = await (await AUTH_STATUS(bareRequest())).json()

    expect(data).toMatchObject({
      isConnected: true,
      hasAccessToken: true,
      hasRefreshToken: true,
    })
  })

  it('counts a refresh token alone as connected', async () => {
    withCookies({ google_refresh_token: 'rt' })

    const data = await (await AUTH_STATUS(bareRequest())).json()

    expect(data.isConnected).toBe(true)
    expect(data.hasAccessToken).toBe(false)
  })

  it('500s when the cookie store throws', async () => {
    cookieStore.get.mockImplementation(() => {
      throw new Error('no cookies')
    })

    const res = await AUTH_STATUS(bareRequest())

    expect(res.status).toBe(500)
    expect((await res.json()).isConnected).toBe(false)
  })
})

describe('GET /api/doc/google-docs/token', () => {
  it('401s with no stored access token', async () => {
    const res = await GET_TOKEN(bareRequest())

    expect(res.status).toBe(401)
    expect((await res.json()).error).toMatch(/Not authenticated/)
  })

  it('returns the stored access token', async () => {
    withCookies({ google_access_token: 'at' })

    const data = await (await GET_TOKEN(bareRequest())).json()

    expect(data).toEqual({ success: true, accessToken: 'at' })
  })

  it('500s when the cookie store throws', async () => {
    cookieStore.get.mockImplementation(() => {
      throw new Error('no cookies')
    })

    expect((await GET_TOKEN(bareRequest())).status).toBe(500)
  })
})

describe('POST /api/doc/google-docs/refresh-token', () => {
  it('401s with no refresh token', async () => {
    const res = await REFRESH_TOKEN(bareRequest())

    expect(res.status).toBe(401)
    expect((await res.json()).error).toMatch(/No refresh token available/)
  })

  it('stores the refreshed access token', async () => {
    withCookies({ google_refresh_token: 'rt' })
    mockRefresh.mockResolvedValue({ accessToken: 'new-at', expiresAt: 123 })

    const res = await REFRESH_TOKEN(bareRequest())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toMatchObject({ success: true, expiresAt: 123 })
    expect(cookieStore.set).toHaveBeenCalledWith(
      'google_access_token',
      'new-at',
      expect.objectContaining({ httpOnly: true }),
    )
  })

  it('stores a rotated refresh token', async () => {
    withCookies({ google_refresh_token: 'rt' })
    mockRefresh.mockResolvedValue({ accessToken: 'new-at', refreshToken: 'new-rt' })

    await REFRESH_TOKEN(bareRequest())

    expect(cookieStore.set).toHaveBeenCalledWith(
      'google_refresh_token',
      'new-rt',
      expect.anything(),
    )
  })

  it('leaves an unchanged refresh token alone', async () => {
    withCookies({ google_refresh_token: 'rt' })
    mockRefresh.mockResolvedValue({ accessToken: 'new-at', refreshToken: 'rt' })

    await REFRESH_TOKEN(bareRequest())

    const names = cookieStore.set.mock.calls.map((call) => call[0])
    expect(names).not.toContain('google_refresh_token')
  })

  it('401s and asks for re-auth when the refresh fails', async () => {
    withCookies({ google_refresh_token: 'rt' })
    mockRefresh.mockRejectedValue(new Error('invalid_grant'))

    const res = await REFRESH_TOKEN(bareRequest())
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.needsReauth).toBe(true)
    expect(data.error).toBe('invalid_grant')
  })
})

describe('GET /api/doc/google-docs/files', () => {
  it('requires a fileId', async () => {
    const res = await GET_FILE(fileRequest())

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/fileId parameter is required/)
  })

  it('401s with no access token', async () => {
    const res = await GET_FILE(fileRequest('f1'))

    expect(res.status).toBe(401)
    expect((await res.json()).error).toMatch(/Not authenticated/)
  })

  it('downloads a regular file and base64-encodes it', async () => {
    withCookies({ google_access_token: 'at' })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(driveResponse({ id: 'f1', name: 'a.txt', mimeType: 'text/plain' }))
      .mockResolvedValueOnce(driveResponse('file body'))
    vi.stubGlobal('fetch', fetchMock)

    const data = await (await GET_FILE(fileRequest('f1'))).json()

    expect(data.success).toBe(true)
    expect(data.file.name).toBe('a.txt')
    expect(Buffer.from(data.file.content, 'base64').toString()).toBe('file body')
    expect(fetchMock.mock.calls[1][0]).toContain('alt=media')
  })

  it('exports a Google Docs file as plain text', async () => {
    withCookies({ google_access_token: 'at' })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        driveResponse({ id: 'f1', name: 'Doc', mimeType: 'application/vnd.google-apps.document' }),
      )
      .mockResolvedValueOnce(driveResponse('exported'))
    vi.stubGlobal('fetch', fetchMock)

    await GET_FILE(fileRequest('f1'))

    expect(fetchMock.mock.calls[1][0]).toContain('export?mimeType=text%2Fplain')
  })

  it('exports a Google Sheets file as CSV', async () => {
    withCookies({ google_access_token: 'at' })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        driveResponse({
          id: 'f1',
          name: 'Sheet',
          mimeType: 'application/vnd.google-apps.spreadsheet',
        }),
      )
      .mockResolvedValueOnce(driveResponse('a,b'))
    vi.stubGlobal('fetch', fetchMock)

    await GET_FILE(fileRequest('f1'))

    expect(fetchMock.mock.calls[1][0]).toContain('export?mimeType=text%2Fcsv')
  })

  it('refreshes an expired token and stores the new one', async () => {
    withCookies({ google_access_token: 'stale', google_refresh_token: 'rt' })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(driveResponse({}, { ok: false, status: 401 }))
      .mockResolvedValueOnce(driveResponse({ access_token: 'fresh' }))
      .mockResolvedValueOnce(driveResponse({ id: 'f1', name: 'a.txt', mimeType: 'text/plain' }))
      .mockResolvedValueOnce(driveResponse('body'))
    vi.stubGlobal('fetch', fetchMock)

    const res = await GET_FILE(fileRequest('f1'))

    expect(res.status).toBe(200)
    expect(cookieStore.set).toHaveBeenCalledWith(
      'google_access_token',
      'fresh',
      expect.objectContaining({ httpOnly: true }),
    )
  })

  it('401s with needsReauth when the refresh itself fails', async () => {
    withCookies({ google_access_token: 'stale', google_refresh_token: 'rt' })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(driveResponse({}, { ok: false, status: 401 }))
      .mockResolvedValueOnce(driveResponse('invalid_grant', { ok: false, status: 400 }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await GET_FILE(fileRequest('f1'))
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.needsReauth).toBe(true)
  })

  it('404s when Drive reports the file is missing', async () => {
    withCookies({ google_access_token: 'at' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(driveResponse('File not found', { ok: false, status: 404 })),
    )

    const res = await GET_FILE(fileRequest('missing'))

    expect(res.status).toBe(404)
    expect((await res.json()).error).toMatch(/File not found or access denied/)
  })

  it('500s for any other Drive failure', async () => {
    withCookies({ google_access_token: 'at' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(driveResponse('server exploded', { ok: false, status: 500 })),
    )

    const res = await GET_FILE(fileRequest('f1'))

    expect(res.status).toBe(500)
  })
})
