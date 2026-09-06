/**
 * @fileoverview Lazy loader for the slim serverless PDF.js build.
 *
 * The package deliberately does NOT depend on `pdfjs-dist`: PDF.js is pulled
 * at runtime from jsDelivr's ESM build of
 * [pdfjs-serverless](https://github.com/johannschopplich/pdfjs-serverless) —
 * a zero-dependency, single-file (~1.6 MB minified) redistribution of Mozilla
 * PDF.js that works in Workers/edge runtimes, Node.js, and browsers. Pinned
 * to the major version so compatible patch/minor releases update
 * automatically. This keeps `extract-pdf`'s default export slim: nothing
 * PDF.js-related is bundled or installed until a document is actually parsed.
 */

const PDFJS_SERVERLESS_CDN_URL =
  "https://cdn.jsdelivr.net/npm/pdfjs-serverless@1/+esm";

let pdfjsPromise: Promise<any> | null = null;

/**
 * Resolves the PDF.js API (`getDocument`, ...) from the pdfjs-serverless CDN
 * build, caching the module after the first call. Node.js and Bun cannot
 * import remote URLs, so when the CDN import throws we fall back to the
 * locally-installed `pdfjs-serverless` optional dependency.
 */
export async function loadPdfJs(): Promise<any> {
  if (!pdfjsPromise) {
    pdfjsPromise = import(/* @vite-ignore */ PDFJS_SERVERLESS_CDN_URL as any)
      .catch(() => import("pdfjs-serverless" as any))
      .then(({ resolvePDFJS }) => resolvePDFJS());
  }
  return pdfjsPromise;
}
