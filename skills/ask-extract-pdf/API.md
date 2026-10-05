# extract-pdf API Reference

## `convertPDFToHTML(pdfURLOrBuffer, options?)`

`pdfURLOrBuffer`: a URL string, or a `Buffer`/`ArrayBuffer`/`Uint8Array`.

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `method` | `ParseMethod` | `"ts-block-algorithm"` | Parsing engine (see below) |
| `processor` | `ProcessorMode` | `"frontend"` | Where OCR happens (see below) |
| `processorUrl` | `string` | — | Remote docling-compatible API base URL |
| `addPageNumbers` | `boolean` | `false` | Append a visible `#` per page |
| `removePageHeaders` | `boolean` | `true` | Drop headers repeated across pages |
| `addCitation` | `boolean` | `true` | Include citation metadata |
| `ocrScanOptions` | `ScanPagesForOCROptions` | — | Hybrid page-scan thresholds |
| `doclingOptions` | `Omit<DoclingOcrOptions, "processorUrl">` | — | Model prompt / tokens / scale |
| `liteParseOptions` | — | — | Forwarded when `method` is a LiteParse mode |

Returns the HTML string (or an object, for the LiteParse paths).

### `ParseMethod`

| Value | Engine | Environments | Optional dependency |
| --- | --- | --- | --- |
| `"ts-block-algorithm"` | Local TS pipeline over pdfjs text spans | Node, Workers, browser | — |
| `"liteparse"` | LiteParse native | **Node only** | `@llamaindex/liteparse` |
| `"liteparse-wasm"` | LiteParse WASM | Node, Workers, browser | `@llamaindex/liteparse-wasm` (+ your own `ocrEngine` for OCR) |

### `ProcessorMode`

`"frontend"` | `"hybrid"` | `"docling"` | any `http(s)://` processor URL.

### `DoclingOcrOptions`

| Option | Default | Meaning |
| --- | --- | --- |
| `processorUrl` | — | POST page images to `{url}/api/v1/convert-base64` instead of running locally |
| `processorHeaders` | — | Extra headers for those requests, e.g. `{ "X-Docling-Token": "…", Authorization: "Bearer hf_…" }` |
| `prompt` | `"Convert this page to docling."` | Model instruction |
| `maxTokens` | `4096` | Tokens generated per page |
| `scale` | `2` | Rasterization scale (1 = 72 DPI) |

Model: `granite-docling-258M` (ONNX, fp32), loaded once and cached, via the optional
`@huggingface/transformers` dependency.

## Other exports

| Export | Purpose |
| --- | --- |
| `detectPdfNeedsOcr(input, opts)` → `PdfOcrAssessment` | Decide up front whether OCR is warranted |
| `scanPagesForOCR(pages, opts)` → `OcrScanResult` (`PageOcrScan[]`) | The hybrid mode's per-page flagging |
| `ocrImageWithDocling(imageBase64, opts)` | OCR a single image → raw doctags |
| `ocrPdfPagesWithDocling(...)` | OCR selected pages |
| `renderPdfPageToPngBase64(...)` | Rasterize one page |
| `doctagsToHtml(doctags)` | Docling doctags → HTML |
| `loadPdfJs()` | The lazily loaded pdfjs-serverless instance |
| `convertPDFToHTMLWithLiteParse`, `LiteParseHTMLOptions` | Direct LiteParse entry |
| `convertPDFToHTMLWithLiteParseWasm`, `LiteParseWasmHTMLOptions` | Direct LiteParse WASM entry |

## Pipeline internals (`src/transforms/`)

Line-item stage: `CalculateGlobalStats` → `CompactLines` → `RemoveRepetitiveElements` →
`VerticalToHorizontal` → `DetectTOC` → `DetectListItems` → `DetectHeaders`.
Block stage: `GatherBlocks` → `DetectCodeQuoteBlocks` → `DetectListLevels` →
`ToTextBlocks` → `ToHTML`.

Models: `Page`, `PageItem`, `TextItem`, `LineItem`, `LineItemBlock`, `Word`,
`Annotation`, `Metadata`, `ParseResult`, `HeadlineFinder`, `TextItemLineGrouper`,
`StashingStream`. Heading level comes from standard deviation of text height against
the document mean, computed in `CalculateGlobalStats`.

## Bundled OCR server (`server/`)

`bun run serve:docling` (or `dev:docling` for watch). Hono + `@hono/zod-openapi` with
Swagger UI, and its own `wrangler.jsonc` for deploying to Cloudflare.

| Route | Purpose |
| --- | --- |
| `GET /health` | `{ status, modelLoaded, uptime, version }` |
| `POST /api/v1/convert` | Convert by image URL |
| `POST /api/v1/convert-base64` | Convert a base64 image — the endpoint `processorUrl` targets |

Body fields: `imageUrl`/image data, `prompt`, `maxTokens`, `streaming`.

## Hugging Face Space (`docling-space/`)

The same model packaged as a Docker Space (port 7860), deployed on its own and not
published to npm. `server/model.js` is copied into it; a test fails if they drift.

| Route | Purpose |
| --- | --- |
| `GET /health` | `{ status, modelLoaded, loading, busy, queueDepth, uptime, limits }`, no auth |
| `GET`/`POST /api/v1/warmup` | No auth. Starts the model load and answers at once (202 loading, 200 ready). Also runs at boot unless `DOCLING_WARMUP_ON_START=false` |
| `POST /api/v1/convert`, `/api/v1/convert-base64` | One page image → `result`: a raw `image/*` body (options in the query) or JSON `imageUrl` / `imageBase64` |

`output: "doctags"` (default, what `processorUrl` expects) or `"html"` (sanitized with
`sanitize-html`). Auth is `X-Docling-Token` (or `Authorization: Bearer`) against the
`DOCLING_API_TOKEN` secret; without the secret, production answers 503. One job runs
at a time; past `DOCLING_MAX_QUEUE` (8) it answers 503 `BUSY`. Images are decoded in
memory and never stored; responses are `Cache-Control: no-store`.

## Scripts

`bun run build` (vite) · `bun test` (**bun test**, not vitest) ·
`bun run test:coverage` · `bun run ship`.
