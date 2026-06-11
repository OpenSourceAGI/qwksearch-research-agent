import vinext from "vinext";
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { fileURLToPath } from "node:url";

// `cloudflare:workers` is only provided by @cloudflare/vite-plugin in the
// server (rsc/ssr) environments. A few shared modules that read env vars are
// also reachable from the client bundle, so stub the module there.
const cloudflareWorkersStub = fileURLToPath(
  new URL("./lib/cloudflare-workers-stub.ts", import.meta.url),
);

export default defineConfig({
  build: {
    rollupOptions: {
      // `fsevents` is an optional macOS-only native module that rollup/chokidar
      // require() lazily inside a try/catch; it has no place in the Worker
      // bundle and is never installed on Linux, so leave it external.
      external: ["fsevents"],
    },
  },
  plugins: [
    {
      // Resolve `cloudflare:workers` to a harmless stub in the client build
      // only; @cloudflare/vite-plugin provides the real module for rsc/ssr.
      name: "stub-cloudflare-workers-client",
      enforce: "pre",
      resolveId(id) {
        if (id === "cloudflare:workers" && this.environment?.name === "client") {
          return cloudflareWorkersStub;
        }
        return null;
      },
    },
    vinext(),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
      configPath: "./wrangler.jsonc",
    }),
  ],
});
