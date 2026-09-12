// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { CLOUDFLARE_LIMIT_MB, MB, verdictFor } from './workerBudget';

const at = (gzipMb: number) => verdictFor(gzipMb * MB, gzipMb * 4 * MB).level;

describe('worker bundle budget', () => {
  it('stays quiet at the size the extraction chain left behind', () => {
    // 7.93 MB is where the QwkSearch extractor left it. A warning that fires on
    // every build is one nobody reads, so this must not warn today.
    expect(at(7.93)).toBe('ok');
  });

  it('warns once under ~1 MB of headroom is left', () => {
    expect(at(9.2)).toBe('warn');
  });

  it('fails only above the limit Cloudflare actually enforces', () => {
    // Exactly at the limit still uploads, so it warns rather than failing.
    expect(at(CLOUDFLARE_LIMIT_MB)).toBe('warn');
    expect(at(CLOUDFLARE_LIMIT_MB + 0.01)).toBe('fail');
  });

  it('honours a tightened ceiling', () => {
    expect(verdictFor(7.5 * MB, 30 * MB, 7, 6).level).toBe('fail');
  });
});
