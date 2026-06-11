// @ts-expect-error - provided by @cloudflare/vite-plugin at build/runtime
import { env as cloudflareEnv } from "cloudflare:workers";

/**
 * Runtime env-var accessor.
 * Falls back to `process.env` in non-Cloudflare environments.
 */
export function getEnv(key: string): string | undefined {
  try {
    return (cloudflareEnv as unknown as Record<string, string | undefined>)[key];
  } catch {
    return process.env[key];
  }
}
