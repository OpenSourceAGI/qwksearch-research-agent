/**
 * @fileoverview Decides how a video search result should be played: inline
 * (embedded iframe) when it carries a safe, embeddable `iframe_src`, or as an
 * external link otherwise.
 */

export interface VideoPlaybackSource {
  url?: string;
  iframe_src?: string;
}

export type VideoPlaybackTarget =
  | { type: 'inline'; src: string }
  | { type: 'external'; url: string };

/**
 * `iframe_src` on video results can come from third-party search backends
 * (e.g. a configured SearXNG instance), so it's validated as an http(s) URL
 * before being used as an iframe src — never trust it directly into a DOM sink.
 */
function isEmbeddableUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function getVideoPlaybackTarget(source: VideoPlaybackSource): VideoPlaybackTarget {
  if (source.iframe_src && isEmbeddableUrl(source.iframe_src)) {
    return { type: 'inline', src: source.iframe_src };
  }
  return { type: 'external', url: source.url || '' };
}
