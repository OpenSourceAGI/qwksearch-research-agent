import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  generateSpeechFromText,
  createAudioURL,
  speakText,
  checkSTTAPI,
} from '../speech-api'

let fetchMock: ReturnType<typeof vi.fn>

function audioResponse() {
  return {
    ok: true,
    statusText: 'OK',
    headers: { get: () => 'audio/wav' },
    arrayBuffer: async () => new ArrayBuffer(16),
  }
}

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('generateSpeechFromText', () => {
  it('POSTs the text and returns an audio blob', async () => {
    fetchMock.mockResolvedValue(audioResponse())
    const blob = await generateSpeechFromText('hello', 'kokoro', 'angus')
    expect(blob).toBeInstanceOf(Blob)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/speech/tts')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ text: 'hello', provider: 'kokoro', voice: 'angus' })
  })

  it('defaults the provider to kokoro', async () => {
    fetchMock.mockResolvedValue(audioResponse())
    await generateSpeechFromText('hi')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).provider).toBe('kokoro')
  })

  it('throws the API error message on a non-OK response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      statusText: 'Bad Request',
      json: async () => ({ error: 'no voice' }),
    })
    await expect(generateSpeechFromText('x')).rejects.toThrow('no voice')
  })

  it('falls back to statusText when no error field is returned', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      statusText: 'Server Error',
      json: async () => ({}),
    })
    await expect(generateSpeechFromText('x')).rejects.toThrow('TTS failed: Server Error')
  })
})

describe('createAudioURL', () => {
  it('creates an object URL from the generated blob', async () => {
    fetchMock.mockResolvedValue(audioResponse())
    const createObjectURL = vi.fn(() => 'blob:mock-url')
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() })
    const url = await createAudioURL('hi')
    expect(url).toBe('blob:mock-url')
    expect(createObjectURL).toHaveBeenCalled()
  })
})

describe('speakText', () => {
  it('resolves when the audio finishes playing', async () => {
    fetchMock.mockResolvedValue(audioResponse())
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL })

    const listeners: Record<string, () => void> = {}
    const audioInstance = {
      addEventListener: (event: string, cb: () => void) => {
        listeners[event] = cb
      },
      play: vi.fn().mockResolvedValue(undefined),
    }
    vi.stubGlobal('Audio', vi.fn(() => audioInstance))

    const promise = speakText('hello')
    // Wait for play() to be invoked, then simulate the "ended" event.
    await vi.waitFor(() => expect(audioInstance.play).toHaveBeenCalled())
    listeners['ended']()
    await expect(promise).resolves.toBeUndefined()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:x')
  })

  it('rejects when playback errors', async () => {
    fetchMock.mockResolvedValue(audioResponse())
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:y', revokeObjectURL: vi.fn() })

    const listeners: Record<string, () => void> = {}
    const audioInstance = {
      addEventListener: (event: string, cb: () => void) => {
        listeners[event] = cb
      },
      play: vi.fn().mockResolvedValue(undefined),
    }
    vi.stubGlobal('Audio', vi.fn(() => audioInstance))

    const promise = speakText('hello')
    await vi.waitFor(() => expect(audioInstance.play).toHaveBeenCalled())
    listeners['error']()
    await expect(promise).rejects.toThrow('Audio playback failed')
  })
})

describe('checkSTTAPI', () => {
  it('returns true when the STT endpoint is reachable', async () => {
    fetchMock.mockResolvedValue({ ok: true })
    expect(await checkSTTAPI()).toBe(true)
  })

  it('returns false on a non-OK response', async () => {
    fetchMock.mockResolvedValue({ ok: false })
    expect(await checkSTTAPI()).toBe(false)
  })

  it('returns false when the request throws', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    expect(await checkSTTAPI()).toBe(false)
  })
})
