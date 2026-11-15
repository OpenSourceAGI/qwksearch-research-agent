/**
 * Prediction market agent
 *
 *   npm start
 *
 * 1. Pulls the most-traded live Polymarket events from the public Gamma API
 *    (no key needed).
 * 2. Sends each event's markets to the PredictionAgent event-analysis agent
 *    from `investing/prediction-agent`, which asks an LLM for its own
 *    probability estimate and a BUY YES / BUY NO / NO TRADE call.
 *
 * Env:
 *   OPENAI_API_KEY or XAI_API_KEY   enables the AI analysis
 *   MODEL                           default gpt-4.1-mini (or grok-4-1-fast-reasoning with only XAI_API_KEY)
 *   EVENTS                          how many events to analyse, default 3
 *   TAG                             optional Polymarket tag slug, e.g. politics, crypto, sports
 *
 * Without an AI key it prints the markets and the biggest 24h movers only.
 * Nothing here places trades.
 */
import "dotenv/config";
import { runEventAnalysisAgent } from "investing/prediction-agent/agents";
import { bigMovers, compactMarkets, eventUrl, getTopEvents, parsePrices } from "./polymarket";

const EVENTS = Number(process.env.EVENTS ?? 3);
const TAG = process.env.TAG || undefined;
const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
const hasXai = Boolean(process.env.XAI_API_KEY);
const MODEL = process.env.MODEL ?? (hasOpenAI ? "gpt-4.1-mini" : "grok-4-1-fast-reasoning");

async function main() {
  const events = await getTopEvents(EVENTS, TAG);
  console.log(`\nTop ${events.length} Polymarket events by 24h volume${TAG ? ` (tag: ${TAG})` : ""}\n`);

  for (const e of events) {
    console.log(`# ${e.title}  $${Math.round(e.volume24hr ?? 0).toLocaleString()} 24h`);
    console.log(`  ${eventUrl(e)}`);
    for (const m of compactMarkets(e, 4)) {
      const odds = m.prices.map((p) => `${p.outcome} ${(p.price * 100).toFixed(1)}%`).join(" / ");
      console.log(`  - ${m.title}: ${odds}`);
    }

    if (hasOpenAI || hasXai) {
      try {
        const { analysis, model, processingTimeMs } = await runEventAnalysisAgent({
          markets: compactMarkets(e),
          eventIdentifier: e.slug,
          pmType: "Polymarket",
          model: MODEL,
          question: "Which market in this event is most mispriced right now, and which side should a trader take?",
        });
        console.log(
          `  >> ${analysis.recommendedAction} on "${analysis.title}"  market ${analysis.marketProbability}% vs model ${analysis.estimatedActualProbability}%  (alpha ${analysis.alphaOpportunity}, confidence ${analysis.winnerConfidence}%)`,
        );
        const why = analysis.reasoning ?? "";
        console.log(`     ${why.slice(0, 280)}${why.length > 280 ? "..." : ""}`);
        console.log(`     ${model}, ${processingTimeMs} ms`);
      } catch (err) {
        console.warn(`  analysis failed: ${(err as Error).message}`);
      }
    }
    console.log();
  }

  const movers = bigMovers(events, 0.05).slice(0, 5);
  if (movers.length) {
    console.log("Biggest 24h moves:");
    for (const { market } of movers) {
      const change = (market.oneDayPriceChange ?? 0) * 100;
      const yes = parsePrices(market)[0];
      console.log(
        `  ${change > 0 ? "+" : ""}${change.toFixed(1)} pts  ${market.question}  (now ${((yes?.price ?? 0) * 100).toFixed(1)}%)`,
      );
    }
  }
  if (!hasOpenAI && !hasXai) {
    console.log("\nSet OPENAI_API_KEY or XAI_API_KEY to add the AI analysis for each event.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
