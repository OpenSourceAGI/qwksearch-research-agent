import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ["*.ts", "types/**/*.ts"],
      exclude: ["*.test.ts", "*.spec.ts", "test/**"],
      outDir: "dist",
      rollupTypes: false,
    }),
  ],
  build: {
    lib: {
      entry: {
        "extract-human-name": resolve(__dirname, "index.ts"),
        "extract-human-name-full": resolve(__dirname, "full.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}.${format}.js`,
    },
    rollupOptions: {
      // Library build: every bare import stays a runtime dependency instead of
      // being bundled.
      external: (id) => !id.startsWith(".") && !id.startsWith("/") && !id.startsWith("\0"),
      // Two entries (slim and /full) share one chunk, so both see the same
      // human-names database once either registers or lazy-loads it.
      output: {
        chunkFileNames: "extract-human-name-[name].[format].js",
      },
    },
    minify: "terser",
    sourcemap: true,
    emptyOutDir: false,
  },
});
