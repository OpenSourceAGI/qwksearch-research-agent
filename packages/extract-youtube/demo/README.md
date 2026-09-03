# extract-youtube demo

Standalone app that puts `extract-youtube/react`'s popout modal together
end to end: paste any YouTube URL, open the player, and watch the
transcript sync to playback in the side panel.

Full setup docs live in the parent package's
[README → "React Popout Modal"](../README.md#react-popout-modal-video--synced-subtitles).

## Run it

```bash
# from packages/extract-youtube:
npm run build   # builds dist/ (this demo depends on it via file:..)
npm run demo    # installs this folder's deps and starts server + client

# or, from this folder directly:
npm install
npm run dev     # starts both the Express API (:8787) and Vite (:5173)
```

Open http://localhost:5173.

## What's here

- `server.js` — Express endpoint (`GET /api/transcript?videoId=...`) that
  wraps `YouTubeTranscriptApi` from the parent package. Plain Node/Express
  so it's easy to adapt into a real backend — a Next.js route handler, a
  Cloudflare Worker, a Lambda — see the parent README for those.
- `src/App.jsx` — the video-ID input and the `YouTubeTranscriptModal` it
  drives.
- `vite.config.js` — proxies `/api` to the Express server in dev, so the
  browser never deals with a second port or CORS.
