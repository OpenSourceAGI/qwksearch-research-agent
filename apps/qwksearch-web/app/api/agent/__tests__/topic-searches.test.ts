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

import { createTopicSearchesHandler } from 'research-agent-ui/api'

const handler = createTopicSearchesHandler({
  getUserId: async () => 'user-1',
  requireUserId: async () => 'user-1',
  getDB: (() => ({})) as any,
  userSchema: {} as any,
  getEnv: (() => ({})) as any,
})

function postRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/agent/topic-searches', {
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

describe('createTopicSearchesHandler POST', () => {
  it('returns a 400 when content is missing', async () => {
    const res = await handler(postRequest({ title: 'Untitled' }))

    expect(res.status).toBe(400)
  })

  it('loads the chat model via the requested provider and key', async () => {
    mockGenerateText.mockResolvedValue({ text: 'SpaceX Starship launch schedule' })

    await handler(postRequest(baseBody))

    expect(mockLoadChatModel).toHaveBeenCalledWith('openai', 'gpt-4')
  })

  it('parses newline-delimited topics, stripping numbering/bullets and blank lines', async () => {
    mockGenerateText.mockResolvedValue({
      text: '1. SpaceX Starship launch schedule\n- Falcon 9 reuse record\n\n',
    })

    const res = await handler(postRequest(baseBody))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.topics).toEqual([
      'SpaceX Starship launch schedule',
      'Falcon 9 reuse record',
    ])
  })

  it('truncates content to 15000 characters in the prompt', async () => {
    mockGenerateText.mockResolvedValue({ text: 'SpaceX launch schedule' })
    const longContent = 'x'.repeat(20000)

    await handler(postRequest({ ...baseBody, content: longContent }))

    const [{ messages }] = mockGenerateText.mock.calls[0]
    const userMessage = messages.find((m: any) => m.role === 'user')
    expect(userMessage.content).toContain('x'.repeat(15000))
    expect(userMessage.content).not.toContain('x'.repeat(15001))
  })

  it('slices the parsed topics down to maxTopics', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'First search topic\nSecond search topic\nThird search topic',
    })

    const res = await handler(postRequest({ ...baseBody, maxTopics: 2 }))

    const data = await res.json()
    expect(data.topics).toEqual(['First search topic', 'Second search topic'])
  })

  it('returns a 500 with the error message when the model fails to load', async () => {
    mockLoadChatModel.mockRejectedValue(new Error('No API key configured'))

    const res = await handler(postRequest(baseBody))

    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('No API key configured')
  })
})
