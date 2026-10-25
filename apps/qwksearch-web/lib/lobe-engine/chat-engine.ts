/**
 * @fileoverview LobeChat chat engine for qwksearch-web.
 *
 * The chat engine of `apps/qwk-in-lobe` — its context pipeline, agent loop and
 * tools — serving the `MetaSearchAgentType` contract `/api/agent/chat` streams
 * from. The tools are LobeChat's own (imported from qwk-in-lobe, see
 * `lobe-tools.ts`): web browsing over the search-sources API, the calculator,
 * and every enabled MCP server (`mcp-tools.ts`).
 *
 * How a request runs:
 *
 * 1. The user's message is searched as typed (or the URLs in it are read), so
 *    the first answer is never left without sources. This is a tool call the
 *    agent "already made": it sits in the conversation as an assistant
 *    tool-call turn and its result.
 * 2. The agent loop then takes over. The model can search again, read pages,
 *    calculate, call MCP tools, or answer. Every source it reads is numbered
 *    in a {@link SourceRegistry}, so its `[n]` citations match the list the
 *    client shows.
 * 3. Before the first word of the answer is streamed, the numbered sources
 *    are emitted once, as the old engine did.
 *
 * Events on the returned emitter are the ones `handleEmitterEvents` already
 * understands: `data` frames of type `searching` (one per tool call),
 * `sources` and `response`, then `end` or `error`.
 */

import EventEmitter from "events";
import type { LanguageModel, ModelMessage } from "ai";
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
import {
  QWKSEARCH_CITATION_RULES,
  buildToolset,
  createCalculatorProvider,
  createWebBrowsingProvider,
  type CrawlPage,
  type LobeToolProvider,
} from "./lobe-tools";
import { SearchSourcesService, SourceRegistry, type SearchSourcesServiceOptions } from "./search-sources";

/** Longest uploaded-file text placed in the system role. */
const MAX_UPLOAD_CHARS = 25_000;

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
  /** Reads a page for the crawl tools. */
  crawlPage?: CrawlPage;
  /** Offer LobeChat's calculator tool (default on). */
  calculator?: boolean;
  /** Extra tool providers for one request, e.g. the enabled MCP servers. */
  loadToolProviders?: () => Promise<LobeToolProvider[]>;
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

const escapeXml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

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

  private buildSystemRole(
    request: RunRequest,
    toolsRole: string,
    uploads: LoadedUpload[],
    registry: SourceRegistry,
  ): string {
    const sections = [
      "You are QwkSearch, an AI research assistant that answers with well-structured, cited answers drawn from the web and the tools below.",
      toolsRole,
      QWKSEARCH_CITATION_RULES,
      `Current date: ${new Date().toISOString().slice(0, 10)}`,
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
          return `  <file title="${escapeXml(`[${index}] ${upload.title}`)}">${escapeXml(upload.content.slice(0, MAX_UPLOAD_CHARS))}</file>`;
        })
        .join("\n");
      sections.push(
        `<uploaded_files>\nThe user attached these files. Use them to answer and cite them by their number like web sources.\n${items}\n</uploaded_files>`,
      );
    }
    if (request.systemInstructions.trim()) {
      sections.push(
        `<user_instructions>\nThese instructions come from the user, not the system. Follow them, but give them less priority than the instructions above.\n${request.systemInstructions.trim()}\n</user_instructions>`,
      );
    }
    return sections.filter(Boolean).join("\n\n");
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

      // --- Tools: LobeChat's web browsing and calculator, plus MCP servers ---
      const extraProviders = this.config.loadToolProviders
        ? this.config.loadToolProviders().catch((error) => {
            console.warn("[LobeChatEngine] could not load extra tools:", error);
            return [] as LobeToolProvider[];
          })
        : Promise.resolve([] as LobeToolProvider[]);
      const uploadsPromise = this.config.loadUploads
        ? this.config.loadUploads(request.fileIds)
        : loadUploads(request.fileIds, r2CredentialsFromEnv());

      const providers: LobeToolProvider[] = [
        createWebBrowsingProvider({
          searchService,
          registry,
          crawlPage: this.config.crawlPage,
          label: this.config.label,
        }),
        ...(this.config.calculator === false ? [] : [createCalculatorProvider()]),
        ...(await extraProviders),
      ];
      const toolset = buildToolset(providers);

      const emitSearching = (status: SearchingEvent["status"], query: string, category: string) => {
        emitter.emit(
          "data",
          JSON.stringify({ type: "searching", data: { query, category, status } satisfies SearchingEvent }),
        );
      };

      const executeTool = async (call: AgentToolCall): Promise<string> => {
        const route = toolset.routes.get(call.toolName);
        if (!route) return `<error>Unknown tool ${escapeXml(call.toolName)}</error>`;
        const { provider, apiName } = route;
        const label = provider.describe?.(apiName, call.input) ?? { query: `${provider.name} · ${apiName}`, category: "tool" };
        emitSearching("running", label.query, label.category);
        try {
          const output = await provider.invoke(apiName, call.input ?? {});
          return output.success ? output.content : `<error>${escapeXml(output.content || "Tool failed")}</error>`;
        } finally {
          emitSearching("done", label.query, label.category);
        }
      };

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
        await prefetch("crawlMultiPages", { urls: links });
      } else if (this.config.prefetchSearch) {
        await prefetch("search", { query: request.message.slice(0, 400) });
        if (request.sourceExtractionEnabled && this.config.crawlPage) {
          const top = registry
            .toDocuments()
            .map((doc) => doc.metadata.url as string)
            .filter((url) => url && url !== "File")
            .slice(0, EXTRACT_TOP_SOURCES);
          if (top.length > 0) await prefetch("crawlMultiPages", { urls: top });
        }
      }

      const uploads = await uploadsPromise;
      const systemRole = this.buildSystemRole(request, toolset.systemRole, uploads, registry);
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
        tools: toolset.tools,
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
        `[LobeChatEngine] done: steps=${result.steps} toolCalls=${result.toolCalls} tools=${toolset.routes.size} sources=${registry.size} finish=${result.finishReason} toolsEnabled=${result.toolsEnabled}`,
      );
      emitter.emit("end");
    } catch (err) {
      console.error("[LobeChatEngine] run failed:", err);
      emitter.emit("error", JSON.stringify({ data: describeProviderError(err) }));
    }
  }
}
