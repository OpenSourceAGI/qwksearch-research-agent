import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGenerateText = vi.fn()
const mockLoadChatModel = vi.fn()

vi.mock('ai', () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
}))

vi.mock('chat-agent-toolkit/models/registry', () => ({
  default: class {
    loadChatModel(...args: unknown[]) {
      return mockLoadChatModel(...args)
    }
  },
}))

import { createPageTipsHandler } from 'research-agent-ui/api'

const handler = createPageTipsHandler({
  getUserId: async () => 'user-1',
  requireUserId: async () => 'user-1',
  getDB: (() => ({})) as any,
  userSchema: {} as any,
  getEnv: (() => ({})) as any,
})

function postRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/agent/page-tips', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as any
}

const baseBody = {
  title: 'My Document',
  content: 'Some article content about SpaceX.',
  chatModel: { providerId: 'openai', key: 'gpt-4' },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockLoadChatModel.mockResolvedValue({ id: 'fake-model' })
})

describe('createPageTipsHandler POST', () => {
  it('returns a 400 when content is missing', async () => {
    const res = await handler(postRequest({ title: 'Untitled' }))

    expect(res.status).toBe(400)
  })

  it('loads the chat model via the requested provider and key', async () => {
    mockGenerateText.mockResolvedValue({ text: 'A useful tip about this page' })

    await handler(postRequest(baseBody))

    expect(mockLoadChatModel).toHaveBeenCalledWith('openai', 'gpt-4')
  })

  it('parses newline-delimited tips, stripping numbering/bullets and short lines', async () => {
    mockGenerateText.mockResolvedValue({
      text: '1. This is a real tip about the page\n- Another useful tip here\ntoo short\n',
    })

    const res = await handler(postRequest(baseBody))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.tips).toEqual([
      'This is a real tip about the page',
      'Another useful tip here',
    ])
  })

  it('truncates content to 15000 characters in the prompt', async () => {
    mockGenerateText.mockResolvedValue({ text: 'A tip about the page content' })
    const longContent = 'x'.repeat(20000)

    await handler(postRequest({ ...baseBody, content: longContent }))

    const [{ messages }] = mockGenerateText.mock.calls[0]
    const userMessage = messages.find((m: any) => m.role === 'user')
    expect(userMessage.content).toContain('x'.repeat(15000))
    expect(userMessage.content).not.toContain('x'.repeat(15001))
  })

  it('slices the parsed tips down to maxTips', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'First long enough tip\nSecond long enough tip\nThird long enough tip',
    })

    const res = await handler(postRequest({ ...baseBody, maxTips: 2 }))

    const data = await res.json()
    expect(data.tips).toEqual(['First long enough tip', 'Second long enough tip'])
  })

  it('returns a 500 with the error message when the model fails to load', async () => {
    mockLoadChatModel.mockRejectedValue(new Error('No API key configured'))

    const res = await handler(postRequest(baseBody))

    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('No API key configured')
  })
})
