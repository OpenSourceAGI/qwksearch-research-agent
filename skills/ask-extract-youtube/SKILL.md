---
name: ask-extract-youtube
description: Guide to extract-youtube (packages/extract-youtube), the browserless YouTube transcript extractor — the YouTubeTranscriptApi class, language selection and translation, the typed error hierarchy (RequestBlocked, IpBlocked, TranscriptsDisabled, AgeRestricted, PoTokenRequired…), Webshare and generic proxy configs, the JSON/text/SRT/WebVTT/article formatters, the reading-speed encoder, the CLI, the video library admin API (extract-youtube/library: memory or D1 store, createVideoLibraryHandler, client, stacks, custom fields, resync, auto-fill) and the React UI (floating player, transcript modal, VideoGrid/VideoList/VideoCard, VideoLibraryAdmin). Use when a transcript fetch fails or returns the wrong language, when YouTube blocks a datacenter IP, when picking an output format, when building or serving a video library with the grid or admin screens, or when the multi-target build (lib/cli/react/library) misbehaves.
---

# Working With extract-youtube

`packages/extract-youtube`, published as **extract-youtube**. Fetches YouTube subtitle
tracks over plain HTTP — no headless browser, no API key — so it runs on serverless and
edge platforms. Full class and error reference: [API.md](API.md).

## Setup

```ts
import { YouTubeTranscriptApi, extractVideoId } from "extract-youtube";

const api = new YouTubeTranscriptApi();
const transcript = await api.fetchTranscript(extractVideoId(url), { languages: ["en", "de"] });
```

`fetchTranscript` takes a **video id, not a URL** — use `extractVideoId` first. The
instance holds an HTTP client, so it is not thread-safe; create one per worker.

Subpaths: the root entry is the Node/edge transcript library,
`extract-youtube/library` is the video library and its admin API (no React, no Node
built-ins), `extract-youtube/react` is the UI (player, transcript modal, grid, list,
admin screens), and the `extract-youtube` binary is the CLI.

## Picking the right call

| You want | Call |
| --- | --- |
| The best transcript for a language preference | `api.fetchTranscript(videoId, { languages, preserveFormatting })` |
| Every available track first | `api.listTranscripts(videoId)` → `TranscriptList` |
| A specific track | `transcriptList.findTranscript(["de"])`, then `.fetch(preserveFormatting)` |
| A machine translation | `transcript.translate("en").fetch()` |
| The video id out of any URL form | `extractVideoId(url)` |
| Reading-speed HTML + word count | `encodeTranscriptSpeeds(transcript, addPlayer?)` → `{ html, word_count, speeds }` |
| The timestamp at a character offset | `getTimestampAtChar(transcript, charIndex)` |
| Expand a run-length `speeds` string | `decompressTimestampsArray(speeds)` |
| A formatted string | `new SRTFormatter().format(transcript)` — also `JSON`, `Text`, `PrettyPrint`, `Article`, `WebVTT`, or `FormatterLoader` by name |
| A ready-made UI | `import { YouTubeTranscriptModal, FloatingYouTubePlayer } from "extract-youtube/react"` |
| A video library API on a Worker | `createVideoLibraryHandler({ store: createD1LibraryStore(env.DB), authorize: bearerTokenAuth(env.ADMIN_TOKEN), customFields })` from `extract-youtube/library` |
| Show that library | `useVideoLibrary(createLibraryClient({ baseUrl }), query)` → `<VideoGrid videos stacks />` or `<VideoList groupBy />` |
| Admin screens for it | `<VideoLibraryAdmin client />`, `<VideoAvailabilityPanel client />`, `<VideoEditDialog client video />` |
| App-specific columns | `CustomFieldDef[]` passed to the handler **and** the components |
| A one-off from the terminal | `extract-youtube <video-id> -f srt -l en,de` |

`fetch()` and `list()` are `@deprecated` aliases for `fetchTranscript()` and
`listTranscripts()` — use the long names in new code.

## Recipes

**Language fallback.** `languages` is an ordered preference list (default `["en"]`).
`findTranscript` walks it and prefers a manually created track over an auto-generated
one; when none matches it throws `NoTranscriptFound` rather than returning something
arbitrary. To accept anything, list the codes explicitly or iterate the `TranscriptList`.

**Proxies, for IP bans.** YouTube blocks datacenter ranges aggressively — this is the
single most common production failure.

