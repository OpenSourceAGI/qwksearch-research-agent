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
// @ts-expect-error - provided by @cloudflare/vite-plugin at build/runtime
import { env as cloudflareEnv } from "cloudflare:workers";
import { getRequestExecutionContext } from "vinext/shims/request-context";

export interface CloudflareContext {
  env: Record<string, any>;
  cf: Record<string, unknown> | undefined;
  ctx: { waitUntil(promise: Promise<unknown>): void } | null;
}

/**
 * Returns the current Cloudflare Worker context (bindings + execution context).
 */
export function getCloudflareContext(): CloudflareContext {
  return {
    env: cloudflareEnv as Record<string, any>,
    cf: undefined,
    ctx: getRequestExecutionContext(),
  };
}
