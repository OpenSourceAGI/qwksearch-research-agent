/**
 * The user layer of {@link resolveSearchSettings}, stored on D1.
 *
 * `searchSettings.ts` folds four layers into the settings one query runs with —
 * shipped defaults, Worker environment, the signed-in user's overrides, then
 * this tool call's own arguments. Until this module existed the third layer had
 * a type and no storage: `UserSearchOverrides` was accepted by the resolver and
 * by `QwkSearchImpl`'s constructor, and nothing ever produced one.
 *
 * This is that storage — the search-side mirror of
 * `worker/qwksearch/extractionPreferences.ts`, on the same D1 database and keyed
 * by the same LobeHub Better Auth user id.
 *
 * ## Why it lives here and not under `worker/`
 *
 * Extraction's equivalent sits in `worker/qwksearch/` because its only consumers
 * are Worker routes. Search preferences have two consumers: the
 * `/api/doc/search-settings` route (under `worker/`) and `QwkSearchImpl` itself
 * (here, under `@/server/*`). The dependency runs worker → `@/server/*` and
 * never back, so only one of those two placements can serve both — this one.
 * `worker/qwksearch/schema.ts` re-exports {@link searchSettings} so the table
 * still has exactly one definition and the D1 tooling still sees it beside its
 * siblings.
 *
 * The D1 handle comes from `@/database/core/cloudflare`, the bridge the database
 * package already uses to reach the Worker bindings without importing
 * `cloudflare:workers` — not from `worker/qwksearch/db.ts`, which would be that
 * backwards import. The cost is a second thin drizzle wrapper over the same `DB`
 * binding; drizzle clients hold no connection state, so that is a pointer, not a
 * pool.
 *
 * Two rules hold everywhere below, both carried over from extraction:
 *
 * - **Overrides are validated twice** — once when written and once when read.
 *   The write pass is the real gate; the read pass means a row left by an older
 *   build, a hand-edited D1 row, or a knob that has since been removed cannot
 *   push an unvalidated value into a search request.
 * - **Reading never throws.** A web search must not fail because a preferences
 *   row is unreadable, so every failure resolves to `{}` and the caller falls
 *   back to the operator's configuration.
 */
import { eq, sql } from 'drizzle-orm';
import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { getCfEnv } from '@/database/core/cloudflare';

import { normalizeSearchOverrides, type UserSearchOverrides } from './searchSettings';

/**
 * Per-user overrides for the search fan-out — the user layer of
 * `searchSettings.ts`, written by the Search & Sources settings pane.
 *
 * One row per LobeHub user id holding a JSON `UserSearchOverrides`. Deliberately
 * *not* a column per setting, for the same reason as `extraction_settings`: the
 * value is validated on the way in and again on the way out, so adding a knob is
 * a change to that type rather than a D1 migration. The endpoint and the API key
 * can never appear here — `UserSearchOverrides` excludes them at the type level,
 * because they name a host and a bearer token and stay Worker secrets.
 */
export const searchSettings = sqliteTable('search_settings', {
  overrides: text('overrides', { mode: 'json' }).$type<Record<string, unknown>>(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  userId: text('userId').primaryKey(),
});

const tables = { searchSettings };

export type SearchPreferencesDatabase = ReturnType<typeof drizzleD1<typeof tables>>;

let cached: SearchPreferencesDatabase | null = null;

/**
 * Drizzle client for the `search_settings` table on the QwkSearch D1 database.
 *
 * Throws when there is no binding, which is the same contract
 * `worker/qwksearch/db.ts` has. Every caller below is inside a `try` that
 * degrades to "no overrides", so a non-Cloudflare deployment resolves search
 * settings from defaults-under-environment and never sees this error.
 */
export const getSearchPreferencesDB = (): SearchPreferencesDatabase => {
  if (cached) return cached;

  const d1 = getCfEnv()?.DB;
  if (!d1) {
    throw new Error(
      'QwkSearch D1 database is not bound. Add a `d1_databases` entry named DB to wrangler.jsonc.',
    );
  }

  cached = drizzleD1(d1, { schema: tables });
  return cached;
};

/** Test hook: swap the cached client (e.g. an in-memory libsql drizzle instance). */
export const __setSearchPreferencesDBForTests = (db: SearchPreferencesDatabase | null) => {
  cached = db;
};

/** Validate and drop anything unrecognised. Shared by the read and write paths. */
const clean = (value: unknown): UserSearchOverrides =>
  normalizeSearchOverrides((value ?? {}) as UserSearchOverrides);

/**
 * The stored overrides for one user, or `{}` when there is no row.
 *
 * `overrides` is a JSON column, but a row written before the column had a mode,
 * or by `wrangler d1 execute`, can still come back as a string — so a string is
 * parsed rather than trusted to be an object.
 */
export const loadUserSearchOverrides = async (userId: string): Promise<UserSearchOverrides> => {
  try {
    const [row] = await getSearchPreferencesDB()
      .select()
      .from(searchSettings)
      .where(eq(searchSettings.userId, userId))
      .limit(1);

    if (!row?.overrides) return {};

    const stored = typeof row.overrides === 'string' ? JSON.parse(row.overrides) : row.overrides;
    return clean(stored);
  } catch (error) {
    console.error('[qwksearch] search settings read failed:', error);
    return {};
  }
};

/**
 * Replace a user's overrides with the validated form of `overrides`.
 *
 * A full replace rather than a merge: the pane always sends the whole set, and
 * a merge would leave no way to clear a single field. Returns what was stored,
 * which is what the pane should render — it differs from what was sent whenever
 * a value failed validation.
 */
export const saveUserSearchOverrides = async (
  userId: string,
  overrides: unknown,
): Promise<UserSearchOverrides> => {
  const cleaned = clean(overrides);

  await getSearchPreferencesDB()
    .insert(searchSettings)
    .values({ overrides: cleaned, updatedAt: new Date(), userId })
    .onConflictDoUpdate({
      set: { overrides: cleaned, updatedAt: new Date() },
      target: searchSettings.userId,
    });

  return cleaned;
};

/** Drop a user's overrides, returning them to the operator's configuration. */
export const clearUserSearchOverrides = async (userId: string): Promise<void> => {
  await getSearchPreferencesDB().delete(searchSettings).where(eq(searchSettings.userId, userId));
};

/**
 * The overrides that apply to a search, or `{}` when nobody is signed in.
 *
 * This is the function `QwkSearchImpl` is constructed with. It resolves rather
 * than rejects for an anonymous caller because web search serves signed-out
 * users too — they get the operator's configuration, which is exactly what every
 * deployment got before this module existed.
 */
export const userSearchOverridesFor = async (userId?: string): Promise<UserSearchOverrides> =>
  userId ? loadUserSearchOverrides(userId) : {};
