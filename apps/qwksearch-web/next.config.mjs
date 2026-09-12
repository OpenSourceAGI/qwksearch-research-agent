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
  transpilePackages: ["legal-terms-privacy-policy", "quantum-sphere-loading-icon", "shadcn-theme-menu", "chat-agent-toolkit", "extract-webpage", "search-web-api", "user-help-docs"],

  turbopack: {
    resolveAlias: {
      // `@moonshine-ai/moonshine-js` (reached from the root layout through
      // `use-voice-control`) contains a pre-bundled onnxruntime-web whose
      // proxy-worker URL is `new URL("ort.bundle.min.mjs", import.meta.url)`.
      // That file is not in the package and the specifier is bare, so
      // Turbopack cannot resolve it and answers the whole route — `/`
      // included — with a 500. See `lib/onnx/ort-bundle-stub.mjs`.
      //
      // Only `next dev` needs this: the deployed build goes through vite,
      // and rolldown leaves an unresolvable `new URL(…, import.meta.url)`
      // alone with a warning instead of failing the module.
      "ort.bundle.min.mjs": "./lib/onnx/ort-bundle-stub.mjs",
      // Same story for the WebAssembly binary: onnxruntime names it relative
      // to its own dist, which moonshine does not ship, and downloads the real
      // one from its CDN at runtime (`ort.env.wasm.wasmPaths`).
      "ort-wasm-simd-threaded.jsep.wasm": "./lib/onnx/ort-wasm-stub.wasm",
    },
  },
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
