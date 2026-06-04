/**
 * @module research/search/stream-handler
 * @description Consumes a LangChain streamEvents generator and emits
 * structured "sources" and "response" events on an EventEmitter.
 */
import { Document } from "@langchain/core/documents";
import EventEmitter from "events";
import type { StreamEvent } from "@langchain/core/tracers/log_stream";
import { buildFallbackDocs, normalizeSourcesOutput } from "./doc-utils";

export async function handleStream(
  stream: AsyncGenerator<StreamEvent, any, any>,
  emitter: EventEmitter,
  query: string,
): Promise<void> {
  let emittedSources = false;
  let responseChunkCount = 0;
  let lastSources: Document[] = [];
  let chainEnded = false;

  console.log("[handleStream] starting stream consumption for query:", query.slice(0, 80));

  try {
    for await (const event of stream) {
      if (event.event === "on_chain_end" && event.name === "FinalSourceRetriever") {
        lastSources = normalizeSourcesOutput(event.data.output, query);
        emittedSources = true;
        console.log("[handleStream] emitting sources:", lastSources.length);
        emitter.emit("data", JSON.stringify({ type: "sources", data: lastSources }));
      }

      if (event.event === "on_chain_stream" && event.name === "FinalResponseGenerator") {
        responseChunkCount += 1;
        emitter.emit("data", JSON.stringify({ type: "response", data: event.data.chunk }));
      }

      if (event.event === "on_chain_end" && event.name === "FinalResponseGenerator") {
        chainEnded = true;
        console.log("[handleStream] FinalResponseGenerator ended, chunks:", responseChunkCount);
        if (!emittedSources) {
          lastSources = buildFallbackDocs(query);
          emitter.emit("data", JSON.stringify({ type: "sources", data: lastSources }));
        }

        if (responseChunkCount === 0) {
          const fallbackUrls = (
            lastSources.length > 0
              ? lastSources
                  .map((doc) => doc.metadata?.url)
                  .filter((url): url is string => typeof url === "string")
              : buildFallbackDocs(query).map((doc) => doc.metadata.url)
          ).slice(0, 5);

          const fallbackMessage = [
            "I couldn't generate a full answer, but I ran a web search and found these source URLs:",
            ...fallbackUrls.map((url) => `- ${url}`),
          ].join("\n");

          emitter.emit("data", JSON.stringify({ type: "response", data: fallbackMessage }));
        }

        emitter.emit("end");
      }
    }

    // If the stream completed without firing FinalResponseGenerator's on_chain_end
    // (e.g. the chain errored before reaching the response stage), close the
    // emitter so the HTTP response doesn't hang forever.
    if (!chainEnded) {
      console.error("[handleStream] stream ended without FinalResponseGenerator on_chain_end");
      emitter.emit(
        "error",
        JSON.stringify({ data: "Response chain ended unexpectedly with no answer." }),
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[handleStream] caught error from LangChain stream:", message, err);
    let userMessage = message;
    if (message.includes("410")) {
      userMessage =
        "The selected AI model is no longer available (deprecated by the provider). Please go to Settings → Model Providers and select a different model.";
    } else if (message.includes("401") || message.includes("authentication")) {
      userMessage =
        "Authentication failed with the AI provider. Please check your API key in Settings.";
    } else if (message.includes("429") || message.includes("rate limit")) {
      userMessage =
        "Rate limit reached for the AI provider. Please wait a moment and try again.";
    }
    emitter.emit("error", JSON.stringify({ data: userMessage }));
  }
}
