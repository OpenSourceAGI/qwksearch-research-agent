/**
 * @file vite.config.ts
 * @description Build for the extract-youtube site: the docs (Next.js App
 * Router source, compiled by vinext) and the live demo, as one Cloudflare
 * Worker.
 *
 * Why each plugin is here:
 *
 * - `demoApiInDev()` (dev only) answers the demo's `/api/*` routes from
 *   `worker/api.ts` inside the Vite dev server, because `vinext dev` runs the
 *   App Router in Node and never loads `worker/index.ts`. The built Worker
 *   serves the same routes from `worker/index.ts`.
 * - `fumadocs-mdx/vite` compiles `content/docs/**` MDX into ordinary JS
 *   modules at BUILD time and generates `.source/` (the typed collection
 *   index imported as `fumadocs-mdx:collections/server`). Nothing compiles
 *   MDX per request, which matters on Workers: request-time MDX compilers
 *   evaluate their output with `new Function`, and workerd refuses that
 *   ("EvalError: Code generation from strings disallowed").
 *   Its generated imports carry a `?collection=` query, which is what keeps
 *   vinext's own on-demand MDX plugin (it skips any id with a query) from
 *   compiling the same files a second time.
 * - `@tailwindcss/vite` builds `app/globals.css`. See the `@source` lines
 *   there for why `fumadocs-ui/dist` is scanned explicitly.
 * - `vinext()` provides the App Router (it registers `@vitejs/plugin-rsc`
 *   itself, so do not add `rsc()` here).
 * - `@cloudflare/vite-plugin` (build only) runs the rsc/ssr environments in
 *   workerd and writes the deployable Worker to `dist/server` (static assets
 *   to `dist/client`) plus a `.wrangler/deploy/config.json` redirect, so a
 *   bare `wrangler deploy` / `wrangler dev` after `vinext build` picks up the
 *   built output. Its entry is `worker/index.ts` (see `main` in
 *   wrangler.jsonc), which puts the demo's API in front of vinext. It is left
 *   out of `vinext dev` — same split as apps/qwksearch-web — because under it
 *   the first cold request races Vite's dependency re-optimisation and 500s
 *   with "Cannot read properties of null (reading 'useMemo')" (two React
 *   copies). `bun run preview` is the workerd-faithful check.
 *
 * `extract-youtube` resolves to the package's own TypeScript source (see
 * `aliases.ts`), so the demo always shows the code in `../src`, with no
 * package build first.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import mdx from 'fumadocs-mdx/vite';
import vinext from 'vinext';
import { defineConfig, type Plugin, type ViteDevServer } from 'vite';
import { dedupe, extractYoutubeAliases } from './aliases.ts';
import * as MdxConfig from './source.config.ts';

export default defineConfig(({ command }) => ({
  plugins: [
    ...(command === 'serve' ? [demoApiInDev()] : []),
    mdx(MdxConfig),
    tailwindcss(),
    vinext(),
    ...(command === 'serve'
      ? []
      : [
          cloudflare({
            viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
            configPath: './wrangler.jsonc',
          }),
        ]),
  ],
  resolve: { alias: extractYoutubeAliases, dedupe },
}));

/**
 * Serves `/api/*` from `worker/api.ts` under `vinext dev`. Bindings come from
 * the shell: `ADMIN_TOKEN=… YOUTUBE_API_KEY=… bun run dev`. There is no D1 in
 * dev, so the library is the in-memory sandbox (or token mode).
 */
function demoApiInDev(): Plugin {
  // One object for the server's life: `worker/api.ts` keeps its library per
  // `env` identity, so a fresh object per request would reseed it every time.
  const env = {
    ADMIN_TOKEN: process.env.ADMIN_TOKEN || undefined,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || undefined,
  };
  return {
    name: 'extract-youtube-site:demo-api-in-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        serveApi(server, env, req, res).then((handled) => {
          if (!handled) next();
        }, next);
      });
    },
  };
}

async function serveApi(
  server: ViteDevServer,
  env: Record<string, string | undefined>,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const { handleApi } = (await server.ssrLoadModule('/worker/api.ts')) as typeof import('./worker/api.ts');
  const chunks: Buffer[] = [];
  if (req.method !== 'GET' && req.method !== 'HEAD') for await (const chunk of req) chunks.push(chunk as Buffer);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value);
    else if (Array.isArray(value)) for (const item of value) headers.append(key, item);
  }
  const request = new Request(new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`), {
    method: req.method,
    headers,
    body: chunks.length ? Buffer.concat(chunks) : undefined,
  });
  const response = await handleApi(request, env);
  if (!response) return false;
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
  return true;
}
