/**
 * Cloudflare Worker entry for QwkSearch on the LobeHub foundation.
 *
 * `./cf/globals` MUST stay the first import: it publishes the bindings before
 * LobeHub's module graph creates its database/auth singletons.
 */
import './cf/globals';

import { runWithRequestContext } from './cf/requestContext';
import { isSharedUserMode } from './users/mode';
import { resolveVisitor, withVisitorCookie } from './users/visitor';

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
    // Every browser is its own guest user (`worker/users`), unless the
    // deployment opted back into one shared user.
    const visitor = isSharedUserMode() ? undefined : resolveVisitor(request);

    const response = await runWithRequestContext(
      { executionContext: ctx, request, visitorId: visitor?.visitorId },
      () => Promise.resolve(appInstance.fetch(request)),
    );
    return withVisitorCookie(response, visitor?.setCookie);
  },
};
