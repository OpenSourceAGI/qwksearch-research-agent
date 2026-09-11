/**
 * Polyfactual research agent.
 *
 * Provides deep research capabilities using the Polyfactual API. Returns
 * comprehensive answers with citations for any research query.
 *
 * Refactored from the PredictOS `polyfactual-research` Supabase edge function
 * into a plain async function.
 */

import { generatePolyfactualAnswer } from "../clients/polyfactual.js";

/** Request body for the polyfactual-research agent. */
export interface PolyfactualResearchRequest {
  /** The research query/question */
  query: string;
}

/** Response from the polyfactual-research agent. */
export interface PolyfactualResearchResponse {
  /** Whether the request was successful */
  success: boolean;
  /** The research answer (only present on success) */
  answer?: string;
  /** Citation sources (only present on success) */
  citations?: Array<{
    url?: string;
    title?: string;
    snippet?: string;
  }>;
  /** Raw data from Polyfactual (only present on success) */
  data?: Record<string, unknown>;
  /** Request metadata */
  metadata: {
    /** Unique identifier for this request */
    requestId: string;
    /** ISO timestamp of the response */
    timestamp: string;
    /** Original query */
    query: string;
    /** Total processing time in milliseconds */
    processingTimeMs: number;
  };
  /** Error message (only present on failure) */
  error?: string;
}

/**
 * Run a deep-research query through the Polyfactual API.
 */
export async function runPolyfactualResearch(
  input: PolyfactualResearchRequest,
): Promise<PolyfactualResearchResponse> {
  const startTime = Date.now();

  // Extract and validate query
  const { query } = input;

  if (!query || typeof query !== "string") {
    console.log("Missing or invalid query parameter");
    return {
      success: false,
      error: "Missing required parameter: 'query'",
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        query: "",
        processingTimeMs: Date.now() - startTime,
      },
    };
  }

  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    console.log("Empty query parameter");
    return {
      success: false,
      error: "Query cannot be empty",
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        query: "",
        processingTimeMs: Date.now() - startTime,
      },
    };
  }

  try {
    console.log("Starting Polyfactual research for query:", trimmedQuery.substring(0, 100));

    // Call Polyfactual API
    const polyfactualResponse = await generatePolyfactualAnswer(trimmedQuery, true);

    // Extract answer and citations from response
    const answerData = polyfactualResponse.data;
    const answer = answerData?.answer || JSON.stringify(answerData);
    const citations = answerData?.citations || [];

    // Return success response
    const processingTimeMs = Date.now() - startTime;
    console.log("Request completed in", processingTimeMs, "ms");

    return {
      success: true,
      answer: typeof answer === "string" ? answer : JSON.stringify(answer),
      citations: Array.isArray(citations) ? citations : [],
      data: answerData,
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        query: trimmedQuery,
        processingTimeMs,
      },
    };
  } catch (error) {
    console.error("Error:", error);
    const processingTimeMs = Date.now() - startTime;

    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        query: "",
        processingTimeMs,
      },
    };
  }
}
