/**
 * Demo API server.
 *
 * Wraps extract-youtube's `YouTubeTranscriptApi` behind a tiny HTTP endpoint
 * so the browser demo can load captions for any video ID. This split exists
 * because extract-youtube fetches YouTube's caption endpoints directly (no
 * headless browser) and those calls need to happen server-side — a browser
 * page can't hit them itself due to CORS, and shouldn't anyway since the
 * whole point of this package is a small serverless-friendly Node API.
 *
 * In a real app this endpoint is whatever your framework provides (a
 * Next.js route handler, a Cloudflare Worker, a Lambda) — see the "Wiring
 * up your own backend endpoint" section of the package README for those.
 * This plain Express server exists purely so the demo runs standalone.
 */

import express from "express";
import cors from "cors";
import { YouTubeTranscriptApi, extractVideoId } from "extract-youtube";

const app = express();
app.use(cors());

const api = new YouTubeTranscriptApi();

app.get("/api/transcript", async (req, res) => {
  const raw = req.query.videoId;
  const videoId = typeof raw === "string" ? extractVideoId(raw) : null;

  if (!videoId) {
    res.status(400).json({ error: "Missing or invalid videoId query param" });
    return;
  }

  try {
    const transcript = await api.fetchTranscript(videoId, { languages: ["en"] });
    res.json({ videoId, snippets: transcript.toRawData() });
  } catch (error) {
    // Respond 200 with an `error` field rather than a non-2xx status —
    // the modal component checks for this field either way, and it keeps
    // "no captions for this video" from looking like a server failure.
    res.json({
      videoId,
      snippets: [],
      error: error instanceof Error ? error.message : "Failed to fetch transcript",
    });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`extract-youtube demo API listening on http://localhost:${PORT}`);
});
