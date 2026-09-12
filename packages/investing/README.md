<p align="center">
    <img width="400px" src="https://i.imgur.com/dE5Rfck.jpeg" />
</p>

<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://qwksearch.com/api/docs"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/investing"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <br />
    <a href="https://www.npmjs.com/package/investing"><img src="https://img.shields.io/npm/dm/investing.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/investing"><img src="https://img.shields.io/npm/v/investing.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/investing"><img src="https://img.shields.io/npm/dt/investing.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/investing"><img src="https://img.shields.io/npm/types/investing" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=investing"><img src="https://packagephobia.com/badge?p=investing" alt="Install size" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/qwksearch-research-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/qwksearch-research-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" /> <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/Drizzle%20ORM-C5F74F?logo=drizzle&logoColor=white" alt="Drizzle ORM" /> <img src="https://img.shields.io/badge/Zod-3E67B1?logo=zod&logoColor=white" alt="Zod" /> <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite" /> <img src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
</p>
<!-- template-git-repo:badges:end -->

# Investing Library

A comprehensive TypeScript/JavaScript library for investment analysis, trading automation, and financial data processing. This package provides reusable utilities for building investment applications, trading bots, and financial analysis tools.

## Features

- 🤖 **Trading Agents** - Multi-agent framework for automated trading strategies
- 📊 **Stock Data** - Fetch and analyze stock data from Yahoo Finance, SEC filings, and more
- 💹 **Prediction Markets** - Polymarket integration for prediction market data
- 🔮 **PredictOS Core** - Multi-agent prediction-market analysis, Kalshi/Polymarket
  data clients, and cross-platform arbitrage (merged in from the `predictos` package)
- 🔌 **Alpaca Trading API** - Easy-to-use wrapper for Alpaca trading platform
- 📈 **Technical Analysis** - Algorithmic trading strategies and indicators
- 🎯 **Social Trading** - Track and analyze top traders and strategies
- 🧠 **AI-Powered Analysis** - LLM-based investment research and debate generation
- 📦 **Data Files** - Pre-packaged stock indexes, sector information, and market data

## Installation

```bash
npm i investing
# or
bun i investing
# or
pnpm add investing
```

## Quick Start

### Alpaca Trading Client

```typescript
import { createAlpacaClient } from "investing";

// Create client with environment variables
const alpaca = createAlpacaClient({
  paper: true, // Use paper trading
  keyId: process.env.ALPACA_API_KEY,
  secretKey: process.env.ALPACA_SECRET,
});

// Get account info
const account = await alpaca.getAccount();
console.log(`Portfolio value: $${account.portfolio_value}`);

// Place an order
const order = await alpaca.createOrder({
  symbol: "AAPL",
  qty: 10,
  side: "buy",
  type: "market",
  time_in_force: "day",
});
```

### Fetch Stock Data

```typescript
import { getStockQuote, getHistoricalData } from "investing";

// Get real-time quote
const quote = await getStockQuote("AAPL");
console.log(`AAPL: $${quote.regularMarketPrice}`);

// Get historical data
const history = await getHistoricalData("AAPL", {
  period1: "2024-01-01",
  period2: "2024-12-31",
  interval: "1d",
});
```

### Polymarket Prediction Markets

```typescript
import { fetchMarkets, fetchLeaderboard } from "investing";

// Get active prediction markets
const markets = await fetchMarkets(50, "volume24hr");
console.log(`Top market: ${markets[0].question}`);

// Get top traders
const leaders = await fetchLeaderboard({
  timePeriod: "7d",
  orderBy: "PNL",
  limit: 10,
});
```

### PredictOS — Prediction-Market Analysis & Arbitrage

```typescript
import {
  runEventAnalysisAgent,
  findArbitrage,
  getEvents,
} from "investing/predictos";

const url = "https://polymarket.com/event/will-x-happen-by-2026";

// Resolve a Polymarket / Kalshi / Jupiter event URL into its raw markets
const event = await getEvents({ url });

// Analyze those markets for alpha and a predicted winner
const { analysis } = await runEventAnalysisAgent({
  markets: event.markets,
  eventIdentifier: event.eventIdentifier,
  pmType: event.pmType,
  model: "grok-4-fast",
  tools: ["x_search"], // Grok models only
});

// Look for the same event mispriced on the other venue
const arb = await findArbitrage({ url, model: "grok-4-fast" });
```

