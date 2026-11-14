/**
 * @file code-example.tsx
 * @description Tabbed TypeScript examples on the landing page, highlighted
 * with highlight.js (typescript only, so the bundle stays small).
 */
'use client';

import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

hljs.registerLanguage('typescript', typescript);

const codeExamples = {
  quotes: `import { getQuote, getQuotes, getHistoricalQuotes } from "investing/stocks";

// cache → Alpaca (10 s timeout) → Yahoo Finance
const { success, data } = await getQuote("AAPL");
if (success) console.log(data.price, data.changePercent, data.source);

const batch = await getQuotes(["MSFT", "NVDA", "GOOGL"]);
console.log(batch.data?.source); // "alpaca" | "yfinance" | "mixed"

const history = await getHistoricalQuotes("TSLA", "2026-01-01", "2026-06-30");
console.log(history.data?.quotes.length, history.data?.meta?.source);`,
  predictos: `import { getEvents, runEventAnalysisAgent, runMapperAgent, NoTradeError }
  from "investing/predictos";

const event = await getEvents({ url: "https://kalshi.com/markets/kxfeddecision/fed-meeting/kxfeddecision-26dec" });

const { analysis } = await runEventAnalysisAgent({
  markets: event.markets,
  eventIdentifier: event.eventIdentifier,
  pmType: event.pmType,
  model: "grok-4-fast",
  tools: ["x_search", "web_search"],
});

console.log(analysis.recommendedAction, analysis.alphaOpportunity, analysis.reasoning);`,
  arbitrage: `import { findArbitrage } from "investing/predictos";

const { analysis, sourceMarket, searchedMarket } = await findArbitrage({
  url: "https://polymarket.com/event/fed-decision-in-december",
  model: "gpt-4.1",
});

if (analysis.isSameMarket && analysis.arbitrage.hasArbitrage) {
  const s = analysis.arbitrage.strategy!;
  console.log(\`Buy YES on \${s.buyYesOn} @ \${s.buyYesPrice}, NO on \${s.buyNoOn} @ \${s.buyNoPrice}\`);
  console.log(\`Net profit per $100 pair: $\${s.netProfit}\`);
}`,
  agents: `import { TradingAgentsGraph } from "investing/trading-agents";

const graph = new TradingAgentsGraph(["market", "news"], true, {
  llmProvider: "openai",
  deepThinkLLM: "gpt-4o",
  quickThinkLLM: "gpt-4o-mini",
  apiKeys: { openai: process.env.OPENAI_API_KEY },
});

const { signal, state } = await graph.propagate("NVDA", "2026-11-13");
console.log(signal.action, state.investmentDebateState.judgeDecision);

await graph.reflectAndRemember(4.2); // the trade returned +4.2 %`,
  polymarket: `import { fetchMarkets, fetchLeaderboard, fetchPriceHistory } from "investing/prediction";

const markets = await fetchMarkets(10, "volume24hr");
for (const m of markets) console.log(m.question, m.outcomePrices);

const whales = await fetchLeaderboard({ timePeriod: "7d", orderBy: "PNL", limit: 5 });

const [yesToken] = JSON.parse(markets[0].clobTokenIds);
const { history } = await fetchPriceHistory({ market: yesToken, interval: "1d" });`,
};

type TabKey = keyof typeof codeExamples;

const tabLabels: Record<TabKey, string> = {
  quotes: 'Stock quotes',
  predictos: 'PredictOS',
  arbitrage: 'Arbitrage',
  agents: 'Trading agents',
  polymarket: 'Polymarket',
};

export function CodeExample() {
  const [activeTab, setActiveTab] = useState<TabKey>('quotes');
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  const copyCode = () => {
    void navigator.clipboard?.writeText(codeExamples[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (codeRef.current) {
      delete codeRef.current.dataset.highlighted;
      hljs.highlightElement(codeRef.current);
    }
  }, [activeTab]);

  return (
    <section className="border-b py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Usage <span className="text-fd-primary">examples</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-fd-muted-foreground">
            Every snippet uses the real exported names. The docs have dozens more, one page per module.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border bg-fd-card">
          <div className="flex items-center justify-between gap-2 overflow-x-auto border-b px-4 py-3">
            <div className="flex gap-1" role="tablist" aria-label="Examples">
              {(Object.keys(codeExamples) as TabKey[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors',
                    activeTab === tab
                      ? 'bg-fd-primary text-fd-primary-foreground'
                      : 'text-fd-muted-foreground hover:bg-fd-secondary hover:text-fd-foreground',
                  )}
                >
                  {tabLabels[tab]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm text-fd-muted-foreground hover:bg-fd-secondary hover:text-fd-foreground"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="max-h-[440px] overflow-auto p-6 text-sm leading-relaxed">
            <code ref={codeRef} className="language-typescript font-mono">
              {codeExamples[activeTab]}
            </code>
          </pre>
        </div>
      </div>
    </section>
  );
}
