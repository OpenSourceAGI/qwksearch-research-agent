// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The webview talks to the extension host through `acquireVsCodeApi()`, which
 * only exists inside a real webview. Install the stub before importing the
 * modules under test, since vscodeApi captures it at construction time.
 */
const postMessage = vi.fn();
vi.stubGlobal('acquireVsCodeApi', () => ({ postMessage }));

const { apiRequest, cancelRequest } = await import('../webview-ui/src/useApi');
const { bridge } = await import('../webview-ui/src/useExtensionMessages');
const { apiRequestJson } = await import('../webview-ui/src/apiRequestJson');

/** Delivers an inbound message the way the extension host would. */
function inbound(message: unknown) {
  window.dispatchEvent(new MessageEvent('message', { data: message }));
}

function lastPost() {
  return postMessage.mock.calls.at(-1)![0];
}

describe('apiRequest', () => {
  beforeEach(() => {
    postMessage.mockClear();
  });

  it('posts an apiRequest message carrying the method, path and body', () => {
    const { requestId } = apiRequest('POST', '/api/agent/chat', { q: 'hi' });

    expect(lastPost()).toEqual({
      type: 'apiRequest',
      requestId,
      method: 'POST',
      path: '/api/agent/chat',
      body: { q: 'hi' },
    });
  });

  it('issues a unique request id per call', () => {
    const first = apiRequest('GET', '/a').requestId;
    const second = apiRequest('GET', '/a').requestId;

    expect(first).not.toBe(second);
  });

  it('resolves with the status when the host reports completion', async () => {
    const { requestId, done } = apiRequest('GET', '/a');

    inbound({ type: 'apiDone', requestId, status: 200 });

    await expect(done).resolves.toBe(200);
  });

  it('streams chunks to the callback in order', async () => {
    const chunks: string[] = [];
    const { requestId, done } = apiRequest('GET', '/a', undefined, (c) => chunks.push(c));

    inbound({ type: 'apiChunk', requestId, chunk: 'one' });
    inbound({ type: 'apiChunk', requestId, chunk: 'two' });
    inbound({ type: 'apiDone', requestId, status: 200 });

    await done;
    expect(chunks).toEqual(['one', 'two']);
  });

  it('rejects with the reported error', async () => {
    const { requestId, done } = apiRequest('GET', '/a');

    inbound({ type: 'apiError', requestId, error: 'upstream exploded' });

    await expect(done).rejects.toThrow('upstream exploded');
  });

  it('ignores messages addressed to a different request', async () => {
    const chunks: string[] = [];
    const { requestId, done } = apiRequest('GET', '/a', undefined, (c) => chunks.push(c));

    inbound({ type: 'apiChunk', requestId: 'someone-else', chunk: 'not mine' });
    inbound({ type: 'apiDone', requestId, status: 200 });

    await done;
    expect(chunks).toEqual([]);
  });

  it('ignores unrelated inbound message types', () => {
    expect(() => inbound({ type: 'authState', authenticated: true })).not.toThrow();
  });

  it('drops further messages once a request has settled', async () => {
    const chunks: string[] = [];
    const { requestId, done } = apiRequest('GET', '/a', undefined, (c) => chunks.push(c));

    inbound({ type: 'apiDone', requestId, status: 200 });
    await done;
    inbound({ type: 'apiChunk', requestId, chunk: 'late' });

    expect(chunks).toEqual([]);
  });

  it('tolerates a request with no chunk callback', async () => {
    const { requestId, done } = apiRequest('GET', '/a');

    inbound({ type: 'apiChunk', requestId, chunk: 'ignored' });
    inbound({ type: 'apiDone', requestId, status: 204 });

    await expect(done).resolves.toBe(204);
  });
});

describe('cancelRequest', () => {
  beforeEach(() => {
    postMessage.mockClear();
  });

  it('posts a cancelRequest message', () => {
    cancelRequest('req_99');

    expect(lastPost()).toEqual({ type: 'cancelRequest', requestId: 'req_99' });
  });

  it('detaches the request so late messages are ignored', async () => {
    const chunks: string[] = [];
    const { requestId } = apiRequest('GET', '/a', undefined, (c) => chunks.push(c));

    cancelRequest(requestId);
    inbound({ type: 'apiChunk', requestId, chunk: 'late' });

    expect(chunks).toEqual([]);
  });
});

describe('bridge', () => {
  it('fans a message out to every subscriber', () => {
    const first = vi.fn();
    const second = vi.fn();
    const unsubFirst = bridge.subscribe(first);
    const unsubSecond = bridge.subscribe(second);

    inbound({ type: 'authState', authenticated: true });

    expect(first).toHaveBeenCalledWith({ type: 'authState', authenticated: true });
    expect(second).toHaveBeenCalledTimes(1);
    unsubFirst();
    unsubSecond();
  });

  it('stops delivering after unsubscribe', () => {
    const listener = vi.fn();
    bridge.subscribe(listener)();

    inbound({ type: 'authState', authenticated: true });

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('apiRequestJson', () => {
  beforeEach(() => {
    postMessage.mockClear();
  });

  it('buffers the streamed body and parses it as JSON', async () => {
    const promise = apiRequestJson('GET', '/api/config');
    const { requestId } = lastPost();

    inbound({ type: 'apiChunk', requestId, chunk: '{"focus"' });
    inbound({ type: 'apiChunk', requestId, chunk: ':"web"}' });
    inbound({ type: 'apiDone', requestId, status: 200 });

    await expect(promise).resolves.toEqual({ focus: 'web' });
  });

  it('resolves to undefined for an empty body', async () => {
    const promise = apiRequestJson('GET', '/api/config');
    const { requestId } = lastPost();

    inbound({ type: 'apiDone', requestId, status: 204 });

    await expect(promise).resolves.toBeUndefined();
  });

  it('throws on a 4xx or 5xx status', async () => {
    const promise = apiRequestJson('GET', '/api/config');
    const { requestId } = lastPost();

    inbound({ type: 'apiDone', requestId, status: 403 });

    await expect(promise).rejects.toThrow('Request to /api/config failed with status 403');
  });

  it('propagates a transport error', async () => {
    const promise = apiRequestJson('GET', '/api/config');
    const { requestId } = lastPost();

    inbound({ type: 'apiError', requestId, error: 'offline' });

    await expect(promise).rejects.toThrow('offline');
  });
});
