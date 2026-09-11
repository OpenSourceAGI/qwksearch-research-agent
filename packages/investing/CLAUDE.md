# CLAUDE.md — `investing`

**Read [`skills/ask-investing`](../../skills/ask-investing/SKILL.md) first.**

**Vendored from the sibling repo `ai-broker-investing-agent`.** Alpaca, stock
data, Polymarket sync over D1, LangGraph debate agents, and the PredictOS
prediction-market core.

## Two things to know before editing

1. **This is a vendored copy.** Its upstream is
   `OpenSourceAGI/ai-broker-investing-agent`, where the same package is actively
   developed. A fix made only here diverges from upstream; prefer fixing it
   there and re-vendoring, and say in the PR which direction you went.
2. **`src/predictos/` stays MIT (PredictionXBT).** The former `predictos`
   package was merged into this one — `packages/predictos` no longer exists.
   Keep the `NOTICE` file and the upstream attribution intact.

## This code reasons about money

Position sizing, thresholds and risk guards are the product, not obstacles.
Never weaken one to make a test pass; a threshold change needs a test pinning
the new number.

## Entries

`.` · `./alpaca` · `./stocks` · `./prediction` · `./trading-agents` ·
`./predictos` · `./predictos/ai` · `./predictos/agents` ·
`./predictos/data/kalshi` · `./predictos/data/polymarket` ·
`./predictos/arbitrage` · `./constants` · `./utils` · `./data/*`

```bash
cd packages/investing && bun run test
```
