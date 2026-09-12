/**
 * Wire types for the QwkSearch search fan-out endpoint
 * (`apps/qwksearch-web/app/api/agent/search`, backed by the `search-web-api`
 * package). The response is SearXNG-shaped but carries a few QwkSearch-only
 * fields (`domain`, `favicon`, `engines`, `snippet`), so it gets its own types
 * rather than reusing the SearXNG client's.
 */

export interface QwkSearchResult {
  author?: string;
  /** Present on merged results produced by the engine registry. */
  category?: string;
  /** Full text snippet; QwkSearch fills either `content` or `snippet`. */
  content?: string;
  date?: string;
  /** Hostname, already stripped of `www.` by the fan-out. */
  domain?: string;
  /** Engines that returned this result, on merged (multi-engine) results. */
  engines?: string[];
  favicon?: string;
  iframe_src?: string;
  img_src?: string;
  score?: number;
  snippet?: string;
  /** Single engine name, when the result was not merged. */
  source?: string;
  thumbnail?: string;
  thumbnail_src?: string;
  title: string;
  url: string;
}

export interface QwkSearchResponse {
  /** Round-trip time measured by the QwkSearch worker itself. */
  elapsedTime?: number;
  error?: string;
  infoboxes?: unknown[];
  results?: QwkSearchResult[];
  suggestions?: string[];
}
