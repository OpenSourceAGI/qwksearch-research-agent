/**
 * @fileoverview Public entry point for the domain-rank package.
 *
 * Loads the merged domain-rank and domain-info JSON datasets into an
 * in-memory `Map` and exposes lookup/search APIs (`lookupDomain`,
 * `getTopDomains`, `searchDomains`, `getTotalDomains`, `getAllDomains`), plus
 * re-exports the favicon and title-formatting utilities from `domain-api`
 * and `domain-name-formatter`.
 */
import domainData from '../data/domain-rank-merged.json';
import domainInfo from '../data/domain-info.json';

export interface DomainRankEntry {
  domain: string;
  name: string;
  rank: number;
  title?: string;
  newsRank?: number;
  newsTitle?: string;
  langCode?: string;
  info?: any;
}

export interface DomainLookupResult {
  domain: string;
  name: string;
  rank: number;
  title?: string;
  favicon?: string;
  [key: string]: any;
}

// Parse the data format: {"domain": ["Name", rank, "Title", newsRank, "NewsTitle", "lang"]}
const domainMap = new Map<string, DomainRankEntry>();

for (const [domain, data] of Object.entries(domainData)) {
  if (Array.isArray(data)) {
    const [name, rank, title, newsRank, newsTitle, langCode] = data;
    domainMap.set(domain, {
      domain,
      name: typeof name === 'string' ? name : '',
      rank: typeof rank === 'number' ? rank : 0,
      title: typeof title === 'string' ? title : undefined,
      newsRank: typeof newsRank === 'number' ? newsRank : undefined,
      newsTitle: typeof newsTitle === 'string' ? newsTitle : undefined,
      langCode: typeof langCode === 'string' ? langCode : undefined,
      info: (domainInfo as any)[domain] || {}
    });
  }
}

/**
 * Look up domain information by domain name
 * @param domain - The domain to look up (e.g., "facebook.com")
 * @returns Domain information including name, rank, and metadata
 */
export function lookupDomain(domain: string): DomainLookupResult | null {
  const entry = domainMap.get(domain.toLowerCase());
  if (!entry) return null;

  return {
    domain: entry.domain,
    name: entry.name,
    rank: entry.rank,
    title: entry.title,
    newsRank: entry.newsRank,
    newsTitle: entry.newsTitle,
    langCode: entry.langCode,
    ...entry.info
  };
}

/**
 * Get top N domains by rank
 * @param n - Number of top domains to return
 * @returns Array of top domains sorted by rank
 */
export function getTopDomains(n: number = 100): DomainLookupResult[] {
  return Array.from(domainMap.values())
    .sort((a, b) => a.rank - b.rank)
    .slice(0, n)
    .map(entry => ({
      domain: entry.domain,
      name: entry.name,
      rank: entry.rank,
      title: entry.title,
      newsRank: entry.newsRank,
      newsTitle: entry.newsTitle,
      langCode: entry.langCode,
      ...entry.info
    }));
}

/**
 * Search domains by name
 * @param query - Search query
 * @param limit - Maximum number of results
 * @returns Array of matching domains
 */
export function searchDomains(query: string, limit: number = 10): DomainLookupResult[] {
  const lowerQuery = query.toLowerCase();
  const results: DomainLookupResult[] = [];

  for (const entry of domainMap.values()) {
    if (
      entry.domain.toLowerCase().includes(lowerQuery) ||
      entry.name.toLowerCase().includes(lowerQuery) ||
      entry.title?.toLowerCase().includes(lowerQuery)
    ) {
      results.push({
        domain: entry.domain,
        name: entry.name,
        rank: entry.rank,
        title: entry.title,
        newsRank: entry.newsRank,
        newsTitle: entry.newsTitle,
        langCode: entry.langCode,
        ...entry.info
      });

      if (results.length >= limit) break;
    }
  }

  return results.sort((a, b) => a.rank - b.rank);
}

/**
 * Get total number of domains in the dataset
 */
export function getTotalDomains(): number {
  return domainMap.size;
}

/**
 * Get all domains as an array
 */
export function getAllDomains(): DomainLookupResult[] {
  return Array.from(domainMap.values())
    .sort((a, b) => a.rank - b.rank)
    .map(entry => ({
      domain: entry.domain,
      name: entry.name,
      rank: entry.rank,
      title: entry.title,
      newsRank: entry.newsRank,
      newsTitle: entry.newsTitle,
      langCode: entry.langCode,
      ...entry.info
    }));
}

// Re-export utility functions
export { getFaviconForDomain, convertURLToDomain, isURLValid } from './domain-api';
export {
  formatDomainAsTitle,
  cleanSourceTitle,
  shouldRemoveDomain,
  findMainDomain,
  getTitleOverride,
  getSourceTitle
} from './domain-name-formatter';
