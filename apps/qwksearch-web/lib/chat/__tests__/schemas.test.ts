import { describe, expect, it, vi } from 'vitest'

// chat-agent-toolkit/models/types only exports a TypeScript type — mock the
// module so the test runner does not need the workspace package built.
vi.mock('chat-agent-toolkit/models/types', () => ({}))

import {
  safeValidateBody,
  messageSchema,
  chatModelSchema,
  resolveMessageContent,
  DEFAULT_UPLOAD_ANALYSIS_PROMPT,
} from '../schemas'

const validBody = {
  message: { messageId: 'msg-1', chatId: 'chat-1', content: 'Hello' },
  optimizationMode: 'speed' as const,
  focusMode: 'webSearch',
  chatModel: { providerId: 'openai', key: 'gpt-4o' },
}

describe('messageSchema', () => {
  it('parses a valid message', () => {
    const result = messageSchema.safeParse({
      messageId: 'm1',
      chatId: 'c1',
      content: 'hi',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty messageId', () => {
    const result = messageSchema.safeParse({
      messageId: '',
      chatId: 'c1',
      content: 'hi',
    })
    expect(result.success).toBe(false)
  })

  it('defaults missing content to an empty string (files may carry the request)', () => {
    const result = messageSchema.safeParse({ messageId: 'm1', chatId: 'c1' })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.content).toBe('')
  })

  it('accepts empty content (validated against files at the body level)', () => {
    const result = messageSchema.safeParse({
      messageId: 'm1',
      chatId: 'c1',
      content: '',
    })
    expect(result.success).toBe(true)
  })
})

describe('chatModelSchema', () => {
  it('parses a valid model', () => {
    const result = chatModelSchema.safeParse({ providerId: 'openai', key: 'gpt-4o' })
    expect(result.success).toBe(true)
  })

  it('rejects missing providerId', () => {
    const result = chatModelSchema.safeParse({ key: 'gpt-4o' })
    expect(result.success).toBe(false)
  })

  it('rejects missing key', () => {
    const result = chatModelSchema.safeParse({ providerId: 'openai' })
    expect(result.success).toBe(false)
  })
})

describe('safeValidateBody', () => {
  it('accepts a minimal valid body with correct defaults', () => {
    const result = safeValidateBody(validBody)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.category).toBe('general')
    expect(result.data.history).toEqual([])
    expect(result.data.files).toEqual([])
    expect(result.data.sourceExtractionEnabled).toBe(false)
    expect(result.data.thinkingTimeLimit).toBe(5)
    expect(result.data.systemInstructions).toBe('')
  })

  it('rejects missing message', () => {
    const result = safeValidateBody({ ...validBody, message: undefined })
    expect(result.success).toBe(false)
  })

  it('rejects invalid optimizationMode', () => {
    const result = safeValidateBody({ ...validBody, optimizationMode: 'turbo' })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.some((e) => e.path === 'optimizationMode')).toBe(true)
  })

  it('accepts all three optimizationMode values', () => {
    for (const mode of ['speed', 'balanced', 'quality'] as const) {
      expect(safeValidateBody({ ...validBody, optimizationMode: mode }).success).toBe(true)
    }
  })

  it('rejects empty focusMode', () => {
    const result = safeValidateBody({ ...validBody, focusMode: '' })
    expect(result.success).toBe(false)
  })

  it('applies defaults for omitted optional fields', () => {
    const result = safeValidateBody({
      ...validBody,
      category: undefined,
      history: undefined,
      files: undefined,
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.category).toBe('general')
    expect(result.data.history).toEqual([])
    expect(result.data.files).toEqual([])
  })

  it('preserves explicitly provided optional fields', () => {
    const result = safeValidateBody({
      ...validBody,
      category: 'news',
      sourceExtractionEnabled: true,
      thinkingTimeLimit: 10,
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.category).toBe('news')
    expect(result.data.sourceExtractionEnabled).toBe(true)
    expect(result.data.thinkingTimeLimit).toBe(10)
  })

  it('returns field paths in error objects', () => {
    const result = safeValidateBody({
      ...validBody,
      message: { messageId: '', chatId: 'c1', content: '' },
    })
    expect(result.success).toBe(false)
    if (result.success) return
    const paths = result.error.map((e) => e.path)
    expect(paths.some((p) => p.startsWith('message'))).toBe(true)
  })

  it('rejects non-integer thinkingTimeLimit', () => {
    expect(safeValidateBody({ ...validBody, thinkingTimeLimit: 1.5 }).success).toBe(false)
  })

  it('rejects negative thinkingTimeLimit', () => {
    expect(safeValidateBody({ ...validBody, thinkingTimeLimit: -1 }).success).toBe(false)
  })

  it('accepts thinkingTimeLimit of 0', () => {
    expect(safeValidateBody({ ...validBody, thinkingTimeLimit: 0 }).success).toBe(true)
  })

  it('accepts a blank message when files are attached', () => {
    const result = safeValidateBody({
      ...validBody,
      message: { messageId: 'm1', chatId: 'c1', content: '' },
      files: ['file-abc'],
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.files).toEqual(['file-abc'])
  })

  it('accepts a message with omitted content when files are attached', () => {
    const result = safeValidateBody({
      ...validBody,
      message: { messageId: 'm1', chatId: 'c1' },
      files: ['file-abc'],
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.message.content).toBe('')
  })

  it('rejects a blank message with no attached files', () => {
    const result = safeValidateBody({
      ...validBody,
      message: { messageId: 'm1', chatId: 'c1', content: '   ' },
      files: [],
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.some((e) => e.path === 'message.content')).toBe(true)
  })
})

describe('resolveMessageContent', () => {
  it('returns the typed message verbatim when present', () => {
    expect(resolveMessageContent('summarize this', [])).toBe('summarize this')
    expect(resolveMessageContent('  keep spaces inside  ', [])).toBe(
      '  keep spaces inside  ',
    )
  })

  it('falls back to the default analysis prompt for a blank message with files', () => {
    expect(resolveMessageContent('', ['file-1'])).toBe(
      DEFAULT_UPLOAD_ANALYSIS_PROMPT,
    )
    expect(resolveMessageContent('   ', ['file-1', 'file-2'])).toBe(
      DEFAULT_UPLOAD_ANALYSIS_PROMPT,
    )
  })

  it('returns null when there is neither text nor a file', () => {
    expect(resolveMessageContent('', [])).toBeNull()
    expect(resolveMessageContent('   ', undefined)).toBeNull()
  })
})
