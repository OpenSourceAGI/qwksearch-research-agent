import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import configManager from '../index'

// The config manager is a shared singleton. Each test that mutates it cleans up
// after itself (removes providers/servers it added, restores keys it changed)
// so the tests remain order-independent.

describe('ConfigManager.getConfig', () => {
  it('returns a top-level value', () => {
    expect(configManager.getConfig('version')).toBe(1)
  })

  it('resolves nested keys via dot notation', () => {
    expect(configManager.getConfig('search.sourceScrapeCount')).toBe(3)
  })

  it('returns the default value for an unknown key', () => {
    expect(configManager.getConfig('does.not.exist', 'fallback')).toBe('fallback')
  })

  it('returns undefined when no default is given for a missing key', () => {
    expect(configManager.getConfig('missing.key')).toBeUndefined()
  })

  it('returns the default when traversal hits a null/undefined parent', () => {
    expect(configManager.getConfig('search.tavilyApiKey.deep', 'd')).toBe('d')
  })

  it('treats an explicitly-present falsy value as found (not defaulted)', () => {
    // search.searxngURL defaults to "" — an empty string is a real value
    expect(configManager.getConfig('search.searxngURL', 'fallback')).toBe('')
  })
})

describe('ConfigManager.updateConfig', () => {
  it('updates a nested value in place', () => {
    const original = configManager.getConfig('preferences.theme')
    configManager.updateConfig('preferences.theme', 'light')
    expect(configManager.getConfig('preferences.theme')).toBe('light')
    configManager.updateConfig('preferences.theme', original)
  })

  it('creates intermediate objects for deep keys that do not exist yet', () => {
    configManager.updateConfig('preferences.nested.deep.value', 42)
    expect(configManager.getConfig('preferences.nested.deep.value')).toBe(42)
    // cleanup
    configManager.updateConfig('preferences.nested', undefined)
  })

  it('overwrites a non-object intermediate with an object', () => {
    configManager.updateConfig('preferences.scalar', 'x')
    configManager.updateConfig('preferences.scalar.child', 'y')
    expect(configManager.getConfig('preferences.scalar.child')).toBe('y')
    configManager.updateConfig('preferences.scalar', undefined)
  })

  it('does nothing when given an empty key', () => {
    // parts = [''] — sets an empty-string key on the root, harmless
    expect(() => configManager.updateConfig('', 'noop')).not.toThrow()
  })
})

describe('ConfigManager model providers', () => {
  afterEach(() => {
    // Remove any provider whose name starts with the test marker.
    const providers = configManager.getConfig('modelProviders', []) as any[]
    providers
      .filter((p) => typeof p.name === 'string' && p.name.startsWith('__test'))
      .forEach((p) => configManager.removeModelProvider(p.id))
  })

  it('adds a model provider and returns it with a deterministic hash id', () => {
    const provider = configManager.addModelProvider('openai', '__test-openai', {
      apiKey: 'sk-123',
    })
    expect(provider.name).toBe('__test-openai')
    expect(provider.type).toBe('openai')
    expect(provider.id).toBe(provider.hash)
    expect(provider.chatModels).toEqual([])
  })

  it('produces the same hash id for identical config', () => {
    const a = configManager.addModelProvider('openai', '__test-a', { apiKey: 'same' })
    const b = configManager.addModelProvider('openai', '__test-b', { apiKey: 'same' })
    expect(a.id).toBe(b.id)
  })

  it('removes a model provider by id', () => {
    const provider = configManager.addModelProvider('openai', '__test-remove', {
      apiKey: 'k',
    })
    configManager.removeModelProvider(provider.id)
    const providers = configManager.getConfig('modelProviders', []) as any[]
    expect(providers.find((p) => p.id === provider.id && p.name === '__test-remove')).toBeUndefined()
  })

  it('removeModelProvider is a no-op for an unknown id', () => {
    const before = (configManager.getConfig('modelProviders', []) as any[]).length
    configManager.removeModelProvider('nonexistent-id-xyz')
    expect((configManager.getConfig('modelProviders', []) as any[]).length).toBe(before)
  })

  it('updates a provider name and config', async () => {
    const provider = configManager.addModelProvider('openai', '__test-update', {
      apiKey: 'old',
    })
    const updated = await configManager.updateModelProvider(provider.id, '__test-updated', {
      apiKey: 'new',
    })
    expect(updated.name).toBe('__test-updated')
    expect(updated.config).toEqual({ apiKey: 'new' })
  })

  it('throws when updating a provider that does not exist', async () => {
    await expect(
      configManager.updateModelProvider('missing', 'x', {}),
    ).rejects.toThrow('Provider not found')
  })
})

