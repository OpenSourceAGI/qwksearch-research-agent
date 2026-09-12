# CLAUDE.md — `trending-news-api`

**Read [`skills/ask-trending-news`](../../../skills/ask-trending-news/SKILL.md)
first.**

A React trending-news widget backed by **Wikipedia pageview** data. Published.

## Rules

- **Wikipedia's API is free and rate-limited.** Cache aggressively; send a
  proper user agent; never fan out one request per item.
- Pageview spikes are a proxy for "trending", not an editorial judgement. The
  widget shows what is being read — don't add ranking that implies importance or
  endorsement.
- Titles and summaries come from Wikipedia and are user-editable content: treat
  them as untrusted and sanitize before rendering.
- Data is per-language-wiki. Don't hardcode English.

```bash
cd packages/trending-news-api && bun run test
```
