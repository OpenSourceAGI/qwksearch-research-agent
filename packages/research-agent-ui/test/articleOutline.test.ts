/**
 * @fileoverview `extractOutline` turns an article's HTML into the Outline
 * tab's entries: H1-H3 only, in document order, each tied to an id on its
 * heading so the Fumadocs table of contents can link and scroll-spy to it.
 */
import { describe, expect, it } from 'vitest';
import { extractOutline } from '../src/components/ArticleReader/articleOutline';

describe('extractOutline', () => {
  it('lists h1, h2 and h3 in document order with their depth', () => {
    const { items } = extractOutline(
      '<h1>Title</h1><p>x</p><h2>Part</h2><h3>Detail</h3><h4>Skipped</h4><h2>Next</h2>',
    );
    expect(items.map((item) => [item.title, item.depth])).toEqual([
      ['Title', 1],
      ['Part', 2],
      ['Detail', 3],
      ['Next', 2],
    ]);
  });

  it('gives every heading the id its entry links to', () => {
    const { html, items } = extractOutline('<h2>Alpha</h2><h2>Beta</h2>');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(item.url.startsWith('#')).toBe(true);
      expect(doc.getElementById(item.url.slice(1))?.textContent).toBe(item.title);
    }
  });

  it('keeps a heading id the page already has', () => {
    const { html, items } = extractOutline('<h2 id="intro">Intro</h2>');
    expect(items[0].url).toBe('#intro');
    expect(html).toContain('id="intro"');
  });

  it('keeps ids unique when headings repeat or collide with an existing id', () => {
    const { items } = extractOutline('<h2 id="a">One</h2><h2 id="a">Two</h2><h2>Same</h2><h2>Same</h2>');
    const urls = items.map((item) => item.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('ignores ids that are not safe to use as an anchor', () => {
    const { items } = extractOutline('<h2 id="a b&quot;c">Odd</h2>');
    expect(items[0].url).toMatch(/^#[\w:.-]+$/);
  });

  it('skips headings with no text', () => {
    const { items } = extractOutline('<h2>  </h2><h2>Real</h2>');
    expect(items.map((item) => item.title)).toEqual(['Real']);
  });

  it('returns the html untouched when there are no headings', () => {
    const html = '<p>just prose</p>';
    expect(extractOutline(html)).toEqual({ html, items: [] });
  });
});
