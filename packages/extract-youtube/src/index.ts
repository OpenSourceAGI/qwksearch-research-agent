/**
 * @fileoverview YouTube Transcript API - A Node.js/TypeScript API to retrieve YouTube video transcripts/subtitles
 * @module youtube-transcript-api
 */

// Main API
export { YouTubeTranscriptApi } from './youtube-transcript-api';

// Transcript utilities
export { encodeTranscriptSpeeds, getTimestampAtChar, decompressTimestampsArray } from './utils/transcript-utils';

// Transcript model classes
export {
  FetchedTranscript,
  Transcript,
  TranscriptList
} from './models';

// Fetcher classes
export { TranscriptListFetcher } from './fetchers/transcript-list-fetcher';

// Proxy configurations
export {
  ProxyConfig,
  GenericProxyConfig,
  WebshareProxyConfig,
  InvalidProxyConfig
} from './proxies';

// Formatters
export {
  Formatter,
  JSONFormatter,
  PrettyPrintFormatter,
  TextFormatter,
  ArticleFormatter,
  SRTFormatter,
  WebVTTFormatter,
  FormatterLoader,
  UnknownFormatterType
} from './formatters';

// Error classes
export {
  YouTubeTranscriptApiException,
  CookieError,
  CookiePathInvalid,
  CookieInvalid,
  CouldNotRetrieveTranscript,
  YouTubeDataUnparsable,
  YouTubeRequestFailed,
  VideoUnplayable,
  VideoUnavailable,
  InvalidVideoId,
  RequestBlocked,
  IpBlocked,
  TranscriptsDisabled,
  AgeRestricted,
  NotTranslatable,
  TranslationLanguageNotAvailable,
  FailedToCreateConsentCookie,
  NoTranscriptFound,
  PoTokenRequired
} from './errors';

// Type definitions (enums only - interfaces are type-only and exported via .d.ts)
export {
  PlayabilityStatus,
  PlayabilityFailedReason
} from './types';

// Re-export types for TypeScript consumers (these are type-only exports)
export type {
  FetchedTranscriptSnippet,
  TranslationLanguage,
  RequestsProxyConfigDict,
  CaptionTrack,
  CaptionsJson,
  InnerTubeData,
  HttpClient
} from './types';
