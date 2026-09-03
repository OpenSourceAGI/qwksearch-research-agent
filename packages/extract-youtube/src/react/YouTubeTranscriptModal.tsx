/**
 * @fileoverview Popout modal: a YouTube player alongside its transcript, with
 * the transcript synced to playback — the currently spoken line is
 * highlighted and auto-scrolled, an approximate per-word sweep highlights
 * across the active line, and clicking any line seeks the player there.
 *
 * Ported from debate-ai.com's `TranscriptModal` component. This version has
 * no dependency on any particular design system — it ships its own minimal,
 * self-contained styles (see the injected `<style>` block below) so it drops
 * into any React app. The only required peer is `lucide-react` for icons.
 *
 * This component only renders the UI. It does not fetch captions itself —
 * `extractVideoId` and caption fetching (`YouTubeTranscriptApi`) run from
 * this package's main entry point on your server, and this component reads
 * the result via `transcriptUrl` or `fetchTranscript`. See the package
 * README's "React popout modal" section for the full wiring.
 */

'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Captions, Loader2, AlertCircle, X } from 'lucide-react';

export interface TranscriptSnippet {
  text: string;
  start: number;
  duration: number;
}

export interface YouTubeTranscriptModalProps {
  /** The YouTube video ID (not a full URL — use `extractVideoId` first if needed). */
  videoId: string;
  /** Shown in the modal header and as the iframe's accessible title. */
  title?: string;
  /**
   * URL of your own backend endpoint that returns `{ snippets }` (or
   * `{ error }`) for this `videoId`, e.g. `/api/transcript?videoId=...`.
   * Fetched with `fetch()` when the modal opens. Ignored if `fetchTranscript`
   * or `snippets` is provided.
   */
  transcriptUrl?: string;
  /** Custom transcript loader, if you don't want to hit a URL directly. */
  fetchTranscript?: (videoId: string) => Promise<{ snippets: TranscriptSnippet[]; error?: string }>;
  /** Pass snippets directly to skip fetching entirely (e.g. already loaded server-side). */
  snippets?: TranscriptSnippet[];
  /** Custom trigger element. Defaults to a small captions-icon button. */
  trigger?: ReactNode;
  /** Called whenever the modal opens or closes. */
  onOpenChange?: (open: boolean) => void;
}

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? m.toString().padStart(2, '0') : m.toString();
  const ss = s.toString().padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const TranscriptLine = forwardRef<
  HTMLButtonElement,
  {
    snippet: TranscriptSnippet;
    isActive: boolean;
    currentTime: number;
    onSeek: () => void;
  }
>(function TranscriptLine({ snippet, isActive, currentTime, onSeek }, ref) {
  const words = useMemo(() => snippet.text.split(/\s+/).filter(Boolean), [snippet.text]);

  // Words don't carry their own timestamps — approximate a karaoke-style
  // sweep by spreading the snippet's duration evenly across its words.
  const activeWordIndex =
    isActive && snippet.duration > 0
      ? Math.min(
          words.length - 1,
          Math.max(0, Math.floor(((currentTime - snippet.start) / snippet.duration) * words.length)),
        )
      : -1;

  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSeek();
      }}
      className={`eyt-line${isActive ? ' eyt-line-active' : ''}`}
    >
      <span className="eyt-line-time">{formatTime(snippet.start)}</span>
      <span className="eyt-line-text">
        {words.map((word, i) => (
          <span key={i} className={i === activeWordIndex ? 'eyt-word-active' : undefined}>
            {word}{' '}
          </span>
        ))}
      </span>
    </button>
  );
});

