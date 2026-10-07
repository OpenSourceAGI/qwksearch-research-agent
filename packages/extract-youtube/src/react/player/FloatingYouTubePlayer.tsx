/**
 * @fileoverview A floating, draggable, resizable YouTube player that keeps
 * playing while the user moves around the app.
 *
 * Mount it once near the root of your app and drive it from anywhere with
 * `youtubePlayer.play({ videoId })` — it renders through a portal into
 * `document.body`, so it is unaffected by whatever stacking context, overflow
 * or route remount is happening in the tree around it.
 *
 * Ported from the persistent video player used in production on
 * debate-ai.com, with everything app-specific stripped out: no design system,
 * no state library, no domain concepts. App-specific chrome (a speed control
 * framed for your users, a bookmark button, a share menu) plugs in through
 * `extraControls` and `renderTitle` instead of being baked in here.
 */

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle } from 'lucide-react';

import { PlayerControls } from './PlayerControls';
import { PlayerQueue } from './PlayerQueue';
import { PlayerResizeHandles } from './PlayerResizeHandles';
import { PlayerSubtitles } from './PlayerSubtitles';
import { useDocumentPictureInPicture } from './useDocumentPictureInPicture';
import { useDragResize } from './useDragResize';
import { ensureStyles } from './styles';
import { buildEmbedUrl, describePlayerError, startListening, watchUrl } from './youtubeEmbed';
import {
  clearPlayerState,
  DEFAULT_STORAGE_KEY,
  loadPlayerState,
  loadVideoPosition,
  savePlayerState,
  saveVideoPosition,
} from './playerPersistence';
import {
  currentTimeRef,
  getPlayerState,
  internalPlayerActions,
  loadPositionRef,
  playerIframeRef,
  savePositionRef,
  usePlayerState,
  youtubePlayer,
  type PlayerVideo,
} from './playerStore';
import { useTranscript, type TranscriptSource } from '../transcript';
import { groupIntoSentences } from '../sentences';

/** What a host app's custom controls are handed when they render. */
export interface PlayerControlContext {
  video: PlayerVideo;
  isPlaying: boolean;
  isMinimized: boolean;
  /** Current playback rate — mirror it to render a custom speed control's state. */
  playbackRate: number;
  queue: PlayerVideo[];
  /** Best-effort playback position, in seconds. */
  getCurrentTime: () => number;
  /** The same imperative API you can import directly; passed for convenience. */
  player: typeof youtubePlayer;
}

export interface FloatingYouTubePlayerProps extends TranscriptSource {
  /**
   * Extra buttons for the control strip, rendered between play/pause and the
   * built-in controls. This is where app-specific chrome belongs — style the
   * buttons with `className="eytp-btn"` to match the rest of the strip.
   */
  extraControls?: ReactNode | ((context: PlayerControlContext) => ReactNode);
  /** Custom title-bar content (badges, links, metadata). Defaults to the video title. */
  renderTitle?: (context: PlayerControlContext) => ReactNode;
  /**
   * Force the captions button on or off. By default it shows only for videos
   * that turned out to have a transcript — needs `transcriptUrl` or
   * `fetchTranscript` to check for one at all.
   */
  showSubtitles?: boolean;
  /** Show the picture-in-picture button where the browser supports it. Default true. */
  showPictureInPicture?: boolean;
  /**
   * localStorage key for "still playing this, at this spot, after a reload".
   * Pass `null` to turn persistence off entirely.
   */
  storageKey?: string | null;
  /** Extra class on the player's root element, for host-side positioning or theming. */
  className?: string;
  /** Called when the user closes the player. */
  onClose?: () => void;
  /** Resize bounds, in px. */
  minWidth?: number;
  maxWidth?: number;
}

