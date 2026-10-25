/**
 * @fileoverview The focus modes of `/api/agent/chat`, each served by the
 * LobeChat chat engine with the search-sources API as its search source.
 *
 * The keys match the focus modes the client sends (and the old
 * `createSearchHandlers` from chat-agent-toolkit), so this is a drop-in
 * replacement for it.
 */

import type { MetaSearchAgentType } from "chat-agent-toolkit";
import { Search } from "search-web-api/search/search-query-executor.js";
import { searchSearxng } from "search-web-api/search/public-searxng";
import { searchTavily, isTavilyConfigured } from "search-web-api/search/tavily";
import { extractArticleViaScraper, extractViaTavily } from "@/lib/scraper/scrape-url";
import { LobeChatEngine, type CrawlPage, type LobeChatEngineConfig } from "./chat-engine";
import { SearchSourcesService, type SearchSourcesServiceOptions } from "./search-sources";

/** Longest page text kept from a crawl, before the tool's own limit. */
const MAX_HTML_CHARS = 500_000;

/** Strips tags and decodes the common entities; works in the Worker runtime. */
export const htmlToText = (html: string): string =>
  html
    .slice(0, MAX_HTML_CHARS)
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/(script|style)>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z#][a-z0-9]+;/gi, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();

/**
 * Reads a page the way the article reader does: the Cloudflare scraper with
 * readability extraction, falling back to Tavily's extract API.
 */
export const defaultCrawlPage: CrawlPage = async (url) => {
  let article = await extractArticleViaScraper(url);
  if (article.error || !article.html) {
    const viaTavily = await extractViaTavily(url);
    if (!viaTavily.error && viaTavily.html) article = viaTavily;
  }
  if (article.error || !article.html) return { url, error: article.error || "No content" };
  return { url: article.url || url, title: article.title, content: htmlToText(article.html) };
};

/** Searches tried when the search-sources API returns nothing. */
export const defaultFallbacks: NonNullable<SearchSourcesServiceOptions["fallbacks"]> = [
  async (query) =>
    isTavilyConfigured() ? searchTavily(query, { searchDepth: "basic", maxResults: 10 }) : { results: [] },
  async (query, { categories, language }) => searchSearxng(query, { categories, language }),
];

let sharedSearch: Search | undefined;

/**
 * One `Search` per isolate: constructing it registers every engine with the
 * health tracker, so a per-request instance would reset what it has learned.
 */
const getSharedSearch = (): Search => (sharedSearch ??= new Search());

export type LobeSearchHandlerOverrides = Partial<
  Pick<LobeChatEngineConfig, "callLlm" | "crawlPage" | "createSearchService" | "fallbacks" | "loadUploads">
>;

/**
 * Builds the focus-mode handlers. `overrides` replace the network-facing
 * parts (model calls, page reading, search) — tests use it, the app does not.
 */
export const createLobeSearchHandlers = (
  overrides: LobeSearchHandlerOverrides = {},
): Record<string, MetaSearchAgentType> => {
  const shared: Omit<LobeChatEngineConfig, "label" | "prefetchSearch"> = {
    crawlPage: defaultCrawlPage,
    fallbacks: defaultFallbacks,
    createSearchService: (options) => new SearchSourcesService({ backend: getSharedSearch(), ...options }),
    ...overrides,
  };

  const engine = (config: Pick<LobeChatEngineConfig, "label" | "prefetchSearch"> & Partial<LobeChatEngineConfig>) =>
    new LobeChatEngine({ ...shared, ...config });

  return {
    webSearch: engine({ label: "Web", prefetchSearch: true }),
    academicSearch: engine({
      label: "Academic",
      prefetchSearch: true,
      defaultCategories: ["academic"],
      modeInstructions:
        "The user chose Academic search. Prefer peer-reviewed papers, preprints and scholarly sources; search with the 'science' category.",
    }),
    writingAssistant: engine({
      label: "Web",
      prefetchSearch: false,
      modeInstructions:
        "The user chose Writing Assistant. Help them write a strong response to their request. Search the web only when facts or sources would improve the writing, and cite what you use.",
    }),
    wolframAlphaSearch: engine({
      label: "Computation",
      prefetchSearch: true,
      modeInstructions:
        "The user chose computational search. Work through calculations and quantitative questions step by step, and use search results to check facts and figures.",
    }),
    youtubeSearch: engine({
      label: "YouTube",
      prefetchSearch: true,
      engineNames: ["youtube"],
      modeInstructions: "The user chose YouTube search. Answer from the videos found and point to the most relevant ones.",
    }),
    redditSearch: engine({
      label: "Reddit",
      prefetchSearch: true,
      engineNames: ["reddit"],
      modeInstructions:
        "The user chose Reddit search. Answer from the discussions found, and say when an answer reflects community opinion rather than established fact.",
    }),
  };
};
