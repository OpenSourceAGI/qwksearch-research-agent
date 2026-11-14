/**
 * @file features-grid.tsx
 * @description The package's modules as a grid of cards, each with the import
 * it lives behind and a link to its docs page.
 */
import { BarChart3, Bot, Brain, Database, Landmark, LineChart, Scale, Sigma, Users } from 'lucide-react';
import Link from 'next/link';

const modules = [
  {
    icon: LineChart,
    title: 'Unified stock quotes',
    description: 'One call for a quote: cache, then Alpaca with a 10 s timeout, then Yahoo Finance, normalized to one shape.',
    example: "getQuote('AAPL')",
    href: '/docs/stocks',
  },
  {
    icon: Landmark,
    title: 'Alpaca brokerage',
    description: 'Paper or live trading client that reads every common Alpaca env var name, plus a Broker API client.',
    example: 'createAlpacaClient({ paper: true })',
    href: '/docs/alpaca',
  },
  {
    icon: BarChart3,
    title: 'Polymarket data',
    description: 'Markets, search, leaderboards, trader activity, holders and price history from the Gamma, Data and CLOB APIs.',
    example: "fetchMarkets(20, 'volume24hr')",
    href: '/docs/prediction',
  },
  {
    icon: Brain,
    title: 'PredictOS agents',
    description: 'Paste a Kalshi or Polymarket URL, get the markets, an AI alpha analysis, a consensus, and order parameters.',
    example: 'runEventAnalysisAgent({ markets, … })',
    href: '/docs/predictos',
  },
  {
    icon: Scale,
    title: 'Cross-venue arbitrage',
    description: 'Finds the same event on the other venue and checks whether YES + NO costs less than the $1 payout.',
    example: "findArbitrage({ url, model: 'grok-4-fast' })",
    href: '/docs/predictos/arbitrage',
  },
  {
    icon: Bot,
    title: 'Trading agents',
    description: 'Market and news analysts, three rounds of bull-vs-bear debate, a judge and a trader that returns BUY / SELL / HOLD.',
    example: "graph.propagate('NVDA', '2026-11-13')",
    href: '/docs/trading-agents',
  },
  {
    icon: Sigma,
    title: 'XGBoost correlate',
    description: 'Train a gradient-boosted model on any table, score it with RMSE and R², add rolling means and save it.',
    example: "trainModels(rows, 'close', opts)",
    href: '/docs/correlate',
  },
  {
    icon: Users,
    title: 'Social trading',
    description: 'Top traders from Polymarket, NVSTLY and ZuluTrade, synced into D1 with their positions and category P&L.',
    example: 'syncZuluTraders()',
    href: '/docs/social-trading',
  },
  {
    icon: Database,
    title: 'Cloudflare D1 schema',
    description: 'Drizzle tables for portfolios, trades, signals, Polymarket history and quote caches, behind a lazy db proxy.',
    example: 'db.select().from(positions)',
    href: '/docs/database',
  },
];

export function FeaturesGrid() {
  return (
    <section className="relative overflow-hidden border-b py-20 md:py-28">
      <div className="relative mx-auto max-w-6xl px-4">
        <div className="mb-14 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Everything behind <span className="text-fd-primary">one import</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-fd-muted-foreground">
            Nine fairly separate toolkits share the <code className="text-fd-primary">investing</code> name. Pick the one you need;
            each has its own page with a full API reference and examples.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((feature) => (
            <Link key={feature.title} href={feature.href} className="animated-border-card group block p-6 transition-colors hover:bg-fd-accent/40">
              <feature.icon className="mb-4 size-8 text-fd-primary transition-transform duration-300 group-hover:scale-110" />
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="mb-4 text-sm leading-relaxed text-fd-muted-foreground">{feature.description}</p>
              <code className="rounded bg-fd-secondary px-2 py-1 font-mono text-xs text-fd-primary">{feature.example}</code>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
