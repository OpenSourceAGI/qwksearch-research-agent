/**
 * Resolved configuration for the QwkSearch search fan-out.
 *
 * Before this module every knob in `QwkSearchImpl` was a literal or a direct
 * `process.env` read: `general` as the fallback category, three categories per
 * query, `QWKSEARCH_SEARCH_URL` read inside a getter, and four query parameters
 * the fan-out endpoint accepts (`lang`, `safesearch`, `publicInstances`, and a
 * default `recency`) that the impl never sent at all. That is fine while the
 * tool call is the only caller, and wrong the moment the Search & Sources pane
 * (migration to-do § 2.2) needs somewhere to write to.
 *
 * So the impl now takes a {@link SearchSettings} value, and this module is the
 * only place that decides what one contains:
 *
 * ```
 * DEFAULT_SEARCH_SETTINGS       the shipped behaviour
 *   ← environment (Worker vars + secrets)      server operator
 *   ← UserSearchOverrides                      the signed-in user's settings
 *   ← RequestSearchOverrides                   this tool call's own arguments
 * ```
 *
 * Each layer only *narrows* the one above it, and every value is validated on
 * the way in — an unparseable setting falls back rather than throwing, because
 * a bad preference should not turn a search into a 500.
 *
 * This is the search-side mirror of `worker/qwksearch/extractSettings.ts`, and
 * deliberately the same shape: the two panes in § 2.2 then read the same way.
 * It lives beside its consumer rather than under `worker/` because the
 * dependency runs worker → `@/server/*` and never back.
 *
 * ## Why the layers are not symmetric
 *
 * `endpoint` and `apiKey` are resolvable **from the environment only**. They
 * name a host the Worker will send requests — and a bearer token — to, so
 * accepting them from a user preference would leak the configured key to
 * whatever host that user chose. {@link UserSearchOverrides} is typed to
 * exclude them.
 *
 * {@link RequestSearchOverrides} is narrower again. The tool call is written by
 * the model, not by a person, so it may only narrow the two fields the
 * web-browsing manifest actually offers it: which categories to search and how
 * recent the results should be. `maxCategories` in particular is withheld —
 * it bounds how many upstream requests one query costs, which is a budget the
 * operator sets and not something a generated argument should raise.
 */
import { type SearchParams } from '@lobechat/types';

/**
 * SearXNG category names the fan-out endpoint understands.
 *
 * Kept in step with `QWKSEARCH_SEARCH_CATEGORIES` in
 * `packages/builtin-tool-web-browsing/src/searchCategories.ts`, which is the
 * enum the model is offered; `searchSettings.test.ts` guards the two against
 * drift. Advertising a category this list does not accept would send the model
 * an empty page.
 */
export const SEARCH_CATEGORIES = [
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
] as const;

export type SearchCategory = (typeof SEARCH_CATEGORIES)[number];

/** Recency filters the fan-out endpoint forwards to the engines. */
export const SEARCH_TIME_RANGES = ['day', 'month', 'week', 'year'] as const;

export type SearchTimeRange = (typeof SEARCH_TIME_RANGES)[number];

export interface SearchSettings {
  /** Bearer token for the fan-out endpoint. Environment-only. */
  apiKey?: string;
  /** Categories to search when the caller names none, in fan-out order. */
  categories: SearchCategory[];
  /** Base URL of the fan-out endpoint. Environment-only. */
  endpoint: string;
  /** UI language / region tag handed to the engines as `lang`. */
  language: string;
  /** Most categories fanned out per query — the request budget for one search. */
  maxCategories: number;
  /** Let the fan-out fall back to public SearXNG instances. */
  publicInstances: boolean;
  /** Keep at most this many merged results. Unset means every result. */
  resultLimit?: number;
  /** Ask the engines to filter adult content. */
  safeSearch: boolean;
  /** Default recency filter. Unset means no filter. */
  timeRange?: SearchTimeRange;
}

