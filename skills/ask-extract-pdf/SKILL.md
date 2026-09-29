---
name: ask-extract-pdf
description: Guide to extract-pdf (packages/extract-pdf), the PDF-to-structured-HTML converter — convertPDFToHTML() and its two independent switches, `method` (ts-block-algorithm / liteparse / liteparse-wasm) and `processor` (frontend / hybrid / docling / a processor URL), the Granite Docling OCR path and its optional dependencies, the page-scan heuristics, and the bundled Hono OCR server. Use when a PDF converts to empty or mangled HTML, when headings/lists/code blocks come out wrong, when scanned or table-heavy pages need OCR, or when the package fails to load in Cloudflare Workers or the browser.
---

# Working With extract-pdf

`packages/extract-pdf`, published as **extract-pdf**. Converts a PDF URL or buffer into
HTML with real structure — headings inferred from text-height statistics, lists,
footnotes linked to their anchors, code and quote blocks, repeated headers removed, and
each page number preserved in an invisible `<i>`. Slim by default: PDF.js is loaded at
runtime from the `pdfjs-serverless` CDN build, so it works in Node, Cloudflare Workers
and browsers. Options table: [API.md](API.md).

## Setup

```ts
import { convertPDFToHTML } from "extract-pdf";

const html = await convertPDFToHTML("https://example.com/paper.pdf");
const html2 = await convertPDFToHTML(await fs.readFile("paper.pdf"));
```

The only runtime dependency is `grab-url`. Everything OCR-related
(`@huggingface/transformers`) and both LiteParse engines
(`@llamaindex/liteparse`, `@llamaindex/liteparse-wasm`) are **optional** — install them
only if you select that path.

## Two independent switches

`method` chooses the *parser*; `processor` chooses *where OCR happens*. They are not
alternatives to each other.

| `method` | Engine | Runs on |
| --- | --- | --- |
| `"ts-block-algorithm"` *(default)* | This package's own TS pipeline over pdfjs text spans | Node, Workers, browsers |
| `"liteparse"` | LiteParse native (napi addon) | **Node only** |
| `"liteparse-wasm"` | LiteParse WebAssembly | Anywhere WASM runs; OCR needs an `ocrEngine` callback |

| `processor` | Behaviour |
| --- | --- |
| `"frontend"` *(default)* | Pure JS text layer, no OCR, no model |
| `"hybrid"` | Every page through the JS pipeline, then `scanPagesForOCR` regex-flags pages with infographics/figures/tables (or no usable text layer) and only those are re-done with Granite Docling |
| `"docling"` | Every page rasterized and OCR'd with Granite Docling |
| an `http(s)://` URL | Like `"docling"`, but pages are POSTed to that processor instead of running in-process |

Setting `method: "liteparse"` short-circuits the whole file: the `processor`,
`ocrScanOptions` and `doclingOptions` options are forwarded to LiteParse rather than
driving this package's OCR path.

## Picking the right call

| You want | Call |
| --- | --- |
| Text-layer PDF → HTML | `convertPDFToHTML(urlOrBuffer)` |
| OCR only the pages that need it | `convertPDFToHTML(x, { processor: "hybrid" })` |
| OCR everything, remotely | `convertPDFToHTML(x, { processor: "https://your-ocr" })` |
| Ask first whether OCR is worth it | `detectPdfNeedsOcr(x, opts)` → `PdfOcrAssessment` |
| The per-page scan on its own | `scanPagesForOCR(pages, opts)` → `OcrScanResult` |
| OCR one image | `ocrImageWithDocling(imageBase64, opts)` |
| OCR chosen pages | `ocrPdfPagesWithDocling(...)` |
| A page as a PNG | `renderPdfPageToPngBase64(...)` |
| Docling doctags → HTML | `doctagsToHtml(doctags)` |
| The pdfjs instance | `loadPdfJs()` |
| Host the OCR model yourself | `bun run serve:docling` (`server/`) — Hono + `@hono/zod-openapi`, Swagger UI, `/api/v1/convert-base64`, `/health` |
| Host it on Hugging Face | `docling-space/` — Docker Space with token auth and a one-job queue; see its README |

## Recipes

**Point at your own OCR service.** Deploy `server/` (it has its own `wrangler.jsonc`),
or `docling-space/` as a Hugging Face Docker Space, then pass `processor: "https://…"`
or `processorUrl`. The client POSTs base64 page images to
`{processorUrl}/api/v1/convert-base64`; auth headers go in
`doclingOptions.processorHeaders` (the Space wants `X-Docling-Token`, plus
`Authorization: Bearer hf_…` when it is private).

**Answer fast, OCR later.** `"hybrid"` waits for every flagged page. For an instant
result, run `"frontend"`, return its HTML, and OCR `ocrScan.pagesNeedingOcr`
afterwards. The Workers demo (`demo/`) does this: Workers have no canvas, so the
browser rasterizes the flagged pages and the Worker forwards each image to the Space.

**Tune the hybrid scan.** `ocrScanOptions` (see `ScanPagesForOCROptions`) sets the
thresholds that decide "this page looks like a figure/table". Widen them before
reaching for full `"docling"` — OCR'ing every page is the expensive option.

**Tune the model.** `doclingOptions`: `prompt` (default `"Convert this page to
docling."`), `maxTokens` (default `4096`), `scale` (default `2`, i.e. 144 DPI).

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| Empty or near-empty HTML | A scanned PDF with no text layer. `"frontend"` cannot see it — use `"hybrid"` or `"docling"`. |
| `Cannot find module '@huggingface/transformers'` | The in-process OCR model is an optional dependency. Install it, or set `processorUrl` and run the model remotely. |
| `@llamaindex/liteparse` not found, or a napi error on Workers | `method: "liteparse"` is Node-only and ships a native addon. Use `"liteparse-wasm"` or the default. |
| `liteparse-wasm` produces no OCR text | The WASM build does not bundle an OCR engine — pass an `ocrEngine` callback (e.g. tesseract-js). |
| Headings are wrong or missing | Heading level is inferred from standard deviation of text height, so a PDF with uniform font sizes yields none. `DetectHeaders`/`CalculateGlobalStats` in `src/transforms/` are where to tune. |
| Repeated page headers still appear | `removePageHeaders` defaults to `true` but works by finding text repeated across pages — a two-page PDF gives it nothing to compare. |
| Page numbers appear in the text | They are emitted as invisible `<i>` markers on purpose. `addPageNumbers` (default `false`) adds visible `#` marks. |
| OCR is very slow | `"docling"` rasterizes and runs a vision model on *every* page. Use `"hybrid"`, or lower `doclingOptions.scale`. |
| Fails at import time in a bundler | PDF.js is fetched at runtime from the CDN build, not bundled. Do not try to pre-bundle `pdfjs-serverless`; ensure the runtime can reach it. |
| `bun test` passes but `vitest` finds nothing | This package runs on **bun test**, not vitest, and is deliberately absent from the root vitest projects. |
