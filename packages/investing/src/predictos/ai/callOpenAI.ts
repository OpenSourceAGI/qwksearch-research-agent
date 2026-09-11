import type { OpenAIRequestPayload, OpenAIResponseResult } from "./types.js";
import { fetchWithTimeout, isRetryableError, sleep } from "./http.js";

/** Options for {@link callOpenAIResponses}. */
export interface OpenAICallOptions {
  /** API key; falls back to `process.env.OPENAI_API_KEY`. */
  apiKey?: string;
}

/**
 * Call OpenAI API with the Responses API.
 *
 * @param message User message to send
 * @param systemPrompt System prompt for the AI
 * @param responseFormat Response format type (e.g., "json_object")
 * @param model OpenAI model to use
 * @param maxRetries Maximum number of retries on failure
 * @param options Optional API key (falls back to `OPENAI_API_KEY`)
 * @returns OpenAI response result
 */
export async function callOpenAIResponses(
  message: string,
  systemPrompt: string,
  responseFormat: string,
  model: string = "gpt-4.1",
  maxRetries: number = 3,
  options: OpenAICallOptions = {},
): Promise<OpenAIResponseResult> {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  const payload: OpenAIRequestPayload = {
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
    text: {
      format: {
        type: responseFormat,
      },
    },
  };

  let lastError: Error | null = null;

  // Retry logic with exponential backoff
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(
        "https://api.openai.com/v1/responses",
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
          `OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`,
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
            `OpenAI API error (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${backoffMs}ms...`,
          );
          await sleep(backoffMs);
          continue;
        }
        throw error;
      }

      const rawResponse = (await response.json()) as OpenAIResponseResult;
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
