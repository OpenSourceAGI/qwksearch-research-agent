/**
 * The seam guard between the pane and the route that feeds it.
 *
 * `src/` is bundled for the browser and the resolver lives with the search
 * service, so the pane restates the Worker's types in `api.ts`. This file is
 * the only place the two halves meet: it imports the real resolver, builds the
 * exact document `worker/routes/qwksearch/searchSettings.ts` would return, and
 * asserts the client's types and the form's translation still describe it.
 *
 * If a category, a recency filter or an override field is added on the server
 * and not here, one of these fails.
 */
import { describe, expect, it } from 'vitest';

import {
  MAX_MAX_CATEGORIES,
  MAX_RESULT_LIMIT,
  normalizeSearchOverrides,
  resolveSearchSettings,
  SEARCH_CATEGORIES,
  SEARCH_TIME_RANGES,
  searchSettingsForClient,
  type UserSearchOverrides as ServerOverrides,
} from '@/server/services/search/impls/qwksearch/searchSettings';

import type {
  SearchCategory,
  SearchEffectiveSettings,
  SearchFieldOptions,
  SearchSettingsResponse,
  SearchTimeRange,
  UserSearchOverrides,
} from './api';
import { formValuesFromResponse, overridesFromFormValues } from './formState';

/** Mirrors `fieldOptions` in `worker/routes/qwksearch/searchSettings.ts`. */
const fieldOptions: SearchFieldOptions = {
  categories: [...SEARCH_CATEGORIES],
  maxMaxCategories: MAX_MAX_CATEGORIES,
  maxResultLimit: MAX_RESULT_LIMIT,
  minMaxCategories: 1,
  minResultLimit: 1,
  timeRanges: [...SEARCH_TIME_RANGES],
};

/** Mirrors the route's `body()` helper. */
const routeBody = (
  overrides: ServerOverrides,
  env: Record<string, string | undefined> = {},
): SearchSettingsResponse => ({
  effective: searchSettingsForClient(resolveSearchSettings(env, overrides)),
  options: fieldOptions,
  overrides,
});

describe('client types cover the server contract', () => {
  it('assigns the resolver output to the client response type', () => {
    // A structural mismatch is a compile error; the runtime assertion keeps the
    // test honest about actually having built the value.
    const response: SearchSettingsResponse = routeBody({});

    expect(Object.keys(response).sort()).toEqual(['effective', 'options', 'overrides']);
  });

  it('knows every category and recency filter the server ships', () => {
    // The `satisfies` is the assertion: an added enum member the client type
    // does not name fails to compile here.
    expect([...SEARCH_CATEGORIES] satisfies SearchCategory[]).toEqual([
      'files',
      'general',
      'images',
      'it',
      'map',
      'music',
      'news',
      'science',
      'social+media',
      'videos',
    ]);
    expect([...SEARCH_TIME_RANGES] satisfies SearchTimeRange[]).toEqual([
      'day',
      'month',
      'week',
      'year',
    ]);
  });

  it('names exactly the seven fields the server accepts as overrides', () => {
    // Every key of the summary except `configured` is an editable field, by the
    // server's own `Required<UserSearchOverrides> & { configured }` shape.
    const summary = routeBody({}).effective;
    const editable = Object.keys(summary).filter((key) => key !== 'configured');

    expect(editable.sort()).toEqual([
      'categories',
      'language',
      'maxCategories',
      'publicInstances',
      'resultLimit',
      'safeSearch',
      'timeRange',
    ]);
  });

  it('reports the endpoint and the key as presence flags, never as values', () => {
    const { configured } = routeBody(
      {},
      { QWKSEARCH_API_KEY: 'sk-secret', QWKSEARCH_SEARCH_URL: 'https://search.example/api' },
    ).effective;

    expect(configured).toEqual({ apiKey: true, endpoint: true });
    expect(JSON.stringify(routeBody({}, { QWKSEARCH_API_KEY: 'sk-secret' }))).not.toContain(
      'sk-secret',
    );
  });

  it('serializes the two optional fields as null rather than omitting them', () => {
    // "No recency filter" and "no result cap" are values in force, not unset
    // ones, so the pane must be able to tell them from an absent key.
    const { effective } = routeBody({});

    expect(effective.resultLimit).toBeNull();
    expect(effective.timeRange).toBeNull();
  });

  it('bounds `maxCategories` by the number of categories that exist', () => {
    expect(fieldOptions.maxMaxCategories).toBe(fieldOptions.categories.length);
  });
});

