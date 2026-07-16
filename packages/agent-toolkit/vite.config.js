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
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es", "cjs"],
      fileName: (format) =>
        format === "es" ? "research-agent.es.js" : "research-agent.cjs.js",
    },
    rollupOptions: {
      // Library build: every bare import stays a runtime dependency instead of
      // being bundled (bundling packages like @mastra/core drags in Node-only
      // transitive deps such as @prisma/client and breaks the build).
      external: (id) => !id.startsWith(".") && !id.startsWith("/") && !id.startsWith("\0"),
      output: {
        codeSplitting: false,
      },
    },
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
        passes: 2,
        pure_funcs: ["console.log", "console.debug"],
        dead_code: true,
        unused: true,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
    sourcemap: true,
    emptyOutDir: false,
    chunkSizeWarningLimit: 1000,
  },
});