Every entry point takes a typed `request` object and an optional second
`config` (`AIConfig` / `DataConfig`) that falls back to `process.env`. Missing
required fields **throw** rather than returning an error result.

### Trading Agents Framework

```typescript
import { createTradingGraph, MarketAnalyst } from "investing";

// Create a trading agent system
const tradingSystem = createTradingGraph({
  agents: [
    new MarketAnalyst(),
    new BullResearcher(),
    new BearResearcher(),
    new Trader(),
  ],
  config: {
    ticker: "AAPL",
    budget: 10000,
  },
});

// Run analysis
const result = await tradingSystem.invoke({
  ticker: "AAPL",
  question: "Should I buy AAPL stock?",
});
```

## API Reference

### Alpaca Trading

```typescript
import { createAlpacaClient, AlpacaConfig } from "investing/alpaca";
```

#### `createAlpacaClient(config?: AlpacaConfig)`

Creates an Alpaca API client for trading operations.

**Parameters:**

- `config.paper` - Use paper trading (default: true)
- `config.keyId` - Alpaca API key ID
- `config.secretKey` - Alpaca secret key
- `config.baseUrl` - Custom base URL (optional)

**Environment Variables:**

- `ALPACA_API_KEY` or `APCA_API_KEY_ID`
- `ALPACA_SECRET` or `APCA_API_SECRET_KEY`
- `ALPACA_BASE_URL` (optional)

### Stock Data & Analysis

```typescript
import {
  getStockQuote,
  getHistoricalData,
  getSECFilings,
  StockQuote,
} from "investing/stocks";
```

#### `getStockQuote(symbol: string): Promise<StockQuote>`

Fetch real-time stock quote from Yahoo Finance.

#### `getHistoricalData(symbol: string, options?: HistoricalOptions)`

Get historical price data for technical analysis.

#### `getSECFilings(ticker: string, filingType?: string)`

Fetch SEC filings (10-K, 10-Q, 8-K) for a company.

### Prediction Markets

```typescript
import {
  fetchMarkets,
  fetchLeaderboard,
  PolymarketMarket,
} from "investing/prediction";
```

#### `fetchMarkets(limit?: number, sortBy?: string)`

Fetch active prediction markets from Polymarket.

**Parameters:**

- `limit` - Number of markets to fetch (default: 50)
- `sortBy` - Sort field: 'volume24hr', 'liquidity', etc.

#### `fetchLeaderboard(options?)`

Get Polymarket leaderboard of top traders.

**Options:**

- `timePeriod` - '1d' | '7d' | '30d' | 'all'
- `orderBy` - 'VOL' | 'PNL'
- `limit` - Number of results (default: 20)
- `category` - Market category (default: 'overall')

### PredictOS Core

```typescript
import {
  runEventAnalysisAgent,
  runBookmakerAgent,
  runMapperAgent,
  findArbitrage,
  getEvents,
} from "investing/predictos";
```

