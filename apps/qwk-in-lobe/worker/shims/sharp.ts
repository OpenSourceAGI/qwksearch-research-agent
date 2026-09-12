/**
 * `sharp` alias for the Worker bundle.
 *
 * This used to throw: `sharp` is a native Node addon and workerd cannot load
 * one, so every image path in the Worker was dead. It now resolves to
 * `@lobechat/image-photon`, a sharp-shaped pipeline over the Photon WASM codec
 * that runs on workerd, so those paths work instead of failing.
 *
 * The app's own code imports `@lobechat/image-photon` directly. This alias only
 * catches third-party dependencies that still reach for `sharp`.
 *
 * Not everything sharp does survives the swap — no SVG rasterisation, no
 * animated re-encoding, no `toFile` — see that package's README.
 */
export * from '@lobechat/image-photon';
export { default } from '@lobechat/image-photon';
