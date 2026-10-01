# CLAUDE.md — `extract-youtube`

**Read [`skills/ask-extract-youtube`](../../../skills/ask-extract-youtube/SKILL.md)
and its `API.md` first.**

YouTube transcripts, fast and **with no browser** — serverless-optimized so it
runs on a Cloudflare Worker. Published; built.

## The no-browser constraint is the package

- **Never add a dependency that needs a DOM, a headless browser, or a
  long-lived process.** It has to run inside a Worker request. If a page truly
  needs rendering, that is `render-url-to-html` / `html-renderer-api`'s job, not
  this one.
- YouTube changes its internal responses without notice; treat every field as
  optional and fail with a diagnosable message rather than a destructured
  `undefined`.
- Transcripts may be auto-generated, translated, absent, or region-blocked.
  "No transcript" is a normal outcome, not an error.

## Three entry points, kept apart

- `extract-youtube` — transcripts. Never imports React.
- `extract-youtube/library` — the video library and its admin API. **No React
  and no Node built-ins**: it runs in a Worker, and its client half runs in the
  browser. Stores go through `VideoLibraryStore`; `applyLibraryQuery` is the
  reference listing semantics every store must match (the D1 store is tested
  against it over `node:sqlite`, which needs Node 22+).
- `extract-youtube/react` — the player, transcript modal, grid, list and admin
  screens. Imports `library/` for types and helpers, never the transcript code.

The grid and admin code was ported from debate-ai.com's `debate-videos`
package and its `app/api/admin/videos/**` routes; debate-only columns became
`CustomFieldDef`s. Keep it generic.

Every React component has a story in `site/stories/` and a page in
`site/content/docs/`. A new or changed component updates both. The site (docs,
live demo and Storybook as one Worker) has its own note in
[`site/CLAUDE.md`](site/CLAUDE.md).

This package is also a **coverage-build dependency** in CI.

```bash
cd packages/extract-youtube && bun run test
```
