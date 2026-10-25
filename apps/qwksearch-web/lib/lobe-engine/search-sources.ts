/**
 * @fileoverview Search sources for the LobeChat chat engine.
 *
 * LobeChat's web-browsing tool talks to a `SearchService`. Here that service
 * is the search-sources API in `packages/search-web-api`: its `Search` class
 * fans a query out to the 70+ engine adapters of a category in parallel,
 * dedupes and scores what comes back, and returns one ranked list. When that
 * list comes back empty (every engine in the category blocked or down) the
 * service falls back to Tavily, when configured, and then to public SearXNG,
 * so the agent still has something to read.
 *
 * Also here: the {@link SourceRegistry} that numbers every source the agent
 * reads, so the `[n]` the model cites matches the list the client renders,
 * and {@link MergedSearchEngine}, the plain search entry point the
 * `/api/search/engines/test` route uses.
 */

import type { Document } from "chat-agent-toolkit";
import { Search } from "search-web-api/search/search-query-executor.js";
import type { MergedResult } from "search-web-api/types/search-result-types";
import {
  ContextEngine,
  type ContextProcessor,
  type PipelineContext,
} from "./context-engine";
import type { SearchCategory, SearchQuery } from "./web-browsing";

/** One result as the agent and the client see it. */
export interface SearchSourceResult {
  title: string;
  url: string;
  content?: string;
  publishedDate?: string;
  imgSrc?: string;
  engines?: string[];
  category?: string;
}

/** The subset of search-web-api's `Search` the service needs. */
export interface SearchSourceBackend {
  search: (
    query: string,
    pageno?: number,
    engineNames?: string[],
    categories?: string[],
  ) => Promise<MergedResult[]>;
}

type FallbackSearch = (
  query: string,
  options: { categories: string[]; language?: string },
) => Promise<{ results: any[] }>;

export interface SearchSourcesServiceOptions {
  /** Defaults to search-web-api's `Search`. */
  backend?: SearchSourceBackend;
  /** Restrict every search to these engines (e.g. a YouTube focus mode). */
  engineNames?: string[];
  /** Categories used when a tool call names none. */
  defaultCategories?: string[];
  /** Searches tried in order when the search-sources API returns nothing. */
  fallbacks?: FallbackSearch[];
  /** Longest the search-sources API may take before falling back. */
  timeoutMs?: number;
}

/**
 * Maps the categories the model is offered (LobeChat / SearXNG spellings) to
 * the search-web-api category registry.
 */
const CATEGORY_ALIASES: Record<string, string> = {
  science: "academic",
  academic: "academic",
  map: "maps",
  maps: "maps",
  social_media: "social",
  "social+media": "social",
  social: "social",
  music: "social",
  files: "specialized",
};

export const normalizeCategory = (category: SearchCategory | string): string =>
  CATEGORY_ALIASES[category] ?? category;

/** Maps search-web-api categories back to the SearXNG names fallbacks take. */
const SEARXNG_CATEGORY: Record<string, string> = {
  academic: "science",
  maps: "map",
  social: "social media",
  specialized: "general",
};

const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

const toSourceResult = (result: any): SearchSourceResult | null => {
  const url = result?.url || result?.link;
  if (!url || typeof url !== "string") return null;
  return {
    title: String(result.title || url),
    url,
    content: result.content || result.snippet || undefined,
    publishedDate: result.publishedDate || result.date || undefined,
    imgSrc: result.img_src || result.thumbnail || undefined,
    engines: Array.isArray(result.engines) ? result.engines : result.engine ? [result.engine] : undefined,
    category: result.category,
  };
};

/**
 * The `SearchService` of the web-browsing tool, backed by the search-sources
 * API.
 */
export class SearchSourcesService {
  private readonly backend: SearchSourceBackend;
  private readonly options: SearchSourcesServiceOptions;

  constructor(options: SearchSourcesServiceOptions = {}) {
    this.backend = options.backend ?? new Search();
    this.options = options;
  }

  /** The search-web-api categories a query will fan out to. */
  resolveCategories(searchCategories?: string[]): string[] {
    const requested = searchCategories?.length ? searchCategories : this.options.defaultCategories;
    const categories = (requested?.length ? requested : ["general"]).map(normalizeCategory);
    return [...new Set(categories)];
  }

  async webSearch(args: SearchQuery): Promise<{ query: string; results: SearchSourceResult[] }> {
    const query = args.query.trim();
    const categories = this.resolveCategories(args.searchCategories);
    const engineNames = this.options.engineNames;

    let raw: any[] = [];
    try {
      raw = await withTimeout(
        this.backend.search(query, 1, engineNames, engineNames?.length ? undefined : categories),
        this.options.timeoutMs ?? 15_000,
        [],
      );
    } catch (error) {
      console.error("[SearchSourcesService] search-sources API failed:", error);
    }

    if (raw.length === 0) {
      for (const fallback of this.options.fallbacks ?? []) {
        try {
          const res = await fallback(query, {
            categories: categories.map((c) => SEARXNG_CATEGORY[c] ?? c),
            language: "en",
          });
          if (res?.results?.length) {
            raw = res.results;
            break;
          }
        } catch (error) {
          console.error("[SearchSourcesService] fallback search failed:", error);
        }
      }
    }

    const results = raw.map(toSourceResult).filter((r): r is SearchSourceResult => r !== null);
    return { query, results };
  }
}

