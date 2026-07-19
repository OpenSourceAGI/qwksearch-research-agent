import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Builds a single, hash-free JS/CSS pair so the extension host can reference
// them by a stable filename (dist/main.js, dist/main.css) from panel.ts.
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
        chunkFileNames: "main.js",
        assetFileNames: "main.[ext]",
      },
    },
  },
});