> Adapted from [PredictOS](https://github.com/PredictionXBT/PredictOS) by
> **PredictionXBT** (MIT licensed, © 2025). The original code shipped as
> Deno/Supabase edge functions; here it is refactored into plain, typed,
> dependency-light library functions with no HTTP/CORS layer. It lived in a
> sibling `predictos` package until that package was merged into `investing`.
> See [`NOTICE`](./NOTICE) and
> [`LICENSE-PredictOS-MIT`](./LICENSE-PredictOS-MIT).

#### What it covers

- **AI provider clients** — OpenAI (Responses API), Grok/xAI (Responses API,
  with optional `x_search` / `web_search` tools), and BlockRun (x402
  wallet-based micropayments across 20+ models), plus the analysis prompt
  builders (`analyzeEventMarkets`, `bookmakerAnalysis`, `arbitrageAnalysis`,
  `searchQueryGenerator`).
- **Market data clients** — Kalshi via the DFlow API
  (`investing/predictos/data/kalshi`) and Polymarket via the Dome API
  (`investing/predictos/data/polymarket`).
- **Multi-agent pipeline** (`investing/predictos/agents`):
  - `runEventAnalysisAgent` — analyzes an event's markets for alpha and a
    predicted winner.
  - `runBookmakerAgent` — aggregates multiple agent analyses (and optional
    external data sources) into a single consolidated assessment.
  - `runMapperAgent` — turns an analysis into Polymarket order parameters
    (pure logic; Kalshi mapping not yet implemented).
- **Cross-platform arbitrage** (`investing/predictos/arbitrage`) —
  `findArbitrage` parses a Polymarket/Kalshi URL, generates a search query with
  AI, searches the other platform, and evaluates whether the same event is
  mispriced across venues.
- **Event fetching** (`getEvents`) — resolves a Polymarket/Kalshi/Jupiter URL
  into its raw markets (Kalshi via DFlow, Polymarket via the Gamma API).

#### Subpath exports

| Import | Contents |
| --- | --- |
| `investing/predictos` | Everything (barrel) |
| `investing/predictos/ai` | AI clients + prompt builders |
| `investing/predictos/data/kalshi` | Kalshi (DFlow) data client |
| `investing/predictos/data/polymarket` | Polymarket (Dome) data client |
| `investing/predictos/agents` | `runEventAnalysisAgent`, `runBookmakerAgent`, `runMapperAgent` |
| `investing/predictos/arbitrage` | `findArbitrage` |

The barrel re-exports the Kalshi (DFlow) client at the top level. The Polymarket
(Dome) client exposes Kalshi helpers under the same names, so the barrel renames
those two to `getDomeKalshiMarketsByEvent` / `buildDomeKalshiMarketUrl` — import
from `investing/predictos/data/polymarket` for their original names. The
Gamma/CLOB trading client, Polyfactual and x402 are namespaced on the barrel as
`polymarketClob`, `polyfactual` and `x402` for the same reason.

#### Refactor notes (Deno → Node)

- Deno HTTP handlers (`Deno.serve`, `new Response(...)`, CORS headers) were
  removed. Each endpoint is now a plain exported async function taking typed
  parameters and returning a typed result; validation failures `throw`.
- `Deno.env.get("X")` was replaced with config/options objects
  (`AIConfig`, `DataConfig`, per-call `apiKey`/`walletKey`) that fall back to
  `process.env` (`OPENAI_API_KEY`, `XAI_API_KEY`, `BLOCKRUN_WALLET_KEY`,
  `DOME_API_KEY`, `DFLOW_API_KEY`). No secrets are hardcoded.
- Remote (`https://...`) and `npm:` import specifiers were replaced with normal
  package imports (`ethers`). The global `fetch` (Node 18+) is used throughout.
- Prompt text and analysis logic are preserved verbatim.

#### Not ported (yet)

Intentionally left out of the core port — noted for future work: the Next.js
`terminal/` frontend, the Python alpha-hunter examples, the **pay.sh** payment
serving flows, **Irys** verifiable-agent storage, wallet-tracking websockets, and
on-chain order execution (the mapper produces order parameters, but placing
orders is out of scope). The BlockRun client *is* ported (it only needs `ethers`
+ `fetch`), but its on-chain micropayment flow is untested in this environment.

### Trading Agents

```typescript
import {
  createTradingGraph,
  MarketAnalyst,
  BullResearcher,
  BearResearcher,
  Trader,
} from "investing/trading-agents";
```

#### `createTradingGraph(config)`

Creates a multi-agent trading system using LangGraph.

**Agents:**

- `MarketAnalyst` - Analyzes market conditions and trends
- `BullResearcher` - Researches bullish arguments
- `BearResearcher` - Researches bearish arguments
- `Trader` - Makes trading decisions based on research

### Constants & Data

```typescript
import { STOCK_INDEXES, SECTORS, CATEGORIES } from "investing/constants";
```

Pre-loaded data files available:

- `data/stock-indexes.json` - Major stock indexes (S&P 500, NASDAQ, etc.)
- `data/sectors-industries.json` - Industry classifications
- `data/sector-info.json` - Sector descriptions and metrics
- `data/stock-names.json` - Company names and tickers
- `data/globe.json` - Geographic market data

### Utilities

```typescript
import { cn, setStateInURL } from "investing/utils";
```

#### `cn(...inputs: ClassValue[])`

Utility for merging CSS classes using clsx and tailwind-merge.

#### `setStateInURL(state?, addToHistory?)`

Sync application state to URL parameters for shareable links.

## Data Files

Access pre-packaged data files:

```typescript
import stockIndexes from "investing/data/stock-indexes.json";
import sectors from "investing/data/sectors-industries.json";
import stockNames from "investing/data/stock-names.json";

console.log(`Total stocks: ${stockNames.length}`);
console.log(`S&P 500 stocks: ${stockIndexes["S&P 500"].length}`);
```

## Environment Variables

Create a `.env` file with your API keys:

```env
# Alpaca Trading API
ALPACA_API_KEY=your_key_here
ALPACA_SECRET=your_secret_here

# Optional: Use live trading (default is paper)
# ALPACA_BASE_URL=https://api.alpaca.markets

# OpenAI for AI-powered analysis
OPENAI_API_KEY=your_openai_key

# PredictOS: prediction-market analysis and data
XAI_API_KEY=your_xai_key           # Grok/xAI
BLOCKRUN_WALLET_KEY=your_wallet_key # BlockRun x402 micropayments
DOME_API_KEY=your_dome_key          # Polymarket market data
DFLOW_API_KEY=your_dflow_key        # Kalshi market data

# Optional: Alternative LLM providers
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key
GROQ_API_KEY=your_groq_key
```

## TypeScript Support

This package includes full TypeScript definitions. Import types directly:

```typescript
import type {
  AlpacaConfig,
  StockQuote,
  PolymarketMarket,
  TradingAgent,
} from "investing";
```

## Advanced Usage

### Custom Trading Strategy

```typescript
import { createTradingGraph, BaseTradingAgent } from "investing";

class MomentumTrader extends BaseTradingAgent {
  name = "momentum-trader";

  async analyze(state: TradingState) {
    // Implement your strategy
    const data = await this.getHistoricalData(state.ticker);
    const momentum = this.calculateMomentum(data);

    return {
      signal: momentum > 0.5 ? "buy" : "sell",
      confidence: Math.abs(momentum),
    };
  }
}

const strategy = new MomentumTrader();
const result = await strategy.analyze({ ticker: "TSLA" });
```

### Multi-Agent Debate System

```typescript
import { createDebateSystem } from "investing";

const debate = await createDebateSystem({
  ticker: "NVDA",
  agents: ["bull_researcher", "bear_researcher", "neutral_analyst"],
  rounds: 3,
});

const decision = await debate.run();
console.log(decision.recommendation); // 'buy' | 'sell' | 'hold'
console.log(decision.reasoning);
```

### Batch Stock Analysis

```typescript
import { getStockQuote } from "investing";

const tickers = ["AAPL", "GOOGL", "MSFT", "AMZN"];
const quotes = await Promise.all(tickers.map(getStockQuote));

const summary = quotes.map((q, i) => ({
  ticker: tickers[i],
  price: q.regularMarketPrice,
  change: q.regularMarketChangePercent,
}));
```

## Database Integration (Optional)

Database features target **Cloudflare D1 only**. Install the peer dependency:

```bash
npm install drizzle-orm
```

On Cloudflare Workers the connection uses the `DB` binding. Outside Workers
(scripts, CI) it reaches the same D1 database over Cloudflare's REST API, which
needs `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_TOKEN`, and optionally
`CLOUDFLARE_DATABASE_ID`.

Then import database schemas:

```typescript
import { db, stocksTable, positionsTable } from "investing/db";

// Query your database
const stocks = await db.select().from(stocksTable).limit(10);
```

## Examples

See the `/examples` directory for complete working examples:

- `examples/alpaca-trading.ts` - Basic trading operations
- `examples/stock-analysis.ts` - Stock data analysis
- `examples/prediction-markets.ts` - Polymarket integration
- `examples/trading-bot.ts` - Automated trading bot
- `examples/multi-agent-research.ts` - AI research agents

## Links

- [GitHub Repository](https://github.com/vtempest/ai-broker-investment-agent)
- [Documentation](https://invest.vtempest.com/docs)
- [Agent skill](../../skills/ask-investing/SKILL.md)
- [Examples](./examples)

## Credits

The `predictos` module is a derivative work of
[PredictOS](https://github.com/PredictionXBT/PredictOS) — all original design and
logic © 2025 PredictionXBT, MIT licensed. See [`NOTICE`](./NOTICE) and
[`LICENSE-PredictOS-MIT`](./LICENSE-PredictOS-MIT).

- [GitHub Issues](https://github.com/vtempest/ai-broker-investment-agent/issues)
- [Documentation](https://invest.vtempest.com/docs)
