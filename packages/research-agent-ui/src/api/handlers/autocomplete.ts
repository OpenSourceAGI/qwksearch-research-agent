/**
 * @fileoverview Handler for search-box autocomplete: query suggestions plus domain matches.
 *
 * Combines multi-backend autocomplete (with a word-dropping fallback when the
 * full query yields no results) with a Fuse.js fuzzy index over a ranked
 * domain dataset to surface site suggestions as the user types.
 */
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

const domainEntries: DomainEntry[] = Object.entries(
  domainData as Record<string, unknown[]>,
).map(([domain, arr]) => ({
  domain,
  name: typeof arr?.[0] === "string" ? (arr[0] as string) : "",
  rank:
    typeof arr?.[1] === "number"
      ? (arr[1] as number)
      : Number.MAX_SAFE_INTEGER,
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

export function createAutocompleteHandler() {
  const GET = async (req: Request): Promise<Response> => {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();
    const locale = searchParams.get("locale") || "en-US";
    const backendsParam = searchParams.get("backends");
    const limit = parseInt(searchParams.get("limit") || "8", 10);

    if (!query) return Response.json({ suggestions: [], domains: [] });

    const backends = backendsParam
      ? backendsParam
          .split(",")
          .map((b) => b.trim())
          .filter(Boolean)
      : DEFAULT_BACKENDS;

    try {
      const suggestions = await autocompleteWithFallback(backends, query, locale);
      const domains = searchDomains(query);
      return Response.json({
        suggestions: suggestions.slice(0, limit),
        domains,
      });
    } catch (err) {
      console.error("Autocomplete error:", err);
      return Response.json({ suggestions: [], domains: [] }, { status: 500 });
    }
  };

  return { GET };
}
