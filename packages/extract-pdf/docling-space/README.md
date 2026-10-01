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

## Endpoints

| Route | Auth | What it does |
| --- | --- | --- |
| `GET /health` | none | `{ status, modelLoaded, busy, queueDepth, uptime }`. Answers immediately, before the model is loaded. |
| `POST /api/v1/warmup` | token | Downloads and loads the model now instead of on the first conversion. |
| `POST /api/v1/convert` | token | Convert a page image. Body below. |
| `POST /api/v1/convert-base64` | token | Same handler. The path `extract-pdf`'s `processorUrl` client calls. |

Request body (JSON), for either convert route:

| Field | Default | Notes |
| --- | --- | --- |
| `imageUrl` | | An `http(s)` URL the Space can fetch, such as a short-lived signed R2 URL. |
| `imageBase64` | | Base64 image, with or without a `data:` prefix. One of the two is required. |
| `mimeType` | `image/png` | For `imageBase64`. |
| `prompt` | `Convert this page to docling.` | |
| `maxTokens` | `1500` | Clamped to `DOCLING_MAX_TOKENS`. |
| `output` | `doctags` | `doctags` keeps the contract `extract-pdf` expects (it converts to HTML itself). `html` returns sanitized HTML in `result`. |

Response: `{ success: true, output, result, doctags, html?, metadata: { processingTime, queueTime, queueDepth } }`. Errors are `{ success: false, error, code }` with 400 (bad input), 401 (token), 413 (too large), 500 (model) or 503 (`BUSY` with `Retry-After`, or `NOT_CONFIGURED`).

The model runs **one job at a time**. Further requests wait in a queue of at most `DOCLING_MAX_QUEUE`; past that the Space answers 503 so the caller can retry instead of piling up. HTML output is `extract-pdf`'s own `doctagsToHtml`, passed through `sanitize-html` with a tag allowlist: model output and document content are both untrusted.

## Configuration

Set these under the Space's **Settings → Variables and secrets**. Spaces pass both to the container as environment variables.

| Name | Kind | Default | Purpose |
| --- | --- | --- | --- |
| `DOCLING_API_TOKEN` | secret | | Required. Callers send it as `X-Docling-Token` (or `Authorization: Bearer`). Without it every model route answers 503. |
| `DOCLING_MAX_TOKENS` | variable | `4096` | Upper bound on `maxTokens`. |
| `DOCLING_MAX_QUEUE` | variable | `8` | Jobs running plus waiting before 503. |
| `DOCLING_MAX_IMAGE_MB` | variable | `10` | Largest decoded image. |
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

The Space builds the image and logs `Docling processor listening on port 7860`. Then warm it once:

```sh
curl -X POST https://YOUR_HF_USERNAME-extract-pdf-docling.hf.space/api/v1/warmup \
  -H "X-Docling-Token: $DOCLING_API_TOKEN" \
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
curl -X POST localhost:7860/api/v1/convert -H "Content-Type: application/json" \
  -H "X-Docling-Token: local-test-token" \
  -d '{"imageUrl":"https://example.com/page-3.png","output":"html"}'
```

Or build the image exactly as the Space does:

```sh
docker build -t extract-pdf-docling-space .
docker run --rm -p 7860:7860 -e DOCLING_API_TOKEN=local-test-token extract-pdf-docling-space
```

Without `NODE_ENV=production` and without a token, the model routes are open, which is only meant for local development. The image sets `NODE_ENV=production`, so a Space without the secret fails closed.

## Limits

- **CPU Basic is a proof of concept.** Expect a slow first request while the model downloads and loads, and many seconds per page after that. Measure, then move to a larger CPU or a GPU tier (remove `ONNXRUNTIME_NODE_INSTALL=skip` from the `Dockerfile` for GPU).
- **The model is not loaded at startup.** `/health` is up immediately; call `/api/v1/warmup` or let the first conversion load it. A failed load is retried on the next request instead of breaking the process.
- **Prefer `imageUrl` in production.** Base64 inflates the body by a third and moves every image through the caller. A short-lived signed URL avoids that; give it enough lifetime to cover the queue wait.

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
