/**
 * @fileoverview Autocomplete state for a search input: debounced fetching,
 * keyboard navigation, and above/below placement of the dropdown.
 *
 * Owns no input of its own — the caller keeps `value`, so the same hook drives
 * the standalone `SearchBox` and the chat composer, which also holds files,
 * dictation and a send button around the text.
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { AutocompleteResult, DomainSuggestion } from "../types";

export const DEFAULT_AUTOCOMPLETE_ENDPOINT = "/api/agent/autocomplete";

/**
 * Fetches completions for `query`. Returning `null` keeps what is showing
 * (a transient error should not blank the dropdown mid-typing).
 */
export type FetchSuggestions = (
  query: string,
  options: { signal: AbortSignal; limit: number },
) => Promise<Partial<AutocompleteResult> | null>;

export interface UseAutocompleteOptions {
  value: string;
  onChange: (value: string) => void;
  /** Fetch only while the input is in use. Default true. */
  enabled?: boolean;
  /** Custom fetcher; default is a GET to `endpoint`. */
  fetchSuggestions?: FetchSuggestions;
  /** Used by the default fetcher. Default {@link DEFAULT_AUTOCOMPLETE_ENDPOINT}. */
  endpoint?: string;
  /** Engine for the default fetcher to request; omit for the server's default. */
  engine?: string;
  limit?: number;
  debounceMs?: number;
  /** Shortest trailing query worth completing. Default 2. */
  minChars?: number;
  /** Only the last N words are completed; the rest is kept as typed. Default 4. */
  maxWords?: number;
  /** Element the dropdown hangs from; measured to open it upward when there is no room below. */
  anchorRef?: RefObject<HTMLElement | null>;
  /** Refocused after a suggestion is chosen. */
  inputRef?: RefObject<HTMLElement | null>;
  /** Default navigates the window to the site. */
  onSelectDomain?: (domain: DomainSuggestion) => void;
}

export interface UseAutocompleteResult {
  suggestions: string[];
  domains: DomainSuggestion[];
  open: boolean;
  placement: "below" | "above";
  highlightedIndex: number;
  setHighlightedIndex: (index: number) => void;
  /** Domains first, then text suggestions. */
  totalOptions: number;
  selectSuggestion: (value: string) => void;
  selectDomain: (domain: DomainSuggestion) => void;
  chooseOption: (index: number) => void;
  close: () => void;
  /** Handles arrows, Tab, Enter, Escape and 1–9. Returns true when it consumed the key. */
  handleKeyDown: (e: {
    key: string;
    shiftKey?: boolean;
    preventDefault: () => void;
  }) => boolean;
}

/** Splits `text` into the part kept verbatim and the trailing words to complete. */
export function splitQuery(text: string, maxWords = 4): { prefix: string; query: string } {
  const trimmed = text.trimEnd();
  if (!trimmed) return { prefix: "", query: "" };
  const words = trimmed.split(/\s+/);
  const take = Math.min(maxWords, words.length);
  const query = words.slice(-take).join(" ");
  const prefix = words.length > take ? words.slice(0, -take).join(" ") + " " : "";
  return { prefix, query };
}

function defaultFetcher(endpoint: string, engine?: string): FetchSuggestions {
  return async (query, { signal, limit }) => {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    if (engine) params.set("engine", engine);
    const separator = endpoint.includes("?") ? "&" : "?";
    const response = await fetch(`${endpoint}${separator}${params}`, { signal });
    if (!response.ok) return null;
    return (await response.json()) as AutocompleteResult;
  };
}

const ROW_HEIGHT = 36;
const MAX_DROPDOWN_HEIGHT = 288;

