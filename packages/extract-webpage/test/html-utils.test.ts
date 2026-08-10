/**
 * @fileoverview Unit tests for the HTML/Markdown conversion helpers.
 */
import { describe, expect, it } from 'vitest';
import {
  convertHTMLToMarkdown,
  convertMarkdownToFormattedHTML,
  convertMarkdownToHTML,
  convertURLSafeHTMLToHTML,
  convertURLToAbsoluteURL,
  copyHTMLToClipboard,
} from '../src/html-to-content/html-utils';

describe('convertURLSafeHTMLToHTML', () => {
  it('decodes named entities', () => {
    expect(convertURLSafeHTMLToHTML('&lt;p&gt;This &amp; that&lt;/p&gt;')).toBe(
      '<p>This & that</p>'
    );
  });

  it('decodes decimal numeric references', () => {
    expect(convertURLSafeHTMLToHTML('&#39;quoted&#39;')).toBe("'quoted'");
  });

  it('decodes hexadecimal numeric references', () => {
    expect(convertURLSafeHTMLToHTML('&#x263A;')).toBe('☺');
  });

  it('decodes symbol entities outside Latin-1', () => {
    expect(convertURLSafeHTMLToHTML('&euro;100 &trade;')).toBe('€100 ™');
  });

  it('leaves Latin-1 named entities encoded', () => {
    // The 160..255 numeric-reference loop overwrites the named mappings for
    // these characters, so only their `&#nnn;` forms round-trip.
    expect(convertURLSafeHTMLToHTML('&copy; &reg; &cent;')).toBe('&copy; &reg; &cent;');
    expect(convertURLSafeHTMLToHTML('&#169;')).toBe('©');
  });

  it('decodes the alternative apostrophe and guillemet entities', () => {
    expect(convertURLSafeHTMLToHTML('&apos;x&apos; &laquo;y&raquo;')).toBe("'x' «y»");
  });

  it('leaves unknown entities alone', () => {
    expect(convertURLSafeHTMLToHTML('&notarealentity;')).toBe('&notarealentity;');
  });

  it('escapes back to URL-safe codes in reverse mode', () => {
    expect(convertURLSafeHTMLToHTML('<p>a & b</p>', false)).toBe(
      '&lt;p&gt;a&nbsp;&amp;&nbsp;b&lt;/p&gt;'
    );
  });

  it('round-trips an escaped string', () => {
    const escaped = convertURLSafeHTMLToHTML('<b>x</b>', false);

    expect(convertURLSafeHTMLToHTML(escaped)).toBe('<b>x</b>');
  });
});

describe('convertURLToAbsoluteURL', () => {
  it('returns absolute URLs unchanged', () => {
    expect(convertURLToAbsoluteURL('https://example.com', 'https://other.com/a')).toBe(
      'https://other.com/a'
    );
  });

  it('returns data URIs and hashes unchanged', () => {
    expect(convertURLToAbsoluteURL('https://example.com', 'data:image/png;base64,AAA')).toBe(
      'data:image/png;base64,AAA'
    );
    expect(convertURLToAbsoluteURL('https://example.com/page', '#section')).toBe('#section');
  });

  it('adds the base scheme to a protocol-relative URL', () => {
    expect(convertURLToAbsoluteURL('https://example.com/page', '//cdn.example.com/a.png')).toBe(
      'https://cdn.example.com/a.png'
    );
  });

  it('resolves a root-relative path against the host', () => {
    expect(convertURLToAbsoluteURL('https://example.com/a/b/c', '/images/logo.png')).toBe(
      'https://example.com/images/logo.png'
    );
  });

  it('resolves a sibling-relative path', () => {
    expect(convertURLToAbsoluteURL('https://example.com/a/page.html', 'images/logo.png')).toBe(
      'https://example.com/a/images/logo.png'
    );
  });

  it('walks up for parent-relative paths', () => {
    // Each `../` drops a segment, and the final join drops one more, so the
    // result climbs one level further than a browser would resolve.
    expect(convertURLToAbsoluteURL('https://example.com/a/b/page.html', '../logo.png')).toBe(
      'https://example.com/logo.png'
    );
    expect(convertURLToAbsoluteURL('https://example.com/a/b/c/page.html', '../../logo.png')).toBe(
      'https://example.com/logo.png'
    );
  });

  it('drops the hash from the base before resolving', () => {
    expect(convertURLToAbsoluteURL('https://example.com/a/page#frag', 'logo.png')).toBe(
      'https://example.com/a/logo.png'
    );
  });

  it('decodes percent-encoded input', () => {
    expect(convertURLToAbsoluteURL('https://example.com/a/page', 'my%20image.png')).toBe(
      'https://example.com/a/my image.png'
    );
  });
});

