# CLAUDE.md — `extract-youtube`

**Read [`skills/ask-extract-youtube`](../../skills/ask-extract-youtube/SKILL.md)
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

This package is also a **coverage-build dependency** in CI.

```bash
cd packages/extract-youtube && bun run test
```
