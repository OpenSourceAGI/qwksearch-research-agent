/**
 * Search — Entry point re-exporting the Search orchestrator class and the
 * complete ALL_ENGINES registry. The implementation lives in two focused modules:
 * - `search/search-query-executor` — the Search class that runs queries in
 *   parallel, deduplicates via ResultContainer, and returns scored results.
 * - `search/search-engines-registry-list` — the static catalogue of all 75+
 *   engine adapters organised by category.
 */
export { Search } from "./search/search-query-executor";
export { ALL_ENGINES } from "./search/search-engines-registry-list";
