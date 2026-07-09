/**
 * @fileoverview Query autocomplete endpoint. GET fans out to one or more
 * search-engine suggest APIs and returns a deduplicated list of suggestions.
 * When a long query yields no suggestions, progressively retries with only
 * the trailing words (last 3, then 2, then 1) and re-attaches the dropped
 * prefix to each suggestion so the user's full phrase is preserved.
 * The last typed keyword is also fuzzy-matched (fuse.js) against the top-10k
 * domain list so near-misses like "googel" surface google.com as a direct
 * "go to site" suggestion with its favicon.
 */
import { NextRequest, NextResponse } from "next/server";
import { searchAutocompleteMulti } from "extract-webpage/suggest-next-words/autocomplete-search-engines";
import Fuse from "fuse.js";
import domainData from "domain-rank/data/domain-rank-merged.json";

const DEFAULT_BACKENDS = ["google", "duckduckgo", "wikipedia"];
const MAX_FALLBACK_WORDS = 3;
const MAX_DOMAIN_SUGGESTIONS = 3;

export interface DomainSuggestion {
  domain: string;
  name: string;
  favicon: string;
}

interface DomainEntry {
  domain: string;
  name: string;
  rank: number;
}

// domain-rank-merged.json maps domain -> [displayName, rank, ...]
const domainEntries: DomainEntry[] = Object.entries(
  domainData as Record<string, unknown[]>,
).map(([domain, arr]) => ({
  domain,
  name: typeof arr?.[0] === "string" ? (arr[0] as string) : "",
  rank: typeof arr?.[1] === "number" ? (arr[1] as number) : Number.MAX_SAFE_INTEGER,
}));

let fuseIndex: Fuse<DomainEntry> | null = null;

function getDomainIndex(): Fuse<DomainEntry> {
  if (!fuseIndex) {
    fuseIndex = new Fuse(domainEntries, {
      keys: [
        { name: "name", weight: 0.6 },
        { name: "domain", weight: 0.4 },
      ],
      threshold: 0.1,
      ignoreLocation: true,
      includeScore: true,
      minMatchCharLength: 3,
    });
  }
  return fuseIndex;
}

/**
 * Fuzzy-match the last typed keyword against domain names and site display
 * names, so a near-miss like "googel" suggests google.com. Ties in fuzzy
 * score are broken by domain popularity rank.
 */
function searchDomains(query: string): DomainSuggestion[] {
  const words = query.split(/\s+/).filter(Boolean);
  const lastWord = words[words.length - 1] || "";
  if (lastWord.length < 3) return [];

  return getDomainIndex()
    .search(lastWord, { limit: 12 })
    .sort(
      (a, b) =>
        Math.round((a.score ?? 1) * 10) - Math.round((b.score ?? 1) * 10) ||
        a.item.rank - b.item.rank,
    )
    .slice(0, MAX_DOMAIN_SUGGESTIONS)
    .map(({ item }) => ({
      domain: item.domain,
      name: item.name,
      favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(item.domain)}&sz=64`,
    }));
}

/**
 * Autocomplete with trailing-word fallback: try the full query first; if it
 * returns nothing and the query has multiple words, retry with the last 3
 * words, then the last 2, then the last 1. Suggestions from a fallback pass
 * are prefixed with the words that were trimmed off, so selecting one keeps
 * the rest of the typed phrase intact.
 */
async function autocompleteWithFallback(
  backends: string[],
  query: string,
  locale: string,
): Promise<string[]> {
  const full = await searchAutocompleteMulti(backends, query, locale);
  if (full.length > 0) return full;

  const words = query.split(/\s+/).filter(Boolean);
  const start = Math.min(MAX_FALLBACK_WORDS, words.length - 1);

  for (let n = start; n >= 1; n--) {
    const suffix = words.slice(-n).join(" ");
    const prefix = words.slice(0, -n).join(" ");
    const results = await searchAutocompleteMulti(backends, suffix, locale);
    if (results.length > 0) {
      const merged = new Set<string>();
      for (const s of results) {
        const completed = prefix ? `${prefix} ${s}` : s;
        if (completed.toLowerCase() !== query.toLowerCase()) merged.add(completed);
      }
      if (merged.size > 0) return Array.from(merged);
    }
  }

  return [];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();
  const locale = searchParams.get("locale") || "en-US";
  const backendsParam = searchParams.get("backends");
  const limit = parseInt(searchParams.get("limit") || "8", 10);

  if (!query) return NextResponse.json({ suggestions: [], domains: [] });

  const backends = backendsParam
    ? backendsParam.split(",").map((b) => b.trim()).filter(Boolean)
    : DEFAULT_BACKENDS;

  try {
    const suggestions = await autocompleteWithFallback(backends, query, locale);
    const domains = searchDomains(query);
    return NextResponse.json({ suggestions: suggestions.slice(0, limit), domains });
  } catch (err) {
    console.error("Autocomplete error:", err);
    return NextResponse.json({ suggestions: [], domains: [] }, { status: 500 });
  }
}
