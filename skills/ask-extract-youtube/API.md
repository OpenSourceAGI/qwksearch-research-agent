# extract-youtube API Reference

## `YouTubeTranscriptApi`

```ts
new YouTubeTranscriptApi(options?: { proxyConfig?: ProxyConfig; httpClient?: HttpClient })

fetchTranscript(videoId, { languages = ["en"], preserveFormatting = false }): Promise<FetchedTranscript>
listTranscripts(videoId): Promise<TranscriptList>
fetch(videoId, options)   // @deprecated alias of fetchTranscript
list(videoId)             // @deprecated alias of listTranscripts
```

Holds an HTTP client — not thread-safe; one instance per worker/thread.

## `TranscriptList`

Iterable. `findTranscript(codes)` (manual tracks preferred, then auto-generated),
`findManuallyCreatedTranscript(codes)`, `findGeneratedTranscript(codes)`. Each returns
a `Transcript`, or throws `NoTranscriptFound`.

## `Transcript`

`fetch(preserveFormatting?)` → `FetchedTranscript`; `translate(languageCode)` →
`Transcript`; plus track metadata (language, code, generated flag,
`translationLanguages`).

## `FetchedTranscript`

`snippets: FetchedTranscriptSnippet[]` — each `{ text, start, duration }`.

## Transcript utilities

| Export | Returns |
| --- | --- |
| `extractVideoId(url)` | The 11-character id from any YouTube URL form |
| `encodeTranscriptSpeeds(transcript, addPlayer = false)` | `{ html, word_count, speeds }` — `speeds` is run-length encoded (`"3x12,4x8"`) |
| `getTimestampAtChar(transcript, charIndex)` | Seconds at that character offset |
| `decompressTimestampsArray(speeds)` | `number[]` from the run-length string |

## Formatters

`Formatter` (abstract) · `JSONFormatter` · `TextFormatter` · `PrettyPrintFormatter` ·
`ArticleFormatter` · `SRTFormatter` · `WebVTTFormatter` · `FormatterLoader` (by name) ·
`UnknownFormatterType`.

## Proxies

| Class | Constructor |
| --- | --- |
| `GenericProxyConfig` | `{ httpUrl, httpsUrl }` |
| `WebshareProxyConfig` | `{ proxyUsername, proxyPassword, filterIpLocations? }` |
| `ProxyConfig` | Base class |
| `InvalidProxyConfig` | Thrown on a malformed config |

## Errors

Base: `YouTubeTranscriptApiException`.

| Error | Meaning |
| --- | --- |
| `CouldNotRetrieveTranscript` | Base for retrieval failures |
| `InvalidVideoId` | Not a valid video id (often a URL was passed) |
| `TranscriptsDisabled` | Captions disabled by the uploader |
| `NoTranscriptFound` | No track matched the requested languages |
| `NotTranslatable` / `TranslationLanguageNotAvailable` | Translation unsupported / target unavailable |
| `RequestBlocked` / `IpBlocked` | YouTube blocked the request or the IP |
| `AgeRestricted` / `VideoUnplayable` / `VideoUnavailable` | Playability gates |
| `PoTokenRequired` | Proof-of-origin token demanded |
| `YouTubeRequestFailed` / `YouTubeDataUnparsable` | HTTP failure / player JSON changed shape |
| `CookieError`, `CookiePathInvalid`, `CookieInvalid`, `FailedToCreateConsentCookie` | Consent-cookie flow |

Enums: `PlayabilityStatus`, `PlayabilityFailedReason`.

## Types

`FetchedTranscriptSnippet`, `TranslationLanguage`, `RequestsProxyConfigDict`,
`CaptionTrack`, `CaptionsJson`, `InnerTubeData`, `HttpClient`.

## React (`extract-youtube/react`)

Peers: `react`, `react-dom`, `lucide-react`.

| Group | Exports |
| --- | --- |
| Transcript modal | `YouTubeTranscriptModal`, `YouTubeTranscriptModalProps`, `loadTranscript`, `useTranscript`, `formatTime`, `groupIntoSentences`, `TranscriptSnippet`, `TranscriptSource` |
| Floating player | `FloatingYouTubePlayer`, `youtubePlayer`, `usePlayerState`, `usePlayerSelector`, `getPlayerState`, `sendPlayerCommand`, `buildEmbedUrl`, `watchUrl`, `thumbnailUrl`, `describePlayerError`, `PlayerVideo`, `PlayerState`, `PlayerControlContext` |
| Grid | `VideoCard`, `StackedVideoCard`, `StackNav`, `defaultStackLabel`, `VideoGrid`, `VideoList`, `HideConfirm`, `useVideoLibrary`, `useResizableColumns`, `ColumnResizeHandle`, `GridStylesProvider`, `GRID_STYLES` |
| Grid helpers | `formatViewCount`, `formatVideoDate`, `formatCustomValue` (badge text), `formatCustomCell` (table cell), `toPlayerVideo`, `thumbnailFor`, `groupByYear`, `groupByChannel`, `groupByCategory`, `groupByCustomField` |
| Admin | `VideoLibraryAdmin` (`client`, `customFields?`, `pageSize` 25, `hideMaintenance`, `onChange`), `VideoEditDialog` (`client`, `video \| null`, `customFields`, `categories`, `onClose`, `onSaved`), `CustomFieldInput` (`def`, `value`, `onChange`), `VideoAvailabilityPanel` (`client`, `limit` 100, `onChange`) |

