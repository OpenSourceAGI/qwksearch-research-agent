import { afterEach, describe, expect, it, vi } from 'vitest';
import { ENGINES } from '../src/engines';
import { benchmarkEngines, formatReport, percentile, rankEngines } from '../src/benchmark';

afterEach(() => vi.restoreAllMocks());

describe('percentile', () => {
  it('uses nearest-rank', () => {
    expect(percentile([10, 20, 30, 40], 50)).toBe(20);
    expect(percentile([10, 20, 30, 40], 90)).toBe(40);
    expect(Number.isNaN(percentile([], 50))).toBe(true);
  });
});

describe('benchmarkEngines', () => {
  it('names the engine with the lowest median latency', async () => {
    // A fake clock advanced by each engine by its own "latency".
    let clock = 0;
    const latency = { google: 80, bing: 30, wikipedia: 50 } as const;
    for (const [name, ms] of Object.entries(latency)) {
      vi.spyOn(ENGINES, name as keyof typeof latency).mockImplementation(async () => {
        clock += ms;
        return ['s'];
      });
    }
    const report = await benchmarkEngines({
      engines: ['google', 'bing', 'wikipedia'],
      queries: ['a', 'b'],
      rounds: 2,
      now: () => clock,
    });
    expect(report.fastest).toBe('bing');
    expect(report.ranking.map((r) => r.engine)).toEqual(['bing', 'wikipedia', 'google']);
    expect(report.ranking[0].medianMs).toBe(30);
    expect(report.samples).toHaveLength(12);
    expect(formatReport(report)).toContain('Fastest: bing');
  });

  it('disqualifies a fast engine that fails or returns nothing', async () => {
    let clock = 0;
    vi.spyOn(ENGINES, 'bing').mockImplementation(async () => {
      clock += 1;
      throw new Error('HTTP 403 from api.bing.com');
    });
    vi.spyOn(ENGINES, 'brave').mockImplementation(async () => {
      clock += 2;
      return [];
    });
    vi.spyOn(ENGINES, 'google').mockImplementation(async () => {
      clock += 90;
      return ['ok'];
    });
    const report = await benchmarkEngines({
      engines: ['bing', 'brave', 'google'],
      queries: ['a'],
      rounds: 3,
      now: () => clock,
    });
    expect(report.fastest).toBe('google');
    const bing = report.ranking.find((r) => r.engine === 'bing')!;
    expect(bing.successRate).toBe(0);
    expect(bing.error).toContain('403');
  });

  it('reports no winner when every engine is unreachable', async () => {
    vi.spyOn(ENGINES, 'google').mockRejectedValue(new Error('CONNECT tunnel failed'));
    const report = await benchmarkEngines({ engines: ['google'], queries: ['a'], rounds: 1 });
    expect(report.fastest).toBeNull();
    expect(formatReport(report)).toContain('Fastest: none');
  });
});

describe('rankEngines', () => {
  it('breaks a median tie on p90', () => {
    const base = { samples: 3, successRate: 1, meanMs: 0, minMs: 0 };
    const ranked = rankEngines(
      [
        { ...base, engine: 'google', medianMs: 50, p90Ms: 90 },
        { ...base, engine: 'bing', medianMs: 50, p90Ms: 60 },
      ],
      0.9,
    );
    expect(ranked[0].engine).toBe('bing');
  });
});
