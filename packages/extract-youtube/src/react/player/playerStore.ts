/**
 * @fileoverview The floating player's state, as a tiny module-level store.
 *
 * Deliberately not zustand/redux/context: the player is mounted once at the
 * root of an app and driven from anywhere else in it (a video grid, a search
 * result, a keyboard shortcut), so the store has to be reachable without a
 * provider — and this package shouldn't force a state library on consumers.
 * `useSyncExternalStore` gives React-correct subscriptions in ~30 lines.
 */

'use client';

import { useSyncExternalStore } from 'react';
import { sendCommand, type PlayerCommand } from './youtubeEmbed';

/** A video the player can play. `meta` is yours — the player only passes it back. */
export interface PlayerVideo {
  videoId: string;
  title?: string;
  meta?: Record<string, unknown>;
}

export interface PlayerState {
  activeVideo: PlayerVideo | null;
  isMinimized: boolean;
  isPlaying: boolean;
  /** Current playback rate, mirrored so custom controls can render their own state. */
  playbackRate: number;
  queue: PlayerVideo[];
  /** Seconds the current embed was told to start from (YouTube's `start` param). */
  startTime: number;
}

const initialState: PlayerState = {
  activeVideo: null,
  isMinimized: false,
  isPlaying: false,
  playbackRate: 1,
  queue: [],
  startTime: 0,
};

let state: PlayerState = initialState;
const listeners = new Set<() => void>();

