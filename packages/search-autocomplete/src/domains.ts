/**
 * @fileoverview Site suggestions for the word being typed.
 *
 * A Fuse.js fuzzy index over the ranked `domain-rank` dataset, plus a literal
 * match for any real registered domain the dataset does not list. Server-only:
 * the dataset is ~300KB of JSON and has no business in a client bundle.
 */
import Fuse from "fuse.js";
import { parse as parseHostname } from "tldts";
import domainData from "domain-rank/data/domain-rank-merged.json";
import type { DomainSuggestion } from "./types";

const MAX_DOMAIN_SUGGESTIONS = 3;

interface DomainEntry {
  domain: string;
  name: string;
  rank: number;
}

let fuseIndex: Fuse<DomainEntry> | null = null;

// Built on first use, not at import: the route module is evaluated on every
// cold start, and most requests never reach a word long enough to need it.
function getDomainIndex(): Fuse<DomainEntry> {
  if (!fuseIndex) {
    const entries: DomainEntry[] = Object.entries(
      domainData as Record<string, unknown[]>,
    ).map(([domain, arr]) => ({
      domain,
      name: typeof arr?.[0] === "string" ? (arr[0] as string) : "",
      rank: typeof arr?.[1] === "number" ? (arr[1] as number) : Number.MAX_SAFE_INTEGER,
    }));
    fuseIndex = new Fuse(entries, {
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

function toDomainSuggestion(domain: string, name: string, rank: number): DomainSuggestion {
  return {
    domain,
    name,
    favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
    rank,
  };
}

// Recognizes a typed word as a real, navigable domain (real registered TLD)
// even when it's outside the ranked `domain-rank` dataset, e.g. "red.com".
// Uses tldts's public-suffix check rather than a naive `\w+\.\w+` regex so
// filename-like strings ("note.txt", "script.js") aren't mistaken for domains.
function matchLiteralDomain(word: string): string | null {
  const parsed = parseHostname(word);
  return parsed.domain && parsed.isIcann ? parsed.hostname : null;
}

/** Up to three sites matching the last word of `query`, best first. */
export function searchDomains(query: string): DomainSuggestion[] {
  const words = query.split(/\s+/).filter(Boolean);
  const lastWord = words[words.length - 1] || "";
  if (lastWord.length < 3) return [];

  const fuzzyMatches = getDomainIndex()
    .search(lastWord, { limit: 12 })
    .sort(
      (a, b) =>
        Math.round((a.score ?? 1) * 10) - Math.round((b.score ?? 1) * 10) ||
        a.item.rank - b.item.rank,
    )
    .map(({ item }) => toDomainSuggestion(item.domain, item.name, item.rank));

  const literalDomain = matchLiteralDomain(lastWord);
  if (literalDomain && !fuzzyMatches.some((d) => d.domain === literalDomain)) {
    fuzzyMatches.unshift(toDomainSuggestion(literalDomain, "", Number.MAX_SAFE_INTEGER));
  }

  return fuzzyMatches.slice(0, MAX_DOMAIN_SUGGESTIONS);
}
