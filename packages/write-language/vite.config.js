import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    nodePolyfills({
      include: ["os", "path"],
    }),
    dts({
      insertTypesEntry: true,
      include: ["src/**/*.ts"],
      outDir: "dist",
      rollupTypes: false,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["cjs", "es"],
      fileName: (format) => `write-language.${format === "es" ? "es" : "cjs"}.js`,
    },
    rollupOptions: {
      external: [
        "ai",
        "@ai-sdk/openai",
        "@ai-sdk/anthropic",
        "@ai-sdk/groq",
        "@ai-sdk/google",
        "@ai-sdk/google-vertex",
        "@ai-sdk/xai",
        "@ai-sdk/amazon-bedrock",
        "@ai-sdk/mcp",
        "@openrouter/ai-sdk-provider",
        "prismjs",
        "html-entities",
        "marked",
        "qwksearch-api-client",
      ],
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
