# extract-pdf

Converts a PDF (URL or `ArrayBuffer`) into clean HTML with structural tagging — headings, lists, footnotes, code blocks, bold/italic, and Table of Contents entries. Works in Node.js, Cloudflare Workers, and browser environments via [pdfjs-serverless](https://github.com/johannschopplich/pdfjs-serverless).

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

| Option           | Default | Description                                                                                |
| ---------------- | ------- | ------------------------------------------------------------------------------------------ |
| `addPageNumbers` | `false` | Inserts `[n]` markers at each page boundary                                                |
| `addCitation`    | `true`  | Reads PDF metadata and first-page heading to populate `title`/`author` in the return value |

### Return value

```ts
{ html: string, title?: string, author?: string, format: "pdf" }
```

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
