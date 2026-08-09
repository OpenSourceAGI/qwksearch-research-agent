/**
 * @fileoverview Unit tests for the YouTube data extractors and the transcript
 * list fetcher. The HTTP client is stubbed — nothing here hits the network.
 */

import {
  AgeRestricted,
  FailedToCreateConsentCookie,
  InvalidVideoId,
  IpBlocked,
  RequestBlocked,
  TranscriptsDisabled,
  VideoUnavailable,
  VideoUnplayable,
  YouTubeDataUnparsable,
  YouTubeRequestFailed,
} from '../src/errors';
import {
  extractCaptionsJson,
  extractInnertubeApiKey,
  validatePlayabilityStatus,
} from '../src/fetchers/youtube-data-extractor';
import { TranscriptListFetcher } from '../src/fetchers/transcript-list-fetcher';
import { WebshareProxyConfig } from '../src/proxies';
import { PlayabilityFailedReason, PlayabilityStatus } from '../src/types';
import type { HttpClient } from '../src/types';

const VIDEO_ID = 'dQw4w9WgXcQ';
const API_KEY_HTML = '{"INNERTUBE_API_KEY": "AIzaSy-Test_Key-123"}';

const captionsPayload = {
  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: [
        {
          baseUrl: 'https://youtube.test/manual',
          name: { runs: [{ text: 'English' }] },
          languageCode: 'en',
          isTranslatable: true,
        },
      ],
      translationLanguages: [],
    },
  },
};

/** Builds an HttpClient whose GET returns `html` and whose POST returns `json`. */
function stubClient(html: string, json: unknown = captionsPayload) {
  return {
    get: jest.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => html,
    })),
    post: jest.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => json,
    })),
  } as unknown as HttpClient;
}

describe('extractInnertubeApiKey', () => {
  it('reads the key from the watch page HTML', () => {
    expect(extractInnertubeApiKey(API_KEY_HTML, VIDEO_ID)).toBe('AIzaSy-Test_Key-123');
  });

  it('throws IpBlocked when the page is a reCAPTCHA challenge', () => {
    expect(() => extractInnertubeApiKey('<div class="g-recaptcha"></div>', VIDEO_ID)).toThrow(
      IpBlocked
    );
  });

  it('throws YouTubeDataUnparsable when the key is missing', () => {
    expect(() => extractInnertubeApiKey('<html>no key here</html>', VIDEO_ID)).toThrow(
      YouTubeDataUnparsable
    );
  });
});

describe('extractCaptionsJson', () => {
  it('returns the caption tracklist renderer', () => {
    const captions = extractCaptionsJson(captionsPayload as any, VIDEO_ID);

    expect(captions.captionTracks).toHaveLength(1);
  });

  it('throws TranscriptsDisabled when captions are absent', () => {
    expect(() => extractCaptionsJson({} as any, VIDEO_ID)).toThrow(TranscriptsDisabled);
  });

  it('throws TranscriptsDisabled when the tracklist has no tracks', () => {
    const payload = { captions: { playerCaptionsTracklistRenderer: {} } };

    expect(() => extractCaptionsJson(payload as any, VIDEO_ID)).toThrow(TranscriptsDisabled);
  });
});

describe('validatePlayabilityStatus', () => {
  it('accepts a missing status block', () => {
    expect(() => validatePlayabilityStatus(undefined, VIDEO_ID)).not.toThrow();
  });

  it('accepts an OK status', () => {
    expect(() =>
      validatePlayabilityStatus({ status: PlayabilityStatus.OK }, VIDEO_ID)
    ).not.toThrow();
    expect(() => validatePlayabilityStatus({}, VIDEO_ID)).not.toThrow();
  });

  it('throws RequestBlocked when a bot is detected', () => {
    expect(() =>
      validatePlayabilityStatus(
        { status: PlayabilityStatus.LOGIN_REQUIRED, reason: PlayabilityFailedReason.BOT_DETECTED },
        VIDEO_ID
      )
    ).toThrow(RequestBlocked);
  });

  it('throws AgeRestricted for an age-gated video', () => {
    expect(() =>
      validatePlayabilityStatus(
        {
          status: PlayabilityStatus.LOGIN_REQUIRED,
          reason: PlayabilityFailedReason.AGE_RESTRICTED,
        },
        VIDEO_ID
      )
    ).toThrow(AgeRestricted);
  });

  it('throws VideoUnavailable for a removed video', () => {
    expect(() =>
      validatePlayabilityStatus(
        {
          status: PlayabilityStatus.ERROR,
          reason: PlayabilityFailedReason.VIDEO_UNAVAILABLE,
        },
        VIDEO_ID
      )
    ).toThrow(VideoUnavailable);
  });

  it('throws InvalidVideoId when a URL was passed instead of an id', () => {
    expect(() =>
      validatePlayabilityStatus(
        {
          status: PlayabilityStatus.ERROR,
          reason: PlayabilityFailedReason.VIDEO_UNAVAILABLE,
        },
        'https://www.youtube.com/watch?v=1234'
      )
    ).toThrow(InvalidVideoId);
  });

  it('throws VideoUnplayable for any other failure, collecting sub-reasons', () => {
    expect(() =>
      validatePlayabilityStatus(
        {
          status: 'UNPLAYABLE',
          reason: 'Private video',
          errorScreen: {
            playerErrorMessageRenderer: {
              subreason: { runs: [{ text: 'Sign in' }, { text: '' }] },
            },
          },
        },
        VIDEO_ID
      )
    ).toThrow(VideoUnplayable);
  });

  it('tolerates a missing sub-reason block', () => {
    expect(() => validatePlayabilityStatus({ status: 'UNPLAYABLE' }, VIDEO_ID)).toThrow(
      VideoUnplayable
    );
  });
});