export function useAutocomplete(options: UseAutocompleteOptions): UseAutocompleteResult {
  const {
    value,
    onChange,
    enabled = true,
    endpoint = DEFAULT_AUTOCOMPLETE_ENDPOINT,
    engine,
    limit = 8,
    debounceMs = 180,
    minChars = 2,
    maxWords = 4,
    anchorRef,
    inputRef,
  } = options;

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [domains, setDomains] = useState<DomainSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<"below" | "above">("below");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const suppressNextFetchRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Held in refs so a caller passing inline functions does not refire the
  // debounce on every render.
  const fetchRef = useRef<FetchSuggestions>(options.fetchSuggestions ?? defaultFetcher(endpoint, engine));
  fetchRef.current = options.fetchSuggestions ?? defaultFetcher(endpoint, engine);
  const onSelectDomainRef = useRef(options.onSelectDomain);
  onSelectDomainRef.current = options.onSelectDomain;

  const close = useCallback(() => {
    setOpen(false);
    setHighlightedIndex(-1);
  }, []);

  useEffect(() => {
    if (suppressNextFetchRef.current) {
      suppressNextFetchRef.current = false;
      return;
    }
    const { query } = splitQuery(value, maxWords);
    if (!enabled || query.length < minChars) {
      abortRef.current?.abort();
      setSuggestions([]);
      setDomains([]);
      close();
      return;
    }

    const timeout = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const data = await fetchRef.current(query, { signal: controller.signal, limit });
        if (!data || controller.signal.aborted) return;
        const list = Array.isArray(data.suggestions) ? data.suggestions : [];
        const domainList = Array.isArray(data.domains) ? data.domains : [];
        setSuggestions(list);
        setDomains(domainList);
        const count = list.length + domainList.length;
        if (count > 0 && anchorRef?.current && typeof window !== "undefined") {
          const rect = anchorRef.current.getBoundingClientRect();
          const spaceBelow = window.innerHeight - rect.bottom;
          const spaceAbove = rect.top;
          const height = Math.min(MAX_DROPDOWN_HEIGHT, count * ROW_HEIGHT);
          // On mobile the keyboard eats the space below the input; open
          // upward whenever that is where the room is.
          setPlacement(spaceBelow < height && spaceAbove > spaceBelow ? "above" : "below");
        }
        setOpen(count > 0);
        setHighlightedIndex(-1);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") console.error("Autocomplete fetch failed", err);
      }
    }, debounceMs);

    return () => clearTimeout(timeout);
  }, [value, enabled, limit, debounceMs, minChars, maxWords, anchorRef, close]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const selectSuggestion = useCallback(
    (suggestion: string) => {
      suppressNextFetchRef.current = true;
      const { prefix } = splitQuery(value, maxWords);
      onChange(prefix + suggestion);
      setSuggestions([]);
      setDomains([]);
      close();
      inputRef?.current?.focus();
    },
    [value, maxWords, onChange, close, inputRef],
  );

  const selectDomain = useCallback(
    (domain: DomainSuggestion) => {
      close();
      if (onSelectDomainRef.current) onSelectDomainRef.current(domain);
      else window.location.href = `https://${domain.domain}`;
    },
    [close],
  );

  const totalOptions = domains.length + suggestions.length;

  const chooseOption = useCallback(
    (index: number) => {
      if (index < domains.length) selectDomain(domains[index]);
      else if (suggestions[index - domains.length] !== undefined)
        selectSuggestion(suggestions[index - domains.length]);
    },
    [domains, suggestions, selectDomain, selectSuggestion],
  );

  const handleKeyDown = useCallback<UseAutocompleteResult["handleKeyDown"]>(
    (e) => {
      if (!open || totalOptions === 0) return false;
      const consume = () => {
        e.preventDefault();
        return true;
      };
      switch (e.key) {
        case "ArrowDown":
          setHighlightedIndex((i) => (i + 1) % totalOptions);
          return consume();
        case "ArrowUp":
          setHighlightedIndex((i) => (i <= 0 ? totalOptions - 1 : i - 1));
          return consume();
        case "Escape":
          close();
          return consume();
        case "Tab":
          if (highlightedIndex < 0) return false;
          chooseOption(highlightedIndex);
          return consume();
        case "Enter":
          if (e.shiftKey || highlightedIndex < 0) return false;
          chooseOption(highlightedIndex);
          return consume();
      }
      const numKey = parseInt(e.key, 10);
      if (numKey >= 1 && numKey <= Math.min(9, totalOptions)) {
        chooseOption(numKey - 1);
        return consume();
      }
      return false;
    },
    [open, totalOptions, highlightedIndex, chooseOption, close],
  );

  return {
    suggestions,
    domains,
    open,
    placement,
    highlightedIndex,
    setHighlightedIndex,
    totalOptions,
    selectSuggestion,
    selectDomain,
    chooseOption,
    close,
    handleKeyDown,
  };
}
