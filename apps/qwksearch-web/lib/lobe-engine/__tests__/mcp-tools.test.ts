import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadMCPProviders, resetMCPConnections, toClientParams, toolResultToText } from '../mcp-tools';
import { buildToolset } from '../lobe-tools';

const server = (over: Record<string, any> = {}) => ({
  id: 's1',
  name: 'My Docs',
  type: 'lobe-mcp',
  enabled: true,
  config: { url: 'https://docs.example/mcp', authToken: 'tok' },
  ...over,
});

function fakeClient(tools = [{ name: 'lookup', description: 'Look up a doc', inputSchema: { type: 'object', properties: { q: { type: 'string' } } } }]) {
  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    listTools: vi.fn().mockResolvedValue(tools),
    callTool: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'doc body' }] }),
    disconnect: vi.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => resetMCPConnections());

describe('toClientParams', () => {
  it('maps http and stdio servers onto LobeChat MCP client params', () => {
    expect(toClientParams(server() as any)).toEqual({
      type: 'http',
      name: 'My Docs',
      url: 'https://docs.example/mcp',
      headers: {},
      auth: { type: 'bearer', token: 'tok' },
    });
    expect(toClientParams(server({ type: 'lobe-mcp-stdio', config: { command: 'npx', args: '["-y","pkg"]' } }) as any)).toEqual({
      type: 'stdio',
      name: 'My Docs',
      command: 'npx',
      args: ['-y', 'pkg'],
      env: {},
    });
    expect(toClientParams(server({ config: {} }) as any)).toBeNull();
  });
});

describe('toolResultToText', () => {
  it('joins text parts and summarises others', () => {
    expect(
      toolResultToText({
        content: [
          { type: 'text', text: 'a' },
          { type: 'image', data: 'x', mimeType: 'image/png' },
        ],
      } as any),
    ).toBe('a\n\n[image image/png]');
    expect(toolResultToText({ content: [], structuredContent: { n: 1 } } as any)).toBe('{"n":1}');
  });
});

describe('loadMCPProviders', () => {
  it('turns each enabled server into a provider whose calls reach the server', async () => {
    const client = fakeClient();
    const createClient = vi.fn(() => client);
    const providers = await loadMCPProviders({
      servers: [server(), server({ id: 'off', enabled: false }), server({ id: 'oc', type: 'open-connector' })],
      createClient: createClient as any,
    });

    expect(createClient).toHaveBeenCalledTimes(1);
    expect(providers).toHaveLength(1);
    const toolset = buildToolset(providers);
    expect([...toolset.routes.keys()]).toEqual(['mcp_my_docs_lookup']);

    const out = await providers[0].invoke('lookup', { q: 'x' });
    expect(client.callTool).toHaveBeenCalledWith('lookup', { q: 'x' });
    expect(out).toEqual({ content: 'doc body', success: true });
  });

  it('reuses the connection across requests', async () => {
    const createClient = vi.fn(() => fakeClient());
    await loadMCPProviders({ servers: [server()], createClient: createClient as any });
    await loadMCPProviders({ servers: [server()], createClient: createClient as any });
    expect(createClient).toHaveBeenCalledTimes(1);
  });

  it('skips a server that fails to connect', async () => {
    const broken = { ...fakeClient(), initialize: vi.fn().mockRejectedValue(new Error('refused')) };
    const providers = await loadMCPProviders({ servers: [server()], createClient: (() => broken) as any });
    expect(providers).toEqual([]);
  });
});
