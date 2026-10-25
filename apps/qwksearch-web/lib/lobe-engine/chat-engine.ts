/**
 * @fileoverview LobeChat chat engine for qwksearch-web.
 *
 * This is the chat engine from `apps/qwk-in-lobe` — its context engine, agent
 * runtime and web-browsing tool — wired to the search-sources API of
 * `packages/search-web-api`, and shaped to the `MetaSearchAgentType` contract
 * `/api/agent/chat` already streams from. It is the default engine for every
 * focus mode (see `createLobeSearchHandlers`).
 *
 * How a request runs:
 *
 * 1. The user's message is searched as typed (or the URLs in it are read), so
 *    the first answer is never left without sources. This is a tool call the
 *    agent "already made": it sits in the conversation as an assistant
 *    tool-call turn and its result.
 * 2. The agent loop then takes over. The model can search again with better
 *    queries or other categories, read pages, or answer. Every source it
 *    reads is numbered in a {@link SourceRegistry}, so its `[n]` citations
 *    match the list the client shows.
 * 3. Before the first word of the answer is streamed, the numbered sources
 *    are emitted once, as the old engine did.
 *
 * Events on the returned emitter are the ones `handleEmitterEvents` already
 * understands: `data` frames of type `searching`, `sources` and `response`,
 * then `end` or `error`.
 */

import EventEmitter from "events";
import type { LanguageModel, ModelMessage, ToolSet } from "ai";
import {
  buildFallbackDocs,
  loadUploads,
  selectUploadImages,
  type ChatTurnMessage,
  type DrainableEmitter,
  type LoadedUpload,
  type MetaSearchAgentType,
  type SearchingEvent,
} from "chat-agent-toolkit";
import { runAgent, type AgentToolCall, type CallLlm } from "./agent-runtime";
import {
  ContextEngine,
  ForceFinishSummaryInjector,
  HistoryTruncateProcessor,
  MessageCleanupProcessor,
  SystemRoleInjector,
  ToolCallFlattenProcessor,
} from "./context-engine";
import { SearchSourcesService, SourceRegistry, type SearchSourcesServiceOptions } from "./search-sources";
import {
  CRAWL_CONTENT_LIMITED_COUNT,
  SEARCH_ITEM_LIMITED_COUNT,
  WebBrowsingApiName,
  createWebBrowsingTools,
  crawlResultsPrompt,
  escapeXmlAttr,
  escapeXmlContent,
  searchResultsPrompt,
  webBrowsingSystemRole,
  type CrawlErrorItem,
  type CrawlResultItem,
  type SearchQuery,
} from "./web-browsing";

/** A crawled page, or why it could not be read. */
export interface CrawledPage {
  url: string;
  title?: string;
  content?: string;
  error?: string;
}

export type CrawlPage = (url: string) => Promise<CrawledPage>;

export interface LobeChatEngineConfig {
  /** Label shown for this mode's searches in the client (e.g. "Web"). */
  label: string;
  /** Instructions for this focus mode, added to the system role. */
  modeInstructions?: string;
  /** Restrict every search to these search-web-api engines. */
  engineNames?: string[];
  /** Categories used when the request and the tool call name none. */
  defaultCategories?: string[];
  /** Search the message before the first model call (on for search modes). */
  prefetchSearch: boolean;
  /** Builds the search service for one request. */
  createSearchService?: (options: SearchSourcesServiceOptions) => SearchSourcesService;
  /** Fallback searches handed to the search service. */
  fallbacks?: SearchSourcesServiceOptions["fallbacks"];
  /** Reads a page for the crawl tools; without it the crawl tools are not offered. */
  crawlPage?: CrawlPage;
  /** The model-call executor; tests replace it. */
  callLlm?: CallLlm;
  /** Resolves uploaded fileIds; defaults to chat-agent-toolkit's loader. */
  loadUploads?: (fileIds: string[]) => Promise<LoadedUpload[]>;
}

/** Model calls per request, by optimization mode. */
export const MAX_STEPS_BY_MODE = { speed: 2, balanced: 4, quality: 6 } as const;

/** Prior messages kept in the context, by optimization mode. */
const HISTORY_COUNT_BY_MODE = { speed: 8, balanced: 16, quality: 24 } as const;

