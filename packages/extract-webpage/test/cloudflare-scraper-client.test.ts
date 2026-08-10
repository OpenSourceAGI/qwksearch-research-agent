/**
 * @fileoverview Unit tests for the Cloudflare Puppeteer scraper client.
 * `fetch` is stubbed throughout — these assert URL/header construction and
 * response shaping, never real network access.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  renderUrlToHtml,
  renderUrlWithMetadata,
  renderWithCloudflare,
} from '../src/url-to-content/cloudflare-scraper-client';

function stubFetch(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const fetchMock = vi.fn(async () => ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    json: async () => body,
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const requestUrl = (fetchMock: ReturnType<typeof stubFetch>) =>
  new URL(fetchMock.mock.calls[0][0] as unknown as string);

const requestInit = (fetchMock: ReturnType<typeof stubFetch>) =>
  fetchMock.mock.calls[0][1] as unknown as RequestInit;

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('renderWithCloudflare', () => {
  it('returns the rendered HTML by default', async () => {
    stubFetch('<html>ok</html>');

    await expect(renderWithCloudflare({ url: 'https://example.com' })).resolves.toBe(
      '<html>ok</html>'
    );
  });

  it('targets the /api/render endpoint on the default host', async () => {
    const fetchMock = stubFetch('<html></html>');

    await renderWithCloudflare({ url: 'https://example.com' });

    const url = requestUrl(fetchMock);
    expect(url.host).toBe('proxy.qwksearch.com');
    expect(url.pathname).toBe('/api/render');
    expect(url.searchParams.get('url')).toBe('https://example.com');
  });

  it('honours a custom base URL', async () => {
    const fetchMock = stubFetch('<html></html>');

    await renderWithCloudflare(
      { url: 'https://example.com' },
      { baseURL: 'https://scraper.internal' }
    );

    expect(requestUrl(fetchMock).host).toBe('scraper.internal');
  });

  it('applies the documented defaults', async () => {
    const fetchMock = stubFetch('<html></html>');

    await renderWithCloudflare({ url: 'https://example.com' });

    const params = requestUrl(fetchMock).searchParams;
    expect(params.get('wait')).toBe('0');
    expect(params.get('blockImages')).toBe('false');
    expect(params.get('sessionId')).toBe('default');
    expect(params.get('timeout')).toBe('30000');
    expect(params.get('waitUntil')).toBe('networkidle2');
    expect(params.get('format')).toBe('html');
    expect(params.get('bypassCaptcha')).toBe('true');
    expect(params.get('maxRetries')).toBe('10');
  });

  it('forwards every explicit option', async () => {
    const fetchMock = stubFetch('<html></html>');

    await renderWithCloudflare({
      url: 'https://example.com',
      wait: 500,
      blockImages: true,
      sessionId: 's1',
      timeout: 5000,
      waitUntil: 'load',
      proxyUrl: 'http://p.test',
      proxyUser: 'u',
      proxyPass: 'p',
      bypassCaptcha: false,
      challengeMatch: 'Just a moment',
      maxRetries: 2,
      twoCaptchaKey: 'k',
    } as any);

    const params = requestUrl(fetchMock).searchParams;
    expect(params.get('wait')).toBe('500');
    expect(params.get('blockImages')).toBe('true');
    expect(params.get('sessionId')).toBe('s1');
    expect(params.get('waitUntil')).toBe('load');
    expect(params.get('proxyUser')).toBe('u');
    expect(params.get('bypassCaptcha')).toBe('false');
    expect(params.get('challengeMatch')).toBe('Just a moment');
    expect(params.get('maxRetries')).toBe('2');
    expect(params.get('twoCaptchaKey')).toBe('k');
  });

  it('omits parameters that were not supplied', async () => {
    const fetchMock = stubFetch('<html></html>');

    await renderWithCloudflare({ url: 'https://example.com' });

    const params = requestUrl(fetchMock).searchParams;
    expect(params.has('proxyUrl')).toBe(false);
    expect(params.has('challengeMatch')).toBe(false);
    expect(params.has('twoCaptchaKey')).toBe(false);
  });

  it('sends a Bearer token from the per-call option', async () => {
    const fetchMock = stubFetch('<html></html>');

    await renderWithCloudflare({ url: 'https://example.com', apiKey: 'call-key' } as any);

    expect((requestInit(fetchMock).headers as Record<string, string>).Authorization).toBe(
      'Bearer call-key'
    );
  });

  it('falls back to the config API key', async () => {
    const fetchMock = stubFetch('<html></html>');

    await renderWithCloudflare({ url: 'https://example.com' }, { apiKey: 'config-key' });

    expect((requestInit(fetchMock).headers as Record<string, string>).Authorization).toBe(
      'Bearer config-key'
    );
  });

  it('sends no Authorization header when no key is configured', async () => {
    const fetchMock = stubFetch('<html></html>');

    await renderWithCloudflare({ url: 'https://example.com' });

    expect(requestInit(fetchMock).headers).not.toHaveProperty('Authorization');
  });

  it('merges caller-supplied headers', async () => {
    const fetchMock = stubFetch('<html></html>');

    await renderWithCloudflare({
      url: 'https://example.com',
      headers: { 'X-Test': '1' },
    } as any);

    expect((requestInit(fetchMock).headers as Record<string, string>)['X-Test']).toBe('1');
  });

  it('forwards an abort signal', async () => {
    const fetchMock = stubFetch('<html></html>');
    const controller = new AbortController();

    await renderWithCloudflare({ url: 'https://example.com', signal: controller.signal } as any);

    expect(requestInit(fetchMock).signal).toBe(controller.signal);
  });

  it('parses the JSON response when format is json', async () => {
    stubFetch({ html: '<html>ok</html>', challenge: false });

    await expect(
      renderWithCloudflare({ url: 'https://example.com', format: 'json' } as any)
    ).resolves.toEqual({ html: '<html>ok</html>', challenge: false });
  });

  it('throws with the status and body on a failure response', async () => {
    stubFetch('upstream exploded', { ok: false, status: 502 });

    await expect(renderWithCloudflare({ url: 'https://example.com' })).rejects.toThrow(
      'Scraper request failed (502): upstream exploded'
    );
  });
});

describe('renderUrlToHtml', () => {
  it('requests the html format and returns the string', async () => {
    const fetchMock = stubFetch('<html>ok</html>');

    await expect(renderUrlToHtml('https://example.com')).resolves.toBe('<html>ok</html>');
    expect(requestUrl(fetchMock).searchParams.get('format')).toBe('html');
  });

  it('returns the raw body even when the service answers with JSON', async () => {
    // The helper forces `format: 'html'`, so the client always reads
    // `response.text()`; its `result.html` unwrap branch is unreachable.
    stubFetch({ html: '<html>from json</html>' });

    await expect(renderUrlToHtml('https://example.com')).resolves.toBe(
      '{"html":"<html>from json</html>"}'
    );
  });

  it('overrides a caller-supplied format', async () => {
    const fetchMock = stubFetch('<html></html>');

    await renderUrlToHtml('https://example.com', { format: 'json' } as any);

    expect(requestUrl(fetchMock).searchParams.get('format')).toBe('html');
  });

  it('passes through extra options', async () => {
    const fetchMock = stubFetch('<html></html>');

    await renderUrlToHtml('https://example.com', { sessionId: 's2' } as any);

    expect(requestUrl(fetchMock).searchParams.get('sessionId')).toBe('s2');
  });
});

describe('renderUrlWithMetadata', () => {
  it('requests the json format and returns the full payload', async () => {
    const fetchMock = stubFetch({ html: '<html>ok</html>', loadTimeMs: 42 });

    await expect(renderUrlWithMetadata('https://example.com')).resolves.toMatchObject({
      loadTimeMs: 42,
    });
    expect(requestUrl(fetchMock).searchParams.get('format')).toBe('json');
  });

  it('passes through extra options and config', async () => {
    const fetchMock = stubFetch({ html: '' });

    await renderUrlWithMetadata(
      'https://example.com',
      { blockImages: true } as any,
      { baseURL: 'https://scraper.internal' }
    );

    const url = requestUrl(fetchMock);
    expect(url.host).toBe('scraper.internal');
    expect(url.searchParams.get('blockImages')).toBe('true');
  });
});
