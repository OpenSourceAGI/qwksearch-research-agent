/**
 * @fileoverview High-fidelity PDF-to-HTML conversion pipeline.
 * Extracts structural elements (headers, lists, code blocks) and handles page-level metadata.
 */
import {
  findPageNumbers,
  findFirstPage,
  removePageNumber,
} from "./utils/page-number-functions";
import TextItem from "./models/text-item";
import Page from "./models/page";
import { grab } from "./utils/grab";

import CalculateGlobalStats from "./transforms/calculate-global-stats";
import CompactLines from "./transforms/line-item/compact-lines";
import RemoveRepetitiveElements from "./transforms/line-item/remove-repetitive-elements";
import VerticalToHorizontal from "./transforms/line-item/vertical-to-horizontal";
import DetectTOC from "./transforms/line-item/detect-toc";
import DetectListItems from "./transforms/line-item/detect-list-items";
import DetectHeaders from "./transforms/line-item/detect-headers";

import GatherBlocks from "./transforms/block/gather-blocks";
import DetectCodeQuoteBlocks from "./transforms/block/detect-code-quote-blocks";
import DetectListLevels from "./transforms/block/detect-list-levels";
import ToTextBlocks from "./transforms/to-text-blocks";
import ToHTML from "./transforms/to-html";
import ParseResult from "./models/parse-result";
import {
  convertPDFToHTMLWithLiteParse,
  type LiteParseHTMLOptions,
} from "./liteparse-to-html";
import {
  convertPDFToHTMLWithLiteParseWasm,
  type LiteParseWasmHTMLOptions,
} from "./liteparse-wasm-to-html";
import { loadPdfJs } from "./utils/load-pdfjs";
import {
  scanPagesForOCR,
  type OcrScanResult,
  type ScanPagesForOCROptions,
} from "./ocr-page-scan";
import {
  ocrPdfPagesWithDocling,
  type DoclingOcrOptions,
} from "./docling-ocr";

/**
 * Where the OCR-capable Docling processing happens for
 * {@link convertPDFToHTML}.
 * - `"frontend"` (default) — all pages parsed by the pure-JS text-layer
 *   pipeline; no OCR, no model, works everywhere.
 * - `"hybrid"` — every page goes through the JS pipeline, then a regex scan
 *   ({@link scanPagesForOCR}) flags pages containing infographics/figures/
 *   tables (or with no usable text layer) and only those pages are re-done
 *   with the Granite Docling OCR model.
 * - `"docling"` — every page is rasterized and OCR'd with Granite Docling
 *   (in-process via the optional `@huggingface/transformers` dependency, or
 *   remotely when `processorUrl` is set).
 * - any `http(s)://` URL — like `"docling"`, but all pages are sent to that
 *   docling-compatible processor API (this package's `server/`, or another
 *   deployment).
 */
export type ProcessorMode = "frontend" | "hybrid" | "docling" | (string & {});

/**
 * Which parsing engine {@link convertPDFToHTML} runs.
 * - `"ts-block-algorithm"` (default) — the pure-TS pipeline in this file: groups
 *   pdfjs text spans into lines/blocks and renders headings/lists/code blocks.
 *   Works in Node.js, Cloudflare Workers, and browsers.
 * - `"liteparse"` — delegates to [LiteParse](https://github.com/run-llama/liteparse),
 *   a native/OCR-capable parser. Node.js only (ships a napi addon), and requires
 *   the optional `@llamaindex/liteparse` dependency to be installed.
 * - `"liteparse-wasm"` — delegates to LiteParse's WebAssembly build. Runs
 *   anywhere WASM does — browsers, Cloudflare Workers, and Node.js — and
 *   requires the optional `@llamaindex/liteparse-wasm` dependency to be
 *   installed. OCR requires passing an `ocrEngine` callback (e.g. tesseract-js).
 */
export type ParseMethod = "ts-block-algorithm" | "liteparse" | "liteparse-wasm";

