<p align="center">
<br /> 
    <a href="https://www.npmjs.com/package/extract-pdf"><img src="https://img.shields.io/npm/dm/extract-pdf.svg" alt="NPM Monthly Downloads"></a>
    <a href="https://www.npmjs.com/package/extract-pdf"><img src="https://img.shields.io/npm/v/extract-pdf.svg" alt="npm version"></a>
    <a href="https://discord.gg/SJdBqBz3tV">
        <img src="https://img.shields.io/discord/1110227955554209923.svg?label=Chat&logo=Discord&colorB=7289da&style=flat"
            alt="Join Discord" />
    </a>  
     <a href="https://github.com/vtempest/qwksearch-research-agent/discussions">
     <img alt="GitHub Stars" src="https://img.shields.io/github/stars/vtempest/qwksearch-research-agent" /></a>
<br />
    <a href="https://github.com/vtempest/qwksearch-research-agent/discussions">
    <img alt="GitHub Discussions"
        src="https://img.shields.io/github/discussions/vtempest/qwksearch-research-agent" />
    </a>
    <a href="https://github.com/vtempest/qwksearch-research-agent/pulse" alt="Activity">
        <img src="https://img.shields.io/github/commit-activity/m/vtempest/qwksearch-research-agent" />
    </a>
    <img src="https://img.shields.io/github/last-commit/vtempest/qwksearch-research-agent.svg" alt="GitHub last commit" />
<br />
    <a href="https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request">
        <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"
            alt="PRs Welcome" />
    </a>
    <a href="https://codespaces.new/vtempest/qwksearch-research-agent">
    <img src="https://github.com/codespaces/badge.svg" width="150" height="20" />
    </a>
</p>

# extract-pdf


> **When users upload a PDF, they expect an instant chat response, not to wait for 5 min on OCR model.**

