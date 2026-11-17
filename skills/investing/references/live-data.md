# Live FX & indices (Dukascopy)

> Historical and real-time candles and ticks for 1,600+ forex pairs, indices, commodities, bonds, crypto, ETFs and stocks from Dukascopy, with an instrument catalogue.
>
> Source: https://investing-lib.vercel.app/docs/live-data

`src/live-data/dukascopy-client.ts` wraps [`dukascopy-node`](https://www.npmjs.com/package/dukascopy-node). It
is **not exported from the package yet**, so import it from source (it only depends on `dukascopy-node`,
which `investing` already installs):

```ts
import {
  getHistoricalData,
  getRealTimeData,
  convertToChartData,
  ALL_INSTRUMENTS,
  FOREX_INSTRUMENTS,
  INDEX_INSTRUMENTS,
  getInstrumentsByCategory,
  getInstrumentBySymbol,
  searchInstruments,
} from "investing/src/live-data/dukascopy-client"; // or a copy in your project
```

> **NOTE: Name clash**
>
> The README's old `getHistoricalData` example for stocks refers to this Dukascopy function. For stock history
> use [`getHistoricalQuotes`](https://investing-lib.vercel.app/docs/stocks) or [`yahooFinance.getHistorical`](https://investing-lib.vercel.app/docs/stocks/yahoo-finance).

## Instruments

The catalogue has 351 forex pairs, 22 indices, 13 commodities, 3 bonds, 33 crypto pairs, 104 ETFs, 608 US
stocks and 473 world stocks, as `{ symbol, name, category }`.

```ts
getInstrumentBySymbol("eurusd");     // { symbol: "eurusd", name: "EUR/USD", … }
searchInstruments("gold");           // XAU/USD and friends
getInstrumentsByCategory("indices"); // US500, NAS100, DE40 …
```

## `getHistoricalData(config)`

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `instrument` | `string` |  | Dukascopy symbol, lower-case, e.g. "eurusd", "usa500idxusd" |
| `dates` | `{ from, to? }` |  | Date, ISO string or epoch ms |
| `timeframe` | `"tick" \| "s1" \| "m1" \| "m5" \| "m15" \| "m30" \| "h1" \| "h4" \| "d1" \| "mn1"` |  |  |
| `format` | `"array" \| "json" \| "csv"` |  |  |
| `priceType` | `"bid" \| "ask"` |  |  |
| `volumes` | `boolean` |  |  |

```ts
const candles = await getHistoricalData({
  instrument: "eurusd",
  dates: { from: "2026-10-01", to: "2026-11-01" },
  timeframe: "h1",
  format: "json",
  priceType: "bid",
});
const chart = convertToChartData(candles); // [{ time, open, high, low, close, volume }] for lightweight-charts
```

## `getRealTimeData(config)`

The latest candles or ticks, optionally only the `last` N.

```ts
const ticks = await getRealTimeData({ instrument: "btcusd", timeframe: "tick", last: 50, format: "json" });
const lastMinute = await getRealTimeData({ instrument: "xauusd", timeframe: "m1", last: 60, format: "json" });
```

`getForexHistoricalData` and `getForexRealTimeData` are aliases.
