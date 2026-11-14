/**
 * @file order-mapper.tsx
 * @description Interactive runMapperAgent: edit an analysis result and a
 * Polymarket market, see the order parameters (or the error) the real
 * function produces. Imports the package source, not a copy.
 */
'use client';

import { useMemo, useState } from 'react';
import { NoTradeError, runMapperAgent } from '@investing/predictos/agents/mapper-agent';
import type { MapperAgentRequest, MapperAgentResult } from '@investing/predictos/types';
import { Field, Json, Panel, ResultView, inputClass } from './shared';

type Action = 'BUY YES' | 'BUY NO' | 'NO TRADE';

export function OrderMapperPlayground() {
  const [platform, setPlatform] = useState<'Polymarket' | 'Kalshi'>('Polymarket');
  const [action, setAction] = useState<Action>('BUY YES');
  const [confidence, setConfidence] = useState(72);
  const [yesPrice, setYesPrice] = useState(0.37);
  const [budget, setBudget] = useState(25);
  const [tickSize, setTickSize] = useState('0.01');
  const [outcomes, setOutcomes] = useState<'Yes/No' | 'Up/Down'>('Yes/No');
  const [negRisk, setNegRisk] = useState(false);
  const [closed, setClosed] = useState(false);
  const [acceptingOrders, setAcceptingOrders] = useState(true);

  const request: MapperAgentRequest = useMemo(() => {
    const noPrice = Math.max(0, Math.min(1, 1 - yesPrice));
    const labels = outcomes === 'Yes/No' ? ['Yes', 'No'] : ['Up', 'Down'];
    return {
      platform,
      budgetUsd: budget,
      analysisResult: {
        recommendedAction: action,
        predictedWinner: action === 'BUY NO' ? 'NO' : 'YES',
        winnerConfidence: confidence,
        marketProbability: Math.round(yesPrice * 100),
        estimatedActualProbability: action === 'BUY NO' ? Math.round(yesPrice * 100) - 12 : Math.round(yesPrice * 100) + 12,
        ticker: 'will-the-fed-cut-rates-in-december',
        title: 'Will the Fed cut rates in December?',
      },
      marketData: {
        conditionId: '0x9c1a…e2f4',
        slug: 'will-the-fed-cut-rates-in-december',
        clobTokenIds: JSON.stringify(['71321045679252212594626385532706912750332728571942532289631379312455583992563', '52114319501245915516055106046884209969926127482827954674443846427813813222426']),
        outcomes: JSON.stringify(labels),
        outcomePrices: JSON.stringify([yesPrice.toFixed(3), noPrice.toFixed(3)]),
        acceptingOrders,
        closed,
        minimumTickSize: tickSize,
        negRisk,
        question: 'Will the Fed cut rates in December?',
      },
    };
  }, [platform, action, confidence, yesPrice, budget, tickSize, outcomes, negRisk, closed, acceptingOrders]);

  let result: MapperAgentResult | null = null;
  let error: Error | null = null;
  try {
    result = runMapperAgent(request);
  } catch (e) {
    error = e instanceof Error ? e : new Error(String(e));
  }

  return (
    <Panel title="runMapperAgent — analysis → Polymarket order" source="src/predictos/agents/mapper-agent.ts">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="platform">
          <select className={inputClass} value={platform} onChange={(e) => setPlatform(e.target.value as 'Polymarket' | 'Kalshi')}>
            <option>Polymarket</option>
            <option>Kalshi</option>
          </select>
        </Field>
        <Field label="recommendedAction">
          <select className={inputClass} value={action} onChange={(e) => setAction(e.target.value as Action)}>
            <option>BUY YES</option>
            <option>BUY NO</option>
            <option>NO TRADE</option>
          </select>
        </Field>
        <Field label="budgetUsd" hint="$1–$100">
          <input className={inputClass} type="number" step="0.5" value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
        </Field>
        <Field label="winnerConfidence">
          <input className={inputClass} type="number" min={0} max={100} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} />
        </Field>
        <Field label={`YES price ${yesPrice.toFixed(3)}`} hint={`NO ${(1 - yesPrice).toFixed(3)}`}>
          <input type="range" min={0.005} max={0.995} step={0.005} value={yesPrice} onChange={(e) => setYesPrice(Number(e.target.value))} />
        </Field>
        <Field label="minimumTickSize">
          <select className={inputClass} value={tickSize} onChange={(e) => setTickSize(e.target.value)}>
            <option>0.01</option>
            <option>0.001</option>
            <option>0.1</option>
          </select>
        </Field>
        <Field label="outcomes">
          <select className={inputClass} value={outcomes} onChange={(e) => setOutcomes(e.target.value as 'Yes/No' | 'Up/Down')}>
            <option>Yes/No</option>
            <option>Up/Down</option>
          </select>
        </Field>
        <div className="flex flex-col justify-end gap-1 text-xs">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={negRisk} onChange={(e) => setNegRisk(e.target.checked)} /> negRisk
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={closed} onChange={(e) => setClosed(e.target.checked)} /> closed
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={acceptingOrders} onChange={(e) => setAcceptingOrders(e.target.checked)} /> acceptingOrders
          </label>
        </div>
      </div>

      {result ? (
        <ResultView ok title="orderParams">
          <p className="mb-2 font-medium">{(result.orderParams as { orderDescription?: string }).orderDescription}</p>
          <Json value={result} />
        </ResultView>
      ) : error instanceof NoTradeError ? (
        <ResultView ok="warn" title="NoTradeError (not a failure)">
          <p>{error.message}</p>
        </ResultView>
      ) : (
        <ResultView ok={false} title="throws Error">
          <p>{error?.message}</p>
        </ResultView>
      )}
    </Panel>
  );
}
