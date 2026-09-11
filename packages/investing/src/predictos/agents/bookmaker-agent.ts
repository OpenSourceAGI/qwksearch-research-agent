/**
 * Bookmaker (aggregator) agent.
 *
 * Aggregates multiple agent analyses (and optional external PayAI/x402 data
 * sources) into a single consolidated assessment. Acts as a "judge" that
 * weighs different agent opinions.
 *
 * Refactored from the PredictOS `bookmaker-agent` Supabase edge function into
 * a plain async function.
 */

import { bookmakerAnalysisPrompt } from "../ai/prompts/bookmakerAnalysis.js";
import { callGrokResponses } from "../ai/callGrok.js";
import { callOpenAIResponses } from "../ai/callOpenAI.js";
import type {
  GrokMessage,
  GrokOutputText,
  OpenAIMessage,
  OpenAIOutputText,
} from "../ai/types.js";
import type {
  AIConfig,
  AggregatedAnalysis,
  BookmakerAgentRequest,
  BookmakerAgentResult,
} from "../types.js";

// OpenAI model identifiers
const OPENAI_MODELS = ["gpt-5.2", "gpt-5.1", "gpt-5-nano", "gpt-4.1", "gpt-4.1-mini"];

/** Determine if a model is an OpenAI model. */
function isOpenAIModel(model: string): boolean {
  return OPENAI_MODELS.includes(model) || model.startsWith("gpt-");
}

/**
 * Run the bookmaker (aggregator) agent.
 *
 * @throws Error on invalid input or if the AI response cannot be parsed as JSON.
 */
export async function runBookmakerAgent(
  request: BookmakerAgentRequest,
  config: AIConfig = {},
): Promise<BookmakerAgentResult> {
  const startTime = Date.now();

  const { analyses, x402Results, eventIdentifier, pmType, model } = request;

  // Validate required parameters
  const hasAnalyses = analyses && Array.isArray(analyses) && analyses.length > 0;
  const hasX402Results = x402Results && Array.isArray(x402Results) && x402Results.length > 0;

  if (!hasAnalyses && !hasX402Results) {
    throw new Error("Missing or invalid 'analyses' or 'x402Results' parameter");
  }

  const totalResults = (analyses?.length || 0) + (x402Results?.length || 0);
  if (totalResults < 2) {
    throw new Error("Need at least 2 data sources (analyses + PayAI results) to aggregate");
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

  const useOpenAI = isOpenAIModel(model);

  const agentAnalyses = (analyses || []).map((a) => ({
    agentId: a.agentId,
    model: a.model,
    analysis: a.analysis,
  }));

  const { systemPrompt, userPrompt } = bookmakerAnalysisPrompt(
    agentAnalyses,
    x402Results || [],
    eventIdentifier,
    pmType,
  );

  let aiResponseModel: string;
  let aiTokensUsed: number | undefined;
  let text: string;

  if (useOpenAI) {
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
      undefined,
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

  let analysis: AggregatedAnalysis;
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
    agentsAggregated: totalResults,
    processingTimeMs: Date.now() - startTime,
  };
}
