/**
 * @fileoverview Unit tests for the search-engine autocomplete backends.
 * `fetch` is stubbed throughout — these tests assert URL construction and
 * response shaping, never real network access.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  backends,
  baidu,
  brave,
  duckduckgo,
  google,
  qwant,
  searchAutocomplete,
  searchAutocompleteMulti,
  startpage,
  wikipedia,
  yandex,
} from '../src/suggest-next-words/autocomplete-search-engines';

/** Stubs `fetch` with a JSON body and records the calls. */
function stubJson(body: unknown) {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => body,
    text: async () => JSON.stringify(body),
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** Stubs `fetch` with a text body (used by the Google backend). */
function stubText(body: string) {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => JSON.parse(body),
    text: async () => body,
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function stubFailure(status = 500) {
  const fetchMock = vi.fn(async () => ({
    ok: false,
    status,
    statusText: 'Server Error',
    json: async () => ({}),
    text: async () => '',
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function requestedUrl(fetchMock: ReturnType<typeof stubJson>) {
  return fetchMock.mock.calls[0][0] as unknown as string;
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('baidu', () => {
  it('maps the g array to suggestion strings', async () => {
    const fetchMock = stubJson({ g: [{ q: 'cats' }, { q: 'cat food' }] });

    await expect(baidu('cat')).resolves.toEqual(['cats', 'cat food']);
    expect(requestedUrl(fetchMock)).toContain('baidu.com/sugrec');
    expect(requestedUrl(fetchMock)).toContain('wd=cat');
  });

  it('returns an empty list when the payload has no g array', async () => {
    stubJson({});

    await expect(baidu('cat')).resolves.toEqual([]);
  });
});

describe('brave', () => {
  it('returns the second element of the opensearch tuple', async () => {
    const fetchMock = stubJson(['cat', ['cats', 'cat food']]);

    await expect(brave('cat')).resolves.toEqual(['cats', 'cat food']);
    expect(requestedUrl(fetchMock)).toContain('search.brave.com/api/suggest');
  });

  it('returns an empty list for an unexpected payload', async () => {
    stubJson({ unexpected: true });

    await expect(brave('cat')).resolves.toEqual([]);
  });
});

describe('duckduckgo', () => {
  it('reverses the locale into a region code', async () => {
    const fetchMock = stubJson(['cat', ['cats']]);

    await expect(duckduckgo('cat', 'en-US')).resolves.toEqual(['cats']);
    expect(requestedUrl(fetchMock)).toContain('kl=us-en');
  });

  it('defaults to the en-US region', async () => {
    const fetchMock = stubJson(['cat', ['cats']]);

    await duckduckgo('cat');

    expect(requestedUrl(fetchMock)).toContain('kl=us-en');
  });
});

describe('google', () => {
  it('decodes entities from suggestions carrying a full document', async () => {
    const fetchMock = stubText(
      'window.google.ac.h([[["<html><body>cats &amp; dogs</body></html>",0]]])'
    );

    await expect(google('cat')).resolves.toEqual(['cats & dogs']);
    expect(requestedUrl(fetchMock)).toContain('google.com/complete/search');
  });

  it('drops suggestions that are bare markup fragments', async () => {
    // The decoder reads `document.body` from `parseHTML(item[0])`, which is
    // empty (or throws) for a fragment like `<b>cats</b>`, so these are lost.
    stubText('window.google.ac.h([[["<b>cats</b>",0],["cat food",0]]])');

    await expect(google('cat')).resolves.toEqual([]);
  });

  it('uses the localised subdomain', async () => {
    const fetchMock = stubText('[[["katzen"]]]');

    await google('katze', 'de-DE');

    expect(requestedUrl(fetchMock)).toContain('google.de');
    expect(requestedUrl(fetchMock)).toContain('hl=de');
  });

  it('falls back to google.com for an unmapped locale', async () => {
    const fetchMock = stubText('[[["x"]]]');

    await google('x', 'xx-XX');

    expect(requestedUrl(fetchMock)).toContain('google.com');
  });

  it('swallows a malformed payload', async () => {
    stubText('not json at all [oops');

    await expect(google('cat')).resolves.toEqual([]);
  });
});

describe('qwant', () => {
  it('maps items to their value field', async () => {
    const fetchMock = stubJson({
      status: 'success',
      data: { items: [{ value: 'cats' }, { value: 'cat food' }] },
    });

    await expect(qwant('cat')).resolves.toEqual(['cats', 'cat food']);
    expect(requestedUrl(fetchMock)).toContain('api.qwant.com');
  });

  it('normalises a dashed locale to an underscore', async () => {
    const fetchMock = stubJson({ status: 'success', data: { items: [] } });

    await qwant('cat', 'en-US');

    expect(requestedUrl(fetchMock)).toContain('locale=en_US');
  });

  it('returns an empty list on a non-success status', async () => {
    stubJson({ status: 'error' });

    await expect(qwant('cat')).resolves.toEqual([]);
  });
});

describe('startpage', () => {
  it('maps the locale to a language name', async () => {
    const fetchMock = stubJson(['cat', ['cats']]);

    await expect(startpage('cat', 'de-DE')).resolves.toEqual(['cats']);
    expect(requestedUrl(fetchMock)).toContain('lui=deutsch');
  });

  it('falls back to english for an unmapped locale', async () => {
    const fetchMock = stubJson(['cat', ['cats']]);

    await startpage('cat', 'xx');

    expect(requestedUrl(fetchMock)).toContain('lui=english');
  });

  it('returns an empty list for an unexpected payload', async () => {
    stubJson(['cat']);

    await expect(startpage('cat')).resolves.toEqual([]);
  });
});

describe('wikipedia', () => {
  it('queries the localised wiki host', async () => {
    const fetchMock = stubJson(['cat', ['Cat', 'Cat food']]);

    await expect(wikipedia('cat', 'fr-FR')).resolves.toEqual(['Cat', 'Cat food']);
    expect(requestedUrl(fetchMock)).toContain('fr.wikipedia.org');
    expect(requestedUrl(fetchMock)).toContain('action=opensearch');
  });

  it('defaults to the English wiki', async () => {
    const fetchMock = stubJson(['cat', []]);

    await wikipedia('cat', 'xx');

    expect(requestedUrl(fetchMock)).toContain('en.wikipedia.org');
  });
});

describe('yandex', () => {
  it('returns the second element of the tuple', async () => {
    const fetchMock = stubJson(['cat', ['cats']]);

    await expect(yandex('cat')).resolves.toEqual(['cats']);
    expect(requestedUrl(fetchMock)).toContain('suggest.yandex.com');
  });
});

describe('backends registry', () => {
  it('exposes every backend by name', () => {
    expect(Object.keys(backends).sort()).toEqual([
      'baidu',
      'brave',
      'duckduckgo',
      'google',
      'qwant',
      'startpage',
      'wikipedia',
      'yandex',
    ]);
  });
});

describe('searchAutocomplete', () => {
  it('dispatches to the named backend', async () => {
    stubJson(['cat', ['cats']]);

    await expect(searchAutocomplete('yandex', 'cat')).resolves.toEqual(['cats']);
  });

  it('warns and returns an empty list for an unknown backend', async () => {
    await expect(searchAutocomplete('nope', 'cat')).resolves.toEqual([]);
    expect(console.warn).toHaveBeenCalled();
  });

  it('swallows a backend error', async () => {
    stubFailure();

    await expect(searchAutocomplete('yandex', 'cat')).resolves.toEqual([]);
  });

  it('swallows a network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      })
    );

    await expect(searchAutocomplete('yandex', 'cat')).resolves.toEqual([]);
  });
});

describe('searchAutocompleteMulti', () => {
  it('merges and deduplicates across backends', async () => {
    stubJson(['cat', ['cats', 'cat food']]);

    const merged = await searchAutocompleteMulti(['yandex', 'brave'], 'cat');

    expect(merged).toEqual(['cats', 'cat food']);
  });

  it('returns an empty list when every backend fails', async () => {
    stubFailure();

    await expect(searchAutocompleteMulti(['yandex', 'brave'], 'cat')).resolves.toEqual([]);
  });

  it('returns an empty list for no backends', async () => {
    await expect(searchAutocompleteMulti([], 'cat')).resolves.toEqual([]);
  });
});
