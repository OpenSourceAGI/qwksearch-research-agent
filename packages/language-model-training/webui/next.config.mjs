/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // For Cloudflare Workers compatibility
  experimental: {
    isrMemoryCacheSize: 0,
  },
  // Disable image optimization for Workers
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
