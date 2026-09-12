/**
 * Client for `/api/doc/search-settings` — the per-user preferences the Worker
 * folds into the QwkSearch web-search fan-out.
 *
 * The route is the authority on what a preference may be: every value is
 * validated on write and again on read, and each verb returns the same
 * `{ effective, options, overrides }` document. So this module transports and
 * types the response and never restates the server's validation — the category
 * list, the recency filters and the numeric bounds all arrive in `options`.
 *
 * Shapes mirror
 * `apps/server/src/services/search/impls/qwksearch/searchSettings.ts`. They are
 * duplicated rather than imported because the resolver is bundled for the
 * server and the SPA is bundled for the browser; `contract.test.ts` fails if
 * the two drift.
 *
 * The extraction pane's `api.ts` is the same module for the other half of § 2.2
 * and reads the same way on purpose.
 */

/** SearXNG category names the fan-out endpoint understands. */
export type SearchCategory =
  | 'files'
  | 'general'
  | 'images'
  | 'it'
  | 'map'
  | 'music'
  | 'news'
  | 'science'
  | 'social+media'
  | 'videos';

/** Recency filters the fan-out forwards to the engines. */
export type SearchTimeRange = 'day' | 'month' | 'week' | 'year';

/**
 * The seven fields a signed-in user may set.
 *
 * The endpoint and its bearer token are absent by design: they name a host the
 * Worker will send requests — and a credential — to, so they stay operator-only
 * and the route drops them if they are sent anyway.
 */
export interface UserSearchOverrides {
  /** Fan-out order. The first `maxCategories` of these actually run. */
  categories?: SearchCategory[];
  /** UI language / region tag handed to the engines as `lang`. */
  language?: string;
  /** Most categories fanned out per query — the request budget for one search. */
  maxCategories?: number;
  /** Let the fan-out fall back to public SearXNG instances. */
  publicInstances?: boolean;
  /** Keep at most this many merged results. */
  resultLimit?: number;
  /** Ask the engines to filter adult content. */
  safeSearch?: boolean;
  /** Default recency filter, when a tool call names none. */
  timeRange?: SearchTimeRange;
}

/**
 * What is in force once the operator's environment is folded in.
 *
 * The value fields are exactly {@link UserSearchOverrides}' keys, so "what
 * applies" and "what you may change" have the same shape — with the two
 * optional ones serialized as `null` rather than omitted, because "no recency
 * filter" and "no result cap" are values in force, not unset ones.
 *
 * Everything the user cannot set is reduced to a boolean under `configured`:
 * those fields name a host and a bearer token, so the pane learns *whether* one
 * is configured, never what it is.
 */
export interface SearchEffectiveSettings extends Omit<
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

/** The enums and bounds the form builds its inputs from. */
export interface SearchFieldOptions {
  categories: SearchCategory[];
  maxMaxCategories: number;
  maxResultLimit: number;
  minMaxCategories: number;
  minResultLimit: number;
  timeRanges: SearchTimeRange[];
}

export interface SearchSettingsResponse {
  effective: SearchEffectiveSettings;
  options: SearchFieldOptions;
  overrides: UserSearchOverrides;
}

export class SearchSettingsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'SearchSettingsApiError';
  }
}

const ENDPOINT = '/api/doc/search-settings';

const request = async (init?: RequestInit): Promise<SearchSettingsResponse> => {
  const res = await fetch(ENDPOINT, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new SearchSettingsApiError(body.error || body.message || res.statusText, res.status);
  }

  return (await res.json()) as SearchSettingsResponse;
};

export const fetchSearchSettings = () => request();

/**
 * Replace the stored overrides wholesale. The response echoes what survived
 * validation, which is what the form should render — not its own optimistic
 * state, since an unknown category or an out-of-range cap comes back trimmed.
 */
export const saveSearchSettings = (overrides: UserSearchOverrides) =>
  request({ body: JSON.stringify(overrides), method: 'PUT' });

/** Drop every override, returning the user to the operator's configuration. */
export const resetSearchSettings = () => request({ method: 'DELETE' });
