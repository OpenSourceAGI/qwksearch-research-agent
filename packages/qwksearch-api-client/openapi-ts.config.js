import { defineConfig } from '@hey-api/openapi-ts';

export const baseUrl = process.env.API_URL || 'https://qwksearch.com/api';

/**
 * Generation is two steps, both wired into `bun run codegen`:
 *
 *   1. `openapi-ts` writes the SDK against `@hey-api/client-fetch`, which is
 *      the only part of this config. That emits a bundled client under
 *      `src/client/`.
 *   2. `api2client --rewire-only ./src` replaces that bundled client with a
 *      one-line re-export of api2client's, so every generated operation sends
 *      its request through grab and inherits caching, retries, rate limiting,
 *      dedupe and `grab.mock` — see GRAB-URL/packages/api2client.
 *
 * Step 2 only rewrites `src/client/client.gen.ts`; everything else here is
 * ordinary Hey API output. Running `openapi-ts` on its own leaves the fetch
 * client in place, so always go through `codegen` (or `build:api`).
 */
export const config = {
  input: './qwksearch-openapi.json',
  output: './src',
  plugins: [
    {
      name: '@hey-api/client-fetch',
      runtimeConfigPath: '../baseurl.ts',
    },
  ],
};

export default defineConfig(config);
