import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupMessageApi } from '../content/message-api';

/** Stands in for the `chrome.runtime` bridge available to content scripts. */
function stubChrome(response: unknown = { ok: true }) {
  const sendMessage = vi.fn(async () => response);
  vi.stubGlobal('chrome', { runtime: { sendMessage } });
  return sendMessage;
}

async function invoke(detail: unknown) {
  document.dispatchEvent(new CustomEvent('onInvokeChromeAPI', { detail }));
  // Let the sendMessage promise settle before asserting on the result event.
  await Promise.resolve();
  await Promise.resolve();
}

describe('setupMessageApi', () => {
  // The listener is attached to the shared jsdom `document`, so register it
  // once — calling setup per test would stack duplicate listeners.
  beforeAll(() => {
    setupMessageApi();
  });

  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('forwards the event detail to the background script', async () => {
    const sendMessage = stubChrome();

    await invoke({ action: 'extract', url: 'https://example.com' });

    expect(sendMessage).toHaveBeenCalledWith({ action: 'extract', url: 'https://example.com' });
  });

  it('dispatches the background response back to the page', async () => {
    stubChrome({ title: 'Extracted' });
    const received: unknown[] = [];
    const listener = (e: Event) => received.push((e as CustomEvent).detail);
    document.addEventListener('onExtractionResult', listener);

    await invoke({ action: 'extract' });

    expect(received).toEqual([{ title: 'Extracted' }]);
    document.removeEventListener('onExtractionResult', listener);
  });

  it('handles repeated invocations', async () => {
    const sendMessage = stubChrome();

    await invoke({ action: 'one' });
    await invoke({ action: 'two' });

    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(sendMessage.mock.calls.map(([detail]) => detail)).toEqual([
      { action: 'one' },
      { action: 'two' },
    ]);
  });

  it('ignores unrelated document events', async () => {
    const sendMessage = stubChrome();

    document.dispatchEvent(new CustomEvent('someOtherEvent', { detail: {} }));

    expect(sendMessage).not.toHaveBeenCalled();
  });
});
