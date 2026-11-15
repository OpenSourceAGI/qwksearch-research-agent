import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMDX } from 'fumadocs-mdx/next';
import type { NextConfig } from 'next';

// Monorepo root: bun hoists `next` (and the workspace `domain-rank` package)
// into the repo-root node_modules, so Turbopack must resolve from there or the
// Vercel build fails with "Could not find the Next.js package".
const siteDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(siteDir, '../../..');

// domain-rank's favicon helper imports `fs`; the demo only uses the lookup
// functions, so give browser bundles an empty stand-in instead of failing.
const emptyModule = './lib/empty-module.ts';

const config: NextConfig = {
  turbopack: {
    root,
    resolveAlias: { fs: { browser: emptyModule } },
  },
  outputFileTracingRoot: root,
  async rewrites() {
    return [{ source: '/docs/:path*.mdx', destination: '/docs/llms.mdx/docs/:path*' }];
  },
  reactStrictMode: true,
  images: { unoptimized: true },
};

const withMDX = createMDX();

export default withMDX(config);
