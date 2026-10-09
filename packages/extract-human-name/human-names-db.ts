/**
 * @fileoverview Holder for the optional 92k human-names database
 * (`human-names-92k.json`, ~1.1 MB).
 *
 * The default `extract-human-name` entry never imports the JSON, so it
 * stays slim. Person-vs-organization detection then runs on the compact
 * built-in name list (`common-names.ts`) and word heuristics. The full
 * 92k database is loaded only when it is needed, one of two ways:
 *
 * - `loadHumanNamesDB()` lazy-loads it from a CDN at runtime (one shared
 *   request, cached, resolves `null` on failure so an outage never breaks
 *   name extraction), or
 * - import `extract-human-name/full`, which bundles the JSON and registers
 *   it on import.
 *
 * `setHumanNamesDB(db)` registers a copy you already hold. Both entries
 * share one database, so importing `extract-human-name/full` once enables
 * it for the slim import too.
 */

/** Lowercase name → 1 (given name) or 2 (surname). */
export type HumanNamesDB = Record<string, number>;

/** Published copy of the names JSON, served by jsDelivr from npm. */
export const HUMAN_NAMES_DB_CDN_URL =
  "https://cdn.jsdelivr.net/npm/extract-human-name/human-names-92k.json";

let namesDB: HumanNamesDB | null = null;
let loading: Promise<HumanNamesDB | null> | null = null;

/** Registers a names database (or `null` to clear it). */
export function setHumanNamesDB(db: HumanNamesDB | null): void {
  namesDB = db;
  loading = null;
}

/** The registered names database, or `null` when none is loaded. */
export function getHumanNamesDB(): HumanNamesDB | null {
  return namesDB;
}

export interface LoadHumanNamesDBOptions {
  /** Where to fetch the JSON from. Defaults to {@link HUMAN_NAMES_DB_CDN_URL}. */
  url?: string;
  /** Injectable fetch, for tests and non-browser runtimes. */
  fetch?: typeof fetch;
}

/**
 * Lazy-loads the names database from a CDN and registers it. Concurrent
 * and repeat calls share one request; once loaded it resolves immediately.
 * Resolves `null` (and leaves the compact-list fallback in place) if the
 * fetch fails, so a CDN outage never breaks name extraction. A failed
 * load is not cached, so a later call can retry.
 */
export function loadHumanNamesDB(
  options: LoadHumanNamesDBOptions = {},
): Promise<HumanNamesDB | null> {
  if (namesDB) return Promise.resolve(namesDB);
  if (loading) return loading;

  const { url = HUMAN_NAMES_DB_CDN_URL, fetch: fetchImpl = globalThis.fetch } =
    options;

  const request: Promise<HumanNamesDB | null> = Promise.resolve()
    .then(() => fetchImpl(url))
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((db: HumanNamesDB) => {
      if (!db || typeof db !== "object") throw new Error("invalid names JSON");
      namesDB = db;
      return db;
    })
    .catch(() => null)
    .finally(() => {
      if (loading === request) loading = null;
    });
  loading = request;
  return request;
}
