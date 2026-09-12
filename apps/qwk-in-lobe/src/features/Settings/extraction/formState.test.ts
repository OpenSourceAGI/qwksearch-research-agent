import { describe, expect, it } from 'vitest';

import type { ExtractionSettingsResponse, UserExtractionOverrides } from './api';
import {
  formValuesFromOverrides,
  formValuesFromResponse,
  hasAnyOverride,
  INHERIT,
  isFormDirty,
  overridesFromFormValues,
} from './formState';

const response = (
  overrides: ExtractionSettingsResponse['overrides'],
): ExtractionSettingsResponse => ({
  effective: {
    citationStyle: 'apa',
    configured: {
      pdfProcessorUrl: false,
      proxy: false,
      scraperApiKey: false,
      scraperUrl: true,
      tavilyApiKey: false,
    },
    languages: ['en'],
    pdfProcessor: 'frontend',
    tiers: ['qwksearch', 'scraper', 'tavily', 'crawler'],
    timeoutSeconds: 10,
    useThirdPartyBackup: false,
  },
  options: {
    citationStyles: ['apa', 'chicago', 'mla'],
    maxTimeoutSeconds: 60,
    minTimeoutSeconds: 1,
    pdfProcessors: ['docling', 'frontend', 'hybrid'],
    tiers: ['qwksearch', 'scraper', 'tavily', 'crawler'],
  },
  overrides,
});

describe('formValuesFromOverrides', () => {
  it('renders an empty override document as every field inheriting', () => {
    expect(formValuesFromOverrides({})).toEqual({
      citationStyle: INHERIT,
      languages: [],
      pdfProcessor: INHERIT,
      tiers: [],
      timeoutSeconds: null,
      useThirdPartyBackup: INHERIT,
    });
  });

  it('treats a missing document the same as an empty one', () => {
    expect(formValuesFromOverrides()).toEqual(formValuesFromOverrides({}));
  });

  it('keeps `false` distinct from unset for the third-party fallback', () => {
    expect(formValuesFromOverrides({ useThirdPartyBackup: false }).useThirdPartyBackup).toBe('off');
    expect(formValuesFromOverrides({ useThirdPartyBackup: true }).useThirdPartyBackup).toBe('on');
    expect(formValuesFromOverrides({}).useThirdPartyBackup).toBe(INHERIT);
  });

  it('seeds from `overrides`, never from what is in force', () => {
    // The response says APA / ['en'] / 10s are in force; none of that is the
    // user's, so none of it may appear as a value the next save would pin.
    expect(formValuesFromResponse(response({}))).toEqual(formValuesFromOverrides({}));
  });

  it('reads every stored field back', () => {
    expect(
      formValuesFromOverrides({
        citationStyle: 'mla',
        languages: ['fr', 'en'],
        pdfProcessor: 'hybrid',
        tiers: ['qwksearch', 'tavily'],
        timeoutSeconds: 25,
        useThirdPartyBackup: true,
      }),
    ).toEqual({
      citationStyle: 'mla',
      languages: ['fr', 'en'],
      pdfProcessor: 'hybrid',
      tiers: ['qwksearch', 'tavily'],
      timeoutSeconds: 25,
      useThirdPartyBackup: 'on',
    });
  });
});

