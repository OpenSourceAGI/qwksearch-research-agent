/**
 * The `searchCategories` enum offered to the model by the web-browsing tool.
 *
 * The manifest is static and shared by every search provider, so the enum has to
 * be the intersection of what the configured providers accept — offering a
 * category that only one backend understands would let the model ask SearXNG or
 * Brave for `music` and get an empty page back.
 *
 * QwkSearch's fan-out endpoint accepts five categories LobeHub's manifest does
 * not offer (`files`, `it`, `map`, `music`, `social+media`); its 13-name
 * registry aliases onto those in
 * `apps/server/src/services/search/impls/qwksearch/searchSettings.ts`, whose
 * `SEARCH_CATEGORIES` is the list to keep this one in step with —
 * `searchSettings.test.ts` asserts the two are equal. They are only safe to
 * advertise when QwkSearch is the *sole* configured provider, so that is the
 * condition here.
 *
 * This file is new rather than inlined into `manifest.ts` on purpose: everything
 * under `packages/` is upstream LobeHub, and the edit there stays two lines.
 */

/** LobeHub's default categories — every supported provider understands these. */
export const DEFAULT_SEARCH_CATEGORIES = ['general', 'images', 'news', 'science', 'videos'];

/**
 * Every category QwkSearch's fan-out endpoint accepts. SearXNG spellings, which
 * is what the endpoint takes; `normalizeCategories` maps the registry's own
 * names (`academic`, `tech`, `torrents`, `social`, …) onto these.
 */
export const QWKSEARCH_SEARCH_CATEGORIES = [
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
];

/**
 * Read `SEARCH_PROVIDERS` without assuming a Node runtime — the manifest is also
 * imported by the SPA, where `process` may not exist.
 */
const searchProvidersEnv = (): string =>
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.SEARCH_PROVIDERS ?? '';

/**
 * The configured providers, parsed the same way `SearchService` parses them
 * (full-width commas included) so the two never disagree about what is enabled.
 */
export const parseSearchProviders = (envString = ''): string[] =>
  envString.replaceAll('，', ',').trim().split(',').filter(Boolean);

/**
 * The categories to advertise. Widened only when QwkSearch is the one configured
 * provider; any other configuration keeps LobeHub's five.
 */
export const resolveSearchCategories = (envString = searchProvidersEnv()): string[] => {
  const providers = parseSearchProviders(envString).map((provider) => provider.toLowerCase());
  const onlyQwkSearch = providers.length === 1 && providers[0] === 'qwksearch';
  return onlyQwkSearch ? QWKSEARCH_SEARCH_CATEGORIES : DEFAULT_SEARCH_CATEGORIES;
};
