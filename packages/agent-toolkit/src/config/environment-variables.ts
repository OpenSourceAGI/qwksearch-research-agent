import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Runtime env-var accessor.
 * Falls back to `process.env` in non-Cloudflare environments.
 */
export function getEnv(key: string): string | undefined {
  try {
    const { env } = getCloudflareContext();
    return (env as Record<string, string | undefined>)[key];
  } catch {
    return process.env[key];
  }
}
