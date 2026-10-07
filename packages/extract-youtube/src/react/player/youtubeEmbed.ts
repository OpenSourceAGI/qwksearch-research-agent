/**
 * @fileoverview Builds YouTube embed URLs for the floating player, and talks
 * to a live embed over `postMessage`.
 *
 * YouTube identifies the embedding site by the HTTP `Referer` of the embed
 * request and answers "Video player configuration error" (error 153) when
 * there is none. The iframe sets `referrerpolicy="strict-origin-when-cross-origin"`
 * so a page-wide `no-referrer` policy cannot strip it. The document
 * Picture-in-Picture window is the other way to lose it: moving the iframe
 * into the PiP document reloads it from `about:blank`, which sends no
 * referrer — `useDocumentPictureInPicture` gives that document the page's URL
 * first. `origin` (and `widget_referrer`) are still passed, because the IFrame
 * API docs require `origin` whenever the JS API is enabled, but neither
 * replaces the header.
 */

/** The YouTube origin every embed message is scoped to. */
export const YOUTUBE_ORIGIN = 'https://www.youtube.com';

/** Human-readable messages for the error codes the IFrame API reports. */
const PLAYER_ERROR_MESSAGES: Record<number, string> = {
  2: 'This video link is invalid.',
  5: "This video can't be played in the current browser.",
  100: 'This video is private or has been removed.',
  101: "The owner doesn't allow this video to be played outside YouTube.",
  150: "The owner doesn't allow this video to be played outside YouTube.",
  153: 'YouTube blocked this embed. Reload the page or watch it on YouTube.',
};

/** Describe a YouTube IFrame API error code for display. */
export function describePlayerError(code: number): string {
  return PLAYER_ERROR_MESSAGES[code] ?? `The video player reported error ${code}.`;
}

/** The page origin YouTube should attribute the embed to, when in a browser. */
function embedOrigin(): string | null {
  if (typeof window === 'undefined') return null;
  const { origin } = window.location;
  // A document PiP / sandboxed document can report "null" — unusable as an origin.
  return origin && origin !== 'null' ? origin : null;
}

export interface EmbedOptions {
  /** Start playback automatically. */
  autoplay?: boolean;
  /** Show the native player controls. */
  controls?: boolean;
  /** Seconds to start playback from. */
  startSeconds?: number;
}

/** Build the embed URL for `videoId`, always enabling the JS API. */
export function buildEmbedUrl(videoId: string, options: EmbedOptions = {}): string {
  const { autoplay = false, controls = true, startSeconds = 0 } = options;

  const params = new URLSearchParams({
    enablejsapi: '1',
    rel: '0',
    controls: controls ? '1' : '0',
  });
  if (autoplay) params.set('autoplay', '1');
  if (startSeconds > 0) params.set('start', String(Math.floor(startSeconds)));

  const origin = embedOrigin();
  if (origin) {
    params.set('origin', origin);
    params.set('widget_referrer', origin);
  }

  return `${YOUTUBE_ORIGIN}/embed/${videoId}?${params.toString()}`;
}

/** Watch URL used by the "watch on YouTube" fallbacks. */
export function watchUrl(videoId: string, startSeconds = 0): string {
  const start = startSeconds > 0 ? `&t=${Math.floor(startSeconds)}` : '';
  return `${YOUTUBE_ORIGIN}/watch?v=${videoId}${start}`;
}

/** Thumbnail for `videoId` — handy for queue rows and video grids. */
export function thumbnailUrl(videoId: string, quality: 'default' | 'mq' | 'hq' | 'sd' | 'maxres' = 'hq'): string {
  const file = quality === 'default' ? 'default' : `${quality}default`;
  return `https://img.youtube.com/vi/${videoId}/${file}.jpg`;
}

/**
 * Ask an embed to start posting player events to this window.
 *
 * YouTube only sends `onStateChange` / `onError` messages to a parent that has
 * completed this handshake, so without it an embed that fails renders its own
 * error screen and the app never learns about it.
 */
export function startListening(iframe: HTMLIFrameElement | null): void {
  iframe?.contentWindow?.postMessage(
    JSON.stringify({ event: 'listening', id: iframe.id || 'floating-youtube-player', channel: 'widget' }),
    YOUTUBE_ORIGIN,
  );
}

/** Commands the floating player sends to its embed. */
export type PlayerCommand = 'playVideo' | 'pauseVideo' | 'setPlaybackRate' | 'seekTo' | 'setVolume' | 'mute' | 'unMute';

/** Send a command to a YouTube embed via `postMessage`. */
export function sendCommand(iframe: HTMLIFrameElement | null, func: PlayerCommand, args: unknown[] = []): void {
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), YOUTUBE_ORIGIN);
}
