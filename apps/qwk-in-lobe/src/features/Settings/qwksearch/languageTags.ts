/**
 * The client's mirror of the language rules the two settings routes enforce.
 *
 * Both QwkSearch panes hand the server a language: the search pane one tag
 * (`language`, the region the engines answer in) and the extraction pane up to
 * five (`languages`, the transcript preference order). Both routes validate the
 * same BCP-47 *shape* and **drop what does not match instead of rejecting the
 * write** — deliberately, so `en, klingon` still gets you English. The cost is
 * that a typo disappears on save with nothing said about it, which is what this
 * module exists to stop: the pane can apply the same rule at the moment of
 * typing and say what it rejected.
 *
 * The two routes differ in one respect and it is preserved here rather than
 * smoothed over:
 *
 * | | search (`normalizeSearchLanguage`) | extraction (`normalizeLanguages`) |
 * |---|---|---|
 * | case | canonical BCP-47 — `EN-us` → `en-US` | lowercased — `EN-us` → `en-us` |
 * | count | one | five, deduplicated, order kept |
 *
 * `languageTags.contract.test.ts` runs both server normalizers against the same
 * corpus as these functions and fails if either drifts.
 */

/** A BCP-47-shaped tag: `en`, `pt-BR`, `zh-Hans-CN`. Both routes use this. */
const LANGUAGE_TAG = /^[a-z]{2,3}(?:-[a-z\d]{2,8})*$/i;

/** `normalizeLanguages` keeps at most this many. Mirrors `MAX_LANGUAGES`. */
export const MAX_TRANSCRIPT_LANGUAGES = 5;

/** Whether the server would keep this tag at all, before any case change. */
export const isLanguageTag = (value: string): boolean => LANGUAGE_TAG.test(value.trim());

/**
 * Canonical BCP-47 case: region subtags uppercased, script subtags title-cased,
 * everything else lowered. Mirrors the search route's `normalizeSearchLanguage`
 * so the pane shows the tag the server will store, not the one that was typed.
 */
export const canonicalizeLanguageTag = (value: string): string | undefined => {
  const raw = value.trim();
  if (!raw || !LANGUAGE_TAG.test(raw)) return undefined;

  const [primary, ...subtags] = raw.split('-');
  const canonical = subtags.map((subtag) =>
    subtag.length === 2
      ? subtag.toUpperCase()
      : subtag.length === 4
        ? subtag[0].toUpperCase() + subtag.slice(1).toLowerCase()
        : subtag.toLowerCase(),
  );

  return [primary.toLowerCase(), ...canonical].join('-');
};

/**
 * The extraction route's rule: same shape test, but the whole tag lowercased,
 * because `normalizeLanguages` deduplicates on the lowered form.
 */
export const lowercaseLanguageTag = (value: string): string | undefined => {
  const raw = value.trim();
  return raw && LANGUAGE_TAG.test(raw) ? raw.toLowerCase() : undefined;
};

/** Which route's casing a {@link LanguageSelect} should apply. */
export type LanguageTagCasing = 'canonical' | 'lowercase';

export const normalizeLanguageTag = (
  value: string,
  casing: LanguageTagCasing,
): string | undefined =>
  casing === 'lowercase' ? lowercaseLanguageTag(value) : canonicalizeLanguageTag(value);

/**
 * Apply the server's rule to a whole list: normalize, drop what fails, drop
 * duplicates, keep the order given, and stop at `limit`.
 *
 * Returns the survivors *and* what was dropped, because the second half is the
 * point — the pane names the rejected entries rather than letting them vanish.
 */
export interface LanguageListResult {
  /** Entries the server's pattern would reject, as typed. */
  invalid: string[];
  /** Entries dropped only because the list was already at `limit`, as typed. */
  overflow: string[];
  /** What the server would store. */
  value: string[];
}

export const normalizeLanguageList = (
  entries: readonly string[],
  { casing, limit }: { casing: LanguageTagCasing; limit: number },
): LanguageListResult => {
  const value: string[] = [];
  const invalid: string[] = [];
  const overflow: string[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const raw = entry.trim();
    if (!raw) continue;

    const tag = normalizeLanguageTag(raw, casing);
    if (!tag) {
      invalid.push(raw);
      continue;
    }
    // A tag already in the list is not a rejection worth reporting — `en` and
    // `EN` are one choice spelled twice.
    if (seen.has(tag)) continue;
    if (value.length >= limit) {
      overflow.push(raw);
      continue;
    }

    seen.add(tag);
    value.push(tag);
  }

  return { invalid, overflow, value };
};

/**
 * Tags offered as suggestions. Not a closed set — both fields still accept any
 * well-formed tag, because the engines and transcript providers between them
 * cover far more than this list and the server only checks the shape.
 *
 * Chosen as the most widely used UI languages, plus the region variants whose
 * results genuinely differ (`en-GB`, `pt-BR`, `zh-Hant`).
 */
export const SUGGESTED_LANGUAGE_TAGS = [
  'en',
  'en-US',
  'en-GB',
  'zh-Hans',
  'zh-Hant',
  'es',
  'es-MX',
  'hi',
  'ar',
  'pt',
  'pt-BR',
  'fr',
  'de',
  'ru',
  'ja',
  'ko',
  'it',
  'nl',
  'pl',
  'tr',
  'vi',
  'id',
  'th',
  'fa',
  'uk',
  'sv',
  'he',
  'bn',
] as const;

/**
 * A human name for a tag in the reader's own language, via `Intl.DisplayNames`.
 *
 * Deliberately not a translated string table: there are 28 suggestions here and
 * the field accepts tags outside them, so a table would be both large and
 * incomplete. `Intl` knows every tag and speaks every locale the app ships.
 * Falls back to the tag itself when the runtime has no name for it, which is
 * what a user who typed `qya` should see.
 */
export const languageLabel = (tag: string, locale: string): string => {
  try {
    const name = new Intl.DisplayNames([locale], { fallback: 'none', type: 'language' }).of(tag);
    return name && name !== tag ? `${name} (${tag})` : tag;
  } catch {
    return tag;
  }
};