/** Settings a signed-in user may choose. Excludes the host and the credential. */
export type UserSearchOverrides = Partial<
  Pick<
    SearchSettings,
    | 'categories'
    | 'language'
    | 'maxCategories'
    | 'publicInstances'
    | 'resultLimit'
    | 'safeSearch'
    | 'timeRange'
  >
>;

/**
 * What one tool call may narrow. Exactly the two fields the web-browsing
 * manifest offers the model — see the module comment.
 */
export type RequestSearchOverrides = Partial<Pick<SearchSettings, 'categories' | 'timeRange'>>;

export const DEFAULT_SEARCH_ENDPOINT = 'https://qwksearch.com/api/agent/search';
export const DEFAULT_SEARCH_LANGUAGE = 'en-US';
export const DEFAULT_MAX_CATEGORIES = 3;

/** The one category every engine serves, and the fallback when nothing else survives. */
export const DEFAULT_SEARCH_CATEGORY: SearchCategory = 'general';

export const MAX_MAX_CATEGORIES = SEARCH_CATEGORIES.length;
export const MAX_RESULT_LIMIT = 200;

export const DEFAULT_SEARCH_SETTINGS: SearchSettings = {
  categories: [DEFAULT_SEARCH_CATEGORY],
  endpoint: DEFAULT_SEARCH_ENDPOINT,
  language: DEFAULT_SEARCH_LANGUAGE,
  maxCategories: DEFAULT_MAX_CATEGORIES,
  publicInstances: false,
  safeSearch: false,
};

/**
 * QwkSearch's category registry (`search-web-api/registry`) names a few
 * categories differently from SearXNG, and LobeHub's tool manifest offers a
 * fifth set again. Normalize every spelling we might receive onto what the
 * endpoint accepts; anything unknown is dropped rather than guessed at.
 */
const CATEGORY_ALIASES: Record<string, SearchCategory> = {
  'academic': 'science',
  'apps': 'files',
  'code': 'it',
  'file': 'files',
  'general': 'general',
  'image': 'images',
  'images': 'images',
  'it': 'it',
  'map': 'map',
  'maps': 'map',
  'music': 'music',
  'news': 'news',
  'science': 'science',
  'shopping': 'general',
  'social': 'social+media',
  'social media': 'social+media',
  'social+media': 'social+media',
  'specialized': 'general',
  'tech': 'it',
  'torrents': 'files',
  'video': 'videos',
  'videos': 'videos',
};

/** A BCP-47-shaped tag: `en`, `en-US`, `zh-Hans-CN`. */
const LANGUAGE_TAG = /^[a-z]{2,3}(?:-[a-z\d]{2,8})*$/i;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** A trimmed non-empty string, or `undefined`. Never `''`. */
const text = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const list = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) return value.map((v) => text(v)).filter((v): v is string => !!v);
  const raw = text(value);
  return raw
    ? raw
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
    : undefined;
};

const boolish = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  const raw = text(value)?.toLowerCase();
  if (raw === undefined) return undefined;
  if (raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on') return true;
  if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'off') return false;
  return undefined;
};

const integer = (value: unknown, min: number, max: number): number | undefined => {
  const raw = typeof value === 'number' ? value : Number(text(value));
  if (!Number.isFinite(raw)) return undefined;
  return clamp(Math.round(raw), min, max);
};

/**
 * Keep the categories the endpoint accepts, aliased and deduplicated, in the
 * order given.
 *
 * Unknown entries are dropped rather than mapped to `general`: a list of
 * `['news', 'nonsense']` should still search news, and a list with nothing
 * valid left returns `undefined` so the caller falls back to the layer above
 * instead of searching nothing. This is *not* the cap — that is applied once,
 * at the end of {@link resolveSearchSettings}, because `maxCategories` may
 * arrive from a different layer than the categories it bounds.
 */
