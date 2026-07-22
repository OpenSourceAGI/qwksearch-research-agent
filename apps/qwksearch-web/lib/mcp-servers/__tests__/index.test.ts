import { describe, expect, it } from 'vitest'
import mcpServers, {
  getMCPServersUIConfigSection,
  getMCPServerByKey,
  OpenConnectorMCPServer,
  BaseMCPServer,
} from '../index'

describe('mcpServers registry', () => {
  it('registers the open-connector server', () => {
    expect(mcpServers['open-connector']).toBe(OpenConnectorMCPServer)
  })
})

describe('getMCPServerByKey', () => {
  it('returns the constructor for a known key', () => {
    expect(getMCPServerByKey('open-connector')).toBe(OpenConnectorMCPServer)
  })

  it('returns undefined for an unknown key', () => {
    expect(getMCPServerByKey('does-not-exist')).toBeUndefined()
  })
})

describe('getMCPServersUIConfigSection', () => {
  it('maps each server to its metadata and fields', () => {
    const sections = getMCPServersUIConfigSection()
    expect(sections).toHaveLength(1)
    const [section] = sections
    expect(section.name).toBe('OpenConnector')
    expect(section.key).toBe('open-connector')
    expect(section.fields.some((f) => f.key === 'adminToken')).toBe(true)
  })
})

describe('BaseMCPServer static contract', () => {
  it('throws for unimplemented static helpers', () => {
    expect(() => BaseMCPServer.getServerConfigFields()).toThrow('not implemented')
    expect(() => BaseMCPServer.getServerMetadata()).toThrow('not implemented')
    expect(() => BaseMCPServer.parseAndValidate({})).toThrow('not implemented')
  })
})
