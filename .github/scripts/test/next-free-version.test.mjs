import { describe, expect, it, vi } from 'vitest';

import {
  bumpPatch,
  compareVersions,
  fetchPackument,
  nextFreeVersion,
  takenVersions,
} from '../next-free-version.mjs';

describe('compareVersions', () => {
  it('compares each segment numerically, not as text', () => {
    // The bug this whole script exists for started as a string comparison:
    // '0.1.9' sorts after '0.1.275' lexically.
    expect(compareVersions('0.1.275', '0.1.9')).toBeGreaterThan(0);
    expect(compareVersions('0.1.9', '0.1.275')).toBeLessThan(0);
    expect(compareVersions('1.0.143', '1.0.143')).toBe(0);
    expect(compareVersions('2.0.0', '1.99.99')).toBeGreaterThan(0);
  });

  it('treats missing segments as zero', () => {
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('1.2', '1.2.1')).toBeLessThan(0);
  });
});

describe('bumpPatch', () => {
  it('increments the patch segment', () => {
    expect(bumpPatch('0.1.275')).toBe('0.1.276');
    expect(bumpPatch('1.0.9')).toBe('1.0.10');
  });
});

describe('takenVersions', () => {
  it('unions the published list with the release timeline', () => {
    // 0.1.275 is the shape of a *staged* version: the version document exists
    // (so `time` has an entry) but it never made it into `versions`.
    const taken = takenVersions({
      versions: ['0.1.273', '0.1.274'],
      time: {
        created: '2024-01-01T00:00:00.000Z',
        modified: '2024-06-01T00:00:00.000Z',
        '0.1.273': '2024-05-01T00:00:00.000Z',
        '0.1.274': '2024-05-02T00:00:00.000Z',
        '0.1.275': '2024-05-03T00:00:00.000Z',
      },
    });

    expect([...taken].sort()).toEqual(['0.1.273', '0.1.274', '0.1.275']);
  });

  it('ignores the non-version keys npm puts in `time`', () => {
    const taken = takenVersions({
      versions: [],
      time: { created: 'x', modified: 'y', unpublished: 'z' },
    });

    expect(taken.size).toBe(0);
  });

  it('accepts the bare string npm returns for a single-version package', () => {
    expect([...takenVersions({ versions: '1.0.0' })]).toEqual(['1.0.0']);
  });

  it('returns an empty set for an unknown package', () => {
    expect(takenVersions({}).size).toBe(0);
    expect(takenVersions(null).size).toBe(0);
  });
});

describe('nextFreeVersion', () => {
  it('skips a version npm staged but never listed', () => {
    // The regression: local 0.1.273, `latest` still 0.1.274, and 0.1.275
    // already reserved. Bumping one patch above `latest` picked 0.1.275 and
    // npm answered E409 "Cannot publish over previously staged version".
    const taken = takenVersions({
      versions: ['0.1.273', '0.1.274'],
      time: {
        '0.1.273': 'a',
        '0.1.274': 'b',
        '0.1.275': 'c',
      },
    });

    expect(nextFreeVersion('0.1.273', taken)).toBe('0.1.276');
  });

  it('clears a run of reserved versions in one step', () => {
    const taken = new Set(['1.0.143', '1.0.144', '1.0.145']);
    expect(nextFreeVersion('1.0.143', taken)).toBe('1.0.146');
  });

  it('stays above the local version when the registry is behind it', () => {
    expect(nextFreeVersion('0.1.100', new Set(['0.1.98']))).toBe('0.1.101');
  });

  it('always bumps, so a retry after E409 cannot repeat the same number', () => {
    // The retry path hands back the version npm just refused; the registry may
    // still not list it, so the answer has to come from `local` alone.
    expect(nextFreeVersion('0.1.275', new Set())).toBe('0.1.276');
    expect(nextFreeVersion('0.1.276', new Set())).toBe('0.1.277');
  });

  it('ignores versions that are not plain releases', () => {
    const taken = takenVersions({ versions: ['1.0.0', '1.1.0-beta.1'] });
    expect(nextFreeVersion('1.0.0', taken)).toBe('1.0.1');
  });
});

describe('fetchPackument', () => {
  it('asks npm for both the version list and the release timeline', () => {
    const run = vi.fn(() => '{"versions":["1.0.0"],"time":{"1.0.0":"a"}}');

    expect(fetchPackument('search-web-api', run)).toEqual({
      versions: ['1.0.0'],
      time: { '1.0.0': 'a' },
    });
    expect(run).toHaveBeenCalledWith('npm', [
      'view',
      'search-web-api',
      'versions',
      'time',
      '--json',
    ]);
  });

  it('treats an unpublished package or an unreachable registry as "nothing known"', () => {
    const throwing = vi.fn(() => {
      throw new Error('E404');
    });

    expect(fetchPackument('brand-new-package', throwing)).toEqual({});
    expect(fetchPackument('brand-new-package', () => '')).toEqual({});
    expect(fetchPackument('brand-new-package', () => 'not json')).toEqual({});
  });
});
