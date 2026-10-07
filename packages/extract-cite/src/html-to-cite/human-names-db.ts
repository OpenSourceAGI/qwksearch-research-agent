/**
 * @fileoverview Holder for the optional 92k human-names database.
 *
 * The default `extract-cite` entry ships without the ~1 MB names JSON so it
 * stays slim. The database is used only to tell a person's name from an
 * organization's; without it that check falls back to the word heuristics.
 *
 * Get it one of two ways:
 * - import `extract-cite/full`, which bundles the JSON and registers it, or
 * - call `loadHumanNamesDB()` to lazy-load it from a CDN at runtime.
 */

/** Lowercase name → 1 (first name) or 2 (last name). */
export type HumanNamesDB = Record<string, number>;

/** Published copy of the names JSON, served by jsDelivr from npm. */
export const HUMAN_NAMES_DB_CDN_URL =
  "https://cdn.jsdelivr.net/npm/extract-cite/src/html-to-cite/human-names-92k.json";

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
 * Lazy-loads the names database from a CDN and registers it. Concurrent and
 * repeat calls share one request; once loaded it resolves immediately.
 * Resolves `null` (and leaves the slim fallback in place) if the fetch fails,
 * so a CDN outage never breaks citation extraction.
 */
export function loadHumanNamesDB(
  options: LoadHumanNamesDBOptions = {}
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
      // A failed load is not cached, so a later call can retry.
      if (loading === request) loading = null;
    });
  loading = request;
  return request;
}
