# CLAUDE.md — `html-renderer-api`

**Read [`skills/ask-html-renderer-api`](../../../skills/ask-html-renderer-api/SKILL.md)
first.**

A Cloudflare **Worker + Durable Object** that keeps a browser warm and renders
DOM with Puppeteer, to get HTML from JS-rendered pages and get past
bot-blocking. Published.

## The Durable Object is the design

- **Its whole purpose is keeping a browser warm.** A change that tears down and
  relaunches per request removes the reason the package exists.
- A DO is single-threaded and long-lived: a leaked page, an unawaited
  navigation, or an unbounded queue wedges it for everyone routed to it.
  Always close what you open, on the error path too.
- Browser rendering is billed and rate-limited. Concurrency caps and timeouts
  are cost control, not politeness — don't relax one to make a slow page work.

## Rules

- It fetches arbitrary user-supplied URLs: block local/private addresses, cap
  page weight and render time.
- Never return page-supplied content unsanitized to a caller that renders it.
- Workers constraints apply — no Node-only APIs, no filesystem. A passing Node
  test does not prove it runs; exercise it with wrangler.

The self-hosted, non-Worker variants live in `packages/render-url-to-html`.
