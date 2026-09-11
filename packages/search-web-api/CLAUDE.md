# CLAUDE.md — `search-web-api`

**Read [`skills/ask-search-web-api`](../../skills/ask-search-web-api/SKILL.md)
and its `API.md` first.**

70+ search engines across 10 categories, plus dedupe and ranking. Published.

## Engine adapters are the bulk of this package

- **One adapter per engine, isolated.** An engine that changes its HTML or
  starts rate-limiting must degrade to "this engine returned nothing", never
  take down the query. Failure of one adapter is normal operation.
- **Never let an engine's markup reach a consumer unsanitized.** Results are
  scraped HTML from arbitrary sites.
- Dedupe and ranking are what make 70 engines useful rather than noisy. A change
  to either reorders results for every user — pin the behaviour in a test and
  say so in the PR.
- `domain-rank` supplies source labels, rank and favicons; don't reimplement
  them here.

## Rules

- Adding an engine: a new adapter plus its category, nothing else.
- Respect robots/ToS and rate limits — this is a polite client, not a scraper
  race.
- Tests must not depend on a live engine returning particular results. Use
  fixtures.

```bash
cd packages/search-web-api && bun run test
```
