import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// Library build for the published TTS entry point. The source lives under
// `speech/`; `speech/index.ts` is the public API (`generateSpeech` + types).
export default defineConfig({
  plugins: [
    dts({
      include: ["speech/index.ts", "speech/core", "speech/types"],
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
      entry: resolve(__dirname, "speech/index.ts"),
      formats: ["es"],
      fileName: () => "index.js",
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