describe('the form round-trips through the real validator', () => {
  const overrides: UserSearchOverrides = {
    categories: ['news', 'science'],
    language: 'pt-BR',
    maxCategories: 2,
    publicInstances: true,
    resultLimit: 25,
    safeSearch: false,
    timeRange: 'week',
  };

  it('survives a load → edit → save cycle unchanged', () => {
    const stored = normalizeSearchOverrides(overrides as ServerOverrides);
    const sent = overridesFromFormValues(formValuesFromResponse(routeBody(stored)));

    expect(normalizeSearchOverrides(sent as ServerOverrides)).toEqual(stored);
  });

  it('sends nothing the server would reject as an empty override document', () => {
    // An untouched form must not be able to write a row at all.
    expect(
      normalizeSearchOverrides(overridesFromFormValues(formValuesFromResponse(routeBody({})))),
    ).toEqual({});
  });

  it('lets an explicit `false` through, which an omitted key could not express', () => {
    const sent = overridesFromFormValues({ safeSearch: 'off' });

    expect(normalizeSearchOverrides(sent as ServerOverrides)).toEqual({ safeSearch: false });
  });

  it("shows the operator layer as `effective` while `overrides` stays the user's", () => {
    const env = { QWKSEARCH_SEARCH_LANGUAGE: 'fr-FR', QWKSEARCH_SEARCH_MAX_CATEGORIES: '7' };
    const response = routeBody({ safeSearch: true }, env);

    // The user set only safe search, so the language input stays empty even
    // though fr-FR is what their next search would actually use.
    expect(response.effective.language).toBe('fr-FR');
    expect(response.effective.maxCategories).toBe(7);
    expect(formValuesFromResponse(response).language).toBe('');
    expect(formValuesFromResponse(response).maxCategories).toBeNull();
    expect(formValuesFromResponse(response).safeSearch).toBe('on');
  });

  it('follows the server when it trims a value the form offered', () => {
    // An unknown category is dropped and an out-of-range budget is clamped to
    // the number of categories that exist — two different fates, and the form
    // must render the response rather than its own optimistic state either way.
    const sent = { categories: ['news', 'not-a-category'], maxCategories: 99 };
    const stored = normalizeSearchOverrides(sent as unknown as ServerOverrides);

    expect(stored.categories).toEqual(['news']);
    expect(stored.maxCategories).toBe(MAX_MAX_CATEGORIES);

    const values = formValuesFromResponse(routeBody(stored));
    expect(values.categories).toEqual(['news']);
    expect(values.maxCategories).toBe(MAX_MAX_CATEGORIES);
  });

  it('caps the effective category list at the resolved `maxCategories`', () => {
    // The fan-out truncates after every layer resolves, so a user who picks
    // five categories and a budget of two sees two in force and five stored.
    const response = routeBody(
      normalizeSearchOverrides({
        categories: ['news', 'science', 'images', 'videos', 'files'],
        maxCategories: 2,
      } as ServerOverrides),
    );

    expect(response.effective.categories).toEqual(['news', 'science']);
    expect(formValuesFromResponse(response).categories).toHaveLength(5);
  });
});

describe('the effective document is assignable to the client type', () => {
  it('matches field by field', () => {
    const effective: SearchEffectiveSettings = searchSettingsForClient(resolveSearchSettings({}));

    expect(effective.categories).toEqual(['general']);
    expect(effective.language).toBe('en-US');
    expect(effective.maxCategories).toBe(3);
    expect(effective.publicInstances).toBe(false);
    expect(effective.safeSearch).toBe(false);
  });
});
