# extract-youtube site: docs + live demo

The documentation site **and** the live demo for the [`extract-youtube`](..) npm package,
as one Cloudflare Worker, served at [youtube.js.org](https://youtube.js.org).
[Fumadocs](https://fumadocs.dev) on Next.js App Router source, built by
[vinext](https://vinext.dev) (Vite).

| Path | What |
| --- | --- |
| `/`, `/docs/*` | The docs. |
| `/demo` | The live demo: the **Library** tab (`<VideoGrid />`, `<VideoList />` over `useVideoLibrary()`) and the **Admin** tab (`/demo#admin`: `<VideoLibraryAdmin />`, `<VideoAvailabilityPanel />`), with `<FloatingYouTubePlayer />` mounted once for both. |
| `/api/transcript?videoId=` | `YouTubeTranscriptApi`, answering `{ snippets }` or `{ error }`. |
| `/api/library/*` | `createVideoLibraryHandler` from `extract-youtube/library`: the whole library and admin API. |
| `/api/demo` | Which mode this deploy runs in (see below). |
| `/storybook/` | A Storybook with one story file per React component (`stories/`). |

This directory is **not** part of the published package: `files` in `../package.json`
ships only `dist` and `src`.

## Commands

Run from this directory, with bun:

```bash
bun install
bun run dev         # vinext dev server (Node, with HMR): docs, /demo and its /api/*
bun run storybook   # Storybook on :6006
bun run build       # vinext build → dist/server (Worker) + dist/client, then the Storybook into dist/client/storybook
bun run preview     # wrangler dev on the built Worker, in workerd — run `build` first
bun run deploy      # build, then wrangler deploy
bun run typecheck   # generate .source + route types, then tsc --noEmit (site, Worker and stories)
```

`vinext deploy` no longer exists in vinext 1.0 (it moved to `@vinext/cloudflare`), so
`deploy` uses plain `wrangler deploy`: `vinext build` writes
`.wrangler/deploy/config.json`, which points Wrangler at the built `dist/server/wrangler.json`.

## Where things live

| Path | What |
| --- | --- |
| `content/docs/**/*.mdx` | The pages. Frontmatter `title` (required), `description`, `icon` (a Lucide name). |
| `content/docs/**/meta.json` | Sidebar order. A new page must be added to its folder's `pages` list. |
| `lib/fumadocs/customize-docs.ts` | Site title, `SITE_URL`, and the GitHub/npm/demo/Storybook links. |
| `app/(home)/demo` + `components/demo/` | The live demo page. Client-only (`DemoMount`), styled by `demo.css`, which is scoped to `.eyt-demo` so it cannot restyle the docs. |
| `worker/index.ts` | The Worker entry: `/api/*` from `worker/api.ts`, everything else to vinext. Hand-written; keep it. |
| `worker/api.ts` | The demo's API: transcripts, the library handler, the mode. |
| `components/demo/demo-data.ts` | The demo videos and custom fields, shared by the API seed and the stories. |
| `stories/`, `.storybook/` | One `*.stories.tsx` per component, and `fixtures.ts`, whose `makeClient()` runs the real handler over a memory store. Storybook has its own `vite.config.ts` without vinext or the Cloudflare plugin. |
| `aliases.ts` | Points `extract-youtube`, `/react` and `/library` at `../src`, for the site and the stories alike. |
| `app/(home)` + `components/DocsHomepage` | The landing page. |
| `app/docs` | Docs layout, pages, search index (`/docs/api/docs-search`), `llms-full.txt`, and the `.mdx` plain-text routes. |
| `app/globals.css` | Tailwind + Fumadocs styles and the palette. |

MDX rules: no bare `{` or `<` outside code (they parse as JSX); use `` `code` `` or a fence.

## Why it is wired this way (Cloudflare Workers)

- **MDX is compiled at build time** by `fumadocs-mdx/vite` (see `vite.config.ts`). Workers
  forbid `new Function`/`eval`, so nothing may compile MDX per request.
- **No filesystem at runtime.** Page text for `llms-full.txt` and the `.mdx` routes comes from
  `includeProcessedMarkdown` (embedded at build), never from reading `content/`.
- **Search is a static index.** `/docs/api/docs-search` returns the whole index once; the
  browser searches it. No per-request index builds.
- **No GitHub "last edited" lookups** — they call the GitHub API per render and hit the
  unauthenticated rate limit immediately.
- **Tailwind must scan `fumadocs-ui/dist`** (`@source` in `globals.css`), or the docs render
  without a sidebar. Both the local and the hoisted (repo-root) `node_modules` paths are listed.
- **System fonts**, not `next/font/google`, so nothing is fetched from Google.

## Demo modes

| `ADMIN_TOKEN` secret | `DB` D1 binding | Mode |
| --- | --- | --- |
| unset | unbound | **Sandbox**: anyone edits an in-memory library, seeded from `components/demo/demo-data.ts`, which lives as long as the Worker isolate. |
| set | either | **Token**: paste the token on the Admin tab; the client sends it as a bearer token. |
| unset | bound | **Read-only**: a persistent library is never open to edits without a token. |

Optional: `wrangler secret put YOUTUBE_API_KEY` turns on Resync and richer
auto-fill. For D1, `wrangler d1 create extract-youtube-demo` and add the
binding as `DB` (see the comment in `wrangler.jsonc`). Under `bun run dev`
there is no D1; `ADMIN_TOKEN` and `YOUTUBE_API_KEY` come from the shell.

## Deploying

The repo's **Cloudflare Workers** workflow builds and deploys this directory on
every push that touches it, as the Worker `extract-youtube-docs` (the docs'
old Worker name, kept so their URL does not change). To serve it at
youtube.js.org, that zone must be in the same Cloudflare account; then add the
`routes` entry shown at the bottom of `wrangler.jsonc`.
