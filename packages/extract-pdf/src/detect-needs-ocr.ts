/**
 * Cheap, text-layer-only pass that determines whether a PDF needs OCR (or
 * other heavy parsing) before committing to a full parse — useful for routing
 * documents to different pipelines. Backed by LiteParse's `isComplex`, so this
 * is Node.js only (native napi addon) and requires the optional
 * `@llamaindex/liteparse` dependency.
 */
import { grab } from "./utils/grab";
import type { LiteParseConfig, PageComplexityStats } from "@llamaindex/liteparse";

export interface DetectPdfNeedsOcrOptions {
  liteParseOptions?: Partial<LiteParseConfig>;
}

export interface PdfOcrAssessment {
  /** True when any page needs OCR or other advanced parsing. */
  needsOcr: boolean;
  /** Per-page complexity signals, one entry per page. */
  pages: PageComplexityStats[];
  /**
   * Every distinct reason found across all pages, e.g. `"scanned"`,
   * `"no-text"`, `"sparse-text"`, `"embedded-images"`, `"garbled"`,
   * `"vector-text"`. Empty when `needsOcr` is false.
   */
  reasons: string[];
}

/**
 * Determines whether a PDF (URL or ArrayBuffer) needs OCR to extract usable
 * text, without running a full parse.
 * @param pdfURLOrBuffer - URL to a PDF file or buffer from fs.readFile
 * @category Extract
 */
export async function detectPdfNeedsOcr(
  pdfURLOrBuffer: any,
  options: DetectPdfNeedsOcrOptions = {},
): Promise<PdfOcrAssessment> {
  const buffer =
    typeof pdfURLOrBuffer === "string"
      ? await grab(pdfURLOrBuffer, { responseType: "arraybuffer", timeout: 10 })
      : pdfURLOrBuffer;

  const { LiteParse } = await import("@llamaindex/liteparse");
  const parser = new LiteParse({ quiet: true, ...options.liteParseOptions });
  const pages = await parser.isComplex(new Uint8Array(buffer));

  return {
    needsOcr: pages.some((page) => page.needsOcr),
    pages,
    reasons: [...new Set(pages.flatMap((page) => page.reasons))],
  };
}
