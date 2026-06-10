import { env as cfEnv } from "cloudflare:workers";

export function getEnv(key: string): string | undefined {
  try {
    return (cfEnv as Record<string, string | undefined>)[key] ?? process.env[key];
  } catch {
    return process.env[key];
  }
}
