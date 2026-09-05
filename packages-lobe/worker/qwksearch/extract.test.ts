// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import {
  articleFromHtml,
  buildCite,
  classifyUrl,
  countWords,
  extractArticle,
  extractViaScraper,
  extractViaTavily,
  looksLikeChallenge,
  markdownToSimpleHtml,
} from './extract';

describe('classifyUrl', () => {
  it('rejects malformed urls and search result pages', () => {
    expect(classifyUrl('not a url')).toBe('invalid');
    expect(classifyUrl('ftp://example.com/x')).toBe('invalid');
    expect(classifyUrl('https://www.google.com/search?q=lobehub')).toBe('search-engine');
    expect(classifyUrl('https://duckduckgo.com/?q=x')).toBe('search-engine');
  });

  it('flags video hosts and accepts everything else', () => {
    expect(classifyUrl('https://vimeo.com/12345')).toBe('video');
    expect(classifyUrl('https://example.com/article')).toBe('article');
  });
});

describe('looksLikeChallenge', () => {
  it('detects bot-check interstitials', () => {
    expect(looksLikeChallenge('<title>Just a moment...</title>')).toBe(true);
    expect(looksLikeChallenge('<h1>Real article</h1>')).toBe(false);
    expect(looksLikeChallenge('')).toBe(true);
  });
});

describe('markdownToSimpleHtml', () => {
  it('turns headings, paragraphs and links into html', () => {
    const html = markdownToSimpleHtml('# Title\n\nHello [x](https://x.com) & <b>');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<a href="https://x.com" target="_blank">x</a>');
    expect(html).toContain('&amp; &lt;b&gt;');
  });
});

describe('buildCite / countWords', () => {
  it('builds an APA-ish citation with a year when the date is valid', () => {
    const cite = buildCite(
      { date: '2024-03-05', source: 'example.com', title: 'T' },
      'https://example.com/a',
    );
    expect(cite).toContain('(2024, Mar 5)');
    expect(cite).toContain('<b>T</b>');
  });

  it('counts words ignoring tags', () => {
    expect(countWords('<p>one two</p> three')).toBe(3);
    expect(countWords(undefined)).toBe(0);
  });
});

describe('articleFromHtml', () => {
  it('extracts readable content with the LobeHub crawler utilities', () => {
    const body = Array.from({ length: 40 }, (_, i) => `Sentence number ${i} of the article body.`).join(' ');
    const html = `<html><head><title>My Post</title></head><body><article><h1>My Post</h1><p>${body}</p></article></body></html>`;
    const article = articleFromHtml(html, 'https://news.example.com/post', 'scraper');

    expect(article.error).toBeUndefined();
    expect(article.content).toContain('Sentence number 3');
    expect(article.html).toContain('<p>');
    expect(article.source).toBe('news.example.com');
    expect(article.via).toBe('scraper');
    expect(article.word_count).toBeGreaterThan(100);
  });

  it('reports an error for empty pages', () => {
    expect(articleFromHtml('<html><body></body></html>', 'https://x.com', 'scraper').error).toBeDefined();
  });
});

describe('extractViaScraper', () => {
  it('returns an error instead of throwing when the scraper serves a challenge page', async () => {
    const fetcher = vi.fn(async () => Response.json({ html: 'Verifying you are human' }));
    const result = await extractViaScraper('https://x.com/a', { baseUrl: 'https://scraper.test', fetcher });
    expect(result.error).toMatch(/challenge/);
    expect(new URL((fetcher.mock.calls[0] as unknown[])[0] as URL).pathname).toBe('/api/render');
  });

  it('honours the deadline', async () => {
    const fetcher = vi.fn(
      (_url: unknown, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
          );
        }),
    );
    const result = await extractViaScraper('https://x.com/a', { deadlineMs: 20, fetcher });
    expect(result.error).toMatch(/deadline/);
  });
});

describe('extractViaTavily', () => {
  it('requires an api key', async () => {
    expect((await extractViaTavily('https://x.com', undefined, vi.fn())).error).toMatch(/Tavily/);
  });

  it('maps raw_content into an article', async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ results: [{ raw_content: '# Hi\n\nBody text here', title: 'Hi', url: 'https://x.com/a' }] }),
    );
    const article = await extractViaTavily('https://x.com/a', 'key', fetcher);
    expect(article.via).toBe('tavily');
    expect(article.title).toBe('Hi');
    expect(article.html).toContain('<h1>Hi</h1>');
  });
});

describe('extractArticle', () => {
  it('walks the tiers until one yields usable html', async () => {
    const tier1 = vi.fn(async () => ({ error: 'nope' }));
    const tier2 = vi.fn(async () => {
      throw new Error('boom');
    });
    const tier3 = vi.fn(async () => ({ html: '<p>ok</p>', title: 'ok' }));

    const result = await extractArticle('https://x.com', [tier1, tier2, tier3]);
    expect(result.title).toBe('ok');
    expect(tier1).toHaveBeenCalledTimes(1);
    expect(tier2).toHaveBeenCalledTimes(1);
  });

  it('returns the last error when every tier fails', async () => {
    const result = await extractArticle('https://x.com', [async () => ({ error: 'a' }), async () => ({ error: 'b' })]);
    expect(result).toEqual({ error: 'b' });
  });
});
