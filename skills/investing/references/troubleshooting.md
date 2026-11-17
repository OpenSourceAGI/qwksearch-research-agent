# Troubleshooting

> The errors people actually hit with investing — broken imports in older versions, missing keys, PredictionAgent validation errors, database connection and stale README names — and how to fix each.
>
> Source: https://investing-lib.vercel.app/docs/troubleshooting

## Imports and installation

**investing/stocks, /prediction, /trading-agents or /alpaca resolve to nothing**

Up to 0.1.346 those subpaths were declared in `package.json` but never built, so they pointed at files that
did not exist. Upgrade to the next release. On an old version, import the same names from the root
`investing` instead. `investing/constants` and `investing/utils` are still declared without a build and
should not be used. See [imports](https://investing-lib.vercel.app/docs/imports).

**The process exits with **

Up to 0.1.346, importing the root package (or `investing/stocks`) also ran the stock-names import script,
which tried to write to `./data` and called `process.exit`. Upgrade; on an old version, import from the
narrower subpaths such as `investing/prediction-agent`.

**require(**

The package is ESM-only in practice. Use `import`, set `"type": "module"` in your `package.json`, or load it
with `await import("investing")` from CommonJS.

**Module not found: @solana/… or drizzle-orm**

The database needs `drizzle-orm`, a peer dependency: `bun add drizzle-orm`. The x402 / BlockRun clients
need `@solana/web3.js`, `@solana/spl-token` and `bs58`, which are optional dependencies; if your install
skipped them, add them yourself.

**xgboost_node fails to load in the browser or on Workers**

[Correlate](https://investing-lib.vercel.app/docs/correlate) uses a native binding. Run it in Node or Bun on a server.

## Keys and providers

**401 / 403 from Alpaca**

`createAlpacaClient()` does not throw on a missing key; it logs a warning and the first request fails. Set
`ALPACA_API_KEY` and `ALPACA_SECRET_KEY`, and remember paper and live keys are different: `paper: true` (the
default) needs paper keys.

**401 from DFlow or Dome**

Kalshi data comes through DFlow (`DFLOW_API_KEY`) and some Polymarket wallet data through Dome
(`DOME_API_KEY`). See [environment](https://investing-lib.vercel.app/docs/environment) for the full list.

**The tools option has no effect**

`tools` (`x_search`, `web_search`) is only passed to Grok models through xAI. OpenAI and other models ignore it.

**model_decommissioned from Groq**

`TradingAgentsGraph` defaults to `llama3-70b-8192` / `llama3-8b-8192`, which Groq has retired. Pass current
models:

```ts
new TradingAgentsGraph(["market"], false, {
  llmProvider: "groq",
  deepThinkLLM: "llama-3.3-70b-versatile",
  quickThinkLLM: "llama-3.1-8b-instant",
});
```

**Fundamentals tool returns an error outside a web app**

The trading agents' `getFundamentals` fetches the relative URL `/api/stocks/quote/:symbol`, which only works
inside an app that serves that route. In a script it fails; the market and news analysts are unaffected.

## PredictionAgent

**Missing required parameter: **

Every agent validates its input and throws before calling a model. Pass the named field; `model` is always
required, there is no default.

**Could not detect prediction market type from URL**

`getEvents` accepts Polymarket (`polymarket.com/event/…`), Kalshi (`kalshi.com/markets/…`) and Jupiter
prediction URLs. Strip tracking parameters and check the path. `findArbitrage` throws
`Invalid URL. Must be a Polymarket or Kalshi market URL.` for the same reason.

**NoTradeError from runMapperAgent**

Not a bug: the analysis recommended `NO TRADE`. Catch it and move on. A closed market or one not accepting
orders throws a plain `Error` (`Market is closed`, `Market is not accepting orders`) instead.

```ts
try { runMapperAgent(req); } catch (e) { if (e instanceof NoTradeError) skip(); else throw e; }
```

**Invalid platform / Kalshi autonomous mode coming soon**

`platform` is case-sensitive: `"Polymarket"`, not `"polymarket"`. Kalshi order mapping is not implemented yet.

**Invalid budgetUsd**

The mapper accepts budgets from $1 to $100.

**JSON parse errors in the mapper**

Gamma may return `outcomes`, `outcomePrices` and `clobTokenIds` as arrays, but the mapper expects JSON
strings. `JSON.stringify` them first, as in the [recipes](https://investing-lib.vercel.app/docs/recipes).

## Data and database

**No Cloudflare D1 connection available**

A `sync*`, `save*` or database-backed `get*` function ran without a connection. On Workers, publish the `DB`
binding on `globalThis.__CLOUDFLARE_ENV__`; elsewhere set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_TOKEN` and
`CLOUDFLARE_DATABASE_ID`. See [database](https://investing-lib.vercel.app/docs/database).

**Quotes look stale**

`getQuote` accepts `cacheTTL` but ignores it: any cached row is returned. Pass `useCache: false` for a live
price.

**Rolling stats are whole numbers**

`calculateRollingStats` floors its output. Scale small values up first (basis points instead of percent).

**R² is wildly negative**

`calculateR2(predicted, actual)` takes its arguments in the opposite order to
`calculateRMSE(actual, predicted)`. Also check you split by date, not with the shuffling `splitTrainTest`.

## Names from the old README

| README said | Use |
| --- | --- |
| `getStockQuote` | `getQuote` from `investing/stocks` |
| `getHistoricalData` (for stocks) | `getHistoricalQuotes`; `getHistoricalData` is the [Dukascopy](https://investing-lib.vercel.app/docs/live-data) function |
| `createTradingGraph` | `new TradingAgentsGraph(...)` |
| `stocksTable` | the `positions` table |

## Tests are skipped

The package's tests that call real APIs skip themselves when their key is missing. `bun run test` passing
with skips is expected; set the keys in `.env` to run them.
