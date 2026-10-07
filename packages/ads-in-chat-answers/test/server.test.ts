import { describe, expect, it, vi } from 'vitest';
import { createOpenAICompatibleComplete, handleAdsRequest, parseBrief } from '../src/server';
import { campaign } from './fixtures';

const post = (path: string, body: unknown) =>
  new Request(`https://ads.test/api/ads/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('parseBrief', () => {
  it('validates and caps fields', () => {
    expect(parseBrief(null)).toMatch(/JSON object/);
    expect(parseBrief({ advertiser: 'x', description: 'short' })).toMatch(/description/);
    const brief = parseBrief({ advertiser: ' A ', description: 'd'.repeat(5000), products: ['p', 3, ''] });
    expect(typeof brief).toBe('object');
    if (typeof brief === 'object') {
      expect(brief.advertiser).toBe('A');
      expect(brief.description).toHaveLength(2000);
      expect(brief.products).toEqual(['p']);
    }
  });
});

describe('handleAdsRequest', () => {
  it('answers a CORS preflight with an empty 204', async () => {
    const res = await handleAdsRequest(new Request('https://ads.test/keywords', { method: 'OPTIONS' }));
    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
  });

  it('rejects GET and bad JSON', async () => {
    expect((await handleAdsRequest(new Request('https://ads.test/keywords'))).status).toBe(405);
    expect((await handleAdsRequest(post('keywords', '{nope'))).status).toBe(400);
  });

  it('returns a keyword plan', async () => {
    const res = await handleAdsRequest(
      post('keywords', { advertiser: 'Shop', description: 'Hiking boots and trail running shoes' }),
      { complete: async () => '{"keywords":["hiking boots"]}' }
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ source: 'llm', keywords: [{ keyword: 'hiking boots' }] });
  });

  it('auctions server-owned campaigns on /select', async () => {
    const res = await handleAdsRequest(post('select', { query: 'logo design' }), {
      getCampaigns: () => [campaign()],
    });
    const body = await res.json();
    expect(body.answer.campaign.id).toBe('books');
  });

  it('404s /select when the host owns no campaigns', async () => {
    expect((await handleAdsRequest(post('select', { query: 'x' }))).status).toBe(404);
  });
});

describe('createOpenAICompatibleComplete', () => {
  it('posts a chat completion and returns the text', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'hi' } }] }))
    ) as unknown as typeof fetch;
    const complete = createOpenAICompatibleComplete({ apiKey: 'k', baseUrl: 'https://llm.test/v1/', model: 'm', fetchImpl });
    expect(await complete({ system: 's', user: 'u' })).toBe('hi');
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://llm.test/v1/chat/completions');
    expect(JSON.parse(init.body).messages).toHaveLength(2);
    expect(init.headers.authorization).toBe('Bearer k');
  });

  it('throws on an HTTP error', async () => {
    const fetchImpl = (async () => new Response('no', { status: 401 })) as unknown as typeof fetch;
    await expect(createOpenAICompatibleComplete({ apiKey: 'k', fetchImpl })({ system: '', user: '' })).rejects.toThrow('401');
  });
});