```ts
new YouTubeTranscriptApi({
  proxyConfig: new WebshareProxyConfig({ proxyUsername, proxyPassword, filterIpLocations: ["us", "de"] }),
});
// or: new GenericProxyConfig({ httpUrl, httpsUrl })
```

The CLI takes `--proxy`, or `--webshare-user` / `--webshare-pass`.

**Custom HTTP.** Pass `httpClient` to share state (cookies, keep-alive, a fetch wrapper
with retries) across instances; the default is `FetchHttpClient`.

**CLI formats.** `-f json|text|srt|webvtt|pretty|speeds`, `-p` to preserve formatting,
`-l en,de` for languages.

**Video library.** The store is where rows live (`createMemoryLibraryStore`,
`createD1LibraryStore` — call `ensureSchema()` once per cold start — or your own
`VideoLibraryStore`). The handler is one `Request → Response` function: `handle()`
resolves `null` off its `basePath`, `fetch()` answers 404. **With no `authorize`, every
admin route is 403**; `bearerTokenAuth("")` refuses everything. Hidden videos are
admin-only and `includeHidden` is ignored for the public. Writes all go through
`buildLibraryUpdate`, which recomputes `publishedMs`/`searchText`, sets `adminEdited`,
and keeps a stored title or date that a patch blanks. Deletes record an exclusion that
imports respect. Stacks form from description links (union-find, ≤8 links per
description, ≤12 per stack, oldest member keys it) and are recomputed on create,
description edits, import and `POST /stacks/recompute`.

**Grid and admin components.** Every card action is opt-in by callback. Pass
`stacks` (from `useVideoLibrary` or `/stacks`) so a stack's off-page members flip.
Styles are injected once per subtree by `GridStylesProvider` (`eytg-` classes,
`--eytg-*` variables). Cards read player state through `usePlayerSelector`, so only
the affected card re-renders. The admin table loads custom fields from `GET /fields`
when not given them and disables Resync when the server has no YouTube API key.

Docs, live demo and a story per component, as one Worker:
`packages/extract-youtube/site` (https://youtube.js.org, demo at `/demo`,
Storybook at `/storybook/`).

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| `InvalidVideoId` on a URL that plays fine | You passed a URL. `fetchTranscript` wants the bare id — run `extractVideoId` first. |
| `RequestBlocked` / `IpBlocked` | YouTube blocked the IP, typically a datacenter one. Configure a `WebshareProxyConfig` or `GenericProxyConfig`. |
| `TranscriptsDisabled` | The uploader disabled captions; no option changes this. |
| `NoTranscriptFound` | None of your `languages` exist for that video. List `listTranscripts(videoId)` and pick, or add auto-generated codes. |
| `NotTranslatable` / `TranslationLanguageNotAvailable` | That track has no translation support, or not into that target. |
| `AgeRestricted`, `VideoUnplayable`, `VideoUnavailable` | Playability gates — check `PlayabilityStatus` / `PlayabilityFailedReason` on the error. |
| `PoTokenRequired` | YouTube demanded a proof-of-origin token for that request. Retry through a different IP/proxy; the package does not mint tokens. |
| `YouTubeDataUnparsable` | YouTube changed its player JSON — a parser fix in `src/fetchers/youtube-data-extractor.ts`, not a config problem. |
| `CookieError` / `CookieInvalid` / `FailedToCreateConsentCookie` | The EU consent-cookie flow failed. Usually a region/proxy issue. |
| Transcript text has stray HTML entities | Pass `preserveFormatting: false` (the default); `true` keeps line breaks and inline markup. |
| React import pulls Node code in | Import `extract-youtube/react`, not the root entry. |
| Tests don't run under vitest | This package uses **jest** and is deliberately absent from the root vitest projects. |
| The CLI errors about a missing module | The build has four targets — `bun run build` runs `build:lib`, `build:cli`, `build:react`, `build:library` and `build:types`. Running only `vite build` produces the lib and nothing else. |
| Every admin route answers 403 | No `authorize` was passed, or `bearerTokenAuth` got an empty token. Both mean "refuse" by design. |
| `POST /resync` answers 501 | The handler has no `youtubeApiKey`. |
| D1 "too many SQL variables" | Not from this store: id lists bind as one JSON param with `json_each`. Check your own queries. |
| A stack's arrows only reach videos on this page | Pass `stacks` to `<VideoGrid>` / `<VideoList>`, or use `useVideoLibrary`, which fetches them. |
| `library-handler.test.ts` fails to import `node:sqlite` | It needs Node 22+. CI pins Node 22 for that job. |
