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
- **A named topic list is not a ranking.** `?topics=`/`getCustomTopicNews` keeps
  the caller's order and keeps a topic that has no headlines (`news_count: 0`).
  Don't re-sort it and don't drop the empty ones the way the daily list does:
  the user chose those rows, and a row that silently vanishes reads as a setting
  that failed to save.
- **Topic lists are user input.** Everything that accepts one runs it through
  `parseTopicList` — trim, length-cap, case-insensitive de-duplication, and a
  cap of `MAX_CUSTOM_TOPICS`. Each topic costs one upstream search, so an
  uncapped list is a way to burn the day's quota in one request.
- Titles and summaries come from Wikipedia and are user-editable content: treat
  them as untrusted and sanitize before rendering.
- Data is per-language-wiki. Don't hardcode English.

```bash
cd packages/trending-news-api && bun run test
```
