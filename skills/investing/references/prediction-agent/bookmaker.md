# Bookmaker agent

> runBookmakerAgent — merge several model analyses and PayAI / x402 research results into one consensus with agreement level and dissent.
>
> Source: https://investing-lib.vercel.app/docs/prediction-agent/bookmaker

```ts
import { runBookmakerAgent, type AggregatedAnalysis } from "investing/prediction-agent";
```

The bookmaker is the "wisdom of the agents" step: give it at least two sources — analyses from different
models, external research bought over x402, or a mix — and it asks one more model to weigh them.

## Request

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `analyses` | `AgentAnalysisInput[]` |  | { agentId, model, analysis: MarketAnalysis } |
| `x402Results` | `X402ResultInput[]` |  | { agentId, seller, query, response } (response truncated to 3000 chars) |
| `eventIdentifier` | `string` |  |  |
| `pmType` | `"Kalshi" \| "Polymarket"` |  |  |
| `model` | `string` |  | gpt-* goes to OpenAI, anything else to Grok |

`analyses.length + x402Results.length` must be **at least 2**, or it throws
`Need at least 2 data sources…`.

## Result

```ts
{
  analysis: AggregatedAnalysis, // MarketAnalysis + agentConsensus
  model: string,
  tokensUsed?: number,
  agentsAggregated: number,
  processingTimeMs: number,
}
```

`agentConsensus` is `{ agreementLevel: "high" | "medium" | "low", majorityRecommendation: string, dissenting: string[] }`.

## Example: three models, one vote

```ts
import { getEvents, runEventAnalysisAgent, runBookmakerAgent } from "investing/prediction-agent";

const event = await getEvents({ url });
const base = { markets: event.markets, eventIdentifier: event.eventIdentifier, pmType: event.pmType };

const models = ["grok-4-1-fast-reasoning", "gpt-4.1", "gpt-5-nano"];
const settled = await Promise.allSettled(models.map((model) => runEventAnalysisAgent({ ...base, model })));
const analyses = settled.flatMap((r, i) =>
  r.status === "fulfilled" ? [{ agentId: `a${i}`, model: models[i], analysis: r.value.analysis }] : [],
);

const { analysis, agentsAggregated } = await runBookmakerAgent({ ...base, analyses, model: "gpt-4.1" });

console.log(`${agentsAggregated} sources, agreement ${analysis.agentConsensus.agreementLevel}`);
console.log(analysis.recommendedAction, analysis.winnerConfidence);
if (analysis.agentConsensus.agreementLevel === "low") console.log("Dissent:", analysis.agentConsensus.dissenting);
```

## Example: add paid research

```ts
import { runX402Seller } from "investing/prediction-agent";

const research = await runX402Seller({ action: "call", resourceUrl: SELLER_URL, query: `Latest news on ${event.eventIdentifier}` });

const { analysis } = await runBookmakerAgent({
  ...base,
  analyses,
  x402Results: [{ agentId: "payai", seller: "news-desk", query: event.eventIdentifier, response: JSON.stringify(research) }],
  model: "grok-4-fast",
});
```

See [execution agents](https://investing-lib.vercel.app/docs/prediction-agent/execution-agents#x402-seller) for `runX402Seller`.
