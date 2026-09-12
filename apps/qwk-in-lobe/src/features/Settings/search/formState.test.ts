import { describe, expect, it } from 'vitest';

import type { SearchSettingsResponse } from './api';
import {
  EMPTY_FORM_VALUES,
  formValuesFromOverrides,
  formValuesFromResponse,
  hasAnyOverride,
  INHERIT,
  isFormDirty,
  overridesFromFormValues,
} from './formState';

const response = (overrides: SearchSettingsResponse['overrides'] = {}): SearchSettingsResponse => ({
  effective: {
    categories: ['news', 'general'],
    configured: { apiKey: true, endpoint: true },
    language: 'fr-FR',
    maxCategories: 5,
    publicInstances: true,
    resultLimit: 50,
    safeSearch: true,
    timeRange: 'week',
    ...overrides,
  } as SearchSettingsResponse['effective'],
  options: {
    categories: ['files', 'general', 'images', 'news', 'science', 'videos'],
    maxMaxCategories: 10,
    maxResultLimit: 200,
    minMaxCategories: 1,
    minResultLimit: 1,
    timeRanges: ['day', 'month', 'week', 'year'],
  },
  overrides,
});

describe('formValuesFromOverrides', () => {
  it('renders an empty override document as the all-inherit form', () => {
    expect(formValuesFromOverrides({})).toEqual(EMPTY_FORM_VALUES);
    expect(formValuesFromOverrides()).toEqual(EMPTY_FORM_VALUES);
  });

  it('keeps "off" distinct from "unset" for both booleans', () => {
    expect(formValuesFromOverrides({ publicInstances: false, safeSearch: false })).toMatchObject({
      publicInstances: 'off',
      safeSearch: 'off',
    });
    expect(formValuesFromOverrides({})).toMatchObject({
      publicInstances: INHERIT,
      safeSearch: INHERIT,
    });
  });

  it('reads `overrides`, never `effective`', () => {
    // The user set only the category list, so every other input stays empty
    // even though the server would apply fr-FR, a 50-result cap and a week's
    // recency to their next search.
    const values = formValuesFromResponse(response({ categories: ['news'] }));

    expect(values.categories).toEqual(['news']);
    expect(values.language).toBe('');
    expect(values.resultLimit).toBeNull();
    expect(values.timeRange).toBe(INHERIT);
  });
});

describe('overridesFromFormValues', () => {
  it('omits every untouched field rather than sending null', () => {
    // An omitted key is the only way to say "fall back to the operator's
    // configuration"; `null` would be a value that erased the layer below.
    expect(overridesFromFormValues(EMPTY_FORM_VALUES)).toEqual({});
    expect(overridesFromFormValues()).toEqual({});
  });

  it('sends an explicit `false`, which an omitted key could not express', () => {
    expect(overridesFromFormValues({ safeSearch: 'off' })).toEqual({ safeSearch: false });
    expect(overridesFromFormValues({ publicInstances: 'on' })).toEqual({ publicInstances: true });
  });

  it('trims the language tag, which the server would otherwise drop whole', () => {
    expect(overridesFromFormValues({ language: '  pt-BR  ' })).toEqual({ language: 'pt-BR' });
    expect(overridesFromFormValues({ language: '   ' })).toEqual({});
  });

  it('keeps the category order, because it is the fan-out order', () => {
    const values = { categories: ['news', 'general', 'science'] } as const;

    expect(overridesFromFormValues({ categories: [...values.categories] }).categories).toEqual([
      'news',
      'general',
      'science',
    ]);
  });

  it('passes the numbers through without re-validating the bounds', () => {
    // The route clamps; duplicating its bounds here is exactly the drift the
    // `options` payload exists to avoid.
    expect(overridesFromFormValues({ maxCategories: 99, resultLimit: 0 })).toEqual({
      maxCategories: 99,
      resultLimit: 0,
    });
  });

  it('ignores a number input that antd left as NaN or null', () => {
    expect(overridesFromFormValues({ maxCategories: Number.NaN, resultLimit: null })).toEqual({});
  });
});

describe('isFormDirty', () => {
  it('is false for an untouched form, with or without stored overrides', () => {
    expect(isFormDirty(EMPTY_FORM_VALUES, {})).toBe(false);
    expect(isFormDirty(formValuesFromOverrides({ maxCategories: 4 }), { maxCategories: 4 })).toBe(
      false,
    );
  });

  it('is false when a cleared list and a never-set list are compared', () => {
    expect(isFormDirty({ ...EMPTY_FORM_VALUES, categories: [] }, {})).toBe(false);
  });

  it('is true when a category list is reordered', () => {
    expect(
      isFormDirty(
        { ...EMPTY_FORM_VALUES, categories: ['general', 'news'] },
        {
          categories: ['news', 'general'],
        },
      ),
    ).toBe(true);
  });

  it('is true when a boolean moves from unset to explicitly off', () => {
    expect(isFormDirty({ ...EMPTY_FORM_VALUES, safeSearch: 'off' }, {})).toBe(true);
  });

  it('is false while the watcher has not produced values yet', () => {
    expect(isFormDirty(undefined, {})).toBe(false);
  });
});

describe('hasAnyOverride', () => {
  it("is the Reset button's enablement", () => {
    expect(hasAnyOverride(undefined)).toBe(false);
    expect(hasAnyOverride({})).toBe(false);
    expect(hasAnyOverride({ safeSearch: false })).toBe(true);
  });
});
