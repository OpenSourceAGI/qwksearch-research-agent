# `@lobechat/image-photon`

A `sharp`-shaped image pipeline backed by [Photon](https://github.com/silvia-odwyer/photon)
(Rust compiled to WebAssembly), packaged for the edge by
[`@cf-wasm/photon`](https://github.com/fineshopdesign/cf-wasm/tree/main/packages/photon).

## Why

`sharp` is a native Node addon wrapping libvips. workerd cannot load native
addons, so every server path that touched `sharp` — thumbnail generation,
attachment compression, multimodal image transcoding — kept the app off
Cloudflare Workers. Photon is plain WebAssembly and runs unchanged on Workers,
Node and the edge runtime.

The call sites keep the fluent API they already had; only the import changes:

```diff
-import sharp from 'sharp';
+import sharp from '@lobechat/image-photon';

 const thumbnail = await sharp(buffer)
   .resize(320, 320, { fit: 'inside', withoutEnlargement: true })
   .webp()
   .toBuffer();
```

The WASM binary is loaded on first use, not at import time, so modules that
merely reach this one without processing an image pay nothing.

## Supported surface

| Method                                           | Notes                                                                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `sharp(input, options)`                          | `Buffer`, `Uint8Array` or `ArrayBuffer`. Honours `limitInputPixels`.                                                                        |
| `.metadata()`                                    | `format`, `width`, `height`, `pages`, `orientation`, `hasAlpha`, `size`. Answered from the file header alone where the container allows it. |
| `.stats()`                                       | Per-channel `min`/`max`/`sum`/`mean`/`stdev`, plus `isOpaque`.                                                                              |
| `.resize(w, h, opts)` / `.resize(opts)`          | `fit` of `cover` (default), `contain`, `fill`, `inside`, `outside`; `withoutEnlargement`, `withoutReduction`, `background`.                 |
| `.rotate(angle?)`                                | No argument bakes in the EXIF orientation. Quarter turns are lossless.                                                                      |
| `.flatten({ background })`                       | Composites onto an opaque colour; accepts `#rgb`/`#rrggbb`/`#rrggbbaa`, an object, or `white`/`black`/`transparent`.                        |
| `.jpeg()` / `.png()` / `.webp()` / `.toFormat()` | With no explicit format, the input's format is kept.                                                                                        |
| `.toBuffer()`                                    | Returns a `Buffer`.                                                                                                                         |

Format sniffing recognises PNG (including APNG), JPEG, GIF, WebP, BMP, TIFF,
ICO, AVIF/HEIF and SVG.

## Differences from `sharp`

These are real behavioural differences, not omissions to be fixed later:

- **WebP quality is fixed.** Photon's WebP encoder takes no quality parameter,
  so `.webp({ quality })` accepts the option and ignores it. JPEG quality works.
- **Single frame only.** An animation decodes to its first frame. `metadata()`
  still reports the true frame count in `pages` — check it before re-encoding
  if flattening an animation to a still would be wrong. (`attachmentBudget`
  does exactly this.)
- **PNG output always carries an alpha channel.** Photon writes RGBA PNGs, so
  `metadata().hasAlpha` reads `true` on a PNG even after `.flatten()`. The
  pixels really are opaque — `stats().isOpaque` reports that correctly.
- **No AVIF or HEIF input, and no SVG.** Photon decodes PNG, JPEG, WebP, GIF
  and BMP — the libvips-backed `sharp` this replaced also read AVIF and HEIF.
  `metadata()` still identifies those containers from their header and returns
  `format`, `pages` and `size` with no dimensions, so a caller sees an image it
  cannot work with rather than an exception mid-pipeline; anything that needs
  pixels throws. The visible consequence: an AVIF or HEIC attachment can no
  longer be transcoded for a model that does not accept it
  (`normalizeMultimodalImageItems`), and reaches the model in its original
  format or not at all.
- **No `.toFile()`.** There is no filesystem on Workers.
- **`failOn` / `animated` / `density` are accepted and ignored**, so existing
  call sites type-check unchanged.

## Bundling for Workers

`@cf-wasm/photon` ships one entry per runtime, and only one of them runs on
workerd. The `node` entry inlines the binary and calls
`new WebAssembly.Module(bytes)`, which workerd refuses outright — _"Wasm code
generation disallowed by embedder"_. The `workerd` entry imports the binary as
a module instead, which is the shape workerd accepts.

Wrangler picks the right entry on its own. A bundler in front of it needs two
things (see `vite.worker.config.ts` in the QwkSearch worker for a worked
example):

1. **Pin the `workerd` export.** Listing `workerd` first in `resolve.conditions`
   is not always enough — an `ssr.target` of `node` can still win.
2. **Keep the `.wasm` import external** and copy the binary next to the output.
   Bundlers otherwise rewrite it to an asset URL string, which is not a
   `WebAssembly.Module`. Wrangler's default `CompiledWasm` rule compiles the
   file at deploy time; do not add an explicit rule for it, which would shadow
   that default.

`sharp` itself is still a devDependency of the monorepo, used only by Node-only
build scripts that need what Photon cannot do: SVG rasterisation for the macOS
tray icon, and animated GIF → animated WebP in the CDN and docs workflows.
Nothing at runtime depends on it.
