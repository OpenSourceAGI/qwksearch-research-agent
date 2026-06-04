import { EngineResult } from "../src/engine";

/**
 * Mock HTML response helper
 */
export function createMockHtml(content: string): string {
  return content;
}

/**
 * Mock JSON response helper
 */
export function createMockJson(data: any): any {
  return data;
}

/**
 * Validate engine result structure
 */
export function validateEngineResult(result: EngineResult): boolean {
  return (
    typeof result.title === "string" &&
    result.title.length > 0 &&
    typeof result.content === "string" &&
    (result.url === undefined || typeof result.url === "string") &&
    (result.link === undefined || typeof result.link === "string") &&
    (result.thumbnail === undefined || typeof result.thumbnail === "string") &&
    (result.engine === undefined || typeof result.engine === "string")
  );
}

/**
 * Validate all results in an array
 */
export function validateEngineResults(results: EngineResult[]): boolean {
  if (!Array.isArray(results)) {
    return false;
  }
  return results.every(validateEngineResult);
}

/**
 * Common test queries for different categories
 */
export const TEST_QUERIES = {
  general: ["javascript", "python", "linux", "machine learning"],
  code: ["react hooks", "typescript generics", "nodejs express"],
  torrent: ["ubuntu", "debian", "linux mint"],
  anime: ["one piece", "naruto", "attack on titan"],
  movies: ["inception", "interstellar", "the matrix"],
  tv: ["breaking bad", "game of thrones", "the office"],
  music: ["lofi hip hop", "jazz", "classical music"],
  social: ["javascript news", "tech trends", "programming"],
  academic: ["quantum computing", "neural networks", "cryptography"],
};

/**
 * Wait helper for rate limiting
 */
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry helper for flaky network requests
 */
export async function retry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    await wait(delay);
    return retry(fn, retries - 1, delay * 2);
  }
}
