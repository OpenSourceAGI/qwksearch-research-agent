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

import { createArticleFollowupsHandler } from 'research-agent-ui/api'

const handler = createArticleFollowupsHandler({
  getUserId: async () => 'user-1',
  requireUserId: async () => 'user-1',
  getDB: (() => ({})) as any,
  userSchema: {} as any,
  getEnv: (() => ({})) as any,
})

function postRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/agent/article-followups', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as any
}

const baseBody = {
  article: 'Some article content about SpaceX.',
  chatModel: { providerId: 'openai', key: 'gpt-4' },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockLoadChatModel.mockResolvedValue({ id: 'fake-model' })
})

describe('createArticleFollowupsHandler POST', () => {
  it('returns a 400 when article is missing', async () => {
    const res = await handler(postRequest({}))

    expect(res.status).toBe(400)
  })

  it('loads the chat model via the requested provider and key', async () => {
    mockGenerateText.mockResolvedValue({ text: 'What powers Starship?' })

    await handler(postRequest(baseBody))

    expect(mockLoadChatModel).toHaveBeenCalledWith('openai', 'gpt-4')
  })

  it('includes prior user chat-history questions in the prompt', async () => {
    mockGenerateText.mockResolvedValue({ text: 'What powers Starship?' })

    await handler(
      postRequest({
        ...baseBody,
        chatHistory: [
          { role: 'user', content: 'Who founded SpaceX?' },
          { role: 'assistant', content: 'Elon Musk founded SpaceX.' },
        ],
      }),
    )

    const [{ messages }] = mockGenerateText.mock.calls[0]
    const userMessage = messages.find((m: any) => m.role === 'user')
    expect(userMessage.content).toContain('Who founded SpaceX?')
    expect(userMessage.content).not.toContain('Elon Musk founded SpaceX.')
  })

  it('parses newline-delimited questions, stripping numbering/bullets and short lines', async () => {
    mockGenerateText.mockResolvedValue({
      text: '1. What powers the Starship rocket engines?\n- Why did SpaceX choose Boca Chica?\ntoo short\n',
    })

    const res = await handler(postRequest(baseBody))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.extract).toEqual([
      'What powers the Starship rocket engines?',
      'Why did SpaceX choose Boca Chica?',
    ])
  })

  it('truncates article content to 15000 characters in the prompt', async () => {
    mockGenerateText.mockResolvedValue({ text: 'A question about the article' })
    const longArticle = 'x'.repeat(20000)

    await handler(postRequest({ ...baseBody, article: longArticle }))

    const [{ messages }] = mockGenerateText.mock.calls[0]
    const userMessage = messages.find((m: any) => m.role === 'user')
    expect(userMessage.content).toContain('x'.repeat(15000))
    expect(userMessage.content).not.toContain('x'.repeat(15001))
  })

  it('slices the parsed questions down to maxQuestions', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'First long enough question\nSecond long enough question\nThird long enough question',
    })

    const res = await handler(postRequest({ ...baseBody, maxQuestions: 2 }))

    const data = await res.json()
    expect(data.extract).toEqual([
      'First long enough question',
      'Second long enough question',
    ])
  })

  it('returns a 500 with the error message when the model fails to load', async () => {
    mockLoadChatModel.mockRejectedValue(new Error('No API key configured'))

    const res = await handler(postRequest(baseBody))

    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('No API key configured')
  })
})
