# CLAUDE.md — `ads-in-chat-answers`

**Read [`skills/ask-ads-in-chat-answers`](../../../skills/ask-ads-in-chat-answers/SKILL.md)
first.**

Sponsored placements for chat answers: a product carousel under the answer, a
sponsored follow-up question, the keyword auction, and the advertiser panel.
Published.

## Rules

- **Ads never influence the answer.** The auction runs after the answer
  exists; don't add campaign data to any answer prompt, and don't render an ad
  inside the answer text.
- **Relevance before price.** Keep the `minRelevance` gate ahead of ranking.
- **Always labelled.** Don't remove the "Ad" badge, the "Sponsored" tag, the
  hide/report actions, or `rel="sponsored"` on product links.
- **Keyword plans are untrusted model output** — every path goes through
  `parseKeywordPlan`/`cleanKeyword`, and a model failure falls back to the
  heuristic instead of throwing.
- `demo/` is not a workspace and has its own `bun.lock`; it deploys to Vercel
  via `scripts/vercel-output.mjs` (Build Output API), not a zero-config `api/`
  folder.

```bash
cd packages/ads-in-chat-answers && bun run test
```
