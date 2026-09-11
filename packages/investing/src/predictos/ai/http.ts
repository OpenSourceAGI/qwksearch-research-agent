/**
 * Shared HTTP helpers used by the AI provider clients: retry classification,
 * sleep, and a fetch wrapper with a timeout.
 *
 * Uses the global `fetch`/`AbortController` available in Node 18+.
 */

/**
 * Check if an error is retryable (network errors, timeouts, etc.)
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("connection") ||
      message.includes("tls") ||
      message.includes("timeout") ||
      message.includes("eof") ||
      message.includes("network") ||
      message.includes("fetch failed")
    );
  }
  return false;
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make a fetch request with a timeout.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 120000, // 2 minutes default timeout
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}
