# Stock momentum agent

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/investing/examples/stock-momentum-agent?file=src/index.ts)

Ranks a watchlist by trend (close above the 50-day SMA) and 3-month momentum, then
plans an equal-weight rebalance into the top names on an Alpaca paper account. Uses the
fetch-based `createAlpacaRest()` from `investing/alpaca/rest`.

```bash
npm install
cp .env.example .env   # optional: add free Alpaca paper keys
npm start
```

| Env | Default | |
| --- | --- | --- |
| `ALPACA_API_KEY`, `ALPACA_SECRET` | none | paper keys from https://app.alpaca.markets; without them the agent runs on generated demo prices |
| `WATCHLIST` | 12 large caps | comma-separated symbols |
| `TOP_N` | `3` | names to hold |
| `DRY_RUN` | `true` | `false` sends market orders to the paper account (only while the market is open) |

The strategy lives in `src/strategy.ts` as pure functions, so you can swap in your own
signal without touching the broker code.
