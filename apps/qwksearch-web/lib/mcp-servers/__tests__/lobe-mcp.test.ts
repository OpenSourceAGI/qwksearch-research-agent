import { describe, it, expect } from 'vitest'
import { LobeHttpMCPServer, LobeStdioMCPServer } from '../lobe-mcp'

describe('LobeHttpMCPServer.parseAndValidate', () => {
  it('accepts an http(s) url with optional token and headers', () => {
    expect(
      LobeHttpMCPServer.parseAndValidate({ url: 'https://x.example/mcp', authToken: 't', headers: '{"A":"b"}' }),
    ).toEqual({ url: 'https://x.example/mcp', authToken: 't', headers: '{"A":"b"}' })
  })

  it('rejects a missing or non-http url and bad headers', () => {
    expect(() => LobeHttpMCPServer.parseAndValidate({})).toThrow('url is required')
    expect(() => LobeHttpMCPServer.parseAndValidate({ url: 'ftp://x' })).toThrow('http(s) URL')
    expect(() => LobeHttpMCPServer.parseAndValidate({ url: 'https://x', headers: '[1]' })).toThrow('JSON object')
  })
})

describe('LobeStdioMCPServer.parseAndValidate', () => {
  it('requires a command', () => {
    expect(LobeStdioMCPServer.parseAndValidate({ command: 'npx', args: '-y pkg' })).toEqual({ command: 'npx', args: '-y pkg' })
    expect(() => LobeStdioMCPServer.parseAndValidate({ args: 'x' })).toThrow('command is required')
  })
})
