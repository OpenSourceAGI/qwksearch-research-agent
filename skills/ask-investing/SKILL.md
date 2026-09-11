---
name: ask-investing
description: Guide to investing (packages/investing), the financial-data, trading-agent and prediction-market package — the Alpaca client, Yahoo/Finnhub/SEC stock data and the unified quote service, the Polymarket sync/analysis layer under investing/prediction, the LangGraph debate agents under investing/trading-agents, the XGBoost correlate models, the D1/drizzle schemas, and the merged PredictOS core on investing/predictos (runEventAnalysisAgent, runBookmakerAgent, runMapperAgent, findArbitrage, getEvents, the Kalshi/DFlow and Polymarket/Dome data clients, and the OpenAI/Grok/BlockRun AI clients). Use when importing from investing or any of its subpaths, when you are looking for the old standalone `predictos` package, when a subpath import resolves to nothing after an edit, when an agent throws about a missing model/markets/url parameter, when D1 says no connection is available, or when a prediction-market call 401s on DOME_API_KEY / DFLOW_API_KEY.
---

# Working With investing

`packages/investing`, published as **investing**. A vendored package (it originates in
[`ai-broker-investing-agent`](https://github.com/OpenSourceAGI/ai-broker-investing-agent))
covering four fairly separate concerns behind one name:

| Area | Lives in | Subpath |
| --- | --- | --- |
| Brokerage execution | `src/alpaca` | barrel |
| Equities data and analysis | `src/stocks`, `src/correlate` | `investing/stocks` |
| Polymarket sync, analysis and storage | `src/prediction` | `investing/prediction` |
| LangGraph bull/bear debate agents | `src/trading-agents` | `investing/trading-agents` |
| **PredictOS prediction-market core** | `src/predictos` | `investing/predictos` |

**`predictos` is no longer its own package.** It was a sibling workspace package that
`investing` depended on (`"predictos": "workspace:*"`) and re-exported. It has been
merged into `src/predictos/` and now builds as part of `investing`. If you are looking
for `packages/predictos`, that directory is gone — the code and its docs are here. The
import moved from `predictos` → `investing/predictos`; everything under
`investing/predictos` keeps the names it had.

The PredictOS code is a derivative of
[PredictOS](https://github.com/PredictionXBT/PredictOS) by PredictionXBT, MIT licensed.
That license applies to everything under `src/predictos/` and lives verbatim in
`LICENSE-PredictOS-MIT`; the rest of the package is `rights.institute/prosper`. Keep
`NOTICE` accurate when you move that code around.

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

# PredictOS — AI providers (AIConfig)
OPENAI_API_KEY=          # openaiApiKey
XAI_API_KEY=             # xaiApiKey — Grok, and the only models that take `tools`
BLOCKRUN_WALLET_KEY=     # blockrunWalletKey — x402 micropayments, Base chain

# PredictOS — market data (DataConfig)
DOME_API_KEY=            # domeApiKey — Polymarket via Dome
DFLOW_API_KEY=           # dflowApiKey — Kalshi via DFlow

# PredictOS — execution / research agents (optional)
POLYMARKET_WALLET_PRIVATE_KEY=   POLYMARKET_PROXY_WALLET_ADDRESS=
POLYMARKET_SIGNATURE_TYPE=       POLYFACTUAL_API_KEY=
X402_EVM_PRIVATE_KEY=            X402_SOLANA_PRIVATE_KEY=

# Storage (Cloudflare D1 only)
CLOUDFLARE_ACCOUNT_ID=   CLOUDFLARE_D1_TOKEN=   CLOUDFLARE_DATABASE_ID=
```

## Picking the right call

| You want | Call | From |
| --- | --- | --- |
| Trade a real/paper equity account | `createAlpacaClient({ paper, keyId, secretKey })` | `investing` |
| A stock quote or history | `getQuote`, `getQuotes`, `getHistoricalQuotes`, `getQuoteFromSource` (the unified quote service) | `investing/stocks` |
| SEC filings | `sec-filing-api` exports | `investing/stocks` |
| Polymarket markets / leaderboard | `fetchMarkets`, `fetchLeaderboard` | `investing/prediction` |
| A bull-vs-bear LLM debate on a ticker | `new TradingAgentsGraph(config)` | `investing/trading-agents` |
| An XGBoost timeseries correlation | `src/correlate/predict-statistics` exports | `investing` |
| **Raw markets behind a market URL** | `getEvents({ url })` | `investing/predictos` |
| **Alpha + predicted winner for an event** | `runEventAnalysisAgent(request, config?)` | `investing/predictos` |
| **Consolidate several analyses** | `runBookmakerAgent(request, config?)` | `investing/predictos` |
| **Turn an analysis into order params** | `runMapperAgent(request)` | `investing/predictos` |
| **Cross-venue mispricing** | `findArbitrage({ url, model }, config?)` | `investing/predictos` |
| One raw provider call | `dflowRequest`, `getKalshiMarketsByEvent`, `domeRequest`, `getPolymarketMarkets` | `investing/predictos/data/*` |
| One raw model call | `callOpenAIResponses`, `callGrokResponses`, `callBlockRunResponses` | `investing/predictos/ai` |
| A prompt string without the call | `analyzeEventMarketsPrompt`, `bookmakerAnalysisPrompt`, `arbitrageAnalysisPrompt`, `searchQueryGeneratorPrompt` | `investing/predictos/ai` |
| To actually place a Polymarket order | `runPolymarketPutOrder` | `investing/predictos/agents` |

Every PredictOS entry point has the same shape: `fn(request, config = {})`, where
`request` carries the required fields and `config` is `AIConfig` and/or `DataConfig`
whose every field falls back to `process.env`. **Missing required fields throw** — they
are not returned as an error result.

## Recipes

### URL → analysis, the full PredictOS path

```ts
import { getEvents, runEventAnalysisAgent, runMapperAgent, NoTradeError }
  from "investing/predictos";

const event = await getEvents({ url });               // Kalshi→DFlow, Polymarket→Gamma
const { analysis } = await runEventAnalysisAgent({
  markets: event.markets,
  eventIdentifier: event.eventIdentifier,
  pmType: event.pmType,                               // "Kalshi" | "Polymarket"
  model: "grok-4-fast",
  tools: ["x_search"],                                // Grok models only
});

try {
  const { orderParams } = await runMapperAgent({ analysis, pmType: event.pmType });
} catch (e) {
  if (e instanceof NoTradeError) { /* the analysis said NO TRADE */ }
}
```

`runMapperAgent` is pure logic — it produces order parameters and places nothing.
Kalshi mapping is not implemented; only `PolymarketOrderParams` come back.

### Arbitrage across venues

```ts
import { findArbitrage } from "investing/predictos";

const { analysis, sourceMarket, searchedMarket } =
  await findArbitrage({ url, model: "grok-4-fast" }, { domeApiKey, dflowApiKey });
```

It parses the URL, generates a search query with the model, searches the *other*
platform, and asks the model whether the same event is mispriced. `model` is required;
the returned `model` can come back as `"none"` when the search found nothing.

### Kalshi data without the agents

```ts
import { getKalshiMarketsByEvent, buildKalshiMarketUrl } from "investing/predictos/data/kalshi";
import { getPolymarketMarkets } from "investing/predictos/data/polymarket";
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
| `Cannot find module 'predictos'` | The package was merged into `investing`. Import from `investing/predictos` (or `investing/predictos/ai`, `/agents`, `/arbitrage`, `/data/kalshi`, `/data/polymarket`). |
| `packages/predictos` is missing | Expected — it is now `packages/investing/src/predictos`. |
| A `investing/predictos/*` import resolves to nothing | The subpath exports point at `dist/`, and the entry has to be declared in `vite.config.ts`'s `build.lib.entry` map as well as in `package.json`'s `exports`. Add it in **both**, then `bun run build`. |
| `investing/alpaca`, `/stocks`, `/prediction`, `/trading-agents`, `/constants`, `/utils` resolve to nothing | Those subpaths are declared in `exports` but have no matching build entry (and `src/constants` does not exist at all). Import from the `investing` barrel, or add the entry to `vite.config.ts` first. Pre-existing; unrelated to the merge. |
| A package edit "doesn't show up" in the web app | Consumers read `dist/`, not `src/`. `bun run build` in `packages/investing`. |
| `Missing required parameter: 'model'` / `'url'` / `Missing or invalid 'markets'` | PredictOS validates by throwing. `findArbitrage` needs both `url` *and* `model`; `runEventAnalysisAgent` needs `markets`, `eventIdentifier`, `pmType` and `model`. |
| `NoTradeError` out of `runMapperAgent` | Not a bug — the analysis recommended NO TRADE. Catch it; it is exported from `investing/predictos`. |
| `Could not detect prediction market type from URL` | `getEvents` only recognises Kalshi, Polymarket and Jupiter prediction-market URLs. |
| 401/403 from a market data call | `DOME_API_KEY` (Polymarket/Dome) or `DFLOW_API_KEY` (Kalshi/DFlow), or pass `domeApiKey`/`dflowApiKey` in the `DataConfig` second argument. |
| `tools: ["x_search"]` silently ignored | `x_search` / `web_search` are Grok/xAI only. OpenAI and BlockRun calls drop them. |
| A `blockrun/…` model is routed to OpenAI | Check with `isBlockRunModel(model)` — it matches the `blockrun/` prefix *or* a key in `BLOCKRUN_MODELS`. BlockRun pays per call from a Base-chain wallet (`BLOCKRUN_WALLET_KEY`); the on-chain flow is untested here. |
| `Cannot find module '@solana/web3.js'` | The x402 Solana payment path only. They are `optionalDependencies` and are imported through variable specifiers, so install them explicitly if you need that path. |
| `No Cloudflare D1 connection available` | Off Workers, set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_D1_TOKEN` (plus `CLOUDFLARE_DATABASE_ID`). D1 is the only supported database; there is no local SQLite fallback. |
| `drizzle-orm` not found | It is a **peer** dependency — install it in the consuming app. |
| Tests pass suspiciously fast | `test/polymarket-price-history.test.ts` and six of the debate-agent cases self-skip without network/API keys. |
| `getStockQuote` / `getHistoricalData` / `createTradingGraph` / `stocksTable` not found | The README's API reference is stale on those names. The source has `getQuote`/`getQuotes`/`getHistoricalQuotes`, `TradingAgentsGraph` (a class), and drizzle tables named `positions`, `trades`, `polymarketMarkets`, … `getHistoricalData` does exist, but it is the Dukascopy FX client in `src/live-data`, not a stock call. |
| Two things both called "prediction markets" | `src/prediction` is the Polymarket sync/storage/analysis layer (D1-backed). `src/predictos` is the PredictOS agent/arbitrage core (stateless, provider APIs). They do not share types. |

## Also

- README: [`packages/investing/README.md`](../../packages/investing/README.md) — the API
  reference, the PredictOS section, the Deno→Node refactor notes and what is not ported.
- The debate agents have their own notes in `src/trading-agents/README.md` and
  `IMPROVEMENTS.md`; the correlate models in `src/correlate/README.md`; the quote
  service in `src/stocks/UNIFIED-QUOTE-SERVICE.md`.
