/**
 * @fileoverview Orchestrator for complex research queries.
 * Runs the web search, streams the result list to the client, and synthesizes
 * an answer from the result titles and snippets using LLMs through the Vercel
 * AI SDK (generateText/streamText). LLM query expansion before the search is
 * opt-in: by default the user's message is searched as typed, so the first
 * model call is the answer itself.
 */
import { generateText, streamText, type LanguageModel } from "ai";
import { LineOutputParser, LineListOutputParser } from "../../utils/outputParser";
import type { Document } from "./document";

/**
 * Longest HTML we run through {@link htmlToText}.
 *
 * Each `.replace()` below allocates a fresh copy of the whole string, so an
 * unbounded page (a 20MB HTML dump is not rare) becomes eight unbounded copies
 * live at once — enough on its own to take a 128MB Worker isolate out. Only the
 * first 5000 characters of the result are ever used, and a prefix this long is
 * far more than that survives.
 */
const MAX_HTML_CHARS = 500_000;

/** Strip HTML tags and decode entities — works in Cloudflare edge runtime */
function htmlToText(html: string): string {
  return html
    .slice(0, MAX_HTML_CHARS)
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/(script|style)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z#][a-z0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
import { formatChatHistoryAsString } from "../../utils";
import EventEmitter from "events";
import type {
  Config,
  ChatTurnMessage,
  DrainableEmitter,
  MetaSearchAgentType,
  SearchingEvent,
} from "./meta-search-types";
import {
  buildFallbackDocs,
  rerankDocs,
  processDocs,
  normalizeSourcesOutput,
  loadUploads,
  selectUploadImages,
  type R2CredentialsInput,
} from "./doc-utils";
import { groupAndSummarizeDocs } from "./link-summarizer";

export type { MetaSearchAgentType, Config, DrainableEmitter } from "./meta-search-types";

const waitWithTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T | undefined> => {
  return Promise.race([
    promise,
    new Promise<undefined>((resolve) => {
      setTimeout(() => resolve(undefined), timeoutMs);
    }),
  ]);
};

/**
 * Substitutes `{key}` placeholders in a prompt template with the provided
 * values, leaving unknown placeholders untouched.
 */
const interpolatePrompt = (
  template: string,
  vars: Record<string, string>,
): string => {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.split(`{${key}}`).join(value),
    template,
  );
};

