# Prediction market watcher on a Cloudflare cron

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/investing/examples/prediction-cron-worker?file=src/agent.ts)

An hourly Cloudflare Worker that scans the top Polymarket events, finds markets that moved
more than 10 points in 24h, asks the PredictionAgent event-analysis agent whether each move
overshot, and posts the result to a Discord or Slack webhook.

```bash
npm install
npm start                 # one run in Node, same code path as the cron (works on StackBlitz)

npx wrangler login
npx wrangler secret put OPENAI_API_KEY      # or XAI_API_KEY
npx wrangler secret put ALERT_WEBHOOK_URL   # Discord or Slack incoming webhook
npm run deploy
```

| Var | Default | |
| --- | --- | --- |
| `SCAN_EVENTS` | `25` | events scanned per run |
| `MIN_MOVE` | `0.1` | 24h probability move (0-1) that counts as a mover |
| `ANALYZE_TOP` | `3` | movers that get an AI opinion per run |
| `TAG` | none | limit the scan to one Polymarket tag |

- `npm run dev` starts `wrangler dev --test-scheduled`; trigger with
  `curl "http://localhost:8787/__scheduled?cron=0+*+*+*+*"`.
- Bind the optional `REPORTS` KV namespace to see the last run at `GET /`.

`wrangler dev` needs a real machine: StackBlitz runs `npm start` (Node), not workerd.
