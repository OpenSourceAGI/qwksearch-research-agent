/**
 * @fileoverview Orchestrator for complex research queries.
 * Manages query expansion, web search execution, and result synthesis using
 * LLMs through the Vercel AI SDK (generateText/streamText).
 */
import { generateText, streamText, type LanguageModel } from "ai";
import { LineOutputParser, LineListOutputParser } from "../../utils/outputParser";
import type { Document } from "./document";

/** Strip HTML tags and decode entities — works in Cloudflare edge runtime */
function htmlToText(html: string): string {
  return html
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
  MetaSearchAgentType,
  SearchingEvent,
} from "./meta-search-types";
import {
  buildFallbackDocs,
  rerankDocs,
  processDocs,
  normalizeSourcesOutput,
  loadUploadImages,
  type R2CredentialsInput,
} from "./doc-utils";
import { groupAndSummarizeDocs } from "./link-summarizer";

export type { MetaSearchAgentType, Config } from "./meta-search-types";

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

class MetaSearchAgent implements MetaSearchAgentType {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Rephrases the user's query into a standalone search question (and any
   * URLs to summarize), runs the web search, and returns the documents to
   * use as answer context.
   */
  private async retrieveSearchDocs(
    llm: LanguageModel,
    chatHistory: string,
    query: string,
    category: string = "general",
    sourceExtractionEnabled = false,
    thinkingTimeLimit = 0,
    emitter?: EventEmitter,
  ): Promise<{ query: string; docs: Document[] }> {
    const { text: retrieverOutput } = await generateText({
      model: llm,
      temperature: 0,
      system: this.config.queryGeneratorPrompt,
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

    if (links.length > 0 && this.config.getDocumentsFromLinks) {
      if (question.length === 0) question = "summarize";

      const linkDocs = await this.config.getDocumentsFromLinks({ links });
      const docs = await groupAndSummarizeDocs(llm, linkDocs, question);

      return { query: question, docs };
    }

    question = question.replace(/<think>.*?<\/think>/g, "");
    if (!question || question.trim().length === 0) {
      question = "latest information";
    }

    // Validate and sanitize the query before sending to search APIs
    // If the LLM returned a long response instead of a concise query, extract the first sentence
    // or use the original user query as fallback
    question = question.trim();
    if (question.length > 500 || question.split(/[.!?]\s+/).length > 5) {
      // Query is too long or contains too many sentences - likely the LLM returned a full response
      console.warn(`[MetaSearchAgent] Query is too long (${question.length} chars), truncating or using fallback`);

      // Try to extract first sentence as the query
      const firstSentence = question.split(/[.!?]\s+/)[0].trim();
      if (firstSentence.length > 0 && firstSentence.length < 200) {
        question = firstSentence;
      } else {
        // Fallback to original user query
        question = query.slice(0, 200);
      }
    }

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
      const docsToScrape = documents.slice(0, scrapeCount);
      emitSearching("running", `Extracting top ${docsToScrape.length} sources`, "extract");

      const extractionTasks = this.config.scrapeURL ? docsToScrape.map(async (doc, idx) => {
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
              documents[idx].pageContent = text;
            }
          }
        } catch {
          // Keep original snippet on scraping failure or timeout
        }
      }) : [];

      await Promise.allSettled(extractionTasks);
      emitSearching("done", `Extracting top ${docsToScrape.length} sources`, "extract");
    }

    return { query: question, docs: documents };
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
  ): Promise<void> {
    try {
      let docs: Document[] | null = null;
      let query = message;

      if (this.config.searchWeb) {
        const result = await this.retrieveSearchDocs(
          llm,
          formatChatHistoryAsString(history),
          message,
          category,
          sourceExtractionEnabled,
          thinkingTimeLimit,
          emitter,
        );
        query = result.query;
        docs = result.docs;
      }

      const r2Credentials: R2CredentialsInput | undefined = process.env.R2_ACCOUNT_ID
        ? {
            accountId: process.env.R2_ACCOUNT_ID,
            accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
            bucket: process.env.R2_UPLOADS_BUCKET || "qwksearch-uploads",
          }
        : undefined;

      const sortedDocs = await rerankDocs(
        query,
        docs ?? [],
        fileIds,
        optimizationMode,
        r2Credentials,
      );

      const sources = normalizeSourcesOutput(sortedDocs, message);
      console.log("[MetaSearchAgent] emitting sources:", sources.length);
      emitter.emit("data", JSON.stringify({ type: "sources", data: sources }));

      const systemPrompt = interpolatePrompt(this.config.responsePrompt, {
        systemInstructions,
        context: processDocs(sortedDocs),
        date: new Date().toISOString(),
      });

      // Resolve any uploaded images so they are passed to the LLM directly as
      // image content parts (alongside the text query). Documents already
      // reach the model as text context via processDocs above.
      const imageAttachments = await loadUploadImages(fileIds, r2Credentials);
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
      );
    }, 0);

    return emitter;
  }
}

export default MetaSearchAgent;
