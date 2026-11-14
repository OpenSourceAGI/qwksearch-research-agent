/**
 * @file rolling-stats.tsx
 * @description Interactive calculateRollingStats: a price series and a window
 * in, the rolling mean / standard deviation columns out, with a sparkline.
 * Imports the package source.
 */
'use client';

import { useState } from 'react';
import { calculateRollingStats } from '@investing/correlate/rolling-stats';
import { Field, Panel, ResultView, inputClass, parseNumbers } from './shared';

const SAMPLE = '187.4 189.1 188.2 191.6 193.0 190.8 194.2 197.5 196.1 199.8 198.4 202.3';

export function RollingStatsPlayground() {
  const [seriesText, setSeriesText] = useState(SAMPLE);
  const [windowSize, setWindowSize] = useState(3);

  const values = parseNumbers(seriesText).filter((v) => !Number.isNaN(v));
  const rows = values.map((close, i) => ({ day: i + 1, close }));
  const meanKey = `close_rolling_mean_${windowSize}d`;
  const stdKey = `close_rolling_std_${windowSize}d`;
  const result = calculateRollingStats(rows, 'close', windowSize) as Array<Record<string, number | null>>;

  const w = 520;
  const h = 120;
  const all = values.concat(result.map((r) => Number(r[meanKey] ?? NaN)).filter((v) => !Number.isNaN(v)));
  const min = Math.min(...all);
  const max = Math.max(...all);
  const x = (i: number) => (values.length < 2 ? 0 : (i / (values.length - 1)) * w);
  const y = (v: number) => (max === min ? h / 2 : h - ((v - min) / (max - min)) * (h - 10) - 5);
  const line = (pts: number[]) => pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  return (
    <Panel title="calculateRollingStats" source="src/correlate/rolling-stats.ts">
      <div className="grid gap-3 md:grid-cols-[1fr_140px]">
        <Field label="close prices" hint={`${values.length} rows`}>
          <textarea className={inputClass} rows={2} value={seriesText} onChange={(e) => setSeriesText(e.target.value)} />
        </Field>
        <Field label="window">
          <input className={inputClass} type="number" min={1} max={30} value={windowSize} onChange={(e) => setWindowSize(Math.max(1, Number(e.target.value) || 1))} />
        </Field>
      </div>

      {values.length === 0 ? (
        <ResultView ok="warn" title="input">
          <p>Enter some numbers.</p>
        </ResultView>
      ) : (
        <ResultView ok title={`${meanKey} / ${stdKey}`}>
          <svg viewBox={`0 0 ${w} ${h}`} className="mb-3 h-28 w-full" role="img" aria-label="Close price and rolling mean">
            <path d={line(values)} fill="none" stroke="currentColor" strokeOpacity={0.45} strokeWidth={1.5} />
            <path d={line(result.map((r) => Number(r[meanKey])))} fill="none" stroke="var(--color-fd-primary)" strokeWidth={2.5} />
          </svg>
          <div className="mb-2 flex gap-4 text-xs text-fd-muted-foreground">
            <span>— close</span>
            <span className="text-fd-primary">— rolling mean</span>
          </div>
          <div className="max-h-64 overflow-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="text-left text-fd-muted-foreground">
                  <th className="py-1 pr-3">day</th>
                  <th className="py-1 pr-3">close</th>
                  <th className="py-1 pr-3">mean</th>
                  <th className="py-1">std</th>
                </tr>
              </thead>
              <tbody>
                {result.map((r) => (
                  <tr key={String(r.day)} className="border-t border-fd-border/60">
                    <td className="py-1 pr-3">{r.day}</td>
                    <td className="py-1 pr-3">{Number(r.close).toFixed(2)}</td>
                    <td className="py-1 pr-3">{r[meanKey] == null ? 'null' : Number(r[meanKey]).toFixed(3)}</td>
                    <td className="py-1">{r[stdKey] == null ? 'null' : Number(r[stdKey]).toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ResultView>
      )}
    </Panel>
  );
}
