/**
 * @fileoverview Unit tests for the Transcript and TranscriptList models.
 * The HTTP client is stubbed — nothing here touches the network.
 */

import { NoTranscriptFound, NotTranslatable, PoTokenRequired, TranslationLanguageNotAvailable } from '../src/errors';
import { Transcript, TranscriptList } from '../src/models';
import type { CaptionsJson, HttpClient, TranslationLanguage } from '../src/types';

const VIDEO_ID = 'dQw4w9WgXcQ';

const TRANSLATION_LANGUAGES: TranslationLanguage[] = [
  { language: 'German', language_code: 'de' },
  { language: 'French', language_code: 'fr' },
];

function httpClient(overrides: Partial<HttpClient> = {}): HttpClient {
  return {
    get: jest.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () =>
        '<?xml version="1.0"?><transcript><text start="0" dur="1">Hello</text></transcript>',
    })),
    ...overrides,
  } as unknown as HttpClient;
}

function transcript(
  url = 'https://youtube.test/api/timedtext?v=1',
  translations = TRANSLATION_LANGUAGES,
  client = httpClient()
) {
  return new Transcript(client, VIDEO_ID, url, 'English', 'en', false, translations);
}

const captionsJson = (): CaptionsJson =>
  ({
    captionTracks: [
      {
        baseUrl: 'https://youtube.test/manual&fmt=srv3',
        name: { runs: [{ text: 'English' }] },
        languageCode: 'en',
        isTranslatable: true,
      },
      {
        baseUrl: 'https://youtube.test/auto',
        name: { runs: [{ text: 'German (auto-generated)' }] },
        languageCode: 'de',
        kind: 'asr',
        isTranslatable: false,
      },
    ],
    translationLanguages: [
      { languageCode: 'de', languageName: { runs: [{ text: 'German' }] } },
      { languageCode: 'fr', languageName: { runs: [{ text: 'French' }] } },
    ],
  }) as unknown as CaptionsJson;

describe('Transcript', () => {
  it('exposes its metadata', () => {
    const t = transcript();

    expect(t.videoId).toBe(VIDEO_ID);
    expect(t.language).toBe('English');
    expect(t.languageCode).toBe('en');
    expect(t.isGenerated).toBe(false);
    expect(t.translationLanguages).toHaveLength(2);
  });

  it('reports translatability', () => {
    expect(transcript().isTranslatable).toBe(true);
    expect(transcript(undefined, []).isTranslatable).toBe(false);
  });

  it('renders a readable string', () => {
    expect(transcript().toString()).toBe('en ("English")[TRANSLATABLE]');
    expect(transcript(undefined, []).toString()).toBe('en ("English")');
  });

  it('fetches and parses the transcript XML', async () => {
    const client = httpClient();
    const fetched = await transcript(undefined, TRANSLATION_LANGUAGES, client).fetch();

    expect(client.get).toHaveBeenCalledWith('https://youtube.test/api/timedtext?v=1');
    expect(fetched.videoId).toBe(VIDEO_ID);
    expect(fetched.languageCode).toBe('en');
    expect(fetched.snippets).toEqual([{ text: 'Hello', start: 0, duration: 1 }]);
  });

  it('preserves formatting when asked', async () => {
    const client = httpClient({
      get: jest.fn(async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () =>
          '<?xml version="1.0"?><transcript><text start="0" dur="1">a &lt;b&gt;x&lt;/b&gt;</text></transcript>',
      })),
    } as any);

    const fetched = await transcript(undefined, TRANSLATION_LANGUAGES, client).fetch(true);

    expect(fetched.snippets[0].text).toContain('<b>');
  });

  it('rejects a URL that requires a PO token', async () => {
    await expect(transcript('https://youtube.test/api?v=1&exp=xpe').fetch()).rejects.toThrow(
      PoTokenRequired
    );
  });

  it('surfaces an HTTP failure', async () => {
    const client = httpClient({
      get: jest.fn(async () => ({ ok: false, status: 500, statusText: 'Server Error' })),
    } as any);

    await expect(transcript(undefined, TRANSLATION_LANGUAGES, client).fetch()).rejects.toThrow();
  });

  it('builds a translated transcript', () => {
    const translated = transcript().translate('de');

    expect(translated.languageCode).toBe('de');
    expect(translated.language).toBe('German');
    expect(translated.isGenerated).toBe(true);
    expect(translated.isTranslatable).toBe(false);
  });

  it('appends the target language to the transcript URL', async () => {
    const client = httpClient();
    await transcript('https://youtube.test/base', TRANSLATION_LANGUAGES, client)
      .translate('fr')
      .fetch();

    expect(client.get).toHaveBeenCalledWith('https://youtube.test/base&tlang=fr');
  });

  it('refuses to translate an untranslatable transcript', () => {
    expect(() => transcript(undefined, []).translate('de')).toThrow(NotTranslatable);
  });

  it('refuses an unavailable target language', () => {
    expect(() => transcript().translate('zz')).toThrow(TranslationLanguageNotAvailable);
  });
});

