/**
 * @fileoverview All error classes for the YouTube Transcript API
 */

import type { ProxyConfig } from './proxies';

const YOUTUBE_WATCH_URL = 'https://www.youtube.com/watch?v={video_id}';

/**
 * Base exception class for all YouTube Transcript API errors.
 */
export class YouTubeTranscriptApiException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'YouTubeTranscriptApiException';
    Object.setPrototypeOf(this, YouTubeTranscriptApiException.prototype);
  }
}

/**
 * Base exception class for transcript retrieval errors.
 */
export class CouldNotRetrieveTranscript extends YouTubeTranscriptApiException {
  private static readonly ERROR_MESSAGE = '\nCould not retrieve a transcript for the video {video_url}!';
  private static readonly CAUSE_MESSAGE_INTRO = ' This is most likely caused by:\n\n{cause}';
  private static readonly GITHUB_REFERRAL =
    '\n\nIf you are sure that the described cause is not responsible for this error ' +
    'and that a transcript should be retrievable, please create an issue at ' +
    'https://github.com/jdepoix/youtube-transcript-api/issues. ' +
    'Please add which version of youtube_transcript_api you are using ' +
    'and provide the information needed to replicate the error. ' +
    'Also make sure that there are no open issues which already describe your problem!';

  public videoId: string;
  protected causeMessage: string = '';

  constructor(videoId: string) {
    super('');
    this.videoId = videoId;
    Object.setPrototypeOf(this, CouldNotRetrieveTranscript.prototype);
    this.message = this.buildErrorMessage();
  }

  protected buildErrorMessage(): string {
    const videoUrl = YOUTUBE_WATCH_URL.replace('{video_id}', this.videoId);
    let errorMessage = CouldNotRetrieveTranscript.ERROR_MESSAGE.replace('{video_url}', videoUrl);

    const cause = this.getCause();
    if (cause) {
      errorMessage += CouldNotRetrieveTranscript.CAUSE_MESSAGE_INTRO.replace('{cause}', cause);
      errorMessage += CouldNotRetrieveTranscript.GITHUB_REFERRAL;
    }

    return errorMessage;
  }

  protected getCause(): string {
    return this.causeMessage;
  }
}

// Cookie errors
export class CookieError extends YouTubeTranscriptApiException {
  constructor(message: string) {
    super(message);
    this.name = 'CookieError';
    Object.setPrototypeOf(this, CookieError.prototype);
  }
}

export class CookiePathInvalid extends CookieError {
  constructor(cookiePath: string) {
    super(`Can't load the provided cookie file: ${cookiePath}`);
    this.name = 'CookiePathInvalid';
    Object.setPrototypeOf(this, CookiePathInvalid.prototype);
  }
}

export class CookieInvalid extends CookieError {
  constructor(cookiePath: string) {
    super(`The cookies provided are not valid (may have expired): ${cookiePath}`);
    this.name = 'CookieInvalid';
    Object.setPrototypeOf(this, CookieInvalid.prototype);
  }
}

// Video errors
export class YouTubeDataUnparsable extends CouldNotRetrieveTranscript {
  protected causeMessage =
    'The data required to fetch the transcript is not parsable. This should ' +
    'not happen, please open an issue (make sure to include the video ID)!';

  constructor(videoId: string) {
    super(videoId);
    this.name = 'YouTubeDataUnparsable';
    Object.setPrototypeOf(this, YouTubeDataUnparsable.prototype);
    this.message = this.buildErrorMessage();
  }
}

export class YouTubeRequestFailed extends CouldNotRetrieveTranscript {
  private httpErrorReason: string;

  constructor(videoId: string, httpError: Error) {
    super(videoId);
    this.httpErrorReason = httpError.message;
    this.name = 'YouTubeRequestFailed';
    this.message = this.buildErrorMessage();
    Object.setPrototypeOf(this, YouTubeRequestFailed.prototype);
  }

  protected getCause(): string {
    return `Request to YouTube failed: ${this.httpErrorReason}`;
  }
}

export class VideoUnplayable extends CouldNotRetrieveTranscript {
  private unplayableReason: string | null;
  private additionalDetails: string[];

  constructor(videoId: string, unplayableReason: string | null, additionalDetails: string[]) {
    super(videoId);
    this.unplayableReason = unplayableReason;
    this.additionalDetails = additionalDetails;
    this.name = 'VideoUnplayable';
    this.message = this.buildErrorMessage();
    Object.setPrototypeOf(this, VideoUnplayable.prototype);
  }

  protected getCause(): string {
    let reason = this.unplayableReason ?? 'No reason specified!';

    if (this.additionalDetails.length > 0) {
      const formattedDetails = this.additionalDetails.map(detail => ` - ${detail}`).join('\n');
      reason = `${reason}\n\nAdditional Details:\n${formattedDetails}`;
    }

    return `The video is unplayable for the following reason: ${reason}`;
  }
}