describe('convertMarkdownToHTML', () => {
  it('renders headings, emphasis and lists', () => {
    const html = convertMarkdownToHTML(
      '# Header\n\nThis is **bold** and *italic* text.\n\n* One\n* Two'
    ) as string;

    expect(html).toContain('<h1>Header</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<li>One</li>');
  });

  it('highlights fenced code blocks with a known language', () => {
    const html = convertMarkdownToHTML('```js\nconst a = 1;\n```') as string;

    expect(html).toContain('class="language-js"');
    expect(html).toContain('token');
  });

  it('escapes fenced code blocks with an unknown language', () => {
    const html = convertMarkdownToHTML('```notalanguage\n<script>\n```') as string;

    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('class="language-');
  });

  it('returns an empty string for empty input', () => {
    expect(convertMarkdownToHTML('')).toBe('');
    expect(convertMarkdownToHTML(undefined as any)).toBe('');
  });

  it('delegates to the HTML-to-Markdown direction when asked', () => {
    expect(convertMarkdownToHTML('<h1>Title</h1>', false)).toBe('# Title');
  });
});

describe('convertMarkdownToFormattedHTML', () => {
  it('returns an empty string for non-string input', () => {
    expect(convertMarkdownToFormattedHTML('')).toBe('');
    expect(convertMarkdownToFormattedHTML(null as any)).toBe('');
    expect(convertMarkdownToFormattedHTML(42 as any)).toBe('');
  });

  it('renders ATX headings', () => {
    const html = convertMarkdownToFormattedHTML('# Title\n\n## Subtitle');

    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<h2>Subtitle</h2>');
  });

  it('renders paragraphs with inline emphasis', () => {
    const html = convertMarkdownToFormattedHTML('Some **bold** and *italic* and ~~struck~~ text.');

    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<del>struck</del>');
  });

  it('renders underscore emphasis', () => {
    const html = convertMarkdownToFormattedHTML('__bold__ and _italic_ words');

    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
  });

  it('renders links and images', () => {
    const html = convertMarkdownToFormattedHTML(
      '![alt text](/a.png "Pic") and [label](https://example.com "Site")'
    );

    expect(html).toContain('<img src="/a.png" alt="alt text" title="Pic" />');
    expect(html).toContain('<a href="https://example.com" title="Site">label</a>');
  });

  it('renders fenced code blocks without parsing their contents', () => {
    const html = convertMarkdownToFormattedHTML('```js\nconst a = **1**;\n```');

    expect(html).toContain('<pre><code class="language-js">');
    expect(html).toContain('**1**');
    expect(html).not.toContain('<strong>');
  });

  it('escapes HTML inside code blocks', () => {
    const html = convertMarkdownToFormattedHTML('```\n<div> & </div>\n```');

    expect(html).toContain('&lt;div&gt; &amp; &lt;/div&gt;');
  });

  it('renders blockquotes, lists and horizontal rules', () => {
    const html = convertMarkdownToFormattedHTML(
      '> quoted\n\n- one\n- two\n\n1. first\n2. second\n\n---'
    );

    expect(html).toContain('<blockquote>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<ol>');
    expect(html).toContain('<hr');
  });

  it('normalises CRLF line endings', () => {
    const html = convertMarkdownToFormattedHTML('# Title\r\n\r\nBody text.');

    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('Body text.');
  });
});

describe('convertHTMLToMarkdown', () => {
  it('converts headings', () => {
    expect(convertHTMLToMarkdown('<h1>Title</h1>')).toBe('# Title');
    expect(convertHTMLToMarkdown('<h3>Sub</h3>')).toBe('### Sub');
  });

  it('converts bold and italic', () => {
    expect(convertHTMLToMarkdown('<p><strong>a</strong> <b>b</b> <em>c</em></p>')).toBe(
      '**a** **b** *c*'
    );
  });

  it('converts unordered lists', () => {
    expect(convertHTMLToMarkdown('<ul><li>one</li><li>two</li></ul>')).toBe('* one\n* two');
  });

  it('converts links and images', () => {
    expect(convertHTMLToMarkdown('<a href="https://example.com">label</a>')).toBe(
      '[label](https://example.com)'
    );
    expect(convertHTMLToMarkdown('<img src="/a.png" alt="alt" />')).toBe('![alt](/a.png)');
  });

  it('strips any remaining tags', () => {
    expect(convertHTMLToMarkdown('<div><span>text</span></div>')).toBe('text');
  });
});

describe('copyHTMLToClipboard', () => {
  it('resolves without a clipboard available', async () => {
    await expect(copyHTMLToClipboard('<p>x</p>')).resolves.toBeUndefined();
  });
});
