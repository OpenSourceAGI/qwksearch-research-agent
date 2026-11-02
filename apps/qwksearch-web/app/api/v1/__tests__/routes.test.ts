/**
 * The OpenAI-compatible speech-to-text routes Kilo calls with
 * `https://qwksearch.com/api/v1` as its base URL. These cases cover the app's
 * half: the routes exist where Kilo looks for them, demand a QwkSearch API key
 * as a Bearer token (never a browser session), and reach Workers AI through
 * the same binding `/api/agent/transcript` uses. The adapter's request
 * validation is covered in research-agent-ui's openaiTranscription.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const validateApiKey = vi.fn()
const run = vi.fn(async () => ({ text: 'hello from whisper' }))

vi.mock('@/lib/auth/api-key', () => ({ validateApiKey: (key: string) => validateApiKey(key) }))
vi.mock('@/lib/cloudflare/context', () => ({ getCloudflareContext: () => ({ env: { AI: { run } } }) }))
vi.mock('@/lib/cors', () => ({
  withCors: (handler: (req?: Request) => Promise<Response>) => handler,
  corsPreflight: () => new Response(null, { status: 204 }),
}))

beforeEach(() => {
  validateApiKey.mockReset()
  run.mockClear()
  validateApiKey.mockImplementation(async (key: string) =>
    key === 'qwk_good' ? { valid: true, user: { id: 'user-1' } } : { valid: false, reason: 'invalid_key' },
  )
})

function transcription(headers: Record<string, string>) {
  const form = new FormData()
  form.append('file', new File([new Uint8Array([1, 2, 3])], 'test.wav', { type: 'audio/wav' }))
  form.append('model', 'turbo')
  form.append('response_format', 'json')
  return new Request('https://qwksearch.com/api/v1/audio/transcriptions', { method: 'POST', body: form, headers })
}

describe('GET /api/v1/models', () => {
  it('lists the tiers for a valid Bearer key', async () => {
    const { GET } = await import('../models/route')
    const res = await GET(new Request('https://qwksearch.com/api/v1/models', { headers: { authorization: 'Bearer qwk_good' } }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.object).toBe('list')
    expect(body.data.map((m: { id: string }) => m.id)).toEqual(['small', 'fast', 'medium', 'turbo', 'large'])
    expect(validateApiKey).toHaveBeenCalledWith('qwk_good')
  })

  it('answers 401 with no key at all', async () => {
    const { GET } = await import('../models/route')
    const res = await GET(new Request('https://qwksearch.com/api/v1/models'))

    expect(res.status).toBe(401)
    expect(validateApiKey).not.toHaveBeenCalled()
  })

  it('answers 401 for a key that does not validate', async () => {
    const { GET } = await import('../models/route')
    const res = await GET(new Request('https://qwksearch.com/api/v1/models', { headers: { authorization: 'Bearer nope' } }))

    expect(res.status).toBe(401)
  })

  it('ignores a key in the query string, which ends up in logs', async () => {
    const { GET } = await import('../models/route')
    const res = await GET(new Request('https://qwksearch.com/api/v1/models?api_key=qwk_good'))

    expect(res.status).toBe(401)
  })

  it('answers 503, not 401, when the key store is down', async () => {
    validateApiKey.mockResolvedValueOnce({ valid: false, reason: 'db_error' })
    const { GET } = await import('../models/route')
    const res = await GET(new Request('https://qwksearch.com/api/v1/models', { headers: { authorization: 'Bearer qwk_good' } }))

    expect(res.status).toBe(503)
  })
})

describe('POST /api/v1/audio/transcriptions', () => {
  it('transcribes with a valid Bearer key and answers { text }', async () => {
    const { POST } = await import('../audio/transcriptions/route')
    const res = await POST(transcription({ authorization: 'Bearer qwk_good' }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ text: 'hello from whisper' })
    expect(run).toHaveBeenCalledWith('@cf/openai/whisper-large-v3-turbo', { audio: [1, 2, 3] })
  })

  it('refuses a request without a key before running Whisper', async () => {
    const { POST } = await import('../audio/transcriptions/route')
    const res = await POST(transcription({}))

    expect(res.status).toBe(401)
    expect(run).not.toHaveBeenCalled()
  })
})
