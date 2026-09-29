/**
 * search-autocomplete — search-box query completion from the single fastest engine.
 *
 * Root entry: engine adapters, `getSuggestions` and the benchmark. Browser-safe.
 * The HTTP handler (with the ranked-domain dataset) is `search-autocomplete/server`;
 * the search box, dropdown and hook are `search-autocomplete/react`.
 */
export * from "./engines";
export * from "./autocomplete";
export * from "./benchmark";
export type * from "./types";
