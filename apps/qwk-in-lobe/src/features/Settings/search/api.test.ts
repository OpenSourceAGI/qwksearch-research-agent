import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchSearchSettings,
  resetSearchSettings,
  saveSearchSettings,
  SearchSettingsApiError,
} from './api';

const ENDPOINT = '/api/doc/search-settings';

const document = {
  effective: {
    categories: ['general'],
    configured: { apiKey: false, endpoint: true },
    language: 'en-US',
    maxCategories: 3,
    publicInstances: false,
    resultLimit: null,
    safeSearch: false,
    timeRange: null,
  },
  options: {
    categories: [
      'files',
      'general',
      'images',
      'it',
      'map',
      'music',
      'news',
      'science',
      'social+media',
      'videos',
    ],
    maxMaxCategories: 10,
    maxResultLimit: 200,
    minMaxCategories: 1,
    minResultLimit: 1,
    timeRanges: ['day', 'month', 'week', 'year'],
  },
  overrides: { categories: ['news'] },
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

describe('fetchSearchSettings', () => {
  it('GETs the endpoint with the session cookie and returns the document', async () => {
    fetchMock.mockResolvedValue(ok());

    await expect(fetchSearchSettings()).resolves.toEqual(document);

    const { init, input } = lastCall();
    expect(input).toBe(ENDPOINT);
    expect(init.method).toBeUndefined();
    // The route requires sign-in, and the SPA is same-origin but fetch does not
    // send cookies by default on every configuration.
    expect(init.credentials).toBe('include');
  });

  it('carries the field metadata the form builds its inputs from', async () => {
    fetchMock.mockResolvedValue(ok());

    const { options } = await fetchSearchSettings();

    // A category added on the server reaches the pane without a UI edit — the
    // whole reason the route ships `options`.
    expect(options.categories).toContain('social+media');
    expect(options.minMaxCategories).toBe(1);
  });
});

describe('saveSearchSettings', () => {
  it('PUTs the overrides as JSON', async () => {
    fetchMock.mockResolvedValue(ok());

    await saveSearchSettings({ categories: ['news'], maxCategories: 2 });

    const { init } = lastCall();
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ categories: ['news'], maxCategories: 2 });
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it("returns the server's echo rather than the sent body", async () => {
    // `PUT` validates and trims; the response is the authority on what was kept.
    fetchMock.mockResolvedValue(ok({ ...document, overrides: { categories: ['news'] } }));

    const result = await saveSearchSettings({
      categories: ['news', 'not-a-category' as never],
      language: 'nonsense tag the server drops',
    });

    expect(result.overrides).toEqual({ categories: ['news'] });
  });
});

describe('resetSearchSettings', () => {
  it('DELETEs and carries no body', async () => {
    fetchMock.mockResolvedValue(ok({ ...document, overrides: {} }));

    await expect(resetSearchSettings()).resolves.toMatchObject({ overrides: {} });

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

    await expect(fetchSearchSettings()).rejects.toMatchObject({
      message: 'Unauthorized',
      name: 'SearchSettingsApiError',
      status: 401,
    });
  });

  it('prefers `error` over `message` and falls back to the status text', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Nope', message: 'Ignored' }), { status: 400 }),
    );
    await expect(saveSearchSettings({})).rejects.toThrow('Nope');

    fetchMock.mockResolvedValue(new Response('', { status: 500, statusText: 'Boom' }));
    await expect(saveSearchSettings({})).rejects.toThrow('Boom');
  });

  it('survives an error body that is not JSON at all', async () => {
    fetchMock.mockResolvedValue(new Response('<html>502</html>', { status: 502 }));

    const error = await fetchSearchSettings().catch((e) => e);
    expect(error).toBeInstanceOf(SearchSettingsApiError);
    expect(error.status).toBe(502);
  });
});
