/**
 * @fileoverview Unit tests for the HTML tokenizer, the basic-HTML reducer and
 * the flat-DOM helper methods.
 */
import { describe, expect, it } from 'vitest';
import {
  addDOMFunctions,
  convertHTMLToBasicHTML,
  convertHTMLToTokens,
} from '../src/html-to-content/html-to-basic-html';

const BASE = 'https://example.com/articles/one';

describe('convertHTMLToTokens', () => {
  it('returns undefined for empty input', () => {
    expect(convertHTMLToTokens('')).toBeUndefined();
    expect(convertHTMLToTokens(null as any)).toBeUndefined();
  });

  it('tokenises tags and their text nodes', () => {
    const tokens = convertHTMLToTokens('<p>Hello</p>');

    expect(tokens).toEqual([
      { tagName: 'p' },
      { tagName: 'text', text: 'Hello' },
      { tagName: '/p' },
    ]);
  });

  it('reads element attributes', () => {
    const [img] = convertHTMLToTokens('<img src="/a.png" width="10">')!;

    expect(img).toMatchObject({ tagName: 'img', src: '/a.png', width: '10' });
  });

  it('normalises srcset to the first src candidate', () => {
    const [img] = convertHTMLToTokens('<img srcset="/a.png 1x, /b.png 2x">')!;

    expect(img).toMatchObject({ tagName: 'img', src: '/a.png' });
  });

  it('drops script, style and noscript content', () => {
    const text = convertHTMLToTokens(
      '<p>Keep</p><script>evil()</script><style>.a{}</style>'
    )!
      .filter((t: any) => t.text)
      .map((t: any) => t.text)
      .join('');

    expect(text).toBe('Keep');
  });

  it('drops HTML comments', () => {
    const tokens = convertHTMLToTokens('<!-- a comment --><p>Body</p>')!;

    expect(tokens.some((t: any) => String(t.text).includes('comment'))).toBe(false);
  });

  it('emits a closing-tag token for each close', () => {
    const tokens = convertHTMLToTokens('<div><span>x</span></div>')!;

    expect(tokens.filter((t: any) => t.tagName.startsWith('/')).map((t: any) => t.tagName)).toEqual(
      ['/span', '/div']
    );
  });

  it('ignores a chunk with no closing bracket', () => {
    expect(convertHTMLToTokens('plain text with no tags')).toEqual([]);
  });
});

