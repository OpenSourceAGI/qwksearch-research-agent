# Getting started

> Install the package, set the keys for the parts you use, and make a first call to each toolkit.
>
> Source: https://investing-lib.vercel.app/docs/getting-started

## Install

**npm**

```bash
npm install investing
```

**bun**

```bash
bun add investing
```

**pnpm**

```bash
pnpm add investing
```

**yarn**

```bash
yarn add investing
```

Requirements:

- **Node 18 or newer** (the code uses the global `fetch`). Bun works too.
- **ESM.** Import with `import … from "investing"`. The package ships a CommonJS build as well, but its
  chunk names do not resolve under `"type": "module"`, so `require("investing")` fails today.
- **`drizzle-orm`** only if you use the [database](https://investing-lib.vercel.app/docs/database) helpers or the Polymarket sync jobs — it
  is a peer dependency.
- **`@solana/web3.js`, `@solana/spl-token`, `bs58`** only for the x402 Solana payment path in PredictionAgent. They
  are optional dependencies, loaded dynamically.

## Pick your first call

### Stock quote — no key needed

Yahoo Finance is the last fallback in the [unified quote service](https://investing-lib.vercel.app/docs/stocks), so a quote works with no
configuration at all. Point `NEXT_PUBLIC_ALPACA_MCP_URL` at an Alpaca MCP server later to make it faster.

```ts title="quote.ts"
import { getQuote } from "investing/stocks";

const res = await getQuote("NVDA", { useCache: false });
if (!res.success) throw new Error(res.error);
console.log(res.data); // { symbol, price, change, changePercent, …, source: "yfinance" }
```

> **NOTE: Why useCache: false?**
>
> The cache lives in Cloudflare D1. Outside a Worker with no `CLOUDFLARE_*` credentials the cache lookup
> fails and the service falls through to the providers anyway; `useCache: false` just skips the attempt.

### Polymarket markets — no key needed

```ts title="markets.ts"
import { fetchMarkets } from "investing/prediction";

const markets = await fetchMarkets(10, "volume24hr");
for (const m of markets) {
  const [yes, no] = JSON.parse(m.outcomePrices);
  console.log(`${(Number(yes) * 100).toFixed(1)}%  ${m.question}`);
}
```

### A prediction-market analysis — one AI key

```bash title=".env"
XAI_API_KEY=xai-...        # or OPENAI_API_KEY for gpt-* models
```

```ts title="analyze.ts"
import { getEvents, runEventAnalysisAgent } from "investing/prediction-agent";

const event = await getEvents({ url: "https://polymarket.com/event/fed-decision-in-december" });
const { analysis, processingTimeMs } = await runEventAnalysisAgent({
  markets: event.markets,
  eventIdentifier: event.eventIdentifier,
  pmType: event.pmType,
  model: "grok-4-1-fast-reasoning",
});
console.log(analysis.recommendedAction, analysis.analysisSummary, `${processingTimeMs} ms`);
```

### A paper trade — Alpaca keys

```bash title=".env"
ALPACA_API_KEY=PK...
ALPACA_SECRET=...
```

```ts title="trade.ts"
import { createAlpacaClient } from "investing/alpaca";

const alpaca = createAlpacaClient({ paper: true });
const order = await alpaca.createOrder({
  symbol: "AAPL",
  qty: 1,
  side: "buy",
  type: "market",
  time_in_force: "day",
});
console.log(order.id, order.status);
```

## Run the package's own examples

The repository ships runnable scripts in
[`packages/investing/examples`](https://github.com/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/investing/examples):

| Script | What it does |
| --- | --- |
| `unified-quote-demo.ts` | Single and batch quotes, per-source quotes and the cache, printed in colour |
| `polymarket-analytics.ts` | Holders, order book and market details for live Polymarket markets |
| `qwksearch-demo.ts` | Calls the QwkSearch research API from the package |

```bash
git clone https://github.com/OpenSourceAGI/qwksearch-research-agent
cd qwksearch-research-agent && bun install
cd packages/investing && npx tsx examples/unified-quote-demo.ts
```

## Next

- Read [import paths](https://investing-lib.vercel.app/docs/imports) before you ship — importing the barrel loads far more than one subpath.
- Every key the package reads is listed in [environment variables](https://investing-lib.vercel.app/docs/environment).
