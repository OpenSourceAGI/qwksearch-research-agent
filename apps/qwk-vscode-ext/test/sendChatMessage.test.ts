// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const postMessage = vi.fn();
vi.stubGlobal('acquireVsCodeApi', () => ({ postMessage }));

const { sendChatMessage } = await import('../webview-ui/src/sendChatMessage');

/** Delivers an inbound message the way the extension host would. */
function inbound(message: unknown) {
  window.dispatchEvent(new MessageEvent('message', { data: message }));
}

function lastRequestId(): string {
  return postMessage.mock.calls.at(-1)![0].requestId;
}

function callbacks() {
  return {
    onSearching: vi.fn(),
    onSources: vi.fn(),
    onAssistantChunk: vi.fn(),
    onDone: vi.fn(),
    onError: vi.fn(),
  };
}

const PARAMS = {
  chatId: 'chat-1',
  content: 'What is a docling?',
  history: [['human', 'hi']] as [string, string][],
  focusMode: 'webSearch',
  category: 'general',
  chatModel: { key: 'openrouter/free', providerId: 'p1' },
};

/** Feeds NDJSON text to the in-flight request's chunk handler. */
function stream(requestId: string, text: string) {
  inbound({ type: 'apiChunk', requestId, chunk: text });
}

describe('sendChatMessage', () => {
  beforeEach(() => {
    postMessage.mockClear();
  });

  it('POSTs to /api/agent/chat', () => {
    sendChatMessage(PARAMS, callbacks());
    const sent = postMessage.mock.calls.at(-1)![0];

    expect(sent.method).toBe('POST');
    expect(sent.path).toBe('/api/agent/chat');
  });

  it('sends the chat parameters in the request body', () => {
    const { userMessageId } = sendChatMessage(PARAMS, callbacks());
    const body = postMessage.mock.calls.at(-1)![0].body;

    expect(body).toMatchObject({
      content: 'What is a docling?',
      chatId: 'chat-1',
      focusMode: 'webSearch',
      category: 'general',
      optimizationMode: 'balanced',
      history: [['human', 'hi']],
      chatModel: { key: 'openrouter/free', providerId: 'p1' },
    });
    expect(body.message).toEqual({
      messageId: userMessageId,
      chatId: 'chat-1',
      content: 'What is a docling?',
    });
  });

  it('generates a 14 character hex user message id', () => {
    const { userMessageId } = sendChatMessage(PARAMS, callbacks());

    expect(userMessageId).toMatch(/^[0-9a-f]{14}$/);
  });

  it('generates a distinct id per message', () => {
    const first = sendChatMessage(PARAMS, callbacks()).userMessageId;
    const second = sendChatMessage(PARAMS, callbacks()).userMessageId;

    expect(first).not.toBe(second);
  });

  it('reports search progress events', () => {
    const cb = callbacks();
    sendChatMessage(PARAMS, cb);
    const id = lastRequestId();

    stream(id, JSON.stringify({ type: 'searching', messageId: 'm1', data: { query: 'docling', status: 'running' } }) + '\n');

    expect(cb.onSearching).toHaveBeenCalledWith('m1', 'docling', 'running');
  });

  it('reports sources, defaulting to an empty list', () => {
    const cb = callbacks();
    sendChatMessage(PARAMS, cb);
    const id = lastRequestId();

    stream(id, JSON.stringify({ type: 'sources', messageId: 'm1', data: [{ metadata: { url: 'https://a' } }] }) + '\n');
    stream(id, JSON.stringify({ type: 'sources', messageId: 'm2' }) + '\n');

    expect(cb.onSources).toHaveBeenNthCalledWith(1, 'm1', [{ metadata: { url: 'https://a' } }]);
    expect(cb.onSources).toHaveBeenNthCalledWith(2, 'm2', []);
  });

  it('flags only the first chunk of an assistant message as first', () => {
    const cb = callbacks();
    sendChatMessage(PARAMS, cb);
    const id = lastRequestId();

    stream(id, JSON.stringify({ type: 'message', messageId: 'm1', data: 'Hello' }) + '\n');
    stream(id, JSON.stringify({ type: 'message', messageId: 'm1', data: ' world' }) + '\n');

    expect(cb.onAssistantChunk).toHaveBeenNthCalledWith(1, 'm1', 'Hello', true);
    expect(cb.onAssistantChunk).toHaveBeenNthCalledWith(2, 'm1', ' world', false);
  });

  it('treats a new messageId as the start of a new assistant message', () => {
    const cb = callbacks();
    sendChatMessage(PARAMS, cb);
    const id = lastRequestId();

    stream(id, JSON.stringify({ type: 'message', messageId: 'm1', data: 'a' }) + '\n');
    stream(id, JSON.stringify({ type: 'message', messageId: 'm2', data: 'b' }) + '\n');

    expect(cb.onAssistantChunk).toHaveBeenNthCalledWith(2, 'm2', 'b', true);
  });

  it('reassembles an event split across chunk boundaries', () => {
    const cb = callbacks();
    sendChatMessage(PARAMS, cb);
    const id = lastRequestId();

    stream(id, '{"type":"message","messageId":"m1",');
    expect(cb.onAssistantChunk).not.toHaveBeenCalled();

    stream(id, '"data":"Hello"}\n');
    expect(cb.onAssistantChunk).toHaveBeenCalledWith('m1', 'Hello', true);
  });

  it('handles several events arriving in one chunk', () => {
    const cb = callbacks();
    sendChatMessage(PARAMS, cb);
    const id = lastRequestId();

    stream(
      id,
      `${JSON.stringify({ type: 'sources', messageId: 'm1', data: [] })}\n${JSON.stringify({ type: 'message', messageId: 'm1', data: 'hi' })}\n`
    );

    expect(cb.onSources).toHaveBeenCalledTimes(1);
    expect(cb.onAssistantChunk).toHaveBeenCalledTimes(1);
  });

  it('skips blank and malformed lines instead of throwing', () => {
    const cb = callbacks();
    sendChatMessage(PARAMS, cb);
    const id = lastRequestId();

    expect(() => stream(id, '\n   \nnot json\n')).not.toThrow();
    expect(cb.onError).not.toHaveBeenCalled();
  });

  it('surfaces a stream error event', () => {
    const cb = callbacks();
    sendChatMessage(PARAMS, cb);
    const id = lastRequestId();

    stream(id, JSON.stringify({ type: 'error', data: 'model unavailable' }) + '\n');

    expect(cb.onError).toHaveBeenCalledWith('model unavailable');
  });

  it('falls back to a generic message for a non-string error payload', () => {
    const cb = callbacks();
    sendChatMessage(PARAMS, cb);
    const id = lastRequestId();

    stream(id, JSON.stringify({ type: 'error', data: { code: 500 } }) + '\n');

    expect(cb.onError).toHaveBeenCalledWith('Something went wrong.');
  });

  it('ignores messageEnd events', () => {
    const cb = callbacks();
    sendChatMessage(PARAMS, cb);
    const id = lastRequestId();

    stream(id, JSON.stringify({ type: 'messageEnd', messageId: 'm1' }) + '\n');

    expect(cb.onAssistantChunk).not.toHaveBeenCalled();
    expect(cb.onError).not.toHaveBeenCalled();
  });

  it('calls onDone when the request completes', async () => {
    const cb = callbacks();
    sendChatMessage(PARAMS, cb);
    const id = lastRequestId();

    inbound({ type: 'apiDone', requestId: id, status: 200 });
    await vi.waitFor(() => expect(cb.onDone).toHaveBeenCalledTimes(1));
  });

  it('calls onError when the request fails', async () => {
    const cb = callbacks();
    sendChatMessage(PARAMS, cb);
    const id = lastRequestId();

    inbound({ type: 'apiError', requestId: id, error: 'proxy died' });
    await vi.waitFor(() => expect(cb.onError).toHaveBeenCalledWith('proxy died'));
    expect(cb.onDone).not.toHaveBeenCalled();
  });
});
