#!/usr/bin/env bun
/**
 * Benchmarks every autocomplete engine from this machine and names the fastest.
 *
 *   bun run benchmark
 *   bun run benchmark --rounds 5 --engines google,duckduckgo,bing
 *   bun run benchmark --json > results.json
 *
 * Latency depends on where it is measured from. The default engine is meant to
 * be fast from the Worker's egress, so prefer running this somewhere similar
 * (a datacenter host or CI runner) over a home connection.
 */
import { parseArgs } from "node:util";
import { benchmarkEngines, formatReport } from "../src/benchmark";
import { DEFAULT_ENGINE } from "../src/autocomplete";
import { ENGINE_NAMES, isEngineName, type EngineName } from "../src/engines";

const { values } = parseArgs({
  options: {
    rounds: { type: "string", default: "3" },
    engines: { type: "string" },
    queries: { type: "string" },
    locale: { type: "string", default: "en-US" },
    timeout: { type: "string", default: "3000" },
    "min-success": { type: "string", default: "0.9" },
    json: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help) {
  console.log(`Usage: bun run benchmark [--rounds N] [--engines a,b] [--queries "q1|q2"]
                         [--locale en-US] [--timeout ms] [--min-success 0.9] [--json]

Engines: ${ENGINE_NAMES.join(", ")}`);
  process.exit(0);
}

const engines = values.engines
  ?.split(",")
  .map((e) => e.trim())
  .filter(Boolean);
const unknown = engines?.filter((e) => !isEngineName(e)) ?? [];
if (unknown.length) {
  console.error(`Unknown engine(s): ${unknown.join(", ")}. Known: ${ENGINE_NAMES.join(", ")}`);
  process.exit(2);
}

const report = await benchmarkEngines({
  engines: engines as EngineName[] | undefined,
  queries: values.queries?.split("|").map((q) => q.trim()).filter(Boolean),
  rounds: Number(values.rounds),
  locale: values.locale,
  timeoutMs: Number(values.timeout),
  minSuccessRate: Number(values["min-success"]),
  onSample: values.json ? undefined : () => process.stderr.write("."),
});

if (values.json) {
  console.log(JSON.stringify({ ...report, defaultEngine: DEFAULT_ENGINE, measuredAt: new Date().toISOString() }, null, 2));
} else {
  process.stderr.write("\n\n");
  console.log(formatReport(report));
  if (report.fastest && report.fastest !== DEFAULT_ENGINE) {
    console.log(
      `\nDEFAULT_ENGINE is '${DEFAULT_ENGINE}'. To switch, change it in src/autocomplete.ts and the README table.`,
    );
  }
}

process.exit(report.fastest ? 0 : 1);
