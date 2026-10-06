# ads-in-chat-answers

Sponsored placements for AI chat answers, in the style of the product ads
that appear under an assistant's reply:

- **Answer carousel** — an advertiser header, an always-visible **Ad** label,
  a ⋯ menu (*Hide this ad*, *About this ad*, *Ask about this ad*, *Report this
  ad*) and a scrolling row of product cards, rendered *after* the answer.
- **Sponsored follow-up** — one row in the "Related" questions list, worded
  only as **"Learn more about ‹topic›"** and labelled *Sponsored · Advertiser*.
  It is never the first suggestion.
- **Keyword auction** — campaigns are scored against the question (full
  weight) and the answer (half weight); negative keywords veto; anything under
  30% relevance is dropped whatever it bids; the rest rank by relevance × max
  CPC and the winner pays a second price. One advertiser cannot take both
  placements on the same answer.
- **Advertiser panel** — describe the business, press *Generate keywords with
  AI* (an LLM proposes keywords, negative keywords and a follow-up topic),
  pick placements and products, set a bid and budget, and test any question
  against the live auction before launching.

The answer is generated before, and without knowledge of, any ad. Ads never
appear inside the answer text.

## Install

```bash
bun add ads-in-chat-answers
```

## Showing ads in a chat

```tsx
import { ChatAnswerAd, SponsoredFollowUps, selectChatAds } from 'ads-in-chat-answers';
import 'ads-in-chat-answers/styles.css';

const { answer, followUp } = selectChatAds(campaigns, { query, answer: text });

<Answer text={text} />
{answer && (
  <ChatAnswerAd
    selection={answer}
    onImpression={logImpression}
    onProductClick={(product, sel) => chargeClick(sel.campaign.id, sel.costPerClickCents)}
    onReport={reportAd}
  />
)}
<SponsoredFollowUps questions={related} sponsored={followUp} onSelect={(q, sel) => ask(q)} />
```

`selectChatAds` is pure — run it in the browser, a Worker or a route. Charge a
click with `recordClick(campaign, cost)`; a campaign at its daily budget drops
out of the auction.

## Keyword generation (server)

```ts
import { createOpenAICompatibleComplete, handleAdsRequest } from 'ads-in-chat-answers/server';

const complete = createOpenAICompatibleComplete({ apiKey: env.OPENROUTER_API_KEY }); // OpenRouter by default

export default {
  fetch: (request: Request) =>
    handleAdsRequest(request, { complete, getCampaigns: () => loadCampaigns() }),
};
```

| Route | Body | Returns |
| --- | --- | --- |
| `POST …/keywords` | `{ advertiser, description, website?, products?, existingKeywords? }` | `KeywordPlan` |
| `POST …/select` | `{ query, answer? }` | `{ answer, followUp }` (only when `getCampaigns` is given) |

Without a model, or when the model's reply isn't the requested JSON, the plan
falls back to a deterministic heuristic (`source: "heuristic"`) instead of
failing.

## The advertiser panel

```tsx
<AdvertiserPanel
  campaigns={campaigns}
  stats={statsByCampaignId}
  onSave={saveCampaign}
  onDelete={deleteCampaign}
  generateKeywords={(brief) => fetch('/api/ads/keywords', { method: 'POST', body: JSON.stringify(brief) }).then((r) => r.json())}
/>
```

## Theming

Every rule is scoped under `.qads-root` and every colour is a `--qads-*`
custom property. Dark by default; light under `prefers-color-scheme: light`,
`[data-theme="light"]` or `.light`.

## Demo (Vercel)

`demo/` is a chat UI with the placements, an auction inspector showing every
campaign's score, and the advertiser panel. It runs offline with seed
campaigns and canned answers; a model key makes the answers and keyword plans
live.

```bash
cd demo && bun install && bun run dev       # http://localhost:5173, /api included
```

Deploy: import the repo in Vercel and set **Root Directory** to
`packages/ads-in-chat-answers/demo` (keep "Include files outside the root
directory" on — the demo builds the package from `../src`). Optional env vars:

| Variable | Default |
| --- | --- |
| `LLM_API_KEY` (or `OPENROUTER_API_KEY` / `OPENAI_API_KEY`) | none — canned answers and heuristic keywords |
| `LLM_BASE_URL` | `https://openrouter.ai/api/v1` |
| `LLM_MODEL` | `openai/gpt-4o-mini` |

The build writes Vercel's Build Output directly (`scripts/vercel-output.mjs`),
bundling `server/*.js` into Edge functions at `/api/answer` and `/api/keywords`.