describe('TranscriptListFetcher', () => {
  it('fetches and builds a transcript list', async () => {
    const client = stubClient(API_KEY_HTML);

    const list = await new TranscriptListFetcher(client, null).fetchTranscriptList(VIDEO_ID);

    expect(list.videoId).toBe(VIDEO_ID);
    expect(list.findTranscript(['en']).languageCode).toBe('en');
    expect(client.get).toHaveBeenCalledWith(`https://www.youtube.com/watch?v=${VIDEO_ID}`);
  });

  it('posts to the InnerTube player endpoint with the extracted key', async () => {
    const client = stubClient(API_KEY_HTML);

    await new TranscriptListFetcher(client, null).fetchTranscriptList(VIDEO_ID);

    const [url, options] = (client.post as jest.Mock).mock.calls[0];
    expect(url).toContain('youtubei/v1/player?key=AIzaSy-Test_Key-123');
    expect(JSON.parse(options.body)).toMatchObject({
      videoId: VIDEO_ID,
      context: { client: { clientName: 'ANDROID' } },
    });
  });

  it('retries the consent page once and succeeds', async () => {
    const consentHtml = 'action="https://consent.youtube.com/s" name="v" value="abc"';
    let call = 0;
    const client = stubClient(API_KEY_HTML);
    (client.get as jest.Mock).mockImplementation(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => (call++ === 0 ? consentHtml : API_KEY_HTML),
    }));

    await expect(
      new TranscriptListFetcher(client, null).fetchTranscriptList(VIDEO_ID)
    ).resolves.toBeDefined();
    expect(client.get).toHaveBeenCalledTimes(2);
  });

  it('gives up when the consent page keeps coming back', async () => {
    const client = stubClient('action="https://consent.youtube.com/s" name="v" value="abc"');

    await expect(
      new TranscriptListFetcher(client, null).fetchTranscriptList(VIDEO_ID)
    ).rejects.toThrow(FailedToCreateConsentCookie);
  });

  it('fails when the consent form has no value to echo back', async () => {
    const client = stubClient('action="https://consent.youtube.com/s"');

    await expect(
      new TranscriptListFetcher(client, null).fetchTranscriptList(VIDEO_ID)
    ).rejects.toThrow(FailedToCreateConsentCookie);
  });

  it('surfaces an HTTP failure on the watch page', async () => {
    const client = stubClient(API_KEY_HTML);
    (client.get as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
    });

    await expect(
      new TranscriptListFetcher(client, null).fetchTranscriptList(VIDEO_ID)
    ).rejects.toThrow(YouTubeRequestFailed);
  });

  it('rethrows a block with the proxy config attached when there are no retries', async () => {
    const client = stubClient(API_KEY_HTML, {
      playabilityStatus: {
        status: PlayabilityStatus.LOGIN_REQUIRED,
        reason: PlayabilityFailedReason.BOT_DETECTED,
      },
    });

    await expect(
      new TranscriptListFetcher(client, null).fetchTranscriptList(VIDEO_ID)
    ).rejects.toThrow(RequestBlocked);
  });

  it('retries a blocked request up to the proxy retry limit', async () => {
    const client = stubClient(API_KEY_HTML, {
      playabilityStatus: {
        status: PlayabilityStatus.LOGIN_REQUIRED,
        reason: PlayabilityFailedReason.BOT_DETECTED,
      },
    });
    const proxyConfig = new WebshareProxyConfig({
      proxyUsername: 'user',
      proxyPassword: 'pass',
      retriesWhenBlocked: 3,
    });

    await expect(
      new TranscriptListFetcher(client, proxyConfig).fetchTranscriptList(VIDEO_ID)
    ).rejects.toThrow(RequestBlocked);
    expect(client.get).toHaveBeenCalledTimes(3);
  });
});
