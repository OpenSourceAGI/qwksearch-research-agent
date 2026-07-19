import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.spec.ts", "src/**/__tests__/**"],
      outDir: "dist",
      rollupTypes: false,
    }),
  ],
  build: {
    lib: {
      entry: {
        "extract-webpage": resolve(__dirname, "src/index.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}.${format}.js`,
    },
    rollupOptions: {
      // Library build: every bare import stays a runtime dependency instead of
      // being bundled. Bundling deps dragged in Node-only modules (fs, etc.)
      // that then needed browser polyfills and a missing fs-mock alias.
      external: (id) => !id.startsWith(".") && !id.startsWith("/") && !id.startsWith("\0"),
      output: {
        codeSplitting: false,
      },
    },
    minify: "terser",
    sourcemap: true,
    emptyOutDir: false,
  },
});
