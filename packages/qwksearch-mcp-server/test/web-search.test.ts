import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeServer } from './helpers/fake-server';

const search = vi.fn();
vi.mock('../src/lib/search-instance.js', () => ({
  getSearchInstance: () => ({ search }),
}));

const { registerWebSearchTool } = await import('../src/tools/web-search.js');

function register() {
  const fake = createFakeServer();
  registerWebSearchTool(fake.server);
  return fake.get('web_search');
}

describe('web_search tool registration', () => {
  it('registers under the expected name with a description', () => {
    const tool = register();

    expect(tool.name).toBe('web_search');
    expect(tool.config.description).toContain('Search the web');
  });

  it('declares query, category and page inputs', () => {
    const tool = register();

    expect(Object.keys(tool.config.inputSchema).sort()).toEqual(['category', 'page', 'query']);
  });
});

describe('web_search handler', () => {
  beforeEach(() => {
    search.mockReset();
  });

  it('passes the query, page and category through to the search instance', async () => {
    search.mockResolvedValue([{ title: 'A result', url: 'https://example.com' }]);

    await register().handler({ query: 'espresso', category: 'news', page: 2 });

    expect(search).toHaveBeenCalledWith('espresso', 2, undefined, ['news']);
  });

  it('formats results as a numbered list with URLs', async () => {
    search.mockResolvedValue([
      { title: 'First', url: 'https://example.com/1', content: 'Snippet one' },
      { title: 'Second', url: 'https://example.com/2' },
    ]);

    const result = await register().handler({ query: 'espresso', category: 'general', page: 1 });
    const text = result.content[0].text;

    expect(text).toContain('Search results for "espresso" (general):');
    expect(text).toContain('1. First');
    expect(text).toContain('URL: https://example.com/1');
    expect(text).toContain('Snippet one');
    expect(text).toContain('2. Second');
    expect(text).toContain('Found 2 results.');
    expect(result.isError).toBeUndefined();
  });

  it('falls back to the `link` field when `url` is absent', async () => {
    search.mockResolvedValue([{ title: 'Legacy', link: 'https://example.com/legacy' }]);

    const result = await register().handler({ query: 'x', category: 'general', page: 1 });

    expect(result.content[0].text).toContain('URL: https://example.com/legacy');
  });

  it('lists the contributing engines when present', async () => {
    search.mockResolvedValue([
      { title: 'A', url: 'https://example.com', engines: ['google', 'brave'] },
    ]);

    const result = await register().handler({ query: 'x', category: 'general', page: 1 });

    expect(result.content[0].text).toContain('Sources: google, brave');
  });

  it('omits the sources line when the engine list is empty', async () => {
    search.mockResolvedValue([{ title: 'A', url: 'https://example.com', engines: [] }]);

    const result = await register().handler({ query: 'x', category: 'general', page: 1 });

    expect(result.content[0].text).not.toContain('Sources:');
  });

  it('reports an empty result set without flagging an error', async () => {
    search.mockResolvedValue([]);

    const result = await register().handler({ query: 'nothing here', category: 'general', page: 1 });

    expect(result.content[0].text).toBe('No search results found for "nothing here".');
    expect(result.isError).toBeUndefined();
  });

  it('treats a null result the same as an empty one', async () => {
    search.mockResolvedValue(null);

    const result = await register().handler({ query: 'nothing', category: 'general', page: 1 });

    expect(result.content[0].text).toContain('No search results found');
  });

  it('returns an error payload when the search throws', async () => {
    search.mockRejectedValue(new Error('upstream timeout'));

    const result = await register().handler({ query: 'x', category: 'general', page: 1 });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('Search failed: upstream timeout');
  });
});
