# CLAUDE.md — `render-url-to-html`

**Read [`skills/ask-render-url-to-html`](../../../skills/ask-render-url-to-html/SKILL.md)
first.**

**Not one package — two self-hosted renderers**, each its own workspace:

| Directory | What it is |
| --- | --- |
| `scraper-jsdom/` | Lightweight, no browser |
| `scraper-puppeteer/` | Full browser rendering |

There is no `package.json` at this directory's root. Install, build and test
inside the renderer you are changing.

## Rules

- **The two exist because they trade off differently** — jsdom is cheap and
  fails on JS-heavy sites; puppeteer is correct and expensive. Don't converge
  them, and don't quietly change which one a caller gets.
- A renderer visits arbitrary user-supplied URLs. Block requests to local and
  private addresses (SSRF), cap render time and page weight, and never execute
  page-supplied code in the host context.
- Puppeteer must not leak browser instances — a renderer that keeps a page open
  on an error exhausts the host.

For the hosted, always-warm variant see `packages/html-renderer-api`.
