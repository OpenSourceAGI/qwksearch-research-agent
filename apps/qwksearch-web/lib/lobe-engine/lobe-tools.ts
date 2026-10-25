/**
 * @fileoverview LobeChat's built-in tools, imported from `apps/qwk-in-lobe`.
 *
 * A LobeChat tool is a manifest (its APIs as JSON-schema functions, plus the
 * system role that teaches the model to use them) and an ExecutionRuntime
 * whose methods are named after those APIs. This module turns any set of
 * them — the web-browsing and calculator tools, and the MCP servers from
 * `mcp-tools.ts` — into the AI SDK tool set the agent loop offers the model,
 * and builds the `<tools>` system-role section with LobeChat's own
 * `pluginPrompts`, the way LobeChat's `ToolSystemRole` provider does.
 *
 * Nothing here is a copy: the manifests, runtimes and prompts are the
 * qwk-in-lobe source files themselves.
 */

import { jsonSchema, tool, type ToolSet } from "ai";
import { WebBrowsingManifest } from "qwk-in-lobe/packages/builtin-tool-web-browsing/src/manifest";
import { WebBrowsingExecutionRuntime } from "qwk-in-lobe/packages/builtin-tool-web-browsing/src/ExecutionRuntime";
import { CalculatorManifest } from "qwk-in-lobe/packages/builtin-tool-calculator/src/manifest";
import { CalculatorExecutionRuntime } from "qwk-in-lobe/packages/builtin-tool-calculator/src/ExecutionRuntime";
import { pluginPrompts } from "qwk-in-lobe/packages/prompts/src/prompts/plugin";
import type { SearchSourcesService, SourceRegistry } from "./search-sources";

/** One API of a tool, as LobeChat's manifests describe it. */
export interface LobeToolApi {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

/** What the agent needs from a tool: its manifest, and a way to run it. */
export interface LobeToolProvider {
  identifier: string;
  name: string;
  systemRole?: string;
  description?: string;
  apis: LobeToolApi[];
  /** Prefix for the function names the model sees; built-ins have none. */
  namePrefix?: string;
  invoke: (apiName: string, args: any) => Promise<{ content: string; success: boolean }>;
  /** What the client shows while a call runs. */
  describe?: (apiName: string, args: any) => { query: string; category: string };
}

/** The model-facing tool set built from a list of providers. */
export interface LobeToolset {
  tools: ToolSet;
  systemRole: string;
  /** Function name → the provider and API it runs. */
  routes: Map<string, { provider: LobeToolProvider; apiName: string }>;
}

/** OpenAI-compatible function names: `[a-zA-Z0-9_-]{1,64}`. */
export const toFunctionName = (value: string): string =>
  value.replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/_+/g, "_").slice(0, 64);

export const buildToolset = (providers: LobeToolProvider[]): LobeToolset => {
  const tools: ToolSet = {};
  const routes: LobeToolset["routes"] = new Map();

  for (const provider of providers) {
    for (const api of provider.apis) {
      let name = toFunctionName(`${provider.namePrefix ?? ""}${api.name}`);
      if (routes.has(name)) name = toFunctionName(`${provider.identifier}_${api.name}`);
      if (routes.has(name)) continue;
      routes.set(name, { provider, apiName: api.name });
      tools[name] = tool({
        description: api.description,
        inputSchema: jsonSchema(
          api.parameters && Object.keys(api.parameters).length > 0
            ? (api.parameters as any)
            : { type: "object", properties: {} },
        ),
      });
    }
  }

  const systemRole = pluginPrompts({
    tools: providers.map((provider) => ({
      identifier: provider.identifier,
      name: provider.name,
      description: provider.description,
      systemRole: provider.systemRole,
      apis: provider.apis.map((api) => ({ name: api.name, desc: api.description })),
    })),
  });

  return { tools, systemRole, routes };
};

// =============================================================================
// Web browsing
// =============================================================================

/** The crawl result shape LobeChat's web-browsing runtime reads. */
interface CrawlUniformResult {
  crawler: string;
  originalUrl: string;
  data:
    | { content?: string; title?: string; url: string; description?: string; siteName?: string }
    | { errorMessage: string; errorType: string; content?: string; url?: string };
}

export interface CrawledPage {
  url: string;
  title?: string;
  content?: string;
  error?: string;
}

export type CrawlPage = (url: string) => Promise<CrawledPage>;

/**
 * Prefixes a source's title with the number it is cited by. LobeChat's result
 * prompts carry only titles and URLs, and qwksearch-web renders `[n]` badges
 * against its numbered source list, so the number travels in the title.
 */
const numbered = (index: number, title: string) => `[${index}] ${title}`;

/**
 * qwksearch-web's citation rules. They follow the web-browsing system role in
 * the prompt and replace its footnote style.
 */