export const normalizeSearchCategories = (value: unknown): SearchCategory[] | undefined => {
  const entries = list(value);
  if (!entries) return undefined;

  const seen = new Set<SearchCategory>();
  for (const entry of entries) {
    const raw = entry.toLowerCase();
    // The alias map does not repeat every endpoint category as its own key
    // (`files` has three aliases but no self-entry), so an exact name that is
    // not an alias is still valid.
    const category =
      CATEGORY_ALIASES[raw] ??
      (SEARCH_CATEGORIES.includes(raw as SearchCategory) ? (raw as SearchCategory) : undefined);
    if (category) seen.add(category);
  }

  return seen.size > 0 ? [...seen] : undefined;
};

export const normalizeTimeRange = (value: unknown): SearchTimeRange | undefined => {
  const raw = text(value)?.toLowerCase();
  return SEARCH_TIME_RANGES.includes(raw as SearchTimeRange) ? (raw as SearchTimeRange) : undefined;
};

/**
 * Validate a language tag's shape and canonicalize its case (`EN-us` → `en-US`)
 * so two spellings of one language do not read as two settings. Region
 * subtags are uppercased and script subtags title-cased, per BCP-47.
 */
export const normalizeSearchLanguage = (value: unknown): string | undefined => {
  const raw = text(value);
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

/** A `URL`-parseable http(s) endpoint. Anything else is dropped. */
export const normalizeHttpUrl = (value: unknown): string | undefined => {
  const raw = text(value);
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    return /^https?:$/.test(parsed.protocol) ? parsed.toString().replace(/\/$/, '') : undefined;
  } catch {
    return undefined;
  }
};

export type SearchEnv = Record<string, string | undefined>;

/**
 * The environment layer: Worker vars and secrets.
 *
 * `QWKSEARCH_SEARCH_URL` and `QWKSEARCH_API_KEY` keep the names the impl
 * already read, so existing deployments need no change. The rest are new and
 * all optional.
 */
export const searchSettingsFromEnv = (
  env: SearchEnv = process.env as SearchEnv,
): Partial<SearchSettings> => ({
  apiKey: text(env.QWKSEARCH_API_KEY),
  categories: normalizeSearchCategories(env.QWKSEARCH_SEARCH_CATEGORIES),
  endpoint: normalizeHttpUrl(env.QWKSEARCH_SEARCH_URL),
  language: normalizeSearchLanguage(env.QWKSEARCH_SEARCH_LANGUAGE),
  maxCategories: integer(env.QWKSEARCH_SEARCH_MAX_CATEGORIES, 1, MAX_MAX_CATEGORIES),
  publicInstances: boolish(env.QWKSEARCH_SEARCH_PUBLIC_INSTANCES),
  resultLimit: integer(env.QWKSEARCH_SEARCH_RESULT_LIMIT, 1, MAX_RESULT_LIMIT),
  safeSearch: boolish(env.QWKSEARCH_SEARCH_SAFE),
  timeRange: normalizeTimeRange(env.QWKSEARCH_SEARCH_TIME_RANGE),
});

/** Drop `undefined` values so a partial layer cannot erase the layer below it. */
const defined = <T extends object>(value: T): Partial<T> =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;

/**
 * Validate and clamp an override layer. Applied to the user and request layers
 * alike, so a value that reaches {@link resolveSearchSettings} through either
 * path gets the same treatment.
 */
export const normalizeSearchOverrides = (
  overrides: UserSearchOverrides = {},
): UserSearchOverrides =>
  defined({
    categories: normalizeSearchCategories(overrides.categories),
    language: normalizeSearchLanguage(overrides.language),
    maxCategories: integer(overrides.maxCategories, 1, MAX_MAX_CATEGORIES),
    publicInstances: boolish(overrides.publicInstances),
    resultLimit: integer(overrides.resultLimit, 1, MAX_RESULT_LIMIT),
    safeSearch: boolish(overrides.safeSearch),
    timeRange: normalizeTimeRange(overrides.timeRange),
  });

