/**
 * @file vite.config.ts
 * @description Build for the extract-youtube docs: Next.js App Router source,
 * compiled by vinext (Vite) into a Cloudflare Worker.
 *
 * Why each plugin is here:
 *
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
 *   built output. It is left out of `vinext dev` — same split as
 *   apps/qwksearch-web — because under it the first cold request races Vite's
 *   dependency re-optimisation and 500s with "Cannot read properties of null
 *   (reading 'useMemo')" (two React copies). `bun run preview` is the
 *   workerd-faithful check.
 */
import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import mdx from 'fumadocs-mdx/vite';
import vinext from 'vinext';
import { defineConfig } from 'vite';
import * as MdxConfig from './source.config.ts';

export default defineConfig(({ command }) => ({
  plugins: [
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
}));
