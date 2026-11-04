import { describe, expect, it, vi } from 'vitest';
import {
  extractPreviewImage,
  fetchPreviewImage,
  getHckrNewsHeadlines,
  handleTrendingNewsRequest,
  parseHckrNewsHtml,
} from '../src/server';
import { getTrendingNews } from '../src/api/trending';

const PAGE = `
<html><body>
<ul class="entries">
  <li class="entry row day" id="50348260">
    <a href="https://news.ycombinator.com/item?id=50348260" class="hn"><span class="comments span1">0</span><span class="points span1">9</span></a>
    <a href="https://www.cloudflarestatus.com/" class="link">Cloudflare experiencing multiple active incidents <span class="source">(www.cloudflarestatus.com)</span></a>
  </li>
  <li class="entry row day" id="50326246">
    <a href="https://news.ycombinator.com/item?id=50326246"><span>2</span> <span>31</span></a>
    <a href="https://lowendspirit.com/discussion/11543/nixos">Shrinking NixOS RAM footprint &amp; resources (lowendspirit.com)</a>
  </li>
  <li class="entry row day" id="50300000">
    <a href="https://news.ycombinator.com/item?id=50300000"><span>12</span> <span>140</span></a>
    <a href="https://news.ycombinator.com/item?id=50300000">Ask HN: What are you working on?</a>
  </li>
</ul>
<a href="about.html">about</a>
</body></html>`;

function htmlResponse(body: string, type = 'text/html; charset=utf-8') {
  return new Response(body, { status: 200, headers: { 'content-type': type } });
}

/** A fetch serving hckrnews.com and one article page per story. */
function mockFetch(articles: Record<string, Response | (() => Response)> = {}) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === 'https://hckrnews.com/') return htmlResponse(PAGE);
    const answer = articles[url];
    if (answer) return typeof answer === 'function' ? answer() : answer;
    return new Response('not found', { status: 404 });
  }) as unknown as typeof fetch;
}

describe('parseHckrNewsHtml', () => {
  it('pairs each discussion link with the headline after it', () => {
    const stories = parseHckrNewsHtml(PAGE);
    expect(stories).toHaveLength(3);
    expect(stories[0]).toEqual({
      id: '50348260',
      title: 'Cloudflare experiencing multiple active incidents',
      url: 'https://www.cloudflarestatus.com/',
      discussionUrl: 'https://news.ycombinator.com/item?id=50348260',
      domain: 'cloudflarestatus.com',
      points: 9,
      comments: 0,
    });
  });

  it('reads unclassed counts as comments then points and decodes the title', () => {
    const [, nixos] = parseHckrNewsHtml(PAGE);
    expect(nixos.title).toBe('Shrinking NixOS RAM footprint & resources');
    expect(nixos.comments).toBe(2);
    expect(nixos.points).toBe(31);
  });

  it('keeps self posts that link back to their own discussion', () => {
    const ask = parseHckrNewsHtml(PAGE)[2];
    expect(ask.title).toBe('Ask HN: What are you working on?');
    expect(ask.url).toBe('https://news.ycombinator.com/item?id=50300000');
    expect(ask.points).toBe(140);
  });

  it('returns nothing for a page with no stories', () => {
    expect(parseHckrNewsHtml('<html><a href="/x">x</a></html>')).toEqual([]);
  });
});

describe('extractPreviewImage', () => {
  it('prefers og:image and resolves it against the page', () => {
    const html = `<head><meta name="twitter:image" content="/t.png"><meta property="og:image" content="/og.png"></head>`;
    expect(extractPreviewImage(html, 'https://a.com/post/1')).toBe('https://a.com/og.png');
  });

  it('falls back to twitter:image, then image_src', () => {
    expect(extractPreviewImage(`<meta content="https://cdn/t.jpg" name="twitter:image">`, 'https://a.com/')).toBe(
      'https://cdn/t.jpg'
    );
    expect(extractPreviewImage(`<link rel="image_src" href="i.jpg">`, 'https://a.com/b/')).toBe('https://a.com/b/i.jpg');
  });

  it('ignores non-http images', () => {
    expect(extractPreviewImage(`<meta property="og:image" content="data:image/png;base64,xx">`, 'https://a.com/')).toBe(
      undefined
    );
  });
});

