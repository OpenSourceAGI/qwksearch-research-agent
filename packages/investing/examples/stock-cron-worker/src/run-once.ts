/**
 * Run the agent once in Node, exactly as the cron trigger would.
 * This is what `npm start` does, so it works on StackBlitz too.
 */
import "dotenv/config";
import { runAgent } from "./agent";
import { formatSignal } from "./strategy";

const report = await runAgent(process.env);
if (report.skipped && report.signals.length === 0) {
  console.log(`Skipped: ${report.skipped}. Add paper keys to .env (see .env.example).`);
} else {
  report.signals.sort((a, b) => b.momentum - a.momentum).forEach((s) => console.log("  " + formatSignal(s)));
  console.log(`\nMarket ${report.marketOpen ? "open" : "closed"}  equity $${report.equity.toLocaleString()}`);
  console.log(`Basket: ${report.basket.join(", ") || "(cash)"}`);
  for (const t of report.trades) console.log(`  ${t.side.toUpperCase().padEnd(4)} $${t.notional.toFixed(2)} ${t.symbol}`);
  for (const o of report.orders) console.log(`  sent ${o.side} ${o.symbol} -> ${o.status}`);
  if (report.skipped) console.log(`\nNo orders sent: ${report.skipped}.`);
}
