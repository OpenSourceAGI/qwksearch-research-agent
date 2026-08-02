import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Entry/CSS filenames are pinned (hash-free) so the extension host can
// reference them by a stable name (dist/main.js, dist/main.css) from
// src/reasonEditorProvider.ts, mirroring webview-ui/vite.config.ts. Unlike
// the chat sidebar, this bundle has real code-splitting: several
// react-reason-editor plugins (Mermaid, Katex, a WASM grammar checker,
// html-to-docx) are lazy-loaded via dynamic `import()`, so Rolldown emits
// those as their own numbered chunk files (main2.js, main3.js, ...)
// alongside the entry rather than one giant file -- see the CSP comment in
// ../src/webviewHtml.ts for what that requires of `script-src`.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: "src/main.tsx",
      output: {
        entryFileNames: "main.js",
        chunkFileNames: "chunk-[hash].js",
        // Only the combined stylesheet needs a name the extension host can
        // hardcode; everything else (the grammar checker's .wasm, fonts,
        // ...) just needs to not collide with a sibling of the same
        // extension, which a fixed "main.[ext]" pattern doesn't guarantee.
        assetFileNames: (assetInfo) =>
          assetInfo.name?.endsWith(".css") ? "main.css" : "assets/[name]-[hash][extname]",
      },
    },
  },
});