describe('fetchPreviewImage', () => {
  it('uses the link itself when it is an image', async () => {
    const fetchImpl = vi.fn(async () => htmlResponse('', 'image/png')) as unknown as typeof fetch;
    expect(await fetchPreviewImage('https://a.com/x.png', fetchImpl)).toBe('https://a.com/x.png');
  });

  it('never throws on a failed page', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('socket hang up');
    }) as unknown as typeof fetch;
    expect(await fetchPreviewImage('https://a.com/', fetchImpl)).toBeUndefined();
  });
});

describe('getHckrNewsHeadlines', () => {
  it('returns one topic per story with its prefetched image', async () => {
    const fetchImpl = mockFetch({
      'https://www.cloudflarestatus.com/': htmlResponse(
        '<head><meta property="og:image" content="https://cf.com/og.png"></head>'
      ),
    });
    const data = await getHckrNewsHeadlines({ fetchImpl });
    expect(data.source).toBe('hckrnews');
    expect(data.topics).toHaveLength(3);
    expect(data.topics[0]).toMatchObject({
      topic: 'cloudflarestatus.com',
      news_count: 1,
      articles: [
        {
          title: 'Cloudflare experiencing multiple active incidents',
          image_url: 'https://cf.com/og.png',
          points: 9,
          comments: 0,
          discussion_url: 'https://news.ycombinator.com/item?id=50348260',
        },
      ],
    });
    // The page with no image (404) and the self post just have none.
    expect(data.topics[1].articles[0].image_url).toBeUndefined();
    expect(data.topics[2].articles[0].image_url).toBeUndefined();
    // A self post's discussion page is never fetched for an image.
    const urls = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
    expect(urls).not.toContain('https://news.ycombinator.com/item?id=50300000');
  });

  it('honours the limit and can skip image lookups', async () => {
    const fetchImpl = mockFetch();
    const data = await getHckrNewsHeadlines({ fetchImpl, limit: 1, images: false });
    expect(data.topics).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('handleTrendingNewsRequest — source=hckrnews', () => {
  it('serves hckrnews without a News API key', async () => {
    const res = await handleTrendingNewsRequest(new Request('https://w.dev/?source=hckrnews&limit=2&images=0'), {
      apiKey: undefined,
      fetchImpl: mockFetch(),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { source: string; topics: unknown[] };
    expect(body.source).toBe('hckrnews');
    expect(body.topics).toHaveLength(2);
  });

  it('answers a JSON 502 when hckrnews.com is down', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 503 })) as unknown as typeof fetch;
    const res = await handleTrendingNewsRequest(new Request('https://w.dev/?source=hckrnews'), {
      apiKey: 'k',
      fetchImpl,
    });
    expect(res.status).toBe(502);
    expect(((await res.json()) as { error: string }).error).toMatch(/hckrnews/);
  });
});

describe('getTrendingNews — source: hckrnews', () => {
  it('asks for the hckrnews source and maps points and comments', async () => {
    const original = globalThis.fetch;
    const fetchSpy = vi.fn(async () =>
      new Response(
        JSON.stringify({
          source: 'hckrnews',
          date: '2026-11-04',
          topics: [
            {
              topic: 'a.com',
              news_count: 1,
              articles: [
                { title: 'A', url: 'https://a.com', image_url: 'https://a.com/i.png', points: 5, comments: 2, discussion_url: 'https://news.ycombinator.com/item?id=1' },
              ],
            },
          ],
        }),
        { status: 200 }
      )
    );
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    try {
      const data = await getTrendingNews({
        apiEndpoint: 'https://w.dev/',
        source: 'hckrnews',
        limit: 10,
        topics: ['ignored'],
      });
      const requested = new URL(String((fetchSpy.mock.calls[0] as unknown[])[0]));
      expect(requested.searchParams.get('source')).toBe('hckrnews');
      expect(requested.searchParams.get('limit')).toBe('10');
      expect(requested.searchParams.has('topics')).toBe(false);
      expect(data.topics[0].articles[0]).toMatchObject({
        points: 5,
        comments: 2,
        imageUrl: 'https://a.com/i.png',
        discussionUrl: 'https://news.ycombinator.com/item?id=1',
      });
    } finally {
      globalThis.fetch = original;
    }
  });
});
