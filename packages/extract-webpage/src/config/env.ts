import { getCloudflareContext } from "vinext";

/**
 * Runtime env-var accessor.
 * Falls back to `process.env` in non-Cloudflare environments.
 */
export function getEnv(key: string): string | undefined {
  try {
    const { env } = getCloudflareContext();
    return (env as unknown as Record<string, string | undefined>)[key];
  } catch {
    return process.env[key];
  }
}
