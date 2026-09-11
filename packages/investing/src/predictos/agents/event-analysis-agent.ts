/**
 * Event analysis agent.
 *
 * Individual analysis agent that takes market data and returns AI analysis.
 * Supports multiple AI providers:
 * - Grok (xAI) - via `xaiApiKey` / `XAI_API_KEY`
 * - OpenAI - via `openaiApiKey` / `OPENAI_API_KEY`
 * - BlockRun - via `blockrunWalletKey` / `BLOCKRUN_WALLET_KEY` (x402 micropayments)
 *
 * Refactored from the PredictOS `event-analysis-agent` Supabase edge function
 * into a plain async function: no HTTP handler, no CORS, typed input/output.
 */

import { analyzeEventMarketsPrompt } from "../ai/prompts/analyzeEventMarkets.js";
import { callGrokResponses } from "../ai/callGrok.js";
import { callOpenAIResponses } from "../ai/callOpenAI.js";
import { callBlockRunResponses, isBlockRunModel } from "../ai/callBlockRun.js";
import type {
  GrokMessage,
  GrokOutputText,
  OpenAIMessage,
  OpenAIOutputText,
  BlockRunMessage,
  BlockRunOutputText,
} from "../ai/types.js";
import type {
  AIConfig,
  EventAnalysisAgentRequest,
  EventAnalysisAgentResult,
  GrokTool,
  MarketAnalysis,
} from "../types.js";

// OpenAI model identifiers
const OPENAI_MODELS = ["gpt-5.2", "gpt-5.1", "gpt-5-nano", "gpt-4.1", "gpt-4.1-mini"];

/** Determine if a model is an OpenAI model. */
function isOpenAIModel(model: string): boolean {
  return OPENAI_MODELS.includes(model) || model.startsWith("gpt-");
}

/**
 * Determine the AI provider for a given model.
 * Priority: BlockRun > OpenAI > Grok (default).
 */
function getAIProvider(model: string): "blockrun" | "openai" | "grok" {
  if (isBlockRunModel(model)) {
    return "blockrun";
  }
  if (isOpenAIModel(model)) {
    return "openai";
  }
  return "grok";
}

/**
 * Run the event analysis agent against a set of markets.
 *
 * @throws Error on invalid input or if the AI response cannot be parsed as JSON.
 */
export async function runEventAnalysisAgent(
  request: EventAnalysisAgentRequest,
  config: AIConfig = {},
): Promise<EventAnalysisAgentResult> {
  const startTime = Date.now();

  const { markets, eventIdentifier, pmType, model, question, tools, userCommand } = request;

  // Validate required parameters
  if (!markets || !Array.isArray(markets) || markets.length === 0) {
    throw new Error("Missing or invalid 'markets' parameter");
  }
  if (!eventIdentifier) {
    throw new Error("Missing required parameter: 'eventIdentifier'");
  }
  if (!pmType || (pmType !== "Kalshi" && pmType !== "Polymarket")) {
    throw new Error("Invalid 'pmType'. Must be 'Kalshi' or 'Polymarket'");
  }
  if (!model) {
    throw new Error("Missing required parameter: 'model'");
  }

  const aiProvider = getAIProvider(model);
  const defaultQuestion =
    "What is the best trading opportunity in this market? Analyze the probability and provide a recommendation.";
  const analysisQuestion = question || defaultQuestion;

  // Build prompt and call AI (pass tools to include source requirements in prompt, and userCommand if provided)
  const { systemPrompt, userPrompt } = analyzeEventMarketsPrompt(
    markets,
    eventIdentifier,
    analysisQuestion,
    pmType,
    tools,
    userCommand,
  );

  let aiResponseModel: string;
  let aiTokensUsed: number | undefined;
  let aiPaymentCost: string | undefined;
  let text: string;

  if (aiProvider === "blockrun") {
    // BlockRun: wallet-based x402 micropayments, no API key required
    const enableSearch = tools?.includes("x_search") || tools?.includes("web_search");
    const blockrunResponse = await callBlockRunResponses(
      userPrompt,
      systemPrompt,
      "json_object",
      model,
      3,
      enableSearch,
      { walletKey: config.blockrunWalletKey },
    );

    aiResponseModel = blockrunResponse.model;
    aiTokensUsed = blockrunResponse.usage?.total_tokens;
    aiPaymentCost = blockrunResponse.blockrun?.paymentCost;

    const content: BlockRunOutputText[] = [];
    for (const item of blockrunResponse.output) {
      if (item.type === "message") {
        const messageItem = item as BlockRunMessage;
        content.push(...messageItem.content);
      }
    }

    text = content
      .map((item) => item.text)
      .filter((t) => t !== undefined)
      .join("\n");
  } else if (aiProvider === "openai") {
    const openaiResponse = await callOpenAIResponses(
      userPrompt,
      systemPrompt,
      "json_object",
      model,
      3,
      { apiKey: config.openaiApiKey },
    );

    aiResponseModel = openaiResponse.model;
    aiTokensUsed = openaiResponse.usage?.total_tokens;

    const content: OpenAIOutputText[] = [];
    for (const item of openaiResponse.output) {
      if (item.type === "message") {
        const messageItem = item as OpenAIMessage;
        content.push(...messageItem.content);
      }
    }

    text = content
      .map((item) => item.text)
      .filter((t) => t !== undefined)
      .join("\n");
  } else {
    const grokResponse = await callGrokResponses(
      userPrompt,
      systemPrompt,
      "json_object",
      model,
      3,
      tools as GrokTool[] | undefined,
      { apiKey: config.xaiApiKey },
    );

    aiResponseModel = grokResponse.model;
    aiTokensUsed = grokResponse.usage?.total_tokens;

    const content: GrokOutputText[] = [];
    for (const item of grokResponse.output) {
      if (item.type === "message") {
        const messageItem = item as GrokMessage;
        content.push(...messageItem.content);
      }
    }

    text = content
      .map((item) => item.text)
      .filter((t) => t !== undefined)
      .join("\n");
  }

  let analysis: MarketAnalysis;
  try {
    analysis = JSON.parse(text);
  } catch {
    throw new Error(
      `Failed to parse AI response as JSON (model ${aiResponseModel}): ${text.substring(0, 200)}`,
    );
  }

  return {
    analysis,
    model: aiResponseModel,
    tokensUsed: aiTokensUsed,
    paymentCost: aiPaymentCost,
    processingTimeMs: Date.now() - startTime,
  };
}