export class VideoUnavailable extends CouldNotRetrieveTranscript {
  protected causeMessage = 'The video is no longer available';

  constructor(videoId: string) {
    super(videoId);
    this.name = 'VideoUnavailable';
    Object.setPrototypeOf(this, VideoUnavailable.prototype);
    this.message = this.buildErrorMessage();
  }
}

export class InvalidVideoId extends CouldNotRetrieveTranscript {
  protected causeMessage =
    'You provided an invalid video id. Make sure you are using the video id and NOT the url!\n\n' +
    'Do NOT run: `new YouTubeTranscriptApi().fetch("https://www.youtube.com/watch?v=1234")`\n' +
    'Instead run: `new YouTubeTranscriptApi().fetch("1234")`';

  constructor(videoId: string) {
    super(videoId);
    this.name = 'InvalidVideoId';
    Object.setPrototypeOf(this, InvalidVideoId.prototype);
    this.message = this.buildErrorMessage();
  }
}

export class AgeRestricted extends CouldNotRetrieveTranscript {
  protected causeMessage =
    'This video is age-restricted. Therefore, you are unable to retrieve ' +
    'transcripts for it without authenticating yourself.\n\n' +
    'Unfortunately, Cookie Authentication is temporarily unsupported in ' +
    'youtube-transcript-api, as recent changes in YouTube\'s API broke the previous ' +
    'implementation. I will do my best to re-implement it as soon as possible.';

  constructor(videoId: string) {
    super(videoId);
    this.name = 'AgeRestricted';
    Object.setPrototypeOf(this, AgeRestricted.prototype);
    this.message = this.buildErrorMessage();
  }
}

export class FailedToCreateConsentCookie extends CouldNotRetrieveTranscript {
  protected causeMessage = 'Failed to automatically give consent to saving cookies';

  constructor(videoId: string) {
    super(videoId);
    this.name = 'FailedToCreateConsentCookie';
    Object.setPrototypeOf(this, FailedToCreateConsentCookie.prototype);
    this.message = this.buildErrorMessage();
  }
}

// Transcript errors
export class TranscriptsDisabled extends CouldNotRetrieveTranscript {
  protected causeMessage = 'Subtitles are disabled for this video';

  constructor(videoId: string) {
    super(videoId);
    this.name = 'TranscriptsDisabled';
    Object.setPrototypeOf(this, TranscriptsDisabled.prototype);
    this.message = this.buildErrorMessage();
  }
}

export class NotTranslatable extends CouldNotRetrieveTranscript {
  protected causeMessage = 'The requested language is not translatable';

  constructor(videoId: string) {
    super(videoId);
    this.name = 'NotTranslatable';
    Object.setPrototypeOf(this, NotTranslatable.prototype);
    this.message = this.buildErrorMessage();
  }
}

export class TranslationLanguageNotAvailable extends CouldNotRetrieveTranscript {
  protected causeMessage = 'The requested translation language is not available';

  constructor(videoId: string) {
    super(videoId);
    this.name = 'TranslationLanguageNotAvailable';
    Object.setPrototypeOf(this, TranslationLanguageNotAvailable.prototype);
    this.message = this.buildErrorMessage();
  }
}

export class NoTranscriptFound extends CouldNotRetrieveTranscript {
  private requestedLanguageCodes: string[];
  private availableTranscriptData: any;

  constructor(videoId: string, requestedLanguageCodes: string[], availableTranscriptData: any) {
    super(videoId);
    this.requestedLanguageCodes = requestedLanguageCodes;
    this.availableTranscriptData = availableTranscriptData;
    this.name = 'NoTranscriptFound';
    this.message = this.buildErrorMessage();
    Object.setPrototypeOf(this, NoTranscriptFound.prototype);
  }

  protected getCause(): string {
    const requestedLanguages = this.requestedLanguageCodes.join(', ');
    return (
      `No transcripts were found for any of the requested language codes: ${requestedLanguages}\n\n` +
      this.availableTranscriptData.toString()
    );
  }
}

export class PoTokenRequired extends CouldNotRetrieveTranscript {
  protected causeMessage =
    'The requested video cannot be retrieved without a PO Token. If this happens, ' +
    'please open a GitHub issue!';

  constructor(videoId: string) {
    super(videoId);
    this.name = 'PoTokenRequired';
    Object.setPrototypeOf(this, PoTokenRequired.prototype);
    this.message = this.buildErrorMessage();
  }
}

// Network errors
export class RequestBlocked extends CouldNotRetrieveTranscript {
  private static readonly BASE_CAUSE_MESSAGE =
    'YouTube is blocking requests from your IP. This usually is due to one of the ' +
    'following reasons:\n' +
    '- You have done too many requests and your IP has been blocked by YouTube\n' +
    '- You are doing requests from an IP belonging to a cloud provider (like AWS, ' +
    'Google Cloud Platform, Azure, etc.). Unfortunately, most IPs from cloud ' +
    'providers are blocked by YouTube.\n\n';

