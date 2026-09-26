import { describe, expect, it, vi } from 'vitest';
import {
  activeIndexAt,
  extractInnertubeApiKey,
  fetchYouTubeTranscript,
  formatTimecode,
  getYouTubeVideoId,
  groupIntoSentences,
  parseTimedTextXml,
  pickCaptionTrack,
  transcriptToText,
  TranscriptUnavailableError,
  type CaptionTrack,
} from '../lib/youtube-transcript';
import { TranscriptPanel } from '../content/youtube-transcript-panel';

describe('getYouTubeVideoId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=x', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('reads %s', (url, id) => {
    expect(getYouTubeVideoId(url)).toBe(id);
  });

  it.each([
    'https://www.youtube.com/',
    'https://www.youtube.com/results?search_query=x',
    'https://www.youtube.com/watch?v=short',
    'https://example.com/watch?v=dQw4w9WgXcQ',
    'not a url',
  ])('returns null for %s', (url) => {
    expect(getYouTubeVideoId(url)).toBeNull();
  });
});

describe('extractInnertubeApiKey', () => {
  it('finds the key in page HTML', () => {
    expect(extractInnertubeApiKey('ytcfg.set({"INNERTUBE_API_KEY": "AIza_key-1"})')).toBe('AIza_key-1');
    expect(extractInnertubeApiKey('<html></html>')).toBeNull();
  });
});

describe('pickCaptionTrack', () => {
  const track = (languageCode: string, kind?: string): CaptionTrack => ({
    baseUrl: `u/${languageCode}/${kind ?? 'manual'}`,
    languageCode,
    kind,
  });

  it('prefers human captions in a preferred language', () => {
    const tracks = [track('en', 'asr'), track('fr'), track('en-US')];
    expect(pickCaptionTrack(tracks, ['en-GB'])?.baseUrl).toBe('u/en-US/manual');
  });

  it('falls back to generated captions in the language, then any manual track', () => {
    expect(pickCaptionTrack([track('de'), track('en', 'asr')], ['en'])?.baseUrl).toBe('u/en/asr');
    expect(pickCaptionTrack([track('es', 'asr'), track('de')], ['en'])?.baseUrl).toBe('u/de/manual');
    expect(pickCaptionTrack([], ['en'])).toBeNull();
  });
});

describe('parseTimedTextXml', () => {
  it('parses the classic format and decodes double-escaped entities', () => {
    const xml =
      '<?xml version="1.0"?><transcript>' +
      '<text start="0.5" dur="2.1">it&amp;#39;s   a\ntest</text>' +
      '<text start="2.6" dur="1">&amp;lt;b&amp;gt;bold&amp;lt;/b&amp;gt; &amp;amp; more</text>' +
      '<text start="4" dur="1"></text>' +
      '</transcript>';
    expect(parseTimedTextXml(xml)).toEqual([
      { text: "it's a test", start: 0.5, duration: 2.1 },
      { text: 'bold & more', start: 2.6, duration: 1 },
    ]);
  });

  it('parses srv3 in milliseconds', () => {
    const xml = '<timedtext><body><p t="1500" d="2000"><s>hello</s><s> world</s></p></body></timedtext>';
    expect(parseTimedTextXml(xml)).toEqual([{ text: 'hello world', start: 1.5, duration: 2 }]);
  });

  it('returns nothing for malformed XML', () => {
    expect(parseTimedTextXml('<transcript><text')).toEqual([]);
  });
});

describe('groupIntoSentences', () => {
  it('joins cues into sentences with interpolated times', () => {
    const sentences = groupIntoSentences([
      { text: 'powers aligning with each other to', start: 0, duration: 3 },
      { text: 'balance the U.S. and China. Next one', start: 3, duration: 3.5 },
      { text: 'ends here!', start: 6.5, duration: 1 },
    ]);
    expect(sentences.map((s) => s.text)).toEqual([
      'powers aligning with each other to balance the U.S. and China.',
      'Next one ends here!',
    ]);
    expect(sentences[1].start).toBeCloseTo(5.5);
    expect(sentences[1].start + sentences[1].duration).toBeCloseTo(7.5);
  });

  it('breaks unpunctuated runs at a word boundary', () => {
    const words = Array.from({ length: 100 }, () => 'word').join(' ');
    const sentences = groupIntoSentences([{ text: words, start: 0, duration: 100 }]);
    expect(sentences.length).toBeGreaterThan(1);
    expect(sentences.every((s) => s.text.length <= 225)).toBe(true);
  });
});

describe('timing helpers', () => {
  const lines = [
    { text: 'a', start: 1, duration: 1 },
    { text: 'b', start: 5, duration: 1 },
    { text: 'c', start: 9, duration: 1 },
  ];

  it('finds the active line', () => {
    expect(activeIndexAt(lines, 0)).toBe(-1);
    expect(activeIndexAt(lines, 1)).toBe(0);
    expect(activeIndexAt(lines, 8.9)).toBe(1);
    expect(activeIndexAt(lines, 100)).toBe(2);
    expect(activeIndexAt([], 3)).toBe(-1);
  });

  it('formats timecodes and plain text', () => {
    expect(formatTimecode(65.9)).toBe('1:05');
    expect(formatTimecode(3725)).toBe('1:02:05');
    expect(formatTimecode(-3)).toBe('0:00');
    expect(transcriptToText(lines.slice(0, 2))).toBe('[0:01] a\n[0:05] b');
  });
});