Instant no-backend-needed javascript to convert a PDF (URL or `ArrayBuffer`) into clean HTML with structural tagging — headings, lists, footnotes, code blocks, bold/italic, and Table of Contents entries. Works in Node.js, Cloudflare Workers, and browser environments via [pdfjs-serverless](https://github.com/johannschopplich/pdfjs-serverless).

**Slim by default:** the package bundles no PDF engine. PDF.js is loaded lazily at runtime from jsDelivr's ESM build of `pdfjs-serverless` (`https://cdn.jsdelivr.net/npm/pdfjs-serverless@1/+esm`, pinned to the major version) — a zero-dependency, single ~1.6 MB minified redistribution of Mozilla PDF.js built for serverless/edge runtimes. Node.js and Bun can't import remote URLs, so there the loader falls back to the locally-installed `pdfjs-serverless` optional dependency. Everything OCR-related (Granite Docling via `@huggingface/transformers`, `@napi-rs/canvas`) is likewise optional and imported only when actually used.

For OCR-grade fidelity on pages with infographics, charts, and tables, the package also ships the Granite Docling path (merged from the former `extract-pdf-docling` package): run all pages through the frontend JS parser, all pages through Docling OCR, a **hybrid** mode that regex-scans pages and OCRs only the ones that need it, or point at the URL of a remote docling-compatible processor (see `server/`).

## Install 

```sh
bun add extract-pdf
```

## Usage

```ts
import { convertPDFToHTML } from "extract-pdf";

const { html, title, author } = await convertPDFToHTML(
  "https://example.com/paper.pdf",
);
// or pass an ArrayBuffer from fs.readFile / fetch
const { html } = await convertPDFToHTML(buffer, { addPageNumbers: true });
```

### Options

| Option            | Default               | Description                                                                                |
| ----------------- | ---------------------- | ------------------------------------------------------------------------------------------ |
| `addPageNumbers`  | `false`                | Inserts `[n]` markers at each page boundary                                                |
| `addCitation`     | `true`                 | Reads PDF metadata and first-page heading to populate `title`/`author` in the return value |
| `method`          | `"ts-block-algorithm"` | Parsing engine — `"ts-block-algorithm"`, `"liteparse"`, or `"liteparse-wasm"` (see below)   |
| `liteParseOptions`| `{}`                   | Passed through to LiteParse's constructor when `method` is `"liteparse"` or `"liteparse-wasm"` |
| `processor`       | `"frontend"`           | Where OCR happens — `"frontend"`, `"hybrid"`, `"docling"`, or a processor URL (see below)   |
| `processorUrl`    | —                      | Remote docling-compatible API used by `"hybrid"`/`"docling"` instead of the in-process model |
| `ocrScanOptions`  | `{}`                   | Threshold tuning for the hybrid page scan (`scanPagesForOCR`)                              |
| `doclingOptions`  | `{}`                   | `prompt`, `maxTokens`, `scale` for the Docling OCR model                                   |

### Return value

```ts
{ html: string, title?: string, author?: string, format: "pdf",
  processor: string, ocrScan: OcrScanResult }
```

## Parse methods

`convertPDFToHTML` supports three interchangeable parsing engines via `options.method`:

| Method                              | Engine                                                              | Environments                       | OCR |
| ------------------------------------ | -------------------------------------------------------------------- | ----------------------------------- | --- |
| `"ts-block-algorithm"` (default)     | The pure-TS pipeline documented below (this package)                  | Node.js, Cloudflare Workers, browser | No  |
| `"liteparse"`                        | [LiteParse](https://github.com/run-llama/liteparse) (native, `@llamaindex/liteparse`) | Node.js only                        | Optional |
| `"liteparse-wasm"`                   | [LiteParse](https://github.com/run-llama/liteparse) (WASM, `@llamaindex/liteparse-wasm`) | Node.js, Cloudflare Workers, browser | Optional (via callback) |

```ts
import { convertPDFToHTML } from "extract-pdf";

const { html } = await convertPDFToHTML(buffer, { method: "liteparse" });

// Or the WASM build, which also runs in browsers and Cloudflare Workers:
const { html } = await convertPDFToHTML(buffer, { method: "liteparse-wasm" });
```

LiteParse ships a native (napi) addon, so `method: "liteparse"` only runs in
Node.js — it is not bundled into browser or Cloudflare Workers builds. Install
it explicitly (`bun add @llamaindex/liteparse`) since it's an optional
dependency; if it isn't installed, `convertPDFToHTML` returns `{ error }`
instead of throwing.

`method: "liteparse-wasm"` delegates to LiteParse's WebAssembly build instead,
which runs anywhere WASM does — browsers, Cloudflare Workers, and Node.js.
Install it explicitly (`bun add @llamaindex/liteparse-wasm`) since it's also
an optional dependency; if it isn't installed, `convertPDFToHTML` returns
`{ error }` instead of throwing. The WASM build has no OCR engine built in —
pass a `liteParseOptions.ocrEngine` callback (e.g. backed by `tesseract-js`)
to enable OCR.

By default both LiteParse paths run with OCR disabled (`ocrEnabled: false`) —
matching this package's "instant, no backend" philosophy. Use
`detectPdfNeedsOcr` (below) to decide when a document is worth re-parsing with
`liteParseOptions: { ocrEnabled: true }`.

## Processor modes: frontend, hybrid, Docling OCR, or a remote URL

Separately from `method`, the `processor` option decides whether pages go
through the [Granite Docling](https://huggingface.co/ibm-granite/granite-docling-258M)
OCR model — which preserves layout, tables, charts, code, and formulas at the
cost of model inference per page:

| `processor`            | What happens                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `"frontend"` (default) | All pages parsed by the pure-JS text-layer pipeline. No OCR, no model, instant.                           |
| `"hybrid"`             | JS pipeline everywhere + a regex scan (`scanPagesForOCR`) flags pages with infographics/figures/tables or no usable text layer; only those pages are rasterized and OCR'd with Docling. |
| `"docling"`            | Every page rasterized and OCR'd with Docling.                                                             |
| `"https://..."` (URL)   | Like `"docling"`, but every page is POSTed to that docling-compatible processor API instead of running the model in-process. |

```ts
// Hybrid: fast JS parse, OCR only the pages that need it
const { html, ocrScan } = await convertPDFToHTML(buffer, { processor: "hybrid" });
console.log(ocrScan.pagesNeedingOcr); // e.g. [3, 7] — pages with tables/figures
// each ocrScan.pages[i] lists reasons: "table-caption", "figure-caption",
// "table-rows", "numeric-grid", "no-text", "sparse-text", "garbled-text"

// All pages through a remote Docling processor (this package's server/):
const { html } = await convertPDFToHTML(buffer, {
  processor: "http://localhost:3000",
});

// Hybrid with the OCR offloaded to a remote processor:
const { html } = await convertPDFToHTML(buffer, {
  processor: "hybrid",
  processorUrl: "http://localhost:3000",
});
```

OCR'd pages are emitted as `<section class="ocr-page" id="page-N">…</section>`
(tables become real `<table>` markup, captions `<figcaption>`, formulas
`<code class="formula">`, …); pages whose OCR fails keep their JS-parsed HTML.

Running Docling **in-process** requires the optional `@huggingface/transformers`
dependency (the ONNX model `onnx-community/granite-docling-258M-ONNX`, ~1 GB,
downloads on first use) and — in Node.js — `@napi-rs/canvas` for page
rasterization (browsers/Workers use `OffscreenCanvas`).

The regex scanner is also exported standalone, and so are the OCR helpers:

```ts
import { scanPagesForOCR, doctagsToHtml, ocrImageWithDocling } from "extract-pdf";

const scan = scanPagesForOCR(pageTexts); // string[] of per-page text
// { needsOcr, pagesNeedingOcr: number[], pages: [{ page, reasons, captions }] }
```

### Running the Docling processor server

The `server/` folder contains the Hono HTTP API (formerly the
`extract-pdf-docling` package) exposing the Granite Docling model:

```sh
bun run serve:docling   # or dev:docling for --watch; port 3000
```

- Swagger UI: `http://localhost:3000/docs`, spec at `/openapi.json`
- `POST /api/v1/convert` — `{ imageUrl, prompt?, maxTokens? }`
- `POST /api/v1/convert-base64` — `{ imageBase64, mimeType?, prompt?, maxTokens? }`
- `POST /api/v1/convert-stream` — SSE token stream
- `GET /health`

A `server/wrangler.jsonc` is included for deploying it as a Cloudflare Worker.
Any deployment of it (or any API with the same contract) can be passed as the
`processor`/`processorUrl` option above.

## Detecting whether a PDF needs OCR

Before committing to a full (and potentially slow) OCR parse, `detectPdfNeedsOcr`
runs a cheap, text-layer-only pass and reports whether each page needs OCR or
other heavy parsing — useful for routing documents to different pipelines
(fast path vs. OCR vs. screenshots vs. a heavier parser like LlamaParse or
Docling):

```ts
import { detectPdfNeedsOcr, convertPDFToHTML } from "extract-pdf";

const assessment = await detectPdfNeedsOcr(buffer);
// { needsOcr: boolean, pages: PageComplexityStats[], reasons: string[] }

if (!assessment.needsOcr) {
  const { html } = await convertPDFToHTML(buffer, { method: "liteparse" });
} else {
  console.log("Needs OCR:", assessment.reasons); // e.g. ["scanned", "sparse-text"]
  // Route to an OCR-enabled pipeline, e.g.:
  const { html } = await convertPDFToHTML(buffer, {
    method: "liteparse",
    liteParseOptions: { ocrEnabled: true },
  });
}
```

`reasons` collects every distinct signal found across pages: `"scanned"`,
`"no-text"`, `"sparse-text"`, `"embedded-images"`, `"garbled"`, or
`"vector-text"`. Like `method: "liteparse"`, this is Node.js only and requires
`@llamaindex/liteparse`.

## Pipeline

The conversion runs a sequential chain of transformations on a `ParseResult` (pages → items):

```
Raw pdfjs text spans
  → CalculateGlobalStats   — font heights, distances, format map
  → CompactLines           — merge spans on the same y-line into LineItems
  → RemoveRepetitiveElements — strip recurring page headers/footers
  → VerticalToHorizontal   — rotate vertical character runs
  → DetectTOC              — identify Table of Contents pages, link headings
  → DetectHeaders          — classify items as H1–H6 by font height
  → DetectListItems        — detect bullet/numbered list items
  → GatherBlocks           — group adjacent same-type lines into blocks
  → DetectCodeQuoteBlocks  — mark indented blocks as CODE
  → DetectListLevels       — add indentation for nested list levels
  → ToTextBlocks           — flatten blocks to { category, text } pairs
  → ToHTML                 — render pairs as <p>, <h1>–<h6>, <ul>, <code>
```

## Folder structure

```
src/
  pdf-to-html.ts          — main entry point (convertPDFToHTML)
  liteparse-to-html.ts    — "liteparse" method (native napi addon)
  liteparse-wasm-to-html.ts — "liteparse-wasm" method (WASM, browser/edge)
  ocr-page-scan.ts        — regex scan flagging infographic/table pages for OCR
  docling-ocr.ts          — Granite Docling OCR (local ONNX or remote URL),
  │                         page rasterization, doctags → HTML
  detect-needs-ocr.ts     — LiteParse-based OCR routing (Node.js only)
  models/                 — data classes: Page, ParseResult, TextItem,
  │                         LineItem, LineItemBlock, Word, BlockType, …
  transforms/
  │  base/                — abstract Transformation, ToLineItem*, ToLineItemBlock*
  │  line-item/           — per-line-item transformations
  │  block/               — per-block transformations
  │  calculate-global-stats.ts
  │  to-text-blocks.ts
  │  to-html.ts
  utils/
     load-pdfjs.ts        — lazy CDN loader for pdfjs-serverless
     string-functions.ts
     page-item-functions.ts
     page-number-functions.ts
server/                   — Granite Docling HTTP processor (Hono):
   server.js, routes.js, schemas.js, model.js, wrangler.jsonc
```
