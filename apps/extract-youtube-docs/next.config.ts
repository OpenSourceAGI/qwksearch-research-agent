/**
 * @file next.config.ts
 * @description Read by vinext (not by `next build` — this app never runs the
 * Next.js compiler). MDX is compiled by `fumadocs-mdx/vite` in vite.config.ts,
 * so there is no `createMDX()` wrapper here.
 */
import type { NextConfig } from 'next';

const config: NextConfig = {
  async rewrites() {
    return [
      {
        // `/docs/transcripts.mdx` → the plain-text Markdown of that page, for
        // the "Copy" / "Ask AI" buttons and for LLM crawlers.
        source: '/docs/:path*.mdx',
        destination: '/docs/llms.mdx/docs/:path*',
      },
    ];
  },
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
};

export default config;
