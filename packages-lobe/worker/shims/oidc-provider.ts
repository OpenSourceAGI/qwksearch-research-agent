/**
 * `oidc-provider` shim. The Koa-based provider cannot run on Workers; the
 * `/oidc/*` routes answer 501 and browser sign-in uses Better Auth instead.
 */
export default class Provider {
  constructor() {
    throw new Error('[lobehub-workers] oidc-provider is not available on Cloudflare Workers');
  }
}
export const errors = {};
export const interactionPolicy = {
  Check: class Check {},
  Prompt: class Prompt {},
  base: () => [],
};
