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
      name: "CategoryDock",
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format === "es" ? "mjs" : "cjs"}`,
    },
    rollupOptions: {
      // Externalize React + the host-shared singletons so context/providers
      // (next-themes, shadcn-theme-menu) resolve to a single instance.
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "next-themes",
        "framer-motion",
        "lucide-react",
        "shadcn-theme-menu",
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "react/jsx-runtime": "jsxRuntime",
          "next-themes": "NextThemes",
          "framer-motion": "FramerMotion",
          "lucide-react": "LucideReact",
          "shadcn-theme-menu": "ShadcnThemeMenu",
        },
      },
    },
  },
  plugins: [react()],
});
