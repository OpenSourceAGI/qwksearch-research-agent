/**
 * @file vite.config.ts
 * @description Build for the extract-pdf + extract-webpage site: the docs
 * (Next.js App Router source, compiled by vinext) and the live demo, as one
 * Cloudflare Worker. Same layout as packages/extract-youtube/site.
 *
 * Why each plugin is here:
 *
 * - `demoApiInDev()` (dev only) answers the demo's `/api/*` routes from
 *   `worker/api.ts` inside the Vite dev server, because `vinext dev` runs the
 *   App Router in Node and never loads `worker/index.ts`. The built Worker
 *   serves the same routes from `worker/index.ts`.
 * - `fumadocs-mdx/vite` compiles `content/docs/**` MDX into ordinary JS
 *   modules at BUILD time and generates `.source/`. Nothing compiles MDX per
 *   request: workerd refuses `new Function` ("EvalError: Code generation from
 *   strings disallowed").
 * - `@tailwindcss/vite` builds `app/globals.css` (see its `@source` lines).
 * - `vinext()` provides the App Router (it registers `@vitejs/plugin-rsc`
 *   itself, so do not add `rsc()` here).
 * - `@cloudflare/vite-plugin` (build only) runs the rsc/ssr environments in
 *   workerd and writes the deployable Worker to `dist/server` (static assets
 *   to `dist/client`) plus a `.wrangler/deploy/config.json` redirect, so a
 *   bare `wrangler deploy` / `wrangler dev` after `vinext build` picks up the
 *   built output. Its entry is `worker/index.ts` (see `main` in
 *   wrangler.jsonc). It is left out of `vinext dev`, as in the other vinext
 *   apps here, because under it the first cold request races Vite's
 *   dependency re-optimisation and 500s with two React copies. `bun run
 *   preview` is the workerd-faithful check.
 *
 * `aliases.ts` points the three extract-* packages at their source and stubs
 * extract-pdf's Node-only engines.
 */
import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import mdx from 'fumadocs-mdx/vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import vinext from 'vinext';
import { createServer, defineConfig, type Plugin, type ViteDevServer } from 'vite';
import { aliases, dedupe } from './aliases.ts';
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
  resolve: { alias: aliases, dedupe },
}));

/**
 * Serves `/api/*` from `worker/api.ts` under `vinext dev`. Variables and
 * secrets come from the shell, e.g.
 * `DOCLING_PROCESSOR_URL=http://127.0.0.1:7860 DOCLING_API_TOKEN=… bun run dev`.
 *
 * `worker/api.ts` loads in its own plain Vite server (no plugins, same
 * aliases), not the dev server's SSR environment: vinext bundles every
 * server dependency there, which chokes on linkedom's CommonJS cssom and
 * stalls on extract-webpage's 1 MB name list. The plain server leaves
 * `node_modules` to Node.
 */
function demoApiInDev(): Plugin {
  const names = [
    'MAX_PDF_MB',
    'MAX_HTML_MB',
    'DOCLING_PROCESSOR_URL',
    'DOCLING_API_TOKEN',
    'HF_SPACE_TOKEN',
    'DOCLING_MAX_PAGES',
    'DOCLING_MAX_TOKENS',
    'DOCLING_MAX_IMAGE_MB',
  ];
  const env = Object.fromEntries(names.map((name) => [name, process.env[name] || undefined]));
  return {
    name: 'extract-pdf-site:demo-api-in-dev',
    apply: 'serve',
    configureServer(server) {
      let api: Promise<ViteDevServer> | undefined;
      const apiServer = () =>
        (api ??= createServer({
          configFile: false,
          root: server.config.root,
          logLevel: 'error',
          appType: 'custom',
          server: { middlewareMode: true, hmr: false, ws: false },
          resolve: { alias: aliases },
        }));
      server.httpServer?.once('close', () => void api?.then((s) => s.close()));
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        apiServer()
          .then((apiVite) => serveApi(apiVite, env, req, res))
          .then((handled) => {
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
