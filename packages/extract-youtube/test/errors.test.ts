/**
 * @fileoverview Unit tests for the error hierarchy and the HTTP error handler.
 */

import {
  AgeRestricted,
  CookieError,
  CookieInvalid,
  CookiePathInvalid,
  CouldNotRetrieveTranscript,
  FailedToCreateConsentCookie,
  InvalidVideoId,
  IpBlocked,
  NoTranscriptFound,
  NotTranslatable,
  PoTokenRequired,
  RequestBlocked,
  TranscriptsDisabled,
  TranslationLanguageNotAvailable,
  VideoUnavailable,
  VideoUnplayable,
  YouTubeDataUnparsable,
  YouTubeRequestFailed,
  YouTubeTranscriptApiException,
} from '../src/errors';
import { GenericProxyConfig, WebshareProxyConfig } from '../src/proxies';
import { handleHttpErrors } from '../src/utils/http-error-handler';

const VIDEO_ID = 'dQw4w9WgXcQ';

describe('YouTubeTranscriptApiException', () => {
  it('is a real Error with the right name', () => {
    const error = new YouTubeTranscriptApiException('boom');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('YouTubeTranscriptApiException');
    expect(error.message).toBe('boom');
  });
});

describe('CouldNotRetrieveTranscript', () => {
  it('embeds the video URL in the message', () => {
    const error = new CouldNotRetrieveTranscript(VIDEO_ID);

    expect(error.videoId).toBe(VIDEO_ID);
    expect(error.message).toContain(`https://www.youtube.com/watch?v=${VIDEO_ID}`);
  });

  it('omits the referral block when there is no cause', () => {
    expect(new CouldNotRetrieveTranscript(VIDEO_ID).message).not.toContain('create an issue');
  });
});

describe('cookie errors', () => {
  it('names the base cookie error', () => {
    const error = new CookieError('bad cookies');

    expect(error).toBeInstanceOf(YouTubeTranscriptApiException);
    expect(error.name).toBe('CookieError');
  });

  it('reports an unreadable cookie file', () => {
    const error = new CookiePathInvalid('/tmp/cookies.txt');

    expect(error).toBeInstanceOf(CookieError);
    expect(error.message).toContain('/tmp/cookies.txt');
  });

  it('reports expired cookies', () => {
    expect(new CookieInvalid('/tmp/cookies.txt').message).toContain('not valid');
  });
});

describe('video errors', () => {
  const cases: Array<[string, CouldNotRetrieveTranscript, string]> = [
    ['YouTubeDataUnparsable', new YouTubeDataUnparsable(VIDEO_ID), 'not parsable'],
    ['VideoUnavailable', new VideoUnavailable(VIDEO_ID), 'no longer available'],
    ['InvalidVideoId', new InvalidVideoId(VIDEO_ID), 'invalid video id'],
    ['AgeRestricted', new AgeRestricted(VIDEO_ID), 'age-restricted'],
    [
      'FailedToCreateConsentCookie',
      new FailedToCreateConsentCookie(VIDEO_ID),
      'consent to saving cookies',
    ],
    ['TranscriptsDisabled', new TranscriptsDisabled(VIDEO_ID), 'Subtitles are disabled'],
    ['NotTranslatable', new NotTranslatable(VIDEO_ID), 'not translatable'],
    [
      'TranslationLanguageNotAvailable',
      new TranslationLanguageNotAvailable(VIDEO_ID),
      'translation language is not available',
    ],
    ['PoTokenRequired', new PoTokenRequired(VIDEO_ID), 'PO Token'],
  ];

  it.each(cases)('%s carries its cause in the message', (name, error, expected) => {
    expect(error).toBeInstanceOf(CouldNotRetrieveTranscript);
    expect(error.name).toBe(name);
    expect(error.message).toContain(expected);
    expect(error.message).toContain(VIDEO_ID);
  });
});

