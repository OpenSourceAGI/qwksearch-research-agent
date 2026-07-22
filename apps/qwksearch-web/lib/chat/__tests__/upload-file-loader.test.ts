import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const registerUploadFileLoader = vi.fn()
const getExtractedUpload = vi.fn()

vi.mock('chat-agent-toolkit', () => ({
  registerUploadFileLoader: (...args: any[]) => registerUploadFileLoader(...args),
}))
vi.mock('@/lib/uploads', () => ({
  getExtractedUpload: (...args: any[]) => getExtractedUpload(...args),
}))

beforeEach(() => {
  registerUploadFileLoader.mockReset()
  getExtractedUpload.mockReset()
  vi.resetModules()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('ensureUploadFileLoaderRegistered', () => {
  it('registers the loader exactly once across multiple calls', async () => {
    const { ensureUploadFileLoaderRegistered } = await import('../upload-file-loader')
    ensureUploadFileLoaderRegistered()
    ensureUploadFileLoaderRegistered()
    ensureUploadFileLoaderRegistered()
    expect(registerUploadFileLoader).toHaveBeenCalledTimes(1)
  })

  it('registers a loader that maps extracted uploads to title/content', async () => {
    const { ensureUploadFileLoaderRegistered } = await import('../upload-file-loader')
    ensureUploadFileLoaderRegistered()
    const loader = registerUploadFileLoader.mock.calls[0][0]

    getExtractedUpload.mockResolvedValue({
      title: 'Doc',
      content: 'body',
      extra: 'ignored',
    })
    const result = await loader('file-1')
    expect(result).toEqual({ title: 'Doc', content: 'body' })
    expect(getExtractedUpload).toHaveBeenCalledWith('file-1')
  })

  it('registers a loader that returns null when no upload is found', async () => {
    const { ensureUploadFileLoaderRegistered } = await import('../upload-file-loader')
    ensureUploadFileLoaderRegistered()
    const loader = registerUploadFileLoader.mock.calls[0][0]

    getExtractedUpload.mockResolvedValue(null)
    expect(await loader('missing')).toBeNull()
  })
})