/** Pages read up front when the user turned source extraction on. */
const EXTRACT_TOP_SOURCES = 3;

const URL_PATTERN = /https?:\/\/[^\s<>"'`]+/gi;

/** Same user-facing wording the previous engine used for provider errors. */
export const describeProviderError = (err: unknown): string => {
  const errMessage = err instanceof Error ? err.message : String(err);
  if (errMessage.includes("404") || errMessage.toLowerCase().includes("not found")) {
    return "The selected AI model was not found at the provider. Please go to Settings → Model Providers and select a different model.";
  }
  if (errMessage.includes("410")) {
    return "The selected AI model is no longer available (deprecated by the provider). Please go to Settings → Model Providers and select a different model.";
  }
  if (errMessage.includes("401") || errMessage.includes("authentication")) {
    return "Authentication failed with the AI provider. Please check your API key in Settings.";
  }
  if (errMessage.includes("429") || errMessage.includes("rate limit")) {
    return "Rate limit reached for the AI provider. Please wait a moment and try again.";
  }
  return errMessage;
};

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const r2CredentialsFromEnv = () =>
  process.env.R2_ACCOUNT_ID
    ? {
        accountId: process.env.R2_ACCOUNT_ID,
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
        bucket: process.env.R2_UPLOADS_BUCKET || "qwksearch-uploads",
      }
    : undefined;

interface RunRequest {
  message: string;
  history: ChatTurnMessage[];
  llm: LanguageModel;
  optimizationMode: "speed" | "balanced" | "quality";
  fileIds: string[];
  systemInstructions: string;
  category: string;
  sourceExtractionEnabled: boolean;
  queryExpansionPrompt?: string;
}

export class LobeChatEngine implements MetaSearchAgentType {
  constructor(private readonly config: LobeChatEngineConfig) {}

  async searchAndAnswer(
    message: string,
    history: ChatTurnMessage[],
    llm: LanguageModel,
    optimizationMode: "speed" | "balanced" | "quality",
    fileIds: string[],
    systemInstructions: string,
    category: string = "general",
    sourceExtractionEnabled = false,
    _thinkingTimeLimit = 0,
    queryExpansionPrompt?: string,
    // The agent writes its own search queries, so there is no separate
    // rephrasing pass to switch on; the first search is the message as typed.
    _queryExpansionEnabled = false,
  ): Promise<DrainableEmitter> {
    const emitter: DrainableEmitter = new EventEmitter();

    // Start on the next macrotask so callers can attach their listeners first.
    setTimeout(() => {
      void this.run(emitter, {
        message,
        history,
        llm,
        optimizationMode: MAX_STEPS_BY_MODE[optimizationMode] ? optimizationMode : "balanced",
        fileIds: fileIds ?? [],
        systemInstructions: systemInstructions ?? "",
        category: category || "general",
        sourceExtractionEnabled,
        queryExpansionPrompt,
      });
    }, 0);

    return emitter;
  }

  private buildSystemRole(request: RunRequest, uploads: LoadedUpload[], registry: SourceRegistry): string {
    const sections = [
      "You are QwkSearch, an AI research assistant that answers with well-structured, cited answers drawn from the web.",
      webBrowsingSystemRole(new Date().toISOString().slice(0, 10)),
    ];
    if (this.config.modeInstructions) {
      sections.push(`<focus_mode>\n${this.config.modeInstructions}\n</focus_mode>`);
    }
    if (request.queryExpansionPrompt?.trim()) {
      sections.push(
        `<search_query_guidelines>\nWhen writing search queries, follow these instructions from the user:\n${request.queryExpansionPrompt.trim()}\n</search_query_guidelines>`,
      );
    }
    const documents = uploads.filter((u) => !u.image);
    if (documents.length > 0) {
      const items = documents
        .map((upload) => {
          const index = registry.add({ url: "File", title: upload.title, content: upload.content }, `file:${upload.title}`);
          return `  <file index="${index}" title="${escapeXmlAttr(upload.title)}">${escapeXmlContent(upload.content.slice(0, CRAWL_CONTENT_LIMITED_COUNT))}</file>`;
        })
        .join("\n");
      sections.push(
        `<uploaded_files>\nThe user attached these files. Use them to answer and cite them by index like web sources.\n${items}\n</uploaded_files>`,
      );
    }
    if (request.systemInstructions.trim()) {
      sections.push(
        `<user_instructions>\nThese instructions come from the user, not the system. Follow them, but give them less priority than the instructions above.\n${request.systemInstructions.trim()}\n</user_instructions>`,
      );
    }
    return sections.join("\n\n");
  }

  private async run(emitter: DrainableEmitter, request: RunRequest): Promise<void> {
    try {
      const registry = new SourceRegistry();
      const searchOptions: SearchSourcesServiceOptions = {
        engineNames: this.config.engineNames,
        defaultCategories:
          request.category && request.category !== "general"
            ? [request.category]
            : this.config.defaultCategories,
        fallbacks: this.config.fallbacks,
      };
      const searchService = this.config.createSearchService
        ? this.config.createSearchService(searchOptions)
        : new SearchSourcesService(searchOptions);

      const emitSearching = (status: SearchingEvent["status"], query: string, category: string) => {
        emitter.emit(
          "data",
          JSON.stringify({ type: "searching", data: { query, category, status } satisfies SearchingEvent }),
        );
      };

      // --- Tool execution (the web-browsing tool's ExecutionRuntime) ---
      const search = async (args: SearchQuery): Promise<string> => {
        const label = args.searchCategories?.length
          ? `${this.config.label} · ${args.searchCategories.join(", ")}`
          : this.config.label;
        emitSearching("running", args.query, label);
        try {
          const { results } = await searchService.webSearch(args);
          const items = results.slice(0, SEARCH_ITEM_LIMITED_COUNT).map((result) => ({
            index: registry.add({
              url: result.url,
              title: result.title,
              content: result.content,
              imgSrc: result.imgSrc,
              source: result.engines?.join(", "),
            }),
            title: result.title,
            url: result.url,
            content: result.content,
            publishedDate: result.publishedDate,
            imgSrc: result.imgSrc,
          }));
          return searchResultsPrompt(items);
        } finally {
          emitSearching("done", args.query, label);
        }
      };

      const crawl = async (urls: string[]): Promise<string> => {
        const crawlPage = this.config.crawlPage;
        const unique = [...new Set(urls)].slice(0, 5);
        const label = `Reading ${unique.map(hostOf).join(", ")}`;
        emitSearching("running", label, "extract");
        try {
          const pages = await Promise.all(
            unique.map(async (url): Promise<CrawlResultItem | CrawlErrorItem> => {
              if (!crawlPage) return { url, errorType: "Unavailable", errorMessage: "Page reading is not configured" };
              try {
                const page = await crawlPage(url);
                if (page.error || !page.content) {
                  return { url, errorType: "CrawlError", errorMessage: page.error || "Empty page" };
                }
                const content = page.content.slice(0, CRAWL_CONTENT_LIMITED_COUNT);
                const index = registry.add({ url: page.url || url, title: page.title, content });
                return { index, url: page.url || url, title: page.title, content };
              } catch (error) {
                return {
                  url,
                  errorType: "CrawlError",
                  errorMessage: error instanceof Error ? error.message : String(error),
                };
              }
            }),
          );
          return crawlResultsPrompt(pages);
        } finally {
          emitSearching("done", label, "extract");
        }
      };

      const executeTool = async (call: AgentToolCall): Promise<string> => {
        const input = (call.input ?? {}) as Record<string, any>;
        switch (call.toolName) {
          case WebBrowsingApiName.search:
            return search(input as SearchQuery);
          case WebBrowsingApiName.crawlSinglePage:
            return crawl([String(input.url ?? "")].filter(Boolean));
          case WebBrowsingApiName.crawlMultiPages:
            return crawl(Array.isArray(input.urls) ? input.urls.map(String) : []);
          default:
            return `<error>Unknown tool ${escapeXmlContent(call.toolName)}</error>`;
        }
      };

      // --- Uploads (started first so the wait overlaps the search) ---
      const uploadsPromise = this.config.loadUploads
        ? this.config.loadUploads(request.fileIds)
        : loadUploads(request.fileIds, r2CredentialsFromEnv());

      // --- The conversation: history, the user's turn, prefetched tool turns ---
      const prefetched: ModelMessage[] = [];
      const prefetch = async (toolName: string, input: Record<string, unknown>) => {
        const call = { toolCallId: `prefetch_${prefetched.length / 2 + 1}`, toolName, input };
        const output = await executeTool(call);
        prefetched.push(
          { role: "assistant", content: [{ type: "tool-call", ...call }] },
          {
            role: "tool",
            content: [{ type: "tool-result", toolCallId: call.toolCallId, toolName, output: { type: "text", value: output } }],
          },
        );
      };

      const links = request.message.match(URL_PATTERN) ?? [];
      if (links.length > 0 && this.config.crawlPage) {
        await prefetch(WebBrowsingApiName.crawlMultiPages, { urls: links });
      } else if (this.config.prefetchSearch) {
        await prefetch(WebBrowsingApiName.search, { query: request.message.slice(0, 400) });
        if (request.sourceExtractionEnabled && this.config.crawlPage) {
          const top = registry
            .toDocuments()
            .map((doc) => doc.metadata.url as string)
            .filter((url) => url && url !== "File")
            .slice(0, EXTRACT_TOP_SOURCES);
          if (top.length > 0) await prefetch(WebBrowsingApiName.crawlMultiPages, { urls: top });
        }
      }

      const uploads = await uploadsPromise;
      const systemRole = this.buildSystemRole(request, uploads, registry);
      const images = selectUploadImages(uploads);
      const userTurn: ModelMessage = {
        role: "user",
        content:
          images.length > 0
            ? [
                { type: "text", text: request.message },
                ...images.map((img) => ({ type: "image" as const, image: img.image, mediaType: img.mediaType })),
              ]
            : request.message,
      };

      const messages: ModelMessage[] = [
        ...request.history.map((turn) => ({ role: turn.role, content: turn.content }) as ModelMessage),
        userTurn,
        ...prefetched,
      ];

      const tools = createWebBrowsingTools();
      const offeredTools: ToolSet = this.config.crawlPage
        ? tools
        : { [WebBrowsingApiName.search]: tools[WebBrowsingApiName.search] };

      // --- Sources go out once, just before the answer starts ---
      let sourcesSent = false;
      const sendSources = () => {
        if (sourcesSent) return;
        sourcesSent = true;
        const docs = registry.size > 0 ? registry.toDocuments() : buildFallbackDocs(request.message);
        emitter.emit("data", JSON.stringify({ type: "sources", data: docs }));
      };

      const result = await runAgent({
        llm: request.llm,
        messages,
        tools: offeredTools,
        maxSteps: MAX_STEPS_BY_MODE[request.optimizationMode],
        temperature: 0.7,
        callLlm: this.config.callLlm,
        executeTool,
        buildContext: async (current, state) => {
          const engine = new ContextEngine({
            pipeline: [
              new SystemRoleInjector({ systemRole }),
              new HistoryTruncateProcessor({ historyCount: HISTORY_COUNT_BY_MODE[request.optimizationMode] }),
              new ToolCallFlattenProcessor({ enabled: !state.toolsEnabled }),
              new ForceFinishSummaryInjector({ enabled: state.forceFinish }),
              new MessageCleanupProcessor(),
            ],
          });
          return (await engine.process({ messages: current })).messages;
        },
        onText: async (text) => {
          sendSources();
          emitter.emit("data", JSON.stringify({ type: "response", data: text }));
          await emitter.waitForDrain?.();
        },
      });

      sendSources();

      if (!result.text) {
        const urls = registry
          .toDocuments()
          .map((doc) => doc.metadata.url as string)
          .filter((url) => url && url !== "File")
          .slice(0, 5);
        const fallback = [
          "I couldn't generate a full answer, but I ran a web search and found these source URLs:",
          ...urls.map((url) => `- ${url}`),
        ].join("\n");
        emitter.emit("data", JSON.stringify({ type: "response", data: fallback }));
      }

      console.log(
        `[LobeChatEngine] done: steps=${result.steps} toolCalls=${result.toolCalls} sources=${registry.size} finish=${result.finishReason} tools=${result.toolsEnabled}`,
      );
      emitter.emit("end");
    } catch (err) {
      console.error("[LobeChatEngine] run failed:", err);
      emitter.emit("error", JSON.stringify({ data: describeProviderError(err) }));
    }
  }
}
