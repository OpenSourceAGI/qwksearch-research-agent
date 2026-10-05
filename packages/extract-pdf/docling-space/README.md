---
title: Extract PDF Docling Processor
emoji: 📄
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# extract-pdf Docling processor

Remote [Granite Docling](https://huggingface.co/onnx-community/granite-docling-258M-ONNX) OCR for [`extract-pdf`](https://www.npmjs.com/package/extract-pdf), packaged as a Hugging Face Docker Space.

It takes **one already-rasterized page image** and returns the model's doctags, or sanitized HTML. It never sees a whole PDF. Parsing, deciding which pages need OCR (`scanPagesForOCR`) and rasterizing them stay with the caller, so one long document can't monopolize a small CPU Space.

This folder lives in the `extract-pdf` package so it is versioned with the client that calls it. Only this folder is pushed to the Space.

## API

Three routes. Everything else is a 404.

| Route | Auth | What it does |
| --- | --- | --- |
| `GET /health` | none | `{ status, modelLoaded, loading, busy, queueDepth, uptime, limits }`. Answers immediately. |
| `GET` or `POST /api/v1/warmup` | none | Starts loading the model and answers at once: `202 { modelLoaded: false, loading: true }` while it loads, `200 { modelLoaded: true }` once it is ready. |
| `POST /api/v1/convert` | token | One page image in, doctags or HTML out. |

`/api/v1/convert-base64` is the same handler under the path `extract-pdf`'s `processorUrl` client calls.

**Warmup is on by default.** The Space starts loading the model as soon as it boots (`DOCLING_WARMUP_ON_START=false` turns that off), and the demo page calls warmup when it opens, so a Space that was asleep is loading while the visitor picks a file. Warmup needs no token because it takes no input and does nothing once the model is loaded. A failed load is reported as `loadError` and retried by the next warmup or conversion.

### Convert

Send the image itself as the body, with options in the query string:

```sh
curl -X POST "$SPACE/api/v1/convert?output=html" \
  -H "X-Docling-Token: $DOCLING_API_TOKEN" \
  -H "Content-Type: image/png" --data-binary @page-3.png
```

Or send JSON:

| Field | Default | Notes |
| --- | --- | --- |
| `imageBase64` | | Base64 image, with or without a `data:` prefix. |
| `imageUrl` | | An `http(s)` URL the Space downloads, such as a short-lived signed R2 URL. One of the two is required. |
| `mimeType` | `image/png` | For `imageBase64`. |
| `prompt` | `Convert this page to docling.` | Also a query parameter for a raw body. |
| `maxTokens` | `1500` | Clamped to `DOCLING_MAX_TOKENS`. Also a query parameter. |
| `output` | `doctags` | `doctags` keeps the contract `extract-pdf` expects (it converts to HTML itself). `html` returns sanitized HTML in `result`. Also a query parameter. |

Response: `{ success: true, output, result, doctags, html?, metadata: { processingTime, queueTime, queueDepth } }`. Errors are `{ success: false, error, code }` with 400 (bad input), 401 (token), 413 (too large), 500 (model) or 503 (`BUSY` with `Retry-After`, or `NOT_CONFIGURED`).

HTML output is `extract-pdf`'s own `doctagsToHtml`, passed through `sanitize-html` with a tag allowlist: model output and document content are both untrusted.

### Images are not kept

Each image is read into memory, decoded, run through the model and dropped when the request ends. Nothing is written to disk, cached or logged, and every response carries `Cache-Control: no-store`. The only files the Space writes are the model weights in `/data/.cache/huggingface`. The demo Worker in [`../site`](../site) forwards page images the same way and stores none of them either.

## Configuration

Set these under the Space's **Settings → Variables and secrets**. Spaces pass both to the container as environment variables.

| Name | Kind | Default | Purpose |
| --- | --- | --- | --- |
| `DOCLING_API_TOKEN` | secret | | Required. Callers send it as `X-Docling-Token` (or `Authorization: Bearer`). Without it every model route answers 503. |
| `DOCLING_MAX_TOKENS` | variable | `4096` | Upper bound on `maxTokens`. |
| `DOCLING_MAX_QUEUE` | variable | `8` | Jobs running plus waiting before 503. |
| `DOCLING_MAX_IMAGE_MB` | variable | `10` | Largest image. |
| `DOCLING_WARMUP_ON_START` | variable | `true` | Load the model when the Space boots. `false` waits for the first warmup or conversion. |
| `ALLOWED_ORIGIN` | variable | | Comma-separated origins allowed to call from a browser. Leave unset for server-to-server use. |

`X-Docling-Token` is checked before `Authorization`, so on a **private** Space the caller can send a Hugging Face read token as `Authorization: Bearer hf_…` for Hugging Face's own access check and the service token alongside it.

## Deploy

1. [Create a Space](https://huggingface.co/new-space) named `extract-pdf-docling`, SDK **Docker**, hardware **CPU Basic** to start. Make it private if users upload their own documents.
2. Add the `DOCLING_API_TOKEN` secret (`openssl rand -hex 32`).
3. Optionally attach persistent storage so the model cache in `/data` survives restarts.
4. Push this folder to the Space:

   ```sh
   git clone https://huggingface.co/spaces/YOUR_HF_USERNAME/extract-pdf-docling
   cp -r packages/extract-pdf/docling-space/. extract-pdf-docling/
   cd extract-pdf-docling
   git add . && git commit -m "Deploy Granite Docling processor" && git push
   ```

The Space builds the image, logs `Docling processor listening on port 7860` and starts loading the model. Check on it with:

```sh
curl https://YOUR_HF_USERNAME-extract-pdf-docling.hf.space/api/v1/warmup \
  -H "Authorization: Bearer $HF_TOKEN"     # private Space only
```

## Call it

From `extract-pdf` on a host that can rasterize pages (Node.js with `@napi-rs/canvas`, or a browser):

```js
import { convertPDFToHTML } from "extract-pdf";

const result = await convertPDFToHTML(pdfBytes, {
  processor: "hybrid", // OCR only the pages scanPagesForOCR flags
  processorUrl: "https://YOUR_HF_USERNAME-extract-pdf-docling.hf.space",
  doclingOptions: {
    processorHeaders: {
      "X-Docling-Token": process.env.DOCLING_API_TOKEN,
      Authorization: `Bearer ${process.env.HF_SPACE_TOKEN}`, // private Space only
    },
    maxTokens: 1500,
  },
});
```

The live demo in [`../site`](../site) uses it as a follow-up step: it returns text-layer HTML at once, then the browser renders the flagged pages and the Worker forwards each image here.

## Run locally

```sh
cd packages/extract-pdf/docling-space
ONNXRUNTIME_NODE_INSTALL=skip npm install
DOCLING_API_TOKEN=local-test-token PORT=7860 npm start

curl localhost:7860/health
curl -X POST "localhost:7860/api/v1/convert?output=html" -H "Content-Type: image/png" \
  -H "X-Docling-Token: local-test-token" --data-binary @page-3.png
```

Or build the image exactly as the Space does:

```sh
docker build -t extract-pdf-docling-space .
docker run --rm -p 7860:7860 -e DOCLING_API_TOKEN=local-test-token extract-pdf-docling-space
```

Without `NODE_ENV=production` and without a token, the model routes are open, which is only meant for local development. The image sets `NODE_ENV=production`, so a Space without the secret fails closed.

## Limits

What the Space enforces, per instance:

| Limit | Default | Set by | When it is hit |
| --- | --- | --- | --- |
| Image size | 10 MB | `DOCLING_MAX_IMAGE_MB` | 413 `TOO_LARGE` |
| Pages per request | 1 | the API shape | the caller loops over pages |
| Generations at once | 1 | fixed | later requests wait in the queue |
| Queue (running plus waiting) | 8 | `DOCLING_MAX_QUEUE` | 503 `BUSY`, `Retry-After: 30` |
| Output tokens per page | 1500 default, 4096 cap | `maxTokens`, `DOCLING_MAX_TOKENS` | the page's output is cut off |
| Prompt | 4000 characters | fixed | 400 |
| `imageUrl` download | 15 s | fixed | 400 `IMAGE_LOAD_ERROR` |

What the hardware and Hugging Face add (inferred from the platform's published terms and the model's size, not measured here):

- **CPU Basic is 2 vCPUs and 16 GB.** The model is about 1 GB and fits, but expect tens of seconds or more per page. With one generation at a time and a queue of 8, the last request in a full queue waits for the seven ahead of it, so callers need long timeouts. Measure, then move to a larger CPU or a GPU tier (remove `ONNXRUNTIME_NODE_INSTALL=skip` from the `Dockerfile` for GPU).
- **A free Space sleeps after 48 hours without traffic.** The next request wakes it; booting and reloading the model takes minutes, plus a fresh ~1 GB download unless persistent storage is attached at `/data`. Warmup exists for exactly this.
- **There is no per-caller rate limit.** Conversions need the token, so the only caller is whoever holds it: in this repo, the demo Worker. The Worker caps each document at `DOCLING_MAX_PAGES` (10) pages and 8 MB per image, but anyone who can open the demo can spend the Space's time.

Do the limits make sense? The queue cap and the image cap do: without them one busy client piles up work the Space can never finish and requests time out anyway, so a fast 503 the caller can retry is better. One page per request keeps any one document from holding the model for minutes. The missing piece is a per-visitor limit on the demo Worker's `/api/enhance` (Cloudflare's Rate Limiting binding would do), which only matters once the demo gets real traffic. Warmup needs no limit: it does nothing once the model is loaded.

Prefer `imageUrl` or a raw image body over `imageBase64` in production: base64 inflates the body by a third. Give a signed URL enough lifetime to cover the queue wait.

## Files

```
docling-space/
├── README.md               # this file; the front matter configures the Space
├── Dockerfile
├── package.json            # + package-lock.json, used by `npm ci` in the image
└── server/
    ├── server.js           # binds 0.0.0.0:$PORT
    ├── app.js              # routes, auth, queue, validation
    ├── model.js            # copy of ../server/model.js (a test keeps them identical)
    └── doctags-to-html.js  # extract-pdf's doctagsToHtml + sanitize-html
```
