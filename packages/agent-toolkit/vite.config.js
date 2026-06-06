import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// Intercept fs/promises before it gets mangled by node polyfills.
// The polyfill maps fs → empty.js, then Vite tries to load empty.js/promises
// as a directory — which fails. This plugin catches it at every stage.
function fsPromisesFix() {
  const EMPTY_MODULE = `
    export const promises = {
      mkdir: async () => {},
      readFile: async () => "",
      writeFile: async () => {},
      appendFile: async () => {},
      stat: async () => ({ isDirectory: () => false }),
    };
    export const mkdir = promises.mkdir;
    export const readFile = promises.readFile;
    export const writeFile = promises.writeFile;
    export const appendFile = promises.appendFile;
    export const stat = promises.stat;
    export default { promises, mkdir, readFile, writeFile, appendFile, stat };
  `;
  return {
    name: "fix-fs-promises",
    enforce: "pre",
    resolveId(id) {
      if (id === "fs/promises" || id === "node:fs/promises" || id.endsWith("empty.js/promises")) {
        return "\0fs-promises-polyfill";
      }
    },
    load(id) {
      if (id === "\0fs-promises-polyfill") {
        return EMPTY_MODULE;
      }
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      "fs/promises": resolve(__dirname, "src/fs-mock.js"),
      "fs": resolve(__dirname, "src/fs-mock.js"),
    },
  },
  plugins: [
    fsPromisesFix(),
    nodePolyfills({
      include: ["os", "path", "fs"],
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
      formats: ["cjs"],
      fileName: () => "research-agent.cjs.js",
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
        "@openrouter/ai-sdk-provider",
        "drizzle-orm",
        "zod",
      ],
      output: {
        inlineDynamicImports: true,
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