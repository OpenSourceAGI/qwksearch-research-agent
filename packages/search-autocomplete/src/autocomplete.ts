/**
 * @fileoverview Query completion from a single search engine.
 *
 * The search box used to fan every keystroke out to Google, DuckDuckGo and
 * Wikipedia and wait for all three, so each dropdown was as slow as the
 * slowest engine and three times as many requests left the Worker. It now
 * asks one engine — the fastest one `bun run benchmark` measured — and a
 * caller can point it at another.
 */
import {
  ENGINES,
  isEngineName,
  type EngineName,
  type EngineRequestOptions,
} from "./engines";

/**
 * The engine autocomplete asks when the caller names none.
 *
 * Chosen by `bun run benchmark` (scripts/benchmark.ts): lowest median latency
 * among the engines that answered at least 90% of queries — 34ms median from a
 * GitHub runner on 2026-09-29, against 48ms for the runner-up (brave). Re-run it
 * before changing this; the full table is in this package's README.
 */
export const DEFAULT_ENGINE: EngineName = "google";

const MAX_FALLBACK_WORDS = 3;

export interface GetSuggestionsOptions extends EngineRequestOptions {
  /** Engine to ask. Default {@link DEFAULT_ENGINE}; an unknown name falls back to it. */
  engine?: EngineName | string;
}

export function resolveEngine(name?: string | null): EngineName {
  const trimmed = name?.trim().toLowerCase();
  if (trimmed === "ddg") return "duckduckgo";
  return trimmed && isEngineName(trimmed) ? trimmed : DEFAULT_ENGINE;
}

/** One engine call that never throws: a dead engine means no suggestions, not a broken search box. */
export async function queryEngine(
  query: string,
  options: GetSuggestionsOptions = {},
): Promise<string[]> {
  const engine = resolveEngine(options.engine);
  try {
    return await ENGINES[engine](query, options);
  } catch (error) {
    if (!options.signal?.aborted) {
      console.error(`Autocomplete engine '${engine}' failed:`, error);
    }
    return [];
  }
}

/**
 * Completions for `query`. When the whole query has none — a long query
 * rarely matches a suggest index verbatim — retries with its last 3, 2 and
 * then 1 words and re-attaches the dropped prefix, so "my notes on quantum
 * entangl" still offers "my notes on quantum entanglement".
 */
export async function getSuggestions(
  query: string,
  options: GetSuggestionsOptions = {},
): Promise<string[]> {
  const unique = (list: string[]) => Array.from(new Set(list));
  const full = await queryEngine(query, options);
  if (full.length > 0) return unique(full);

  const words = query.split(/\s+/).filter(Boolean);
  const start = Math.min(MAX_FALLBACK_WORDS, words.length - 1);

  for (let n = start; n >= 1; n--) {
    if (options.signal?.aborted) return [];
    const suffix = words.slice(-n).join(" ");
    const prefix = words.slice(0, -n).join(" ");
    const results = await queryEngine(suffix, options);
    const merged = new Set<string>();
    for (const s of results) {
      const completed = prefix ? `${prefix} ${s}` : s;
      if (completed.toLowerCase() !== query.toLowerCase()) merged.add(completed);
    }
    if (merged.size > 0) return Array.from(merged);
  }

  return [];
}