describe('fetchYouTubeTranscript', () => {
  const json = (body: unknown) => new Response(JSON.stringify(body));

  it('reads the key, the player data and the captions', async () => {
    const fetchFn = vi.fn(async (url: string | URL | Request) => {
      const href = String(url);
      if (href.includes('/youtubei/v1/player')) {
        return json({
          captions: {
            playerCaptionsTracklistRenderer: {
              captionTracks: [{ baseUrl: 'https://www.youtube.com/api/timedtext?v=x&fmt=srv3', languageCode: 'en', kind: 'asr' }],
            },
          },
        });
      }
      return new Response('<transcript><text start="0" dur="2">Hello there.</text></transcript>');
    });

    const result = await fetchYouTubeTranscript('dQw4w9WgXcQ', {
      pageHtml: '"INNERTUBE_API_KEY":"KEY"',
      fetchFn: fetchFn as typeof fetch,
    });

    expect(result).toEqual({
      videoId: 'dQw4w9WgXcQ',
      languageCode: 'en',
      generated: true,
      sentences: [{ text: 'Hello there.', start: 0, duration: 2 }],
    });
    expect(String(fetchFn.mock.calls[0][0])).toBe('https://www.youtube.com/youtubei/v1/player?key=KEY');
    expect(String(fetchFn.mock.calls[1][0])).toBe('https://www.youtube.com/api/timedtext?v=x');
  });

  it('fetches the watch page when the key is not on hand', async () => {
    const fetchFn = vi.fn(async (url: string | URL | Request) =>
      String(url).includes('/watch?v=')
        ? new Response('"INNERTUBE_API_KEY":"K2"')
        : json({ playabilityStatus: { status: 'OK' } }),
    );
    await expect(
      fetchYouTubeTranscript('dQw4w9WgXcQ', { fetchFn: fetchFn as typeof fetch }),
    ).rejects.toThrow(new TranscriptUnavailableError('This video has no captions.'));
    expect(String(fetchFn.mock.calls[1][0])).toContain('key=K2');
  });

  it('surfaces the playability reason', async () => {
    const fetchFn = vi.fn(async () =>
      json({ playabilityStatus: { status: 'LOGIN_REQUIRED', reason: 'Sign in to confirm your age' } }),
    );
    await expect(
      fetchYouTubeTranscript('dQw4w9WgXcQ', { pageHtml: '"INNERTUBE_API_KEY":"K"', fetchFn: fetchFn as typeof fetch }),
    ).rejects.toThrow('Sign in to confirm your age');
  });
});

describe('TranscriptPanel', () => {
  const transcript = {
    videoId: 'dQw4w9WgXcQ',
    languageCode: 'en',
    generated: false,
    sentences: [
      { text: 'First line here.', start: 0, duration: 3 },
      { text: 'Second line about China.', start: 3, duration: 4 },
    ],
  };

  function mount() {
    const onSeek = vi.fn();
    const panel = new TranscriptPanel(onSeek);
    document.body.append(panel.host);
    const root = panel.host.shadowRoot!;
    return { panel, root, onSeek };
  }

  it('shows loading and error states', () => {
    const { panel, root } = mount();
    expect(root.textContent).toContain('Loading transcript');
    panel.setState({ kind: 'error', message: 'This video has no captions.' });
    expect(root.querySelector('.note')?.textContent).toBe('This video has no captions.');
    panel.host.remove();
  });

  it('renders lines, seeks on click and tracks playback', () => {
    const { panel, root, onSeek } = mount();
    panel.setState({ kind: 'ready', transcript });
    const lines = root.querySelectorAll<HTMLButtonElement>('.line');
    expect(lines).toHaveLength(2);

    lines[1].click();
    expect(onSeek).toHaveBeenCalledWith(3);

    panel.setTime(3.2);
    expect(panel.activeLineIndex).toBe(1);
    expect(root.querySelector('.line.active')?.textContent).toContain('Second');
    expect(root.querySelector('.word.now')?.textContent).toBe('Second');
    panel.host.remove();
  });

  it('filters and highlights on search', () => {
    const { panel, root } = mount();
    panel.setState({ kind: 'ready', transcript });
    const search = root.querySelector<HTMLInputElement>('.search')!;
    search.value = 'china';
    search.dispatchEvent(new Event('input'));
    expect(root.querySelectorAll('.line')).toHaveLength(1);
    expect(root.querySelector('mark')?.textContent).toBe('China');

    search.value = 'nothing';
    search.dispatchEvent(new Event('input'));
    expect(root.querySelector('.note')?.textContent).toContain('No line matches');
    panel.host.remove();
  });

  it('collapses and reports preference changes', () => {
    const onPrefs = vi.fn();
    const panel = new TranscriptPanel(() => {}, onPrefs);
    panel.setPrefs({ collapsed: true });
    expect(panel.host.shadowRoot!.querySelector('.panel')?.classList.contains('collapsed')).toBe(true);
    expect(onPrefs).toHaveBeenCalledWith({ collapsed: true, autoScroll: true });
  });
});
