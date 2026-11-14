/**
 * @file market-urls.tsx
 * @description Interactive buildPolymarketUrl / buildKalshiMarketUrl from the
 * PredictOS data clients. Imports the package source.
 */
'use client';

import { useState } from 'react';
import { buildKalshiMarketUrl, buildPolymarketUrl } from '@investing/predictos/data/polymarket';
import { Field, Panel, ResultView, inputClass } from './shared';

export function MarketUrlPlayground() {
  const [slug, setSlug] = useState('fed-decision-in-december');
  const [ticker, setTicker] = useState('KXFEDDECISION-26DEC-C25');

  return (
    <Panel title="buildPolymarketUrl · buildKalshiMarketUrl" source="src/predictos/data/polymarket.ts">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Polymarket event slug">
          <input className={inputClass} value={slug} onChange={(e) => setSlug(e.target.value)} />
        </Field>
        <Field label="Kalshi market ticker">
          <input className={inputClass} value={ticker} onChange={(e) => setTicker(e.target.value)} />
        </Field>
      </div>
      <ResultView ok title="URLs">
        <ul className="space-y-1 break-all font-mono text-xs">
          <li>{buildPolymarketUrl(slug)}</li>
          <li>{buildKalshiMarketUrl(ticker)}</li>
        </ul>
        <p className="mt-2 text-xs text-fd-muted-foreground">
          Kalshi URLs keep only the series (the part before the first <code>-</code>), which is what kalshi.com routes on.
        </p>
      </ResultView>
    </Panel>
  );
}
