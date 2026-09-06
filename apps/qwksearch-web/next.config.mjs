import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        hostname: "s2.googleusercontent.com",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: [
    "@libsql/isomorphic-ws",
    "better-auth",
    "better-auth-cloudflare",
    // Client-only packages — never run server-side
    "prettier",
    "@huggingface/transformers",
    "onnxruntime-web",
  ],
  transpilePackages: ["quantum-sphere-loading-icon", "shadcn-theme-menu", "chat-agent-toolkit", "extract-webpage", "search-web-api"],

  turbopack: {},
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer-when-downgrade" },
          // Allow any origin to embed this app in an iframe
          { key: "Content-Security-Policy", value: "frame-ancestors *;" },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
