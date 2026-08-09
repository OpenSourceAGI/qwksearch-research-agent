import { beforeEach, describe, expect, it, vi } from 'vitest';
import { streamApiRequest, type ProxyCallbacks } from '../src/apiProxy';

function callbacks() {
  const chunks: string[] = [];
  const spies = {
    onChunk: vi.fn((c: string) => void chunks.push(c)),
    onDone: vi.fn(),
    onError: vi.fn(),
  } satisfies ProxyCallbacks;
  return { spies, chunks };
}

/** A Response double whose body streams the given text chunks. */
function streamingResponse(textChunks: string[], { ok = true, status = 200 } = {}) {
  const encoder = new TextEncoder();
  let i = 0;
  return {
    ok,
    status,
    body: {
      getReader: () => ({
        read: async () =>
          i < textChunks.length
            ? { done: false, value: encoder.encode(textChunks[i++]) }
            : { done: true, value: undefined },
      }),
    },
    text: async () => textChunks.join(''),
  };
}

const BASE = 'https://qwksearch.example';

describe('streamApiRequest', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves the path against the configured base URL', async () => {
    const fetchMock = vi.fn(async () => streamingResponse(['ok']));
    vi.stubGlobal('fetch', fetchMock);
    const { spies } = callbacks();

    await streamApiRequest(BASE, 'key', { method: 'POST', path: '/api/agent/chat' }, new AbortController().signal, spies);

    expect(fetchMock.mock.calls[0][0]).toBe('https://qwksearch.example/api/agent/chat');
  });

  it('attaches the bearer token when an API key is configured', async () => {
    const fetchMock = vi.fn(async () => streamingResponse(['ok']));
    vi.stubGlobal('fetch', fetchMock);
    const { spies } = callbacks();

    await streamApiRequest(BASE, 'secret', { method: 'GET', path: '/api/config' }, new AbortController().signal, spies);

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret');
  });

  it('omits the Authorization header when there is no API key', async () => {
    const fetchMock = vi.fn(async () => streamingResponse(['ok']));
    vi.stubGlobal('fetch', fetchMock);
    const { spies } = callbacks();

    await streamApiRequest(BASE, undefined, { method: 'GET', path: '/api/config' }, new AbortController().signal, spies);

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('serializes a JSON body, and sends none when the body is undefined', async () => {
    const fetchMock = vi.fn(async () => streamingResponse(['ok']));
    vi.stubGlobal('fetch', fetchMock);
    const { spies } = callbacks();

    await streamApiRequest(BASE, 'k', { method: 'POST', path: '/a', body: { q: 'hi' } }, new AbortController().signal, spies);
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBe('{"q":"hi"}');

    await streamApiRequest(BASE, 'k', { method: 'GET', path: '/a' }, new AbortController().signal, spies);
    expect((fetchMock.mock.calls[1][1] as RequestInit).body).toBeUndefined();
  });

  it('forwards each decoded chunk and then reports completion', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => streamingResponse(['{"a":1}\n', '{"b":2}\n'])));
    const { spies, chunks } = callbacks();

    await streamApiRequest(BASE, 'k', { method: 'POST', path: '/a' }, new AbortController().signal, spies);

    expect(chunks).toEqual(['{"a":1}\n', '{"b":2}\n']);
    expect(spies.onDone).toHaveBeenCalledWith(200);
    expect(spies.onError).not.toHaveBeenCalled();
  });

  it('handles a bodyless response by forwarding its text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 204, body: null, text: async () => 'plain' }))
    );
    const { spies, chunks } = callbacks();

    await streamApiRequest(BASE, 'k', { method: 'GET', path: '/a' }, new AbortController().signal, spies);

    expect(chunks).toEqual(['plain']);
    expect(spies.onDone).toHaveBeenCalledWith(204);
  });

  it('does not emit an empty chunk for an empty bodyless response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 204, body: null, text: async () => '' }))
    );
    const { spies } = callbacks();

    await streamApiRequest(BASE, 'k', { method: 'GET', path: '/a' }, new AbortController().signal, spies);

    expect(spies.onChunk).not.toHaveBeenCalled();
    expect(spies.onDone).toHaveBeenCalledWith(204);
  });

  it('reports the response body as the error on a failed request', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => streamingResponse(['rate limited'], { ok: false, status: 429 })));
    const { spies } = callbacks();

    await streamApiRequest(BASE, 'k', { method: 'POST', path: '/a' }, new AbortController().signal, spies);

    expect(spies.onError).toHaveBeenCalledWith('rate limited');
    expect(spies.onDone).not.toHaveBeenCalled();
  });

  it('falls back to the status code when the error body is empty', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => streamingResponse([''], { ok: false, status: 500 })));
    const { spies } = callbacks();

    await streamApiRequest(BASE, 'k', { method: 'POST', path: '/a' }, new AbortController().signal, spies);

    expect(spies.onError).toHaveBeenCalledWith('Request failed with status 500');
  });

  it('stays silent when the request is aborted', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        throw error;
      })
    );
    const { spies } = callbacks();

    await streamApiRequest(BASE, 'k', { method: 'POST', path: '/a' }, new AbortController().signal, spies);

    expect(spies.onError).not.toHaveBeenCalled();
    expect(spies.onDone).not.toHaveBeenCalled();
  });

  it('reports a network failure through onError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('socket hang up');
    }));
    const { spies } = callbacks();

    await streamApiRequest(BASE, 'k', { method: 'POST', path: '/a' }, new AbortController().signal, spies);

    expect(spies.onError).toHaveBeenCalledWith('socket hang up');
  });

  it('stringifies a non-Error throw', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw 'unexpected';
    }));
    const { spies } = callbacks();

    await streamApiRequest(BASE, 'k', { method: 'POST', path: '/a' }, new AbortController().signal, spies);

    expect(spies.onError).toHaveBeenCalledWith('unexpected');
  });

  it('passes the abort signal through to fetch', async () => {
    const fetchMock = vi.fn(async () => streamingResponse(['ok']));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    const { spies } = callbacks();

    await streamApiRequest(BASE, 'k', { method: 'POST', path: '/a' }, controller.signal, spies);

    expect((fetchMock.mock.calls[0][1] as RequestInit).signal).toBe(controller.signal);
  });
});
