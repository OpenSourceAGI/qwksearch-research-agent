/**
 * @fileoverview Utilities for extracting data from YouTube HTML and InnerTube API responses
 */

import {
  InnerTubeData,
  CaptionsJson,
  PlayabilityStatus,
  PlayabilityFailedReason
} from '../types';
import {
  IpBlocked,
  YouTubeDataUnparsable,
  TranscriptsDisabled,
  RequestBlocked,
  AgeRestricted,
  VideoUnavailable,
  InvalidVideoId,
  VideoUnplayable
} from '../errors';

/**
 * Extracts the InnerTube API key from YouTube's HTML page.
 *
 * @param {string} htmlContent - The HTML content from YouTube's watch page
 * @param {string} videoId - The video ID being processed
 * @returns {string} The extracted API key
 * @throws {IpBlocked} If the page contains a reCAPTCHA (IP is blocked)
 * @throws {YouTubeDataUnparsable} If the API key cannot be found
 *
 * @example
 * ```typescript
 * const html = await fetchVideoHtml(videoId);
 * const apiKey = extractInnertubeApiKey(html, videoId);
 * ```
 */
export function extractInnertubeApiKey(htmlContent: string, videoId: string): string {
  const apiKeyPattern = /"INNERTUBE_API_KEY":\s*"([a-zA-Z0-9_-]+)"/;
  const match = htmlContent.match(apiKeyPattern);

  if (match && match.length === 2) {
    return match[1];
  }

  // Check if IP is blocked (reCAPTCHA present)
  if (htmlContent.includes('class="g-recaptcha"')) {
    throw new IpBlocked(videoId);
  }

  throw new YouTubeDataUnparsable(videoId);
}

/**
 * Extracts captions JSON from YouTube's InnerTube API response.
 *
 * @param {InnerTubeData} innertubeData - The InnerTube API response data
 * @param {string} videoId - The video ID being processed
 * @returns {CaptionsJson} The extracted captions data
 * @throws {TranscriptsDisabled} If captions are disabled for the video
 *
 * @example
 * ```typescript
 * const innertubeData = await fetchInnertubeData(videoId, apiKey);
 * const captionsJson = extractCaptionsJson(innertubeData, videoId);
 * ```
 */
export function extractCaptionsJson(innertubeData: InnerTubeData, videoId: string): CaptionsJson {
  validatePlayabilityStatus(innertubeData.playabilityStatus, videoId);

  const captionsJson = innertubeData.captions?.playerCaptionsTracklistRenderer;

  if (!captionsJson || !captionsJson.captionTracks) {
    throw new TranscriptsDisabled(videoId);
  }

  return captionsJson;
}

/**
 * Validates the playability status of a video and throws appropriate errors.
 *
 * @param {any} playabilityStatusData - The playability status data from InnerTube
 * @param {string} videoId - The video ID being validated
 * @throws {RequestBlocked} If YouTube detected a bot
 * @throws {AgeRestricted} If the video is age-restricted
 * @throws {VideoUnavailable} If the video is unavailable
 * @throws {InvalidVideoId} If the video ID is invalid (URL was provided instead)
 * @throws {VideoUnplayable} If the video is unplayable for any other reason
 *
 * @example
 * ```typescript
 * validatePlayabilityStatus(innertubeData.playabilityStatus, videoId);
 * ```
 */
export function validatePlayabilityStatus(playabilityStatusData: any, videoId: string): void {
  if (!playabilityStatusData) {
    return;
  }

  const playabilityStatus = playabilityStatusData.status;

  // If status is OK, video is playable
  if (playabilityStatus === PlayabilityStatus.OK || !playabilityStatus) {
    return;
  }

  const reason = playabilityStatusData.reason;

  // Handle LOGIN_REQUIRED status
  if (playabilityStatus === PlayabilityStatus.LOGIN_REQUIRED) {
    if (reason === PlayabilityFailedReason.BOT_DETECTED) {
      throw new RequestBlocked(videoId);
    }
    if (reason === PlayabilityFailedReason.AGE_RESTRICTED) {
      throw new AgeRestricted(videoId);
    }
  }

  // Handle ERROR status
  if (playabilityStatus === PlayabilityStatus.ERROR && reason === PlayabilityFailedReason.VIDEO_UNAVAILABLE) {
    // Check if user provided a URL instead of video ID
    if (videoId.startsWith('http://') || videoId.startsWith('https://')) {
      throw new InvalidVideoId(videoId);
    }
    throw new VideoUnavailable(videoId);
  }

  // Extract additional sub-reasons if available
  const subReasons = extractPlayabilitySubreasons(playabilityStatusData);

  throw new VideoUnplayable(videoId, reason, subReasons);
}

/**
 * Extracts sub-reasons from the playability status error screen.
 *
 * @private
 * @param {any} playabilityStatusData - The playability status data
 * @returns {string[]} Array of sub-reason messages
 */
function extractPlayabilitySubreasons(playabilityStatusData: any): string[] {
  const runs = playabilityStatusData.errorScreen?.playerErrorMessageRenderer?.subreason?.runs;

  if (!runs || !Array.isArray(runs)) {
    return [];
  }

  return runs
    .map((run: any) => run.text || '')
    .filter((text: string) => text.length > 0);
}
