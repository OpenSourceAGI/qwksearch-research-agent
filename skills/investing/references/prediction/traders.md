# Leaderboards & traders

> fetchLeaderboard, fetchTopTraders, fetchTraderPositions, fetchTraderProfiles, fetchTraderActivity and fetchAllTraderActivity — follow the wallets that make money on Polymarket.
>
> Source: https://investing-lib.vercel.app/docs/prediction/traders

```ts
import {
  fetchLeaderboard,
  fetchTopTraders,
  fetchTraderPositions,
  fetchTraderProfiles,
  fetchTraderActivity,
  fetchAllTraderActivity,
  type FetchActivityOptions,
  type TraderActivity,
  type ActivityType,
} from "investing/prediction";
```

## `fetchLeaderboard(options?)`

Polymarket's own leaderboard (`data-api.polymarket.com/v1/leaderboard`).

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `timePeriod` | `"all" \| "1d" \| "7d" \| "30d"` | `"all"` |  |
| `orderBy` | `"VOL" \| "PNL"` | `"VOL"` |  |
| `limit` | `number` | `20` |  |
| `offset` | `number` | `0` |  |
| `category` | `PolymarketCategory` | `"Overall"` | any of POLYMARKET_CATEGORIES, either case |

```ts
const weeklyWinners = await fetchLeaderboard({ timePeriod: "7d", orderBy: "PNL", limit: 10 });
const politicsWhales = await fetchLeaderboard({ category: "Politics", orderBy: "VOL", limit: 25 });
```

## `fetchTopTraders(limit = 50)` and `fetchTraderPositions(traderId)`

From polymarketanalytics.com: traders ranked by overall gain with per-tag performance, and a trader's open
positions.

```ts
const traders = await fetchTopTraders(20);
// each row is a polymarketanalytics.com trader record (id, overall_gain, win_rate, per-tag P&L)
const positions = await fetchTraderPositions(traders[0].trader);
```

## `fetchTraderProfiles(addresses)`

Resolves wallet addresses to `{ address, userName, profileImage, … }`, returned as a `Map` keyed by address.
An empty input returns an empty map without a request.

```ts
const profiles = await fetchTraderProfiles(weeklyWinners.map((w: any) => w.proxyWallet));
for (const [address, p] of profiles) console.log(address.slice(0, 8), p.userName);
```

## `fetchTraderActivity(options)`

One page of a wallet's on-chain activity.

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `user` | `string` |  | proxy wallet address |
| `limit` | `number` | `100` | capped at 500 |
| `offset` | `number` | `0` | capped at 10 000 |
| `market` | `string[]` |  | condition ids |
| `type` | `ActivityType[]` |  | TRADE, SPLIT, MERGE, REDEEM, REWARD, CONVERSION, MAKER_REBATE |
| `start` | `number` |  | unix seconds |
| `end` | `number` |  | unix seconds |
| `sortBy` | `"TIMESTAMP" \| "TOKENS" \| "CASH"` | `"TIMESTAMP"` |  |
| `sortDirection` | `"ASC" \| "DESC"` | `"DESC"` |  |
| `side` | `"BUY" \| "SELL"` |  |  |

Each `TraderActivity` has `timestamp` (seconds), `conditionId`, `type`, `size` and `usdcSize` (strings),
`price`, `side`, `outcome`, `title`, `slug`, `eventSlug`, `transactionHash` and the trader's public profile
fields.

```ts
const buys = await fetchTraderActivity({
  user: "0x56687bf447db6ffa42ffe2204a05edaa20f55839",
  type: ["TRADE"],
  side: "BUY",
  sortBy: "CASH",
  limit: 50,
});
const biggest = buys[0];
console.log(`$${Number(biggest.usdcSize).toFixed(0)} on "${biggest.title}" (${biggest.outcome})`);
```

## `fetchAllTraderActivity(user, options?, onProgress?)`

Pages through everything (500 per request) until the API runs out or the 10 000 offset cap is reached.

```ts
const all = await fetchAllTraderActivity(wallet, { type: ["TRADE"] }, (n) => process.stdout.write(`\r${n}`));
```

## Recipe: copy-trade watchlist

```ts title="whale-watch.ts"
import { fetchLeaderboard, fetchTraderActivity } from "investing/prediction";

const whales = await fetchLeaderboard({ timePeriod: "30d", orderBy: "PNL", limit: 10 });
const since = Math.floor(Date.now() / 1000) - 24 * 3600;

for (const w of whales) {
  const trades = await fetchTraderActivity({ user: w.proxyWallet, type: ["TRADE"], start: since, limit: 20 });
  for (const t of trades) {
    console.log(`${w.userName ?? w.proxyWallet.slice(0, 8)} ${t.side} ${t.outcome} "${t.title}" @ ${t.price} ($${t.usdcSize})`);
  }
}
```
