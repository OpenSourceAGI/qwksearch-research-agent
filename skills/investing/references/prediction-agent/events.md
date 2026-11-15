# getEvents

> Resolve a Polymarket, Kalshi or Jupiter prediction-market URL into its event identifier and raw markets.
>
> Source: https://investing-lib.vercel.app/docs/prediction-agent/events

```ts
import { getEvents, type GetEventsResult } from "investing/prediction-agent";

const event = await getEvents({ url }, { dflowApiKey? });
```

## Supported URLs

| URL contains | Treated as | Identifier taken from | Data provider |
| --- | --- | --- | --- |
| `polymarket` | Polymarket | the last path segment (query string dropped) = event slug | Gamma API (no key) |
| `kalshi` | Kalshi | the last path segment, upper-cased = event ticker | DFlow (`DFLOW_API_KEY`) |
| `jup.ag/prediction` | Kalshi (`urlSource: "jupiter"`) | the last path segment, upper-cased | DFlow |

```ts
await getEvents({ url: "https://polymarket.com/event/fed-decision-in-december?tid=123" });
// eventIdentifier: "fed-decision-in-december"

await getEvents({ url: "https://kalshi.com/markets/kxfeddecision/fed-meeting/kxfeddecision-26dec" });
// eventIdentifier: "KXFEDDECISION-26DEC"

await getEvents({ url: "https://jup.ag/prediction/KXPRESNOMD-28" });
// pmType: "Kalshi", urlSource: "jupiter", eventIdentifier: "KXPRESNOMD-28"
```

> **WARN**
>
> Paste the **event** URL, not a single-market deep link: the identifier is always the last segment.

## Result

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `eventIdentifier` | `string` |  | Polymarket slug or Kalshi event ticker |
| `eventId` | `string \| undefined` |  | Polymarket numeric event id (used for OkBet links) |
| `pmType` | `"Kalshi" \| "Polymarket"` |  |  |
| `urlSource` | `"kalshi" \| "polymarket" \| "jupiter"` |  |  |
| `markets` | `unknown[]` |  | raw provider markets — Gamma markets or DFlowKalshiMarket |
| `marketsCount` | `number` |  |  |
| `dataProvider` | `"gamma" \| "dflow"` |  |  |
| `processingTimeMs` | `number` |  |  |

## Errors

| Message | Cause |
| --- | --- |
| `Missing required parameter: 'url'` | empty `url` |
| `Could not detect prediction market type from URL…` | not Polymarket, Kalshi or Jupiter |
| `Event '<ticker>' not found on Kalshi (via DFlow).` | DFlow 404 |
| `Event '<slug>' not found on Polymarket.` | Gamma had no such event |
| `No markets found for '<id>' on <pmType>.` | the event exists but has no markets |

## Examples

```ts title="List an event's markets with prices"
const event = await getEvents({ url: "https://polymarket.com/event/presidential-election-winner-2028" });
for (const m of event.markets as any[]) {
  const prices = typeof m.outcomePrices === "string" ? JSON.parse(m.outcomePrices) : m.outcomePrices;
  console.log(`${(Number(prices[0]) * 100).toFixed(1).padStart(5)}%  ${m.question}`);
}
```

```ts title="Kalshi spreads"
const k = await getEvents({ url: "https://kalshi.com/markets/kxfeddecision/fed-meeting/kxfeddecision-26dec" });
for (const m of k.markets as any[]) {
  console.log(m.ticker, `bid ${m.yes_bid} / ask ${m.yes_ask}`, `vol24h ${m.volume_24h}`);
}
```
