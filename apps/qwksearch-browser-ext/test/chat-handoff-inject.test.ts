import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatHandoffController } from '../content/chat-handoff/inject';
import { getProvider, otherProviders } from '../content/chat-handoff/providers';
import { HOST_ID, Toast } from '../content/chat-handoff/ui';
import { isDarkPage } from '../content/chat-handoff/theme';

const fixture = (id: string) =>
  readFileSync(resolve(import.meta.dirname, 'fixtures/chat-handoff', `${id}.html`), 'utf8');

const hosts = () => document.querySelectorAll(`#${HOST_ID}`);
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

function menuOf(host: Element) {
  return host.shadowRoot!.querySelector<HTMLElement>('.menu')!;
}
function triggerOf(host: Element) {
  return host.shadowRoot!.querySelector<HTMLButtonElement>('.trigger')!;
}

describe('ChatHandoffController', () => {
  let sendMessage: ReturnType<typeof vi.fn>;
  let writeText: ReturnType<typeof vi.fn>;
  let controller: ChatHandoffController | null = null;

  beforeEach(() => {
    document.body.innerHTML = fixture('claude');
    document.documentElement.className = '';
    sendMessage = vi.fn(async () => ({ ok: true, mode: 'url' }));
    writeText = vi.fn(async () => undefined);
    vi.stubGlobal('chrome', { runtime: { sendMessage } });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  });

  afterEach(() => {
    controller?.stop();
    controller = null;
    document.getElementById('qwksearch-chat-handoff-toast')?.remove();
  });

  function start(id = 'claude') {
    controller = new ChatHandoffController(document, getProvider(id)!, new Toast(document));
    controller.start();
    return controller;
  }

  it('inserts the button directly after the composer', () => {
    start();

    const host = document.getElementById(HOST_ID)!;
    expect(host.previousElementSibling?.tagName).toBe('FIELDSET');
  });

  it('never duplicates the button, even after repeated checks', () => {
    const c = start();
    c.ensureInjected();
    c.ensureInjected();

    expect(hosts()).toHaveLength(1);
  });

  it('re-injects after the SPA swaps the composer out', async () => {
    start();
    document.body.innerHTML = fixture('claude');
    expect(hosts()).toHaveLength(0);

    await tick(300);

    expect(hosts()).toHaveLength(1);
    expect(document.getElementById(HOST_ID)!.previousElementSibling?.tagName).toBe('FIELDSET');
  });

  it('removes the button when the chat box goes away', async () => {
    start();
    document.body.innerHTML = '<p>Settings</p>';

    await tick(300);

    expect(hosts()).toHaveLength(0);
  });

  it('copies the chat and lists every other provider but not the current one', async () => {
    start();
    const host = document.getElementById(HOST_ID)!;

    triggerOf(host).click();
    await tick(10);

    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText.mock.calls[0][0]).toContain('## User\n\nHow do I reverse a list in Python?');
    const names = Array.from(menuOf(host).querySelectorAll('[role="menuitem"]')).map((i) => i.textContent!.trim());
    expect(names).toEqual(otherProviders('claude').map((p) => p.name));
    expect(names).not.toContain('Claude');
    expect(triggerOf(host).getAttribute('aria-expanded')).toBe('true');
  });

  it('sends the chosen provider and transcript to the background worker', async () => {
    start();
    const host = document.getElementById(HOST_ID)!;
    triggerOf(host).click();
    await tick(10);

    const gemini = Array.from(menuOf(host).querySelectorAll<HTMLElement>('[role="menuitem"]')).find((i) =>
      i.textContent!.includes('Gemini')
    )!;
    gemini.click();
    await tick(10);

    expect(sendMessage).toHaveBeenCalledOnce();
    const message = sendMessage.mock.calls[0][0];
    expect(message.type).toBe('chatHandoff:open');
    expect(message.providerId).toBe('gemini');
    expect(message.text).toMatch(/^Below is a conversation I was having with Claude\./);
    expect(message.text).toContain('## Assistant\n\nUse `my_list.reverse()`.');
    expect(menuOf(host).hidden).toBe(true);
  });

  it('is keyboard operable: arrows move, Escape closes and returns focus to the button', async () => {
    start();
    const host = document.getElementById(HOST_ID)!;
    const trigger = triggerOf(host);
    trigger.focus();

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await tick(10);
    const items = Array.from(menuOf(host).querySelectorAll<HTMLElement>('[role="menuitem"]'));
    expect(host.shadowRoot!.activeElement).toBe(items[0]);

    menuOf(host).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(host.shadowRoot!.activeElement).toBe(items[1]);
    menuOf(host).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    menuOf(host).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(host.shadowRoot!.activeElement).toBe(items[items.length - 1]);

    menuOf(host).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(menuOf(host).hidden).toBe(true);
    expect(host.shadowRoot!.activeElement).toBe(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('tells the user when there is nothing to copy', async () => {
    document.body.innerHTML = '<form><textarea id="chat-input"></textarea></form>';
    start('deepseek');
    const host = document.getElementById(HOST_ID)!;

    triggerOf(host).click();
    await tick(10);

    expect(menuOf(host).hidden).toBe(true);
    expect(writeText).not.toHaveBeenCalled();
    const toast = document.getElementById('qwksearch-chat-handoff-toast')!;
    expect(toast.shadowRoot!.querySelector('[role="status"]')!.textContent).toMatch(/No chat messages/);
  });

  it('warns about long chats and offers to truncate, on by default', async () => {
    const long = '<div data-testid="user-message"><p>' + 'word '.repeat(20_000) + '</p></div>';
    document.body.innerHTML = long + '<fieldset><div contenteditable="true" data-testid="chat-input"></div></fieldset>';
    start();
    const host = document.getElementById(HOST_ID)!;

    triggerOf(host).click();
    await tick(10);

    expect(menuOf(host).querySelector('.warn')!.textContent).toMatch(/Long chat/);
    const toggle = menuOf(host).querySelector('[role="menuitemcheckbox"]')!;
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('follows the page theme', () => {
    document.documentElement.classList.add('dark');
    start();

    expect(document.getElementById(HOST_ID)!.classList.contains('dark')).toBe(true);
  });
});

describe('isDarkPage', () => {
  beforeEach(() => {
    document.documentElement.className = '';
  });

  afterEach(() => {
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    document.body.removeAttribute('style');
  });

  it('reads class and attribute markers', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    expect(isDarkPage(document)).toBe(true);

    document.documentElement.setAttribute('data-theme', 'light');
    expect(isDarkPage(document)).toBe(false);
  });

  it('falls back to the body background', () => {
    document.body.style.backgroundColor = 'rgb(20, 20, 20)';
    expect(isDarkPage(document)).toBe(true);

    document.body.style.backgroundColor = 'rgb(250, 250, 250)';
    expect(isDarkPage(document)).toBe(false);
  });
});
