/**
 * @fileoverview Unit tests for the base-URL resolution used to point the
 * generated client at the right deployment. `baseUrl` is computed once at
 * module load, so each case re-imports the module with the environment it needs.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

async function importBaseUrl() {
  vi.resetModules();
  return import('../baseurl');
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('baseUrl on the server', () => {
  it('falls back to the public deployment', async () => {
    const { baseUrl } = await importBaseUrl();

    expect(baseUrl).toBe('https://qwksearch.com/api');
  });

  it('honours NEXT_PUBLIC_BASE_URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://self-hosted.test');

    const { baseUrl } = await importBaseUrl();

    expect(baseUrl).toBe('https://self-hosted.test/api');
  });
});

describe('baseUrl in the browser', () => {
  it('uses the current origin', async () => {
    vi.stubGlobal('window', {
      location: { protocol: 'https:', host: 'app.example.com' },
    });

    const { baseUrl } = await importBaseUrl();

    expect(baseUrl).toBe('https://app.example.com/api');
  });

  it('prefers a window-injected NEXT_PUBLIC_BASE_URL', async () => {
    vi.stubGlobal('window', {
      NEXT_PUBLIC_BASE_URL: 'https://injected.test',
      location: { protocol: 'https:', host: 'app.example.com' },
    });

    const { baseUrl } = await importBaseUrl();

    expect(baseUrl).toBe('https://injected.test/api');
  });

  it('keeps a non-https protocol for local development', async () => {
    vi.stubGlobal('window', {
      location: { protocol: 'http:', host: 'localhost:3000' },
    });

    const { baseUrl } = await importBaseUrl();

    expect(baseUrl).toBe('http://localhost:3000/api');
  });
});

describe('createClientConfig', () => {
  it('sets the resolved base URL on the config it is handed', async () => {
    const { createClientConfig, baseUrl } = await importBaseUrl();

    expect(createClientConfig({} as any)).toEqual({ baseUrl });
  });

  it('preserves the other config fields it was handed', async () => {
    const { createClientConfig, baseUrl } = await importBaseUrl();

    const config = createClientConfig({ headers: { 'X-Test': '1' } } as any);

    expect(config).toEqual({ headers: { 'X-Test': '1' }, baseUrl });
  });

  it('overrides a caller-supplied base URL', async () => {
    const { createClientConfig, baseUrl } = await importBaseUrl();

    expect(createClientConfig({ baseUrl: 'https://ignored.test' } as any).baseUrl).toBe(baseUrl);
  });
});
