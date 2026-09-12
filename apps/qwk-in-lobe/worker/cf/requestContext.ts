/**
 * Per-request context for the Worker.
 *
 * Next.js route handlers in LobeHub reach the current request through
 * `headers()` / `cookies()` from `next/headers` and defer work with `after()`
 * from `next/server`. On Workers we recreate that contract with an
 * AsyncLocalStorage (available under `nodejs_compat`) that the Hono entry
 * populates for every request. The `next/*` shims read from it.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

export interface WorkerRequestContext {
  executionContext?: ExecutionContext;
  request: Request;
}

const storage = new AsyncLocalStorage<WorkerRequestContext>();

export const runWithRequestContext = <T>(context: WorkerRequestContext, fn: () => T): T =>
  storage.run(context, fn);

export const getRequestContext = (): WorkerRequestContext | undefined => storage.getStore();

export const getCurrentRequest = (): Request | undefined => storage.getStore()?.request;

/**
 * Schedule work to continue after the response is sent. Uses
 * `ctx.waitUntil` when a Worker execution context is present, otherwise runs
 * the task immediately (Node dev server / tests).
 */
export const waitUntil = (task: Promise<unknown> | (() => Promise<unknown> | void)) => {
  const promise = typeof task === 'function' ? Promise.resolve().then(task) : task;
  const ctx = storage.getStore()?.executionContext;

  if (ctx) {
    ctx.waitUntil(promise.catch((error) => console.error('[waitUntil] task failed:', error)));
    return;
  }

  void promise.catch((error) => console.error('[after] task failed:', error));
};
