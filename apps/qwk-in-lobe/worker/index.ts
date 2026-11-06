/**
 * Cloudflare Worker entry for QwkSearch on the LobeHub foundation.
 *
 * `./cf/globals` MUST stay the first import: it publishes the bindings before
 * LobeHub's module graph creates its database/auth singletons.
 */
import './cf/globals';

import { ensureD1Schema } from './cf/d1Schema';
import { ensureKeyVaultsSecret } from './cf/keyVaultsSecret';
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
    // On D1, create any missing tables first: Workers Builds deploys without
    // running `cf:d1:migrate`, and an empty D1 fails every request.
    await ensureD1Schema();
    // Before the app's modules read their config: on D1 with no KEY_VAULTS_SECRET
    // Worker secret, use the one this deployment generated and keeps in D1.
    await ensureKeyVaultsSecret();
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
