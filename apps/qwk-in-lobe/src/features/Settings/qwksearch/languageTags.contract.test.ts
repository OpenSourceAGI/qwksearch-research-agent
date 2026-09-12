/**
 * The drift guard between this module and the two routes it mirrors.
 *
 * `languageTags.ts` restates a rule that is enforced in two other places —
 * `normalizeSearchLanguage` in the search service and `normalizeLanguages` in
 * the Worker's extraction settings — because `src/` is bundled for the browser
 * and cannot import the Worker, and because the point of the control is to
 * apply the rule *before* the write. A restatement that quietly stops matching
 * is worse than no restatement at all: the pane would reject a tag the server
 * accepts, or accept one it drops, and the second failure is the silent one
 * this whole change exists to remove.
 *
 * So the corpus below is run through both sides and the answers compared. If a
 * subtag rule, the five-language cap or the casing changes on either server and
 * not here, one of these fails.
 */
import { describe, expect, it } from 'vitest';

import { normalizeSearchLanguage } from '@/server/services/search/impls/qwksearch/searchSettings';

import { normalizeLanguages } from '../../../../worker/qwksearch/extractSettings';
import {
  canonicalizeLanguageTag,
  lowercaseLanguageTag,
  MAX_TRANSCRIPT_LANGUAGES,
  normalizeLanguageList,
} from './languageTags';

/**
 * Every shape either side has an opinion about: the well-formed, the
 * nearly-well-formed, and the kinds of thing a user actually types.
 */
const CORPUS = [
  'en',
  'EN',
  'en-US',
  'en-us',
  'EN-us',
  'pt-BR',
  'zh-Hans',
  'zh-HANS-cn',
  'fil',
  'de-1996',
  'es-419',
  'qya',
  'e',
  'english',
  'en_US',
  'en-',
  '-en',
  'en--US',
  'en-toolongsubtag',
  'en US',
  '汉语',
  '',
  '   ',
  '  pt-BR  ',
];

describe('the search route agrees about one tag', () => {
  it.each(CORPUS)('%j', (input) => {
    expect(canonicalizeLanguageTag(input)).toBe(normalizeSearchLanguage(input));
  });
});

describe('the extraction route agrees about a list', () => {
  /** `normalizeLanguages` returns `undefined` for "nothing valid"; `[]` here. */
  const server = (entries: string[]) => normalizeLanguages(entries) ?? [];

  it.each(CORPUS)('a single-entry list of %j', (input) => {
    expect(
      normalizeLanguageList([input], {
        casing: 'lowercase',
        limit: MAX_TRANSCRIPT_LANGUAGES,
      }).value,
    ).toEqual(server([input]));
  });

  it.each([
    ['en', 'fr', 'de'],
    ['fr', 'en', 'fr'],
    ['EN', 'en-US', 'en'],
    ['en', 'klingon', 'fr'],
    ['english', '汉语'],
    ['en', 'fr', 'de', 'it', 'es', 'pt', 'nl'],
    ['en', 'en', 'fr', 'de', 'it', 'es', 'pt'],
    [' en ', '', 'pt-br'],
  ])('a list of %j', (...entries) => {
    expect(
      normalizeLanguageList(entries, { casing: 'lowercase', limit: MAX_TRANSCRIPT_LANGUAGES })
        .value,
    ).toEqual(server(entries));
  });

  it('caps at the same five the route does', () => {
    const many = ['en', 'fr', 'de', 'it', 'es', 'pt', 'nl', 'pl'];

    expect(server(many)).toHaveLength(MAX_TRANSCRIPT_LANGUAGES);
    expect(
      normalizeLanguageList(many, { casing: 'lowercase', limit: MAX_TRANSCRIPT_LANGUAGES }).value,
    ).toEqual(server(many));
  });

  it('uses the same shape test as the search route, only cased differently', () => {
    for (const input of CORPUS) {
      const search = normalizeSearchLanguage(input);
      const extraction = lowercaseLanguageTag(input);

      // Either both keep it or neither does — the divergence is case alone.
      expect(!!extraction).toBe(!!search);
      if (search && extraction) expect(extraction).toBe(search.toLowerCase());
    }
  });
});
