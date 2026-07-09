/**
 * Runtime env-var accessor.
 * Supports both local development (process.env) and Cloudflare Workers
 * (cloudflare:workers virtual module) via dynamic import.
 */
export function getEnv(key: string): string | undefined {
  // Try Cloudflare Workers context first (production)
  try {
    // @ts-ignore - cloudflare:workers is a virtual module provided by @cloudflare/vite-plugin
    const cfWorkers = require("cloudflare:workers");
    return cfWorkers.env?.[key];
  } catch {
    // Fallback to process.env for local development
    return process.env[key];
  }
}
