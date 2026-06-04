// @ts-nocheck
/**
 * @fileoverview Provider factory for instantiating LangChain chat-model instances.
 * Supports OpenAI, Anthropic, Groq, Google, and more.
 */
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGroq } from "@langchain/groq";
// import { ChatPerplexity } from "@langchain/community/chat_models/perplexity";
import { ChatCloudflareWorkersAI } from "@langchain/cloudflare";
import { ChatOllama } from "@langchain/ollama";
import { ChatXAI } from "@langchain/xai";
import { ChatVertexAI } from "@langchain/google-vertexai-web";

/**
 * Instantiates the appropriate LangChain chat-model for the given provider.
 *
 * @param provider    - Normalised (lowercase) provider name
 * @param apiKey      - Provider API key (not required for `ollama`)
 * @param model       - Model ID to use
 * @param temperature - Sampling temperature
 * @returns A LangChain chat-model instance, or `null` for an unrecognised provider
 */
export function createLLMProvider(
  provider: string,
  apiKey: string,
  model: string,
  temperature: number,
) {
  switch (provider) {
    case "groq":
      return new ChatGroq({ apiKey, model, temperature });

    case "togetherai":
      return new ChatOpenAI({
        apiKey,
        model,
        temperature,
        configuration: { baseURL: "https://api.together.xyz/v1" },
      });

    case "openai":
      return new ChatOpenAI({ openAIApiKey: apiKey, model, temperature });

    case "anthropic":
      return new ChatAnthropic({ anthropicApiKey: apiKey, model, temperature });

    case "xai":
      return new ChatXAI({ apiKey, model, temperature });

    case "google":
      return new ChatVertexAI({ apiKey, model, temperature });

    // case "perplexity":
    //   return new ChatPerplexity({ apiKey, model, temperature });

    case "cloudflare": {
      const [cloudflareApiToken, cloudflareAccountId] = apiKey.split(":");
      return new ChatCloudflareWorkersAI({
        cloudflareApiToken,
        cloudflareAccountId,
        model,
      });
    }

    case "ollama":
      return new ChatOllama({ model, temperature });

    case "nvidia":
      return new ChatOpenAI({
        apiKey,
        model,
        configuration: { baseURL: "https://integrate.api.nvidia.com/v1" },
      });

    case "openrouter":
      return new ChatOpenAI({
        apiKey,
        model,
        temperature,
        configuration: { baseURL: "https://openrouter.ai/api/v1" },
      });

    default:
      return null;
  }
}
