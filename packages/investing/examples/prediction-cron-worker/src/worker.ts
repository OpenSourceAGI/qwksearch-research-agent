/**
 * Cloudflare Worker that watches Polymarket on a cron schedule.
 *
 *   scheduled()  - fires on the crons in wrangler.jsonc (hourly)
 *   GET /        - last run (from KV, if bound)
 *   POST /run    - run now (needs `Authorization: Bearer <RUN_TOKEN>` when RUN_TOKEN is set)
 *
 * Secrets: wrangler secret put OPENAI_API_KEY (or XAI_API_KEY) / ALERT_WEBHOOK_URL
 */
import { runAgent, type AgentEnv } from "./agent";

interface Env extends AgentEnv {
  REPORTS?: KVNamespace;
  RUN_TOKEN?: string;
}

async function runAndStore(env: Env) {
  const result = await runAgent(env);
  console.log(JSON.stringify({ scanned: result.scanned, alerts: result.alerts.length }));
  await env.REPORTS?.put("last-run", JSON.stringify(result), { expirationTtl: 60 * 60 * 24 * 7 });
  return result;
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
