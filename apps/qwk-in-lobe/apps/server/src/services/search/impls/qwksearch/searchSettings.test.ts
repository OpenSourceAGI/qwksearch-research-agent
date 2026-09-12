// @vitest-environment node
import { QWKSEARCH_SEARCH_CATEGORIES } from '@lobechat/builtin-tool-web-browsing';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MAX_CATEGORIES,
  DEFAULT_SEARCH_ENDPOINT,
  DEFAULT_SEARCH_LANGUAGE,
  DEFAULT_SEARCH_SETTINGS,
  MAX_MAX_CATEGORIES,
  MAX_RESULT_LIMIT,
  normalizeHttpUrl,
  normalizeSearchCategories,
  normalizeSearchLanguage,
  normalizeSearchOverrides,
  normalizeTimeRange,
  redactSearchSettings,
  resolveSearchSettings,
  SEARCH_CATEGORIES,
  searchOverridesFromParams,
  type SearchSettings,
  searchSettingsForClient,
  searchSettingsFromEnv,
  type UserSearchOverrides,
} from './searchSettings';

/** Resolve against an explicit env so the ambient process is never consulted. */
const resolve = (
  env: Record<string, string | undefined> = {},
  ...overrides: Array<undefined | UserSearchOverrides>
) => resolveSearchSettings(env, ...overrides);

describe('the category vocabulary', () => {
  it('accepts every category the tool manifest advertises', () => {
    // The guard against drift between the two halves of the seam: a category
    // the manifest offers the model but this module drops gets silently
    // replaced by `general`, which is the empty-page failure the enum exists
    // to prevent.
    for (const category of QWKSEARCH_SEARCH_CATEGORIES) {
      expect(SEARCH_CATEGORIES as readonly string[], category).toContain(category);
    }
  });

  it('advertises nothing the endpoint cannot serve', () => {
    expect([...SEARCH_CATEGORIES].sort()).toEqual([...QWKSEARCH_SEARCH_CATEGORIES].sort());
  });
});

describe('normalizeSearchCategories', () => {
  it('maps the registry names onto the endpoint vocabulary', () => {
    expect(normalizeSearchCategories(['academic', 'social', 'tech'])).toEqual([
      'science',
      'social+media',
      'it',
    ]);
  });

  it('preserves the order asked for', () => {
    expect(normalizeSearchCategories(['videos', 'news', 'general'])).toEqual([
      'videos',
      'news',
      'general',
    ]);
  });

  it('deduplicates aliases that collapse onto the same category', () => {
    expect(normalizeSearchCategories(['videos', 'video', 'Videos'])).toEqual(['videos']);
  });

  it('drops unknown categories but keeps the recognized ones', () => {
    expect(normalizeSearchCategories(['nonsense', 'news'])).toEqual(['news']);
  });

  it('returns undefined rather than an empty list, so the layer above stands', () => {
    expect(normalizeSearchCategories(['nonsense'])).toBeUndefined();
    expect(normalizeSearchCategories([])).toBeUndefined();
    expect(normalizeSearchCategories(undefined)).toBeUndefined();
    expect(normalizeSearchCategories('   ')).toBeUndefined();
  });

  it('reads a comma-separated string, which is how the environment carries it', () => {
    expect(normalizeSearchCategories('news, science ,videos')).toEqual([
      'news',
      'science',
      'videos',
    ]);
  });

  it('does not cap — the cap belongs to resolveSearchSettings', () => {
    expect(normalizeSearchCategories([...SEARCH_CATEGORIES])).toHaveLength(
      SEARCH_CATEGORIES.length,
    );
  });
});

describe('normalizeTimeRange', () => {
  it('accepts the four the endpoint forwards', () => {
    for (const range of ['day', 'week', 'month', 'year']) {
      expect(normalizeTimeRange(range)).toBe(range);
    }
    expect(normalizeTimeRange('WEEK')).toBe('week');
  });

  it('drops anything else, including the manifest\'s "no filter" value', () => {
    expect(normalizeTimeRange('anytime')).toBeUndefined();
    expect(normalizeTimeRange('')).toBeUndefined();
    expect(normalizeTimeRange(7)).toBeUndefined();
  });
});

