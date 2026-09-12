/**
 * Per-user search preferences (`/api/doc/search-settings`) — the backend of the
 * Search & Sources settings pane (migration to-do § 2.2).
 *
 * GET    → the user's stored overrides, plus what is actually in force once the
 *          operator's environment is folded in, plus the field metadata the
 *          pane needs to build its inputs without hard-coding the enums.
 * PUT    → replace the overrides with the validated form of the body.
 * DELETE → drop them, returning the user to the operator's configuration.
 *
 * The search-side twin of `extractionSettings.ts`, deliberately the same shape:
 * the two panes then read the same way. Sign-in is required on all three, since
 * these are per-user preferences — the anonymous equivalent is the
 * `searchCategories` / `searchTimeRange` arguments the web-browsing tool call
 * already carries.
 *
 * The storage and the resolver both live under `@/server/*` rather than beside
 * this file, because `QwkSearchImpl` reads them too and the dependency runs
 * worker → `@/server/*` and never back. See the "Why it lives here" note in
 * `searchPreferences.ts`.
 */
import { Hono } from 'hono';

import {
  clearUserSearchOverrides,
  loadUserSearchOverrides,
  saveUserSearchOverrides,
} from '@/server/services/search/impls/qwksearch/searchPreferences';
import {
  MAX_MAX_CATEGORIES,
  MAX_RESULT_LIMIT,
  resolveSearchSettings,
  SEARCH_CATEGORIES,
  SEARCH_TIME_RANGES,
  searchSettingsForClient,
  type UserSearchOverrides,
} from '@/server/services/search/impls/qwksearch/searchSettings';

import { requireUserId, UnauthorizedError, unauthorizedResponse } from '../../qwksearch/session';

export const searchSettingsApp = new Hono();

const handle = async (fn: () => Promise<Response>): Promise<Response> => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    console.error('[qwksearch] search settings error:', error);
    return Response.json({ message: 'An error has occurred.' }, { status: 500 });
  }
};

/**
 * The choices the pane renders, resolved from the same constants the fan-out
 * validates against. Shipping them with the response is what keeps a new
 * category or recency filter from needing a matching edit in the UI.
 *
 * `minMaxCategories` is 1 rather than 0 because a search that fans out to no
 * category returns nothing; `maxResultLimit` bounds the cap, not the results.
 */
const fieldOptions = {
  categories: SEARCH_CATEGORIES,
  maxMaxCategories: MAX_MAX_CATEGORIES,
  maxResultLimit: MAX_RESULT_LIMIT,
  minMaxCategories: 1,
  minResultLimit: 1,
  timeRanges: SEARCH_TIME_RANGES,
};

const body = (overrides: UserSearchOverrides) =>
  Response.json({
    effective: searchSettingsForClient(
      resolveSearchSettings(process.env as Record<string, string | undefined>, overrides),
    ),
    options: fieldOptions,
    overrides,
  });

searchSettingsApp.get('/api/doc/search-settings', (c) =>
  handle(async () => {
    const userId = await requireUserId(c.req.raw.headers);
    return body(await loadUserSearchOverrides(userId));
  }),
);

searchSettingsApp.put('/api/doc/search-settings', (c) =>
  handle(async () => {
    const userId = await requireUserId(c.req.raw.headers);

    // A malformed body is a client bug, not a server error: say so with a 400
    // rather than letting the JSON parse failure become a 500.
    let payload: unknown;
    try {
      payload = await c.req.json();
    } catch {
      return Response.json({ message: 'Request body must be JSON' }, { status: 400 });
    }

    // Every value is validated on the way in and unrecognised ones are dropped,
    // so the response is the authority on what was actually stored.
    return body(await saveUserSearchOverrides(userId, payload));
  }),
);

searchSettingsApp.delete('/api/doc/search-settings', (c) =>
  handle(async () => {
    const userId = await requireUserId(c.req.raw.headers);
    await clearUserSearchOverrides(userId);
    return body({});
  }),
);