describe('TranscriptList.buildFromCaptionsJson', () => {
  it('splits manual and auto-generated tracks', () => {
    const list = TranscriptList.buildFromCaptionsJson(httpClient(), VIDEO_ID, captionsJson());

    expect(list.videoId).toBe(VIDEO_ID);
    expect([...list].map((t) => t.languageCode)).toEqual(['en', 'de']);
    expect(list.findManuallyCreatedTranscript(['en']).isGenerated).toBe(false);
    expect(list.findGeneratedTranscript(['de']).isGenerated).toBe(true);
  });

  it('strips the srv3 format parameter from track URLs', async () => {
    const client = httpClient();
    const list = TranscriptList.buildFromCaptionsJson(client, VIDEO_ID, captionsJson());

    await list.findTranscript(['en']).fetch();

    expect(client.get).toHaveBeenCalledWith('https://youtube.test/manual');
  });

  it('only attaches translation languages to translatable tracks', () => {
    const list = TranscriptList.buildFromCaptionsJson(httpClient(), VIDEO_ID, captionsJson());

    expect(list.findTranscript(['en']).isTranslatable).toBe(true);
    expect(list.findGeneratedTranscript(['de']).isTranslatable).toBe(false);
  });

  it('tolerates a payload with no translation languages', () => {
    const json = captionsJson();
    delete (json as any).translationLanguages;

    const list = TranscriptList.buildFromCaptionsJson(httpClient(), VIDEO_ID, json);

    expect(list.findTranscript(['en']).translationLanguages).toEqual([]);
  });
});

describe('TranscriptList lookups', () => {
  const list = () => TranscriptList.buildFromCaptionsJson(httpClient(), VIDEO_ID, captionsJson());

  it('prefers manual transcripts over generated ones', () => {
    expect(list().findTranscript(['de', 'en']).languageCode).toBe('de');
    expect(list().findTranscript(['en', 'de']).languageCode).toBe('en');
  });

  it('honours the language priority order', () => {
    expect(list().findTranscript(['zz', 'en']).languageCode).toBe('en');
  });

  it('throws when no language matches', () => {
    expect(() => list().findTranscript(['zz'])).toThrow(NoTranscriptFound);
  });

  it('throws when no generated transcript matches', () => {
    expect(() => list().findGeneratedTranscript(['en'])).toThrow(NoTranscriptFound);
  });

  it('throws when no manual transcript matches', () => {
    expect(() => list().findManuallyCreatedTranscript(['de'])).toThrow(NoTranscriptFound);
  });
});

describe('TranscriptList.toString', () => {
  it('lists both groups and the translation languages', () => {
    const text = TranscriptList.buildFromCaptionsJson(
      httpClient(),
      VIDEO_ID,
      captionsJson()
    ).toString();

    expect(text).toContain(VIDEO_ID);
    expect(text).toContain('(MANUALLY CREATED)');
    expect(text).toContain('en ("English")');
    expect(text).toContain('(GENERATED)');
    expect(text).toContain('de ("German (auto-generated)")');
    expect(text).toContain('(TRANSLATION LANGUAGES)');
    expect(text).toContain('fr ("French")');
  });

  it('reports "None" for empty groups', () => {
    const text = new TranscriptList(VIDEO_ID, {}, {}, []).toString();

    expect(text.match(/None/g)).toHaveLength(3);
  });
});
