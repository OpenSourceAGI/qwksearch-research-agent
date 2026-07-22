import { afterEach, describe, expect, it, vi } from 'vitest'
import configManager from '../index'
import {
  getConfiguredModelProviders,
  getConfiguredModelProviderById,
  getSearxngURL,
  getTavilyApiKey,
  getSourceScrapeCount,
  getSourceScrapeTimeout,
  getConfiguredMCPServers,
  getConfiguredMCPServerById,
  getEnabledMCPServers,
  getTheme,
  getAutoMediaSearch,
  getFontFamily,
  getEnabledSearchEngines,
} from '../serverRegistry'

// These helpers are thin wrappers over configManager.getConfig. We drive them
// by spying on getConfig so the assertions stay independent of live env state.

afterEach(() => {
  vi.restoreAllMocks()
})

describe('serverRegistry model providers', () => {
  it('returns the configured model providers', () => {
    const providers = [{ id: 'a' }, { id: 'b' }]
    vi.spyOn(configManager, 'getConfig').mockReturnValue(providers as any)
    expect(getConfiguredModelProviders()).toBe(providers)
  })

  it('finds a provider by id', () => {
    vi.spyOn(configManager, 'getConfig').mockReturnValue([
      { id: 'a' },
      { id: 'b' },
    ] as any)
    expect(getConfiguredModelProviderById('b')).toEqual({ id: 'b' })
  })

  it('returns undefined when the provider id is not found', () => {
    vi.spyOn(configManager, 'getConfig').mockReturnValue([{ id: 'a' }] as any)
    expect(getConfiguredModelProviderById('zzz')).toBeUndefined()
  })
})

describe('serverRegistry search settings', () => {
  it('reads the searxng URL', () => {
    vi.spyOn(configManager, 'getConfig').mockReturnValue('http://searx.local')
    expect(getSearxngURL()).toBe('http://searx.local')
  })

  it('reads the tavily api key', () => {
    vi.spyOn(configManager, 'getConfig').mockReturnValue('tvly-abc')
    expect(getTavilyApiKey()).toBe('tvly-abc')
  })

  it('parses the source scrape count to a number', () => {
    vi.spyOn(configManager, 'getConfig').mockReturnValue('7')
    expect(getSourceScrapeCount()).toBe(7)
  })

  it('falls back to 3 when the scrape count is unparseable', () => {
    vi.spyOn(configManager, 'getConfig').mockReturnValue('not-a-number')
    expect(getSourceScrapeCount()).toBe(3)
  })

  it('parses the scrape timeout to a number', () => {
    vi.spyOn(configManager, 'getConfig').mockReturnValue('10')
    expect(getSourceScrapeTimeout()).toBe(10)
  })

  it('falls back to 5 when the scrape timeout is unparseable', () => {
    vi.spyOn(configManager, 'getConfig').mockReturnValue('')
    expect(getSourceScrapeTimeout()).toBe(5)
  })

  it('returns the enabled search engines list', () => {
    vi.spyOn(configManager, 'getConfig').mockReturnValue(['google', 'bing'])
    expect(getEnabledSearchEngines()).toEqual(['google', 'bing'])
  })
})

describe('serverRegistry MCP servers', () => {
  it('returns configured MCP servers', () => {
    const servers = [{ id: 's1', enabled: true }]
    vi.spyOn(configManager, 'getConfig').mockReturnValue(servers as any)
    expect(getConfiguredMCPServers()).toBe(servers)
  })

  it('finds an MCP server by id', () => {
    vi.spyOn(configManager, 'getConfig').mockReturnValue([
      { id: 's1' },
      { id: 's2' },
    ] as any)
    expect(getConfiguredMCPServerById('s2')).toEqual({ id: 's2' })
  })

  it('returns undefined for an unknown MCP server id', () => {
    vi.spyOn(configManager, 'getConfig').mockReturnValue([{ id: 's1' }] as any)
    expect(getConfiguredMCPServerById('nope')).toBeUndefined()
  })

  it('filters to only enabled MCP servers', () => {
    vi.spyOn(configManager, 'getConfig').mockReturnValue([
      { id: 's1', enabled: true },
      { id: 's2', enabled: false },
      { id: 's3', enabled: true },
    ] as any)
    expect(getEnabledMCPServers().map((s) => s.id)).toEqual(['s1', 's3'])
  })
})

describe('serverRegistry preferences', () => {
  it('reads the theme', () => {
    vi.spyOn(configManager, 'getConfig').mockReturnValue('light')
    expect(getTheme()).toBe('light')
  })

  it('reads the auto media search preference', () => {
    vi.spyOn(configManager, 'getConfig').mockReturnValue(false)
    expect(getAutoMediaSearch()).toBe(false)
  })

  it('reads the font family', () => {
    vi.spyOn(configManager, 'getConfig').mockReturnValue('Inter')
    expect(getFontFamily()).toBe('Inter')
  })
})
