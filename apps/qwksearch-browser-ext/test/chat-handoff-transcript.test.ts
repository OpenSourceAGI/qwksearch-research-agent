import { describe, expect, it } from 'vitest';
import { elementToMarkdown, elementToPlainText } from '../content/chat-handoff/markdown';
import {
  SOFT_LIMIT_CHARS,
  buildHandoffPrompt,
  estimateTokens,
  formatTranscript,
  normalizeMessages,
  truncateMessages,
} from '../content/chat-handoff/transcript';
import type { ChatMessage } from '../content/chat-handoff/types';

function md(html: string) {
  const root = document.createElement('div');
  root.innerHTML = html;
  return elementToMarkdown(root);
}

describe('elementToMarkdown', () => {
  it('converts headings, emphasis and links', () => {
    expect(md('<h2>Title</h2><p>A <em>b</em> <a href="https://x.dev/a">link</a></p>')).toBe(
      '## Title\n\nA *b* [link](https://x.dev/a)'
    );
  });

  it('keeps code blocks verbatim with their language, and lengthens the fence around backticks', () => {
    const out = md('<pre><code class="language-js">const a = `x`;\n\n\n  b();</code></pre>');

    expect(out).toBe('```js\nconst a = `x`;\n\n\n  b();\n```');
    expect(md('<pre><code>```\nhi\n```</code></pre>').startsWith('````')).toBe(true);
  });

  it('renders ordered and nested lists', () => {
    expect(md('<ol><li>one<ul><li>inner</li></ul></li><li>two</li></ol>')).toBe('1. one\n  - inner\n2. two');
  });

  it('renders tables and blockquotes', () => {
    expect(md('<table><tr><th>a</th><th>b</th></tr><tr><td>1</td><td>2</td></tr></table>')).toBe(
      '| a | b |\n| --- | --- |\n| 1 | 2 |'
    );
    expect(md('<blockquote><p>quoted</p></blockquote>')).toBe('> quoted');
  });

  it('skips scripts, buttons and screen-reader-only text', () => {
    expect(md('<p>keep</p><button>Copy</button><script>x()</script><span class="sr-only">hidden</span>')).toBe('keep');
  });
});

describe('normalizeMessages', () => {
  it('drops empty turns and exact repeats of the previous turn', () => {
    const out = normalizeMessages([
      { role: 'user', text: '  hi \r\n' },
      { role: 'user', text: 'hi' },
      { role: 'assistant', text: '   ' },
      { role: 'assistant', text: 'hello' },
    ]);

    expect(out).toEqual([
      { role: 'user', text: 'hi' },
      { role: 'assistant', text: 'hello' },
    ]);
  });
});

describe('formatTranscript', () => {
  const messages: ChatMessage[] = [
    { role: 'user', text: 'Q' },
    { role: 'assistant', text: 'A' },
  ];

  it('labels each turn and ends with a newline', () => {
    expect(formatTranscript(messages)).toBe('## User\n\nQ\n\n## Assistant\n\nA\n');
  });

  it('adds a title and notes omitted turns', () => {
    const out = formatTranscript(messages, { source: 'Claude', omitted: 3 });

    expect(out).toContain('# Conversation with Claude');
    expect(out).toContain('The 3 earliest messages were omitted');
  });
});

describe('truncateMessages', () => {
  const turn = (i: number, size: number): ChatMessage => ({ role: i % 2 ? 'assistant' : 'user', text: `${i}:`.padEnd(size, 'x') });

  it('keeps everything that fits', () => {
    const messages = [turn(0, 100), turn(1, 100)];

    expect(truncateMessages(messages, 1000)).toEqual({ messages, omitted: 0 });
  });

  it('drops the oldest whole turns first', () => {
    const messages = [turn(0, 500), turn(1, 500), turn(2, 500), turn(3, 500)];
    const out = truncateMessages(messages, 1100);

    expect(out.omitted).toBe(2);
    expect(out.messages.map((m) => m.text[0])).toEqual(['2', '3']);
  });

  it('always keeps the newest turn even when it alone is over the limit', () => {
    const out = truncateMessages([turn(0, 10), turn(1, 5000)], 100);

    expect(out.messages).toHaveLength(1);
    expect(out.messages[0].text[0]).toBe('1');
    expect(out.omitted).toBe(1);
  });

  it('defaults to the soft limit', () => {
    const messages = Array.from({ length: 20 }, (_, i) => turn(i, 10_000));

    const out = truncateMessages(messages);

    expect(out.messages.length * 10_016).toBeLessThanOrEqual(SOFT_LIMIT_CHARS);
    expect(out.omitted + out.messages.length).toBe(20);
  });
});

describe('buildHandoffPrompt', () => {
  it('puts an instruction before the transcript', () => {
    const out = buildHandoffPrompt('## User\n\nhi\n', 'ChatGPT');

    expect(out.startsWith('Below is a conversation I was having with ChatGPT.')).toBe(true);
    expect(out.endsWith('## User\n\nhi\n')).toBe(true);
  });

  it('estimates tokens at four characters each', () => {
    expect(estimateTokens(401)).toBe(101);
  });
});

describe('elementToPlainText', () => {
  it('keeps the typed line breaks and does not add Markdown', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div class="whitespace-pre-wrap">line one\n  indented\n# not a heading</div>';

    expect(elementToPlainText(root)).toBe('line one\n  indented\n# not a heading');
  });

  it('turns <br> and blocks into newlines and skips hidden labels', () => {
    const root = document.createElement('div');
    root.innerHTML = '<h2 class="cdk-visually-hidden">You said</h2><p>a<br>b</p><p>c</p>';

    expect(elementToPlainText(root)).toBe('a\nb\n\nc');
  });
});
