/**
 * @fileoverview Stored settings for the `/api/*` rate limiter, as set from the
 * admin panel (`/admin/rate-limit`).
 *
 * These live in D1 rather than `lib/config`, whose config manager keeps values
 * in memory: a limit tightened there would hold on one isolate and silently
 * not on the others. One row, `id = 'global'` — the `lib/news/settings.ts`
 * pattern.
 *
 * Every function takes the database handle rather than calling `getDB()`,
 * because the limiter runs in `worker/index.ts` before the framework has set
 * up any request context; the worker passes a handle over `env.DB`, the admin
 * route passes `getQueryDB()`.
 *
 * A read degrades to the defaults rather than throwing: a database that is
 * missing or unmigrated must cost the admin's custom limits, not the API.
 */
import { eq } from "drizzle-orm";
import type { QueryDB } from "../database";
import { apiRateLimitSettings, type ApiRateLimitSettingsRow } from "../database/schema";
import {
  DEFAULT_API_RATE_LIMIT_SETTINGS,
  normalizeApiRateLimitSettings,
  type ApiRateLimitSettings,
} from "./api-rules";

export const API_RATE_LIMIT_SETTINGS_ID = "global";

/**
 * How long an isolate trusts the settings it read. The limiter consults them
 * on every API request, and a D1 read per request to learn that nothing has
 * changed is waste — so an admin's change reaches every isolate within this
 * many milliseconds instead of instantly. The admin page says so.
 */
export const SETTINGS_CACHE_MS = 15_000;

let cached: { value: ApiRateLimitSettings; at: number } | null = null;

/** Drops this isolate's cached copy. Called after a save, and by tests. */
export function invalidateApiRateLimitSettingsCache() {
  cached = null;
}

function cloneSettings(settings: ApiRateLimitSettings): ApiRateLimitSettings {
  return { ...settings, overrides: settings.overrides.map((o) => ({ ...o })) };
}

/** Reads the row, uncached. Falls back to the defaults if it can't. */
export async function readApiRateLimitSettings(db: QueryDB): Promise<ApiRateLimitSettings> {
  try {
    const rows = await db
      .select()
      .from(apiRateLimitSettings)
      .where(eq(apiRateLimitSettings.id, API_RATE_LIMIT_SETTINGS_ID))
      .limit(1);
    const row = rows[0] as ApiRateLimitSettingsRow | undefined;
    if (!row) return cloneSettings(DEFAULT_API_RATE_LIMIT_SETTINGS);
    return normalizeApiRateLimitSettings(row);
  } catch (error) {
    console.error("[rate-limit] settings read failed, using defaults:", error);
    return cloneSettings(DEFAULT_API_RATE_LIMIT_SETTINGS);
  }
}

/** The settings, from this isolate's cache when it is fresh enough. */
export async function getApiRateLimitSettings(
  db: QueryDB,
  now: number = Date.now(),
): Promise<ApiRateLimitSettings> {
  if (cached && now - cached.at < SETTINGS_CACHE_MS) return cached.value;
  const value = await readApiRateLimitSettings(db);
  cached = { value, at: now };
  return value;
}

/**
 * Writes the settings row, merged over what is stored now so a partial body
 * only changes the fields it names. A failed write is reported, not swallowed:
 * the admin has to know the change did not take.
 */
export async function saveApiRateLimitSettings(
  db: QueryDB,
  patch: Partial<Record<keyof ApiRateLimitSettings, unknown>>,
  updatedBy?: string | null,
): Promise<ApiRateLimitSettings> {
  const current = await readApiRateLimitSettings(db);
  const next = normalizeApiRateLimitSettings(patch, current);

  const row = {
    id: API_RATE_LIMIT_SETTINGS_ID,
    enabled: next.enabled,
    requestsPerWindow: next.requestsPerWindow,
    windowSeconds: next.windowSeconds,
    overrides: JSON.stringify(next.overrides),
    exemptPaths: next.exemptPaths,
    updatedAt: new Date(),
    updatedBy: updatedBy ?? null,
  };

  await db
    .insert(apiRateLimitSettings)
    .values(row)
    .onConflictDoUpdate({ target: apiRateLimitSettings.id, set: row });

  invalidateApiRateLimitSettingsCache();
  return next;
}
