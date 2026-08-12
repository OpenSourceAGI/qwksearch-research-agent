/**
 * @fileoverview Full-screen display of the phrase that was just spoken.
 *
 * While dictating, the words land in whatever input has focus — which is easy to
 * lose track of when you are looking away from the screen. This overlay echoes the
 * latest phrase in large type at the centre of the viewport and fades out two
 * seconds after the last update, so a glance confirms you were heard correctly.
 *
 * It renders into `document.body` through a portal with pointer events disabled, so
 * it never intercepts clicks or gets clipped by the host app's layout, and it is
 * styled inline so it looks the same in every app that mounts it regardless of the
 * CSS framework in play.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

export interface SpokenPhraseOverlayProps {
  /** The words to display. An empty string hides the overlay. */
  phrase: string;
  /**
   * Bump this whenever `phrase` is refreshed to restart the hide timer, including
   * when the same words are repeated. `useLiveTranscription` supplies it.
   */
  phraseId?: number;
  /** How long the phrase stays up after the last update. Default 2000ms. */
  durationMs?: number;
  /** Set false to suppress the overlay entirely (e.g. once dictation stops). */
  visible?: boolean;
  /** Stacking order. Default 2147483000, above typical app chrome and modals. */
  zIndex?: number;
  className?: string;
}

const HIDE_AFTER_MS = 2000;

export function SpokenPhraseOverlay({
  phrase,
  phraseId,
  durationMs = HIDE_AFTER_MS,
  visible = true,
  zIndex = 2147483000,
  className,
}: SpokenPhraseOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  // Held separately from `phrase` so the text stays put while fading out rather
  // than blanking the moment the transcript clears.
  const [displayed, setDisplayed] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const text = phrase.trim();
    if (!visible || !text) {
      if (!visible) setShown(false);
      return;
    }

    setDisplayed(text);
    setShown(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShown(false), durationMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phrase, phraseId, visible, durationMs]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!mounted || !displayed) return null;

  const containerStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
    padding: "6vw",
    zIndex,
    opacity: shown ? 1 : 0,
    transition: "opacity 320ms ease-out",
  };

  const textStyle: CSSProperties = {
    maxWidth: "min(1100px, 90vw)",
    textAlign: "center",
    // Scales with the viewport so a short phrase fills the screen on a laptop
    // and still fits on a phone.
    fontSize: "clamp(2rem, 7vw, 6rem)",
    fontWeight: 700,
    lineHeight: 1.1,
    letterSpacing: "-0.02em",
    color: "#ffffff",
    // A dark pill keeps the words readable over light and dark pages alike.
    background: "rgba(15, 23, 42, 0.82)",
    borderRadius: "1.5rem",
    padding: "0.6em 0.8em",
    boxShadow: "0 25px 80px rgba(0, 0, 0, 0.45)",
    backdropFilter: "blur(8px)",
    transform: shown ? "scale(1)" : "scale(0.96)",
    transition: "transform 320ms ease-out",
    overflowWrap: "anywhere",
  };

  return createPortal(
    <div
      aria-hidden="true"
      className={className}
      data-spoken-phrase-overlay=""
      style={containerStyle}
    >
      <div style={textStyle}>{displayed}</div>
    </div>,
    document.body
  );
}

export default SpokenPhraseOverlay;
