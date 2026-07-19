/**
 * @fileoverview Fetcher for retrieving transcript lists from YouTube
 */

import { decode } from 'html-entities';
import { HttpClient, CaptionsJson, InnerTubeData } from '../types';
import { ProxyConfig } from '../proxies';
import { TranscriptList } from '../models/transcript-list';
import { RequestBlocked, FailedToCreateConsentCookie } from '../errors';
import { handleHttpErrors } from '../utils/http-error-handler';
import {
  extractInnertubeApiKey,
  extractCaptionsJson
} from './youtube-data-extractor';

/** YouTube watch page URL template */
const YOUTUBE_WATCH_URL = 'https://www.youtube.com/watch?v={video_id}';

/** YouTube InnerTube API URL template */
const INNERTUBE_API_URL = 'https://www.youtube.com/youtubei/v1/player?key={api_key}';

/** InnerTube API context configuration for requests */
const INNERTUBE_CONTEXT = {
  client: {
    clientName: 'ANDROID',
    clientVersion: '20.10.38'
  }
};

/**
 * Fetches transcript lists from YouTube for given video IDs.
 * Handles consent cookies, retries on blocks, and extracts caption data.
 *
 * @example
 * ```typescript
 * const fetcher = new TranscriptListFetcher(httpClient, proxyConfig);
 * const transcriptList = await fetcher.fetchTranscriptList('dQw4w9WgXcQ');
 * ```
 */
export class TranscriptListFetcher {
  private httpClient: HttpClient;
  private proxyConfig: ProxyConfig | null;

  /**
   * Creates a new TranscriptListFetcher instance.
   *
   * @param {HttpClient} httpClient - The HTTP client to use for requests
   * @param {ProxyConfig | null} proxyConfig - Optional proxy configuration
   */
  constructor(httpClient: HttpClient, proxyConfig: ProxyConfig | null) {
    this.httpClient = httpClient;
    this.proxyConfig = proxyConfig;
  }

  /**
   * Fetches the list of available transcripts for a video.
   *
   * @param {string} videoId - The YouTube video ID
   * @returns {Promise<TranscriptList>} The transcript list
   * @throws {RequestBlocked} If requests are blocked and retries exhausted
   * @throws {IpBlocked} If IP is blocked by YouTube
   * @throws {YouTubeDataUnparsable} If YouTube data cannot be parsed
   * @throws {TranscriptsDisabled} If transcripts are disabled for the video
   *
   * @example
   * ```typescript
   * const transcriptList = await fetcher.fetchTranscriptList('dQw4w9WgXcQ');
   * const transcript = transcriptList.findTranscript(['en']);
   * ```
   */
  async fetchTranscriptList(videoId: string): Promise<TranscriptList> {
    const captionsJson = await this.fetchCaptionsJsonWithRetry(videoId);
    return TranscriptList.buildFromCaptionsJson(this.httpClient, videoId, captionsJson);
  }

  /**
   * Fetches captions JSON with retry logic for blocked requests.
   *
   * @private
   * @param {string} videoId - The video ID
   * @param {number} [attemptNumber=0] - Current attempt number (for retry logic)
   * @returns {Promise<CaptionsJson>} The captions JSON data
   */
  private async fetchCaptionsJsonWithRetry(
    videoId: string,
    attemptNumber: number = 0
  ): Promise<CaptionsJson> {
    try {
      const htmlContent = await this.fetchVideoPageHtml(videoId);
      const apiKey = extractInnertubeApiKey(htmlContent, videoId);
      const innertubeData = await this.fetchInnertubePlayerData(videoId, apiKey);
      return extractCaptionsJson(innertubeData, videoId);
    } catch (error) {
      if (error instanceof RequestBlocked) {
        return this.handleBlockedRequest(error, videoId, attemptNumber);
      }
      throw error;
    }
  }

  /**
   * Handles blocked requests with retry logic based on proxy configuration.
   *
   * @private
   * @param {RequestBlocked} error - The blocked request error
   * @param {string} videoId - The video ID
   * @param {number} attemptNumber - Current attempt number
   * @returns {Promise<CaptionsJson>} The captions JSON data from retry
   * @throws {RequestBlocked} If retries are exhausted
   */
  private async handleBlockedRequest(
    error: RequestBlocked,
    videoId: string,
    attemptNumber: number
  ): Promise<CaptionsJson> {
    const maxRetries = this.proxyConfig?.retriesWhenBlocked || 0;

    if (attemptNumber + 1 < maxRetries) {
      return this.fetchCaptionsJsonWithRetry(videoId, attemptNumber + 1);
    }

    throw error.withProxyConfig(this.proxyConfig);
  }

