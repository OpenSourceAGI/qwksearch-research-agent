/**
 * Unified LLM Client
 * Supports multiple LLM providers (OpenAI, Anthropic, etc.)
 */

import { Message, TradingConfig } from '../types'

export interface LLMResponse {
  content: string
  toolCalls?: Array<{
    name: string
    arguments: Record<string, any>
  }>
}

export class UnifiedLLMClient {
  private provider: string
  private model: string
  private temperature: number
  private apiKey: string
  private baseUrl?: string

  constructor(config: TradingConfig, model: string) {
    this.provider = config.llmProvider
    this.model = model
    this.temperature = config.temperature ?? 0.3

    // Set base URL based on provider
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl
    } else if (this.provider.toLowerCase() === 'groq') {
      this.baseUrl = 'https://api.groq.com/openai/v1/chat/completions'
    }

    // Get API key based on provider
    if (config.apiKeys) {
      this.apiKey = config.apiKeys[this.provider] || ''
    } else {
      // Fallback to environment variables
      this.apiKey = process.env[`${this.provider.toUpperCase()}_API_KEY`] || ''
    }
  }

  /**
   * Invoke the LLM with a prompt
   */
  async invoke(input: string | Message[]): Promise<LLMResponse> {
    const messages = typeof input === 'string'
      ? [{ role: 'user' as const, content: input }]
      : input

    switch (this.provider.toLowerCase()) {
      case 'openai':
        return this.invokeOpenAI(messages)
      case 'groq':
        return this.invokeGroq(messages)
      case 'anthropic':
        return this.invokeAnthropic(messages)
      default:
        throw new Error(`Unsupported LLM provider: ${this.provider}`)
    }
  }

  /**
   * Invoke OpenAI API
   */
  private async invokeOpenAI(messages: Message[]): Promise<LLMResponse> {
    const url = this.baseUrl || 'https://api.openai.com/v1/chat/completions'

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: this.temperature
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data: any = await response.json()
    return {
      content: data.choices[0].message.content,
      toolCalls: data.choices[0].message.tool_calls?.map((tc: any) => ({
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments)
      }))
    }
  }

  /**
   * Invoke Groq API (OpenAI-compatible)
   */
  private async invokeGroq(messages: Message[]): Promise<LLMResponse> {
    const url = this.baseUrl || 'https://api.groq.com/openai/v1/chat/completions'

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: this.temperature
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Groq API error: ${response.statusText} - ${errorData}`)
    }

    const data: any = await response.json()
    return {
      content: data.choices[0].message.content,
      toolCalls: data.choices[0].message.tool_calls?.map((tc: any) => ({
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments)
      }))
    }
  }

  /**
   * Invoke Anthropic API
   */
  private async invokeAnthropic(messages: Message[]): Promise<LLMResponse> {
    const url = this.baseUrl || 'https://api.anthropic.com/v1/messages'

    // Convert messages format for Anthropic
    const systemMessage = messages.find(m => m.role === 'system')
    const userMessages = messages.filter(m => m.role !== 'system')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        temperature: this.temperature,
        system: systemMessage?.content,
        messages: userMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }))
      })
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`)
    }

    const data: any = await response.json()
    return {
      content: data.content[0].text
    }
  }

  /**
   * Invoke with tool binding
   */
  async invokeWithTools(messages: Message[], tools: any[]): Promise<LLMResponse> {
    switch (this.provider.toLowerCase()) {
      case 'openai':
      case 'groq':
        return this.invokeWithToolsOpenAI(messages, tools)
      case 'anthropic':
        // Anthropic has different tool calling format
        return this.invoke(messages)
      default:
        return this.invoke(messages)
    }
  }

  /**
   * Invoke OpenAI/Groq with tools
   */
  private async invokeWithToolsOpenAI(messages: Message[], tools: any[]): Promise<LLMResponse> {
    const url = this.provider.toLowerCase() === 'groq'
      ? (this.baseUrl || 'https://api.groq.com/openai/v1/chat/completions')
      : (this.baseUrl || 'https://api.openai.com/v1/chat/completions')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: this.temperature,
        tools,
        tool_choice: 'auto'
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`${this.provider} API error: ${response.statusText} - ${errorData}`)
    }

    const data: any = await response.json()
    return {
      content: data.choices[0].message.content,
      toolCalls: data.choices[0].message.tool_calls?.map((tc: any) => ({
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments)
      }))
    }
  }
}

/**
 * Create an LLM client instance
 */
export function createLLM(config: TradingConfig, model: string): UnifiedLLMClient {
  return new UnifiedLLMClient(config, model)
}
