# Mapper agent

> runMapperAgent — the pure function that turns an analysis and a market into Polymarket order parameters, with every guard that protects the budget.
>
> Source: https://investing-lib.vercel.app/docs/prediction-agent/mapper

```ts
import { runMapperAgent, NoTradeError, type PolymarketOrderParams } from "investing/prediction-agent";
```

No AI, no network, synchronous. It is the one PredictionAgent step you can try right here:

> Interactive OrderMapper playground: see the live docs at https://investing-lib.vercel.app/docs/playground.

## Request

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `platform` | `"Polymarket" \| "Kalshi"` |  | Kalshi throws "coming soon" |
| `analysisResult` | `AnalysisResult` |  | recommendedAction, predictedWinner, winnerConfidence, marketProbability, estimatedActualProbability, ticker, title — a MarketAnalysis fits |
| `marketData` | `MarketData` |  | clobTokenIds, outcomes, outcomePrices (JSON strings), minimumTickSize, negRisk, acceptingOrders, closed, conditionId, slug, title / question |
| `budgetUsd` | `number` |  | $1 to $100 |

## What it does

Validates the platform, the analysis and the market, and that `budgetUsd` is between **$1** and **$100**.
`NO TRADE` → throws `NoTradeError`. Catch it: it is a decision, not a failure.
Refuses closed markets and markets with `acceptingOrders: false`.
Finds the side's token: `BUY YES` picks the outcome named `Yes` or `Up`, `BUY NO` picks `No` or `Down`.
Rounds the current price to the tick size (default `0.01`) and buys `floor(budget / price)` shares.
Throws if that is fewer than **5 shares** (Polymarket's minimum), telling you the minimum budget at this price.

## Result

```ts
{
  platform: "Polymarket",
  orderParams: {
    tokenId: "7132…2563",
    price: 0.37,
    side: "BUY",
    size: 67,
    feeRateBps: 0,
    tickSize: "0.01",
    negRisk: false,
    conditionId: "0x9c1a…",
    marketSlug: "will-the-fed-cut-rates-in-december",
    orderDescription: 'BUY 67 shares of YES @ 37.0% for ~$24.79 on "Will the Fed cut rates in December?"',
  },
  analysis: { recommendedAction: "BUY YES", side: "YES", confidence: 72 },
}
```

## Handling every outcome

```ts
import { runMapperAgent, NoTradeError, type AnalysisResult, type MarketData } from "investing/prediction-agent";

function toOrder(analysis: AnalysisResult, market: MarketData, budgetUsd: number) {
  try {
    return { kind: "order" as const, ...runMapperAgent({ platform: "Polymarket", analysisResult: analysis, marketData: market, budgetUsd }) };
  } catch (e) {
    if (e instanceof NoTradeError) return { kind: "skip" as const, reason: e.message };
    const msg = (e as Error).message;
    if (msg.startsWith("Budget too small")) return { kind: "skip" as const, reason: msg };
    if (msg === "Market is closed" || msg === "Market is not accepting orders") return { kind: "skip" as const, reason: msg };
    throw e; // bad input: a bug upstream
  }
}
```

> **WARN: The limits are deliberate**
>
> `$1 ≤ budget ≤ $100` and `size ≥ 5` are risk guards for autonomous runs. Size larger positions with your own
> logic and several orders, rather than by loosening the mapper.

Kalshi mapping is not implemented; `KalshiOrderParams` is declared for when it is.
