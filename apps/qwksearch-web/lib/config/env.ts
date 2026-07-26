export function getEnv(key: string): string | undefined {
  // Always use process.env for Next.js
  // For Cloudflare Workers deployment with vinext, this would need to be adapted
  return process.env[key];
}
