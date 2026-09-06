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
      // Keep the library slim: every heavy runtime is an optional dependency
      // resolved (or CDN-loaded) only when the feature is actually used —
      // liteparse ships a native napi addon / .wasm binary, transformers pulls
      // the Granite Docling ONNX model, and @napi-rs/canvas is the Node.js
      // rasterizer for OCR modes. pdfjs-serverless is not listed because it
      // is never installed at all: it loads from the jsDelivr ESM build at
      // runtime (see src/utils/load-pdfjs.ts).
      external: [
        "@llamaindex/liteparse",
        "@llamaindex/liteparse-wasm",
        "@huggingface/transformers",
        "@napi-rs/canvas",
        "pdfjs-serverless",
      ],
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
        "src/ocr-page-scan.ts",
        "src/docling-ocr.ts",
        "src/models/**/*.ts",
        "src/transforms/**/*.ts",
        "src/utils/**/*.ts",
      ],
      insertTypesEntry: true,
    }),
  ],
});