  private static readonly DEFAULT_CAUSE_MESSAGE =
    RequestBlocked.BASE_CAUSE_MESSAGE +
    'There are two things you can do to work around this:\n' +
    '1. Use proxies to hide your IP address, as explained in the "Working around ' +
    'IP bans" section of the README ' +
    '(https://github.com/jdepoix/youtube-transcript-api' +
    '?tab=readme-ov-file' +
    '#working-around-ip-bans-requestblocked-or-ipblocked-exception).\n' +
    '2. (NOT RECOMMENDED) If you authenticate your requests using cookies, you ' +
    'will be able to continue doing requests for a while. However, YouTube will ' +
    'eventually permanently ban the account that you have used to authenticate ' +
    'with! So only do this if you don\'t mind your account being banned!';

  private static readonly WITH_GENERIC_PROXY_CAUSE_MESSAGE =
    'YouTube is blocking your requests, despite you using proxies. Keep in mind ' +
    'that a proxy is just a way to hide your real IP behind the IP of that proxy, ' +
    'but there is no guarantee that the IP of that proxy won\'t be blocked as ' +
    'well.\n\n' +
    'The only truly reliable way to prevent IP blocks is rotating through a large ' +
    'pool of residential IPs, by using a provider like Webshare ' +
    '(https://www.webshare.io/?referral_code=w0xno53eb50g), which provides you ' +
    'with a pool of >30M residential IPs (make sure to purchase ' +
    '"Residential" proxies, NOT "Proxy Server" or "Static Residential"!).\n\n' +
    'You will find more information on how to easily integrate Webshare here: ' +
    'https://github.com/jdepoix/youtube-transcript-api' +
    '?tab=readme-ov-file#using-webshare';

  private static readonly WITH_WEBSHARE_PROXY_CAUSE_MESSAGE =
    'YouTube is blocking your requests, despite you using Webshare proxies. ' +
    'Please make sure that you have purchased "Residential" proxies and ' +
    'NOT "Proxy Server" or "Static Residential", as those won\'t work as ' +
    'reliably! The free tier also uses "Proxy Server" and will NOT work!\n\n' +
    'The only reliable option is using "Residential" proxies (not "Static ' +
    'Residential"), as this allows you to rotate through a pool of over 30M IPs, ' +
    'which means you will always find an IP that hasn\'t been blocked by YouTube ' +
    'yet!\n\n' +
    'You can support the development of this open source project by making your ' +
    'Webshare purchases through this affiliate link: ' +
    'https://www.webshare.io/?referral_code=w0xno53eb50g \n\n' +
    'Thank you for your support! <3';

  private proxyConfig: ProxyConfig | null = null;

  constructor(videoId: string) {
    super(videoId);
    this.name = 'RequestBlocked';
    Object.setPrototypeOf(this, RequestBlocked.prototype);
    this.message = this.buildErrorMessage();
  }

  withProxyConfig(proxyConfig: ProxyConfig | null): RequestBlocked {
    this.proxyConfig = proxyConfig;
    this.message = this.buildErrorMessage();
    return this;
  }

  protected getCause(): string {
    // Check class name to avoid circular dependency with instanceof
    if (this.proxyConfig && this.proxyConfig.constructor.name === 'WebshareProxyConfig') {
      return RequestBlocked.WITH_WEBSHARE_PROXY_CAUSE_MESSAGE;
    }
    if (this.proxyConfig && this.proxyConfig.constructor.name === 'GenericProxyConfig') {
      return RequestBlocked.WITH_GENERIC_PROXY_CAUSE_MESSAGE;
    }
    return RequestBlocked.DEFAULT_CAUSE_MESSAGE;
  }
}

export class IpBlocked extends RequestBlocked {
  protected causeMessage =
    'YouTube is blocking requests from your IP. This usually is due to one of the ' +
    'following reasons:\n' +
    '- You have done too many requests and your IP has been blocked by YouTube\n' +
    '- You are doing requests from an IP belonging to a cloud provider (like AWS, ' +
    'Google Cloud Platform, Azure, etc.). Unfortunately, most IPs from cloud ' +
    'providers are blocked by YouTube.\n\n' +
    'Ways to work around this are explained in the "Working around IP ' +
    'bans" section of the README (https://github.com/jdepoix/youtube-transcript-api' +
    '?tab=readme-ov-file' +
    '#working-around-ip-bans-requestblocked-or-ipblocked-exception).\n';

  constructor(videoId: string) {
    super(videoId);
    this.name = 'IpBlocked';
    Object.setPrototypeOf(this, IpBlocked.prototype);
    this.message = this.buildErrorMessage();
  }

  protected getCause(): string {
    return this.causeMessage;
  }
}
