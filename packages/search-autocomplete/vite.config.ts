import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Library build: emits ESM + CJS. Type declarations are produced separately by
// `tsc --project tsconfig.build.json` (see package.json build script).
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    lib: {
      entry: {
        index: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
        // Separate so the ranked-domain dataset never reaches a browser bundle.
        server: fileURLToPath(new URL("./src/server.ts", import.meta.url)),
        react: fileURLToPath(new URL("./src/react/index.ts", import.meta.url)),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) =>
        `${entryName}.${format === "es" ? "mjs" : "cjs"}`,
    },
    rollupOptions: {
      // Every bare import is the consumer's to resolve — react must be one
      // instance, and domain-rank's JSON is left for the app bundler to inline.
      external: (id) =>
        !id.startsWith(".") &&
        !id.startsWith("/") &&
        !/^[A-Za-z]:[/\\]/.test(id),
      output: {
        banner: (chunk) => (chunk.name === "react" ? '"use client";' : ""),
      },
    },
  },
  plugins: [react()],
});
