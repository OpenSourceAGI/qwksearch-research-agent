# TradingAgentsGraph

> A multi-agent stock analysis run — market and news analysts, three rounds of bull vs. bear debate, an investment judge and a trader — that returns BUY, SELL or HOLD and learns from outcomes.
>
> Source: https://investing-lib.vercel.app/docs/trading-agents

```ts
import { TradingAgentsGraph, type TradeSignal, type AgentState } from "investing/trading-agents";
```

A TypeScript port of the [TradingAgents](https://github.com/TauricResearch/TradingAgents) framework: instead of
one prompt, several role-played agents argue, and a trader decides from the transcript.

## What one `propagate()` does

**Market analyst** (if `"market"` is selected) pulls 6 months of daily bars from Yahoo Finance, computes SMA 50/200, EMA 10, RSI, MACD, Bollinger Bands, ATR and VWMA, and writes `marketReport`.
**News analyst** (if `"news"`) searches recent news through the QwkSearch API and writes `newsReport`. Social and fundamentals analysts are placeholders that write "No … analysis performed."
**Debate**: the bull researcher and the bear researcher take turns for **3 rounds**, each seeing the reports, the transcript so far and its own past lessons.
**Investment judge** reads the debate and writes `investmentPlan`.
**Trader** turns the plan into `traderInvestmentPlan`.
The final decision is extracted from the trader's text: `BUY` if it says buy (and not "not buy"), else `SELL` likewise, else `HOLD`.

## Constructor

```ts
new TradingAgentsGraph(selectedAnalysts?, debug?, config?)
```

| Argument | Default | |
| --- | --- | --- |
| `selectedAnalysts` | `["market", "social", "news", "fundamentals"]` | `AnalystType[]`; only `market` and `news` do work today |
| `debug` | `false` | logs each step to the console |
| `config` | Groq, `llama3-70b-8192` / `llama3-8b-8192`, temperature 0.3 | `TradingConfig`, merged over the default |

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `llmProvider` | `"openai" \| "anthropic" \| "groq"` |  | which API UnifiedLLMClient calls |
| `deepThinkLLM` | `string` |  | model for the judge and trader |
| `quickThinkLLM` | `string` |  | model for analysts and researchers |
| `temperature` | `number` | `0.3` |  |
| `baseUrl` | `string` |  | override the provider endpoint (any OpenAI-compatible URL) |
| `apiKeys` | `{ openai?, anthropic?, groq?, … }` |  | keyed by provider; else <PROVIDER>_API_KEY |
| `projectDir` | `string` | `"./data"` |  |

> **WARN: Set the models**
>
> The default Groq model ids (`llama3-70b-8192`, `llama3-8b-8192`) have been retired by Groq. Pass current ids,
> as in the examples below.

## `propagate(ticker, tradeDate)`

```ts
const { state, signal } = await graph.propagate("AAPL", "2026-11-13");
```

- `signal: TradeSignal` — `{ action: "BUY" | "SELL" | "HOLD", confidence: 0.75, reasoning, timestamp }`.
  Confidence is a fixed 0.75 for now.
- `state: AgentState` — every report and transcript: `marketReport`, `newsReport`,
  `investmentDebateState.{ bullHistory, bearHistory, history, judgeDecision }`, `investmentPlan`,
  `traderInvestmentPlan`, `finalTradeDecision`.

## `reflectAndRemember(returnPercent)`

After you know how the trade did, feed the return back. Each agent stores the situation, its decision, the
outcome and a lesson, and recalls similar situations in later runs.

```ts
await graph.reflectAndRemember(-3.1); // the position lost 3.1 %
```

Memory is in-process: it lasts as long as the `graph` instance.

## Examples

**OpenAI**

```ts
const graph = new TradingAgentsGraph(["market", "news"], true, {
  llmProvider: "openai",
  deepThinkLLM: "gpt-4o",
  quickThinkLLM: "gpt-4o-mini",
  apiKeys: { openai: process.env.OPENAI_API_KEY },
});
```

**Groq**

```ts
const graph = new TradingAgentsGraph(["market"], false, {
  llmProvider: "groq",
  deepThinkLLM: "llama-3.3-70b-versatile",
  quickThinkLLM: "llama-3.1-8b-instant",
}); // GROQ_API_KEY from env
```

**Anthropic**

```ts
const graph = new TradingAgentsGraph(["market", "news"], false, {
  llmProvider: "anthropic",
  deepThinkLLM: "claude-opus-5-5",
  quickThinkLLM: "claude-haiku-5-5",
  apiKeys: { anthropic: process.env.ANTHROPIC_API_KEY },
});
```

**OpenRouter**

```ts
// Any OpenAI-compatible endpoint, via baseUrl
const graph = new TradingAgentsGraph(["market"], false, {
  llmProvider: "openai",
  baseUrl: "https://openrouter.ai/api/v1/chat/completions",
  deepThinkLLM: "deepseek/deepseek-chat",
  quickThinkLLM: "deepseek/deepseek-chat",
  apiKeys: { openai: process.env.OPENROUTER_API_KEY },
});
```

### Read the debate

```ts
const { state, signal } = await graph.propagate("NVDA", "2026-11-13");

console.log("## Market\n", state.marketReport);
console.log("## Bull\n", state.investmentDebateState.bullHistory);
console.log("## Bear\n", state.investmentDebateState.bearHistory);
console.log("## Judge\n", state.investmentPlan);
console.log("## Trader →", signal.action, "\n", state.traderInvestmentPlan);
```

### Screen a watchlist, then trade it on paper

```ts title="agents-to-alpaca.ts"
import { TradingAgentsGraph } from "investing/trading-agents";
import { createAlpacaClient } from "investing/alpaca";

const graph = new TradingAgentsGraph(["market", "news"], false, {
  llmProvider: "openai", deepThinkLLM: "gpt-4o", quickThinkLLM: "gpt-4o-mini",
});
const alpaca = createAlpacaClient({ paper: true });
const today = new Date().toISOString().slice(0, 10);

for (const symbol of ["AAPL", "MSFT", "AMZN"]) {
  const { signal } = await graph.propagate(symbol, today);
  console.log(symbol, signal.action);
  if (signal.action === "BUY") {
    await alpaca.createOrder({ symbol, notional: 500, side: "buy", type: "market", time_in_force: "day" });
  }
}
```

### Backtest one day and learn

```ts
const date = "2026-06-02";
const { signal } = await graph.propagate("TSLA", date);
// … look up what TSLA did over the next 5 sessions …
const fiveDayReturn = 2.7;
await graph.reflectAndRemember(signal.action === "SELL" ? -fiveDayReturn : fiveDayReturn);
```

## Other methods

- `getCurrentState()` — the last `AgentState`, or `null`.
- `getLogStates()` — every run so far, keyed by trade date.
