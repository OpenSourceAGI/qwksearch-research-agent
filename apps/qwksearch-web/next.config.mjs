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
  transpilePackages: ["legal-terms-privacy-policy", "quantum-sphere-loading-icon", "shadcn-theme-menu", "chat-agent-toolkit", "extract-webpage", "search-web-api", "qwksearch-help-docs"],

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
      // `api2client` (under qwksearch-api-client's dist) imports Node builtins
      // for its CLI code generator; in a client chunk they fail every route.
      // See `lib/stubs/node-builtins-browser.mjs`. Server code keeps the real ones.
      "node:child_process": { browser: "./lib/stubs/node-builtins-browser.mjs" },
      "node:fs": { browser: "./lib/stubs/node-builtins-browser.mjs" },
      "node:module": { browser: "./lib/stubs/node-builtins-browser.mjs" },
      "node:path": { browser: "./lib/stubs/node-builtins-browser.mjs" },
      "node:url": { browser: "./lib/stubs/node-builtins-browser.mjs" },
    },
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-API-Key, x-api-key, X-Requested-With, Accept, Origin" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer-when-downgrade" },
          // Allow any origin to embed this app in an iframe
          { key: "Content-Security-Policy", value: "frame-ancestors *;" },
        ],
      },
      {
        // Files from a user's Google Drive, served from this origin for the
        // PDF and image viewers. Must come after the rule above: for the same
        // key the last matching rule wins, and without `sandbox` an HTML or
        // SVG file opened directly from here would run script as this site.
        source: "/api/doc/google-docs/content",
        headers: [{ key: "Content-Security-Policy", value: "sandbox; frame-ancestors *;" }],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
