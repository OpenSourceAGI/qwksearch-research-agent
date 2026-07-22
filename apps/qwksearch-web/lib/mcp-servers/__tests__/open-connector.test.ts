import { afterEach, describe, expect, it, vi } from 'vitest'
import OpenConnectorMCPServer from '../open-connector'
import { createMCPServerInstance } from '../baseMCPServer'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('OpenConnectorMCPServer.parseAndValidate', () => {
  it('accepts a minimal valid config', () => {
    const config = OpenConnectorMCPServer.parseAndValidate({
      adminToken: 'tok',
      url: 'https://x.workers.dev',
    })
    expect(config).toEqual({ adminToken: 'tok', url: 'https://x.workers.dev' })
  })

  it('splits a comma-separated apps string into a trimmed array', () => {
    const config = OpenConnectorMCPServer.parseAndValidate({
      adminToken: 'tok',
      url: 'https://x',
      apps: 'gmail, slack ,notion',
    })
    expect(config.apps).toEqual(['gmail', 'slack', 'notion'])
  })

  it('passes an apps array through unchanged', () => {
    const config = OpenConnectorMCPServer.parseAndValidate({
      adminToken: 'tok',
      url: 'https://x',
      apps: ['a', 'b'],
    })
    expect(config.apps).toEqual(['a', 'b'])
  })

  it('rejects a non-object config', () => {
    expect(() => OpenConnectorMCPServer.parseAndValidate(null)).toThrow('must be an object')
    expect(() => OpenConnectorMCPServer.parseAndValidate('str')).toThrow('must be an object')
  })

  it('requires an adminToken string', () => {
    expect(() =>
      OpenConnectorMCPServer.parseAndValidate({ url: 'https://x' }),
    ).toThrow('adminToken is required')
  })

  it('requires a url string', () => {
    expect(() =>
      OpenConnectorMCPServer.parseAndValidate({ adminToken: 'tok' }),
    ).toThrow('url is required')
  })
})

describe('OpenConnectorMCPServer static metadata', () => {
  it('exposes metadata', () => {
    const meta = OpenConnectorMCPServer.getServerMetadata()
    expect(meta.key).toBe('open-connector')
    expect(meta.name).toBe('OpenConnector')
  })

  it('exposes required config fields', () => {
    const fields = OpenConnectorMCPServer.getServerConfigFields()
    const keys = fields.map((f) => f.key)
    expect(keys).toContain('adminToken')
    expect(keys).toContain('url')
    expect(keys).toContain('apps')
    const adminToken = fields.find((f) => f.key === 'adminToken')!
    expect(adminToken.required).toBe(true)
  })
})

describe('OpenConnectorMCPServer instance lifecycle', () => {
  it('connects, reports connection state and disconnects', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const server = createMCPServerInstance(
      OpenConnectorMCPServer,
      'id-1',
      'My Connector',
      { adminToken: 'tok', url: 'https://x' },
    )
    expect(server.isConnected()).toBe(false)
    await server.connect()
    expect(server.isConnected()).toBe(true)
    await server.disconnect()
    expect(server.isConnected()).toBe(false)
  })

  it('auto-connects when getTools is called before connecting', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const server = createMCPServerInstance(
      OpenConnectorMCPServer,
      'id-2',
      'Auto',
      { adminToken: 'tok', url: 'https://x' },
    )
    const tools = await server.getTools()
    expect(Array.isArray(tools)).toBe(true)
    expect(server.isConnected()).toBe(true)
  })
})
