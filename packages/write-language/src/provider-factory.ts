/**
 * @fileoverview Provider factory for Vercel AI SDK v5 language model instances.
 * Supports OpenAI, Anthropic, Groq, Google, xAI, Amazon Bedrock, OpenRouter, and OpenAI-compatible endpoints.
 */
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGroq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createVertex } from "@ai-sdk/google-vertex";
import { createXai } from "@ai-sdk/xai";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

/**
 * Instantiates the appropriate Vercel AI SDK language model for the given provider.
 *
 * @param provider    - Normalised (lowercase) provider name
 * @param apiKey      - Provider API key
 * @param model       - Model ID to use
 * @param _temperature - Unused here; temperature is passed to generateText at call time
 * @returns A LanguageModel instance, or `null` for an unrecognised provider
 */
export function createLLMProvider(
  provider: string,
  apiKey: string,
  model: string,
  _temperature: number,
): LanguageModel | null {
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

    case "nvidia":
      return createOpenAI({
        apiKey,
        baseURL: "https://integrate.api.nvidia.com/v1",
      })(model);

    case "openrouter":
      return createOpenRouter({ apiKey }).chat(model);

    case "anyapi":
      return createOpenAI({
        apiKey,
        baseURL: "https://api.anyapi.ai/v1",
      })(model);

    case "perplexity":
      return createOpenAI({
        apiKey,
        baseURL: "https://api.perplexity.ai",
      })(model);

    case "amazon":
    case "bedrock": {
      // Support both AWS_aBEARER_TOKEN_BEDROCK and AWS credential chain
      // apiKey can be either the bearer token or "region:accessKey:secretKey"
      const parts = apiKey.split(":");
        // Format: region:accessKeyId:secretAccessKey
        const [region, accessKeyId, secretAccessKey] = parts;
        return createAmazonBedrock({
          region,
          accessKeyId,
          secretAccessKey,
        })(model);
    
    }

    default:
      return null;
  }
}
