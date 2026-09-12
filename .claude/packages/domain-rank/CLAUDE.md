# CLAUDE.md — `domain-rank`

**Read [`skills/ask-domain-rank`](../../../skills/ask-domain-rank/SKILL.md) first.**

Top-million domain ranks, source names, duplicate detection and favicons — what
turns a bare URL into a labelled, ranked source in search results. Published.

## Rules

- **It is on the hot path of every search.** Lookups must stay cheap and
  synchronous-ish; a network call per result would be felt on every query.
- The rank data is a **bundled dataset**. Don't hand-edit it — regenerate it,
  and remember it ships to consumers, so size is a real cost.
- Source-name mapping is user-visible: it decides what a result is labelled. A
  wrong or missing name is a visible quality bug in the product.
- Duplicate detection feeds dedupe in `search-web-api` — changing normalization
  changes which results collapse together.

```bash
cd packages/domain-rank && bun run test
```
