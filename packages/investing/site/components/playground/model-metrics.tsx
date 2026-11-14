/**
 * @file model-metrics.tsx
 * @description Interactive calculateRMSE / calculateR2 from the correlate
 * module, on numbers you paste. Imports the package source.
 */
'use client';

import { useState } from 'react';
import { calculateR2, calculateRMSE } from '@investing/correlate/metrics';
import { Field, Panel, ResultView, inputClass, parseNumbers } from './shared';

export function ModelMetricsPlayground() {
  const [actualText, setActualText] = useState('101.2, 102.8, 101.9, 104.4, 106.0, 105.1, 107.3');
  const [predictedText, setPredictedText] = useState('100.8, 103.1, 102.6, 103.9, 105.2, 105.9, 106.8');

  const actual = parseNumbers(actualText);
  const predicted = parseNumbers(predictedText);
  const invalid = actual.some(Number.isNaN) || predicted.some(Number.isNaN);
  const mismatch = actual.length !== predicted.length;

  return (
    <Panel title="calculateRMSE · calculateR2" source="src/correlate/metrics.ts">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="actual" hint={`${actual.length} values`}>
          <textarea className={inputClass} rows={3} value={actualText} onChange={(e) => setActualText(e.target.value)} />
        </Field>
        <Field label="predicted" hint={`${predicted.length} values`}>
          <textarea className={inputClass} rows={3} value={predictedText} onChange={(e) => setPredictedText(e.target.value)} />
        </Field>
      </div>
      {invalid ? (
        <ResultView ok={false} title="input">
          <p>Every value must be a number.</p>
        </ResultView>
      ) : mismatch || actual.length < 2 ? (
        <ResultView ok="warn" title="input">
          <p>Give both lists the same length, at least two values each.</p>
        </ResultView>
      ) : (
        <ResultView ok title="result">
          <div className="grid grid-cols-2 gap-4 font-mono">
            <div>
              <div className="text-xs text-fd-muted-foreground">calculateRMSE(actual, predicted)</div>
              <div className="text-2xl font-semibold">{calculateRMSE(actual, predicted).toFixed(4)}</div>
            </div>
            <div>
              <div className="text-xs text-fd-muted-foreground">calculateR2(predicted, actual)</div>
              <div className="text-2xl font-semibold">{calculateR2(predicted, actual).toFixed(4)}</div>
            </div>
          </div>
        </ResultView>
      )}
    </Panel>
  );
}
