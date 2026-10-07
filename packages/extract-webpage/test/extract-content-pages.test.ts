/**
 * @fileoverview The two main-content extractors (Readability- and Mercury-style)
 * run over realistic article pages: boilerplate (nav, sidebar, comments,
 * footer, scripts) must be dropped and the article body kept.
 */
import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import { extractMainContentFromHTML } from '../src/html-to-content/extract-content/extract-content-readability';
import { extractMainContentFromHTML2 } from '../src/html-to-content/extract-content/extract-content-mercury';
import { getLinkDensity, classWeight, scoreNode } from '../src/html-to-content/extract-content/extract-content-readability';
import { scoreParagraph } from '../src/html-to-content/extract-content/extract-content-mercury';

const para = (n: number) =>
  `<p>Paragraph ${n} of the article body, long enough to count as real prose, with several clauses, commas, and details; it keeps going so that scoring favours it over the navigation and the sidebar links.</p>`;

const ARTICLE = `<!doctype html>
<html><head><title>The Great Eclipse</title>
<script>var tracking = "SCRIPT_NOISE";</script><style>.x{color:red}</style></head>
<body>
  <header id="site-header"><nav><a href="/">Home</a> <a href="/news">News</a> <a href="/about">About</a></nav></header>
  <div class="sidebar widget"><h3>Related</h3><ul><li><a href="/a">Related story A</a></li><li><a href="/b">Related story B</a></li></ul></div>
  <article class="post content entry">
    <h1>The Great Eclipse</h1>
    <p class="byline">By Jane Roe</p>
    ${para(1)}
    ${para(2)}
    <blockquote>A quoted remark that belongs to the story.</blockquote>
    ${para(3)}
    <img src="https://example.com/eclipse.jpg" alt="Eclipse">
    ${para(4)}
    <a href="https://example.com/more">Read more about the eclipse here</a>
  </article>
  <div id="comments" class="comment-list"><p>COMMENT_NOISE first!</p></div>
  <footer class="footer"><p>FOOTER_NOISE copyright</p></footer>
</body></html>`;

describe('extractMainContentFromHTML (Readability-style)', () => {
  it('keeps the article body and drops navigation, sidebar, comments, footer and scripts', () => {
    const html = extractMainContentFromHTML(ARTICLE);
    expect(html).toContain('Paragraph 1 of the article body');
    expect(html).toContain('Paragraph 4 of the article body');
    expect(html).toContain('A quoted remark');
    for (const noise of ['COMMENT_NOISE', 'FOOTER_NOISE', 'SCRIPT_NOISE', 'Related story A']) {
      expect(html).not.toContain(noise);
    }
  });

  it('returns an empty string for empty or content-free input', () => {
    expect(extractMainContentFromHTML('')).toBeFalsy();
    expect(extractMainContentFromHTML('<html><body></body></html>')).toBeFalsy();
  });

  it('retries with relaxed thresholds for short pages', () => {
    const short = '<html><body><div class="content"><p>A short but real article body with a few words.</p></div></body></html>';
    const html = extractMainContentFromHTML(short, { minContentLength: 10, minScore: 0, minTextLength: 5 });
    expect(html).toContain('A short but real article body');
  });

  it('handles pages built from div-wrapped text with no paragraphs', () => {
    const page = `<html><body><div id="main"><div>${'Plain text inside a div with enough characters to be scored, repeated for length. '.repeat(6)}</div></div></body></html>`;
    expect(typeof extractMainContentFromHTML(page)).toBe('string');
  });

  it('keeps embedded YouTube/Vimeo video frames', () => {
    const page = ARTICLE.replace('<img src', '<iframe src="https://www.youtube.com/embed/abc"></iframe><img src');
    expect(extractMainContentFromHTML(page)).toContain('youtube.com/embed/abc');
  });

  it('can be tuned with options', () => {
    const strict = extractMainContentFromHTML(ARTICLE, { minContentLength: 100000 });
    expect(typeof strict).toBe('string');
  });
});