describe('normalizeSearchLanguage', () => {
  it('canonicalizes case so two spellings are not two settings', () => {
    expect(normalizeSearchLanguage('EN-us')).toBe('en-US');
    expect(normalizeSearchLanguage('zh-hans-cn')).toBe('zh-Hans-CN');
    expect(normalizeSearchLanguage(' fr ')).toBe('fr');
  });

  it('rejects anything that is not a language tag', () => {
    expect(normalizeSearchLanguage('en_US')).toBeUndefined();
    expect(normalizeSearchLanguage('english (american)')).toBeUndefined();
    expect(normalizeSearchLanguage('')).toBeUndefined();
    expect(normalizeSearchLanguage(42)).toBeUndefined();
  });
});

describe('normalizeHttpUrl', () => {
  it('keeps http(s) URLs and trims the trailing slash', () => {
    expect(normalizeHttpUrl('https://a.example/search/')).toBe('https://a.example/search');
  });

  it('drops every other scheme and anything unparseable', () => {
    expect(normalizeHttpUrl('file:///etc/passwd')).toBeUndefined();
    expect(normalizeHttpUrl('javascript:alert(1)')).toBeUndefined();
    expect(normalizeHttpUrl('not a url')).toBeUndefined();
    expect(normalizeHttpUrl(undefined)).toBeUndefined();
  });
});

describe('searchSettingsFromEnv', () => {
  it('reads every knob', () => {
    expect(
      searchSettingsFromEnv({
        QWKSEARCH_API_KEY: 'secret',
        QWKSEARCH_SEARCH_CATEGORIES: 'news,science',
        QWKSEARCH_SEARCH_LANGUAGE: 'fr-fr',
        QWKSEARCH_SEARCH_MAX_CATEGORIES: '2',
        QWKSEARCH_SEARCH_PUBLIC_INSTANCES: 'yes',
        QWKSEARCH_SEARCH_RESULT_LIMIT: '25',
        QWKSEARCH_SEARCH_SAFE: 'true',
        QWKSEARCH_SEARCH_TIME_RANGE: 'month',
        QWKSEARCH_SEARCH_URL: 'https://staging.example/api/agent/search',
      }),
    ).toEqual({
      apiKey: 'secret',
      categories: ['news', 'science'],
      endpoint: 'https://staging.example/api/agent/search',
      language: 'fr-FR',
      maxCategories: 2,
      publicInstances: true,
      resultLimit: 25,
      safeSearch: true,
      timeRange: 'month',
    });
  });

  it('leaves every field undefined when nothing is set', () => {
    expect(Object.values(searchSettingsFromEnv({})).every((v) => v === undefined)).toBe(true);
  });

  it('clamps the numeric knobs instead of rejecting them', () => {
    const tooBig = searchSettingsFromEnv({
      QWKSEARCH_SEARCH_MAX_CATEGORIES: '99',
      QWKSEARCH_SEARCH_RESULT_LIMIT: '10000',
    });
    expect(tooBig.maxCategories).toBe(MAX_MAX_CATEGORIES);
    expect(tooBig.resultLimit).toBe(MAX_RESULT_LIMIT);

    const tooSmall = searchSettingsFromEnv({
      QWKSEARCH_SEARCH_MAX_CATEGORIES: '0',
      QWKSEARCH_SEARCH_RESULT_LIMIT: '-5',
    });
    expect(tooSmall.maxCategories).toBe(1);
    expect(tooSmall.resultLimit).toBe(1);
  });

  it('ignores a malformed value rather than failing the search', () => {
    const env = searchSettingsFromEnv({
      QWKSEARCH_SEARCH_CATEGORIES: 'nonsense',
      QWKSEARCH_SEARCH_LANGUAGE: 'not a tag',
      QWKSEARCH_SEARCH_MAX_CATEGORIES: 'three',
      QWKSEARCH_SEARCH_TIME_RANGE: 'fortnight',
      QWKSEARCH_SEARCH_URL: 'ftp://example.com',
    });

    expect(env.categories).toBeUndefined();
    expect(env.language).toBeUndefined();
    expect(env.maxCategories).toBeUndefined();
    expect(env.timeRange).toBeUndefined();
    expect(env.endpoint).toBeUndefined();
  });
});

