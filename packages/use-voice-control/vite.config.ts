import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// Library build for the published entry points. The source lives under `speech/`:
// `speech/index.ts` is the server-side TTS API (`generateSpeech` + types),
// `speech/client` the framework-agnostic browser engines (read-aloud playback,
// live dictation), and `speech/react` the hooks and overlay that wrap them.
export default defineConfig({
  plugins: [
    react(),
    dts({
      include: [
        "speech/index.ts",
        "speech/core",
        "speech/types",
        "speech/client",
        "speech/react",
        "speech/utils/*.d.ts",
      ],
    }),
  ],
  // Several modules under `speech/core` ship both a `.ts` source and a stray
  // `.js` sibling (e.g. kokoro.ts / kokoro.js). Vite's default resolver picks
  // `.js` first, so prefer TypeScript sources to build the real entry graph.
  resolve: {
    extensions: [".ts", ".tsx", ".mjs", ".js", ".mts", ".jsx", ".json"],
  },
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "speech/index.ts"),
        client: resolve(__dirname, "speech/client/index.ts"),
        react: resolve(__dirname, "speech/react/index.ts"),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      // Keep runtime/optional peers out of the bundle so consumers provide them.
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "lucide-react",
        "@huggingface/transformers",
        "@moonshine-ai/moonshine-js",
      ],
    },
    sourcemap: true,
    emptyOutDir: true,
  },
});
