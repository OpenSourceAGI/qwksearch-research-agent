import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: "./src/pdf-to-html.ts",
      formats: ["es", "cjs"],
      fileName: (format) => `pdf-to-html.${format === "es" ? "es" : "cjs"}.js`,
    },
    outDir: "dist",
    emptyOutDir: true,
    minify: "terser",
    terserOptions: {
      compress: true,
      mangle: true,
      format: { comments: false },
    },
    rollupOptions: {
      // @llamaindex/liteparse ships a native (napi) addon, and
      // @llamaindex/liteparse-wasm ships a .wasm binary — never inline either,
      // keep them as runtime dependencies resolved by the consuming app when
      // the "liteparse" / "liteparse-wasm" ParseMethods are actually used.
      external: ["@llamaindex/liteparse", "@llamaindex/liteparse-wasm"],
    },
  },
  plugins: [
    dts({
      outDir: "dist",
      rollupTypes: true,
      include: [
        "src/pdf-to-html.ts",
        "src/liteparse-to-html.ts",
        "src/liteparse-wasm-to-html.ts",
        "src/detect-needs-ocr.ts",
        "src/models/**/*.ts",
        "src/transforms/**/*.ts",
        "src/utils/**/*.ts",
      ],
      insertTypesEntry: true,
    }),
  ],
});
