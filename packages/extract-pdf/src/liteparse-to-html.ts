/**
 * Alternate `ParseMethod` for convertPDFToHTML that delegates to
 * [LiteParse](https://github.com/run-llama/liteparse) instead of the built-in
 * ts-block-algorithm pipeline. LiteParse ships a native (napi) addon, so this
 * path is Node.js only — it will not run in Cloudflare Workers or browsers —
 * and requires the optional `@llamaindex/liteparse` dependency to be installed.
 */
import { grab } from "./utils/grab";
import type { LiteParseConfig } from "@llamaindex/liteparse";

export interface LiteParseHTMLOptions {
  addPageNumbers?: boolean;
  addCitation?: boolean;
  liteParseOptions?: Partial<LiteParseConfig>;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Converts a PDF (URL or ArrayBuffer) into HTML using LiteParse's spatial text
 * extraction, mirroring the return shape of `convertPDFToHTML`.
 * @param pdfURLOrBuffer - URL to a PDF file or buffer from fs.readFile
 * @param options.addPageNumbers default=false - Adds `[n]` markers at each page boundary
 * @param options.addCitation default=true - Populates `title`/`author` from PDF metadata
 * @param options.liteParseOptions - Passed through to the `LiteParse` constructor;
 *   defaults to `{ ocrEnabled: false, ocrFailureFatal: false }` (use detectPdfNeedsOcr
 *   to decide when a document is worth re-parsing with `ocrEnabled: true`)
 * @returns `{ html, title, author, format: "pdf" }`, or `{ error }` on failure
 * @category Extract
 */
export async function convertPDFToHTMLWithLiteParse(
  pdfURLOrBuffer: any,
  options: LiteParseHTMLOptions = {},
) {
  const { addPageNumbers = false, addCitation = true, liteParseOptions = {} } = options;

  const buffer =
    typeof pdfURLOrBuffer === "string"
      ? await grab(pdfURLOrBuffer, { responseType: "arraybuffer", timeout: 10 })
      : pdfURLOrBuffer;

  let LiteParse: typeof import("@llamaindex/liteparse").LiteParse;
  try {
    ({ LiteParse } = await import("@llamaindex/liteparse"));
  } catch (e: any) {
    return {
      error:
        "method: 'liteparse' requires the optional @llamaindex/liteparse dependency " +
        `(Node.js only): ${e.message}`,
    };
  }

  // Default to no OCR: this method exists for the fast/local path (see
  // detectPdfNeedsOcr for routing scanned/complex pages elsewhere), and OCR
  // requires downloading tessdata on first use, which is slow and can fail
  // offline. `ocrFailureFatal: false` keeps already-recovered native text
  // instead of discarding the whole parse if a caller opts OCR back in and it
  // fails on some pages.
  const parser = new LiteParse({
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
