# extract-youtube-docs

The documentation site for the [`extract-youtube`](../../packages/extract-youtube) npm package.
[Fumadocs](https://fumadocs.dev) on Next.js App Router source, built by
[vinext](https://vinext.dev) (Vite) into a Cloudflare Worker.

## Commands

Run from this directory, with bun:

```bash
bun install
bun run dev         # vinext dev server (Node, with HMR)
bun run build       # vinext build → dist/server (Worker) + dist/client (static assets)
bun run preview     # wrangler dev on the built Worker, in workerd — run `build` first
bun run deploy      # build, then wrangler deploy
bun run typecheck   # generate .source + route types, then tsc --noEmit
```

`vinext deploy` no longer exists in vinext 1.0 (it moved to `@vinext/cloudflare`), so
`deploy` uses plain `wrangler deploy`: `vinext build` writes
`.wrangler/deploy/config.json`, which points Wrangler at the built `dist/server/wrangler.json`.

## Where things live

| Path | What |
| --- | --- |
| `content/docs/**/*.mdx` | The pages. Frontmatter `title` (required), `description`, `icon` (a Lucide name). |
| `content/docs/**/meta.json` | Sidebar order. A new page must be added to its folder's `pages` list. |
| `lib/fumadocs/customize-docs.ts` | Site title, GitHub/npm links, and `DEMO_URL` (the live demo; Storybook is `${DEMO_URL}/storybook/`). |
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
