---
name: ask-ads-in-chat-answers
description: Guide to ads-in-chat-answers (packages/ads-in-chat-answers) — sponsored placements for AI chat answers. Covers the ChatAnswerAd product carousel (Ad badge, hide/about/ask/report menu), SponsoredFollowUps ("Learn more about …" row), the keyword auction (scoreCampaign, runAuction, selectChatAds — relevance gate, relevance × bid ranking, second-price CPC, one advertiser per answer), the AdvertiserPanel with LLM keyword generation (generateKeywordPlan, parseKeywordPlan, heuristicKeywordPlan), the ads-in-chat-answers/server handler and OpenAI-compatible model adapter, and the Vercel demo in demo/. Use when adding ads to a chat UI, when an ad shows on an unrelated question or never shows, when keyword generation returns heuristic results, when the demo's /api routes 404 or fail on Vercel, or when restyling the ads.
---

# Working With ads-in-chat-answers

`packages/ads-in-chat-answers`, published as **ads-in-chat-answers**. Three layers:

| Layer | File | What it does |
| --- | --- | --- |
| Auction | `src/matching.ts` | Pure keyword scoring and the second-price auction |
| Keywords | `src/keywords.ts` | LLM keyword plan with a defensive parser and a heuristic fallback |
| UI | `src/components/*` | `ChatAnswerAd`, `SponsoredFollowUps`, `AdvertiserPanel` |
| Server | `src/server/index.ts` | `handleAdsRequest` (`/keywords`, `/select`), `createOpenAICompatibleComplete` |

## Invariants — don't break these

- **The answer is written before ads are chosen** and the model never sees
  campaigns. Never pass ads into the answer prompt.
- **Relevance gates, price ranks.** `minRelevance` (0.3) filters before
  `adRank` is computed; a bid cannot buy an unrelated slot.
- **Ads are always labelled** ("Ad" badge; "Sponsored · Advertiser" tag) and
  product links carry `rel="sponsored"`.
- **Follow-up wording is ours**: `followUpQuestion(topic)` →
  "Learn more about <topic>". The sponsored row is never at index 0.
- `selectChatAds` excludes the answer winner from the follow-up auction.
- Model output is untrusted: `parseKeywordPlan` normalises, caps
  (`MAX_KEYWORDS`, `MAX_KEYWORD_LENGTH`) and returns null on anything else.

## Recipes

```ts
const slots = selectChatAds(campaigns, { query, answer });
const plan = await generateKeywordPlan(brief, createOpenAICompatibleComplete({ apiKey }));
```

Styles ship as `ads-in-chat-answers/styles.css`; override `--qads-*` tokens.

## The demo

`demo/` is **not** a workspace (a root `bun install` skips it). It builds
the package from `../src` through a Vite alias, and its build writes the
Vercel Build Output itself — `scripts/vercel-output.mjs` esbuild-bundles
`server/*.js` into Edge functions. Vercel's zero-config `api/` folder was
tried and did not follow imports outside the demo directory.

| Symptom | Cause | Fix |
| --- | --- | --- |
| Ad on an unrelated question | Overly broad single-word keyword | Use phrases; add negative keywords |
| Ad never shows | Paused, budget spent, no products/follow-up, or relevance < 30% | Check the demo's auction inspector |
| Keyword plan `source: "heuristic"` | No model key, model error, or non-JSON reply | Set `LLM_API_KEY`; check logs |
| `/api/*` 404 in `vite dev` | Handler name not in `server/` | Add `server/<name>.js`, and list it in `FUNCTIONS` in `scripts/vercel-output.mjs` |
| Two Reacts / hooks error in demo | `dedupe` removed from `demo/vite.config.js` | Keep `resolve.dedupe` |

```bash
cd packages/ads-in-chat-answers && bun run test
cd packages/ads-in-chat-answers/demo && bun install && bun run build
```
