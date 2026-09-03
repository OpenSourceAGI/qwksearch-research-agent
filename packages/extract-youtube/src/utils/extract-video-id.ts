/**
 * @fileoverview Pulls an 11-character YouTube video ID out of any of the URL
 * shapes YouTube uses (watch, youtu.be, embed, shorts, live) or passes a bare
 * ID straight through.
 */

const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extracts a YouTube video ID from a URL or returns the input unchanged if
 * it already looks like a bare video ID.
 *
 * @param {string} input - A YouTube URL (watch/youtu.be/embed/shorts/live) or a raw video ID
 * @returns {string | null} The 11-character video ID, or null if none could be found
 *
 * @example
 * ```typescript
 * extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ') // 'dQw4w9WgXcQ'
 * extractVideoId('https://youtu.be/dQw4w9WgXcQ?t=30')            // 'dQw4w9WgXcQ'
 * extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')   // 'dQw4w9WgXcQ'
 * extractVideoId('dQw4w9WgXcQ')                                  // 'dQw4w9WgXcQ'
 * ```
 */
export function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (VIDEO_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');

    if (host === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0];
      return VIDEO_ID_PATTERN.test(id) ? id : null;
    }

    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (url.pathname === '/watch') {
        const id = url.searchParams.get('v');
        return id && VIDEO_ID_PATTERN.test(id) ? id : null;
      }
      const match = url.pathname.match(/^\/(embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
      if (match) return match[2];
    }

    return null;
  } catch {
    // Not a valid absolute URL — last resort, look for a v= param or an
    // embed/shorts/live path segment anywhere in the string.
    const paramMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (paramMatch) return paramMatch[1];
    const pathMatch = trimmed.match(/(?:embed|shorts|live|youtu\.be)\/([a-zA-Z0-9_-]{11})/);
    if (pathMatch) return pathMatch[1];
    return null;
  }
}
