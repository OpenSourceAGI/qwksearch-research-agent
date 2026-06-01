/**
 * @fileoverview Type definitions for the YouTube Transcript API
 */

import { Response, RequestInit } from 'node-fetch';

/**
 * Represents a single snippet/cue of a transcript
 */
export interface FetchedTranscriptSnippet {
  /** The text content of this transcript snippet */
  text: string;
  /** The timestamp at which this transcript snippet appears on screen in seconds */
  start: number;
  /**
   * The duration of how long the snippet stays on screen in seconds.
   * Note: This is not the duration of the transcribed speech, but how long
   * the snippet stays on screen. Therefore, there can be overlaps between snippets!
   */
  duration: number;
}

/**
 * Translation language information
 */
export interface TranslationLanguage {
  /** The name of the language */
  language: string;
  /** The language code (e.g., 'en', 'de', 'fr') */
  language_code: string;
}

/**
 * Playability status enum values
 */
export enum PlayabilityStatus {
  OK = 'OK',
  ERROR = 'ERROR',
  LOGIN_REQUIRED = 'LOGIN_REQUIRED'
}

/**
 * Playability failed reason enum values
 */
export enum PlayabilityFailedReason {
  BOT_DETECTED = "Sign in to confirm you're not a bot",
  AGE_RESTRICTED = 'This video may be inappropriate for some users.',
  VIDEO_UNAVAILABLE = 'This video is unavailable'
}

/**
 * Proxy configuration dictionary for HTTP clients
 */
export interface RequestsProxyConfigDict {
  http: string;
  https: string;
}

/**
 * Caption track data from YouTube API
 */
export interface CaptionTrack {
  baseUrl: string;
  name: {
    runs: Array<{ text: string }>;
  };
  languageCode: string;
  kind?: string;
  isTranslatable?: boolean;
}

/**
 * Captions JSON data from YouTube
 */
export interface CaptionsJson {
  captionTracks: CaptionTrack[];
  translationLanguages?: Array<{
    languageName: {
      runs: Array<{ text: string }>;
    };
    languageCode: string;
  }>;
}

/**
 * YouTube InnerTube API response
 */
export interface InnerTubeData {
  playabilityStatus?: {
    status?: string;
    reason?: string;
    errorScreen?: {
      playerErrorMessageRenderer?: {
        subreason?: {
          runs?: Array<{ text?: string }>;
        };
      };
    };
  };
  captions?: {
    playerCaptionsTracklistRenderer?: CaptionsJson;
  };
}

/**
 * HTTP client interface with fetch-like API
 */
export interface HttpClient {
  get(url: string, options?: RequestInit): Promise<Response>;
  post(url: string, options?: RequestInit): Promise<Response>;
}

/**
 * Cookie storage interface
 */
export interface CookieJar {
  set(name: string, value: string, domain: string): void;
  get(name: string): string | undefined;
}