describe('searchOverridesFromParams', () => {
  it('takes only the two fields the manifest offers the model', () => {
    expect(
      searchOverridesFromParams({
        searchCategories: ['tech'],
        searchEngines: ['google'],
        searchTimeRange: 'week',
      }),
    ).toEqual({ categories: ['it'], timeRange: 'week' });
  });

  it('never carries an engine restriction', () => {
    const overrides = searchOverridesFromParams({ searchEngines: ['google', 'bing'] });
    expect(overrides).toEqual({});
    expect(JSON.stringify(overrides)).not.toContain('google');
  });

  it('omits a time range the endpoint does not understand', () => {
    expect(searchOverridesFromParams({ searchTimeRange: 'anytime' })).toEqual({});
  });

  it('omits an unknown category rather than searching general instead', () => {
    // The whole list survives or the layer above decides; a call for `music`
    // must not quietly become a call for `general`.
    expect(searchOverridesFromParams({ searchCategories: ['nonsense'] })).toEqual({});
  });

  it('handles being called with nothing', () => {
    expect(searchOverridesFromParams()).toEqual({});
    expect(searchOverridesFromParams({})).toEqual({});
  });
});

describe('normalizeSearchOverrides', () => {
  it('drops the keys it could not validate, so they inherit', () => {
    expect(
      normalizeSearchOverrides({
        categories: ['nonsense'] as never,
        language: 'not a tag',
        maxCategories: Number.NaN,
        timeRange: 'fortnight' as never,
      }),
    ).toEqual({});
  });

  it('keeps false as a value, distinct from unset', () => {
    expect(normalizeSearchOverrides({ safeSearch: false })).toEqual({ safeSearch: false });
    expect(normalizeSearchOverrides({})).toEqual({});
  });

  it('rounds and clamps a numeric preference', () => {
    expect(normalizeSearchOverrides({ maxCategories: 2.4 })).toEqual({ maxCategories: 2 });
    expect(normalizeSearchOverrides({ resultLimit: 1e6 })).toEqual({
      resultLimit: MAX_RESULT_LIMIT,
    });
  });

  it('cannot reach the endpoint or the api key', () => {
    const smuggled = { apiKey: 'stolen', endpoint: 'https://evil.example' };
    expect(normalizeSearchOverrides(smuggled as UserSearchOverrides)).toEqual({});
  });
});

