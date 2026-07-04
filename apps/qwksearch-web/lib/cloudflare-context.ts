/**
 * Compatibility shim replacing the former `@opennextjs/cloudflare`
 * `getCloudflareContext()` helper. Under vinext, Worker bindings are exposed
 * through the `cloudflare:workers` virtual module and the per-request
 * `ExecutionContext` through `vinext/shims/request-context`.
 *
 * All call sites wrap this in try/catch and degrade gracefully when the
 * Cloudflare runtime is unavailable (e.g. the Node dev server), so accessing
 * `env` lazily here is safe.
 */

export interface CloudflareContext {
  env: Record<string, any>;
  cf: Record<string, unknown> | undefined;
  ctx: { waitUntil(promise: Promise<unknown>): void } | null;
}

/**
 * Returns the current Cloudflare Worker context (bindings + execution context).
 * In local dev, falls back to process.env. In production Cloudflare Workers with vinext,
 * imports from cloudflare:workers to access D1, KV, and other bindings.
 */
export function getCloudflareContext(): CloudflareContext {
  try {
    // In production, import cloudflare:workers to get actual Worker bindings
    // @ts-ignore - cloudflare:workers is a virtual module provided by @cloudflare/vite-plugin
    const cfWorkers = require("cloudflare:workers");
    return {
      env: cfWorkers.env,
      cf: undefined,
      ctx: null,
    };
  } catch {
    // Fallback for local dev where cloudflare:workers is stubbed
    return {
      env: process.env as Record<string, any>,
      cf: undefined,
      ctx: null,
    };
  }
}
