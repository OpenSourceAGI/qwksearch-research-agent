/**
 * QwkSearch implementation of the LobeHub search service.
 *
 * Phase 1.2 of the LobeHub packages migration plan: the engine's web-browsing
 * tool searches through QwkSearch's own fan-out (`search-web-api`, 100+ engines
 * across 13 categories, ranked by `domain-rank`) instead of a single upstream
 * provider.
 *
 * The fan-out lives on Worker A (`apps/qwksearch-web`) at
 * `GET /api/agent/search`, so this impl is a thin HTTP client. Configure it with:
 *
 *   SEARCH_PROVIDERS=qwksearch
 *   QWKSEARCH_SEARCH_URL=https://qwksearch.com/api/agent/search   # optional
 *
 * The endpoint takes one category per request, so multiple `searchCategories`
 * fan out in parallel and merge here, deduplicated by URL.
 *
 * Every knob the requests carry — the endpoint, the categories, the language,
 * safe search, the recency filter and the result cap — is resolved by
 * `./searchSettings`, which layers defaults under the environment under the
 * user's preferences under this call's own arguments. This file only turns the
 * resolved value into HTTP.
 */
import {
  type SearchParams,
  type UniformSearchResponse,
  type UniformSearchResult,
} from '@lobechat/types';
import { TRPCError } from '@trpc/server';
import debug from 'debug';

import { type SearchServiceImpl } from '../type';
import { userSearchOverridesFor } from './searchPreferences';
import {
  resolveSearchSettings,
  searchOverridesFromParams,
  type SearchSettings,
  type UserSearchOverrides,
} from './searchSettings';
import { type QwkSearchResponse, type QwkSearchResult } from './type';

const log = debug('lobe-search:QwkSearch');

export { normalizeCategories } from './searchSettings';

const hostnameOf = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
};

const toUniformResult = (item: QwkSearchResult, category: string): UniformSearchResult => ({
  category: item.category || category,
  content: item.content || item.snippet || '',
  engines: item.engines?.length ? item.engines : item.source ? [item.source] : ['qwksearch'],
  iframeSrc: item.iframe_src || undefined,
  imgSrc: item.img_src || undefined,
  parsedUrl: item.domain || hostnameOf(item.url),
  publishedDate: item.date || undefined,
  score: typeof item.score === 'number' ? item.score : 0,
  thumbnail: item.thumbnail || item.thumbnail_src || undefined,
  title: item.title,
  url: item.url,
});

/**
 * Merge per-category result lists, keeping the highest-scoring copy of each URL
 * and unioning the engines that produced it.
 */
export const mergeResults = (lists: UniformSearchResult[][]): UniformSearchResult[] => {
  const byUrl = new Map<string, UniformSearchResult>();

  for (const list of lists) {
    for (const result of list) {
      if (!result.url) continue;

      const existing = byUrl.get(result.url);
      if (!existing) {
        byUrl.set(result.url, { ...result, engines: [...result.engines] });
        continue;
      }

      existing.engines = [...new Set([...existing.engines, ...result.engines])];
      if (result.score > existing.score) {
        existing.score = result.score;
      }
      // Prefer whichever copy actually carries a snippet.
      if (!existing.content && result.content) {
        existing.content = result.content;
      }
    }
  }

  return [...byUrl.values()].sort((a, b) => b.score - a.score);
};

export class QwkSearchImpl implements SearchServiceImpl {
  /**
   * QwkSearch picks engines per category from its own registry, so explicit
   * engine restrictions are never forwarded and must not trigger a retry.
   */
  readonly useAutoSearchEngineSelection = true;

  /** Memoized override read. One D1 round-trip per impl, not per query. */
  private pendingOverrides?: Promise<UserSearchOverrides>;

  /**
   * @param options.userId     The signed-in user whose preferences apply, if any.
   *                           Absent for an anonymous search, which resolves to
   *                           the operator's configuration — exactly what every
   *                           deployment got before the user layer existed.
   * @param options.loadOverrides Reads the stored overrides. Defaults to the D1
   *                           table in `./searchPreferences`; injectable so a
   *                           test (or a caller that already has the row) can
   *                           supply them without a binding.
   */
  constructor(
    private readonly options: {
      loadOverrides?: (userId?: string) => Promise<UserSearchOverrides>;
      userId?: string;
    } = {},
  ) {}

