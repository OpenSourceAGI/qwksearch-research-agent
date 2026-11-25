#!/usr/bin/env bun
/**
 * @fileoverview Builds the CDN runtime a `.refdoc.html` file loads:
 *
 * - `dist/refdoc.js`  — `runtime/main.tsx` with React and Fumadocs UI, one
 *   minified IIFE (a classic script, so it runs from `file://` too).
 * - `dist/refdoc.css` — Fumadocs UI's prebuilt stylesheet + `runtime/refdoc.css`.
 *
 * The npm publish workflow runs this as the package's `build`, and jsDelivr
 * serves the published files at https://cdn.jsdelivr.net/npm/extract-refdoc@0/dist/.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import path from "node:path"

const here = path.resolve(import.meta.dirname, "..")
const dist = path.join(here, "dist")
const pkg = JSON.parse(await readFile(path.join(here, "package.json"), "utf8")) as { version: string }

/** The slice of Bun's bundler API used here (no bun-types dependency). */
interface PluginBuilder {
  onResolve(options: { filter: RegExp }, resolve: () => { path: string }): void
}
interface BunBundler {
  build(options: Record<string, unknown>): Promise<{ success: boolean; logs: unknown[]; outputs: Array<{ text(): Promise<string> }> }>
}
const Bun = (globalThis as { Bun?: BunBundler }).Bun
if (!Bun) throw new Error("Build the runtime with Bun: bun ./scripts/build-runtime.ts")

/** Modules the runtime never reaches at run time, swapped for stubs to keep the bundle small. */
const stubs: Array<[RegExp, string]> = [
  [/^fumadocs-core\/content\/md$/, "markdown-renderer.ts"],
  [/^rehype-raw$/, "rehype-raw.ts"],
  [/(^|\/)search-default\.js$/, "search-default.ts"],
]

const result = await Bun.build({
  plugins: [
    {
      name: "refdoc-stubs",
      setup(build: PluginBuilder) {
        for (const [filter, file] of stubs) build.onResolve({ filter }, () => ({ path: path.join(here, "runtime/stubs", file) }))
      },
    },
  ],
  entrypoints: [path.join(here, "runtime/main.tsx")],
  target: "browser",
  format: "iife",
  minify: true,
  sourcemap: "none",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    __REFDOC_VERSION__: JSON.stringify(pkg.version),
    // Fumadocs reads a Vite base URL; a classic script has no import.meta.
    "import.meta.env": "undefined",
  },
})
if (!result.success) {
  for (const log of result.logs) console.error(log)
  process.exit(1)
}
await mkdir(dist, { recursive: true })
const js = (await result.outputs[0].text()).replace(/"__REFDOC_VERSION__"/g, JSON.stringify(pkg.version))
await writeFile(path.join(dist, "refdoc.js"), `/*! refdoc ${pkg.version} | Fumadocs UI, React — see their licenses */\n${js}`)

const require = createRequire(path.join(here, "package.json"))
const fumadocsCss = await readFile(path.join(path.dirname(require.resolve("fumadocs-ui/package.json")), "dist/style.css"), "utf8")
const ownCss = await readFile(path.join(here, "runtime/refdoc.css"), "utf8")
await writeFile(path.join(dist, "refdoc.css"), `${fumadocsCss}\n${ownCss}`)

const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`
console.log(`dist/refdoc.js  ${kb(js.length)}\ndist/refdoc.css ${kb(fumadocsCss.length + ownCss.length)}`)
