/**
 * @fileoverview Measures each engine's suggest latency and picks the fastest.
 *
 * Rounds are interleaved — every engine answers query 1, then every engine
 * answers query 2 — so a slow patch of network lands on all engines alike
 * instead of on whichever one happened to be measured during it. A warm-up
 * request per engine is discarded so DNS and TLS setup are not billed to the
 * first sample.
 */
import {
  ENGINES,
  ENGINE_NAMES,
  type EngineName,
  type EngineRequestOptions,
} from "./engines";

export const DEFAULT_BENCHMARK_QUERIES = [
  "weather in",
  "how to make",
  "best laptop",
  "tesla stock",
  "climate change",
  "python tutorial",
  "new york times",
  "quantum comp",
];

export interface BenchmarkOptions extends Pick<EngineRequestOptions, "fetch" | "timeoutMs" | "locale"> {
  engines?: EngineName[];
  queries?: string[];
  /** Times each query is repeated per engine. Default 3. */
  rounds?: number;
  /**
   * Share of requests that must return at least one suggestion for an engine
   * to be eligible as fastest. Default 0.9 — a fast engine that answers with
   * errors or nothing is not fast.
   */
  minSuccessRate?: number;
  /** Clock, swappable for tests. */
  now?: () => number;
  onSample?: (sample: BenchmarkSample) => void;
}

export interface BenchmarkSample {
  engine: EngineName;
  query: string;
  ms: number;
  ok: boolean;
  count: number;
  error?: string;
}

export interface EngineStats {
  engine: EngineName;
  samples: number;
  successRate: number;
  medianMs: number;
  p90Ms: number;
  meanMs: number;
  minMs: number;
  /** First error seen, to say why an engine was disqualified. */
  error?: string;
}

export interface BenchmarkReport {
  /** Eligible engines by median latency, fastest first, then ineligible ones. */
  ranking: EngineStats[];
  /** Fastest eligible engine, or `null` when none met `minSuccessRate`. */
  fastest: EngineName | null;
  samples: BenchmarkSample[];
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return Number.NaN;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

export function summarize(
  engine: EngineName,
  samples: BenchmarkSample[],
): EngineStats {
  // Latency is taken over successful requests only: a request that failed in
  // 20ms says nothing about how fast the engine completes a query.
  const okTimes = samples.filter((s) => s.ok).map((s) => s.ms).sort((a, b) => a - b);
  const mean = okTimes.reduce((sum, ms) => sum + ms, 0) / (okTimes.length || 1);
  return {
    engine,
    samples: samples.length,
    successRate: samples.length ? okTimes.length / samples.length : 0,
    medianMs: percentile(okTimes, 50),
    p90Ms: percentile(okTimes, 90),
    meanMs: okTimes.length ? mean : Number.NaN,
    minMs: okTimes.length ? okTimes[0] : Number.NaN,
    error: samples.find((s) => s.error)?.error,
  };
}

export function rankEngines(stats: EngineStats[], minSuccessRate: number): EngineStats[] {
  const eligible = (s: EngineStats) => s.successRate >= minSuccessRate && Number.isFinite(s.medianMs);
  return [...stats].sort((a, b) => {
    if (eligible(a) !== eligible(b)) return eligible(a) ? -1 : 1;
    if (!eligible(a)) return b.successRate - a.successRate;
    return a.medianMs - b.medianMs || a.p90Ms - b.p90Ms;
  });
}

export async function benchmarkEngines(options: BenchmarkOptions = {}): Promise<BenchmarkReport> {
  const engines = options.engines ?? ENGINE_NAMES;
  const queries = options.queries ?? DEFAULT_BENCHMARK_QUERIES;
  const rounds = options.rounds ?? 3;
  const minSuccessRate = options.minSuccessRate ?? 0.9;
  const now = options.now ?? (() => performance.now());
  const request: EngineRequestOptions = {
    fetch: options.fetch,
    timeoutMs: options.timeoutMs,
    locale: options.locale,
  };

  const run = async (engine: EngineName, query: string): Promise<BenchmarkSample> => {
    const started = now();
    try {
      const results = await ENGINES[engine](query, request);
      return { engine, query, ms: now() - started, ok: results.length > 0, count: results.length };
    } catch (error) {
      return {
        engine,
        query,
        ms: now() - started,
        ok: false,
        count: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  await Promise.all(engines.map((engine) => run(engine, queries[0] ?? "test")));

  const samples: BenchmarkSample[] = [];
  for (let round = 0; round < rounds; round++) {
    for (const query of queries) {
      // Sequential on purpose: concurrent requests would share one uplink
      // and measure each other.
      for (const engine of engines) {
        const sample = await run(engine, query);
        samples.push(sample);
        options.onSample?.(sample);
      }
    }
  }

  const ranking = rankEngines(
    engines.map((engine) => summarize(engine, samples.filter((s) => s.engine === engine))),
    minSuccessRate,
  );
  const top = ranking[0];
  const fastest =
    top && top.successRate >= minSuccessRate && Number.isFinite(top.medianMs) ? top.engine : null;

  return { ranking, fastest, samples };
}

export function formatReport(report: BenchmarkReport): string {
  const fmt = (ms: number) => (Number.isFinite(ms) ? `${Math.round(ms)}` : "—");
  const rows = report.ranking.map((s, i) => [
    String(i + 1),
    s.engine,
    `${Math.round(s.successRate * 100)}%`,
    fmt(s.medianMs),
    fmt(s.p90Ms),
    fmt(s.meanMs),
    fmt(s.minMs),
    s.successRate < 1 && s.error ? s.error.slice(0, 60) : "",
  ]);
  const header = ["#", "engine", "ok", "median ms", "p90 ms", "mean ms", "min ms", "first error"];
  const widths = header.map((h, col) => Math.max(h.length, ...rows.map((r) => r[col].length)));
  const line = (cells: string[]) => cells.map((c, col) => c.padEnd(widths[col])).join("  ").trimEnd();
  return [
    line(header),
    line(widths.map((w) => "-".repeat(w))),
    ...rows.map(line),
    "",
    report.fastest
      ? `Fastest: ${report.fastest}`
      : "Fastest: none — no engine met the success threshold (is outbound network blocked?)",
  ].join("\n");
}
