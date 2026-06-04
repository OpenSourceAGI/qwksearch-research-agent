/**
 * @fileoverview Provider factory for Vercel AI SDK language model instances.
 * Supports OpenAI, Anthropic, Groq, Google, xAI, Ollama, and OpenAI-compatible endpoints.
 */
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGroq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createVertex } from "@ai-sdk/google-vertex";
import { createXai } from "@ai-sdk/xai";
import type { LanguageModelV1 } from "ai";

/**
 * Instantiates the appropriate Vercel AI SDK language model for the given provider.
 *
 * @param provider    - Normalised (lowercase) provider name
 * @param apiKey      - Provider API key (not required for `ollama`)
 * @param model       - Model ID to use
 * @param _temperature - Unused here; temperature is passed to generateText at call time
 * @returns A LanguageModelV1 instance, or `null` for an unrecognised provider
 */
export function createLLMProvider(
  provider: string,
  apiKey: string,
  model: string,
  _temperature: number,
): LanguageModelV1 | null {
  switch (provider) {
    case "groq":
      return createGroq({ apiKey })(model);

    case "togetherai":
      return createOpenAI({
        apiKey,
        baseURL: "https://api.together.xyz/v1",
      })(model);

    case "openai":
      return createOpenAI({ apiKey })(model);

    case "anthropic":
      return createAnthropic({ apiKey })(model);

    case "xai":
      return createXai({ apiKey })(model);

    case "google":
      return createGoogleGenerativeAI({ apiKey })(model);

    case "vertex": {
      const [projectId, location = "us-central1"] = apiKey.split(":");
      return createVertex({ project: projectId, location, googleAuthOptions: {} })(model);
    }

    case "cloudflare": {
      const [cfApiToken, accountId] = apiKey.split(":");
      return createOpenAI({
        apiKey: cfApiToken,
        baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`,
      })(model);
    }

    case "ollama":
      return createOpenAI({
        apiKey: "ollama",
        baseURL: "http://localhost:11434/v1",
      })(model);

    case "nvidia":
      return createOpenAI({
        apiKey,
        baseURL: "https://integrate.api.nvidia.com/v1",
      })(model);

    case "openrouter":
      return createOpenAI({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
      })(model);

    case "perplexity":
      return createOpenAI({
        apiKey,
        baseURL: "https://api.perplexity.ai",
      })(model);

    default:
      return null;
  }
}