export const QWKSEARCH_CITATION_RULES = `<qwksearch_citations>
These rules replace the citation format in the web-browsing tool instructions above.
- Every search result and crawled page title starts with its source number in brackets, e.g. "[3] Some title".
- Cite facts inline with that number in [number] notation, e.g. "The Eiffel Tower is one of the most visited landmarks in the world[1]." Use [1][2] for several sources.
- Only cite numbers that appear in the tool results; never invent one. Uploaded files are numbered the same way.
- Do not use markdown footnotes and do not list the sources at the end: the numbered sources are shown to the user beside your answer.
</qwksearch_citations>`;

export interface WebBrowsingProviderOptions {
  searchService: SearchSourcesService;
  registry: SourceRegistry;
  crawlPage?: CrawlPage;
  /** Label shown for searches (e.g. "Web", "Academic"). */
  label: string;
}

/**
 * LobeChat's web-browsing tool (manifest, system role and ExecutionRuntime)
 * with the search-sources API as its `SearchService`.
 */
export const createWebBrowsingProvider = (options: WebBrowsingProviderOptions): LobeToolProvider => {
  const { searchService, registry, crawlPage, label } = options;

  const runtime = new WebBrowsingExecutionRuntime({
    searchService: {
      webSearch: async (params: any) => {
        const started = Date.now();
        const { query, results } = await searchService.webSearch(params);
        return {
          costTime: Date.now() - started,
          query,
          resultNumbers: results.length,
          results: results.map((result) => {
            const index = registry.add({
              url: result.url,
              title: result.title,
              content: result.content,
              imgSrc: result.imgSrc,
              source: result.engines?.join(", "),
            });
            return {
              category: result.category,
              content: result.content ?? "",
              engines: result.engines ?? [],
              imgSrc: result.imgSrc,
              parsedUrl: result.url,
              publishedDate: result.publishedDate,
              score: 1,
              title: numbered(index, result.title),
              url: result.url,
            };
          }),
        };
      },
      crawlPages: async ({ urls }: { urls: string[] }) => ({
        results: await Promise.all(
          [...new Set(urls)].slice(0, 5).map(async (url): Promise<CrawlUniformResult> => {
            const fail = (errorType: string, errorMessage: string): CrawlUniformResult => ({
              crawler: "qwksearch",
              originalUrl: url,
              data: { errorType, errorMessage, url },
            });
            if (!crawlPage) return fail("Unavailable", "Page reading is not configured");
            try {
              const page = await crawlPage(url);
              if (page.error || !page.content) return fail("CrawlError", page.error || "Empty page");
              const pageUrl = page.url || url;
              const index = registry.add({ url: pageUrl, title: page.title, content: page.content });
              return {
                crawler: "qwksearch",
                originalUrl: url,
                data: { url: pageUrl, title: numbered(index, page.title || pageUrl), content: page.content },
              };
            } catch (error) {
              return fail("CrawlError", error instanceof Error ? error.message : String(error));
            }
          }),
        ),
      }),
    } as any,
  });

  return {
    identifier: WebBrowsingManifest.identifier,
    name: WebBrowsingManifest.meta.title ?? "Web Browsing",
    description: WebBrowsingManifest.meta.description,
    systemRole: WebBrowsingManifest.systemRole,
    apis: WebBrowsingManifest.api as LobeToolApi[],
    invoke: async (apiName, args) => {
      const method = (runtime as any)[apiName];
      if (typeof method !== "function") return { content: `Unknown API: ${apiName}`, success: false };
      return method.call(runtime, args);
    },
    describe: (apiName, args) => {
      if (apiName === "search") {
        const categories: string[] | undefined = args?.searchCategories;
        return {
          query: String(args?.query ?? ""),
          category: categories?.length ? `${label} · ${categories.join(", ")}` : label,
        };
      }
      const urls: string[] = apiName === "crawlSinglePage" ? [args?.url] : (args?.urls ?? []);
      const hosts = urls.filter(Boolean).map((url) => {
        try {
          return new URL(url).hostname.replace(/^www\./, "");
        } catch {
          return url;
        }
      });
      return { query: `Reading ${hosts.join(", ")}`, category: "extract" };
    },
  };
};

// =============================================================================
// Calculator
// =============================================================================

/** LobeChat's calculator tool (mathjs + nerdamer): arithmetic, units, algebra, calculus. */
export const createCalculatorProvider = (): LobeToolProvider => {
  const runtime = new CalculatorExecutionRuntime();
  return {
    identifier: CalculatorManifest.identifier,
    name: CalculatorManifest.meta.title ?? "Calculator",
    description: CalculatorManifest.meta.description,
    systemRole: CalculatorManifest.systemRole,
    apis: CalculatorManifest.api as LobeToolApi[],
    invoke: async (apiName, args) => {
      const method = (runtime as any)[apiName];
      if (typeof method !== "function") return { content: `Unknown API: ${apiName}`, success: false };
      return method.call(runtime, args);
    },
    describe: (apiName, args) => ({
      query: String(args?.expression ?? args?.equation ?? apiName),
      category: "Calculator",
    }),
  };
};