/**
 * Extracts formatted text from PDF with parsing of linebreaks ,
 * page headers, footnotes, and section headings. Supports fonts, links, bold,
 * italics, lists, headings, headers, footnotes, and Table of Contents,
 * Quotes, and Code Blocks, . Removes repeated headers, links footnote anchors to the footnote,
 *  and preserves number of the PDF page with invisible I element.
 *
 * This function uses [pdfjs-serverless](https://github.com/johannschopplich/pdfjs-serverless)
 * to work in more environments than PDF.js-based tools:
 * Cloudflare workers, serverless, node.js, and front-end only.
 * @param {string} pdfURLOrBuffer - URL to a PDF file or buffer from fs.readFile
 * @param {Object} [options]
 * @param {boolean} options.addPageNumbers default=false - Adds  #  to end of each page
 * @param {boolean} options.removePageHeaders default=true - Removes repeated headers found on each page
 * @param {ParseMethod} options.method default="ts-block-algorithm" - Parsing engine to use;
 *   `"liteparse"` delegates to LiteParse (Node.js only, see {@link ParseMethod})
 * @param {ProcessorMode} options.processor default="frontend" - Where OCR happens:
 *   `"frontend"` (all JS, no OCR), `"hybrid"` (regex-scan pages for
 *   infographics/tables and OCR only those), `"docling"` (OCR every page), or
 *   the URL of a docling-compatible processor API (see {@link ProcessorMode})
 * @param {string} options.processorUrl - Remote docling-compatible API base URL
 *   used by `"hybrid"`/`"docling"` instead of the in-process model
 * @param {Object} options.ocrScanOptions - Threshold tuning for the hybrid
 *   page scan, see {@link ScanPagesForOCROptions}
 * @param {Object} options.doclingOptions - Prompt/maxTokens/scale for the OCR
 *   model, see {@link DoclingOcrOptions}
 * @returns {string|Object} HTML formatted text
 * @category Extract
 * @author [vtempest (2025)](https://github.com/vtempest),
 * [pdf-to-markdown (2017)](https://github.com/jzillmann/pdf-to-markdown/tree/master),
 * [pdf.js (2012-)](https://github.com/mozilla/pdf.js/releases),
 */