  /**
   * The user layer, read once and reused.
   *
   * An impl is built per tool execution, so "once per impl" is once per
   * conversation turn — and a single turn can fan out several queries. Caching
   * the promise rather than the value also collapses concurrent queries onto one
   * read.
   *
   * A preferences outage must never fail a search, so a rejection resolves to no
   * overrides and the query runs on the operator's configuration. The default
   * loader already swallows its own failures; the `catch` is here so an injected
   * one cannot break that guarantee, and so a rejected promise is never what the
   * memo caches.
   */
  private overridesFor(): Promise<UserSearchOverrides> {
    this.pendingOverrides ??= (this.options.loadOverrides ?? userSearchOverridesFor)(
      this.options.userId,
    ).catch((error) => {
      console.error('[QwkSearchImpl] search preferences read failed', error);
      return {};
    });

    return this.pendingOverrides;
  }

  /**
   * Resolved per query, not per instance: `SearchService` holds one impl for
   * the lifetime of the process, and reading the environment lazily is what
   * lets a test set `QWKSEARCH_SEARCH_URL` after construction.
   */
  private settingsFor(params: SearchParams, overrides: UserSearchOverrides): SearchSettings {
    return resolveSearchSettings(
      process.env as Record<string, string | undefined>,
      overrides,
      searchOverridesFromParams(params),
    );
  }

  private buildUrl(query: string, category: string, settings: SearchSettings): URL {
    const url = new URL(settings.endpoint);
    url.searchParams.set('q', query);
    url.searchParams.set('cat', category);
    url.searchParams.set('lang', settings.language);

    if (settings.timeRange) url.searchParams.set('recency', settings.timeRange);
    // Both are read by the endpoint as `=== 'true'`, so send them only when on
    // rather than spelling out the default in every request.
    if (settings.safeSearch) url.searchParams.set('safesearch', 'true');
    if (settings.publicInstances) url.searchParams.set('publicInstances', 'true');

    return url;
  }

  private async queryCategory(
    query: string,
    category: string,
    settings: SearchSettings,
  ): Promise<UniformSearchResult[]> {
    const url = this.buildUrl(query, category, settings);
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (settings.apiKey) headers['Authorization'] = `Bearer ${settings.apiKey}`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `QwkSearch search failed for category "${category}" (${response.status}): ${body.slice(0, 200)}`,
      );
    }

    const data = (await response.json().catch(() => null)) as QwkSearchResponse | null;

    if (data?.error) {
      throw new Error(`QwkSearch search failed for category "${category}": ${data.error}`);
    }

    return (data?.results ?? [])
      .filter((item) => !!item?.url && !!item?.title)
      .map((item) => toUniformResult(item, category));
  }

  async query(query: string, params: SearchParams = {}): Promise<UniformSearchResponse> {
    const settings = this.settingsFor(params, await this.overridesFor());
    const categories = settings.categories;
    log('querying %o across categories %o', query, categories);

    const startAt = Date.now();

    let lists: UniformSearchResult[][];
    try {
      lists = await Promise.all(
        categories.map((category) => this.queryCategory(query, category, settings)),
      );
    } catch (error) {
      console.error('[QwkSearchImpl] query failed', error);

      throw new TRPCError({
        code: 'SERVICE_UNAVAILABLE',
        message: (error as Error).message || 'QwkSearch search failed',
      });
    }

    const merged = mergeResults(lists);
    // Capped after the merge, so the cap counts distinct URLs rather than
    // per-category rows, and always keeps the highest-scoring ones.
    const results = settings.resultLimit ? merged.slice(0, settings.resultLimit) : merged;
    log('got %d results in %dms', results.length, Date.now() - startAt);

    return {
      costTime: Date.now() - startAt,
      query,
      resultNumbers: results.length,
      results,
    };
  }
}
