/**
 * @file next.config.ts
 * @description Next.js configuration for the Vercel deployment: the docs
 * (`/docs`), the live demo (`/demo`) and the prebuilt Storybook
 * (`public/storybook`, served at `/storybook/`) in one app.
 *
 * `createMDX()` runs fumadocs-mdx at build time: it compiles
 * `content/docs/**` with `source.config.ts` and writes the typed index to
 * `.source/`, which `lib/fumadocs/source.tsx` imports as
 * `fumadocs-mdx:collections/server` (mapped in tsconfig.json).
 */
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMDX } from 'fumadocs-mdx/next';
import type { NextConfig } from 'next';

const root = dirname(fileURLToPath(import.meta.url));

const config: NextConfig = {
  // The repository root carries its own bun.lock; without this Next guesses
  // the monorepo root as the workspace and traces files from there.
  turbopack: { root },
  outputFileTracingRoot: root,
  async rewrites() {
    return [{ source: '/docs/:path*.mdx', destination: '/docs/llms.mdx/docs/:path*' }];
  },
  async redirects() {
    // Storybook's static build is a plain index.html with relative asset
    // paths; Next does not serve a directory index from `public/`.
    return [
      { source: '/storybook', destination: '/storybook/index.html', permanent: false },
      { source: '/storybook/', destination: '/storybook/index.html', permanent: false },
    ];
  },
  reactStrictMode: true,
  images: { unoptimized: true },
};

const withMDX = createMDX();

export default withMDX(config);
