import { describe, expect, it } from 'vitest'
import { isSecretConfigKey, redactConnections, redactSecretFields } from '../redact'

describe('config redaction', () => {
  it('recognises credential keys by how they end', () => {
    for (const key of ['apiKey', 'api_key', 'API_KEY', 'clientSecret', 'accessToken', 'secretAccessKey', 'password']) {
      expect(isSecretConfigKey(key)).toBe(true)
    }
    for (const key of ['apiKeyUrl', 'tokenUrl', 'maxTokens', 'baseURL', 'model', 'authType']) {
      expect(isSecretConfigKey(key)).toBe(false)
    }
  })

  it('blanks credentials, keeps everything else, and does not mutate the input', () => {
    const config = { apiKey: 'sk-or-v1-secret', baseURL: 'https://openrouter.ai/api/v1', nested: { clientSecret: 'x', region: 'us' } }
    expect(redactSecretFields(config)).toEqual({
      apiKey: '',
      baseURL: 'https://openrouter.ai/api/v1',
      nested: { clientSecret: '', region: 'us' },
    })
    expect(config.apiKey).toBe('sk-or-v1-secret')
  })

  it('redacts env-based providers and MCP servers', () => {
    const providers = [
      { id: 'a', name: 'NVIDIA', isEnvBased: true, config: { apiKey: 'nvapi-secret' }, chatModels: [] },
      { id: 'b', name: 'MCP', apiKey: 'mcp-secret', config: { url: 'https://mcp.example' } },
    ]
    const out = redactConnections(providers)
    expect(out[0]).toMatchObject({ id: 'a', isEnvBased: true, config: { apiKey: '' } })
    expect(out[1]).toMatchObject({ apiKey: '', config: { url: 'https://mcp.example' } })
    expect(JSON.stringify(out)).not.toMatch(/secret/)
  })

  it('passes a missing list through as empty', () => {
    expect(redactConnections(undefined)).toEqual([])
  })
})
