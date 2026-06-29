import vinext from "vinext";
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

// `cloudflare:workers` is only provided by @cloudflare/vite-plugin in the
// server (rsc/ssr) environments. A few shared modules that read env vars are
// also reachable from the client bundle, so stub the module there.
const cloudflareWorkersStub = fileURLToPath(
  new URL("./lib/cloudflare-workers-stub.ts", import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: {
      "shadcn-app-dock": resolve(__dirname, "../../packages/shadcn-app-dock/src/index.ts"),
    },
  },
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
    {
      // Provide a CommonJS `require` in the Worker (rsc/ssr) bundle.
      //
      // Several bundled CJS dependencies (e.g. @langchain/* and langsmith)
      // call `require("node:async_hooks")` at module top level. In an ESM
      // Worker `require` is not a global, so deploy validation crashes with
      // "ReferenceError: require is not defined" before the Worker can run.
      //
      // `createRequire` works under the `nodejs_compat` flag and resolves
      // Node built-ins (async_hooks, util, worker_threads, …). The other
      // bundled `require()` calls target optional npm packages inside
      // try/catch lazy-load guards, so they still throw a *catchable*
      // MODULE_NOT_FOUND and degrade gracefully exactly as intended.
      //
      // Prepended to every server chunk (guarded + idempotent) so the global
      // is set regardless of module evaluation order. The client bundle is
      // never touched — `node:module` has no place in the browser.
      name: "vinext-worker-require-shim",
      apply: "build",
      enforce: "post",
      renderChunk(code, _chunk, outputOptions) {
        const envName = this.environment?.name;
        const dir = outputOptions.dir || "";
        const isServer =
          envName === "rsc" ||
          envName === "ssr" ||
          (!envName && /[\\/]server(?:[\\/]|$)/.test(dir));
        if (!isServer) return null;
        if (outputOptions.format && outputOptions.format !== "es") return null;
        if (!/\brequire\s*\(/.test(code)) return null;

        const shim =
          'import { createRequire as __vinextCreateRequire } from "node:module";\n' +
          'if (typeof globalThis.require === "undefined") {\n' +
          "  try { globalThis.require = __vinextCreateRequire(import.meta.url); } catch {}\n" +
          "}\n";
        return { code: shim + code, map: null };
      },
    },
    vinext(),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
      configPath: "./wrangler.jsonc",
    }),
  ],
});
