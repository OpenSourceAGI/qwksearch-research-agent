import { describe, it, expect, vi } from 'vitest';

vi.mock('search-web-api/search/search-query-executor.js', () => ({
  Search: vi.fn(function () {
    return { search: vi.fn().mockResolvedValue([]) };
  }),
}));

import { SearchSourcesService, SourceRegistry, normalizeCategory } from '../search-sources';

const merged = (title: string, url: string) => ({ title, url, content: title, engines: ['bing'], positions: [1], score: 1, priority: 'normal' as const });

describe('normalizeCategory', () => {
  it('maps the tool categories onto the search-web-api registry', () => {
    expect(normalizeCategory('science')).toBe('academic');
    expect(normalizeCategory('map')).toBe('maps');
    expect(normalizeCategory('social_media')).toBe('social');
    expect(normalizeCategory('news')).toBe('news');
  });
});

describe('SearchSourcesService', () => {
  it('fans out to the requested categories', async () => {
    const backend = { search: vi.fn().mockResolvedValue([merged('A', 'https://a.example')]) };
    const service = new SearchSourcesService({ backend });

    const { results } = await service.webSearch({ query: ' cats ', searchCategories: ['science', 'news'] });

    expect(backend.search).toHaveBeenCalledWith('cats', 1, undefined, ['academic', 'news']);
    expect(results).toEqual([{ title: 'A', url: 'https://a.example', content: 'A', engines: ['bing'], category: undefined, publishedDate: undefined, imgSrc: undefined }]);
  });

  it('uses fixed engines instead of categories when configured', async () => {
    const backend = { search: vi.fn().mockResolvedValue([]) };
    const service = new SearchSourcesService({ backend, engineNames: ['youtube'] });
    await service.webSearch({ query: 'q', searchCategories: ['news'] });
    expect(backend.search).toHaveBeenCalledWith('q', 1, ['youtube'], undefined);
  });

  it('falls back in order when the search-sources API returns nothing', async () => {
    const backend = { search: vi.fn().mockRejectedValue(new Error('down')) };
    const first = vi.fn().mockResolvedValue({ results: [] });
    const second = vi.fn().mockResolvedValue({ results: [{ title: 'S', url: 'https://s.example', snippet: 'from searxng' }] });
    const service = new SearchSourcesService({ backend, fallbacks: [first, second] });

    const { results } = await service.webSearch({ query: 'q', searchCategories: ['science'] });

    expect(first).toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('q', { categories: ['science'], language: 'en' });
    expect(results[0]).toMatchObject({ title: 'S', url: 'https://s.example', content: 'from searxng' });
  });

  it('gives up on a slow search-sources API after the timeout', async () => {
    const backend = { search: vi.fn(() => new Promise<never>(() => {})) };
    const fallback = vi.fn().mockResolvedValue({ results: [{ title: 'F', url: 'https://f.example' }] });
    const service = new SearchSourcesService({ backend, fallbacks: [fallback], timeoutMs: 10 });
    const { results } = await service.webSearch({ query: 'q' });
    expect(results.map((r) => r.url)).toEqual(['https://f.example']);
  });
});

describe('SourceRegistry', () => {
  it('numbers sources in first-seen order and dedupes by URL', () => {
    const registry = new SourceRegistry();
    expect(registry.add({ url: 'https://a', title: 'A', content: 'short' })).toBe(1);
    expect(registry.add({ url: 'https://b', title: 'B' })).toBe(2);
    expect(registry.add({ url: 'https://a', content: 'a much longer page text' })).toBe(1);
    expect(registry.size).toBe(2);
    expect(registry.toDocuments()[0]).toEqual({ pageContent: 'a much longer page text', metadata: { title: 'A', url: 'https://a' } });
  });

  it('keeps uploads apart by key even though they share a URL', () => {
    const registry = new SourceRegistry();
    expect(registry.add({ url: 'File', title: 'a.pdf' }, 'file:a.pdf')).toBe(1);
    expect(registry.add({ url: 'File', title: 'b.pdf' }, 'file:b.pdf')).toBe(2);
  });
});
