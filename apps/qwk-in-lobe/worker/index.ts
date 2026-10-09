/**
 * Cloudflare Worker entry for QwkSearch on the LobeHub foundation.
 *
 * `./cf/globals` MUST stay the first import: it publishes the bindings before
 * LobeHub's module graph creates its database/auth singletons.
 */
import './cf/globals';

import { runWithRequestContext } from './cf/requestContext';

let appPromise: Promise<ReturnType<typeof import('./app').createApp>> | undefined;

const getApp = () => {
  if (!appPromise) {
    appPromise = import('./app').then((m) => m.createApp());
  }
  return appPromise;
};

export default {
  async fetch(request: Request, _env: unknown, ctx: ExecutionContext): Promise<Response> {
    const appInstance = await getApp();
    return runWithRequestContext({ executionContext: ctx, request }, () =>
      Promise.resolve(appInstance.fetch(request)),
    );
  },
};
