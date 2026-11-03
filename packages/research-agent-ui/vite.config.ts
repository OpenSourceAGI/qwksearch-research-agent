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
        // The same app as `index`, plus the REASON editor and its sidebar.
        // A separate entry so importing the root never drags the editor's
        // dependency tree into a chat-only consumer's bundle.
        workspace: fileURLToPath(new URL("./src/workspace.ts", import.meta.url)),
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
      // On Windows, rolldown may pass absolute paths (C:\...) for internal modules,
      // so we also check for drive-letter patterns to avoid externalising them.
      //
      // `search-autocomplete` is the exception: npm refuses that package name
      // (too similar to `search_auto_complete`), so it is not on the registry
      // and is bundled in here instead of being left for consumers to install.
      external: (id) =>
        !id.startsWith(".") &&
        !id.startsWith("/") &&
        !/^[A-Za-z]:[/\\]/.test(id) &&
        id !== "search-autocomplete" &&
        !id.startsWith("search-autocomplete/"),
      output: {
        banner: (chunk) =>
          chunk.name === "index" || chunk.name === "workspace"
            ? '"use client";'
            : "",
      },
    },
  },
  plugins: [react()],
});
