/**
 * Runtime env-var accessor for Cloudflare Workers (via vinext).
 * Falls back to `process.env` when running outside a Worker (local dev / CLI).
 */
import { getCloudflareContext } from "vinext";

export function getEnv(key: string): string | undefined {
  try {
    const { env } = getCloudflareContext();
    return (env as unknown as Record<string, string | undefined>)[key];
  } catch {
    // Not in a Cloudflare Worker context (e.g. local dev, CLI)
    return process.env[key];
  }
}