  /**
   * Fetches the HTML content of a video's watch page, handling consent cookies.
   *
   * @private
   * @param {string} videoId - The video ID
   * @returns {Promise<string>} The HTML content
   * @throws {FailedToCreateConsentCookie} If consent cookie creation fails
   */
  private async fetchVideoPageHtml(videoId: string): Promise<string> {
    let htmlContent = await this.fetchAndDecodeHtml(videoId);

    // Handle YouTube consent cookie requirement
    if (this.isConsentPageDetected(htmlContent)) {
      this.createConsentCookie(htmlContent, videoId);
      htmlContent = await this.fetchAndDecodeHtml(videoId);

      if (this.isConsentPageDetected(htmlContent)) {
        throw new FailedToCreateConsentCookie(videoId);
      }
    }

    return htmlContent;
  }

  /**
   * Checks if the HTML content is a consent page.
   *
   * @private
   * @param {string} htmlContent - The HTML content to check
   * @returns {boolean} True if consent page detected
   */
  private isConsentPageDetected(htmlContent: string): boolean {
    return htmlContent.includes('action="https://consent.youtube.com/s"');
  }

  /**
   * Fetches HTML from YouTube watch page and decodes HTML entities.
   *
   * @private
   * @param {string} videoId - The video ID
   * @returns {Promise<string>} The decoded HTML content
   */
  private async fetchAndDecodeHtml(videoId: string): Promise<string> {
    const url = this.buildWatchUrl(videoId);
    const response = await this.httpClient.get(url);
    handleHttpErrors(response, videoId);
    const rawHtml = await response.text();
    return decode(rawHtml);
  }

  /**
   * Builds the YouTube watch URL for a video ID.
   *
   * @private
   * @param {string} videoId - The video ID
   * @returns {string} The watch URL
   */
  private buildWatchUrl(videoId: string): string {
    return YOUTUBE_WATCH_URL.replace('{video_id}', videoId);
  }

  /**
   * Creates a consent cookie from the HTML content.
   * Note: This is a placeholder - cookie handling should be implemented in the HTTP client.
   *
   * @private
   * @param {string} htmlContent - The HTML content containing consent form
   * @param {string} videoId - The video ID
   * @throws {FailedToCreateConsentCookie} If consent value cannot be extracted
   */
  private createConsentCookie(htmlContent: string, videoId: string): void {
    const consentValuePattern = /name="v" value="(.*?)"/;
    const match = htmlContent.match(consentValuePattern);

    if (!match) {
      throw new FailedToCreateConsentCookie(videoId);
    }

    // TODO: Cookie handling would need to be implemented in the HTTP client
    // This is a placeholder for the cookie setting logic
  }

  /**
   * Fetches player data from YouTube's InnerTube API.
   *
   * @private
   * @param {string} videoId - The video ID
   * @param {string} apiKey - The InnerTube API key
   * @returns {Promise<InnerTubeData>} The InnerTube player data
   */
  private async fetchInnertubePlayerData(videoId: string, apiKey: string): Promise<InnerTubeData> {
    const url = this.buildInnertubeApiUrl(apiKey);
    const requestBody = this.buildInnertubeRequestBody(videoId);

    const response = await this.httpClient.post(url, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    handleHttpErrors(response, videoId);
    return (await response.json()) as InnerTubeData;
  }

  /**
   * Builds the InnerTube API URL with the provided API key.
   *
   * @private
   * @param {string} apiKey - The API key
   * @returns {string} The complete API URL
   */
  private buildInnertubeApiUrl(apiKey: string): string {
    return INNERTUBE_API_URL.replace('{api_key}', apiKey);
  }

  /**
   * Builds the request body for InnerTube API calls.
   *
   * @private
   * @param {string} videoId - The video ID
   * @returns {object} The request body
   */
  private buildInnertubeRequestBody(videoId: string): object {
    return {
      context: INNERTUBE_CONTEXT,
      videoId: videoId
    };
  }
}