describe('overridesFromFormValues', () => {
  it('omits every inheriting field rather than sending a null', () => {
    // The Worker's `normalizeOverrides` drops `undefined`, so an absent key is
    // the only way to say "fall back to the operator's config".
    expect(overridesFromFormValues(formValuesFromOverrides({}))).toEqual({});
  });

  it('omits fields on a partial value object', () => {
    expect(overridesFromFormValues({ citationStyle: 'apa' })).toEqual({ citationStyle: 'apa' });
    expect(overridesFromFormValues()).toEqual({});
  });

  it('sends `false` for an explicit off, and omits the key when inheriting', () => {
    expect(overridesFromFormValues({ useThirdPartyBackup: 'off' })).toEqual({
      useThirdPartyBackup: false,
    });
    expect(overridesFromFormValues({ useThirdPartyBackup: INHERIT })).toEqual({});
  });

  it('treats an empty list as inheriting, not as "no tiers"', () => {
    // `QWKSEARCH_EXTRACT_TIERS` with nothing valid in it is a real failure mode
    // on the server; the pane must not be able to produce it by clearing a box.
    expect(overridesFromFormValues({ languages: [], tiers: [] })).toEqual({});
  });

  it('preserves list order — languages are a preference, tiers an execution order', () => {
    expect(
      overridesFromFormValues({ languages: ['pt-BR', 'en'], tiers: ['tavily', 'qwksearch'] }),
    ).toEqual({ languages: ['pt-BR', 'en'], tiers: ['tavily', 'qwksearch'] });
  });

  it('drops a cleared or non-finite timeout', () => {
    expect(overridesFromFormValues({ timeoutSeconds: null })).toEqual({});
    expect(overridesFromFormValues({ timeoutSeconds: Number.NaN })).toEqual({});
    expect(overridesFromFormValues({ timeoutSeconds: 30 })).toEqual({ timeoutSeconds: 30 });
  });

  it('round-trips a full document unchanged', () => {
    const overrides: UserExtractionOverrides = {
      citationStyle: 'chicago',
      languages: ['de'],
      pdfProcessor: 'docling',
      tiers: ['qwksearch'],
      timeoutSeconds: 5,
      useThirdPartyBackup: false,
    };

    expect(overridesFromFormValues(formValuesFromOverrides(overrides))).toEqual(overrides);
  });
});

describe('isFormDirty', () => {
  it('is clean when the form still matches what the server stored', () => {
    const saved: UserExtractionOverrides = { citationStyle: 'mla', languages: ['en'] };
    expect(isFormDirty(formValuesFromOverrides(saved), saved)).toBe(false);
  });

  it('is clean when an untouched form is compared against no overrides', () => {
    expect(isFormDirty(formValuesFromOverrides({}), {})).toBe(false);
    expect(isFormDirty(formValuesFromOverrides({}), undefined)).toBe(false);
  });

  it('does not light up for clearing a list that was never set', () => {
    expect(isFormDirty({ ...formValuesFromOverrides({}), languages: [] }, {})).toBe(false);
  });

  it('notices a changed value, an added one and a removed one', () => {
    expect(isFormDirty({ citationStyle: 'apa' }, { citationStyle: 'mla' })).toBe(true);
    expect(isFormDirty({ citationStyle: 'apa' }, {})).toBe(true);
    expect(isFormDirty(formValuesFromOverrides({}), { citationStyle: 'apa' })).toBe(true);
  });

  it('notices a reordered list even when its members are the same', () => {
    expect(isFormDirty({ tiers: ['scraper', 'qwksearch'] }, { tiers: ['qwksearch', 'scraper'] })).toBe(
      true,
    );
  });

  it('notices a list that grew or shrank', () => {
    expect(isFormDirty({ languages: ['en', 'fr'] }, { languages: ['en'] })).toBe(true);
    expect(isFormDirty({ languages: ['en'] }, { languages: ['en', 'fr'] })).toBe(true);
  });

  it('distinguishes turning the fallback off from leaving it unset', () => {
    expect(isFormDirty({ useThirdPartyBackup: 'off' }, {})).toBe(true);
    expect(isFormDirty({ useThirdPartyBackup: INHERIT }, { useThirdPartyBackup: false })).toBe(true);
  });
});

describe('hasAnyOverride', () => {
  it('is false for nothing stored and true for anything stored', () => {
    expect(hasAnyOverride(undefined)).toBe(false);
    expect(hasAnyOverride({})).toBe(false);
    expect(hasAnyOverride({ citationStyle: 'apa' })).toBe(true);
    expect(hasAnyOverride({ useThirdPartyBackup: false })).toBe(true);
  });
});
