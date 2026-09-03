import { useState } from "react";
import { YouTubeTranscriptModal } from "extract-youtube/react";

// "Me at the zoo" — the first video ever uploaded to YouTube. Has captions,
// so the demo works out of the box.
const DEFAULT_VIDEO = "jNQXAC9IVRw";

// A browser-safe stand-in for the package's own `extractVideoId` (which
// lives in the main, Node-oriented entry point alongside the transcript
// fetcher — importing it here would pull that into the client bundle).
function parseVideoId(input) {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.slice(1).split("/")[0] || null;
    }
    const v = url.searchParams.get("v");
    if (v) return v;
    const match = url.pathname.match(/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [videoId, setVideoId] = useState(DEFAULT_VIDEO);
  const [input, setInput] = useState(DEFAULT_VIDEO);
  const [modalKey, setModalKey] = useState(0);

  const loadVideo = () => {
    const id = parseVideoId(input);
    if (!id) {
      window.alert("Couldn't find a video ID in that input — paste a YouTube URL or an 11-character video ID.");
      return;
    }
    setVideoId(id);
    // Remount the modal so a freshly-opened dialog re-fetches this video's transcript.
    setModalKey((k) => k + 1);
  };

  return (
    <main style={styles.main}>
      <h1 style={styles.h1}>extract-youtube — popout modal demo</h1>
      <p style={styles.p}>
        Paste any YouTube URL or video ID below, then open the player. The video plays on the
        left and its transcript loads on the side, synced to playback — click any line to seek.
      </p>

      <div style={styles.row}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadVideo()}
          placeholder="https://www.youtube.com/watch?v=... or a video ID"
          style={styles.input}
        />
        <button type="button" onClick={loadVideo} style={styles.button}>
          Load
        </button>
      </div>

      <p style={styles.meta}>
        Current video: <code>{videoId}</code>
      </p>

      <YouTubeTranscriptModal
        key={modalKey}
        videoId={videoId}
        title={`Video ${videoId}`}
        transcriptUrl="/api/transcript"
        trigger={
          <button type="button" style={styles.trigger}>
            ▶ Open video + subtitles
          </button>
        }
      />
    </main>
  );
}

const styles = {
  main: {
    fontFamily: "system-ui, -apple-system, sans-serif",
    maxWidth: 640,
    margin: "48px auto",
    padding: "0 16px",
    color: "#111827",
  },
  h1: { fontSize: 22, marginBottom: 8 },
  p: { color: "#4b5563", lineHeight: 1.5 },
  row: { display: "flex", gap: 8, marginTop: 16 },
  input: {
    flex: 1,
    padding: "8px 10px",
    fontSize: 14,
    border: "1px solid #d1d5db",
    borderRadius: 6,
  },
  button: {
    padding: "8px 16px",
    fontSize: 14,
    border: "1px solid #d1d5db",
    borderRadius: 6,
    background: "#f9fafb",
    cursor: "pointer",
  },
  meta: { fontSize: 13, color: "#6b7280", marginTop: 12 },
  trigger: {
    marginTop: 8,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 600,
    border: "none",
    borderRadius: 8,
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
  },
};
