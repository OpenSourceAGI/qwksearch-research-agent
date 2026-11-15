/**
 * One run of the prediction-market watcher. Shared by the Worker's cron
 * trigger (src/worker.ts) and the local runner (src/run-once.ts).
 *
 * 1. Fetch the most-traded live Polymarket events (public Gamma API, no key).
 * 2. Find markets whose probability moved more than MIN_MOVE in 24h.
 * 3. For the biggest movers, ask the PredictionAgent event-analysis agent
 *    whether the move overshot (needs OPENAI_API_KEY or XAI_API_KEY).
 * 4. Post a summary to ALERT_WEBHOOK_URL (Discord or Slack incoming webhook).
 */
import { runEventAnalysisAgent } from "investing/prediction-agent/agents";
import { bigMovers, compactMarkets, eventUrl, getTopEvents, yesPrice } from "./polymarket";

export interface AgentEnv {
  OPENAI_API_KEY?: string;
  XAI_API_KEY?: string;
  MODEL?: string;
  /** How many top events to scan, default 25. */
  SCAN_EVENTS?: string;
  /** Minimum 24h probability move to alert on, 0-1, default 0.1 (10 points). */
  MIN_MOVE?: string;
  /** How many movers get an AI opinion per run, default 3. */
  ANALYZE_TOP?: string;
  /** Optional Polymarket tag slug to scan, e.g. politics or crypto. */
  TAG?: string;
  /** Discord or Slack incoming-webhook URL. */
  ALERT_WEBHOOK_URL?: string;
}

export interface Alert {
  question: string;
  url: string;
  yes: number;
  move: number;
  action?: string;
  modelProbability?: number;
  reasoning?: string;
}

export async function runAgent(env: AgentEnv): Promise<{ ranAt: string; scanned: number; alerts: Alert[] }> {
  const ranAt = new Date().toISOString();
  const events = await getTopEvents(Number(env.SCAN_EVENTS ?? 25), env.TAG || undefined);
  const movers = bigMovers(events, Number(env.MIN_MOVE ?? 0.1));
  const aiConfig = { openaiApiKey: env.OPENAI_API_KEY, xaiApiKey: env.XAI_API_KEY };
  const hasAI = Boolean(env.OPENAI_API_KEY || env.XAI_API_KEY);
  const model = env.MODEL ?? (env.OPENAI_API_KEY ? "gpt-4.1-mini" : "grok-4-1-fast-reasoning");
  const analyzeTop = Number(env.ANALYZE_TOP ?? 3);

  const alerts: Alert[] = [];
  for (const [i, { event, market }] of movers.entries()) {
    const alert: Alert = {
      question: market.question,
      url: eventUrl(event),
      yes: yesPrice(market),
      move: market.oneDayPriceChange ?? 0,
    };
    if (hasAI && i < analyzeTop) {
      try {
        const { analysis } = await runEventAnalysisAgent(
          {
            markets: compactMarkets(event),
            eventIdentifier: event.slug,
            pmType: "Polymarket",
            model,
            question: `"${market.question}" moved ${(alert.move * 100).toFixed(1)} points in 24h to ${(alert.yes * 100).toFixed(1)}%. Did the market overreact or underreact? Which side has the edge now?`,
          },
          aiConfig,
        );
        alert.action = analysis.recommendedAction;
        alert.modelProbability = analysis.estimatedActualProbability;
        alert.reasoning = analysis.reasoning;
      } catch (err) {
        alert.reasoning = `analysis failed: ${(err as Error).message}`;
      }
    }
    alerts.push(alert);
  }

  if (env.ALERT_WEBHOOK_URL && alerts.length) await postAlerts(env.ALERT_WEBHOOK_URL, alerts);
  return { ranAt, scanned: events.length, alerts };
}

export function formatAlert(a: Alert): string {
  const move = `${a.move > 0 ? "+" : ""}${(a.move * 100).toFixed(1)} pts`;
  let line = `${move} -> ${(a.yes * 100).toFixed(1)}%  ${a.question}  ${a.url}`;
  if (a.action) line += `\n    AI: ${a.action} (model ${a.modelProbability}%) ${(a.reasoning ?? "").slice(0, 200)}`;
  return line;
}

async function postAlerts(webhookUrl: string, alerts: Alert[]) {
  const text = `Polymarket movers\n${alerts.slice(0, 10).map(formatAlert).join("\n")}`.slice(0, 1900);
  // Discord reads `content`, Slack reads `text`.
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: text, text }),
  });
  if (!res.ok) console.warn(`webhook ${res.status}: ${await res.text()}`);
}
