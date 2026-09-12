// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import {
  type ExtractWebpageModule,
  fromQwkArticle,
  QWKSEARCH_TIMEOUT_SECONDS,
  runQwkSearchExtractor,
  runQwkSearchHtmlExtractor,
} from './extractQwkSearch';

/** A stand-in for `extract-webpage`, so tests never load the real extractor. */
const fakeModule = (overrides: Partial<ExtractWebpageModule> = {}): ExtractWebpageModule => ({
  extractContent: vi.fn(async () => ({ html: '<p>body</p>' })),
  extractContentAndCite: vi.fn(() => ({ html: '<p>body</p>' })),
  ...overrides,
});

/**
 * Spies declared with their real parameters, so `mock.calls[0]` is typed and
 * the assertions below need no casts.
 */
type ExtractOptions = Record<string, unknown> | undefined;
const spyExtractContent = (result: Awaited<ReturnType<ExtractWebpageModule['extractContent']>>) =>
  vi.fn(async (_url: string, _options?: ExtractOptions) => result);
const spyExtractContentAndCite = (
  result: ReturnType<ExtractWebpageModule['extractContentAndCite']>,
) => vi.fn((_html: string, _options?: ExtractOptions) => result);

describe('fromQwkArticle', () => {
  it('maps a full extractor result onto the panel article shape', () => {
    const article = fromQwkArticle(
      {
        author: 'Ada Lovelace',
        author_cite: 'Lovelace, A.',
        author_short: 'Lovelace',
        author_type: 1,
        cite: 'Lovelace, A. (1843). <b>Notes</b>.',
        date: '1843-10-01',
        html: '<h1>Notes</h1><p>On the Analytical Engine.</p>',
        source: 'Scientific Memoirs',
        title: 'Notes',
        url: 'https://example.com/notes',
        word_count: 4,
      },
      'https://example.com/notes',
      'qwksearch',
    );

    expect(article.error).toBeUndefined();
    expect(article.via).toBe('qwksearch');
    expect(article.author_cite).toBe('Lovelace, A.');
    // `author_type` is numeric upstream and a text column here.
    expect(article.author_type).toBe('1');
    expect(article.title).toBe('Notes');
  });

  it('normalizes a numeric error code into a string', () => {
    expect(fromQwkArticle({ error: 404 }, 'https://x.com', 'qwksearch').error).toBe('404');
  });

  it('reports an error rather than an empty article when there is no html', () => {
    expect(fromQwkArticle({ title: 'T' }, 'https://x.com', 'qwksearch').error).toMatch(
      /no content/,
    );
    expect(fromQwkArticle({ html: '   ' }, 'https://x.com', 'qwksearch').error).toMatch(
      /no content/,
    );
    expect(fromQwkArticle(null, 'https://x.com', 'qwksearch').error).toMatch(/no content/);
  });

  it('falls back to the requested url when the extractor did not resolve one', () => {
    expect(fromQwkArticle({ html: '<p>x</p>' }, 'https://x.com/a', 'qwksearch').url).toBe(
      'https://x.com/a',
    );
  });
});

describe('runQwkSearchExtractor', () => {
  it('passes the url, a default transcript language and the timeout through', async () => {
    const extractContent = spyExtractContent({ html: '<p>ok</p>' });
    await runQwkSearchExtractor('https://youtu.be/dQw4w9WgXcQ', {
      loader: async () => fakeModule({ extractContent }),
    });

    const [url, options] = extractContent.mock.calls[0];
    expect(url).toBe('https://youtu.be/dQw4w9WgXcQ');
    expect(options?.languages).toEqual(['en']);
    expect(options?.timeout).toBe(QWKSEARCH_TIMEOUT_SECONDS);
    expect(options?.url).toBe('https://youtu.be/dQw4w9WgXcQ');
  });

  it('forwards caller-supplied transcript languages and proxy', async () => {
    const extractContent = spyExtractContent({ html: '<p>ok</p>' });
    await runQwkSearchExtractor('https://youtu.be/dQw4w9WgXcQ', {
      languages: ['de', 'en'],
      loader: async () => fakeModule({ extractContent }),
      proxy: 'https://proxy.test',
    });

    const options = extractContent.mock.calls[0][1];
    expect(options?.languages).toEqual(['de', 'en']);
    expect(options?.proxy).toBe('https://proxy.test');
  });
});

describe('runQwkSearchHtmlExtractor', () => {
  it('runs citation extraction over html somebody else rendered', async () => {
    const extractContentAndCite = spyExtractContentAndCite({ html: '<p>ok</p>', title: 'T' });
    const result = await runQwkSearchHtmlExtractor('<html>…</html>', 'https://x.com/a', {
      loader: async () => fakeModule({ extractContentAndCite }),
    });

    expect(result.title).toBe('T');
    const [html, options] = extractContentAndCite.mock.calls[0];
    expect(html).toBe('<html>…</html>');
    // The url is what makes relative links absolute and seeds the citation.
    expect(options?.url).toBe('https://x.com/a');
  });
});
