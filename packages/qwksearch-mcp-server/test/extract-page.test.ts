import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeServer } from './helpers/fake-server';

const extractContent = vi.fn();
vi.mock('extract-webpage/url-to-content/url-to-content', () => ({ extractContent }));

const { registerExtractPageTool } = await import('../src/tools/extract-page.js');

function register() {
  const fake = createFakeServer();
  registerExtractPageTool(fake.server);
  return fake.get('extract_page');
}

const DEFAULT_ARGS = { url: 'https://example.com/article', images: true, links: true, formatting: true, timeout: 10 };

describe('extract_page tool registration', () => {
  it('registers under the expected name', () => {
    expect(register().name).toBe('extract_page');
  });

  it('declares the extraction options as inputs', () => {
    const schema = register().config.inputSchema;

    expect(Object.keys(schema).sort()).toEqual(['formatting', 'images', 'links', 'timeout', 'url']);
  });
});

describe('extract_page handler', () => {
  beforeEach(() => {
    extractContent.mockReset();
  });

  it('forwards the options and always requests absolute URLs', async () => {
    extractContent.mockResolvedValue({ title: 'Article' });

    await register().handler({ ...DEFAULT_ARGS, images: false, timeout: 30 });

    expect(extractContent).toHaveBeenCalledWith('https://example.com/article', {
      images: false,
      links: true,
      formatting: true,
      absoluteURLs: true,
      timeout: 30,
    });
  });

  it('renders the full set of metadata fields', async () => {
    extractContent.mockResolvedValue({
      url: 'https://example.com/canonical',
      title: 'Article',
      author: 'A. Writer',
      date: '2024-01-01',
      source: 'example.com',
      word_count: 812,
      cite: 'Writer, A. (2024)',
      html: '<p>Body</p>',
    });

    const text = (await register().handler(DEFAULT_ARGS)).content[0].text;

    expect(text).toContain('Content extracted from: https://example.com/canonical');
    expect(text).toContain('Title: Article');
    expect(text).toContain('Author: A. Writer');
    expect(text).toContain('Date: 2024-01-01');
    expect(text).toContain('Source: example.com');
    expect(text).toContain('Word Count: 812');
    expect(text).toContain('Citation: Writer, A. (2024)');
    expect(text).toContain('<p>Body</p>');
  });

  it('falls back to the requested URL when the result has none', async () => {
    extractContent.mockResolvedValue({ title: 'Article' });

    const text = (await register().handler(DEFAULT_ARGS)).content[0].text;

    expect(text).toContain('Content extracted from: https://example.com/article');
  });

  it('omits metadata lines for fields the extractor did not return', async () => {
    extractContent.mockResolvedValue({ title: 'Article' });

    const text = (await register().handler(DEFAULT_ARGS)).content[0].text;

    expect(text).not.toContain('Author:');
    expect(text).not.toContain('Citation:');
    expect(text).not.toContain('Word Count:');
  });

  it('flags an extractor-reported error', async () => {
    extractContent.mockResolvedValue({ error: 'paywalled' });

    const result = await register().handler(DEFAULT_ARGS);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe(
      'Could not extract content from "https://example.com/article".'
    );
  });

  it('flags an empty extractor result', async () => {
    extractContent.mockResolvedValue(null);

    const result = await register().handler(DEFAULT_ARGS);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Could not extract content');
  });

  it('reports a thrown error with its message', async () => {
    extractContent.mockRejectedValue(new Error('DNS failure'));

    const result = await register().handler(DEFAULT_ARGS);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe(
      'Extraction failed for "https://example.com/article": DNS failure'
    );
  });
});
