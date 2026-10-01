import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('domain-rank/data/domain-rank-merged.json', () => ({
  default: {
    'example.com': ['Example', 100],
    'github.com': ['GitHub', 50],
  },
}));

import { ENGINES } from '../src/engines';
import { DEFAULT_ENGINE } from '../src/autocomplete';
import { createAutocompleteHandler, searchDomains } from '../src/server';

afterEach(() => vi.restoreAllMocks());

const get = (params: Record<string, string>) => {
  const url = new URL('http://localhost/api/agent/autocomplete');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url);
};

describe('createAutocompleteHandler', () => {
  it('uses the default engine and caps at the limit', async () => {
    const engine = vi
      .spyOn(ENGINES, DEFAULT_ENGINE)
      .mockResolvedValue(Array.from({ length: 12 }, (_, i) => `s${i}`));
    const res = await createAutocompleteHandler().GET(get({ q: 'test', limit: '3' }));
    expect((await res.json()).suggestions).toEqual(['s0', 's1', 's2']);
    expect(engine).toHaveBeenCalledOnce();
  });

  it('honors ?engine= and the first of the legacy ?backends=', async () => {
    const bing = vi.spyOn(ENGINES, 'bing').mockResolvedValue(['b']);
    const brave = vi.spyOn(ENGINES, 'brave').mockResolvedValue(['r']);
    await createAutocompleteHandler().GET(get({ q: 'x', engine: 'bing' }));
    await createAutocompleteHandler().GET(get({ q: 'x', backends: 'brave,bing' }));
    expect(bing).toHaveBeenCalledOnce();
    expect(brave).toHaveBeenCalledOnce();
  });

  it('answers an empty query without calling an engine', async () => {
    const engine = vi.spyOn(ENGINES, DEFAULT_ENGINE);
    const res = await createAutocompleteHandler().GET(get({}));
    expect(await res.json()).toEqual({ suggestions: [], domains: [] });
    expect(engine).not.toHaveBeenCalled();
  });
});

describe('searchDomains', () => {
  it('matches ranked sites and literal domains, but not filenames', () => {
    expect(searchDomains('github').map((d) => d.domain)).toContain('github.com');
    expect(searchDomains('red.com')[0]).toMatchObject({ domain: 'red.com', rank: Number.MAX_SAFE_INTEGER });
    expect(searchDomains('note.txt').some((d) => d.domain === 'note.txt')).toBe(false);
    expect(searchDomains('example.com').filter((d) => d.domain === 'example.com')).toHaveLength(1);
  });
});
