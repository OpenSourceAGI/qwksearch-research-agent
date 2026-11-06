/**
 * @fileoverview The default HTTP client, end to end through
 * `YouTubeTranscriptApi` with a stubbed global `fetch`. Nothing hits the
 * network.
 *
 * Regression: the client once wrapped grab-url, which resolves to the parsed
 * body rather than a `Response`. `status` was then undefined, so
 * `handleHttpErrors` threw `YouTubeRequestFailed` on every call and no
 * transcript loaded anywhere (the extract.js.org demo included), with an
 * error message whose cause was blank.
 */

import { YouTubeTranscriptApi } from '../src';
import { YouTubeRequestFailed, VideoUnplayable } from '../src/errors';
import { FetchHttpClient } from '../src/http/fetch-http-client';

const VIDEO_ID = 'aircAruvnKk';

const WATCH_HTML = '<html><script>ytcfg.set({"INNERTUBE_API_KEY": "AIzaSy-Test_Key-123"});</script></html>';

const PLAYER_JSON = {
  playabilityStatus: { status: 'OK' },
  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: [
        {
          baseUrl: 'https://www.youtube.com/api/timedtext?v=aircAruvnKk&lang=en&fmt=srv3',
          name: { runs: [{ text: 'English' }] },
          languageCode: 'en',
          isTranslatable: false,
        },
      ],
      translationLanguages: [],
    },
  },
};

const TRANSCRIPT_XML =
  '<?xml version="1.0" encoding="utf-8" ?><transcript>' +
  '<text start="0.5" dur="2.1">This is a 3.</text>' +
  '<text start="2.6" dur="1.9">It&amp;#39;s sloppily written</text>' +
  '</transcript>';

describe('FetchHttpClient', () => {
  const realFetch = globalThis.fetch;
  let calls: Array<{ url: string; init?: RequestInit }>;

  beforeEach(() => {
    calls = [];
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  function stubFetch(handler: (url: string, init?: RequestInit) => Response) {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      return handler(url, init);
    }) as typeof fetch;
  }

  it('returns the platform Response, so status, ok and text() are real', async () => {
    stubFetch(() => new Response('hello', { status: 200 }));
    const response = await new FetchHttpClient().get('https://example.test/');
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
    expect(await response.text()).toBe('hello');
  });

  it('sends Accept-Language and the method on every request', async () => {
    stubFetch(() => new Response('{}', { status: 200 }));
    const client = new FetchHttpClient();
    await client.post('https://example.test/', { headers: { 'Content-Type': 'application/json' }, body: '{}' });
    expect(calls[0].init?.method).toBe('POST');
    expect(calls[0].init?.headers).toMatchObject({ 'Accept-Language': 'en-US', 'Content-Type': 'application/json' });
  });

  it('lets YouTubeTranscriptApi fetch a transcript through the default client', async () => {
    stubFetch((url) => {
      if (url.startsWith('https://www.youtube.com/watch')) return new Response(WATCH_HTML, { status: 200 });
      if (url.startsWith('https://www.youtube.com/youtubei/v1/player')) {
        return new Response(JSON.stringify(PLAYER_JSON), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url.startsWith('https://www.youtube.com/api/timedtext')) return new Response(TRANSCRIPT_XML, { status: 200 });
      return new Response('not found', { status: 404 });
    });

    const result = await new YouTubeTranscriptApi().fetchTranscript(VIDEO_ID, { languages: ['en'] });
    const snippets = result.toRawData();

    expect(snippets).toHaveLength(2);
    expect(snippets[0]).toMatchObject({ text: 'This is a 3.', start: 0.5, duration: 2.1 });
    // The innertube call carries the key scraped from the watch page, and the
    // caption URL is requested without `&fmt=srv3`.
    expect(calls[1].url).toContain('key=AIzaSy-Test_Key-123');
    expect(calls[2].url).not.toContain('fmt=srv3');
  });

  it('reports an HTTP failure with its status in the message', async () => {
    stubFetch(() => new Response('nope', { status: 500, statusText: 'Internal Server Error' }));
    const error = await new YouTubeTranscriptApi().fetchTranscript(VIDEO_ID).catch((e) => e);
    expect(error).toBeInstanceOf(YouTubeRequestFailed);
    expect(error.message).toContain('Request to YouTube failed: HTTP 500: Internal Server Error');
  });
});

describe('error messages name their cause', () => {
  it('YouTubeRequestFailed', () => {
    const error = new YouTubeRequestFailed(VIDEO_ID, new Error('HTTP 403: Forbidden'));
    expect(error.message).toContain('This is most likely caused by');
    expect(error.message).toContain('HTTP 403: Forbidden');
  });

  it('VideoUnplayable', () => {
    const error = new VideoUnplayable(VIDEO_ID, 'Private video', []);
    expect(error.message).toContain('The video is unplayable for the following reason: Private video');
  });
});

describe('bot check from a cloud IP', () => {
  it.each([
    "Sign in to confirm you're not a bot",
    "Sign in to confirm you're not a bot.",
    'Sign in to confirm you’re not a bot.',
  ])('reports %j as RequestBlocked', (reason) => {
    const { validatePlayabilityStatus } = require('../src/fetchers/youtube-data-extractor');
    const { RequestBlocked } = require('../src/errors');
    let thrown: unknown;
    try {
      validatePlayabilityStatus({ status: 'LOGIN_REQUIRED', reason }, VIDEO_ID);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(RequestBlocked);
    expect((thrown as Error).message).toContain('YouTube is blocking requests from your IP');
  });
});
