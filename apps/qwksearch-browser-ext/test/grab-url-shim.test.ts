import { beforeEach, describe, expect, it, vi } from 'vitest';
import grab from '../lib/grab-url-shim';

function mockFetch(body: unknown, { ok = true } = {}) {
  const fetchMock = vi.fn(async () => ({ ok, json: async () => body }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('grab', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('rewrites a relative path onto the production API host', async () => {
    const fetchMock = mockFetch({ providers: [] });

    await grab('/api/agent/providers');

    expect(fetchMock).toHaveBeenCalledWith('https://qwksearch.com/api/agent/providers', undefined);
  });

  it('leaves an absolute URL alone', async () => {
    const fetchMock = mockFetch({});

    await grab('https://example.com/data.json');

    expect(fetchMock).toHaveBeenCalledWith('https://example.com/data.json', undefined);
  });

  it('returns the parsed JSON body', async () => {
    mockFetch({ providers: ['openrouter'] });

    await expect(grab('/api/agent/providers')).resolves.toEqual({ providers: ['openrouter'] });
  });

  it('forwards the request options', async () => {
    const fetchMock = mockFetch({});
    const options = { method: 'POST', body: '{}' };

    await grab('/api/agent/chat', options);

    expect(fetchMock).toHaveBeenCalledWith('https://qwksearch.com/api/agent/chat', options);
  });

  it('returns null instead of throwing on a failed response', async () => {
    mockFetch({ error: 'nope' }, { ok: false });

    await expect(grab('/api/agent/providers')).resolves.toBeNull();
  });
});
