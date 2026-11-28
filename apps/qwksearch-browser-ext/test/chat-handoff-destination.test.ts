import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { completePendingHandoff } from '../content/chat-handoff/destination';
import { getProvider } from '../content/chat-handoff/providers';
import { Toast } from '../content/chat-handoff/ui';

const TOAST_ID = 'qwksearch-chat-handoff-toast';
const toastText = () => document.getElementById(TOAST_ID)?.shadowRoot?.querySelector('[role="status"]')?.textContent ?? '';

function claim(pending: unknown) {
  vi.stubGlobal('chrome', { runtime: { sendMessage: vi.fn(async () => ({ pending })) } });
}

describe('completePendingHandoff', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div><textarea id="chat-input"></textarea></div>';
  });
  afterEach(() => {
    document.getElementById(TOAST_ID)?.remove();
    vi.useRealTimers();
  });

  const run = (providerId = 'deepseek') =>
    completePendingHandoff(document, new Toast(document), getProvider(providerId));

  it('does nothing when no handoff is waiting for this tab', async () => {
    claim(null);

    await run();

    expect(toastText()).toBe('');
    expect(document.querySelector('textarea')!.value).toBe('');
  });

  it('ignores a handoff meant for another provider', async () => {
    claim({ providerId: 'claude', mode: 'fill', text: 'secret' });

    await run('deepseek');

    expect(document.querySelector('textarea')!.value).toBe('');
  });

  it('pastes the transcript into the box and tells the user to press Enter', async () => {
    claim({ providerId: 'deepseek', mode: 'fill', text: 'Below is a chat' });

    await run();

    expect(document.querySelector('textarea')!.value).toBe('Below is a chat');
    expect(toastText()).toMatch(/press Enter/i);
  });

  it('falls back to a clipboard message when the box cannot be filled', async () => {
    document.body.innerHTML = '<div class="ProseMirror" contenteditable="true"></div>';
    document.execCommand = vi.fn(() => false);
    claim({ providerId: 'mistral', mode: 'fill', text: 'Below is a chat' });

    await run('mistral');

    expect(toastText()).toMatch(/clipboard/i);
    expect(toastText()).toMatch(/Ctrl\+V/);
  });

  it('only shows the clipboard hint for transcripts too long to fill', async () => {
    claim({ providerId: 'deepseek', mode: 'clipboard' });

    await run();

    expect(document.querySelector('textarea')!.value).toBe('');
    expect(toastText()).toMatch(/too long/i);
  });

  it('confirms URL prefill once the prompt has landed', async () => {
    vi.useFakeTimers();
    document.querySelector('textarea')!.value = 'prefilled';
    claim({ providerId: 'deepseek', mode: 'url', text: 'prefilled' });

    const done = run();
    await vi.advanceTimersByTimeAsync(3500);
    await done;

    expect(toastText()).toMatch(/pre-filled/i);
  });

  it('pastes it anyway when URL prefill did not take effect', async () => {
    vi.useFakeTimers();
    claim({ providerId: 'deepseek', mode: 'url', text: 'Below is a chat' });

    const done = run();
    await vi.advanceTimersByTimeAsync(3500);
    await done;

    expect(document.querySelector('textarea')!.value).toBe('Below is a chat');
  });
});
