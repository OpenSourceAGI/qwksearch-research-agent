/**
 * Cloudflare Worker entry for QwkSearch on the LobeHub foundation.
 *
 * `./cf/globals` MUST stay the first import: it publishes the bindings before
 * LobeHub's module graph creates its database/auth singletons.
 */
import './cf/globals';

import { createApp } from './app';
import { runWithRequestContext } from './cf/requestContext';

const app = createApp();

export default {
  fetch: (request: Request, _env: unknown, ctx: ExecutionContext): Promise<Response> =>
    runWithRequestContext({ executionContext: ctx, request }, () =>
      Promise.resolve(app.fetch(request)),
    ),
};