describe('convertHTMLToBasicHTML', () => {
  it('returns undefined for empty input', () => {
    expect(convertHTMLToBasicHTML('')).toBeUndefined();
  });

  it('keeps allowed formatting tags and their text', () => {
    const html = convertHTMLToBasicHTML('<p>Hello <b>world</b></p>', { url: BASE });

    expect(html).toContain('<p>');
    expect(html).toContain('<b>');
    expect(html).toContain('world');
  });

  it('strips tags outside the allowlist but keeps their text', () => {
    const html = convertHTMLToBasicHTML('<div><span>Kept text</span></div>', { url: BASE });

    expect(html).not.toContain('<div>');
    expect(html).not.toContain('<span>');
    expect(html).toContain('Kept text');
  });

  it('honours a custom allowTags list', () => {
    const html = convertHTMLToBasicHTML('<p>a</p><h1>b</h1>', {
      url: BASE,
      allowTags: 'h1',
    });

    expect(html).toContain('<h1>');
    expect(html).not.toContain('<p>');
  });

  it('drops every tag when formatting is off', () => {
    const html = convertHTMLToBasicHTML('<p>Hello <b>world</b></p>', {
      url: BASE,
      formatting: false,
    });

    expect(html).not.toContain('<');
    expect(html).toContain('Hello');
  });

  it('resolves relative image and link URLs against the base', () => {
    const html = convertHTMLToBasicHTML(
      '<img src="/a.png"><a href="../other">link</a>',
      { url: BASE }
    );

    expect(html).toContain('src="https://example.com/a.png"');
    expect(html).toContain('href="https://example.com/other"');
  });

  it('removes images with no src or a data URI', () => {
    const html = convertHTMLToBasicHTML(
      '<img><img src="data:image/png;base64,AAA"><img src="/real.png">',
      { url: BASE }
    );

    expect(html.match(/<img/g)).toHaveLength(1);
    expect(html).toContain('real.png');
  });

  it('drops images when images are disabled', () => {
    const html = convertHTMLToBasicHTML('<p>text</p><img src="/a.png">', {
      url: BASE,
      images: false,
    });

    expect(html).not.toContain('<img');
  });

  it('drops anchors when links are disabled', () => {
    const html = convertHTMLToBasicHTML('<a href="/x">link text</a>', {
      url: BASE,
      links: false,
    });

    expect(html).not.toContain('<a ');
    expect(html).toContain('link text');
  });

  it('drops video elements when videos are disabled', () => {
    const html = convertHTMLToBasicHTML('<video src="/v.mp4"></video>', {
      url: BASE,
      videos: false,
    });

    expect(html).not.toContain('<video');
  });

  it('adds target="_blank" to external links when asked', () => {
    const html = convertHTMLToBasicHTML('<a href="/x">link</a>', {
      url: BASE,
      openLinksNewWindow: true,
    });

    expect(html).toContain('target="_blank"');
  });

  it('leaves in-page anchors without a target', () => {
    const html = convertHTMLToBasicHTML('<a href="#section">jump</a>', {
      url: BASE,
      openLinksNewWindow: true,
    });

    expect(html).not.toContain('target="_blank"');
  });

  it('drops attributes outside the allowlist', () => {
    const html = convertHTMLToBasicHTML('<p class="lead" id="first">text</p>', { url: BASE });

    expect(html).not.toContain('class=');
    expect(html).toContain('id="first"');
  });

  it('decodes entities', () => {
    const html = convertHTMLToBasicHTML('<p>Tom &amp; Jerry here</p>', { url: BASE });

    expect(html).toContain('Tom & Jerry here');
  });

  it('collapses literal whitespace runs', () => {
    const html = convertHTMLToBasicHTML('<p>spaced    out\n\ttext</p>', { url: BASE });

    expect(html).toContain('<p>spaced out text</p>');
  });

  it('leaves runs of decoded &nbsp; uncollapsed', () => {
    // `&nbsp;` is turned into a space only after the whitespace-collapsing
    // pass, so consecutive non-breaking spaces survive as double spaces.
    const html = convertHTMLToBasicHTML('<p>a&nbsp;&nbsp;b</p>', { url: BASE });

    expect(html).toContain('a  b');
  });

  it('removes empty paragraphs', () => {
    const html = convertHTMLToBasicHTML('<p></p><p>real</p>', { url: BASE });

    expect(html).not.toContain('<p></p>');
    expect(html).toContain('real');
  });
});

describe('addDOMFunctions', () => {
  const dom = () =>
    addDOMFunctions([
      { tagName: 'h1', id: 'title' },
      { tagName: 'text', text: 'Heading' },
      { tagName: 'p', class: 'lead' },
      { tagName: 'text', text: 'Body' },
      { tagName: 'img', src: '/a.png' },
    ]);

  it('reads the combined text content', () => {
    expect(dom().getTextContent()).toBe('Heading\nBody\n');
    expect(dom().textContent).toBe('Heading\nBody\n');
  });

  it('renders the inner HTML', () => {
    const html = dom().innerHTML;

    expect(html).toContain('<h1 id="title">');
    expect(html).toContain('Heading');
  });

  it('returns an empty list for a tag name that matches nothing', () => {
    expect(dom().getElementsByTagName('nope')).toHaveLength(0);
  });

  it('throws when a tag name does match', () => {
    // Each match is passed back through addDOMFunctions, which immediately
    // calls the array-only getInnerHTML/getTextContent on a plain object.
    expect(() => dom().getElementsByTagName('p')).toThrow(TypeError);
  });

  it('finds elements by class name and id', () => {
    expect(dom().getElementsByClassName('lead')).toHaveLength(1);
    expect(dom().getElementById('title')).toHaveLength(1);
    expect(dom().getElementById('missing')).toHaveLength(0);
  });

  it('collects an attribute across elements', () => {
    expect(dom().getAttribute('src')).toEqual(['/a.png']);
    expect(dom().getAttribute('href')).toEqual([]);
  });
});
