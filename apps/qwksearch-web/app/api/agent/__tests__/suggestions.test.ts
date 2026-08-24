import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGenerateSuggestions = vi.fn()
const mockLoadChatModel = vi.fn()

vi.mock('chat-agent-toolkit/tools/search/suggestionGeneratorAgent', () => ({
  default: (...args: unknown[]) => mockGenerateSuggestions(...args),
}))

vi.mock('chat-agent-toolkit/models/registry', () => ({
  default: class {
    loadChatModel(...args: unknown[]) {
      return mockLoadChatModel(...args)
    }
  },
}))

import { createSuggestionsHandler } from 'research-agent-ui/api'

const handler = createSuggestionsHandler()

function postRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/agent/suggestions', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as any
}

const baseBody = {
  chatHistory: [
    { role: 'user', content: 'Tell me about SpaceX' },
    { role: 'assistant', content: 'SpaceX is a rocket company.' },
  ],
  chatModel: { providerId: 'openai', key: 'gpt-4' },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockLoadChatModel.mockResolvedValue({ id: 'fake-model' })
})

describe('createSuggestionsHandler POST', () => {
  it('filters out non-user/assistant messages before calling generateSuggestions', async () => {
    mockGenerateSuggestions.mockResolvedValue(['Tell me more about SpaceX'])

    await handler.POST(
      postRequest({
        ...baseBody,
        chatHistory: [
          { role: 'source', content: 'some document text' },
          ...baseBody.chatHistory,
        ],
      }),
    )

    expect(mockGenerateSuggestions).toHaveBeenCalledTimes(1)
    const [input] = mockGenerateSuggestions.mock.calls[0]
    expect(input.chat_history).toEqual([
      { role: 'user', content: 'Tell me about SpaceX' },
      { role: 'assistant', content: 'SpaceX is a rocket company.' },
    ])
  })

  it('returns generated suggestions with a 200 status', async () => {
    mockGenerateSuggestions.mockResolvedValue(['Who founded SpaceX?'])

    const res = await handler.POST(postRequest(baseBody))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.suggestions).toEqual(['Who founded SpaceX?'])
  })

  it('splits a suggestion containing multiple questions into separate questions', async () => {
    mockGenerateSuggestions.mockResolvedValue([
      'Who founded SpaceX? When was it founded?',
      'What is Starship?',
    ])

    const res = await handler.POST(postRequest(baseBody))

    const data = await res.json()
    expect(data.suggestions).toEqual([
      'Who founded SpaceX?',
      'When was it founded?',
      'What is Starship?',
    ])
  })

  it('passes maxQuestions through to generateSuggestions', async () => {
    mockGenerateSuggestions.mockResolvedValue([])

    await handler.POST(postRequest({ ...baseBody, maxQuestions: 2 }))

    const [input] = mockGenerateSuggestions.mock.calls[0]
    expect(input.maxQuestions).toBe(2)
  })

  it('loads the chat model via the requested provider and key', async () => {
    mockGenerateSuggestions.mockResolvedValue([])

    await handler.POST(postRequest(baseBody))

    expect(mockLoadChatModel).toHaveBeenCalledWith('openai', 'gpt-4')
  })
})
