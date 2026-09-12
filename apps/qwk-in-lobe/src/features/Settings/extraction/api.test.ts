import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ExtractionSettingsApiError,
  fetchExtractionSettings,
  resetExtractionSettings,
  saveExtractionSettings,
} from './api';

const ENDPOINT = '/api/doc/extraction-settings';

const document = {
  effective: {
    citationStyle: 'apa',
    configured: {
      pdfProcessorUrl: false,
      proxy: false,
      scraperApiKey: true,
      scraperUrl: true,
      tavilyApiKey: false,
    },
    languages: ['en'],
    pdfProcessor: 'frontend',
    tiers: ['qwksearch', 'scraper', 'tavily', 'crawler'],
    timeoutSeconds: 10,
    useThirdPartyBackup: false,
  },
  options: {
    citationStyles: ['apa', 'chicago', 'mla'],
    maxTimeoutSeconds: 60,
    minTimeoutSeconds: 1,
    pdfProcessors: ['docling', 'frontend', 'hybrid'],
    tiers: ['qwksearch', 'scraper', 'tavily', 'crawler'],
  },
  overrides: { citationStyle: 'mla' },
};

const ok = (body: unknown = document) =>
  new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const lastCall = () => {
  const [input, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return { init, input };
};

describe('fetchExtractionSettings', () => {
  it('GETs the endpoint with the session cookie and returns the document', async () => {
    fetchMock.mockResolvedValue(ok());

    await expect(fetchExtractionSettings()).resolves.toEqual(document);

    const { init, input } = lastCall();
    expect(input).toBe(ENDPOINT);
    expect(init.method).toBeUndefined();
    // The route requires sign-in, and the SPA is same-origin but fetch does not
    // send cookies by default on every configuration.
    expect(init.credentials).toBe('include');
  });
});

describe('saveExtractionSettings', () => {
  it('PUTs the overrides as JSON', async () => {
    fetchMock.mockResolvedValue(ok());

    await saveExtractionSettings({ citationStyle: 'mla', languages: ['fr'] });

    const { init } = lastCall();
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ citationStyle: 'mla', languages: ['fr'] });
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('returns the server\'s echo rather than the sent body', async () => {
    // `PUT` validates and trims; the response is the authority on what was kept.
    fetchMock.mockResolvedValue(ok({ ...document, overrides: { citationStyle: 'mla' } }));

    const result = await saveExtractionSettings({
      citationStyle: 'mla',
      languages: ['nonsense-tag-that-the-server-drops'],
    });

    expect(result.overrides).toEqual({ citationStyle: 'mla' });
  });
});

describe('resetExtractionSettings', () => {
  it('DELETEs and carries no body', async () => {
    fetchMock.mockResolvedValue(ok({ ...document, overrides: {} }));

    await expect(resetExtractionSettings()).resolves.toMatchObject({ overrides: {} });

    const { init } = lastCall();
    expect(init.method).toBe('DELETE');
    expect(init.body).toBeUndefined();
  });
});

describe('error handling', () => {
  it('raises the status on a 401 so the pane can say "sign in"', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 }),
    );

    await expect(fetchExtractionSettings()).rejects.toMatchObject({
      message: 'Unauthorized',
      name: 'ExtractionSettingsApiError',
      status: 401,
    });
  });

  it('prefers `error` over `message` and falls back to the status text', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Nope', message: 'Ignored' }), { status: 400 }),
    );
    await expect(saveExtractionSettings({})).rejects.toThrow('Nope');

    fetchMock.mockResolvedValue(new Response('', { status: 500, statusText: 'Boom' }));
    await expect(saveExtractionSettings({})).rejects.toThrow('Boom');
  });

  it('survives an error body that is not JSON at all', async () => {
    fetchMock.mockResolvedValue(new Response('<html>502</html>', { status: 502 }));

    const error = await fetchExtractionSettings().catch((e) => e);
    expect(error).toBeInstanceOf(ExtractionSettingsApiError);
    expect(error.status).toBe(502);
  });
});
