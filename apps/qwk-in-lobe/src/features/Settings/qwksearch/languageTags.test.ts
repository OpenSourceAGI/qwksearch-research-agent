import { describe, expect, it } from 'vitest';

import {
  canonicalizeLanguageTag,
  isLanguageTag,
  languageLabel,
  lowercaseLanguageTag,
  MAX_TRANSCRIPT_LANGUAGES,
  normalizeLanguageList,
  SUGGESTED_LANGUAGE_TAGS,
} from './languageTags';

describe('isLanguageTag', () => {
  it.each(['en', 'EN', 'pt-BR', 'zh-Hans-CN', 'fil', 'de-1996', 'es-419'])('accepts %s', (tag) => {
    expect(isLanguageTag(tag)).toBe(true);
  });

  it.each(['', '   ', 'e', 'english', 'en_US', 'en-', 'en-toolongsubtag', '汉语', 'en US'])(
    'rejects %s',
    (tag) => {
      expect(isLanguageTag(tag)).toBe(false);
    },
  );

  it('ignores surrounding whitespace, which is a typing artefact', () => {
    expect(isLanguageTag('  pt-BR  ')).toBe(true);
  });
});

describe('canonicalizeLanguageTag', () => {
  it('uppercases a two-letter region subtag', () => {
    expect(canonicalizeLanguageTag('en-us')).toBe('en-US');
  });

  it('title-cases a four-letter script subtag', () => {
    expect(canonicalizeLanguageTag('ZH-HANS-cn')).toBe('zh-Hans-CN');
  });

  it('lowercases anything else, including numeric variants', () => {
    expect(canonicalizeLanguageTag('DE-1996')).toBe('de-1996');
  });

  it('returns undefined for a tag the server would drop', () => {
    expect(canonicalizeLanguageTag('english')).toBeUndefined();
  });
});

describe('lowercaseLanguageTag', () => {
  it('lowers the whole tag, which is how the extraction route deduplicates', () => {
    expect(lowercaseLanguageTag('PT-br')).toBe('pt-br');
  });

  it('returns undefined for a malformed tag', () => {
    expect(lowercaseLanguageTag('zz_ZZ')).toBeUndefined();
  });
});

describe('normalizeLanguageList', () => {
  const lowercase = { casing: 'lowercase' as const, limit: MAX_TRANSCRIPT_LANGUAGES };

  it('keeps the order given — it is the preference order', () => {
    expect(normalizeLanguageList(['fr', 'en', 'de'], lowercase).value).toEqual(['fr', 'en', 'de']);
  });

  it('reports what the pattern rejected instead of dropping it in silence', () => {
    const result = normalizeLanguageList(['en', 'klingon', 'fr'], lowercase);

    expect(result.value).toEqual(['en', 'fr']);
    expect(result.invalid).toEqual(['klingon']);
    expect(result.overflow).toEqual([]);
  });

  it('deduplicates two spellings of one language without calling it a rejection', () => {
    const result = normalizeLanguageList(['en', 'EN', 'en'], lowercase);

    expect(result.value).toEqual(['en']);
    expect(result.invalid).toEqual([]);
  });

  it('deduplicates on the normalized form, so casing decides what collides', () => {
    // Lowercased, `EN-us` and `en-US` are one tag. Canonically cased they are
    // also one tag — but the survivor is spelled differently.
    expect(normalizeLanguageList(['EN-us', 'en-US'], lowercase).value).toEqual(['en-us']);
    expect(
      normalizeLanguageList(['EN-us', 'en-US'], { casing: 'canonical', limit: 5 }).value,
    ).toEqual(['en-US']);
  });

  it('reports the overflow separately from the rejections', () => {
    const result = normalizeLanguageList(['en', 'fr', 'de', 'it', 'es', 'pt', 'nl'], lowercase);

    expect(result.value).toEqual(['en', 'fr', 'de', 'it', 'es']);
    expect(result.overflow).toEqual(['pt', 'nl']);
    expect(result.invalid).toEqual([]);
  });

  it('does not count a duplicate against the limit', () => {
    const result = normalizeLanguageList(['en', 'en', 'fr', 'de', 'it', 'es'], lowercase);

    expect(result.value).toEqual(['en', 'fr', 'de', 'it', 'es']);
    expect(result.overflow).toEqual([]);
  });

  it('drops empty entries without reporting them — they come from token separators', () => {
    const result = normalizeLanguageList(['en', '', '  ', 'fr'], lowercase);

    expect(result.value).toEqual(['en', 'fr']);
    expect(result.invalid).toEqual([]);
  });

  it('trims before normalizing, so a pasted list survives', () => {
    expect(normalizeLanguageList([' en ', ' pt-br '], lowercase).value).toEqual(['en', 'pt-br']);
  });
});

describe('languageLabel', () => {
  it('names the language in the reader locale and keeps the tag visible', () => {
    expect(languageLabel('pt-BR', 'en-US')).toBe('Brazilian Portuguese (pt-BR)');
  });

  it('names it in Chinese for a Chinese reader', () => {
    expect(languageLabel('en', 'zh-CN')).toContain('(en)');
    expect(languageLabel('en', 'zh-CN')).not.toBe('en');
  });

  it('falls back to the bare tag when the runtime has no name for it', () => {
    // Well-formed, and nothing on earth speaks it.
    expect(languageLabel('qya', 'en-US')).toBe('qya');
  });

  it('does not throw on an input Intl would reject', () => {
    expect(languageLabel('not a tag', 'en-US')).toBe('not a tag');
  });
});

describe('SUGGESTED_LANGUAGE_TAGS', () => {
  it('are all tags the server would keep, in canonical case', () => {
    for (const tag of SUGGESTED_LANGUAGE_TAGS) expect(canonicalizeLanguageTag(tag)).toBe(tag);
  });

  it('has no duplicates', () => {
    expect(new Set(SUGGESTED_LANGUAGE_TAGS).size).toBe(SUGGESTED_LANGUAGE_TAGS.length);
  });
});
