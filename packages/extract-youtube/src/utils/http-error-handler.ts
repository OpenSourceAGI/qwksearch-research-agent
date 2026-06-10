/**
 * @fileoverview HTTP error handling utilities for YouTube API requests
 */

import { IpBlocked, YouTubeRequestFailed } from '../errors';

/**
 * Checks an HTTP response and throws appropriate errors if the request failed.
 *
 * @param {Response} response - The HTTP response to check
 * @param {string} videoId - The video ID associated with the request
 * @throws {IpBlocked} If status is 429 (Too Many Requests)
 * @throws {YouTubeRequestFailed} If status indicates an error
 *
 * @example
 * ```typescript
 * const response = await httpClient.get(url);
 * handleHttpErrors(response, videoId);
 * // If we reach here, the request was successful
 * ```
 */
export function handleHttpErrors(response: Response, videoId: string): void {
  if (response.status === 429) {
    throw new IpBlocked(videoId);
  }

  if (!response.ok) {
    const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    throw new YouTubeRequestFailed(videoId, new Error(errorMessage));
  }
}
