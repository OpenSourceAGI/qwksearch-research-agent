import type { GrokRequestPayload, GrokResponseResult } from "./types.js";
import { fetchWithTimeout, isRetryableError, sleep } from "./http.js";

/** Tool types available for Grok models */
export type GrokToolType = "x_search" | "web_search";

/** Options for {@link callGrokResponses}. */
export interface GrokCallOptions {
  /** API key; falls back to `process.env.XAI_API_KEY`. */
  apiKey?: string;
}

/**
 * Call Grok AI with the Responses API.
 *
 * @param message User message to send
 * @param systemPrompt System prompt for the AI
 * @param responseFormat Response format type (e.g., "json_object")
 * @param model Grok model to use
 * @param maxRetries Maximum number of retries on failure
 * @param tools Optional array of tools to enable (x_search, web_search)
 * @param options Optional API key (falls back to `XAI_API_KEY`)
 * @returns Grok response result
 */
export async function callGrokResponses(
  message: string,
  systemPrompt: string,
  responseFormat: string,
  model: string = "grok-4-1-fast-reasoning",
  maxRetries: number = 3,
  tools?: GrokToolType[],
  options: GrokCallOptions = {},
): Promise<GrokResponseResult> {
  const apiKey = options.apiKey ?? process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error("XAI_API_KEY environment variable is not set");
  }

  const payload: GrokRequestPayload = {
    model,
    input: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: message,
      },
    ],
    ...(tools && tools.length > 0 && {
      tools: tools.map((tool) => ({ type: tool })),
    }),
    response_format: {
      type: responseFormat,
    },
  };

  let lastError: Error | null = null;

  // Retry logic with exponential backoff
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(
        "https://api.x.ai/v1/responses",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        },
        120000, // 2 minute timeout
      );

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(
          `Grok API error: ${response.status} ${response.statusText} - ${errorText}`,
        );

        // Don't retry on client errors (4xx) except for 429 (rate limit)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw error;
        }

        // Retry on server errors (5xx) and rate limits (429)
        lastError = error;
        if (attempt < maxRetries) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 seconds
          console.warn(
            `Grok API error (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${backoffMs}ms...`,
          );
          await sleep(backoffMs);
          continue;
        }
        throw error;
      }

      const rawResponse = (await response.json()) as GrokResponseResult;
      return rawResponse;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If it's not a retryable error, throw immediately
      if (!isRetryableError(error) && attempt === 0) {
        throw lastError;
      }

      // If we've exhausted retries, throw the last error
      if (attempt >= maxRetries) {
        throw lastError;
      }

      // Exponential backoff: 1s, 2s, 4s, etc., max 10s
      const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
      console.warn(
        `Network error (attempt ${attempt + 1}/${maxRetries + 1}): ${lastError.message}. Retrying in ${backoffMs}ms...`,
      );
      await sleep(backoffMs);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error("Unknown error occurred");
}