`VideoActionProps` (shared by card, grid, list): `favorites`, `hidden`,
`onToggleFavorite`, `onHide`, `onUnhide`, `onPlay`, `showQueueButton`,
`showYouTubeLink`, `onBadgeClick`, `customFields`, `getProgress`, `renderActions`,
`transcriptUrl` / `fetchTranscript`.

## Library (`extract-youtube/library`)

No React, no Node built-ins.

| Area | Exports |
| --- | --- |
| Types | `LibraryVideo`, `VideoItem`, `CustomFieldDef` (`key`, `label`, `type`: text/textarea/number/boolean/url/select, `options`, `help`, `searchable`, `showOnCard`, `showInList`), `LibraryQuery`, `LibraryPage`, `LibrarySort`, `LibraryVideoPatch`, `VideoAvailability`, `LibraryExclusion` |
| Fields | `isVideoId`, `coerceCustomValue`, `mergeCustomFields`, `buildLibraryUpdate`, `buildNewLibraryVideo`, `normalizeLibraryVideo`, `searchTextFor`, `normalizeTags` |
| Query | `parseLibraryQuery(URLSearchParams)`, `libraryQueryToParams`, `applyLibraryQuery` (reference semantics), `compareLibraryVideos`, `clampLimit` (25 default, 100 max) |
| Stacks | `extractLinkedVideoIds`, `buildVideoStacks`, `assignVideoStacks`, `buildVideoSlots`, `stackKeyOf`, `collectStackKeys`, `MAX_LINKS_PER_DESCRIPTION` (8), `MAX_STACK_SIZE` (12) |
| Tree | `buildVideoTree`, `resolveGroupers`, `BUILT_IN_GROUPERS`, `groupBy*`, `videoTreeDepth`, `sortVideoTreeLeaves`, `countVideoTreeLeaves`, `groupKeysFromDepth`, `UNGROUPED_LABEL` |
| Stores | `createMemoryLibraryStore({ seed, customFields })`, `createD1LibraryStore(db, { tablePrefix = 'eyt_' })` + `ensureSchema()`, `librarySchemaSql(prefix)`, `VideoLibraryStore`, `D1DatabaseLike` |
| Operations | `createLibraryVideo`, `updateLibraryVideo`, `deleteLibraryVideo`, `importLibraryVideos`, `recomputeStacks`, `resyncLibrary`, `resyncQuotaCost`, `autofillVideo` |
| YouTube | `fetchYouTubeMetadata` (Data API, 50 per call), `classifyAvailability`, `fetchYouTubeOEmbed`, `YouTubeDataApiError` |
| HTTP | `createVideoLibraryHandler({ store, basePath = '/api/library', authorize, customFields, youtubeApiKey, suggest, fetch, onError })` → `{ handle, fetch }`, `bearerTokenAuth(token)`, `json()` |
| Client | `createLibraryClient({ baseUrl, headers, fetch })`, `createLocalLibraryClient({ store, customFields, latencyMs })`, `LibraryApiError` (`status`) |

Routes (under `basePath`): public `GET /videos`, `/videos/:id`, `/stacks?keys=`,
`/categories`, `/fields`, `/session`; admin `POST /videos`, `PATCH|DELETE /videos/:id`,
`POST /autofill`, `GET|POST /resync`, `GET|POST /availability`, `POST /import`,
`POST /stacks/recompute`, `GET /exclusions`, `DELETE /exclusions/:id`.

## Download (`extract-youtube/download`)

Node-only; needs the optional peer `cloud-ytdl` (and `ffmpeg` for MP3).

- `createMediaExtractor({ ytdl?, cookies?, proxy?, ffmpegPath?, spawn? })` →
  `getInfo(idOrUrl)` (`MediaInfo`: title, author, lengthSeconds, audio/video/progressive
  formats sorted best-first, captionLanguages), `downloadAudio(idOrUrl, { container:
  'mp3'|'m4a'|'webm', bitrateKbps, mono, sampleRate })`, `downloadVideo(idOrUrl, { quality })`
  — both resolve a `MediaDownload` (`stream`, `mimeType`, `filename`, `contentLength`,
  `format`, `info`) — plus `getSubtitles`, `getPlaylist`, `getPost`.
- `pickAudioFormat(formats, container)`, `summarizeFormat`, `safeFilename`.
- `MediaExtractionError` — `code` is `invalid` (400), `unavailable` (404),
  `dependency` (501: no `cloud-ytdl` / no ffmpeg) or `failed` (502).
- `createMediaHandler({ apiKey, ...extractorOptions })` — fetch-style handler for
  `…/info`, `…/audio`, `…/video`, `…/subtitles`, `…/playlist`, `…/post`;
  `serveMediaApi({ port })` serves it over `node:http`. CLI: `extract-youtube audio <id>`,
  `extract-youtube serve-media` (`MEDIA_API_KEY`, `YOUTUBE_COOKIES`).

## CLI (`extract-youtube <video-id>`)

| Flag | Meaning |
| --- | --- |
| `-l, --languages <codes>` | Comma-separated, e.g. `en,de,fr` |
| `-f, --format <type>` | `json` (default), `text`, `srt`, `webvtt`, `pretty`, `speeds` |
| `-p, --preserve-formatting` | Keep line breaks and inline markup |
| `--proxy <url>` | HTTP/HTTPS proxy |
| `--webshare-user` / `--webshare-pass` | Webshare credentials |
| `-h, --help` / `-v, --version` | |

## Build

`bun run build` = `clean` + `build:lib` + `build:cli` + `build:react` + `build:library` + `build:types`.
Tests run under **jest** (`bun run test`), not vitest.