/**
 * The tool call's own arguments, as an override layer.
 *
 * `searchEngines` is deliberately not read: QwkSearch picks engines per
 * category from its own registry, which is what `useAutoSearchEngineSelection`
 * tells the caller. A `searchTimeRange` the endpoint does not understand
 * (`anytime`, the manifest's "no filter" value) drops out here, leaving
 * whatever the operator configured — which is `undefined`, no filter, unless
 * they set one.
 */
export const searchOverridesFromParams = (params: SearchParams = {}): RequestSearchOverrides =>
  defined({
    categories: normalizeSearchCategories(params.searchCategories),
    timeRange: normalizeTimeRange(params.searchTimeRange),
  });

/**
 * Fold the layers into the settings one query runs with.
 *
 * Later arguments win, but only where they carry a value that survived
 * validation — so a user preference cannot blank out the operator's endpoint by
 * sending an empty string. The category cap is applied last, after every layer
 * has had its say, because the list and the bound on it can come from
 * different layers.
 */
export const resolveSearchSettings = (
  env: SearchEnv = process.env as SearchEnv,
  ...overrides: Array<RequestSearchOverrides | undefined | UserSearchOverrides>
): SearchSettings => {
  let settings: SearchSettings = {
    ...DEFAULT_SEARCH_SETTINGS,
    ...defined(searchSettingsFromEnv(env)),
  };

  for (const layer of overrides) {
    if (layer) settings = { ...settings, ...normalizeSearchOverrides(layer) };
  }

  return { ...settings, categories: settings.categories.slice(0, settings.maxCategories) };
};

/**
 * The categories one query actually fans out to.
 *
 * Preserved as a named export because the tool-manifest drift guard in
 * `index.test.ts` is written against it: anything the manifest offers the model
 * but this drops silently becomes `general`, which is the empty-page failure
 * the enum exists to prevent.
 */
export const normalizeCategories = (categories?: string[]): string[] =>
  resolveSearchSettings({}, { categories: normalizeSearchCategories(categories) }).categories;

/** Settings minus the credential, for logging and diagnostics. */
export const redactSearchSettings = (
  settings: SearchSettings,
): Omit<SearchSettings, 'apiKey'> & { apiKey: boolean } => {
  const { apiKey, ...rest } = settings;
  return { ...rest, apiKey: !!apiKey };
};

/**
 * What the Search & Sources pane is told is currently in force.
 *
 * The value fields are exactly {@link UserSearchOverrides}' keys, so "what
 * applies" and "what you may change" have the same shape. Everything the user
 * cannot set is reduced to a presence flag under `configured`: those fields name
 * a host and a credential, and an endpoint URL may itself carry basic-auth
 * credentials in its userinfo, so the pane learns *whether* the operator
 * configured one and never what it is.
 *
 * The two optional fields are serialized as `null` rather than omitted: absent
 * means "inherit" everywhere else in this seam, and "no recency filter" is a
 * value in force, not an unset one.
 */
export interface SearchSettingsSummary extends Omit<
  Required<UserSearchOverrides>,
  'resultLimit' | 'timeRange'
> {
  configured: {
    apiKey: boolean;
    endpoint: boolean;
  };
  resultLimit: null | number;
  timeRange: null | SearchTimeRange;
}

export const searchSettingsForClient = (settings: SearchSettings): SearchSettingsSummary => {
  const redacted = redactSearchSettings(settings);

  return {
    categories: redacted.categories,
    configured: {
      apiKey: redacted.apiKey,
      // Configured by default — the shipped fan-out — but the flag stays honest
      // if an operator blanks it.
      endpoint: !!redacted.endpoint,
    },
    language: redacted.language,
    maxCategories: redacted.maxCategories,
    publicInstances: redacted.publicInstances,
    resultLimit: redacted.resultLimit ?? null,
    safeSearch: redacted.safeSearch,
    timeRange: redacted.timeRange ?? null,
  };
};
