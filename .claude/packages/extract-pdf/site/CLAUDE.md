# CLAUDE.md — `packages/extract-pdf/site`

Docs for **both** `extract-pdf` and `extract-webpage`, plus one live demo,
as one Cloudflare Worker (`extract-pdf-demo`). Fumadocs on vinext, same
layout as [`packages/extract-youtube/site`](../../extract-youtube/site/CLAUDE.md).
It replaced the old `packages/extract-pdf/demo` Worker and keeps that
Worker's name and secret names (`DOCLING_PROCESSOR_URL`, `DOCLING_API_TOKEN`,
`HF_SPACE_TOKEN`), so the deployed secrets carry over.

| Path | Served by |
| --- | --- |
| `/`, `/docs/**` | The App Router in `app/`, MDX from `content/docs/{pdf,webpage}/`. |
| `/demo` | `components/demo/DemoMount.tsx`: PDF tab (`PdfDemo.tsx`) and Webpage tab (`WebpageDemo.tsx`, `/demo#webpage`). |
| `/api/{health,convert,enhance,source,extract}` | `worker/api.ts`, called first by `worker/index.ts` (the Worker's `main`). |

## Things that bite

- **The packages are aliased to their source** in `aliases.ts`, and
  extract-pdf's Node-only engines (`@llamaindex/liteparse`,
  `@huggingface/transformers`, `@napi-rs/canvas`) are stubbed with
  `worker/unsupported.ts`. A new Node-only import in either package needs a
  stub here, or the Worker build breaks.
- **`types/*.d.ts` shims stand in for the packages in `tsc`.** Their source is
  not clean under this site's strict tsconfig, so `tsconfig.json` maps
  `extract-pdf` and `extract-webpage/url-to-content/url-to-content` to the
  slices the Worker calls. When the Worker calls something new, add it there.
- **The dev `/api` runs in a separate plain Vite server** (`demoApiInDev()` in
  `vite.config.ts`). Loading `worker/api.ts` through vinext's dev SSR
  environment fails on linkedom's CommonJS cssom and stalls on
  extract-webpage's 1 MB name list.
- **No canvas on Workers.** OCR is a browser-side follow-up: PDF.js from
  jsDelivr renders flagged pages, `/api/enhance` forwards each image to the
  Docling Space with the Worker's secrets.
- **`../docling-space` is deployed by hand** and is not part of this site.
- Webpage `cite` is HTML built from page values; the demo shows it as text.
- When either package changes public behaviour, the matching page under
  `content/docs/pdf/` or `content/docs/webpage/` changes with it.

```bash
bun run dev          # docs + demo + /api (vinext dev)
bun run build        # Worker + assets → dist/
bun run preview      # wrangler dev over the build
bun run typecheck
```
