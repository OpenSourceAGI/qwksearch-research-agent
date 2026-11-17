# investing examples

Ready-to-run projects built on the [`investing`](https://www.npmjs.com/package/investing) package. Each one opens in StackBlitz with dependencies installed and `npm start` wired up; the two Worker projects also deploy to Cloudflare with `npm run deploy`.

| Example | What it does | |
| --- | --- | --- |
| [Stock momentum agent](./stock-momentum-agent) | Momentum + trend rebalance on an Alpaca paper account | [![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/investing/examples/stock-momentum-agent?file=src/index.ts) |
| [Prediction market agent](./prediction-market-agent) | LLM finds mispriced markets in the top Polymarket events | [![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/investing/examples/prediction-market-agent?file=src/index.ts) |
| [Stock agent on a Cloudflare cron](./stock-cron-worker) | The stock agent as a Cloudflare Worker cron, every trading day | [![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/investing/examples/stock-cron-worker?file=src/agent.ts) |
| [Prediction market watcher on a Cloudflare cron](./prediction-cron-worker) | Hourly Polymarket mover scan with AI analysis and Discord/Slack alerts | [![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/investing/examples/prediction-cron-worker?file=src/agent.ts) |

The loose `.ts` files in this folder are snippets that run against the package source inside the monorepo (`bun examples/<file>.ts`).
