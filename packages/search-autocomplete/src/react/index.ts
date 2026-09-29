/**
 * search-autocomplete/react — the search box, its suggestion dropdown, and the
 * hook behind both, for inputs that bring their own chrome.
 */
export { SearchBox, type SearchBoxProps } from "./SearchBox";
export { AutocompleteDropdown, type AutocompleteDropdownProps } from "./AutocompleteDropdown";
export {
  useAutocomplete,
  splitQuery,
  DEFAULT_AUTOCOMPLETE_ENDPOINT,
  type FetchSuggestions,
  type UseAutocompleteOptions,
  type UseAutocompleteResult,
} from "./useAutocomplete";
export type { AutocompleteResult, DomainSuggestion } from "../types";
