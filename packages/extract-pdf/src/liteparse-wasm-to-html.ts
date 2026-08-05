/**
 * Alternate `ParseMethod` for convertPDFToHTML that delegates to LiteParse's
 * [WASM build](https://github.com/run-llama/liteparse/blob/main/packages/wasm/README.md)
 * instead of the native napi addon. Unlike `"liteparse"`, this path runs
 * anywhere WebAssembly does — browsers, Cloudflare Workers, and Node.js — and
 * requires the optional `@llamaindex/liteparse-wasm` dependency to be
 * installed. OCR is not built in; pass `liteParseOptions.ocrEngine` (e.g.
 * backed by tesseract-js) to enable it.
 */
import { grab } from "./utils/grab";
import { escapeHtml } from "./utils/string-functions";
import type { LiteParseInit } from "@llamaindex/liteparse-wasm";

export interface LiteParseWasmHTMLOptions {
  addPageNumbers?: boolean;
  addCitation?: boolean;
  liteParseOptions?: Partial<LiteParseInit>;
}

// wasm-bindgen's `init()` locates and instantiates the .wasm binary itself
// (relative to the package, via fetch in the browser or Node.js's file
// loader); it only needs to run once per process, so the promise is cached
// at module scope and reused by every call.
let wasmInitPromise: Promise<unknown> | undefined;

async function ensureWasmInit(
  liteParseWasm: typeof import("@llamaindex/liteparse-wasm"),
): Promise<void> {
  if (!wasmInitPromise) {
    wasmInitPromise = liteParseWasm.default();
  }
  await wasmInitPromise;
}

/**
 * Converts a PDF (URL or ArrayBuffer) into HTML using LiteParse's WASM build,
 * mirroring the return shape of `convertPDFToHTML`.
 * @param pdfURLOrBuffer - URL to a PDF file or buffer from fs.readFile
 * @param options.addPageNumbers default=false - Adds `[n]` markers at each page boundary
 * @param options.addCitation default=true - Populates `title`/`author` from PDF metadata
 * @param options.liteParseOptions - Passed through to the `LiteParse` constructor;
 *   defaults to `{ ocrEnabled: false, ocrFailureFatal: false }` (use detectPdfNeedsOcr
 *   to decide when a document is worth re-parsing with `ocrEnabled: true`, or pass
 *   `ocrEngine` to run OCR in-process, e.g. via tesseract-js)
 * @returns `{ html, title, author, format: "pdf" }`, or `{ error }` on failure
 * @category Extract
 */
export async function convertPDFToHTMLWithLiteParseWasm(
  pdfURLOrBuffer: any,
  options: LiteParseWasmHTMLOptions = {},
) {
  const { addPageNumbers = false, addCitation = true, liteParseOptions = {} } = options;

  const buffer =
    typeof pdfURLOrBuffer === "string"
      ? await grab(pdfURLOrBuffer, { responseType: "arraybuffer", timeout: 10 })
      : pdfURLOrBuffer;

  let liteParseWasm: typeof import("@llamaindex/liteparse-wasm");
  try {
    liteParseWasm = await import("@llamaindex/liteparse-wasm");
    await ensureWasmInit(liteParseWasm);
  } catch (e: any) {
    return {
      error:
        "method: 'liteparse-wasm' requires the optional @llamaindex/liteparse-wasm " +
        `dependency: ${e.message}`,
    };
  }

  const parser = new liteParseWasm.LiteParse({
    quiet: true,
    ocrEnabled: false,
    ocrFailureFatal: false,
    ...liteParseOptions,
  });

  let result;
  try {
    result = await parser.parse(new Uint8Array(buffer));
  } catch (e: any) {
    return { error: e.message };
  }

  const html = result.pages.reduce((acc, page) => {
    const body = page.text
      .split(/\n{2,}/)
      .filter((paragraph) => paragraph.trim().length > 0)
      .map((paragraph) => escapeHtml(paragraph).replace(/\n/g, "<br/>"))
      .join("</p><p>");
    return (
      acc +
      `<p id="page-${page.pageNum}">${addPageNumbers ? ` [${page.pageNum}] ` : ""}${body}</p>`
    );
  }, "");

  let title: string | undefined;
  let author: string | undefined;
  if (addCitation) {
    author = result.creator || result.producer;
    title = result.pages[0]?.text.split("\n").find((line) => line.trim().length > 0);
  }

  return { author, title, html, format: "pdf" };
}
