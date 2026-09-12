import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";
import { nodePolyfills } from "vite-plugin-node-polyfills";

/** Bare specifiers left to the consumer to resolve rather than bundled in. */
const EXTERNAL_PACKAGES = [
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
];

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
      // `prismjs/components/*` is matched by prefix, not listed: the grammars
      // are pulled in with `import()` (see src/utils/prism-global.ts) and a
      // bundled dynamic import would split this single-file lib build into
      // extra chunks. Left external, they stay `import()` calls the consumer
      // resolves.
      external: (id) =>
        id.startsWith("prismjs/") || EXTERNAL_PACKAGES.includes(id),
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
