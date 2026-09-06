/**
 * Result Container — Re-exports the ResultContainer class from its canonical
 * location in the search module. ResultContainer aggregates results from multiple
 * engines, deduplicates by URL hash, merges duplicate records, scores results
 * using position-weighted per-engine and per-category multipliers, and groups
 * the final list by result category.
 */
export * from "./search/search-result-container";