export function YouTubeTranscriptModal({
  videoId,
  title,
  transcriptUrl,
  fetchTranscript,
  snippets: providedSnippets,
  trigger,
  onOpenChange,
}: YouTubeTranscriptModalProps) {
  const [open, setOpen] = useState(false);
  const [snippets, setSnippets] = useState<TranscriptSnippet[] | null>(providedSnippets ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lineRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const setOpenState = useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  // Fetch the transcript whenever the modal is opened (unless snippets were
  // provided directly).
  useEffect(() => {
    if (!open || providedSnippets) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSnippets(null);
    setCurrentTime(0);

    const load = fetchTranscript
      ? fetchTranscript(videoId)
      : transcriptUrl
        ? fetch(transcriptUrl.includes('videoId=') ? transcriptUrl : `${transcriptUrl}${transcriptUrl.includes('?') ? '&' : '?'}videoId=${encodeURIComponent(videoId)}`)
            .then((res) => res.json() as Promise<{ snippets: TranscriptSnippet[]; error?: string }>)
        : Promise.resolve({ snippets: [], error: 'No transcriptUrl or fetchTranscript provided' });

    load
      .then((data) => {
        if (cancelled) return;
        if (!data || data.error) {
          setError(data?.error || 'Failed to load transcript');
          return;
        }
        setSnippets(data.snippets ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load transcript');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, videoId, transcriptUrl, fetchTranscript, providedSnippets]);

  // Listen for the YouTube embed's periodic playback-time broadcasts.
  useEffect(() => {
    if (!open) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return;
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'infoDelivery' && data.info?.currentTime != null) {
          setCurrentTime(data.info.currentTime);
        }
      } catch {
        // ignore non-JSON messages
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenState(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, setOpenState]);

  // Handshake the embed into broadcasting `infoDelivery` messages once loaded.
  const handleIframeLoad = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'listening', id: videoId, channel: 'widget' }),
      'https://www.youtube.com',
    );
  }, [videoId]);

  const seekTo = useCallback((seconds: number) => {
    const contentWindow = iframeRef.current?.contentWindow;
    if (!contentWindow) return;
    contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }),
      'https://www.youtube.com',
    );
    contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
      'https://www.youtube.com',
    );
  }, []);

  const activeIndex = useMemo(() => {
    if (!snippets || snippets.length === 0) return -1;
    let idx = -1;
    for (let i = 0; i < snippets.length; i++) {
      if (snippets[i].start <= currentTime) idx = i;
      else break;
    }
    return idx;
  }, [snippets, currentTime]);

  // Keep the active line in view as playback advances.
  useEffect(() => {
    if (activeIndex < 0) return;
    lineRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeIndex]);

  return (
    <>
      <style>{EYT_STYLES}</style>

      {trigger ? (
        <span onClick={() => setOpenState(true)}>{trigger}</span>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpenState(true);
          }}
          className="eyt-trigger"
          aria-label="View transcript"
          title="Transcript"
        >
          <Captions size={16} />
        </button>
      )}

      {open && (
        <div className="eyt-overlay" onClick={() => setOpenState(false)}>
          <div className="eyt-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="eyt-header">
              <span className="eyt-title">{title ?? videoId}</span>
              <button type="button" className="eyt-close" onClick={() => setOpenState(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="eyt-body">
              <div className="eyt-player">
                <iframe
                  ref={iframeRef}
                  src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0`}
                  title={title ?? videoId}
                  onLoad={handleIframeLoad}
                  className="eyt-iframe"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <div className="eyt-sidebar">
                <div className="eyt-sidebar-heading">Transcript</div>
                <div className="eyt-sidebar-scroll">
                  {loading && (
                    <div className="eyt-status">
                      <Loader2 size={16} className="eyt-spin" />
                      Loading transcript...
                    </div>
                  )}
                  {error && !loading && (
                    <div className="eyt-status eyt-error">
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}
                  {snippets?.map((snippet, index) => (
                    <TranscriptLine
                      key={index}
                      ref={(el) => {
                        lineRefs.current[index] = el;
                      }}
                      snippet={snippet}
                      isActive={index === activeIndex}
                      currentTime={currentTime}
                      onSeek={() => seekTo(snippet.start)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Scoped, framework-agnostic styles — no Tailwind/CSS-in-JS dependency
// required by consumers. Injected once per mounted modal (harmless if
// duplicated; browsers dedupe identical <style> text trivially in practice,
// and the cost of a stray extra tag is negligible).
const EYT_STYLES = `
.eyt-trigger { display: inline-flex; align-items: center; justify-content: center; padding: 2px; border: none; background: transparent; border-radius: 4px; color: #6b7280; cursor: pointer; }
.eyt-trigger:hover { color: #111827; background: rgba(0,0,0,0.05); }
.eyt-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; padding: 16px; }
.eyt-modal { width: 100%; max-width: 1024px; max-height: 90vh; background: #fff; color: #111827; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
.eyt-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; flex-shrink: 0; }
.eyt-title { font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 12px; }
.eyt-close { border: none; background: transparent; color: #6b7280; cursor: pointer; padding: 4px; border-radius: 6px; display: flex; }
.eyt-close:hover { background: rgba(0,0,0,0.05); color: #111827; }
.eyt-body { display: grid; grid-template-columns: 1fr; flex: 1; min-height: 0; }
@media (min-width: 1024px) { .eyt-body { grid-template-columns: 1fr 360px; } }
.eyt-player { position: relative; width: 100%; background: #000; padding-top: 56.25%; }
.eyt-iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.eyt-sidebar { display: flex; flex-direction: column; min-height: 0; border-top: 1px solid #e5e7eb; }
@media (min-width: 1024px) { .eyt-sidebar { border-top: 0; border-left: 1px solid #e5e7eb; } }
.eyt-sidebar-heading { padding: 8px 12px; font-size: 12px; font-weight: 500; color: #6b7280; border-bottom: 1px solid #e5e7eb; flex-shrink: 0; }
.eyt-sidebar-scroll { flex: 1; min-height: 280px; max-height: 280px; overflow-y: auto; padding: 8px; }
@media (min-width: 1024px) { .eyt-sidebar-scroll { max-height: none; } }
.eyt-status { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #6b7280; padding: 12px; }
.eyt-error { color: #dc2626; align-items: flex-start; }
.eyt-spin { animation: eyt-spin 1s linear infinite; }
@keyframes eyt-spin { to { transform: rotate(360deg); } }
.eyt-line { display: flex; gap: 8px; width: 100%; text-align: left; border: none; background: transparent; border-radius: 6px; padding: 6px 8px; font-size: 13px; cursor: pointer; color: inherit; }
.eyt-line:hover { background: rgba(0,0,0,0.05); }
.eyt-line-active { background: rgba(59,130,246,0.12); }
.eyt-line-time { flex-shrink: 0; font-variant-numeric: tabular-nums; font-size: 11px; color: #9ca3af; padding-top: 2px; }
.eyt-word-active { background: rgba(59,130,246,0.3); border-radius: 3px; padding: 0 2px; font-weight: 500; color: #1d4ed8; }
`;