// =============================================================================
// Source registry
// =============================================================================

/**
 * Numbers every source the agent reads, in the order it first reads it.
 *
 * The model cites `[n]` against these numbers and the client renders its
 * source list in this order, so the registry is what keeps the two in step
 * across several searches and crawls.
 */
export class SourceRegistry {
  private readonly docs: Document[] = [];
  private readonly byUrl = new Map<string, number>();

  /**
   * Adds a source (or updates its text) and returns its 1-based number.
   * Sources are deduped by `key`, which defaults to the URL; uploads, which
   * all carry the URL "File", pass their own.
   */
  add(
    source: { url: string; title?: string; content?: string; imgSrc?: string; source?: string },
    key: string = source.url,
  ): number {
    const existing = this.byUrl.get(key);
    if (existing !== undefined) {
      const doc = this.docs[existing];
      if (source.content && source.content.length > (doc.pageContent?.length ?? 0)) {
        doc.pageContent = source.content;
      }
      return existing + 1;
    }
    this.docs.push({
      pageContent: source.content ?? "",
      metadata: {
        title: source.title || source.url,
        url: source.url,
        ...(source.source && { source: source.source }),
        ...(source.imgSrc && { img_src: source.imgSrc }),
      },
    });
    this.byUrl.set(key, this.docs.length - 1);
    return this.docs.length;
  }

  indexOf(url: string): number | undefined {
    const index = this.byUrl.get(url);
    return index === undefined ? undefined : index + 1;
  }

  get size(): number {
    return this.docs.length;
  }

  toDocuments(): Document[] {
    return this.docs.map((doc) => ({ ...doc, metadata: { ...doc.metadata } }));
  }
}

// =============================================================================
// Plain search through the context-engine pipeline
// =============================================================================

export interface SearchSourceOptions {
  engineNames?: string[];
  categories?: string[];
  pageno?: number;
}

/**
 * Runs the last user message through the search-sources API and records the
 * results in `metadata.searchResults`.
 */
export class SearchSourcesProcessor implements ContextProcessor {
  public readonly name = "search-sources";

  constructor(
    private readonly searchSource: SearchSourceBackend,
    private readonly options: SearchSourceOptions = {},
  ) {}

  private lastUserMessage(context: PipelineContext): string {
    for (let i = context.messages.length - 1; i >= 0; i--) {
      const message = context.messages[i];
      if (message.role === "user") {
        return typeof message.content === "string" ? message.content : "";
      }
    }
    return "";
  }

  async process(context: PipelineContext): Promise<PipelineContext> {
    const query = this.lastUserMessage(context);
    const { engineNames, categories, pageno = 1 } = this.options;

    let results: MergedResult[];
    if (categories !== undefined) {
      results = await this.searchSource.search(query, pageno, engineNames, categories);
    } else if (engineNames !== undefined) {
      results = await this.searchSource.search(query, pageno, engineNames);
    } else {
      results = await this.searchSource.search(query, pageno);
    }

    return {
      ...context,
      metadata: { ...context.metadata, searchResults: results, searchQuery: query, searchedAt: Date.now() },
    };
  }
}

export interface MergedSearchEngineOptions extends SearchSourceOptions {
  searchSource?: SearchSourceBackend;
}

/**
 * A single search through the context-engine pipeline with the search-sources
 * API as its source, returning the ranked results without an LLM answer.
 */
export class MergedSearchEngine {
  private readonly options: MergedSearchEngineOptions;
  private readonly searchSource: SearchSourceBackend;

  constructor(options: MergedSearchEngineOptions = {}) {
    this.options = options;
    this.searchSource = options.searchSource ?? new Search();
  }

  private buildEngine(options: MergedSearchEngineOptions): ContextEngine {
    return new ContextEngine({
      pipeline: [
        new SearchSourcesProcessor(options.searchSource ?? this.searchSource, {
          engineNames: options.engineNames,
          categories: options.categories,
          pageno: options.pageno,
        }),
      ],
    });
  }

  /**
   * Runs a query and returns the ranked results. Per-call options replace the
   * constructor's for that call only; a fresh pipeline is built per call so
   * concurrent searches never share processor state.
   */
  async search(query: string, options: MergedSearchEngineOptions = {}): Promise<MergedResult[]> {
    const hasOverride =
      options.engineNames !== undefined || options.categories !== undefined || options.pageno !== undefined;
    const engine = this.buildEngine(
      hasOverride ? { ...options, searchSource: options.searchSource } : { ...this.options, ...options },
    );
    const result = await engine.process({ messages: [{ role: "user", content: query }] });
    return (result.metadata.searchResults ?? []) as MergedResult[];
  }

  getProcessors(): ContextProcessor[] {
    return this.buildEngine(this.options).getProcessors();
  }

  validate() {
    return this.buildEngine(this.options).validate();
  }
}
