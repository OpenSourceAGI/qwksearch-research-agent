/**
 * @fileoverview Search-box autocomplete now lives in the `search-autocomplete`
 * package; re-exported so `research-agent-ui/api` keeps its public surface.
 */
export {
  createAutocompleteHandler,
  type AutocompleteHandlerOptions,
} from "search-autocomplete/server";
export type { DomainSuggestion } from "search-autocomplete";