function FloatingPlayerWidget({
  extraControls,
  renderTitle,
  showSubtitles: showSubtitlesProp,
  showPictureInPicture = true,
  storageKey = DEFAULT_STORAGE_KEY,
  className,
  onClose,
  minWidth,
  maxWidth,
  transcriptUrl,
  fetchTranscript,
}: FloatingYouTubePlayerProps) {
  const { activeVideo, isMinimized, isPlaying, playbackRate, queue, startTime } = usePlayerState();

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoWrapperRef = useRef<HTMLDivElement | null>(null);

  const {
    isSupported: isPipSupported,
    isActive: isPipActive,
    pipWindow,
    toggle: togglePip,
    exit: exitPip,
  } = useDocumentPictureInPicture(videoWrapperRef);

  const [subtitlesOpen, setSubtitlesOpen] = useState(false);
  const [subtitleTime, setSubtitleTime] = useState(0);
  // Error code reported by the YouTube IFrame API for the current load, if any.
  const [playerError, setPlayerError] = useState<number | null>(null);
  // Bumped to force a fresh iframe when the user retries after an error.
  const [reloadKey, setReloadKey] = useState(0);
  // Position to resume from after a reload the player causes itself: popping
  // the iframe in or out of the PiP window re-creates it, restarting at 0.
  const [resumeSeconds, setResumeSeconds] = useState<number | null>(null);

  // Playback-time tracking. YouTube's `infoDelivery` messages are the source of
  // truth when they arrive; between them the elapsed wall-clock time since the
  // last play event fills the gap.
  const playStartedAtRef = useRef<number | null>(null);
  const timeOffsetRef = useRef(0);
  // Whether the current embed still needs the host's playback rate applied.
  const pendingRateRef = useRef(false);

  const { position, isDragging, isResizing, playerWidth, startDrag, startResize } = useDragResize(containerRef, {
    minWidth,
    maxWidth,
  });

  const hasTranscriptSource = Boolean(transcriptUrl || fetchTranscript);

  // Every video that plays gets checked for a transcript, whether or not the
  // subtitles panel is open: that check is what decides whether the subtitles
  // control is offered at all. A video without usable captions simply doesn't
  // get the control — no error is surfaced for it.
  const { snippets: cues } = useTranscript(activeVideo?.videoId ?? null, hasTranscriptSource, {
    transcriptUrl,
    fetchTranscript,
  });

  // Cues are cut for on-screen display and break mid-clause; read as prose
  // instead by regrouping them into sentences.
  const sentences = useMemo(() => (cues ? groupIntoSentences(cues) : []), [cues]);
  const showSubtitles = showSubtitlesProp ?? sentences.length > 0;

  const setIframeRef = useCallback((el: HTMLIFrameElement | null) => {
    iframeRef.current = el;
    playerIframeRef.current = el;
  }, []);

  /** Current estimated playback position, in seconds. */
  const getCurrentTime = useCallback((): number => {
    if (playStartedAtRef.current !== null) {
      return timeOffsetRef.current + (Date.now() - playStartedAtRef.current) / 1000;
    }
    return timeOffsetRef.current;
  }, []);

  /** Write the whole widget's state to storage, so a reload picks up where it left off. */
  const persistState = useCallback(() => {
    if (!storageKey) return;
    const state = { activeVideo, isMinimized, playbackRate, queue };
    if (!state.activeVideo) return;
    savePlayerState(storageKey, {
      video: state.activeVideo,
      isMinimized: state.isMinimized,
      playbackRate: state.playbackRate,
      queue: state.queue,
      savedTime: getCurrentTime(),
    });
  }, [storageKey, activeVideo, isMinimized, playbackRate, queue, getCurrentTime]);

  // Publish this instance's time getter and position store to the module-level
  // API, so `youtubePlayer.play()` can resume a video from anywhere.
  useEffect(() => {
    currentTimeRef.current = getCurrentTime;
    savePositionRef.current = storageKey ? (videoId, seconds) => saveVideoPosition(storageKey, videoId, seconds) : null;
    loadPositionRef.current = storageKey ? (videoId) => loadVideoPosition(storageKey, videoId) : null;
    return () => {
      currentTimeRef.current = null;
      savePositionRef.current = null;
      loadPositionRef.current = null;
    };
  }, [getCurrentTime, storageKey]);

  // On mount, pick up whatever was playing before the last reload — unless the
  // app already started something itself (it can call `play()` before the
  // player mounts), in which case that wins.
  useEffect(() => {
    if (!storageKey || getPlayerState().activeVideo) return;
    const saved = loadPlayerState(storageKey);
    if (!saved) return;
    timeOffsetRef.current = saved.savedTime;
    playStartedAtRef.current = null;
    internalPlayerActions.restore({
      activeVideo: saved.video,
      isMinimized: saved.isMinimized,
      playbackRate: saved.playbackRate,
      queue: saved.queue,
      startTime: saved.savedTime,
      isPlaying: true,
    });
    // Intentionally mount-only: this is a one-shot restore, not a sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const videoId = activeVideo?.videoId ?? null;

  // A new video starts from a clean slate: no stale error, no resume offset,
  // and the host's playback rate re-applied once it starts playing.
  useEffect(() => {
    if (!videoId) return;
    setPlayerError(null);
    setResumeSeconds(null);
    pendingRateRef.current = true;
  }, [videoId]);

  // Reset time tracking on every new load. Keyed on the offset as well as the
  // id, because re-opening the *same* video at a different point (a chapter
  // link, say) re-creates the embed without the id ever changing.
  const loadKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!videoId) return;
    const loadKey = `${videoId}@${startTime}`;
    if (loadKeyRef.current === loadKey) return;
    loadKeyRef.current = loadKey;
    timeOffsetRef.current = startTime;
    playStartedAtRef.current = null;
  }, [videoId, startTime]);

  // Listen for the embed's state, error and playback-time messages. While
  // popped out the embed's parent is the PiP window, so listen there too.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return;
      let data: { event?: string; info?: any };
      try {
        data = JSON.parse(event.data);
      } catch {
        return; // not one of YouTube's JSON messages
      }

      if (data.event === 'onError') {
        const code = typeof data.info === 'number' ? data.info : Number(data.info?.errorCode);
        if (!Number.isNaN(code)) setPlayerError(code);
        return;
      }

      if (data.event === 'onStateChange') {
        setPlayerError(null);
        if (data.info === 1 || data.info === 3) {
          // Playing or buffering — start counting.
          if (playStartedAtRef.current === null) playStartedAtRef.current = Date.now();
          internalPlayerActions.setIsPlaying(true);
          // The embed only accepts a rate once it is actually running, so a
          // rate carried over from the previous video (or a restore) is
          // re-applied on the first play event of each new load.
          if (pendingRateRef.current) {
            pendingRateRef.current = false;
            if (playbackRate !== 1) youtubePlayer.setPlaybackRate(playbackRate);
          }
        } else if (data.info === 2 || data.info === 0) {
          // Paused or ended — bank the elapsed time.
          if (playStartedAtRef.current !== null) {
            timeOffsetRef.current += (Date.now() - playStartedAtRef.current) / 1000;
            playStartedAtRef.current = null;
          }
          internalPlayerActions.setIsPlaying(false);
          persistState();
        }
        return;
      }

      if (data.event === 'infoDelivery' && data.info) {
        // Older embeds report failures through infoDelivery rather than onError.
        if (data.info.errorCode != null) {
          const code = Number(data.info.errorCode);
          if (!Number.isNaN(code)) setPlayerError(code);
        }
        if (data.info.currentTime != null) {
          const reported = data.info.currentTime as number;
          timeOffsetRef.current = reported;
          if (playStartedAtRef.current !== null) playStartedAtRef.current = Date.now();
          if (subtitlesOpen) setSubtitleTime(reported);
        }
        if (data.info.playbackRate != null) {
          internalPlayerActions.setPlaybackRate(Number(data.info.playbackRate));
        }
      }
    };

    window.addEventListener('message', handleMessage);
    pipWindow?.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      pipWindow?.removeEventListener('message', handleMessage);
    };
  }, [persistState, subtitlesOpen, playbackRate, pipWindow]);

  // Re-send the "listening" handshake for a few seconds after every embed load.
  // `onLoad` alone isn't enough: React's delegated events stop reaching the
  // iframe once it is moved into the PiP window, and YouTube ignores commands
  // until the handshake lands, so retry until the embed is ready.
  useEffect(() => {
    if (!videoId) return;
    let attempts = 0;
    startListening(iframeRef.current);
    const interval = setInterval(() => {
      startListening(iframeRef.current);
      if (++attempts >= 12) clearInterval(interval);
    }, 400);
    return () => clearInterval(interval);
  }, [videoId, reloadKey, resumeSeconds, isPipActive]);

  // Checkpoint the position periodically while playing, and whenever the page
  // goes away — a mobile browser backgrounding the tab never fires `unload`.
  useEffect(() => {
    if (!isPlaying || !videoId) return;
    const interval = setInterval(persistState, 10_000);
    return () => clearInterval(interval);
  }, [isPlaying, videoId, persistState]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') persistState();
    };
    window.addEventListener('beforeunload', persistState);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', persistState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [persistState]);

  /**
   * Moving the iframe into (or out of) the PiP window re-creates it, so capture
   * where playback is first and hand it back to the fresh embed as `start`.
   */
  const handleTogglePip = useCallback(() => {
    setResumeSeconds(getCurrentTime());
    void togglePip();
  }, [getCurrentTime, togglePip]);

  /** Re-create the embed after an error, resuming from the tracked position. */
  const handleRetry = useCallback(() => {
    setPlayerError(null);
    setResumeSeconds(getCurrentTime());
    setReloadKey((key) => key + 1);
  }, [getCurrentTime]);

  const handleClose = useCallback(() => {
    exitPip();
    // An explicit close means "don't bring this back" — drop the saved widget
    // state, but keep the per-video positions so re-opening still resumes.
    if (storageKey) clearPlayerState(storageKey);
    youtubePlayer.close();
    onClose?.();
  }, [exitPip, storageKey, onClose]);

  const handleToggleSubtitles = useCallback(() => {
    setSubtitlesOpen((open) => {
      const next = !open;
      if (next && isMinimized) youtubePlayer.setMinimized(false);
      return next;
    });
  }, [isMinimized]);

  if (!activeVideo) return null;

  const context: PlayerControlContext = {
    video: activeVideo,
    isPlaying,
    isMinimized,
    playbackRate,
    queue,
    getCurrentTime,
    player: youtubePlayer,
  };

  const title = activeVideo.title ?? 'Playing video';
  const startSeconds = resumeSeconds ?? startTime;
  const embedSrc = buildEmbedUrl(activeVideo.videoId, { autoplay: true, controls: true, startSeconds });

  const style: React.CSSProperties = {
    ...(position ? { left: position.x, top: position.y, bottom: 'auto', right: 'auto' } : {}),
    ...(playerWidth && !isMinimized ? { width: playerWidth } : {}),
  };

  return (
    <div
      ref={containerRef}
      className={`eytp-root${isMinimized ? ' eytp-minimized' : ''}${
        isDragging || isResizing ? ' eytp-interacting' : ''
      }${className ? ` ${className}` : ''}`}
      style={style}
    >
      <div
        className={`eytp-bar${isDragging ? ' eytp-grabbing' : ''}`}
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('button, a')) return;
          e.preventDefault();
          startDrag(e.clientX, e.clientY);
        }}
        onTouchStart={(e) => {
          if ((e.target as HTMLElement).closest('button, a')) return;
          startDrag(e.touches[0].clientX, e.touches[0].clientY);
        }}
      >
        <div className="eytp-title">
          {renderTitle ? renderTitle(context) : <span className="eytp-title-text">{title}</span>}
        </div>
        <PlayerControls
          isPlaying={isPlaying}
          isMinimized={isMinimized}
          queueLength={queue.length}
          isPipSupported={isPipSupported}
          isPipActive={isPipActive}
          isSubtitlesOpen={subtitlesOpen}
          showSubtitles={showSubtitles}
          showPip={showPictureInPicture}
          extraControls={typeof extraControls === 'function' ? extraControls(context) : extraControls}
          onPlayPause={youtubePlayer.togglePlay}
          onPlayNext={youtubePlayer.playNext}
          onToggleMinimize={() => youtubePlayer.setMinimized(!isMinimized)}
          onTogglePip={handleTogglePip}
          onToggleSubtitles={handleToggleSubtitles}
          onClose={handleClose}
        />
      </div>

      {subtitlesOpen && !isMinimized && (
        <PlayerSubtitles sentences={sentences} currentTime={subtitleTime} onSeek={youtubePlayer.seekTo} />
      )}

      {/* Hidden via CSS when minimized so playback is never interrupted. While
          popped out this node lives in the PiP window, where it is always shown. */}
      <div
        ref={videoWrapperRef}
        className={`eytp-video${isPipActive ? ' eytp-pip' : ''}${isMinimized && !isPipActive ? ' eytp-hidden' : ''}`}
      >
        <iframe
          key={reloadKey}
          ref={setIframeRef}
          src={embedSrc}
          title={title}
          onLoad={() => startListening(iframeRef.current)}
          className="eytp-iframe"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />

        {playerError !== null && (
          <div className="eytp-error">
            <AlertCircle size={18} color="currentColor" />
            <p className="eytp-error-text">{describePlayerError(playerError)}</p>
            <div className="eytp-error-actions">
              <button type="button" onClick={handleRetry} className="eytp-link">
                Retry
              </button>
              <a
                href={watchUrl(activeVideo.videoId, getCurrentTime())}
                target="_blank"
                rel="noopener noreferrer"
                className="eytp-link"
              >
                Watch on YouTube
              </a>
            </div>
          </div>
        )}
      </div>

      {!isMinimized && !isPipActive && <PlayerQueue queue={queue} />}
      {!isMinimized && <PlayerResizeHandles isResizing={isResizing} startResize={startResize} />}
    </div>
  );
}

/**
 * Mount once, near the root of your app. Renders into `document.body` through
 * a portal, so nothing in the tree around it can clip, hide or remount the
 * playing video.
 */
export function FloatingYouTubePlayer(props: FloatingYouTubePlayerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    ensureStyles(document);
    setMounted(true);
  }, []);

  // The portal target only exists in the browser, so the first (server or
  // hydration) pass renders nothing.
  if (!mounted) return null;

  return createPortal(<FloatingPlayerWidget {...props} />, document.body);
}
