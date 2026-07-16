import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Library build: emits ESM + CJS. Type declarations are produced separately by
// `tsc --project tsconfig.build.json` (see package.json build script).
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Inline the (small) bundled icon assets as data URIs so the package has
    // no separate static files the consuming app needs to serve.
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    lib: {
      entry: {
        index: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
        config: fileURLToPath(new URL("./src/config.ts", import.meta.url)),
        api: fileURLToPath(new URL("./src/api/index.ts", import.meta.url)),
      },
      name: "ResearchAgentUI",
      formats: ["es", "cjs"],
      fileName: (format, entryName) =>
        `${entryName}.${format === "es" ? "mjs" : "cjs"}`,
    },
    rollupOptions: {
      // Every bare (non-relative, non-absolute) import is a runtime dependency
      // of the consuming app rather than something we should bundle — this
      // covers react/next as well as the long tail of npm packages the
      // research agent UI depends on (radix, lucide-react, grab-url, etc.).
      external: (id) => !id.startsWith(".") && !id.startsWith("/"),
      output: {
        banner: (chunk) =>
          chunk.name === "index" ? '"use client";' : "",
      },
    },
  },
  plugins: [react()],
});
