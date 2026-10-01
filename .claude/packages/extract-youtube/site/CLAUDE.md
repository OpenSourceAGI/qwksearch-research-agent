# CLAUDE.md — `packages/extract-youtube/site`

`extract-youtube`'s docs, live demo and Storybook as **one Cloudflare
Worker** (`extract-youtube-docs`, domain youtube.js.org). Fumadocs on vinext,
started from `template-fumadocs` in dev-tools-starter-agent. It replaced the
separate `apps/extract-youtube-docs` and `apps/extract-youtube-demo`. Read
[`skills/ask-extract-youtube`](../../../../skills/ask-extract-youtube/SKILL.md)
for the package itself.

| Path | Served by |
| --- | --- |
| `/`, `/docs/**` | The App Router in `app/`, MDX from `content/docs/`. |
| `/demo` | `app/(home)/demo/page.tsx` → `components/demo/DemoMount.tsx`: Library tab (grid, list) and Admin tab (admin table, availability panel). |
| `/api/transcript`, `/api/library/*`, `/api/demo` | `worker/api.ts`, called first by `worker/index.ts` (the Worker's `main`). |
| `/storybook/` | `storybook build` output in `dist/client/storybook`, served as static assets before the Worker runs. |

## Things that bite

- **The package is aliased to its source.** `aliases.ts` maps
  `extract-youtube`, `/react` and `/library` to `../src`, for the site, the
  Worker and Storybook alike. No package build is needed.
- **MDX is compiled at build time** by `fumadocs-mdx/vite` into `.source/`.
  Workers refuse `new Function`, so nothing may compile MDX per request.
- **`vinext dev` never loads `worker/index.ts`.** The `demoApiInDev()` plugin
  in `vite.config.ts` serves `/api/*` from `worker/api.ts` in dev. `bun run
  preview` (wrangler dev over the build) is the workerd-faithful check.
- **Links to `/storybook/` must be plain links.** Client-side navigation
  would ask the App Router for a page that is a static asset. `mdx-components.tsx`
  overrides `a` and `Card` for that; `lib/fumadocs/customize-docs.ts` holds the
  site-wide links.
- **`bun run build` order matters.** `vinext build` empties `dist/client`,
  then `storybook build` writes into it.
- **Storybook has its own Vite config** (`.storybook/vite.config.ts`); the
  Cloudflare plugin must not run inside it. Stories wrap in `.eyt-demo` so the
  demo's scoped CSS applies.
- **Modes come from bindings, not flags.** No `ADMIN_TOKEN` and no `DB` makes
  a sandbox anyone can edit. `ADMIN_TOKEN` requires a bearer token. `DB`
  without a token is read-only. Never make a D1-backed deploy open.
- **One story file per component in `stories/`.** Stories use `fixtures.ts`
  (`makeClient()` runs the real handler over a memory store), never the
  network. `components/demo/demo-data.ts` is shared by the Worker seed and the
  stories.
- `zod` is pinned to fumadocs-mdx's own range on purpose. With two zods, bun
  links two copies of `fumadocs-core` and typecheck fails on `PageData`.
- When `packages/extract-youtube` changes public behaviour, the matching page
  changes with it: `react/video-grid`, `admin/library-api`,
  `admin/custom-fields`, `admin/admin-components`, `live-demo`.

```bash
bun run dev          # docs + demo + /api (vinext dev)
bun run storybook    # :6006
bun run build        # site, Worker, Storybook → dist/
bun run preview      # wrangler dev over the build
bun run typecheck
```
