import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setupChatHandoff } from '../background/chat-handoff';

type Listener = (request: unknown, sender: unknown, sendResponse: (r: unknown) => void) => boolean | void;

function setup() {
  let listener!: Listener;
  const store: Record<string, unknown> = {};
  const create = vi.fn(async () => ({ id: 7 }));
  vi.stubGlobal('chrome', {
    runtime: { onMessage: { addListener: (l: Listener) => (listener = l) } },
    storage: {
      session: {
        get: async (key: string) => ({ [key]: store[key] }),
        set: async (values: Record<string, unknown>) => void Object.assign(store, values),
        remove: async (key: string) => void delete store[key],
      },
    },
    tabs: { create, onRemoved: { addListener: vi.fn() } },
  });
  setupChatHandoff();
  const send = (request: unknown, sender: unknown) =>
    new Promise<any>((resolve) => {
      const keepOpen = listener(request, sender, resolve);
      if (!keepOpen) setTimeout(() => resolve(undefined), 0);
    });
  return { create, send };
}

describe('chat handoff background worker', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('opens the provider tab built from the registry and hands the text to that tab once', async () => {
    const { create, send } = setup();

    const opened = await send(
      { type: 'chatHandoff:open', providerId: 'gemini', text: 'hello', url: 'https://evil.example/' },
      { tab: { id: 1 } }
    );
    expect(opened).toEqual({ ok: true, mode: 'fill' });
    expect(create).toHaveBeenCalledWith({ url: 'https://gemini.google.com/app', active: true, openerTabId: 1 });

    const claimed = await send({ type: 'chatHandoff:claim' }, { tab: { id: 7 }, url: 'https://gemini.google.com/app' });
    expect(claimed.pending).toEqual({ providerId: 'gemini', mode: 'fill', text: 'hello' });

    const again = await send({ type: 'chatHandoff:claim' }, { tab: { id: 7 }, url: 'https://gemini.google.com/app' });
    expect(again.pending).toBeNull();
  });

  it('refuses unknown providers and requests without a tab', async () => {
    const { create, send } = setup();

    expect((await send({ type: 'chatHandoff:open', providerId: 'x', text: 'a' }, { tab: { id: 1 } })).ok).toBe(false);
    expect((await send({ type: 'chatHandoff:open', providerId: 'claude', text: 'a' }, {})).ok).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it('does not release the text to a tab on a different site', async () => {
    const { send } = setup();
    await send({ type: 'chatHandoff:open', providerId: 'gemini', text: 'hello' }, { tab: { id: 1 } });

    const claimed = await send({ type: 'chatHandoff:claim' }, { tab: { id: 7 }, url: 'https://example.com/' });

    expect(claimed.pending).toBeNull();
  });

  it('ignores other message types', async () => {
    const { send } = setup();

    expect(await send({ type: 'openTab' }, {})).toBeUndefined();
  });
});
