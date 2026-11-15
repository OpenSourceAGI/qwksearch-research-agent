/**
 * Package entry point. Hand-written, not generated, and kept outside `src/`
 * because `openapi-ts` empties `src/` on every `codegen`. `src/index.ts` only
 * carries the generated operations and types, so everything else the package
 * exports is added here.
 *
 * On top of the generated surface this exposes the shared `client` (so callers
 * can point it elsewhere or attach an API key with `client.setConfig`) and the
 * factories for building a separate one.
 */
export * from './src/index';
export { client } from './src/client.gen';
export { createClient, createConfig } from './src/client';
export type { Client, Config, RequestResult } from './src/client';
export { baseUrl, DEFAULT_ORIGIN } from './baseurl';
