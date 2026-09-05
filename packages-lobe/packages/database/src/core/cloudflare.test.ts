import { afterEach, describe, expect, it } from 'vitest';

import { getCfEnv } from './cloudflare';
import { resolveHyperdriveConnectionString } from './web-server';

const slot = globalThis as { __LOBE_CF_ENV__?: unknown };

describe('Cloudflare bindings bridge', () => {
  afterEach(() => {
    delete slot.__LOBE_CF_ENV__;
  });

  it('reports no bindings outside a Worker', () => {
    expect(getCfEnv()).toBeUndefined();
    expect(resolveHyperdriveConnectionString()).toBeUndefined();
  });

  it('prefers the Hyperdrive connection string when bound', () => {
    slot.__LOBE_CF_ENV__ = { HYPERDRIVE: { connectionString: 'postgres://hyperdrive/db' } };
    expect(resolveHyperdriveConnectionString()).toBe('postgres://hyperdrive/db');
  });
});
