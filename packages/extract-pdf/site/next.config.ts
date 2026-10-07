/**
 * @file next.config.ts
 * @description Next.js configuration for Vercel deployment (demo only).
 * Only builds the demo page and API routes.
 */
import type { NextConfig } from 'next';

const config: NextConfig = {
  async rewrites() {
    return [
      {
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