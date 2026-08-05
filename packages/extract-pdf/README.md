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

### Return value

```ts
{ html: string, title?: string, author?: string, format: "pdf" }
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
     string-functions.ts
     page-item-functions.ts
     page-number-functions.ts
```
