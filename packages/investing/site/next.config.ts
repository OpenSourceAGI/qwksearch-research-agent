/**
 * @file next.config.ts
 * @description Next.js configuration for the investing docs site on Vercel.
 *
 * `createMDX()` runs fumadocs-mdx at build time: it compiles
 * `content/docs/**` with `source.config.ts` and writes the typed index to
 * `.source/`, which `lib/fumadocs/source.tsx` imports as
 * `fumadocs-mdx:collections/server` (mapped in tsconfig.json).
 *
 * The playground (components/playground) imports a handful of the package's
 * pure, dependency-free source files through the `@investing/*` alias
 * (tsconfig.json → `../src/*`), so the examples run the real code rather than
 * a copy. That is why the Turbopack and file-tracing root is the package
 * directory (`..`) instead of this one: files outside the root cannot be
 * resolved.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMDX } from 'fumadocs-mdx/next';
import type { NextConfig } from 'next';

const siteDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(siteDir, '..');

const config: NextConfig = {
  turbopack: { root: packageDir },
  outputFileTracingRoot: packageDir,
  async rewrites() {
    return [{ source: '/docs/:path*.mdx', destination: '/docs/llms.mdx/docs/:path*' }];
  },
  reactStrictMode: true,
  images: { unoptimized: true },
};

const withMDX = createMDX();

export default withMDX(config);
