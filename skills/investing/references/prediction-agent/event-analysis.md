# Event analysis agent

> runEventAnalysisAgent — ask an LLM for the best opportunity in an event's markets, with estimated probability, alpha, predicted winner, risks and sources.
>
> Source: https://investing-lib.vercel.app/docs/prediction-agent/event-analysis

```ts
import { runEventAnalysisAgent, type MarketAnalysis } from "investing/prediction-agent";

const result = await runEventAnalysisAgent(request, config?);
```

## Request

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `markets` | `unknown[]` |  | raw markets, usually getEvents(...).markets; must be non-empty |
| `eventIdentifier` | `string` |  | Polymarket slug or Kalshi ticker |
| `pmType` | `"Kalshi" \| "Polymarket"` |  |  |
| `model` | `string` |  | decides the provider, see below |
| `question` | `string` |  | defaults to "What is the best trading opportunity in this market?…" |
| `tools` | `("x_search" \| "web_search")[]` |  | Grok only; adds source requirements to the prompt |
| `userCommand` | `string` |  | an instruction the analysis must prioritise |

`config` is `AIConfig`: `{ openaiApiKey?, xaiApiKey?, blockrunWalletKey? }`.

### Which provider runs

| `model` | Provider | Key |
| --- | --- | --- |
| `blockrun/gpt-4o`, `blockrun/claude-sonnet-4`, … (see `BLOCKRUN_MODELS`) | BlockRun, paid per call over x402 | `BLOCKRUN_WALLET_KEY` |
| `gpt-5.2`, `gpt-5.1`, `gpt-5-nano`, `gpt-4.1`, `gpt-4.1-mini`, anything starting `gpt-` | OpenAI Responses API | `OPENAI_API_KEY` |
| anything else (`grok-4-1-fast-reasoning`, `grok-4-fast`, …) | xAI Responses API | `XAI_API_KEY` |

## Result

```ts
{
  analysis: MarketAnalysis,
  model: string,          // the model the provider reports
  tokensUsed?: number,
  paymentCost?: string,   // BlockRun only, e.g. "$0.001234"
  processingTimeMs: number,
}
```

### `MarketAnalysis`

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `event_ticker` | `string` |  |  |
| `ticker` | `string` |  | the market with the best opportunity |
| `title` | `string` |  |  |
| `marketProbability` | `number` |  | 0–100, the price |
| `estimatedActualProbability` | `number` |  | 0–100, the model’s view |
| `alphaOpportunity` | `number` |  | estimated − market; positive means buy YES |
| `hasAlpha` | `boolean` |  |  |
| `predictedWinner` | `"YES" \| "NO"` |  |  |
| `winnerConfidence` | `number` |  | 0–100 |
| `recommendedAction` | `"BUY YES" \| "BUY NO" \| "NO TRADE"` |  |  |
| `reasoning` | `string` |  |  |
| `confidence` | `number` |  | 0–100, in the whole assessment |
| `keyFactors` | `string[]` |  |  |
| `risks` | `string[]` |  |  |
| `questionAnswer` | `string` |  | direct answer to `question` |
| `analysisSummary` | `string` |  | under 270 characters — tweet-sized |
| `xSources` | `string[]` |  | with x_search |
| `webSources` | `string[]` |  | with web_search |

## Examples

**Grok + live search**

```ts
const event = await getEvents({ url });
const { analysis } = await runEventAnalysisAgent({
  markets: event.markets,
  eventIdentifier: event.eventIdentifier,
  pmType: event.pmType,
  model: "grok-4-1-fast-reasoning",
  tools: ["x_search", "web_search"],
});
console.log(analysis.analysisSummary);
console.log("X:", analysis.xSources, "Web:", analysis.webSources);
```

**OpenAI**

```ts
const { analysis, tokensUsed } = await runEventAnalysisAgent(
  { markets, eventIdentifier, pmType: "Polymarket", model: "gpt-4.1" },
  { openaiApiKey: process.env.OPENAI_API_KEY },
);
```

**Custom question**

```ts
const { analysis } = await runEventAnalysisAgent({
  markets,
  eventIdentifier,
  pmType: "Kalshi",
  model: "grok-4-fast",
  question: "Which bracket is most underpriced relative to the latest CPI print?",
  userCommand: "Only consider brackets with more than $50k volume.",
});
console.log(analysis.questionAnswer);
```

**BlockRun**

```ts
// No API key: each call is paid in USDC from a Base-chain wallet.
const { analysis, paymentCost } = await runEventAnalysisAgent(
  { markets, eventIdentifier, pmType, model: "blockrun/claude-sonnet-4" },
  { blockrunWalletKey: process.env.BLOCKRUN_WALLET_KEY },
);
console.log(paymentCost); // "$0.00…"
```

## Acting on the result

```ts
const MIN_EDGE = 8;        // percentage points
const MIN_CONFIDENCE = 65;

const tradeable =
  analysis.hasAlpha &&
  analysis.recommendedAction !== "NO TRADE" &&
  Math.abs(analysis.alphaOpportunity) >= MIN_EDGE &&
  analysis.winnerConfidence >= MIN_CONFIDENCE;
```

Then hand it to the [mapper](https://investing-lib.vercel.app/docs/prediction-agent/mapper), or to the [bookmaker](https://investing-lib.vercel.app/docs/prediction-agent/bookmaker) first
if you ran several models.

## Prompt only

`analyzeEventMarketsPrompt(markets, eventIdentifier, question, pmType, tools?, userCommand?)` from
`investing/prediction-agent/ai` returns `{ systemPrompt, userPrompt }` without calling anything — useful to run the
same prompt through your own model client.
