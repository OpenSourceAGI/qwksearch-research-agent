# extract-pdf + extract-webpage + extract-youtube site: docs + live demo

The documentation site **and** the live demo for the [`extract-pdf`](..) and
[`extract-webpage`](../../extract-webpage) npm packages, plus
[`extract-cite`](../../extract-cite) and [`extract-youtube`](../../extract-youtube), as one Cloudflare
Worker. [Fumadocs](https://fumadocs.dev) on Next.js App Router source, built by
[vinext](https://vinext.dev) (Vite).

| Path | What |
| --- | --- |
| `/`, `/docs/*` | The docs for every package (`/docs/youtube/*` for extract-youtube). |
| `/demo` | The live demo. **PDF** tab: upload or URL → `/api/convert`, then the OCR follow-up. **Webpage** tab (`/demo#webpage`): URL or pasted HTML → `/api/extract`. **YouTube** tab (`/demo#youtube`, `/demo#youtube-admin`): extract-youtube's video library, floating player and admin screens. |
| `/api/convert` | `convertPDFToHTML` (text layer only), with the pages the OCR scan flagged. |
| `/api/enhance` | One rendered page image → the Granite Docling processor, with the Worker's secrets. Nothing is stored. |
| `/api/warmup` | Wakes the Docling processor and starts its model loading; the PDF tab calls it on open. |
| `/api/source?url=` | The PDF at `url`, for the browser to render flagged pages. |
| `/api/extract` | `extractContent` from extract-webpage: main content + citation. |
| `/api/health` | `{ status, maxPdfMb, ocr }`. |
| `/api/youtube/transcript?videoId=` | extract-youtube's `YouTubeTranscriptApi`: `{ snippets }` for the player's captions. |
| `/api/youtube/library/*` | extract-youtube's `createVideoLibraryHandler`: the library and admin API. |
| `/api/youtube/demo` | Which mode the library runs in (sandbox, token, read-only). |

This directory replaces the old `packages/extract-pdf/demo` Worker and keeps
its behaviour, its Worker name (`extract-pdf-demo`) and its secret names. It is
**not** part of the published package: `files` in `../package.json` ships only
`dist`, `src` and `server`.

## Vercel

The same site also builds as a plain Next.js app for Vercel, docs and the
full demo included. Set the Vercel project's root directory to
`packages/extract-pdf/site`; `vercel.json` runs `install-vercel-deps.sh`
(npm, with the published `extract-*` packages) and `build-vercel.sh`
(`next build`). Every `/api/*` route is `app/api/[...path]/route.ts`, which
calls the same `handleApi` from `worker/api.ts`, so the API matches the
Worker. The variables in the table below are Vercel environment variables
there. There is no KV on Vercel, so `/admin` settings live in memory per
function instance; set them as environment variables instead.

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
| `content/docs/**/*.mdx` | The pages: `pdf/`, `webpage/`, `cite/` and `youtube/`, one folder per package. `youtube/` is ported from `packages/extract-youtube/site`. A new page goes in its folder's `meta.json`. |
| `lib/fumadocs/customize-docs.ts` | Site title, links, and `SITE_URL` (unset until a custom domain is attached). |
| `app/(home)/demo` + `components/demo/` | The demo page. Client-only (`DemoMount`), styled by `demo.css`, which is scoped to `.epd-demo`. The YouTube tab is `components/demo/youtube/`, ported from extract-youtube's own demo and scoped to `.eyt-demo`. |
| `worker/index.ts` | The Worker entry: `/api/*` from `worker/api.ts`, everything else to vinext. Hand-written; keep it. |
| `worker/api.ts` | The demo's API. |
| `worker/youtube.ts` | The YouTube tab's routes under `/api/youtube/*`. |
| `aliases.ts` | Points `extract-pdf`, `extract-webpage`, `extract-cite` and `extract-youtube` at their source, and stubs extract-pdf's Node-only engines with `worker/unsupported.ts`. |

## Variables and secrets

| Name | Kind | Default | Purpose |
| --- | --- | --- | --- |
| `MAX_PDF_MB` | var | `15` | Largest PDF accepted, by upload or by URL. |
| `MAX_HTML_MB` | var | `2` | Largest pasted HTML `/api/extract` accepts. |
| `DOCLING_PROCESSOR_URL` | secret | | The Docling Space (`../docling-space`). Unset: no OCR follow-up; the demo only reports which pages would benefit. |
| `DOCLING_API_TOKEN` | secret | | Sent as `X-Docling-Token`; the Space's own secret. |
| `HF_SPACE_TOKEN` | secret | | Private Space only: a Hugging Face read token. |
| `DOCLING_MAX_PAGES` / `DOCLING_MAX_TOKENS` / `DOCLING_MAX_IMAGE_MB` | var | `10` / `1500` / `8` | OCR tuning. |
| `YOUTUBE_ADMIN_TOKEN` | secret | | Locks the YouTube library's admin routes behind `Authorization: Bearer`. Unset (and no `YOUTUBE_DB`): a sandbox anyone can edit, kept in memory. |
| `YOUTUBE_API_KEY` | secret | | YouTube Data API v3 key, for the library's resync and full auto-fill. |
| `YOUTUBE_DB` | D1 binding | | Optional: keeps the YouTube library in D1 instead of memory. Read-only unless `YOUTUBE_ADMIN_TOKEN` is set. |

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