function setState(partial: Partial<PlayerState>): void {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Read the current state outside React (event handlers, imperative code). */
export function getPlayerState(): PlayerState {
  return state;
}

/**
 * Subscribe a component to the player's state.
 *
 * The whole state object is returned rather than a selector slice: its
 * identity only changes when something actually changed, so this stays cheap,
 * and it keeps `useSyncExternalStore`'s snapshot stable without extra
 * memoisation on the caller's side.
 */
export function usePlayerState(): PlayerState {
  return useSyncExternalStore(subscribe, getPlayerState, () => initialState);
}

/**
 * Subscribe to one derived value of the player's state — e.g.
 * `usePlayerSelector((s) => s.activeVideo?.videoId === id)`. The component
 * re-renders only when that value changes, which is what a grid of hundreds
 * of cards needs: with `usePlayerState` every card re-renders on every
 * play/pause, queue add or rate change. Return a primitive (or a stable
 * reference), not a fresh object, or it re-renders every time.
 */
export function usePlayerSelector<T>(selector: (state: PlayerState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(initialState),
  );
}

/** The live embed, registered by the mounted player so commands can reach it. */
export const playerIframeRef: { current: HTMLIFrameElement | null } = { current: null };

/**
 * Playback position getter, registered by the mounted player. Kept here so
 * `youtubePlayer.getCurrentTime()` works from anywhere, and so switching
 * videos can save the outgoing one's position.
 */
export const currentTimeRef: { current: (() => number) | null } = { current: null };

/** Send a raw IFrame-API command to the live embed. */
export function sendPlayerCommand(func: PlayerCommand, args: unknown[] = []): void {
  sendCommand(playerIframeRef.current, func, args);
}

/**
 * Position persistence, registered by the mounted player (which is the thing
 * that knows whether persistence is on and under which storage key). Left null
 * when persistence is disabled, in which case positions are simply not kept.
 */
export const savePositionRef: { current: ((videoId: string, seconds: number) => void) | null } = {
  current: null,
};
export const loadPositionRef: { current: ((videoId: string) => number | null) | null } = {
  current: null,
};

export interface PlayOptions {
  /** Start at this many seconds instead of the video's remembered position. */
  startSeconds?: number;
  /** Playback rate to apply once the video starts. Defaults to the current rate. */
  playbackRate?: number;
}

/**
 * Imperative API for driving the mounted `<FloatingYouTubePlayer />`.
 *
 * Import it anywhere — a grid, a card, a hotkey handler — and call
 * `youtubePlayer.play({ videoId })`. Nothing here needs the player to be
 * mounted yet; state set before mount is picked up when it mounts.
 */
export const youtubePlayer = {
  /** Open `video` in the player, replacing whatever is playing. */
  play(video: PlayerVideo, options: PlayOptions = {}): void {
    const previous = state.activeVideo;
    // Remember where the outgoing video got to, so re-opening it resumes.
    if (previous && previous.videoId !== video.videoId && currentTimeRef.current) {
      const elapsed = currentTimeRef.current();
      if (elapsed > 0) savePositionRef.current?.(previous.videoId, elapsed);
    }
    // An explicit start time wins over the video's own remembered position.
    const startTime = options.startSeconds ?? loadPositionRef.current?.(video.videoId) ?? 0;
    setState({
      activeVideo: video,
      isMinimized: false,
      isPlaying: true,
      startTime,
      playbackRate: options.playbackRate ?? state.playbackRate,
    });
  },

  /** Close the player and clear the active video. */
  close(): void {
    setState({ activeVideo: null, isPlaying: false, isMinimized: false, startTime: 0 });
  },

  /** Collapse the player to its title bar (playback continues) or expand it again. */
  setMinimized(minimized: boolean): void {
    setState({ isMinimized: minimized });
  },

  /** Resume the current video. */
  resume(): void {
    sendPlayerCommand('playVideo');
    setState({ isPlaying: true });
  },

  /** Pause the current video. */
  pause(): void {
    sendPlayerCommand('pauseVideo');
    setState({ isPlaying: false });
  },

  /** Pause if playing, resume if paused. */
  togglePlay(): void {
    if (state.isPlaying) youtubePlayer.pause();
    else youtubePlayer.resume();
  },

  /** Jump to `seconds` into the current video and keep playing. */
  seekTo(seconds: number): void {
    sendPlayerCommand('seekTo', [seconds, true]);
    sendPlayerCommand('playVideo');
  },

  /**
   * Set playback speed (YouTube accepts 0.25–2). This is the hook custom
   * controls use — e.g. a "slow it down" button in a host app.
   */
  setPlaybackRate(rate: number): void {
    sendPlayerCommand('setPlaybackRate', [rate]);
    setState({ playbackRate: rate });
  },

  /** Best-effort current playback position, in seconds. */
  getCurrentTime(): number {
    return currentTimeRef.current?.() ?? 0;
  },

  /** Queue `video` to play after the current one. Ignores duplicates. */
  addToQueue(video: PlayerVideo): void {
    if (state.queue.some((item) => item.videoId === video.videoId)) return;
    setState({ queue: [...state.queue, video] });
  },

  /** Drop `videoId` from the queue. */
  removeFromQueue(videoId: string): void {
    setState({ queue: state.queue.filter((item) => item.videoId !== videoId) });
  },

  /** Replace the whole queue — e.g. "play all" over a grid of videos. */
  setQueue(videos: PlayerVideo[]): void {
    setState({ queue: videos });
  },

  /** Empty the queue without touching what's playing. */
  clearQueue(): void {
    setState({ queue: [] });
  },

  /** Play the next queued video, or close the player if the queue is empty. */
  playNext(): void {
    const [next, ...rest] = state.queue;
    if (!next) {
      youtubePlayer.close();
      return;
    }
    setState({
      activeVideo: next,
      queue: rest,
      isMinimized: false,
      isPlaying: true,
      startTime: 0,
    });
  },
};

/** Internal: used by the mounted player to reflect embed events back into state. */
export const internalPlayerActions = {
  setIsPlaying: (isPlaying: boolean) => setState({ isPlaying }),
  setPlaybackRate: (playbackRate: number) => setState({ playbackRate }),
  /** Restore a full snapshot from persistence, without the play() side effects. */
  restore: (snapshot: Partial<PlayerState>) => setState(snapshot),
};
