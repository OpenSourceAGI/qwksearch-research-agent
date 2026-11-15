# Stock agent on a Cloudflare cron

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/investing/examples/stock-cron-worker?file=src/agent.ts)

The momentum agent from `stock-momentum-agent`, packaged as a Cloudflare Worker with a
cron trigger (`0 15 * * 1-5`, mid-session every US trading day). It only uses
`investing/alpaca/rest`, which is pure `fetch`, so the Worker bundle stays around 10 KB.

```bash
npm install
npm start                 # one run in Node, same code path as the cron (works on StackBlitz)

npx wrangler login
npx wrangler secret put ALPACA_API_KEY
npx wrangler secret put ALPACA_SECRET
npm run deploy            # DRY_RUN stays "true" until you change it in wrangler.jsonc
```

- `npm run dev` starts `wrangler dev --test-scheduled`; trigger the cron with
  `curl "http://localhost:8787/__scheduled?cron=0+15+*+*+1-5"`.
- `GET /` shows the last report when you bind the optional `REPORTS` KV namespace.
- `POST /run` runs immediately; set a `RUN_TOKEN` secret to require `Authorization: Bearer <token>`.
- Cron times are UTC. The agent also checks Alpaca's market clock and skips when closed.

`wrangler dev` needs a real machine: StackBlitz runs `npm start` (Node), not workerd.
