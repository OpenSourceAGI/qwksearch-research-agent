import { fileURLToPath } from 'node:url';
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

// The model tables import the package's registry from ../src, so the build
// root is the write-language package rather than this docs folder.
const packageRoot = fileURLToPath(new URL('..', import.meta.url));

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  turbopack: { root: packageRoot },
  outputFileTracingRoot: packageRoot,
};

export default withMDX(config);
