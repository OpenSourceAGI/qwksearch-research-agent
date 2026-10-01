/** A site offered in the dropdown; choosing it navigates instead of searching. */
export interface DomainSuggestion {
  domain: string;
  /** Site name from the ranked dataset; empty for a literal domain it does not list. */
  name: string;
  favicon: string;
  /** Popularity rank; `Number.MAX_SAFE_INTEGER` when unranked. */
  rank: number;
}

/** What the autocomplete endpoint answers with. */
export interface AutocompleteResult {
  suggestions: string[];
  domains: DomainSuggestion[];
}
