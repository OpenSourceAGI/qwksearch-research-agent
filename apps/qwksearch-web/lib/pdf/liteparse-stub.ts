/**
 * Stub for the optional `@llamaindex/liteparse` dependency in the server
 * (rsc/ssr) build.
 *
 * `extract-pdf` exposes two parse methods: the default pure-TS
 * `ts-block-algorithm` pipeline, and `liteparse`, which lazily
 * `import("@llamaindex/liteparse")` inside a try/catch. LiteParse ships a
 * native napi addon that workerd cannot load, and nothing in this app opts
 * into that method — `lib/uploads` calls `convertPDFToHTML` with the default.
 *
 * Leaving the specifier external kept a bare `import "@llamaindex/liteparse"`
 * in the server bundle, which made it a required runtime dependency of
 * vinext's standalone output ("Failed to resolve required runtime dependency")
 * even though the package is only installed for `extract-pdf` itself.
 *
 * Resolving to this module instead keeps the ~30MB native package out of the
 * build while preserving the documented behaviour: evaluating it rejects the
 * dynamic import, so `convertPDFToHTMLWithLiteParse` returns its usual
 * "requires the optional @llamaindex/liteparse dependency" error.
 */
const UNAVAILABLE =
  "@llamaindex/liteparse is not bundled server-side (native addon, " +
  "unsupported on workerd); use the default 'ts-block-algorithm' parse method.";

export class LiteParse {
  constructor() {
    throw new Error(UNAVAILABLE);
  }
}

throw new Error(UNAVAILABLE);
