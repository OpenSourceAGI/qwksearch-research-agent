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
      entry: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      name: "ReasonEditorSidebar",
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format === "es" ? "mjs" : "cjs"}`,
    },
    rollupOptions: {
      // Externalize React and react-reason-editor so the host's single
      // instances are reused instead of bundling a second copy of either.
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react-reason-editor",
        "react-reason-editor/sidebar-kit",
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "react/jsx-runtime": "jsxRuntime",
          "react-reason-editor": "ReactReasonEditor",
          "react-reason-editor/sidebar-kit": "ReactReasonEditorSidebarKit",
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) return "style.css";
          return assetInfo.name ?? "[name][extname]";
        },
        banner: '"use client";',
      },
    },
  },
  plugins: [react()],
});