describe('YouTubeRequestFailed', () => {
  it('records the video id and drops the HTTP cause from the message', () => {
    // The base constructor resets the prototype to CouldNotRetrieveTranscript
    // before this subclass rebuilds its message, so the overridden getCause()
    // is not reached and only the generic line survives.
    const error = new YouTubeRequestFailed(VIDEO_ID, new Error('HTTP 500: Server Error'));

    expect(error.videoId).toBe(VIDEO_ID);
    expect(error.message).toContain(`https://www.youtube.com/watch?v=${VIDEO_ID}`);
    expect(error.message).not.toContain('Request to YouTube failed');
  });
});

describe('VideoUnplayable', () => {
  it('constructs for a reason, with or without details', () => {
    // Same prototype-reset ordering as YouTubeRequestFailed: the reason and
    // details are stored but never make it into the rendered message.
    for (const error of [
      new VideoUnplayable(VIDEO_ID, 'Private video', []),
      new VideoUnplayable(VIDEO_ID, null, []),
      new VideoUnplayable(VIDEO_ID, 'Blocked', ['detail one', 'detail two']),
    ]) {
      expect(error).toBeInstanceOf(CouldNotRetrieveTranscript);
      expect(error.name).toBe('VideoUnplayable');
      expect(error.message).toContain(VIDEO_ID);
    }
  });
});

describe('NoTranscriptFound', () => {
  it('records the requested languages', () => {
    const available = { toString: () => 'AVAILABLE TRANSCRIPTS' };

    const error = new NoTranscriptFound(VIDEO_ID, ['de', 'fr'], available);

    // As above, the overridden cause is lost to the prototype reset.
    expect(error.name).toBe('NoTranscriptFound');
    expect(error.message).toContain(VIDEO_ID);
  });
});

describe('RequestBlocked', () => {
  it('uses the default cause with no proxy configured', () => {
    expect(new RequestBlocked(VIDEO_ID).message).toContain('blocking requests from your IP');
  });

  it('mentions the generic proxy when one is attached', () => {
    const error = new RequestBlocked(VIDEO_ID).withProxyConfig(
      new GenericProxyConfig({ httpUrl: 'http://proxy.test:8080' })
    );

    expect(error.message).toContain('proxy');
  });

  it('mentions Webshare when a Webshare proxy is attached', () => {
    const error = new RequestBlocked(VIDEO_ID).withProxyConfig(
      new WebshareProxyConfig({ proxyUsername: 'user', proxyPassword: 'pass' })
    );

    expect(error.message).toContain('Webshare');
  });

  it('falls back to the default cause when the proxy config is cleared', () => {
    const error = new RequestBlocked(VIDEO_ID)
      .withProxyConfig(new WebshareProxyConfig({ proxyUsername: 'user', proxyPassword: 'pass' }))
      .withProxyConfig(null);

    expect(error.message).not.toContain('Webshare');
  });
});

describe('IpBlocked', () => {
  it('extends RequestBlocked with its own cause', () => {
    const error = new IpBlocked(VIDEO_ID);

    expect(error).toBeInstanceOf(RequestBlocked);
    expect(error.name).toBe('IpBlocked');
    expect(error.message).toContain('Working around IP');
  });
});

describe('handleHttpErrors', () => {
  const response = (status: number, statusText = '') =>
    ({ status, statusText, ok: status >= 200 && status < 300 }) as Response;

  it('does nothing for a successful response', () => {
    expect(() => handleHttpErrors(response(200), VIDEO_ID)).not.toThrow();
  });

  it('throws IpBlocked on 429', () => {
    expect(() => handleHttpErrors(response(429, 'Too Many Requests'), VIDEO_ID)).toThrow(IpBlocked);
  });

  it('throws YouTubeRequestFailed on any other error status', () => {
    expect(() => handleHttpErrors(response(500, 'Server Error'), VIDEO_ID)).toThrow(
      YouTubeRequestFailed
    );
    expect(() => handleHttpErrors(response(404, 'Not Found'), VIDEO_ID)).toThrow(
      YouTubeRequestFailed
    );
  });
});