export async function convertPDFToHTML(
  pdfURLOrBuffer: any,
  options: {
    addPageNumbers?: boolean;
    addCitation?: boolean;
    method?: ParseMethod;
    processor?: ProcessorMode;
    processorUrl?: string;
    ocrScanOptions?: ScanPagesForOCROptions;
    doclingOptions?: Omit<DoclingOcrOptions, "processorUrl">;
  } & Pick<LiteParseHTMLOptions, "liteParseOptions"> = {},
) {
  if (options.method === "liteparse") {
    const { method: _method, ...liteParseOptions } = options;
    return convertPDFToHTMLWithLiteParse(pdfURLOrBuffer, liteParseOptions);
  }

  if (options.method === "liteparse-wasm") {
    const { method: _method, ...liteParseOptions } = options;
    return convertPDFToHTMLWithLiteParseWasm(
      pdfURLOrBuffer,
      liteParseOptions as unknown as LiteParseWasmHTMLOptions,
    );
  }

  // try {
  var { addPageNumbers = false, addCitation = true } = options;

  // Resolve where OCR happens: "frontend" | "hybrid" | "docling" | a
  // processor URL (which means "docling" against that remote API).
  const processor = options.processor ?? "frontend";
  const processorIsUrl = /^https?:\/\//i.test(processor);
  const processorMode = processorIsUrl ? "docling" : processor;
  const doclingOptions: DoclingOcrOptions = {
    ...options.doclingOptions,
    processorUrl: processorIsUrl ? processor : options.processorUrl,
  };

  // pass in databuffer or download all pdf data
  // and convert to array buffer
  var buffer =
    typeof pdfURLOrBuffer === "string"
      ? await grab(pdfURLOrBuffer, {
          responseType: "arraybuffer",
          timeout: 10,
        })
      : pdfURLOrBuffer;

  let pdfDocument;
  try {
    const { getDocument } = await loadPdfJs();
    pdfDocument = await getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      verbosity: 0,
    }).promise;
  } catch (e: any) {
    return { error: e.message };
  }

  const pages = [...Array(pdfDocument.numPages).keys()].map(
    (index) => new Page({ index }),
  );

  let pageIndexNumMap = {};
  let firstPage;
  for (let j = 1; j <= pdfDocument.numPages; j++) {
    const page = await pdfDocument.getPage(j);
    const textContent = await page.getTextContent();

    if (Object.keys(pageIndexNumMap).length < 10) {
      pageIndexNumMap = findPageNumbers(
        pageIndexNumMap,
        page.pageNumber - 1,
        textContent.items,
      );
    } else {
      firstPage = findFirstPage(pageIndexNumMap);
      break;
    }
  }

  let pageNum = firstPage ? firstPage.pageNum : 0;
  for (let j = 1; j <= pdfDocument.numPages; j++) {
    const page = await pdfDocument.getPage(j);

    // Trigger the font retrieval for the page
    await page.getOperatorList();

    const scale = 1.0;
    const viewport = page.getViewport({ scale });
    let textContent = await page.getTextContent();
    if (firstPage && (page as any).pageIndex >= firstPage.pageIndex) {
      textContent = removePageNumber(textContent as any, pageNum) as any;
      pageNum++;
    }
    const textItems = (textContent.items as any[]).map((item: any) => {
      const tx = [1, 0, 0, 1, 0, 0];
      for (let i = 0; i < 6; i++) {
        tx[i] += item.transform[i] * viewport.transform[i % 2 ? 3 : 0];
        if (i % 2) {
          tx[i + 1] += item.transform[i] * viewport.transform[1];
        }
      }

      const fontHeight = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
      const dividedHeight = item.height / fontHeight;
      return new TextItem({
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
        width: Math.round(item.width),
        height: Math.round(dividedHeight <= 1 ? item.height : dividedHeight),
        text: item.str,
        font: item.fontName,
      });
    });
    pages[page.pageNumber - 1].items = textItems;
  }

  // Raw per-page text (items grouped into lines by y) captured before the
  // transforms mutate the pages — input for the OCR page scan.
  const pageTexts = pages.map((page) =>
    Object.values(
      (page.items as any[]).reduce((lines: any, item: any) => {
        (lines[item.y] = lines[item.y] || []).push(item.text);
        return lines;
      }, {}),
    )
      .map((line: any) => line.join(" "))
      .join("\n"),
  );

  var parseResult = new ParseResult({ pages });

  let lastTransformation: (typeof transformations)[number] | undefined,
    transformations = [
      new CalculateGlobalStats(),
      new CompactLines(),
      new RemoveRepetitiveElements(),
      new VerticalToHorizontal(),
      new DetectTOC(),
      new DetectHeaders(),
      new DetectListItems(),

      new GatherBlocks(),
      new DetectCodeQuoteBlocks(),
      new DetectListLevels(),

      new ToTextBlocks(),
      new ToHTML(),
    ];

  transformations?.forEach((transformation) => {
    if (lastTransformation) {
      parseResult = lastTransformation.completeTransform(parseResult);
    }
    parseResult = transformation.transform(parseResult);
    lastTransformation = transformation;
  });

  var pageHtmls = parseResult.pages.map(
    (page, pageNumber) =>
      `<p id="page-${pageNumber + 1}">${
        addPageNumbers ? ` [${pageNumber + 1}] ` : ""
      }${page.items.join('</p><p id="page-' + pageNumber + '">')}</p>`,
  );

  // Regex scan flagging pages with infographics/figures/tables (or no usable
  // text layer) — the pages worth OCR'ing in hybrid mode.
  const ocrScan = scanPagesForOCR(pageTexts, options.ocrScanOptions);

  if (processorMode === "docling" || processorMode === "hybrid") {
    const targetPages =
      processorMode === "docling"
        ? pageHtmls.map((_, index) => index + 1)
        : ocrScan.pagesNeedingOcr;
    const ocrResults = await ocrPdfPagesWithDocling(
      pdfDocument,
      targetPages,
      doclingOptions,
    );
    // Pages whose OCR failed keep their frontend-parsed HTML.
    for (const [pageNumber, ocrHtml] of ocrResults)
      pageHtmls[pageNumber - 1] = `<section class="ocr-page" id="page-${pageNumber}">${
        addPageNumbers ? ` [${pageNumber}] ` : ""
      }${ocrHtml}</section>`;
  }

  var html = pageHtmls.join("");

  if (addCitation) {
    // Get metadata
    // avoid using date as it is unreliable sand generally file mod date
    var metadata = await pdfDocument.getMetadata();
    var { Author: author, Title: title } = metadata.info as any;
    // date =
    //   date.slice(2, 6) + "-" + date.slice(6, 8) + "-" + date.slice(8, 10);
    // date = date ? new Date(date)?.toISOString().split("T")[0] : null;

    //look for date in first page
    // date = chrono
    //   .parseDate(content.slice(0, 400))
    //   ?.toISOString()
    //   .split("T")[0];
    // //  || date;

    title = html.slice(0, 400).match(/<h[0-9]>(.*?)<\/h[0-9]>/)?.[1] || title;
  }

  return {
    author,
    title,
    html,
    format: "pdf",
    processor: processorMode,
    ocrScan,
  } as {
    author?: string;
    title?: string;
    html: string;
    format: string;
    processor: string;
    ocrScan: OcrScanResult;
  };
}

export { convertPDFToHTMLWithLiteParse };
export type { LiteParseHTMLOptions } from "./liteparse-to-html";
export { convertPDFToHTMLWithLiteParseWasm };
export type { LiteParseWasmHTMLOptions } from "./liteparse-wasm-to-html";
export { detectPdfNeedsOcr } from "./detect-needs-ocr";
export type {
  DetectPdfNeedsOcrOptions,
  PdfOcrAssessment,
} from "./detect-needs-ocr";
export { scanPagesForOCR } from "./ocr-page-scan";
export type {
  OcrScanResult,
  PageOcrScan,
  ScanPagesForOCROptions,
} from "./ocr-page-scan";
export {
  doctagsToHtml,
  ocrImageWithDocling,
  ocrPdfPagesWithDocling,
  renderPdfPageToPngBase64,
} from "./docling-ocr";
export type { DoclingOcrOptions } from "./docling-ocr";
export { loadPdfJs } from "./utils/load-pdfjs";