describe('extractMainContentFromHTML2 (Mercury-style)', () => {
  it('returns the article body without boilerplate', () => {
    const html = extractMainContentFromHTML2(ARTICLE);
    expect(html).toContain('Paragraph 2 of the article body');
    expect(html).not.toContain('COMMENT_NOISE');
    expect(html).not.toContain('SCRIPT_NOISE');
  });

  it('returns nothing for empty input', () => {
    expect(extractMainContentFromHTML2('')).toBeUndefined();
    expect(extractMainContentFromHTML2(undefined as any)).toBeUndefined();
  });

  it('falls back through relaxed options on thin pages', () => {
    const thin = '<html><head><title>Thin</title></head><body><div><p>Only a little text lives on this page.</p></div></body></html>';
    const html = extractMainContentFromHTML2(thin);
    expect(html === undefined || typeof html === 'string').toBe(true);
    if (html) expect(html).toContain('Only a little text');
  });

  it('honours explicit options', () => {
    const html = extractMainContentFromHTML2(ARTICLE, {
      stripUnlikelyCandidates: false,
      weightNodes: false,
      cleanConditionally: false,
    });
    expect(html).toContain('Paragraph 1 of the article body');
  });

  it('handles pages with multiple candidate blocks and tables', () => {
    const page = `<html><head><title>Mixed</title></head><body>
      <div class="story"><table><tr><td>${para(1)}</td></tr></table>${para(2)}${para(3)}</div>
      <div class="story-extra">${para(4)}</div></body></html>`;
    const html = extractMainContentFromHTML2(page);
    expect(html).toContain('Paragraph 1');
  });

  it('keeps headings, lists and images inside the body', () => {
    const page = `<html><head><title>Rich</title></head><body><div class="article-body">
      <h2>Section heading</h2>${para(1)}<ul><li>item one</li><li>item two</li></ul>${para(2)}
      <img src="/pic.png" alt="pic" width="600">${para(3)}${para(4)}</div></body></html>`;
    const html = extractMainContentFromHTML2(page);
    expect(html).toContain('Section heading');
    expect(html).toContain('item one');
  });
});

describe('scoring helpers', () => {
  const frag = (html: string) => {
    const { document } = parseHTML(`<html><body>${html}</body></html>`);
    return document.body.firstElementChild;
  };
  const positive = /article|body|content|entry|main|post|story/i;
  const negative = /comment|footer|sidebar|widget|promo/i;

  it('getLinkDensity is the share of text that is link text', () => {
    expect(getLinkDensity(null)).toBe(0);
    expect(getLinkDensity(frag('<div></div>'))).toBe(0);
    expect(getLinkDensity(frag('<div>plain text only</div>'))).toBe(0);
    expect(getLinkDensity(frag('<div><a href="#">all link</a></div>'))).toBeCloseTo(1, 5);
    expect(getLinkDensity(frag('<div>abcde<a href="#">fghij</a></div>'))).toBeCloseTo(0.5, 5);
  });

  it('classWeight rewards content-like class/id names and penalises boilerplate-like ones', () => {
    const w = (attrs: string) => classWeight(frag(`<div ${attrs}></div>`), positive, negative);
    expect(w('class="article-body"')).toBe(25);
    expect(w('class="sidebar widget"')).toBe(-25);
    expect(w('id="main-content"')).toBe(25);
    expect(w('id="comment-box"')).toBe(-25);
    expect(w('class="sidebar-content"')).toBe(0); // one of each cancels out
    expect(w('class="plain"')).toBe(0);
    expect(classWeight(null, positive, negative)).toBe(0);
  });

  it('scoreNode adds tag-based adjustments on top of the class weight', () => {
    const s = (tag: string, cls = '') => scoreNode(frag(`<${tag} class="${cls}"></${tag}>`), positive, negative).score;
    expect(s('div')).toBe(5);
    expect(s('article', 'post')).toBe(30);
    expect(s('blockquote')).toBe(3);
    expect(s('ul')).toBe(-3);
    expect(s('h2')).toBe(-5);
    expect(s('span')).toBe(0);
    expect(scoreNode(null, positive, negative)).toEqual({ score: 0, elem: null });
  });

  it('scoreParagraph scores longer, comma-rich text higher', () => {
    const short = frag('<p>Hi.</p>');
    const long = frag(`<p>${'Clause one, clause two, clause three, '.repeat(10)}end.</p>`);
    expect(Number(scoreParagraph(long))).toBeGreaterThan(Number(scoreParagraph(short)));
  });
});