/** Matches the http(s) URLs a user pastes into a message. */
const URL_PATTERN = /https?:\/\/[^\s<>"'`]+/gi;

/**
 * Keeps a search query to something a search engine can use. A rephraser that
 * answered instead of rephrasing, or a pasted essay, becomes its first
 * sentence — or, failing that, the start of the user's own message.
 */
const toSearchQuery = (question: string, fallback: string): string => {
  question = question.replace(/<think>.*?<\/think>/g, "").trim();
  if (question.length === 0) return "latest information";

  if (question.length > 500 || question.split(/[.!?]\s+/).length > 5) {
    console.warn(`[MetaSearchAgent] Query is too long (${question.length} chars), truncating or using fallback`);
    const firstSentence = question.split(/[.!?]\s+/)[0].trim();
    if (firstSentence.length > 0 && firstSentence.length < 200) {
      return firstSentence;
    }
    return fallback.slice(0, 200);
  }

  return question;
};

class MetaSearchAgent implements MetaSearchAgentType {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Asks the LLM to rephrase the message into a standalone search question,
   * and to pick out any URLs to summarize. This is a full model round trip
   * before the search can start, so it only runs when query expansion is on.
   */
  private async expandQuery(
    llm: LanguageModel,
    chatHistory: string,
    query: string,
    queryGeneratorPromptOverride?: string,
  ): Promise<{ question: string; links: string[] }> {
    // A user-authored query-expansion prompt (Settings → Search Settings)
    // replaces the focus mode's built-in one. Blank or whitespace-only text
    // means "use the built-in prompt".
    const queryGeneratorPrompt = queryGeneratorPromptOverride?.trim()
      ? queryGeneratorPromptOverride
      : this.config.queryGeneratorPrompt;

    const { text: retrieverOutput } = await generateText({
      model: llm,
      temperature: 0,
      system: queryGeneratorPrompt,
      messages: [
        ...this.config.queryGeneratorFewShots.map(([role, content]) => ({
          role,
          content,
        })),
        {
          role: "user",
          content: `
        <conversation>
        ${chatHistory}
        </conversation>

        <query>
        ${query}
        </query>
       `,
        },
      ],
    });

    const linksOutputParser = new LineListOutputParser({ key: "links" });
    const questionOutputParser = new LineOutputParser({ key: "question" });

    const links = await linksOutputParser.parse(retrieverOutput);
    let question =
      (await questionOutputParser.parse(retrieverOutput)) ?? retrieverOutput;

    if (question === "not_needed") {
      question = "latest information";
    }

    return { question, links };
  }

  /**
   * Runs the web search and returns its results as answer-context documents:
   * each one the result's title and search snippet, nothing fetched yet.
   *
   * The message is searched as typed unless `queryExpansionEnabled` is set,
   * in which case the LLM rephrases it first (see {@link expandQuery}).
   * `fromLinks` marks documents built from URLs in the message rather than a
   * search, which already carry their pages' text.
   */
  private async retrieveSearchDocs(
    llm: LanguageModel,
    chatHistory: string,
    query: string,
    category: string = "general",
    emitter?: EventEmitter,
    queryGeneratorPromptOverride?: string,
    queryExpansionEnabled = false,
  ): Promise<{ query: string; docs: Document[]; fromLinks?: boolean }> {
    let question: string;
    let links: string[];

    if (queryExpansionEnabled) {
      ({ question, links } = await this.expandQuery(
        llm,
        chatHistory,
        query,
        queryGeneratorPromptOverride,
      ));
    } else {
      links = query.match(URL_PATTERN) ?? [];
      question =
        links.length > 0 && this.config.getDocumentsFromLinks
          ? query.replace(URL_PATTERN, " ").replace(/\s+/g, " ").trim()
          : query;
    }

    if (links.length > 0 && this.config.getDocumentsFromLinks) {
      if (question.length === 0) question = "summarize";

      const linkDocs = await this.config.getDocumentsFromLinks({ links });
      const docs = await groupAndSummarizeDocs(llm, linkDocs, question);

      return { query: question, docs, fromLinks: true };
    }

    question = toSearchQuery(question, query);

    // Emit "searching" progress event so the client can show live status
    const categoryLabel = this.config.activeEngines.length > 0
      ? this.config.activeEngines.slice(0, 2).join(", ")
      : "Web";
    const emitSearching = (status: SearchingEvent["status"], query: string, cat?: string) => {
      emitter?.emit("data", JSON.stringify({
        type: "searching",
        data: { query, category: cat ?? categoryLabel, status } satisfies SearchingEvent,
      }));
    };

    emitSearching("running", question);

    let res: { results: any[]; suggestions: string[] } = { results: [], suggestions: [] };

    // If no search functions provided, return empty results
    if (!this.config.searchSearxng && !this.config.searchTavily) {
      res = { results: [], suggestions: [] };
    } else {
      const runSearxng = async () => {
        try {
          const result = await this.config.searchSearxng!(question, {
            language: "en",
            engines: this.config.activeEngines,
            categories: [category],
          });
          // Ensure result has the expected structure
          return result && typeof result === 'object' && 'results' in result
            ? result
            : { results: [], suggestions: [] };
        } catch (error) {
          console.error("[MetaSearchAgent] SearXNG search failed:", error);
          return { results: [], suggestions: [] };
        }
      };

      const isTavilyConfigured = this.config.isTavilyConfigured?.() ?? false;

      if (
        isTavilyConfigured &&
        this.config.activeEngines.length === 0 &&
        category === "general"
      ) {
        try {
          const tavilyResult = await this.config.searchTavily!(question, { searchDepth: "basic", maxResults: 10 });
          res = tavilyResult && typeof tavilyResult === 'object' && 'results' in tavilyResult
            ? tavilyResult
            : { results: [], suggestions: [] };
        } catch (error) {
          console.error("Tavily search failed, falling back to SearXNG:", error);
          res = this.config.searchSearxng ? await runSearxng() : { results: [], suggestions: [] };
        }
      } else {
        if (isTavilyConfigured && this.config.searchTavily) {
          try {
            res = await Promise.race([
              runSearxng(),
              new Promise<{ results: any[]; suggestions: string[] }>((_, reject) =>
                setTimeout(() => reject(new Error("Timeout")), 10000)
              )
            ]);
          } catch (err: any) {
            if (err.message === "Timeout") {
              console.warn("[MetaSearchAgent] SearXNG search did not respond in 10 seconds, falling back to Tavily.");
              try {
                const tavilyResult = await this.config.searchTavily(question, { searchDepth: "basic", maxResults: 10 });
                res = tavilyResult && typeof tavilyResult === 'object' && 'results' in tavilyResult
                  ? tavilyResult
                  : { results: [], suggestions: [] };
              } catch (tavilyErr) {
                console.error("[MetaSearchAgent] Tavily fallback also failed, awaiting SearXNG directly:", tavilyErr);
                res = this.config.searchSearxng ? await runSearxng() : { results: [], suggestions: [] };
              }
            } else {
              console.error("[MetaSearchAgent] SearXNG search failed, falling back to Tavily:", err);
              try {
                const tavilyResult = await this.config.searchTavily(question, { searchDepth: "basic", maxResults: 10 });
                res = tavilyResult && typeof tavilyResult === 'object' && 'results' in tavilyResult
                  ? tavilyResult
                  : { results: [], suggestions: [] };
              } catch (tavilyErr) {
                console.error("[MetaSearchAgent] Tavily fallback also failed:", tavilyErr);
                res = { results: [], suggestions: [] };
              }
            }
          }
        } else {
          res = this.config.searchSearxng ? await runSearxng() : { results: [], suggestions: [] };
        }
      }
    }

    let documents: Document[] = (res?.results ?? []).map((result) => ({
      pageContent:
        result.content ||
        (this.config.activeEngines.includes("youtube") ? result.title : ""),
      metadata: {
        title: result.title,
        url: result.url,
        source: result.source,
        ...(result.img_src && { img_src: result.img_src }),
      },
    }));

    if (documents.length === 0) {
      documents = buildFallbackDocs(question);
    }

    emitSearching("done", question);

    return { query: question, docs: documents };
  }

  /**
   * Replaces the search snippets of the top web results with text fetched
   * from their pages, in place, when the user has turned source extraction on
   * or set a thinking-time budget. Uploaded files are left alone.
   *
   * This runs after the result list has been sent to the client, so the
   * sources appear while the pages are still loading.
   */
  private async extractTopSources(
    documents: Document[],
    sourceExtractionEnabled: boolean,
    thinkingTimeLimit: number,
    emitter: EventEmitter,
  ): Promise<void> {
    // Determine extraction budget from thinkingTimeLimit (seconds).
    // thinkingTimeLimit === 0 means unlimited; use server config.
    let scrapeCount: number;
    let perSourceTimeout: number;

    if (thinkingTimeLimit > 0) {
      // Spread the time budget across 3 sources
      scrapeCount = 3;
      perSourceTimeout = Math.max(2, Math.floor(thinkingTimeLimit / scrapeCount));
    } else if (sourceExtractionEnabled) {
      scrapeCount = 3;
      // Default to 5 seconds if no config function available
      perSourceTimeout = 5;
    } else {
      scrapeCount = 0;
      perSourceTimeout = 0;
    }

    if (scrapeCount > 0) {
      const emitExtracting = (status: SearchingEvent["status"], query: string) => {
        emitter.emit("data", JSON.stringify({
          type: "searching",
          data: { query, category: "extract", status } satisfies SearchingEvent,
        }));
      };
      const docsToScrape = documents
        .filter((doc) => doc.metadata?.url && doc.metadata.url !== "File")
        .slice(0, scrapeCount);
      emitExtracting("running", `Extracting top ${docsToScrape.length} sources`);

      const extractionTasks = this.config.scrapeURL ? docsToScrape.map(async (doc) => {
        const url = doc.metadata?.url;
        if (!url || !this.config.scrapeURL) return;
        try {
          const result = await waitWithTimeout(
            this.config.scrapeURL(url, { timeout: perSourceTimeout }),
            perSourceTimeout * 1000 + 1500,
          );
          if (typeof result === "string" && result.length > 100) {
            const text = htmlToText(result)
              .replace(/(\r\n|\n|\r)/gm, " ")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 5000);
            if (text.length > 100) {
              doc.pageContent = text;
            }
          }
        } catch {
          // Keep original snippet on scraping failure or timeout
        }
      }) : [];

      await Promise.allSettled(extractionTasks);
      emitExtracting("done", `Extracting top ${docsToScrape.length} sources`);
    }
  }

  /**
   * Runs the full search-and-answer pipeline, emitting "sources",
   * "response", "searching", "end", and "error" events on the emitter.
   */
  private async runPipeline(
    emitter: EventEmitter,
    message: string,
    history: ChatTurnMessage[],
    llm: LanguageModel,
    optimizationMode: "speed" | "balanced" | "quality",
    fileIds: string[],
    systemInstructions: string,
    category: string,
    sourceExtractionEnabled: boolean,
    thinkingTimeLimit: number,
    queryExpansionPrompt?: string,
    queryExpansionEnabled = false,
  ): Promise<void> {
    try {
      const r2Credentials: R2CredentialsInput | undefined = process.env.R2_ACCOUNT_ID
        ? {
            accountId: process.env.R2_ACCOUNT_ID,
            accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
            bucket: process.env.R2_UPLOADS_BUCKET || "qwksearch-uploads",
          }
        : undefined;

      // Resolved once and shared below: the answer context needs the text and
      // the message needs the images, and fetching each attachment twice is how
      // a handful of large uploads used to reach the isolate's memory ceiling.
      // Started before the search so the two waits overlap; loadUploads never
      // rejects (a file it cannot resolve is dropped).
      const uploadsPromise = loadUploads(fileIds, r2Credentials);

      let docs: Document[] | null = null;
      let query = message;
      let fromLinks = false;

      if (this.config.searchWeb) {
        const result = await this.retrieveSearchDocs(
          llm,
          formatChatHistoryAsString(history),
          message,
          category,
          emitter,
          queryExpansionPrompt,
          queryExpansionEnabled,
        );
        query = result.query;
        docs = result.docs;
        fromLinks = result.fromLinks ?? false;
      }

      const uploads = await uploadsPromise;

      const sortedDocs = await rerankDocs(
        query,
        docs ?? [],
        fileIds,
        optimizationMode,
        r2Credentials,
        uploads,
      );

      const sources = normalizeSourcesOutput(sortedDocs, message);
      console.log("[MetaSearchAgent] emitting sources:", sources.length);
      emitter.emit("data", JSON.stringify({ type: "sources", data: sources }));

      // The result list is on screen; only now spend time fetching pages, and
      // only when the user asked for it. By default the answer is written from
      // the result titles and snippets alone.
      if (this.config.searchWeb && !fromLinks) {
        await this.extractTopSources(
          sortedDocs,
          sourceExtractionEnabled,
          thinkingTimeLimit,
          emitter,
        );
      }

      const systemPrompt = interpolatePrompt(this.config.responsePrompt, {
        systemInstructions,
        context: processDocs(sortedDocs),
        date: new Date().toISOString(),
      });

      // Uploaded images are passed to the LLM directly as image content parts
      // (alongside the text query). Documents already reach the model as text
      // context via processDocs above.
      const imageAttachments = selectUploadImages(uploads);
      const userContent =
        imageAttachments.length > 0
          ? [
              { type: "text" as const, text: message },
              ...imageAttachments.map((img) => ({
                type: "image" as const,
                image: img.image,
              })),
            ]
          : message;

      const result = streamText({
        model: llm,
        temperature: 0.7,
        system: systemPrompt,
        messages: [...history, { role: "user", content: userContent }],
      });

      let responseChunkCount = 0;
      for await (const chunk of result.textStream) {
        responseChunkCount += 1;
        emitter.emit("data", JSON.stringify({ type: "response", data: chunk }));
        // `emit` is synchronous: without this the whole model stream is pulled
        // into memory at the speed of the model while the consumer writes it
        // out at the speed of the client. A consumer that installs no
        // `waitForDrain` keeps the old behaviour.
        await (emitter as DrainableEmitter).waitForDrain?.();
      }
      console.log("[MetaSearchAgent] response stream ended, chunks:", responseChunkCount);

      if (responseChunkCount === 0) {
        const fallbackUrls = sources
          .map((doc) => doc.metadata?.url)
          .filter((url): url is string => typeof url === "string")
          .slice(0, 5);

        const fallbackMessage = [
          "I couldn't generate a full answer, but I ran a web search and found these source URLs:",
          ...fallbackUrls.map((url) => `- ${url}`),
        ].join("\n");

        emitter.emit("data", JSON.stringify({ type: "response", data: fallbackMessage }));
      }

      emitter.emit("end");
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);
      console.error("[MetaSearchAgent] caught error from AI SDK stream:", errMessage, err);
      let userMessage = errMessage;
      if (errMessage.includes("404") || errMessage.toLowerCase().includes("not found")) {
        userMessage =
          "The selected AI model was not found at the provider. Please go to Settings → Model Providers and select a different model.";
      } else if (errMessage.includes("410")) {
        userMessage =
          "The selected AI model is no longer available (deprecated by the provider). Please go to Settings → Model Providers and select a different model.";
      } else if (errMessage.includes("401") || errMessage.includes("authentication")) {
        userMessage =
          "Authentication failed with the AI provider. Please check your API key in Settings.";
      } else if (errMessage.includes("429") || errMessage.includes("rate limit")) {
        userMessage =
          "Rate limit reached for the AI provider. Please wait a moment and try again.";
      }
      emitter.emit("error", JSON.stringify({ data: userMessage }));
    }
  }

  async searchAndAnswer(
    message: string,
    history: ChatTurnMessage[],
    llm: LanguageModel,
    optimizationMode: "speed" | "balanced" | "quality",
    fileIds: string[],
    systemInstructions: string,
    category: string = "general",
    sourceExtractionEnabled = false,
    thinkingTimeLimit = 0,
    queryExpansionPrompt?: string,
    queryExpansionEnabled = false,
  ) {
    const emitter = new EventEmitter();

    // Start on the next macrotask so callers can attach their event
    // listeners before the first "sources"/"response" event can fire.
    setTimeout(() => {
      this.runPipeline(
        emitter,
        message,
        history,
        llm,
        optimizationMode,
        fileIds,
        systemInstructions,
        category,
        sourceExtractionEnabled,
        thinkingTimeLimit,
        queryExpansionPrompt,
        queryExpansionEnabled,
      );
    }, 0);

    return emitter;
  }
}

export default MetaSearchAgent;
