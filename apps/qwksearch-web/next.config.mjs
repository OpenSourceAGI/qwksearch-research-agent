import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import bundleAnalyzer from "@next/bundle-analyzer";
import path from "path";
import { fileURLToPath } from "url";

if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
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
    "kysely",
    "@better-auth/kysely-adapter",
    "better-auth",
    "better-auth-cloudflare",
    // Client-only packages — never run server-side
    "prettier",
    "@huggingface/transformers",
    "onnxruntime-web",
  ],
  transpilePackages: ["quantum-sphere-loading-icon", "shadcn-theme-menu"],

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      // Stub missing optional dependency of resend package
      "@react-email/render": path.resolve(
        __dirname,
        "lib/stubs/react-email-render.js",
      ),
      // Force a single lucide-react copy across the monorepo.
      // This prevents SWC's optimizePackageImports from picking mismatched
      // metadata across nested node_modules, which can break deep imports.
      "lucide-react": path.resolve(__dirname, "node_modules/lucide-react"),
    };

      // Prefer root node_modules over nested node_modules
    config.resolve.modules = [
      path.resolve(__dirname, "../../node_modules"),
      path.resolve(__dirname, "node_modules"),
      "node_modules",
    ];
    return config;
  },

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
