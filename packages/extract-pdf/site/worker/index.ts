/**
 * The site's Worker: the docs and the live demo on one deploy.
 *
 * Hand-written, not generated: `wrangler.jsonc` names this file as `main`, and
 * `vinext build` bundles it (through `@cloudflare/vite-plugin`) in place of
 * vinext's stock `app-router-entry`.
 *
 * | Path            | Served by                                               |
 * | --------------- | ------------------------------------------------------- |
 * | static files    | Workers Assets, before this Worker runs.                |
 * | `/api/*`        | `handleApi` (`worker/api.ts`): the demo's API.          |
 * | everything else | vinext: the docs, the home page, and `/demo`.           |
 */
import handler from 'vinext/server/app-router-entry';

import { handleApi, type Env } from './api';

interface WorkerEnv extends Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    const api = await handleApi(request, env);
    if (api) return api;
    return handler.fetch(request, env, ctx);
  },
};
