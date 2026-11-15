# Introduction

> A TypeScript toolkit for market data, brokerage, prediction-market analysis and AI trading agents, published on npm as investing.
>
> Source: https://investing-lib.vercel.app/docs/

`investing` bundles several fairly independent toolkits behind one npm name. You can use one of them and
ignore the rest: a script that only needs stock quotes never touches the prediction-market code, and the
PredictionAgent agents never touch the database.

```bash
npm install investing
```

## What is in the box

- [Stock data](https://investing-lib.vercel.app/docs/stocks) — getQuote / getQuotes / getHistoricalQuotes with cache → Alpaca → Yahoo fallback, plus full Yahoo Finance, Finnhub and SEC EDGAR clients.
  - [Alpaca brokerage](https://investing-lib.vercel.app/docs/alpaca) — createAlpacaClient for paper or live trading and createAlpacaBrokerClient for the Broker API.
  - [Polymarket](https://investing-lib.vercel.app/docs/prediction) — Markets, search, leaderboards, trader activity, holders, order books and price history, with sync jobs into D1.
  - [PredictionAgent](https://investing-lib.vercel.app/docs/prediction-agent) — URL → markets → AI analysis → consensus → order parameters, plus a cross-venue arbitrage finder for Kalshi and Polymarket.
  - [Trading agents](https://investing-lib.vercel.app/docs/trading-agents) — TradingAgentsGraph: analysts, a three-round bull vs. bear debate, a judge and a trader, with memory.
  - [Correlate (XGBoost)](https://investing-lib.vercel.app/docs/correlate) — Train, predict, score (RMSE, R²), add rolling stats, and persist gradient-boosted models.
  - [Live FX & indices](https://investing-lib.vercel.app/docs/live-data) — Dukascopy historical and real-time candles and ticks for forex, indices, crypto and commodities.
  - [Social trading](https://investing-lib.vercel.app/docs/social-trading) — Leaders from Polymarket, NVSTLY and ZuluTrade, synced with their positions.
  - [Wikipedia pageviews](https://investing-lib.vercel.app/docs/wiki-pageviews) — A typed client for the Wikimedia pageviews API, for attention and trend signals.
  - [D1 database](https://investing-lib.vercel.app/docs/database) — Drizzle schemas for portfolios, trades, signals and every synced dataset, on Cloudflare D1.

## Thirty-second tour

**Stocks**

```ts
import { getQuote } from "investing/stocks";

const res = await getQuote("AAPL");
if (res.success && res.data) {
  const q = res.data;
  console.log(`${q.symbol} ${q.price} (${q.changePercent?.toFixed(2)}%) via ${q.source}`);
}
```

**Prediction markets**

```ts
import { fetchMarkets } from "investing/prediction";
import { getEvents } from "investing/prediction-agent";

const hottest = await fetchMarkets(5, "volume24hr");
console.log(hottest.map((m: any) => m.question));

const event = await getEvents({ url: "https://polymarket.com/event/fed-decision-in-december" });
console.log(event.pmType, event.marketsCount);
```

**Agents**

```ts
import { TradingAgentsGraph } from "investing/trading-agents";

const graph = new TradingAgentsGraph(["market"], false, {
  llmProvider: "groq",
  deepThinkLLM: "llama-3.3-70b-versatile",
  quickThinkLLM: "llama-3.1-8b-instant",
});
const { signal } = await graph.propagate("MSFT", "2026-11-13");
console.log(signal.action); // "BUY" | "SELL" | "HOLD"
```

## How the docs are organised

- **Guide** — install, the [import paths](https://investing-lib.vercel.app/docs/imports) (read this one: some subpaths are declared but not
  built yet), every [environment variable](https://investing-lib.vercel.app/docs/environment), and a [playground](https://investing-lib.vercel.app/docs/playground) that runs
  the pure functions in your browser.
- **Module pages** — one per toolkit, each with a function reference, the shape of every result, and examples.
- **Reference** — longer [recipes](https://investing-lib.vercel.app/docs/recipes) that combine modules, and a
  [troubleshooting](https://investing-lib.vercel.app/docs/troubleshooting) table keyed by error message.

> **WARN: This code reasons about money**
>
> Position sizing, budget limits and risk guards are part of the product. The order mapper refuses budgets
> outside $1–$100 and orders under 5 shares on purpose. Nothing here is financial advice, and examples that
> trade default to paper accounts.

## Where it comes from

The package is maintained in the
[`qwksearch-research-agent`](https://github.com/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/investing)
monorepo and vendored from `ai-broker-investing-agent`.
