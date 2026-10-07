---
title: Extract PDF Docling Processor
emoji: 📄
colorFrom: blue
colorTo: indigo
sdk: gradio
sdk_version: "5.0.0"
python_version: "3.11"
app_file: app.py
pinned: false
---

# extract-pdf Docling processor (Gradio)

Remote [Granite Docling](https://huggingface.co/ibm-granite/granite-docling-258M) OCR for [`extract-pdf`](https://www.npmjs.com/package/extract-pdf), packaged as a Hugging Face **Gradio** Space with ZeroGPU support.

It takes **one already-rasterized page image** and returns the model's doctags, or sanitized HTML. It never sees a whole PDF. Parsing, deciding which pages need OCR (`scanPagesForOCR`) and rasterizing them stay with the caller, so one long document can't monopolize a small Space.

This folder lives in the `extract-pdf` package so it is versioned with the client that calls it. Only this folder is pushed to the Space.

## API

The Gradio app provides both a web UI and HTTP API endpoints:

| Endpoint | Method | Description |
| --- | --- | --- |
| `/health` | GET | Health check with model status |
| `/api/v1/warmup` | GET/POST | Start model loading |
| `/api/v1/convert` | POST | Convert image to doctags/HTML |

### Convert

**Raw image body** (for `extract-pdf` client compatibility):
```sh
curl -X POST "$SPACE/api/v1/convert?output=html&prompt=Convert+this+page+to+docling.&maxTokens=1500" \
  -H "X-Docling-Token: $DOCLING_API_TOKEN" \
  -H "Content-Type: image/png" --data-binary @page-3.png
```

**JSON**:
```sh
curl -X POST "$SPACE/api/v1/convert" \
  -H "X-Docling-Token: $DOCLING_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/page.png", "prompt": "Convert this page to docling.", "maxTokens": 1500, "output": "doctags"}'
```

| Field | Default | Notes |
| --- | --- | --- |
| `imageUrl` | | An `http(s)` URL the Space downloads. One of `imageUrl` or `imageBase64` required. |
| `imageBase64` | | Base64 image, with or without `data:` prefix. |
| `mimeType` | `image/png` | For `imageBase64`. |
| `prompt` | `Convert this page to docling.` | Instruction for the model. |
| `maxTokens` | `1500` | Clamped to `DOCLING_MAX_TOKENS` (default 4096). |
| `output` | `doctags` | `doctags` or `html`. |

Response: `{ success: true, output, result, doctags, html?, metadata }`. Errors: `{ success: false, error, code }` with 400, 401, 413, 500, 503.

HTML output is sanitized with a tag allowlist: model output and document content are both untrusted.

## ZeroGPU Configuration

This Space uses **ZeroGPU** for GPU acceleration. The model (`ibm-granite/granite-docling-258M`, ~258M params, ~1 GB) fits comfortably in ZeroGPU's 16 GB VRAM.

In the Space settings, enable **ZeroGPU** and set the hardware to **ZeroGPU**. The app automatically uses CUDA when available.

## Configuration

Set these under the Space's **Settings → Variables and secrets**:

| Name | Kind | Default | Purpose |
| --- | --- | --- | --- |
| `DOCLING_API_TOKEN` | secret | | Required. Callers send it as `X-Docling-Token` (or `Authorization: Bearer`). Without it every model route answers 503. |
| `DOCLING_MAX_TOKENS` | variable | `4096` | Upper bound on `maxTokens`. |
| `DOCLING_MAX_IMAGE_MB` | variable | `10` | Largest image. |
| `ALLOWED_ORIGIN` | variable | | Comma-separated origins allowed to call from a browser. Leave unset for server-to-server use. |

`X-Docling-Token` is checked before `Authorization`, so on a **private** Space the caller can send a Hugging Face read token as `Authorization: Bearer hf_…` for Hugging Face's own access check and the service token alongside it.

## Deploy

1. [Create a Space](https://huggingface.co/new-space) named `extract-pdf-docling`, SDK **Gradio**, hardware **ZeroGPU**. Make it private if users upload their own documents.
2. Add the `DOCLING_API_TOKEN` secret (`openssl rand -hex 32`).
3. Push this folder to the Space:

```sh
git clone https://huggingface.co/spaces/YOUR_HF_USERNAME/extract-pdf-docling
cp -r packages/extract-pdf/docling-space/. extract-pdf-docling/
cd extract-pdf-docling
git add . && git commit -m "Deploy Granite Docling processor (Gradio)" && git push
```

The Space installs dependencies from `requirements.txt`, downloads the model (~1 GB), and starts the Gradio server on port 7860.

Check on it with:
```sh
curl https://YOUR_HF_USERNAME-extract-pdf-docling.hf.space/health
curl -X POST https://YOUR_HF_USERNAME-extract-pdf-docling.hf.space/api/v1/warmup \
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
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
DOCLING_API_TOKEN=local-test-token python app.py
```

Then open http://localhost:7860 or test the API:
```sh
curl localhost:7860/health
curl -X POST "localhost:7860/api/v1/convert?output=html" -H "Content-Type: image/png" \
  -H "X-Docling-Token: local-test-token" --data-binary @page-3.png
```

Without `DOCLING_API_TOKEN` set, the model routes are open (development only).

## Limits

| Limit | Default | Set by | When it is hit |
| --- | --- | --- | --- |
| Image size | 10 MB | `DOCLING_MAX_IMAGE_MB` | 413 `TOO_LARGE` |
| Pages per request | 1 | the API shape | the caller loops over pages |
| Output tokens per page | 1500 default, 4096 cap | `maxTokens`, `DOCLING_MAX_TOKENS` | output is cut off |
| Prompt | 4000 characters | fixed | 400 |
| `imageUrl` download | 15 s | fixed | 400 `IMAGE_LOAD_ERROR` |

ZeroGPU adds:
- **16 GB VRAM** — the model (~1 GB) fits with room for batch processing.
- **Automatic sleep** — Space sleeps after inactivity; model reloads on next request (warmup helps).
- **No per-caller rate limit** — only the token holder can call.

## Files

```
docling-space/
├── README.md               # this file; the front matter configures the Space
├── app.py                  # Gradio app with HTTP API endpoints
├── requirements.txt        # Python dependencies
├── Dockerfile              # (legacy) Docker Space config
├── package.json            # (legacy) Node.js dependencies
└── server/                 # (legacy) Node.js server implementation
    ├── server.js
    ├── app.js
    ├── model.js
    └── doctags-to-html.js
```

The Gradio app (`app.py`) is the primary entry point. The `server/` folder contains the original Node.js implementation for reference.