/**
 * Runtime env-var accessor.
 * Uses `process.env` for Next.js. In Cloudflare Workers with vinext,
 * this would need to be adapted to use cloudflare:workers.
 */
export function getEnv(key: string): string | undefined {
  return process.env[key];
}
