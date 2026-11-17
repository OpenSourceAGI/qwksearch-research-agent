/**
 * Run the watcher once in Node, exactly as the cron trigger would.
 * This is what `npm start` does, so it works on StackBlitz too.
 */
import "dotenv/config";
import { formatAlert, runAgent } from "./agent";

const result = await runAgent(process.env);
console.log(`Scanned ${result.scanned} events at ${result.ranAt}: ${result.alerts.length} big movers\n`);
for (const a of result.alerts) console.log(formatAlert(a) + "\n");
if (!process.env.OPENAI_API_KEY && !process.env.XAI_API_KEY) {
  console.log("Set OPENAI_API_KEY or XAI_API_KEY in .env to get an AI opinion on each move.");
}
if (!process.env.ALERT_WEBHOOK_URL) console.log("Set ALERT_WEBHOOK_URL to post alerts to Discord or Slack.");
