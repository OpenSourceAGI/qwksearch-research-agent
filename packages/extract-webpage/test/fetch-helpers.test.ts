/**
 * @fileoverview Unit tests for the small fetch-shaped helpers: the `grab`
 * wrapper, the link-to-Document loader and the YouTube transcript adapter.
 * All network access is stubbed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const axiosGet = vi.fn();
vi.mock('axios', () => ({ default: { get: (...args: unknown[]) => axiosGet(...args) } }));

// `chat-agent-toolkit` is a workspace sibling that resolves through its build
// output; stub its one used export so this suite runs without building it.
vi.mock('chat-agent-toolkit', () => ({
  splitTextIntoChunks: (text: string) =>
    text.match(/.{1,200}(\s|$)/g)?.map((chunk) => chunk.trim()) ?? [text],
}));

const transcriptFetch = vi.fn();
vi.mock('extract-youtube', () => ({
  YouTubeTranscriptApi: class {
    fetch = transcriptFetch;
  },
}));

const grab = (await import('../src/utils/grab')).default;
const { getDocumentsFromLinks } = await import('../src/utils/documents');
const { convertYoutubeToText, getURLYoutubeVideo } = await import(
  '../src/url-to-content/youtube-helpers'
);

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  axiosGet.mockReset();
  transcriptFetch.mockReset();
});

describe('grab', () => {
  it('returns the response body as text by default', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, text: async () => 'body' }))
    );

    await expect(grab('https://example.com')).resolves.toBe('body');
  });

  it('returns an ArrayBuffer when asked', async () => {
    const buffer = new ArrayBuffer(4);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, arrayBuffer: async () => buffer }))
    );

    await expect(grab('https://example.com', { responseType: 'arraybuffer' })).resolves.toBe(
      buffer
    );
  });

  it('forwards method, headers and body', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, text: async () => '' }));
    vi.stubGlobal('fetch', fetchMock);

    await grab('https://example.com', {
      method: 'POST',
      headers: { 'X-Test': '1' },
      body: 'payload',
    });

    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      headers: { 'X-Test': '1' },
      body: 'payload',
    });
  });

  it('throws on a non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404, text: async () => '' }))
    );

    await expect(grab('https://example.com')).rejects.toThrow('HTTP 404');
  });

  it('propagates a network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      })
    );

    await expect(grab('https://example.com')).rejects.toThrow('offline');
  });

  it('passes an abort signal so the request can time out', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, text: async () => '' }));
    vi.stubGlobal('fetch', fetchMock);

    await grab('https://example.com', { timeout: 1 });

    expect((fetchMock.mock.calls[0][1] as any).signal).toBeInstanceOf(AbortSignal);
  });
});

describe('getDocumentsFromLinks', () => {
  it('splits fetched pages into documents with the page title', async () => {
    axiosGet.mockResolvedValue({
      data: Buffer.from('<html><head><title>My Page</title></head><body><p>Hello world</p></body></html>'),
    });

    const docs = await getDocumentsFromLinks({ links: ['https://example.com'] });

    expect(docs.length).toBeGreaterThan(0);
    expect(docs[0].metadata.title).toBe('My Page');
    expect(docs[0].metadata.url).toBe('https://example.com');
    expect(docs[0].pageContent).toContain('Hello world');
  });

  it('prefixes a bare domain with https', async () => {
    axiosGet.mockResolvedValue({ data: Buffer.from('<p>text</p>') });

    const docs = await getDocumentsFromLinks({ links: ['example.com'] });

    expect(axiosGet.mock.calls[0][0]).toBe('https://example.com');
    expect(docs[0].metadata.url).toBe('https://example.com');
  });

  it('strips scripts, styles and entities', async () => {
    axiosGet.mockResolvedValue({
      data: Buffer.from(
        '<style>.a{}</style><script>evil()</script><p>Tom &amp; Jerry &nbsp;&quot;quoted&quot;</p>'
      ),
    });

    const docs = await getDocumentsFromLinks({ links: ['https://example.com'] });
    const text = docs.map((doc) => doc.pageContent).join(' ');

    expect(text).toContain('Tom & Jerry');
    expect(text).toContain('"quoted"');
    expect(text).not.toContain('evil()');
    expect(text).not.toContain('.a{}');
  });

  it('falls back to the link when the page has no title', async () => {
    axiosGet.mockResolvedValue({ data: Buffer.from('<p>no title here</p>') });

    const docs = await getDocumentsFromLinks({ links: ['https://example.com'] });

    expect(docs[0].metadata.title).toBe('https://example.com');
  });

  it('records a failure document when a fetch throws', async () => {
    axiosGet.mockRejectedValue(new Error('boom'));

    const docs = await getDocumentsFromLinks({ links: ['https://example.com'] });

    expect(docs).toHaveLength(1);
    expect(docs[0].metadata.title).toBe('Failed to retrieve content');
    expect(docs[0].pageContent).toContain('boom');
  });

  it('returns an empty list for no links', async () => {
    await expect(getDocumentsFromLinks({ links: [] })).resolves.toEqual([]);
  });
});

describe('getURLYoutubeVideo', () => {
  it('reads the id from a watch URL', () => {
    expect(getURLYoutubeVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('reads the id from a short URL', () => {
    expect(getURLYoutubeVideo('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('reads the id from an embed URL', () => {
    expect(getURLYoutubeVideo('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for a non-YouTube URL', () => {
    expect(getURLYoutubeVideo('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });

  it('returns null for empty or non-string input', () => {
    expect(getURLYoutubeVideo('')).toBeNull();
    expect(getURLYoutubeVideo(null as any)).toBeNull();
    expect(getURLYoutubeVideo(42 as any)).toBeNull();
  });
});

describe('convertYoutubeToText', () => {
  it('rejects a non-YouTube URL', async () => {
    await expect(convertYoutubeToText('https://example.com')).resolves.toEqual({
      error: 'Not a valid YouTube URL',
    });
  });

  it('joins transcript snippets into an HTML paragraph', async () => {
    transcriptFetch.mockResolvedValue({
      snippets: [{ text: 'Hello' }, { text: 'world  ' }],
    });

    const result = await convertYoutubeToText('https://youtu.be/dQw4w9WgXcQ');

    expect(result.html).toBe('<p>Hello world</p>');
    expect(result.title).toBe('YouTube Video dQw4w9WgXcQ');
    expect(result.source).toBe('YouTube');
  });

  it('defaults to English and honours a language override', async () => {
    transcriptFetch.mockResolvedValue({ snippets: [{ text: 'hi' }] });

    await convertYoutubeToText('https://youtu.be/dQw4w9WgXcQ');
    expect(transcriptFetch.mock.calls[0][1]).toEqual({ languages: ['en'] });

    await convertYoutubeToText('https://youtu.be/dQw4w9WgXcQ', { languages: ['fr'] });
    expect(transcriptFetch.mock.calls[1][1]).toEqual({ languages: ['fr'] });
  });

  it('reports an empty transcript', async () => {
    transcriptFetch.mockResolvedValue({ snippets: [] });

    await expect(convertYoutubeToText('https://youtu.be/dQw4w9WgXcQ')).resolves.toEqual({
      error: 'No transcript available for this video',
    });
  });

  it('surfaces the transcript API error message', async () => {
    transcriptFetch.mockRejectedValue(new Error('transcripts disabled'));

    await expect(convertYoutubeToText('https://youtu.be/dQw4w9WgXcQ')).resolves.toEqual({
      error: 'transcripts disabled',
    });
  });

  it('falls back to a generic message for a message-less error', async () => {
    transcriptFetch.mockRejectedValue({});

    await expect(convertYoutubeToText('https://youtu.be/dQw4w9WgXcQ')).resolves.toEqual({
      error: 'Failed to fetch YouTube transcript',
    });
  });
});
