/**
 * Cloudflare Worker that runs the momentum agent on a cron schedule.
 *
 *   scheduled()  - fires on the crons in wrangler.jsonc (US market hours)
 *   GET /        - last run report (from KV, if bound)
 *   POST /run    - run now (needs `Authorization: Bearer <RUN_TOKEN>` when RUN_TOKEN is set)
 *
 * Secrets: wrangler secret put ALPACA_API_KEY / ALPACA_SECRET
 */
import { runAgent, type AgentEnv, type RunReport } from "./agent";

interface Env extends AgentEnv {
  /** Optional KV namespace for the last report. */
  REPORTS?: KVNamespace;
  /** Optional shared secret for POST /run. */
  RUN_TOKEN?: string;
}

async function runAndStore(env: Env): Promise<RunReport> {
  const report = await runAgent(env);
  console.log(JSON.stringify({ basket: report.basket, trades: report.trades.length, skipped: report.skipped }));
  await env.REPORTS?.put("last-run", JSON.stringify(report), { expirationTtl: 60 * 60 * 24 * 30 });
  return report;
}

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runAndStore(env));
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/run") {
      if (env.RUN_TOKEN && request.headers.get("Authorization") !== `Bearer ${env.RUN_TOKEN}`) {
        return new Response("unauthorized", { status: 401 });
      }
      return Response.json(await runAndStore(env));
    }
    const last = (await env.REPORTS?.get("last-run")) ?? JSON.stringify({ message: "no runs yet" });
    return new Response(last, { headers: { "Content-Type": "application/json" } });
  },
} satisfies ExportedHandler<Env>;
