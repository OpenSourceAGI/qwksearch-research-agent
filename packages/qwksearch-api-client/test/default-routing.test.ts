/**
 * @fileoverview End-to-end through the generated SDK with the transport
 * stubbed: an operation called with no configuration goes to the public
 * deployment at https://opensourceagi.app/api, and the package entry exposes
 * the shared client so callers can repoint it or attach an API key.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as pkg from '../main';

const realFetch = globalThis.fetch;
const defaultConfig = pkg.client.getConfig();

afterEach(() => {
  globalThis.fetch = realFetch;
  pkg.client.setConfig({ baseUrl: defaultConfig.baseUrl, headers: {} });
  vi.restoreAllMocks();
});

/** Stubs fetch with a JSON reply and records every request URL and headers. */
function recordRequests(body: unknown = { engines: {} }) {
  const calls: { url: string; headers: Headers }[] = [];
  globalThis.fetch = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(String(input), init);
    calls.push({ url: request.url, headers: new Headers(init?.headers ?? request.headers) });
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as never;
  return calls;
}

describe('package entry', () => {
  it('exports the shared client and the client factories', () => {
    expect(typeof pkg.client.setConfig).toBe('function');
    expect(typeof pkg.createClient).toBe('function');
    expect(typeof pkg.createConfig).toBe('function');
  });

  it('defaults to the opensourceagi.app deployment', () => {
    expect(pkg.DEFAULT_ORIGIN).toBe('https://opensourceagi.app');
    expect(pkg.baseUrl).toBe('https://opensourceagi.app/api');
    expect(defaultConfig.baseUrl).toBe('https://opensourceagi.app/api');
  });
});

describe('default routing', () => {
  it('sends an unconfigured call to https://opensourceagi.app/api', async () => {
    const calls = recordRequests();

    const result = await pkg.listSearchEngines();

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://opensourceagi.app/api/search/engines');
    expect(result.data).toEqual({ engines: {} });
  });

  it('serialises query parameters onto the URL', async () => {
    const calls = recordRequests({ results: [] });

    await pkg.agentSearch({ query: { q: 'capital of France' } });

    const url = new URL(calls[0].url);
    expect(url.origin + url.pathname).toBe('https://opensourceagi.app/api/agent/search');
    expect(url.searchParams.get('q')).toBe('capital of France');
  });

  it('follows client.setConfig for the base URL and auth headers', async () => {
    const calls = recordRequests();
    pkg.client.setConfig({
      baseUrl: 'https://self-hosted.test/api',
      headers: { Authorization: 'Bearer test-key' },
    });

    await pkg.listSearchEngines();

    expect(calls[0].url).toBe('https://self-hosted.test/api/search/engines');
    expect(calls[0].headers.get('authorization')).toBe('Bearer test-key');
  });
});
