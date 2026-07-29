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
      name: "ShadcnSettings",
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format === "es" ? "mjs" : "cjs"}`,
    },
    rollupOptions: {
      // Externalize React and the shadcn/radix runtime deps so they resolve to
      // the single instance owned by the consuming app.
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "@radix-ui/react-select",
        "@radix-ui/react-switch",
        "class-variance-authority",
        "clsx",
        "lucide-react",
        "tailwind-merge",
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "react/jsx-runtime": "jsxRuntime",
          "@radix-ui/react-select": "RadixSelect",
          "@radix-ui/react-switch": "RadixSwitch",
          "class-variance-authority": "cva",
          clsx: "clsx",
          "lucide-react": "LucideReact",
          "tailwind-merge": "tailwindMerge",
        },
        banner: '"use client";',
      },
    },
  },
  plugins: [react()],
});
