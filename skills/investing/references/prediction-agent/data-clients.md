# Market data clients

> Kalshi through DFlow and Polymarket (plus Kalshi) through Dome — the raw request helpers, typed market shapes and URL builders.
>
> Source: https://investing-lib.vercel.app/docs/prediction-agent/data-clients

## Kalshi via DFlow

```ts
import { dflowRequest, getKalshiMarketsByEvent, buildKalshiMarketUrl, type DFlowKalshiMarket }
  from "investing/prediction-agent/data/kalshi";
```

Base URL `https://a.prediction-markets-api.dflow.net/api/v1`; key from the `apiKey` argument or
`DFLOW_API_KEY`.

```ts
const markets: DFlowKalshiMarket[] = await getKalshiMarketsByEvent("KXFEDDECISION-26DEC");
for (const m of markets) {
  const mid = (m.yes_bid + m.yes_ask) / 2;
  console.log(m.ticker, m.title, `mid ${mid}¢`, `OI ${m.open_interest}`, buildKalshiMarketUrl(m.ticker));
}

// any other endpoint
const raw = await dflowRequest<unknown>("/events", { params: { status: "open", limit: 20 } });
```

`DFlowKalshiMarket`: `ticker`, `event_ticker`, `title`, `subtitle?`, `status`, `close_time`, `yes_bid`,
`yes_ask`, `no_bid`, `no_ask`, `last_price`, `volume`, `volume_24h`, `liquidity`, `open_interest`.

## Polymarket (and Kalshi) via Dome

```ts
import {
  domeRequest,
  getPolymarketMarkets,
  getKalshiMarketsByEvent,   // the Dome version
  buildPolymarketUrl,
  buildKalshiMarketUrl,
} from "investing/prediction-agent/data/polymarket";
```

Base URL `https://api.domeapi.io/v1`; key from `apiKey` or `DOME_API_KEY`
([docs](https://docs.domeapi.io/)).

```ts
const page = await getPolymarketMarkets({ active: true, closed: false, limit: 50 });
const one = await getPolymarketMarkets({ market_slug: "will-the-fed-cut-rates-in-december" });

const kalshi = await getKalshiMarketsByEvent("KXFEDDECISION-26DEC", "open"); // "open" | "closed" | "settled"
```

From the `investing/prediction-agent` barrel the Dome Kalshi helpers are renamed `getDomeKalshiMarketsByEvent` and
`buildDomeKalshiMarketUrl` (see [imports](https://investing-lib.vercel.app/docs/imports#name-collisions-in-the-predictionagent-barrel)).

## URL builders

Pure functions — try them:

> Interactive MarketUrl playground: see the live docs at https://investing-lib.vercel.app/docs/playground.

## Lower-level clients on the barrel

```ts
import { polymarketClob, polyfactual, x402 } from "investing/prediction-agent";
```

- `polymarketClob` — the Gamma/CLOB trading client used by the execution agents: wallet setup from
  `POLYMARKET_WALLET_PRIVATE_KEY`, order placement, 15-minute up/down market discovery for BTC, ETH, SOL, XRP.
- `polyfactual` — the Polyfactual deep-research API client (`POLYFACTUAL_API_KEY`).
- `x402` — discovery and paid calls to x402 / PayAI sellers on EVM and Solana.
