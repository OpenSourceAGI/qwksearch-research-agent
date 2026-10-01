# extract-pdf: Cloudflare Workers demo

A small Cloudflare Worker that runs [`extract-pdf`](../README.md) at the edge. It serves:

- **`/`**: an upload page. Drop in a PDF or paste a URL, then view the result as rendered HTML or as source, and copy or download it.
- **`/api/convert`**: a JSON API that turns a PDF into structured HTML with headings, lists, footnotes, code blocks and TOC.

It uses the default `ts-block-algorithm` parser with `processor: "frontend"`. That path reads only the PDF text layer and needs no OCR, no model and no native code, so it runs entirely inside the Workers runtime.

Optionally it can enhance the pages that path handles badly (scans, tables, figures) with Granite Docling OCR running on a [Hugging Face Space](../docling-space). The fast result never waits for it; see [OCR follow-up](#ocr-follow-up-optional).

```
demo/
├── package.json        # extract-pdf + pdfjs-serverless, wrangler as dev dep
├── wrangler.jsonc      # Worker config (aliases, vars, optional CPU limit)
└── src/
    ├── worker.js       # routes + request parsing, OCR forwarding
    ├── page.js         # the HTML demo page (renders flagged pages for OCR)
    └── unsupported.js  # stub for Node-only optional engines
```

## How it stays Workers-compatible

| Concern | What the demo does |
| --- | --- |
| **PDF.js** | `extract-pdf` first tries to `import()` PDF.js from jsDelivr. Workers don't allow runtime imports of remote code, so that fails and it falls back to the `pdfjs-serverless` npm package. The demo lists that package as a dependency so Wrangler bundles it. |
| **Heavy optional engines** | LiteParse (napi addon), Granite Docling (`@huggingface/transformers`, about 1 GB of ONNX model) and `@napi-rs/canvas` can't run on Workers. `wrangler.jsonc` → `alias` points them at `src/unsupported.js`, so they aren't bundled. Selecting one returns an error. |
| **Node globals** | `compatibility_flags: ["nodejs_compat"]` covers what the `grab-url` helper touches. |
| **Bundle size** | About 2.5 MB raw and about 600 KB gzipped, well under the 3 MB (Free) and 10 MB (Paid) compressed limits. |
| **Request size** | Uploads and fetched URLs are capped by the `MAX_PDF_MB` var (default 15). The body is streamed and aborted once it passes the cap. |

## Prerequisites

- Node.js 18+ (or Bun)
- A Cloudflare account (the free tier is enough to try it, but see [CPU limits](#cpu-limits-free-vs-paid))
- Wrangler, installed locally by `npm install`. It logs in with `npx wrangler login`.

## 1. Run it locally

```sh
cd packages/extract-pdf/demo
npm install
npm run dev          # wrangler dev → http://localhost:8787
```

`wrangler dev` runs the Worker in `workerd`, the same runtime as production, so a PDF that converts locally will also convert once deployed, as long as it stays within the CPU limits.

Try the API:

```sh
# Upload a file
curl -F file=@paper.pdf http://localhost:8787/api/convert

# Raw PDF body, with page-number markers
curl -X POST -H 'Content-Type: application/pdf' --data-binary @paper.pdf \
  'http://localhost:8787/api/convert?addPageNumbers=true'

# Remote URL
curl 'http://localhost:8787/api/convert?url=https://arxiv.org/pdf/1706.03762'
curl -X POST -H 'Content-Type: application/json' \
  -d '{"url":"https://arxiv.org/pdf/1706.03762"}' http://localhost:8787/api/convert
```

Response:

```json
{
  "source": "https://arxiv.org/pdf/1706.03762",
  "status": "ready",
  "title": "…",
  "author": "…",
  "html": "<p id=\"page-1\">…",
  "bytes": 2215244,
  "ms": 1377,
  "ocr": {
    "needed": true,
    "pageCount": 15,
    "pagesNeedingOcr": [3, 7],
    "reasons": { "3": ["table-caption", "numeric-grid"], "7": ["sparse-text", "figure-caption"] },
    "enhance": null
  }
}
```

`ocr` is the text-layer scan (`scanPagesForOCR`): the pages that look scanned or carry tables and figures, and why. `status` is `"ready_with_pending_ocr"` when pages were flagged and OCR is configured, in which case `enhance` is `{ "endpoint": "/api/enhance", "maxPages": 10 }`.

Errors come back as `{ "error": "…" }` with status 400 (bad input), 413 (too large), 422 (unparseable PDF) or 502 (the URL couldn't be fetched).

## 2. Check the bundle (optional)

```sh
npm run build        # wrangler deploy --dry-run --outdir dist
```

This bundles the Worker exactly as a deploy would, without uploading anything, and prints the total and gzipped size. Run it after changing dependencies.

## 3. Deploy to Cloudflare

```sh
npx wrangler login   # opens a browser once
npm run deploy       # wrangler deploy
```

Wrangler prints the URL, e.g. `https://extract-pdf-demo.<your-subdomain>.workers.dev`. Open it and the upload page is live.

To change the Worker name (and so the subdomain), edit `"name"` in `wrangler.jsonc`.

### Deploy from CI (GitHub Actions)

1. In the Cloudflare dashboard, go to **My Profile → API Tokens → Create Token** and use the **Edit Cloudflare Workers** template.
2. Add two repository secrets: `CLOUDFLARE_API_TOKEN` (the token) and `CLOUDFLARE_ACCOUNT_ID` (shown on the Workers & Pages overview page).
3. Add a workflow:

```yaml
# .github/workflows/extract-pdf-demo.yml
name: Deploy extract-pdf demo
on:
  push:
    branches: [master]
    paths: ["packages/extract-pdf/demo/**"]
  workflow_dispatch:
jobs:
  deploy:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: packages/extract-pdf/demo
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm install
      - run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

### Deploy from the dashboard (Workers Builds)

**Workers & Pages → Create → Import a repository**, pick this repo, then set:

- **Root directory:** `packages/extract-pdf/demo`
- **Build command:** `npm install`
- **Deploy command:** `npx wrangler deploy`

Every push to the production branch then redeploys the demo.

## 4. Custom domain (optional)

Your domain must be on Cloudflare (a zone in the same account). Add to `wrangler.jsonc`:

```jsonc
"routes": [
  { "pattern": "pdf.example.com", "custom_domain": true }
]
```

and run `npm run deploy` again. Cloudflare creates the DNS record and the certificate. To stop exposing the `*.workers.dev` URL, also set `"workers_dev": false`.

## CPU limits: Free vs. Paid

Parsing is CPU-bound: PDF.js decodes every page and the block algorithm runs over every text item. For scale, the 15-page *Attention Is All You Need* paper (2.2 MB) takes about 1.4 s in `wrangler dev`.

| Plan | CPU per request | What that means here |
| --- | --- | --- |
| **Free** | 10 ms | Enough only for very small PDFs. Most real documents fail with *"Worker exceeded CPU time limit"* (error 1102). |
| **Paid** ($5/mo) | 30 s by default, configurable up to 5 min | Comfortable for normal papers and reports. |

On the Paid plan, uncomment the limit in `wrangler.jsonc` to set your own ceiling:

```jsonc
"limits": { "cpu_ms": 30000 }
```

The Free plan rejects this setting on deploy, which is why it ships commented out. Waiting on network I/O (such as downloading a PDF from a URL) doesn't count toward CPU time.

Other platform limits worth knowing: request bodies are capped at 100 MB (Free/Pro), and memory is 128 MB per isolate. Keep `MAX_PDF_MB` well below what fits in memory, since the PDF bytes, PDF.js's parsed objects and the output HTML are all held at once.

## OCR follow-up (optional)

Workers have no canvas, so they can't rasterize pages, and a vision model is far too slow to run inside a request anyway. The demo splits the work:

1. `POST /api/convert` returns the text-layer HTML immediately, plus the pages the scan flagged.
2. The page renders only those pages to PNG in the browser with PDF.js (for a URL source it re-reads the PDF through `GET /api/source?url=…`).
3. It sends each image to `POST /api/enhance` (`{ "page": 3, "imageBase64": "…" }`). The Worker forwards it to the Docling processor with the secrets, and returns `{ page, html, ms }` with sanitized HTML.
4. The page swaps each OCR'd page into the result as `<section class="ocr-page" id="page-N">`, one at a time. A page whose OCR fails keeps its text-layer version.

To turn it on, deploy [`../docling-space`](../docling-space) and give the Worker its URL and token:

```sh
npx wrangler secret put DOCLING_PROCESSOR_URL   # https://YOUR_HF_USERNAME-extract-pdf-docling.hf.space
npx wrangler secret put DOCLING_API_TOKEN       # the Space's DOCLING_API_TOKEN secret
npx wrangler secret put HF_SPACE_TOKEN          # private Space only: a Hugging Face read token
```

For `npm run dev`, copy `.dev.vars.example` to `.dev.vars` and point it at a local run of the Space. Without `DOCLING_PROCESSOR_URL` the demo works as before and just reports which pages would benefit from OCR.

This keeps no state: the browser drives the follow-up and holds the result. A multi-user app would move the same steps into a job layer (the PDF and page images in R2, job status in D1, OCR requests on a Queue) and send the Space short-lived signed image URLs instead of base64.

## Configuration

| Setting | Where | Default | Purpose |
| --- | --- | --- | --- |
| `MAX_PDF_MB` | `vars` in `wrangler.jsonc`, or dashboard → Settings → Variables | `15` | Max upload / download size |
| `DOCLING_PROCESSOR_URL` | secret | unset | Docling processor base URL. Unset turns OCR off. |
| `DOCLING_API_TOKEN` | secret | unset | Sent as `X-Docling-Token` |
| `HF_SPACE_TOKEN` | secret | unset | Sent as `Authorization: Bearer`, for a private Space |
| `DOCLING_MAX_PAGES` | var | `10` | Most pages the page will send for OCR per document |
| `DOCLING_MAX_TOKENS` | var | `1500` | `maxTokens` per page |
| `DOCLING_MAX_IMAGE_MB` | var | `8` | Largest page image `/api/enhance` accepts |
| `limits.cpu_ms` | `wrangler.jsonc` | commented out | CPU ceiling (Paid only) |
| `observability.enabled` | `wrangler.jsonc` | `true` | Logs in the dashboard. Use `npm run tail` to stream them live. |

## Hardening a public deployment

The demo is open by default: anyone who finds the URL can make it fetch and parse PDFs on your account. Before sharing it widely:

- **Rate limit** with a [Rate Limiting rule](https://developers.cloudflare.com/waf/rate-limiting-rules/) on `/api/convert`, or with the Workers `ratelimit` binding.
- **Restrict who can use it** with [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/) in front of the Worker, or by checking a shared secret header (`npx wrangler secret put API_KEY`) in `worker.js`.
- **Lock down CORS**: `CORS_HEADERS` in `worker.js` allows `*`. Set it to your site's origin if only your frontend should call the API.
- **Lower `MAX_PDF_MB`** to what you actually need.
- **`/api/enhance` spends your Space's compute.** With OCR configured, anyone who can reach the demo can queue pages on it. Put it behind the same rate limit or Access policy as `/api/convert`.

## Using the local source instead of npm

The demo depends on the published `extract-pdf` package, so it can be copied out of this repo and deployed as-is. To test unreleased changes to `packages/extract-pdf/src`, add two aliases to `wrangler.jsonc` so Wrangler bundles the TypeScript source directly. The second alias is needed because the source files resolve `pdfjs-serverless` from their own directory, not from the demo's `node_modules`:

```jsonc
"alias": {
  "extract-pdf": "../src/pdf-to-html.ts",
  "pdfjs-serverless": "./node_modules/pdfjs-serverless/dist/index.mjs",
  // ...keep the other aliases
}
```

## What's not in the demo

`processor: "hybrid" | "docling"` (or a processor URL) isn't called from the Worker. Those modes rasterize PDF pages to PNG inside `convertPDFToHTML`, which needs a canvas (DOM canvas, `OffscreenCanvas` or `@napi-rs/canvas`), and the Workers runtime has none. The [OCR follow-up](#ocr-follow-up-optional) gets the same result by rasterizing in the browser. On a Node.js host, `processor: "hybrid"` with `processorUrl` and `doclingOptions.processorHeaders` does it in one call.