describe('resolveSearchSettings', () => {
  it('is the shipped defaults with no env and no overrides', () => {
    expect(resolve()).toEqual(DEFAULT_SEARCH_SETTINGS);
    expect(resolve().endpoint).toBe(DEFAULT_SEARCH_ENDPOINT);
    expect(resolve().language).toBe(DEFAULT_SEARCH_LANGUAGE);
    expect(resolve().maxCategories).toBe(DEFAULT_MAX_CATEGORIES);
    expect(resolve().resultLimit).toBeUndefined();
    expect(resolve().timeRange).toBeUndefined();
  });

  it('layers env over defaults and overrides over env', () => {
    const settings = resolve(
      { QWKSEARCH_SEARCH_LANGUAGE: 'de-DE', QWKSEARCH_SEARCH_SAFE: 'true' },
      { language: 'ja-JP' },
    );

    expect(settings.language).toBe('ja-JP');
    expect(settings.safeSearch).toBe(true);
  });

  it('lets a later layer win only where it carries a valid value', () => {
    const settings = resolve({ QWKSEARCH_SEARCH_LANGUAGE: 'de-DE' }, { language: '' });
    expect(settings.language).toBe('de-DE');
  });

  it('never lets an override blank out the operator endpoint or key', () => {
    const env = { QWKSEARCH_API_KEY: 'secret', QWKSEARCH_SEARCH_URL: 'https://staging.example/s' };
    const settings = resolve(env, { apiKey: '', endpoint: '' } as UserSearchOverrides);

    expect(settings.endpoint).toBe('https://staging.example/s');
    expect(settings.apiKey).toBe('secret');
  });

  it('applies the category cap after every layer, not inside one', () => {
    // The list comes from the request layer and the bound from the user layer;
    // capping inside a layer would use the wrong bound.
    const settings = resolve(
      {},
      { maxCategories: 2 },
      { categories: ['news', 'science', 'videos', 'music'] },
    );

    expect(settings.categories).toEqual(['news', 'science']);
  });

  it('caps at three by default', () => {
    expect(
      resolve({}, { categories: ['general', 'news', 'images', 'videos', 'science'] }).categories,
    ).toHaveLength(DEFAULT_MAX_CATEGORIES);
  });

  it('lets the operator widen the fan-out past the default', () => {
    const settings = resolve(
      { QWKSEARCH_SEARCH_MAX_CATEGORIES: '5' },
      { categories: ['general', 'news', 'images', 'videos', 'science'] },
    );

    expect(settings.categories).toHaveLength(5);
  });

  it('falls back to the layer above when a request names nothing valid', () => {
    const settings = resolve(
      { QWKSEARCH_SEARCH_CATEGORIES: 'news' },
      searchOverridesFromParams({ searchCategories: ['nonsense'] }),
    );

    expect(settings.categories).toEqual(['news']);
  });

  it('ignores an undefined layer', () => {
    expect(resolve({}, undefined, { safeSearch: true }).safeSearch).toBe(true);
  });

  it('does not mutate the defaults', () => {
    resolve({}, { categories: ['news'] });
    expect(DEFAULT_SEARCH_SETTINGS.categories).toEqual(['general']);
  });
});

describe('redactSearchSettings', () => {
  it('reduces the key to a presence flag and keeps everything else', () => {
    const settings: SearchSettings = { ...DEFAULT_SEARCH_SETTINGS, apiKey: 'secret' };
    const redacted = redactSearchSettings(settings);

    expect(redacted.apiKey).toBe(true);
    expect(JSON.stringify(redacted)).not.toContain('secret');
    expect(redacted.endpoint).toBe(DEFAULT_SEARCH_ENDPOINT);
  });

  it('reports an unset key as false', () => {
    expect(redactSearchSettings(DEFAULT_SEARCH_SETTINGS).apiKey).toBe(false);
  });
});

describe('searchSettingsForClient', () => {
  const summary = searchSettingsForClient(
    resolve({
      QWKSEARCH_API_KEY: 'secret',
      QWKSEARCH_SEARCH_URL: 'https://user:pass@staging.example/s',
    }),
  );

  it('leaks neither the endpoint nor the key, only whether they are set', () => {
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('staging.example');
    expect(serialized).not.toContain('pass');
    expect(summary.configured).toEqual({ apiKey: true, endpoint: true });
  });

  it('carries exactly the fields a user may change', () => {
    expect(Object.keys(summary).toSorted()).toEqual([
      'categories',
      'configured',
      'language',
      'maxCategories',
      'publicInstances',
      'resultLimit',
      'safeSearch',
      'timeRange',
    ]);
  });

  it('serializes the two optional fields as null, not as absent', () => {
    // Absent means "inherit" everywhere else in this seam; "no recency filter"
    // is a value in force.
    expect(summary.resultLimit).toBeNull();
    expect(summary.timeRange).toBeNull();
    // `undefined` would have been dropped by the route's own JSON encoding.
    expect(JSON.stringify(summary)).toContain('"timeRange":null');
  });

  it('reports what is actually in force when it is set', () => {
    const set = searchSettingsForClient(
      resolve({ QWKSEARCH_SEARCH_RESULT_LIMIT: '10', QWKSEARCH_SEARCH_TIME_RANGE: 'day' }),
    );

    expect(set.resultLimit).toBe(10);
    expect(set.timeRange).toBe('day');
    expect(set.configured.apiKey).toBe(false);
  });
});
