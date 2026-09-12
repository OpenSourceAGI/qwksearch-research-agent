// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import {
  articleFromHtmlViaCrawler,
  articleFromRenderedHtml,
  buildCite,
  classifyUrl,
  contentFromExtractedHtml,
  countWords,
  extractArticle,
  extractViaQwkSearch,
  extractViaScraper,
  extractViaTavily,
  isExtractableKind,
  looksLikeChallenge,
  markdownToSimpleHtml,
  tiersForUrl,
  toQwkSearchExtractOptions,
} from './extract';
import type { ExtractWebpageModule } from './extractQwkSearch';
import { type ExtractionSettings, resolveExtractionSettings } from './extractSettings';

/** A stand-in for `extract-webpage`, so tests never load the real extractor. */
const fakeModule = (overrides: Partial<ExtractWebpageModule> = {}): ExtractWebpageModule => ({
  extractContent: vi.fn(async () => ({ html: '<p>body</p>' })),
  extractContentAndCite: vi.fn(() => ({ html: '<p>body</p>' })),
  ...overrides,
});

describe('classifyUrl', () => {
  it('rejects malformed urls and search result pages', () => {
    expect(classifyUrl('not a url')).toBe('invalid');
    expect(classifyUrl('ftp://example.com/x')).toBe('invalid');
    expect(classifyUrl('https://www.google.com/search?q=lobehub')).toBe('search-engine');
    expect(classifyUrl('https://duckduckgo.com/?q=x')).toBe('search-engine');
  });

  it('flags transcript-less video hosts and accepts everything else', () => {
    expect(classifyUrl('https://vimeo.com/12345')).toBe('video');
    expect(classifyUrl('https://www.twitch.tv/somebody')).toBe('video');
    expect(classifyUrl('https://example.com/article')).toBe('article');
  });

  it('routes youtube to its own kind rather than rejecting it as a video', () => {
    expect(classifyUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube');
    expect(classifyUrl('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube');
    expect(classifyUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('youtube');
    // A YouTube page that is not a video keeps the article path.
    expect(classifyUrl('https://www.youtube.com/about/')).toBe('article');
  });

  it('detects pdf urls, including arxiv', () => {
    expect(classifyUrl('https://example.com/paper.pdf')).toBe('pdf');
    expect(classifyUrl('https://example.com/paper.pdf?download=1')).toBe('pdf');
    expect(classifyUrl('https://arxiv.org/pdf/2401.00001')).toBe('pdf');
    // arXiv abstract pages are HTML, so they stay on the article path.
    expect(classifyUrl('https://arxiv.org/abs/2401.00001')).toBe('article');
  });

  it('marks exactly the kinds the chain can extract', () => {
    expect(['article', 'pdf', 'youtube'].every((k) => isExtractableKind(k as never))).toBe(true);
    expect(['invalid', 'search-engine', 'video'].some((k) => isExtractableKind(k as never))).toBe(
      false,
    );
  });
});

describe('tiersForUrl', () => {
  const ids = (url: string, settings?: ExtractionSettings) =>
    tiersForUrl(url, undefined, settings ?? resolveExtractionSettings({})).map((t) => t.tierId);

  it('gives youtube and pdf the qwksearch extractor alone', () => {
    // The remaining tiers render HTML, which for these URLs is page chrome
    // rather than the transcript or the document.
    expect(ids('https://youtu.be/dQw4w9WgXcQ')).toEqual(['qwksearch']);
    expect(ids('https://example.com/paper.pdf')).toEqual(['qwksearch']);
  });

  it('gives articles the full chain, qwksearch first', () => {
    expect(ids('https://example.com/post')).toEqual(['qwksearch', 'scraper', 'tavily', 'crawler']);
  });

  it('drops the tiers the operator switched off, keeping the chain order', () => {
    const settings = resolveExtractionSettings({ QWKSEARCH_EXTRACT_TIERS: 'crawler,qwksearch' });
    expect(ids('https://example.com/post', settings)).toEqual(['qwksearch', 'crawler']);
  });

  it('returns an empty chain when no enabled tier can serve the url kind', () => {
    // `scraper` renders HTML, which is not what a PDF needs; rather than run a
    // tier the operator disabled, the caller gets the "no tier" error.
    const settings = resolveExtractionSettings({ QWKSEARCH_EXTRACT_TIERS: 'scraper' });
    expect(ids('https://example.com/paper.pdf', settings)).toEqual([]);
  });

  it('projects the resolved settings onto the extractor options', async () => {
    let seen: Record<string, unknown> | undefined;
    const settings = resolveExtractionSettings({
      QWKSEARCH_EXTRACT_LANGUAGES: 'de,fr',
      QWKSEARCH_EXTRACT_TIMEOUT: '25',
      PDF_PROCESSOR: 'hybrid',
    });
    // The loader is a test seam rather than a setting, so it is injected here
    // instead of going through `toQwkSearchExtractOptions`.
    await extractViaQwkSearch('https://example.com/paper.pdf', {
      ...toQwkSearchExtractOptions(settings),
      loader: async () =>
        fakeModule({
          extractContent: vi.fn(async (_url: string, options?: Record<string, unknown>) => {
            seen = options;
            return { html: '<p>body</p>' };
          }),
        }),
    });

    expect(seen).toMatchObject({ languages: ['de', 'fr'], processor: 'hybrid', timeout: 25 });
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
  const article = {
    author_cite: 'Lovelace, A.',
    date: '2024-03-05',
    source: 'example.com',
    title: 'T',
  };

  it('builds an APA-ish citation with a year when the date is valid', () => {
    const cite = buildCite(
      { date: '2024-03-05', source: 'example.com', title: 'T' },
      'https://example.com/a',
    );
    expect(cite).toContain('(2024, Mar 5)');
    expect(cite).toContain('<b>T</b>');
  });

  it('formats MLA with the day-first date and a quoted title', () => {
    const cite = buildCite(article, 'https://example.com/a', 'mla');
    expect(cite).toContain('Lovelace, A. "<b>T</b>."');
    expect(cite).toContain('5 Mar. 2024');
    expect(cite).toContain('<i>example.com</i>');
    expect(cite.endsWith('.')).toBe(true);
  });

  it('formats Chicago with a full month name', () => {
    const cite = buildCite(article, 'https://example.com/a', 'chicago');
    expect(cite).toContain('March 5, 2024');
    expect(cite).toContain('Lovelace, A. "<b>T</b>."');
  });

  it('omits an epoch-shaped date in every style rather than claiming 1970', () => {
    // Unparsed dates and missing timestamps both land on the Unix epoch.
    for (const style of ['apa', 'chicago', 'mla'] as const) {
      const cite = buildCite({ ...article, date: '1970-01-01' }, 'https://example.com/a', style);
      expect(cite).not.toContain('1970');
    }
  });

  it('drops the empty segments instead of printing stray punctuation', () => {
    const cite = buildCite({ title: 'Only a title' }, 'https://example.com/a', 'mla');
    expect(cite).not.toContain(', ,');
    expect(cite).toContain('<b>Only a title</b>');
  });

  it('counts words ignoring tags', () => {
    expect(countWords('<p>one two</p> three')).toBe(3);
    expect(countWords(undefined)).toBe(0);
  });
});

const articleHtml = (body: string, head = '') =>
  `<html><head><title>My Post</title>${head}</head><body><article><h1>My Post</h1><p>${body}</p></article></body></html>`;

const longBody = Array.from(
  { length: 40 },
  (_, i) => `Sentence number ${i} of the article body.`,
).join(' ');

describe('articleFromHtmlViaCrawler', () => {
  it('extracts readable content with the LobeHub crawler utilities', () => {
    const article = articleFromHtmlViaCrawler(
      articleHtml(longBody),
      'https://news.example.com/post',
      'scraper',
    );

    expect(article.error).toBeUndefined();
    expect(article.content).toContain('Sentence number 3');
    expect(article.html).toContain('<p>');
    expect(article.source).toBe('news.example.com');
    expect(article.via).toBe('scraper');
    expect(article.word_count).toBeGreaterThan(100);
  });

  it('reports an error for empty pages', () => {
    expect(
      articleFromHtmlViaCrawler('<html><body></body></html>', 'https://x.com', 'scraper').error,
    ).toBeDefined();
  });
});

describe('contentFromExtractedHtml', () => {
  it('converts extracted html to markdown without re-running readability', () => {
    const content = contentFromExtractedHtml(
      '<h1>Title</h1><p>Short body.</p>',
      'https://example.com/a',
    );
    // A second readability pass discards a fragment this small; without it the
    // heading and the paragraph both survive.
    expect(content).toContain('Title');
    expect(content).toContain('Short body.');
  });
});

describe('extractViaQwkSearch', () => {
  it('keeps the citation metadata the extractor resolved and derives the rest', async () => {
    const article = await extractViaQwkSearch('https://example.com/notes', {
      loader: async () =>
        fakeModule({
          extractContent: vi.fn(async () => ({
            author: 'Ada Lovelace',
            author_cite: 'Lovelace, A.',
            date: '1843-10-01',
            html: '<h1>Notes</h1><p>On the Analytical Engine.</p>',
            title: 'Notes',
          })),
        }),
    });

    expect(article.error).toBeUndefined();
    expect(article.via).toBe('qwksearch');
    expect(article.author_cite).toBe('Lovelace, A.');
    // Not returned by the extractor, so the chain fills them in.
    expect(article.source).toBe('example.com');
    expect(article.content).toContain('Analytical Engine');
    expect(article.word_count).toBeGreaterThan(0);
    expect(article.cite).toContain('Lovelace, A.');
  });

  it('does not overwrite a citation the extractor already built', async () => {
    const article = await extractViaQwkSearch('https://example.com/a', {
      loader: async () =>
        fakeModule({
          extractContent: vi.fn(async () => ({ cite: 'Upstream cite', html: '<p>hi</p>' })),
        }),
    });
    expect(article.cite).toBe('Upstream cite');
  });

  it('rebuilds the extractor citation when a non-APA style is asked for', async () => {
    // The extractor only ever emits APA, so honouring another style means
    // rebuilding from the fields it resolved.
    const article = await extractViaQwkSearch('https://example.com/a', {
      citationStyle: 'mla',
      loader: async () =>
        fakeModule({
          extractContent: vi.fn(async () => ({
            author_cite: 'Lovelace, A.',
            cite: 'Lovelace, A. (1843, Oct 1). <b>Notes</b>.',
            date: '1990-10-01',
            html: '<p>hi</p>',
            title: 'Notes',
          })),
        }),
    });
    expect(article.cite).toContain('Lovelace, A. "<b>Notes</b>."');
    expect(article.cite).toContain('1 Oct. 1990');
  });

  it('returns an error instead of throwing when the package cannot be loaded', async () => {
    const article = await extractViaQwkSearch('https://example.com/a', {
      loader: async () => {
        throw new Error('Cannot find module extract-webpage');
      },
    });
    // `{ error }` is the contract that lets `extractArticle` advance a tier.
    expect(article.error).toMatch(/Cannot find module/);
  });

  it('rejects a bot-challenge page so the puppeteer tier still gets a turn', async () => {
    const article = await extractViaQwkSearch('https://example.com/a', {
      loader: async () =>
        fakeModule({
          // The extractor keeps short pages verbatim rather than failing, so a
          // challenge interstitial arrives here as a successful extraction.
          extractContent: vi.fn(async () => ({
            html: '<h1>Just a moment...</h1>',
            title: 'Just a moment...',
          })),
        }),
    });
    expect(article.error).toMatch(/challenge/);
  });

  it('surfaces an extractor error so the next tier runs', async () => {
    const article = await extractViaQwkSearch('https://example.com/a', {
      loader: async () =>
        fakeModule({ extractContent: vi.fn(async () => ({ error: 'Failed to fetch HTML' })) }),
    });
    expect(article.error).toBe('Failed to fetch HTML');
  });
});

describe('articleFromRenderedHtml', () => {
  const html = articleHtml(longBody);

  it('prefers qwksearch citation extraction over readability', async () => {
    const article = await articleFromRenderedHtml(
      html,
      'https://news.example.com/post',
      'scraper',
      async () =>
        fakeModule({
          extractContentAndCite: vi.fn(() => ({
            author_cite: 'Doe, J.',
            html: '<h1>My Post</h1><p>Extracted body.</p>',
            title: 'My Post',
          })),
        }),
    );

    expect(article.via).toBe('qwksearch-html');
    expect(article.author_cite).toBe('Doe, J.');
  });

  it('falls back to lobehub readability when the extractor yields nothing', async () => {
    const article = await articleFromRenderedHtml(
      html,
      'https://news.example.com/post',
      'scraper',
      async () => fakeModule({ extractContentAndCite: vi.fn(() => ({ error: 'No HTML found' })) }),
    );

    expect(article.via).toBe('scraper');
    expect(article.content).toContain('Sentence number 3');
  });

  it('falls back to readability when the package will not load at all', async () => {
    const article = await articleFromRenderedHtml(
      html,
      'https://news.example.com/post',
      'scraper',
      async () => {
        throw new Error('boom');
      },
    );
    expect(article.via).toBe('scraper');
    expect(article.error).toBeUndefined();
  });
});

describe('extractViaScraper', () => {
  it('returns an error instead of throwing when the scraper serves a challenge page', async () => {
    const fetcher = vi.fn(async () => Response.json({ html: 'Verifying you are human' }));
    const result = await extractViaScraper('https://x.com/a', {
      baseUrl: 'https://scraper.test',
      fetcher,
    });
    expect(result.error).toMatch(/challenge/);
    expect(new URL((fetcher.mock.calls[0] as unknown[])[0] as URL).pathname).toBe('/api/render');
  });

  it('runs rendered html through citation extraction', async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ html: '<html><body><article><p>Rendered.</p></article></body></html>' }),
    );
    const extractContentAndCite = vi.fn(() => ({
      author_cite: 'Doe, J.',
      html: '<p>Rendered.</p>',
      title: 'Rendered',
    }));

    const article = await extractViaScraper('https://x.com/a', {
      baseUrl: 'https://scraper.test',
      fetcher,
      loader: async () => fakeModule({ extractContentAndCite }),
    });

    expect(article.via).toBe('qwksearch-html');
    expect(article.author_cite).toBe('Doe, J.');
    expect(extractContentAndCite).toHaveBeenCalledTimes(1);
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
      Response.json({
        results: [{ raw_content: '# Hi\n\nBody text here', title: 'Hi', url: 'https://x.com/a' }],
      }),
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
    const result = await extractArticle('https://x.com', [
      async () => ({ error: 'a' }),
      async () => ({ error: 'b' }),
    ]);
    expect(result).toEqual({ error: 'b' });
  });
});
