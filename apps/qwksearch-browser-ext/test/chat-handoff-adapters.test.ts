import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { ADAPTERS } from '../content/chat-handoff/adapters';
import { CHAT_PROVIDERS } from '../content/chat-handoff/providers';
import { formatTranscript, normalizeMessages } from '../content/chat-handoff/transcript';

const fixture = (id: string) =>
  readFileSync(resolve(import.meta.dirname, 'fixtures/chat-handoff', `${id}.html`), 'utf8');

const ASSISTANT_REPLY = [
  'You can slice it with a negative step:',
  '',
  '```python',
  'reversed_list = my_list[::-1]',
  '```',
  '',
  'Other options:',
  '',
  '- Use `reversed()` for an iterator',
  '- Use **sorted** with `reverse=True`',
].join('\n');

describe.each(CHAT_PROVIDERS.map((p) => [p.id, p.name] as const))('%s adapter', (id) => {
  const adapter = ADAPTERS[id];

  beforeEach(() => {
    document.body.innerHTML = fixture(id);
  });

  it('extracts every turn in order with its role', () => {
    const messages = normalizeMessages(adapter.extractMessages(document));

    expect(messages).toEqual([
      { role: 'user', text: 'How do I reverse a list in Python?' },
      { role: 'assistant', text: ASSISTANT_REPLY },
      { role: 'user', text: 'And in place?' },
      { role: 'assistant', text: 'Use `my_list.reverse()`.' },
    ]);
  });

  it('leaves copy buttons, hidden labels and thinking blocks out of the text', () => {
    const all = adapter.extractMessages(document).map((m) => m.text).join('\n');

    expect(all).not.toMatch(/Copy|You said|Gemini said|thinking/);
  });

  it('finds the prompt box and a place for the button after it', () => {
    const input = adapter.findInput(document);
    expect(input).not.toBeNull();

    const anchor = adapter.findAnchor?.(document, input!) ?? input!;
    expect(anchor.contains(input!)).toBe(true);
    expect(anchor.parentElement).not.toBeNull();
  });

  it('returns nothing on a page with no conversation', () => {
    document.body.innerHTML = '<p>Home</p>';

    expect(adapter.extractMessages(document)).toEqual([]);
    expect(adapter.findInput(document)).toBeNull();
  });

  it('formats as a markdown transcript', () => {
    const text = formatTranscript(normalizeMessages(adapter.extractMessages(document)));

    expect(text.startsWith('## User\n\nHow do I reverse a list in Python?\n\n## Assistant\n\nYou can slice')).toBe(true);
    expect(text.trimEnd().endsWith('## Assistant\n\nUse `my_list.reverse()`.')).toBe(true);
  });
});

describe('anchor placement', () => {
  it('uses the whole composer, not the editable element', () => {
    document.body.innerHTML = fixture('claude');
    const input = ADAPTERS.claude.findInput(document)!;

    expect(ADAPTERS.claude.findAnchor!(document, input).tagName).toBe('FIELDSET');

    document.body.innerHTML = fixture('chatgpt');
    const gptInput = ADAPTERS.chatgpt.findInput(document)!;

    expect(ADAPTERS.chatgpt.findAnchor!(document, gptInput).tagName).toBe('FORM');
  });
});
