import vinext from "vinext";
import { createLogger, defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import rsc from "@vitejs/plugin-rsc";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const logger = createLogger();
const _warn = logger.warn.bind(logger);
logger.warn = (msg, opts) => {
  if (msg.includes("pp-ed-ul.otf")) return;
  _warn(msg, opts);
};

// `cloudflare:workers` is only provided by @cloudflare/vite-plugin in the
// server (rsc/ssr) environments. A few shared modules that read env vars are
// also reachable from the client bundle, so stub the module there.
const cloudflareWorkersStub = fileURLToPath(
  new URL("./lib/cloudflare-workers-stub.ts", import.meta.url),
);

export default defineConfig(({ command }) => ({
  customLogger: logger,
  resolve: {
    alias: {
      "shadcn-app-dock": resolve(__dirname, "../../packages/shadcn-app-dock/src/index.ts"),
      "extract-webpage": resolve(__dirname, "../../packages/extract-webpage/src"),
      "chat-agent-toolkit": resolve(__dirname, "../../packages/agent-toolkit/src"),
      "extract-pdf": resolve(__dirname, "../../packages/extract-pdf/src/pdf-to-html.ts"),
      "extract-youtube": resolve(__dirname, "../../packages/extract-youtube/src"),
      "qwksearch-api-client/openapi.json": resolve(__dirname, "../../packages/qwksearch-api-client/qwksearch-openapi.json"),
      "qwksearch-api-client": resolve(__dirname, "../../packages/qwksearch-api-client/src"),
      "write-language": resolve(__dirname, "../../packages/write-language/src"),
      "grab-url": resolve(__dirname, "./lib/api/grab.ts"),
      "search-web-api": resolve(__dirname, "../../packages/search-web-api/src"),
    },
  },
  build: {

    minify: false,
    sourcemap: true,
    rollupOptions: {
      // `fsevents` is an optional macOS-only native module that rollup/chokidar
      // require() lazily inside a try/catch; it has no place in the Worker
      // bundle and is never installed on Linux, so leave it external.
      // `@mastra/core` and `@mastra/mcp` are optional dependencies with incorrect package.json exports.
      external: ["fsevents", /^@mastra\//],
    },
    rolldownOptions: {
      // Rolldown (Vite 8.x bundler) needs its own external list.
      //
      // Do NOT add `ai` / `@ai-sdk/*` here: this list applies to the server
      // (rsc/ssr) environments too, and an externalized bare import in a
      // Worker chunk fails at runtime with
      //   No such module "_next/static/ai" imported from "_next/static/route-*.js"
      // because workerd resolves bare specifiers relative to the chunk. The
      // AI SDK packages never reach the final client bundle anyway (they are
      // tree-shaken out), so they must simply be bundled server-side.
      external: ["fsevents", /^@mastra\//],
    },
  },
  ssr: {
    // Bundle workspace packages into the standalone output instead of treating
    // them as external dependencies (which vinext can't resolve at deploy time)
    noExternal: [
      "chat-agent-toolkit",
      "extract-webpage",
      "extract-pdf",
      "extract-youtube",
      "qwksearch-api-client",
      "write-language",
      "shadcn-app-dock",
      "search-web-api",
      "research-agent-ui",
    ],
  },
  plugins: [
    {
      // Resolve `cloudflare:workers` to a harmless stub in the client build,
      // and in local `vite serve` (where we intentionally skip the
      // Cloudflare runner to avoid runtime bootstrap crashes).
      name: "stub-cloudflare-workers-client",
      enforce: "pre",
      resolveId(id) {
        if (
          id === "cloudflare:workers" &&
          (command === "serve" || this.environment?.name === "client")
        ) {
          return cloudflareWorkersStub;
        }
        return null;
      },
    },
    {
      // Provide a working CommonJS `require` in the Worker (rsc/ssr) bundle.
      //
      // `@vitejs/plugin-rsc` injects, in a non-rolldown production build, a
      // top-level `const x = require("node:async_hooks")` to install the
      // global `AsyncLocalStorage` (see its `globalAsyncLocalStoragePlugin`).
      // That assumes a Node target. In an ESM Cloudflare Worker `require` is
      // not a global, so deploy validation crashes with
      // "ReferenceError: require is not defined" before the Worker can run —
      // this is the single top-level `require()` in the whole worker bundle.
      //
      // A previous attempt assigned `globalThis.require =
      // createRequire(import.meta.url)` eagerly, but `createRequire` throws in
      // the workerd runtime; the throw was swallowed by its `catch`, leaving
      // `globalThis.require` undefined and the deploy still broken.
      //
      // Instead, install a `require` function that:
      //   * returns the statically-imported `node:async_hooks` namespace,
      //     which is guaranteed to resolve under the `nodejs_compat` flag and
      //     covers the one top-level require above; and
      //   * lazily falls back to `createRequire` for anything else, deferred
      //     inside the call so a throwing `createRequire` can never break
      //     module initialization. The remaining bundled `require()` calls
      //     target optional npm packages inside try/catch lazy-load guards, so
      //     they keep throwing a *catchable* error and degrade gracefully.
      //
      // Prepended to every server chunk (guarded + idempotent) so the global
      // is set before any module body runs. The client bundle is never
      // touched — `node:async_hooks`/`node:module` have no place in the
      // browser.
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
          'import * as __vinextAsyncHooks from "node:async_hooks";\n' +
          'import { createRequire as __vinextCreateRequire } from "node:module";\n' +
          'if (typeof globalThis.require === "undefined") {\n' +
          "  let __vinextCjsRequire;\n" +
          "  globalThis.require = function (id) {\n" +
          '    if (id === "node:async_hooks" || id === "async_hooks") return __vinextAsyncHooks;\n' +
          "    if (__vinextCjsRequire === undefined) {\n" +
          "      try { __vinextCjsRequire = __vinextCreateRequire(import.meta.url); }\n" +
          "      catch { __vinextCjsRequire = null; }\n" +
          "    }\n" +
          "    if (__vinextCjsRequire) return __vinextCjsRequire(id);\n" +
          '    throw new Error("Dynamic require of \\"" + id + "\\" is not supported");\n' +
          "  };\n" +
          "}\n";
        return { code: shim + code, map: null };
      },
    },
    vinext(),
    ...(command === "serve"
      ? []
      : [
          cloudflare({
            viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
            configPath: "./wrangler.jsonc",
          }),
        ]),
    {
      // Different plugins (vinext, @vitejs/plugin-rsc, and our own config)
      // disagree per-environment about whether react/react-dom should be
      // pre-bundled (`optimizeDeps.include`) or left external
      // (`optimizeDeps.exclude`). Vite's config merge concatenates array
      // configs from every plugin rather than letting one override another,
      // so a package can end up in both lists for the same environment —
      // esbuild then crashes with "The entry point ... cannot be marked as
      // external" because a package can't be a scan entry point and
      // external in the same build.
      //
      // `configEnvironment` runs after all plugins' `config` hooks have
      // merged into the environment, and hands us the live (mutable)
      // resolved config object, so removing the overlap here — instead of
      // returning a config to merge — actually sticks.
      name: "fix-optimize-deps-include-exclude-conflict",
      enforce: "post",
      configEnvironment(_name, config) {
        const include = new Set(config.optimizeDeps?.include ?? []);
        const exclude = config.optimizeDeps?.exclude;
        if (!exclude) return;
        config.optimizeDeps.exclude = exclude.filter((id) => !include.has(id));
      },
    },
  ],
}));
