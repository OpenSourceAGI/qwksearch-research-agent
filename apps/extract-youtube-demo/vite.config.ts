/**
 * The live demo: a React SPA plus the Worker that serves its API, built as
 * one Cloudflare Worker by `@cloudflare/vite-plugin`.
 *
 * - The SPA (`index.html` → `src/main.tsx`) is written to `dist/client` and
 *   served as static assets.
 * - The Worker (`worker/index.ts`, named in `wrangler.jsonc`) answers
 *   `/api/*`: transcripts and the video library API.
 * - `storybook build` (see `build-storybook` in package.json) writes the
 *   Storybook into `dist/client/storybook`, so the same deploy serves it at
 *   `/storybook/`.
 *
 * In `vite dev` the plugin runs the Worker in workerd next to the dev server,
 * so `/api/*` works locally with no second process.
 */
import { cloudflare } from '@cloudflare/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { dedupe, extractYoutubeAliases } from './aliases.ts';

export default defineConfig({
  plugins: [react(), cloudflare()],
  resolve: { alias: extractYoutubeAliases, dedupe },
});
