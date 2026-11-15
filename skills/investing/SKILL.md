---
name: investing
description: Guide to investing (packages/investing), the financial-data, trading-agent and prediction-market package, with the full docs site bundled under references/ — the Alpaca SDK client and the fetch-only createAlpacaRest client for Cloudflare Workers, the StackBlitz-ready stock, prediction-market and cron-Worker agent examples, Yahoo/Finnhub/SEC stock data and the unified quote service, the Polymarket sync/analysis layer under investing/prediction, the LangGraph debate agents under investing/trading-agents, the XGBoost correlate models, the D1/drizzle schemas, and the merged PredictionAgent core on investing/prediction-agent (runEventAnalysisAgent, runBookmakerAgent, runMapperAgent, findArbitrage, getEvents, the Kalshi/DFlow and Polymarket/Dome data clients, and the OpenAI/Grok/BlockRun AI clients). Use when importing from investing or any of its subpaths, when building a trading or prediction-market agent or a scheduled agent on Cloudflare Workers, when a subpath import resolves to nothing after an edit, when an agent throws about a missing model/markets/url parameter, when D1 says no connection is available, or when a prediction-market call 401s on DOME_API_KEY / DFLOW_API_KEY.
---

# Working With investing

`packages/investing`, published as **investing**. A vendored package (it originates in
[`ai-broker-investing-agent`](https://github.com/OpenSourceAGI/ai-broker-investing-agent))
covering four fairly separate concerns behind one name. Full user docs, with examples
and a live playground, are the Fumadocs site in `packages/investing/site`, deployed at
<https://investing-lib.vercel.app>. **Every docs page is copied into
[`references/`](references/) as Markdown** — see [All docs pages](#all-docs-pages) and read
the page for the area you are working on before answering from memory.

| Area | Lives in | Subpath |
| --- | --- | --- |
| Brokerage execution | `src/alpaca` | `investing/alpaca`, `investing/alpaca/rest` (fetch-only) |
| Equities data and analysis | `src/stocks`, `src/correlate` | `investing/stocks` |
| Polymarket sync, analysis and storage | `src/prediction` | `investing/prediction` |
| LangGraph bull/bear debate agents | `src/trading-agents` | `investing/trading-agents` |
| **PredictionAgent prediction-market core** | `src/prediction-agent` | `investing/prediction-agent` |

Everything under `src/prediction-agent/` is MIT licensed; the license text lives verbatim in
`LICENSE-PredictionAgent-MIT` and must keep shipping with the package. The rest of the
package is `rights.institute/prosper`.

## Setup

```bash
cd packages/investing
bun run build     # vite lib build — multi-entry, see "The subpath trap"
bun run test      # vitest; the live-network suites self-skip without keys
```

Environment variables, by area — nothing is hardcoded and every key has a
config-object override:

```bash
# Brokerage
ALPACA_API_KEY=          ALPACA_SECRET=
# ALPACA_BASE_URL=https://api.alpaca.markets   # omit for paper trading
# ALPACA_PAPER=false  ALPACA_DATA_FEED=iex      # createAlpacaRest only

# PredictionAgent — AI providers (AIConfig)
OPENAI_API_KEY=          # openaiApiKey
XAI_API_KEY=             # xaiApiKey — Grok, and the only models that take `tools`
BLOCKRUN_WALLET_KEY=     # blockrunWalletKey — x402 micropayments, Base chain

# PredictionAgent — market data (DataConfig)
DOME_API_KEY=            # domeApiKey — Polymarket via Dome
DFLOW_API_KEY=           # dflowApiKey — Kalshi via DFlow

# PredictionAgent — execution / research agents (optional)
POLYMARKET_WALLET_PRIVATE_KEY=   POLYMARKET_PROXY_WALLET_ADDRESS=
POLYMARKET_SIGNATURE_TYPE=       POLYFACTUAL_API_KEY=
X402_EVM_PRIVATE_KEY=            X402_SOLANA_PRIVATE_KEY=

# Storage (Cloudflare D1 only)
CLOUDFLARE_ACCOUNT_ID=   CLOUDFLARE_D1_TOKEN=   CLOUDFLARE_DATABASE_ID=
```

## Picking the right call

| You want | Call | From |
| --- | --- | --- |
| Trade a real/paper equity account from Node | `createAlpacaClient({ paper, keyId, secretKey })` (official SDK) | `investing/alpaca` |
| Trade from a Worker, Deno, Bun edge or the browser | `createAlpacaRest({ env })` — `getAccount`, `getPositions`, `createOrder`, `placeBracketOrder`, `getBars`, `getLatestQuotes`, `isMarketOpen` | `investing/alpaca/rest` |
| A stock quote or history | `getQuote`, `getQuotes`, `getHistoricalQuotes`, `getQuoteFromSource` (the unified quote service) | `investing/stocks` |
| SEC filings | `sec-filing-api` exports | `investing/stocks` |
| Polymarket markets / leaderboard | `fetchMarkets`, `fetchLeaderboard` | `investing/prediction` |
| A bull-vs-bear LLM debate on a ticker | `new TradingAgentsGraph(config)` | `investing/trading-agents` |
| An XGBoost timeseries correlation | `src/correlate/predict-statistics` exports | `investing` |
| **Raw markets behind a market URL** | `getEvents({ url })` | `investing/prediction-agent` |
| **Alpha + predicted winner for an event** | `runEventAnalysisAgent(request, config?)` | `investing/prediction-agent` |
| **Consolidate several analyses** | `runBookmakerAgent(request, config?)` | `investing/prediction-agent` |
| **Turn an analysis into order params** | `runMapperAgent(request)` | `investing/prediction-agent` |
| **Cross-venue mispricing** | `findArbitrage({ url, model }, config?)` | `investing/prediction-agent` |
| One raw provider call | `dflowRequest`, `getKalshiMarketsByEvent`, `domeRequest`, `getPolymarketMarkets` | `investing/prediction-agent/data/*` |
| One raw model call | `callOpenAIResponses`, `callGrokResponses`, `callBlockRunResponses` | `investing/prediction-agent/ai` |
| A prompt string without the call | `analyzeEventMarketsPrompt`, `bookmakerAnalysisPrompt`, `arbitrageAnalysisPrompt`, `searchQueryGeneratorPrompt` | `investing/prediction-agent/ai` |
| To actually place a Polymarket order | `runPolymarketPutOrder` | `investing/prediction-agent/agents` |

Every PredictionAgent entry point has the same shape: `fn(request, config = {})`, where
`request` carries the required fields and `config` is `AIConfig` and/or `DataConfig`
whose every field falls back to `process.env`. **Missing required fields throw** — they
are not returned as an error result.

## Recipes

### An agent on a Cloudflare cron (Alpaca)

```ts
// src/worker.ts — wrangler.jsonc: "triggers": { "crons": ["0 15 * * 1-5"] }
import { createAlpacaRest } from "investing/alpaca/rest"; // never "investing/alpaca" in a Worker

export default {
  async scheduled(_c, env, ctx) {
    const alpaca = createAlpacaRest({ env });            // keys from Worker secrets
    ctx.waitUntil((async () => {
      if (!(await alpaca.isMarketOpen())) return;
      const bars = await alpaca.getBars("SPY", { timeframe: "1Day", limit: 60 });
      // ...decide...
      await alpaca.createOrder({ symbol: "SPY", side: "buy", notional: 100 });
    })());
  },
} satisfies ExportedHandler<Env>;
```

`createAlpacaRest` is paper unless `paper: false` or `ALPACA_PAPER=false`, throws
before the request when keys are missing (`hasKeys` checks first), and throws
`AlpacaApiError` (`status`, `body`, `path`) on any non-2xx. `getPosition` returns
`null` on 404. `investing/alpaca` (the SDK) does not bundle for Workers.

### Ready-to-run examples (StackBlitz)

Four projects in `packages/investing/examples/`, each with a `.stackblitzrc`
(`npm start`) and a README; the docs page is [examples](references/examples.md).
Open one with `https://stackblitz.com/github/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/investing/examples/<name>`.

| Example | Shape |
| --- | --- |
| `stock-momentum-agent` | Node: trend + momentum ranking, equal-weight rebalance on Alpaca paper; demo prices without keys |
| `prediction-market-agent` | Node: top Polymarket events from the keyless Gamma API → `runEventAnalysisAgent` |
| `stock-cron-worker` | Worker cron `0 15 * * 1-5`, `investing/alpaca/rest` only (~10 KB bundle) |
| `prediction-cron-worker` | Worker cron hourly: 24h movers → AI opinion → Discord/Slack webhook |

The Worker examples keep one run in `src/agent.ts`, the handlers in `src/worker.ts`
and a Node runner in `src/run-once.ts` (what `npm start` runs, because StackBlitz's
WebContainer cannot start `workerd`). They depend on `investing@latest` from npm, so a
new export is usable there only after the publish workflow ships it. Each example has
`.npmrc` `ignore-scripts=true` so the native `xgboost_node` install script never runs.

### URL → analysis, the full PredictionAgent path

```ts
import { getEvents, runEventAnalysisAgent, runMapperAgent, NoTradeError }
  from "investing/prediction-agent";

const event = await getEvents({ url });               // Kalshi→DFlow, Polymarket→Gamma
const { analysis } = await runEventAnalysisAgent({
  markets: event.markets,
  eventIdentifier: event.eventIdentifier,
  pmType: event.pmType,                               // "Kalshi" | "Polymarket"
  model: "grok-4-fast",
  tools: ["x_search"],                                // Grok models only
});

try {
  const { orderParams } = runMapperAgent({        // synchronous
    platform: "Polymarket",                           // case-sensitive; "Kalshi" throws
    analysisResult: analysis,
    marketData: event.markets[0],                     // JSON.stringify outcomes/outcomePrices/clobTokenIds if arrays
    budgetUsd: 25,                                    // $1–$100
  });
} catch (e) {
  if (e instanceof NoTradeError) { /* the analysis said NO TRADE */ }
}
```

`runMapperAgent` is pure logic — it produces order parameters and places nothing.
Kalshi mapping is not implemented; only `PolymarketOrderParams` come back.

### Arbitrage across venues

```ts
import { findArbitrage } from "investing/prediction-agent";

const { analysis, sourceMarket, searchedMarket } =
  await findArbitrage({ url, model: "grok-4-fast" }, { domeApiKey, dflowApiKey });
```

It parses the URL, generates a search query with the model, searches the *other*
platform, and asks the model whether the same event is mispriced. `model` is required;
the returned `model` can come back as `"none"` when the search found nothing.

### Kalshi data without the agents

```ts
import { getKalshiMarketsByEvent, buildKalshiMarketUrl } from "investing/prediction-agent/data/kalshi";
import { getPolymarketMarkets } from "investing/prediction-agent/data/polymarket";
```

Importing those names from the barrel gets you the **DFlow** Kalshi client. The Dome
client exports Kalshi helpers under the same names, so the barrel renames its two to
`getDomeKalshiMarketsByEvent` / `buildDomeKalshiMarketUrl`. Same reason the barrel
namespaces three clients: `polymarketClob` (Gamma/CLOB trading), `polyfactual`, `x402`.

### D1

```ts
import { db, positions, trades, polymarketMarkets } from "investing/db";
// drizzle-orm is a peer dependency
```

`db` is a lazy `Proxy` — nothing connects until the first property access. On Workers it
uses the `DB` binding off `globalThis.__CLOUDFLARE_ENV__`; anywhere else it reaches the
same D1 database over Cloudflare's REST API.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| A `investing/prediction-agent/*` import resolves to nothing | The subpath exports point at `dist/`, and the entry has to be declared in `vite.config.ts`'s `build.lib.entry` map as well as in `package.json`'s `exports`. Add it in **both**, then `bun run build`. |
| `investing/constants` or `/utils` resolve to nothing | Declared in `exports` but never built (`src/constants` does not exist). `./alpaca`, `./stocks`, `./prediction` and `./trading-agents` are built since the docs-site change; on ≤0.1.346 they were missing too, so import those names from the barrel there. |
| A package edit "doesn't show up" in the web app | Consumers read `dist/`, not `src/`. `bun run build` in `packages/investing`. |
| `Missing required parameter: 'model'` / `'url'` / `Missing or invalid 'markets'` | PredictionAgent validates by throwing. `findArbitrage` needs both `url` *and* `model`; `runEventAnalysisAgent` needs `markets`, `eventIdentifier`, `pmType` and `model`. |
| `NoTradeError` out of `runMapperAgent` | Not a bug — the analysis recommended NO TRADE. Catch it; it is exported from `investing/prediction-agent`. |
| `Could not detect prediction market type from URL` | `getEvents` only recognises Kalshi, Polymarket and Jupiter prediction-market URLs. |
| 401/403 from a market data call | `DOME_API_KEY` (Polymarket/Dome) or `DFLOW_API_KEY` (Kalshi/DFlow), or pass `domeApiKey`/`dflowApiKey` in the `DataConfig` second argument. |
| `tools: ["x_search"]` silently ignored | `x_search` / `web_search` are Grok/xAI only. OpenAI and BlockRun calls drop them. |
| A `blockrun/…` model is routed to OpenAI | Check with `isBlockRunModel(model)` — it matches the `blockrun/` prefix *or* a key in `BLOCKRUN_MODELS`. BlockRun pays per call from a Base-chain wallet (`BLOCKRUN_WALLET_KEY`); the on-chain flow is untested here. |
| `Cannot find module '@solana/web3.js'` | The x402 Solana payment path only. They are `optionalDependencies` and are imported through variable specifiers, so install them explicitly if you need that path. |
| `No Cloudflare D1 connection available` | Off Workers, set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_D1_TOKEN` (plus `CLOUDFLARE_DATABASE_ID`). D1 is the only supported database; there is no local SQLite fallback. |
| `drizzle-orm` not found | It is a **peer** dependency — install it in the consuming app. |
| Tests pass suspiciously fast | `test/polymarket-price-history.test.ts` and six of the debate-agent cases self-skip without network/API keys. |
| `getStockQuote` / `getHistoricalData` / `createTradingGraph` / `stocksTable` not found | The README's API reference is stale on those names. The source has `getQuote`/`getQuotes`/`getHistoricalQuotes`, `TradingAgentsGraph` (a class), and drizzle tables named `positions`, `trades`, `polymarketMarkets`, … `getHistoricalData` does exist, but it is the Dukascopy FX client in `src/live-data`, not a stock call. |
| A Worker build fails on axios / node built-ins from Alpaca | You imported `investing/alpaca` (the SDK). Import `createAlpacaRest` from `investing/alpaca/rest` instead. |
| `Alpaca API keys missing` thrown from `createAlpacaRest` | Pass `{ env }` in a Worker, or set `ALPACA_API_KEY` / `ALPACA_SECRET`. Unlike `createAlpacaClient`, it throws instead of warning. |
| Two things both called "prediction markets" | `src/prediction` is the Polymarket sync/storage/analysis layer (D1-backed). `src/prediction-agent` is the PredictionAgent agent/arbitrage core (stateless, provider APIs). They do not share types. |

## Also

- README: [`packages/investing/README.md`](../../packages/investing/README.md) — the API
  reference, the PredictionAgent section, the Deno→Node refactor notes and what is not ported.
- The debate agents have their own notes in `src/trading-agents/README.md` and
  `IMPROVEMENTS.md`; the correlate models in `src/correlate/README.md`; the quote
  service in `src/stocks/UNIFIED-QUOTE-SERVICE.md`.

## All docs pages

Generated from `packages/investing/site/content/docs` by
`bun run skill:docs` in `packages/investing` (re-run it after editing the docs). Each file
is the page's full content with the Fumadocs components flattened to Markdown.

<!-- DOCS-INDEX:START (generated by packages/investing/scripts/build-skill-docs.mjs) -->
**Guide**

- [Introduction](references/index.md) — A TypeScript toolkit for market data, brokerage, prediction-market analysis and AI trading agents, published on npm as investing.
- [Getting started](references/getting-started.md) — Install the package, set the keys for the parts you use, and make a first call to each toolkit.
- [Import paths](references/imports.md) — Which subpaths exist, what each one loads, and why importing the barrel costs more than you might expect.
- [Environment variables](references/environment.md) — Every key and setting the package reads, grouped by module, with the config-object field that overrides each one.
- [Playground](references/playground.md) — The package's pure functions, running in your browser. Change the inputs and watch the real code respond.
- [StackBlitz examples](references/examples.md) — Ready-to-run agents you can open in the browser — a stock momentum agent on Alpaca, a prediction-market agent on Polymarket, and both as Cloudflare Worker cron jobs.

**Markets & brokerage**

- [Alpaca brokerage](references/alpaca.md) — createAlpacaClient for paper and live trading, createAlpacaRest for fetch-only runtimes like Cloudflare Workers, createAlpacaBrokerClient for the Broker API, and AlpacaMCPClient for an Alpaca MCP server.
- [Unified quote service](references/stocks.md) — getQuote, getQuotes, getHistoricalQuotes and getQuoteFromSource — one normalized quote shape from a D1 cache, Alpaca and Yahoo Finance, with timeouts and fallback.
- [Yahoo Finance](references/stocks/yahoo-finance.md) — yahooFinance — a wrapper over yahoo-finance2 with quotes, charts, fundamentals, options, earnings, ownership, screeners and more, all returning { success, data | error }.
- [Finnhub](references/stocks/finnhub.md) — finnhub — candles with an Alpaca fallback, quote summaries, symbol search, peers, analyst trends, financials, company news and forex rates.
- [SEC filings](references/stocks/sec-filings.md) — Downloader — look up 10-K, 10-Q, 8-K and every other EDGAR filing by ticker or CIK, and download the primary document.
- [Stock names](references/stocks/stock-names.md) — stockNames — every US-listed symbol with its company name, industry, market cap and CIK, plus cleanCompanyName for display.

**Prediction markets**

- [Polymarket overview](references/prediction.md) — investing/prediction — read Polymarket markets, search, leaderboards, traders, holders and prices, then sync them into Cloudflare D1 and analyse them.
- [Markets & search](references/prediction/markets.md) — fetchMarkets, fetchAllMarkets, searchMarkets, searchPublic, fetchMarket, fetchActiveMarketsWithPrices and the category/keyword blocklist.
- [Leaderboards & traders](references/prediction/traders.md) — fetchLeaderboard, fetchTopTraders, fetchTraderPositions, fetchTraderProfiles, fetchTraderActivity and fetchAllTraderActivity — follow the wallets that make money on Polymarket.
- [Prices & analytics](references/prediction/prices-analytics.md) — fetchPriceHistory, holders, order books, market summaries, binary-option Greeks, price-change windows and category P&L.
- [Sync & storage](references/prediction/sync-storage.md) — Jobs that copy Polymarket markets, leaderboards, holders, price history and full trader histories into Cloudflare D1, and the queries that read them back.
- [PredictionAgent overview](references/prediction-agent.md) — The prediction-market agent pipeline — paste a Kalshi, Polymarket or Jupiter URL, get its markets, an AI analysis with alpha and a predicted winner, a multi-agent consensus, and Polymarket order parameters.
- [getEvents](references/prediction-agent/events.md) — Resolve a Polymarket, Kalshi or Jupiter prediction-market URL into its event identifier and raw markets.
- [Event analysis agent](references/prediction-agent/event-analysis.md) — runEventAnalysisAgent — ask an LLM for the best opportunity in an event's markets, with estimated probability, alpha, predicted winner, risks and sources.
- [Bookmaker agent](references/prediction-agent/bookmaker.md) — runBookmakerAgent — merge several model analyses and PayAI / x402 research results into one consensus with agreement level and dissent.
- [Mapper agent](references/prediction-agent/mapper.md) — runMapperAgent — the pure function that turns an analysis and a market into Polymarket order parameters, with every guard that protects the budget.
- [Arbitrage finder](references/prediction-agent/arbitrage.md) — findArbitrage — take a Polymarket or Kalshi URL, find the same event on the other venue, and check whether buying YES on one and NO on the other locks in a profit.
- [AI clients & prompts](references/prediction-agent/ai-clients.md) — callOpenAIResponses, callGrokResponses, callBlockRunResponses and the four prompt builders the agents use — for running PredictionAgent prompts through your own flow.
- [Market data clients](references/prediction-agent/data-clients.md) — Kalshi through DFlow and Polymarket (plus Kalshi) through Dome — the raw request helpers, typed market shapes and URL builders.
- [Execution & research agents](references/prediction-agent/execution-agents.md) — runPolymarketPutOrder, runPolymarketPositionTracker, runPolymarketUpDown15LimitOrderBot, runPolyfactualResearch and runX402Seller — the agents that spend money or buy research.

**AI agents**

- [TradingAgentsGraph](references/trading-agents.md) — A multi-agent stock analysis run — market and news analysts, three rounds of bull vs. bear debate, an investment judge and a trader — that returns BUY, SELL or HOLD and learns from outcomes.
- [The agents](references/trading-agents/agents.md) — MarketAnalyst, BullResearcher, BearResearcher, InvestmentJudge and Trader — use them one by one to build your own flow.
- [LLM client & memory](references/trading-agents/llm-memory.md) — UnifiedLLMClient talks to OpenAI, Groq and Anthropic with one call; FinancialSituationMemory recalls similar past situations by keyword overlap.
- [Data tools](references/trading-agents/data-tools.md) — getStockData and getIndicators — the bars and technical indicators the market analyst reads — plus the fundamentals and news stubs.
- [Debate generator](references/debate-generator.md) — generateDebateAnalysis — web research with Tavily, then a YES-vs-NO argument map for a prediction market from a Groq model.

**Analytics**

- [Correlate (XGBoost)](references/correlate.md) — trainModels, predictFuture, calculateRMSE, calculateR2, calculateRollingStats, saveModel and loadModel — gradient-boosted regression on any table of numbers.
- [Live FX & indices (Dukascopy)](references/live-data.md) — Historical and real-time candles and ticks for 1,600+ forex pairs, indices, commodities, bonds, crypto, ETFs and stocks from Dukascopy, with an instrument catalogue.
- [Wikipedia pageviews](references/wiki-pageviews.md) — pageviews — a typed client for the Wikimedia pageviews API, for spotting attention spikes on companies, people and events.
- [Social trading](references/social-trading.md) — Pull top traders and their trades from NVSTLY and ZuluTrade (and Polymarket), store them in D1, and query them for copy-trading ideas.

**Storage**

- [Database (Cloudflare D1)](references/database.md) — The lazy db client, how it finds a Cloudflare D1 connection on Workers or over the REST API, and the tables the sync functions write to.

**Reference**

- [Recipes](references/recipes.md) — End-to-end scripts that combine several modules — a morning brief, an AI-reviewed paper trade, a prediction-market scanner, an arbitrage alert and an attention-driven watchlist.
- [Troubleshooting](references/troubleshooting.md) — The errors people actually hit with investing — broken imports in older versions, missing keys, PredictionAgent validation errors, database connection and stale README names — and how to fix each.
<!-- DOCS-INDEX:END -->
