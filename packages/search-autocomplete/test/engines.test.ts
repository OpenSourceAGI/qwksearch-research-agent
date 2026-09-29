import { describe, expect, it, vi } from 'vitest';
import { ENGINES, ENGINE_NAMES, htmlToText, isEngineName } from '../src/engines';

function fetchReturning(body: string, status = 200) {
  return vi.fn(async (_url: string, _init?: RequestInit) => new Response(body, { status }));
}

describe('engine adapters', () => {
  it('parses the OpenSearch shape (duckduckgo, wikipedia, brave, bing, startpage, yandex)', async () => {
    for (const name of ['duckduckgo', 'wikipedia', 'brave', 'bing', 'startpage', 'yandex'] as const) {
      const fetch = fetchReturning(JSON.stringify(['tes', ['tesla', 'test']]));
      await expect(ENGINES[name]('tes', { fetch })).resolves.toEqual(['tesla', 'test']);
      expect(fetch).toHaveBeenCalledOnce();
    }
  });

  it('strips markup and entities from google gws-wiz fragments', async () => {
    const body = `)]}'\n[[["tesla <b>stock</b>",0],["rock &amp; roll",0],["it&#39;s",0]],{"q":"x"}]`;
    const fetch = fetchReturning(body);
    await expect(ENGINES.google('tes', { fetch })).resolves.toEqual(['tesla stock', 'rock & roll', "it's"]);
    expect(String(fetch.mock.calls[0][0])).toContain('google.com/complete/search');
  });

  it('maps a locale to the regional google domain', async () => {
    const fetch = fetchReturning('[[]]');
    await ENGINES.google('x', { fetch, locale: 'de-DE' });
    expect(String(fetch.mock.calls[0][0])).toContain('https://google.de/');
  });

  it('parses baidu and qwant', async () => {
    await expect(
      ENGINES.baidu('a', { fetch: fetchReturning(JSON.stringify({ g: [{ q: 'apple' }] })) }),
    ).resolves.toEqual(['apple']);
    await expect(
      ENGINES.qwant('a', {
        fetch: fetchReturning(JSON.stringify({ status: 'success', data: { items: [{ value: 'amazon' }] } })),
      }),
    ).resolves.toEqual(['amazon']);
  });

  it('sends DuckDuckGo its reversed region code', async () => {
    const fetch = fetchReturning('[]');
    await ENGINES.duckduckgo('x', { fetch, locale: 'en-US' });
    expect(String(fetch.mock.calls[0][0])).toContain('kl=us-en');
  });

  it('throws on an HTTP error instead of reporting no suggestions', async () => {
    await expect(ENGINES.wikipedia('x', { fetch: fetchReturning('nope', 403) })).rejects.toThrow('HTTP 403');
  });

  it('aborts a request that outlives its timeout', async () => {
    const fetch = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_, reject) =>
          init?.signal?.addEventListener('abort', () => reject(init.signal!.reason)),
        ),
    );
    await expect(ENGINES.bing('x', { fetch, timeoutMs: 10 })).rejects.toThrow('Timed out');
  });

  it('knows its own engine names', () => {
    expect(ENGINE_NAMES).toContain('google');
    expect(isEngineName('google')).toBe(true);
    expect(isEngineName('toString')).toBe(false);
  });

  it('decodes numeric and hex entities', () => {
    expect(htmlToText('<i>caf&#233;</i> &#x263A;')).toBe('café ☺');
  });
});
