# extract-pdf + extract-webpage site: docs + live demo

The documentation site **and** the live demo for the [`extract-pdf`](..) and
[`extract-webpage`](../../extract-webpage) npm packages, as one Cloudflare
Worker. [Fumadocs](https://fumadocs.dev) on Next.js App Router source, built by
[vinext](https://vinext.dev) (Vite). Same layout as
[`packages/extract-youtube/site`](../../extract-youtube/site).

| Path | What |
| --- | --- |
| `/`, `/docs/*` | The docs for both packages. |
| `/demo` | The live demo. **PDF** tab: upload or URL → `/api/convert`, then the OCR follow-up. **Webpage** tab (`/demo#webpage`): URL or pasted HTML → `/api/extract`. |
| `/api/convert` | `convertPDFToHTML` (text layer only), with the pages the OCR scan flagged. |
| `/api/enhance` | One rendered page image → the Granite Docling processor, with the Worker's secrets. |
| `/api/source?url=` | The PDF at `url`, for the browser to render flagged pages. |
| `/api/extract` | `extractContent` from extract-webpage: main content + citation. |
| `/api/health` | `{ status, maxPdfMb, ocr }`. |

This directory replaces the old `packages/extract-pdf/demo` Worker and keeps
its behaviour, its Worker name (`extract-pdf-demo`) and its secret names. It is
**not** part of the published package: `files` in `../package.json` ships only
`dist`, `src` and `server`.

## Commands

Run from this directory, with bun:

```bash
bun install         # from the monorepo root
bun run dev         # vinext dev server (Node, with HMR): docs, /demo and its /api/*
bun run build       # vinext build → dist/server (Worker) + dist/client (static assets)
bun run preview     # wrangler dev on the built Worker, in workerd — run `build` first
bun run deploy      # build, then wrangler deploy
bun run typecheck   # generate .source + route types, then tsc --noEmit
```

## Where things live

| Path | What |
| --- | --- |
| `content/docs/**/*.mdx` | The pages: `pdf/` and `webpage/`, one folder per package. A new page goes in its folder's `meta.json`. |
| `lib/fumadocs/customize-docs.ts` | Site title, links, and `SITE_URL` (unset until a custom domain is attached). |
| `app/(home)/demo` + `components/demo/` | The demo page. Client-only (`DemoMount`), styled by `demo.css`, which is scoped to `.epd-demo`. |
| `worker/index.ts` | The Worker entry: `/api/*` from `worker/api.ts`, everything else to vinext. Hand-written; keep it. |
| `worker/api.ts` | The demo's API. |
| `aliases.ts` | Points `extract-pdf`, `extract-webpage` and `extract-youtube` at their source, and stubs extract-pdf's Node-only engines with `worker/unsupported.ts`. |

## Variables and secrets

| Name | Kind | Default | Purpose |
| --- | --- | --- | --- |
| `MAX_PDF_MB` | var | `15` | Largest PDF accepted, by upload or by URL. |
| `MAX_HTML_MB` | var | `2` | Largest pasted HTML `/api/extract` accepts. |
| `DOCLING_PROCESSOR_URL` | secret | | The Docling Space (`../docling-space`). Unset: no OCR follow-up; the demo only reports which pages would benefit. |
| `DOCLING_API_TOKEN` | secret | | Sent as `X-Docling-Token`; the Space's own secret. |
| `HF_SPACE_TOKEN` | secret | | Private Space only: a Hugging Face read token. |
| `DOCLING_MAX_PAGES` / `DOCLING_MAX_TOKENS` / `DOCLING_MAX_IMAGE_MB` | var | `10` / `1500` / `8` | OCR tuning. |

Under `bun run dev` they come from the shell, e.g.
`DOCLING_PROCESSOR_URL=http://127.0.0.1:7860 DOCLING_API_TOKEN=local-test-token bun run dev`.

## Deploying

The repo's **Cloudflare Workers** workflow builds and deploys this directory on
every push that touches it. There is no custom domain yet: add a `routes`
entry to `wrangler.jsonc` once the zone is in the Cloudflare account, and set
`SITE_URL`.

PDF parsing is CPU-bound. On the Workers Free plan most real PDFs exceed the
10 ms CPU limit; on the Paid plan uncomment `"limits"` in `wrangler.jsonc`.

## Why it is wired this way (Cloudflare Workers)

- **MDX is compiled at build time** by `fumadocs-mdx/vite`. Workers forbid
  `new Function`/`eval`, so nothing may compile MDX per request.
- **No filesystem at runtime.** Page text for `llms-full.txt` and the `.mdx`
  routes comes from `includeProcessedMarkdown`, embedded at build.
- **No canvas on Workers**, so the OCR follow-up renders pages in the browser
  (PDF.js from a CDN) and the Worker only forwards images.
- **Tailwind must scan `fumadocs-ui/dist`** (`@source` in `globals.css`), or
  the docs render without a sidebar.
- **`vinext dev` never loads `worker/index.ts`.** In dev, a plugin in
  `vite.config.ts` serves `/api/*` from `worker/api.ts` through a separate
  plain Vite server, because vinext's own server-side bundling stalls on
  extract-webpage's dependencies. `bun run preview` is the workerd check.
- **System fonts**, not `next/font/google`, so nothing is fetched from Google.
