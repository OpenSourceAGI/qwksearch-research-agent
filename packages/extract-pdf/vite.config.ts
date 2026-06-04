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
      external: ["grab-url"],
    },
  },
  plugins: [
    dts({
      outDir: "dist",
      rollupTypes: true,
      include: [
        "src/pdf-to-html.ts",
        "src/models/**/*.ts",
        "src/transforms/**/*.ts",
        "src/utils/**/*.ts",
      ],
      insertTypesEntry: true,
    }),
  ],
});
