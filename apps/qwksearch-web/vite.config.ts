import vinext from "vinext";
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "reason-editor": path.resolve(
        __dirname,
        "../../packages/reason-editor/dist/index.mjs",
      ),
      "reason-editor/reader": path.resolve(
        __dirname,
        "../../packages/reason-editor/dist/reader.mjs",
      ),
    },
  },
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
      configPath: "./wrangler.jsonc",
    }),
  ],
});
