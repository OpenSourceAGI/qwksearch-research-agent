/**
 * @fileoverview Adapter helpers bridging the `extract-youtube` transcript API to
 * the `getURLYoutubeVideo` / `convertYoutubeToText` helpers expected by the URL
 * content extractor. Keeps the extractor decoupled from the transcript library's
 * concrete API surface.
 */

import { YouTubeTranscriptApi } from "extract-youtube";

/**
 * Extracts the 11-character YouTube video id from a URL, if present.
 *
 * @param {string} url - A URL that may point to a YouTube video.
 * @returns {string | null} The video id, or null when the URL is not a YouTube link.
 */
export function getURLYoutubeVideo(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  const match =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/.exec(
      url,
    );
  return match ? match[1] : null;
}

/**
 * Fetches a YouTube video transcript and returns it as a simple HTML document.
 *
 * @param {string} url - The YouTube video URL.
 * @param {{ languages?: string[] }} [options] - Optional transcript languages.
 * @returns {Promise<Record<string, any>>} An extraction response with `html`, or `{ error }`.
 */
export async function convertYoutubeToText(
  url: string,
  options: { languages?: string[] } = {},
): Promise<Record<string, any>> {
  const videoId = getURLYoutubeVideo(url);
  if (!videoId) return { error: "Not a valid YouTube URL" };

  try {
    const api = new YouTubeTranscriptApi();
    const transcript = await api.fetch(videoId, {
      languages: options?.languages?.length ? options.languages : ["en"],
    });

    const text = transcript.snippets
      .map((snippet) => snippet.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) return { error: "No transcript available for this video" };

    return {
      html: `<p>${text}</p>`,
      title: `YouTube Video ${videoId}`,
      source: "YouTube",
      url,
    };
  } catch (error: any) {
    return {
      error: error?.message || "Failed to fetch YouTube transcript",
    };
  }
}
