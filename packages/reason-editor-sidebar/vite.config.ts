import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Library build: emits ESM + CJS. Type declarations are produced separately by
// `tsc --project tsconfig.build.json` (see package.json build script).
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      name: "ReasonEditorSidebar",
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format === "es" ? "mjs" : "cjs"}`,
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "@headless-tree/core",
        "@headless-tree/react",
        "@radix-ui/react-alert-dialog",
        "@radix-ui/react-context-menu",
        "@radix-ui/react-dialog",
        "@radix-ui/react-dropdown-menu",
        "@radix-ui/react-slot",
        "@radix-ui/react-tooltip",
        "@svar-ui/react-filemanager",
        "class-variance-authority",
        "clsx",
        "lucide-react",
        "react-file-icon",
        "react-split-pane",
        "react-split-pane/persistence",
        "tailwind-merge",
      ],
      output: {
        assetFileNames: (asset) => (asset.name?.endsWith(".css") ? "style.css" : "[name][extname]"),
        banner: '"use client";',
      },
    },
  },
  plugins: [react()],
});
