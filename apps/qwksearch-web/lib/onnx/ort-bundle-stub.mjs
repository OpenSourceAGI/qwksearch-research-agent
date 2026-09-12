/**
 * @fileoverview Stand-in for onnxruntime-web's `ort.bundle.min.mjs`.
 *
 * `@moonshine-ai/moonshine-js` ships onnxruntime-web pre-bundled, and that
 * bundle computes the URL of its Web Worker proxy with
 *
 *     new URL("ort.bundle.min.mjs", import.meta.url)
 *
 * The file it names is not in the published package — it only exists in
 * onnxruntime-web's own dist — and the specifier has no `./`, so a bundler
 * reads it as a bare module and cannot resolve it. Turbopack, which is what
 * `bun run dev` runs on, treats that as `Module not found: Can't resolve
 * 'ort.bundle.min.mjs'` and fails the whole route that pulled it in: the root
 * layout mounts `Providers`, which reaches moonshine through
 * `use-voice-control`, so the dev server answered `/` — the app's default
 * page — with a 500 rather than just dropping the voice button. (The deployed
 * build is vite/rolldown, which only warns and leaves the URL to be resolved
 * at runtime, so this never reached production.)
 *
 * Aliasing the specifier here gives the reference something to resolve to.
 * Nothing loads this module in practice: the URL is only fetched when
 * onnxruntime runs in proxy mode (`ort.env.wasm.proxy = true`), which nothing
 * in this app turns on. If that ever changes, the warning below is what will
 * say so out loud instead of failing silently.
 *
 * @module lib/onnx/ort-bundle-stub
 */

console.warn(
  "[onnxruntime] the proxy-worker bundle was loaded from a stub; " +
    "on-device inference in proxy mode is not available in this build.",
);

export {};
