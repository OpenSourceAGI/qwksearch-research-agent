import { afterEach, describe, expect, it, vi } from 'vitest';
import { ENGINES } from '../src/engines';
import { DEFAULT_ENGINE, getSuggestions, resolveEngine } from '../src/autocomplete';

afterEach(() => vi.restoreAllMocks());

describe('resolveEngine', () => {
  it('defaults to the benchmarked engine and accepts the ddg alias', () => {
    expect(resolveEngine()).toBe(DEFAULT_ENGINE);
    expect(resolveEngine('nope')).toBe(DEFAULT_ENGINE);
    expect(resolveEngine(' Wikipedia ')).toBe('wikipedia');
    expect(resolveEngine('ddg')).toBe('duckduckgo');
  });
});

describe('getSuggestions', () => {
  it('asks exactly one engine', async () => {
    const spies = Object.keys(ENGINES).map((name) =>
      vi.spyOn(ENGINES, name as keyof typeof ENGINES).mockResolvedValue(['x']),
    );
    await getSuggestions('hello', { engine: 'bing' });
    const called = spies.filter((s) => s.mock.calls.length > 0);
    expect(called).toHaveLength(1);
    expect(ENGINES.bing).toHaveBeenCalledWith('hello', expect.objectContaining({ engine: 'bing' }));
  });

  it('deduplicates', async () => {
    vi.spyOn(ENGINES, DEFAULT_ENGINE).mockResolvedValue(['a', 'a', 'b']);
    await expect(getSuggestions('a')).resolves.toEqual(['a', 'b']);
  });

  it('drops leading words when the whole query has no completions', async () => {
    const engine = vi.spyOn(ENGINES, DEFAULT_ENGINE).mockImplementation(async (q) =>
      q === 'quantum entangl' ? ['quantum entanglement'] : [],
    );
    await expect(getSuggestions('my notes on quantum entangl')).resolves.toEqual([
      'my notes on quantum entanglement',
    ]);
    expect(engine.mock.calls.map((c) => c[0])).toEqual([
      'my notes on quantum entangl',
      'on quantum entangl',
      'quantum entangl',
    ]);
  });

  it('treats an engine failure as no suggestions', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(ENGINES, DEFAULT_ENGINE).mockRejectedValue(new Error('down'));
    await expect(getSuggestions('x')).resolves.toEqual([]);
  });
});
