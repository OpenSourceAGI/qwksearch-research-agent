import { describe, expect, it, vi } from 'vitest'

// chat-agent-toolkit/models/types only exports a TypeScript type — mock the
// module so the test runner does not need the workspace package built.
vi.mock('chat-agent-toolkit/models/types', () => ({}))

import { safeValidateBody, messageSchema, chatModelSchema } from '../schemas'

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

  it('rejects missing content', () => {
    const result = messageSchema.safeParse({ messageId: 'm1', chatId: 'c1' })
    expect(result.success).toBe(false)
  })

  it('rejects empty content', () => {
    const result = messageSchema.safeParse({
      messageId: 'm1',
      chatId: 'c1',
      content: '',
    })
    expect(result.success).toBe(false)
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
})
