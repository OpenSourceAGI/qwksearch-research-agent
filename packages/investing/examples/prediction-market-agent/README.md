# Prediction market agent

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/investing/examples/prediction-market-agent?file=src/index.ts)

Pulls the most-traded live Polymarket events from the public Gamma API (no key) and asks
the PredictionAgent event-analysis agent (`runEventAnalysisAgent` from
`investing/prediction-agent/agents`) which market is mispriced and which side to take.
It never places trades.

```bash
npm install
cp .env.example .env   # add OPENAI_API_KEY or XAI_API_KEY for the AI step
npm start
```

| Env | Default | |
| --- | --- | --- |
| `OPENAI_API_KEY` / `XAI_API_KEY` | none | either turns on the AI analysis; without one you get prices and the biggest 24h movers |
| `MODEL` | `gpt-4.1-mini` (or `grok-4-1-fast-reasoning`) | any model the agent supports |
| `EVENTS` | `3` | events to analyse |
| `TAG` | none | Polymarket tag slug such as `politics`, `crypto`, `sports` |
