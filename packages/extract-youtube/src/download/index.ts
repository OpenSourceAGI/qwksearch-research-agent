/**
 * @fileoverview `extract-youtube/download` — audio/video download, subtitles,
 * playlists and community posts via the optional `cloud-ytdl` peer, plus an
 * HTTP API to run it as a cloud service. Node-only; see `media.ts`.
 */

export {
  createMediaExtractor,
  pickAudioFormat,
  summarizeFormat,
  safeFilename,
  MediaExtractionError,
} from './media';
export type {
  AudioContainer,
  SubtitleFormat,
  CloudYtdl,
  CloudYtdlFormat,
  CloudYtdlInfo,
  DownloadAudioOptions,
  MediaDownload,
  MediaExtractor,
  MediaExtractorOptions,
  MediaFormatSummary,
  MediaInfo,
  SpawnFn,
} from './media';
export { createMediaHandler, serveMediaApi } from './handler';
export type { MediaHandlerOptions } from './handler';