describe('ConfigManager provider models', () => {
  let providerId: string

  beforeEach(() => {
    providerId = configManager.addModelProvider('openai', '__test-models', {
      apiKey: 'k',
    }).id
  })

  afterEach(() => {
    configManager.removeModelProvider(providerId)
  })

  it('adds a chat model and strips the type field', () => {
    const model = configManager.addProviderModel(providerId, 'chat', {
      key: 'gpt-4',
      type: 'chat',
    })
    expect(model.type).toBeUndefined()
    expect(model.key).toBe('gpt-4')
  })

  it('throws when adding a model to an invalid provider', () => {
    expect(() =>
      configManager.addProviderModel('bad-id', 'chat', { key: 'm' }),
    ).toThrow('Invalid provider id')
  })

  it('removes a chat model by key', () => {
    configManager.addProviderModel(providerId, 'chat', { key: 'gpt-4' })
    configManager.addProviderModel(providerId, 'chat', { key: 'gpt-3.5' })
    configManager.removeProviderModel(providerId, 'chat', 'gpt-4')
    const provider = (configManager.getConfig('modelProviders', []) as any[]).find(
      (p) => p.id === providerId,
    )
    expect(provider.chatModels.map((m: any) => m.key)).toEqual(['gpt-3.5'])
  })

  it('throws when removing a model from an invalid provider', () => {
    expect(() =>
      configManager.removeProviderModel('bad-id', 'chat', 'm'),
    ).toThrow('Invalid provider id')
  })
})

describe('ConfigManager MCP servers', () => {
  afterEach(() => {
    const servers = configManager.getConfig('mcpServers', []) as any[]
    servers
      .filter((s) => typeof s.name === 'string' && s.name.startsWith('__test'))
      .forEach((s) => configManager.removeMCPServer(s.id))
  })

  it('adds an MCP server enabled by default', () => {
    const server = configManager.addMCPServer('open-connector', '__test-mcp', {
      url: 'https://x',
    })
    expect(server.enabled).toBe(true)
    expect(server.id).toBe(server.hash)
    expect(server.type).toBe('open-connector')
  })

  it('removes an MCP server by id', () => {
    const server = configManager.addMCPServer('open-connector', '__test-mcp-rm', {
      url: 'https://y',
    })
    configManager.removeMCPServer(server.id)
    const servers = configManager.getConfig('mcpServers', []) as any[]
    expect(servers.find((s) => s.id === server.id && s.name === '__test-mcp-rm')).toBeUndefined()
  })

  it('removeMCPServer is a no-op for an unknown id', () => {
    const before = (configManager.getConfig('mcpServers', []) as any[]).length
    configManager.removeMCPServer('no-such-server')
    expect((configManager.getConfig('mcpServers', []) as any[]).length).toBe(before)
  })

  it('updates an MCP server name and config', async () => {
    const server = configManager.addMCPServer('open-connector', '__test-mcp-up', {
      url: 'https://old',
    })
    const updated = await configManager.updateMCPServer(server.id, '__test-mcp-up2', {
      url: 'https://new',
    })
    expect(updated.name).toBe('__test-mcp-up2')
    expect(updated.config).toEqual({ url: 'https://new' })
  })

  it('throws when updating a non-existent MCP server', async () => {
    await expect(
      configManager.updateMCPServer('missing', 'x', {}),
    ).rejects.toThrow('MCP Server not found')
  })

  it('toggles an MCP server enabled flag', () => {
    const server = configManager.addMCPServer('open-connector', '__test-mcp-tog', {
      url: 'https://z',
    })
    const toggled = configManager.toggleMCPServer(server.id, false)
    expect(toggled.enabled).toBe(false)
    expect(configManager.toggleMCPServer(server.id, true).enabled).toBe(true)
  })

  it('throws when toggling a non-existent MCP server', () => {
    expect(() => configManager.toggleMCPServer('missing', true)).toThrow(
      'MCP Server not found',
    )
  })
})

describe('ConfigManager setup + snapshots', () => {
  it('reports and marks setup completion', () => {
    // markSetupComplete only flips false -> true; it never regresses.
    configManager.markSetupComplete()
    expect(configManager.isSetupComplete()).toBe(true)
  })

  it('exposes UI config sections including the search section', () => {
    const sections = configManager.getUIConfigSections()
    expect(Array.isArray(sections.search)).toBe(true)
    expect(sections.search.some((f) => f.key === 'searxngURL')).toBe(true)
  })

  it('returns a deep clone from getCurrentConfig', () => {
    const snapshot = configManager.getCurrentConfig()
    snapshot.search.searxngURL = 'mutated-copy'
    // Mutating the snapshot must not affect the live config.
    expect(configManager.getConfig('search.searxngURL')).not.toBe('mutated-copy')
  })
})
