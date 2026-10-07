/**
 * @fileoverview Media download and extraction on top of `cloud-ytdl` — the
 * InnerTube (Android client) downloader with signature/`n` decoding built in.
 *
 * This is the one part of the package that is **Node-only**: `cloud-ytdl`
 * streams over undici and Node HTTP agents, and the MP3 path spawns `ffmpeg`.
 * It lives behind its own entry point (`extract-youtube/download`) so the
 * transcript and library entries stay Worker-safe, and `cloud-ytdl` is an
 * optional peer dependency loaded on first use — installing `extract-youtube`
 * for transcripts never pulls it in.
 *
 * The usual reason to reach for it: a video with no captions. Download the
 * audio track here, then hand it to a speech-to-text model.
 */

import type { Readable } from 'node:stream';

/** Audio containers `downloadAudio` can produce. `mp3` is transcoded by ffmpeg. */
export type AudioContainer = 'm4a' | 'webm' | 'mp3';

/** Subtitle output formats `getSubtitles` can produce. */
export type SubtitleFormat = 'srt' | 'xml';

/**
 * The slice of a `cloud-ytdl` format object this module reads. Every field is
 * optional: YouTube changes these responses without notice.
 */
export interface CloudYtdlFormat {
  itag?: number;
  url?: string;
  mimeType?: string;
  container?: string;
  hasAudio?: boolean;
  hasVideo?: boolean;
  qualityLabel?: string | null;
  audioBitrate?: number | null;
  bitrate?: number;
  contentLength?: string;
  audioCodec?: string | null;
  videoCodec?: string | null;
  isLive?: boolean;
  isHLS?: boolean;
  isDashMPD?: boolean;
}

/** The slice of a `cloud-ytdl` info object this module reads. */
export interface CloudYtdlInfo {
  videoDetails?: {
    videoId?: string;
    title?: string;
    author?: { name?: string } | string;
    ownerChannelName?: string;
    lengthSeconds?: string | number;
    isLiveContent?: boolean;
    thumbnails?: Array<{ url?: string; width?: number }>;
  };
  formats?: CloudYtdlFormat[];
  player_response?: {
    captions?: {
      playerCaptionsTracklistRenderer?: {
        captionTracks?: Array<{ languageCode?: string }>;
      };
    };
  };
}

/**
 * The `cloud-ytdl` surface this module uses. Typed structurally rather than
 * imported, so the package type-checks without the optional peer installed —
 * and so tests can hand in a fake.
 */
export interface CloudYtdl {
  getInfo(url: string, options?: Record<string, unknown>): Promise<CloudYtdlInfo>;
  downloadFromInfo(info: CloudYtdlInfo, options?: Record<string, unknown>): Readable;
  getSubtitles(
    videoId: string,
    options?: { lang?: string; format?: string; cookie?: string },
  ): Promise<string | null>;
  getPlaylistInfo(url: string, options?: Record<string, unknown>): Promise<unknown>;
  getPostInfo(url: string, options?: Record<string, unknown>): Promise<unknown>;
  getVideoID(str: string): string;
  createAgent?(cookies?: string | unknown[], options?: Record<string, unknown>): unknown;
  createProxyAgent?(options: string | Record<string, unknown>, cookies?: string | unknown[]): unknown;
}

/** Minimal `child_process.spawn` signature, so tests can stub ffmpeg. */
export type SpawnFn = (
  command: string,
  args: string[],
  options: { stdio: ['pipe', 'pipe', 'pipe'] },
) => {
  stdin: NodeJS.WritableStream | null;
  stdout: Readable | null;
  stderr: Readable | null;
  on(event: 'error', listener: (error: Error) => void): unknown;
  on(event: 'close', listener: (code: number | null) => void): unknown;
  kill(signal?: NodeJS.Signals | number): boolean;
};

export interface MediaExtractorOptions {
  /** A `cloud-ytdl` instance. Defaults to importing the `cloud-ytdl` peer. */
  ytdl?: CloudYtdl;
  /**
   * Cookie header for age-, region- or member-restricted videos. Treat it as a
   * password: never log it, never commit it.
   */
  cookies?: string;
  /** Proxy URI (`http://user:pass@host:port`) every request is routed through. */
  proxy?: string;
  /** Path to the ffmpeg binary used for MP3. Defaults to `ffmpeg` on `PATH`. */
  ffmpegPath?: string;
  /** Test seam for the ffmpeg child process. Defaults to `child_process.spawn`. */
  spawn?: SpawnFn;
}

/** One downloadable stream, flattened from the `cloud-ytdl` format. */
export interface MediaFormatSummary {
  itag: number | null;
  mimeType: string | null;
  container: string | null;
  hasAudio: boolean;
  hasVideo: boolean;
  qualityLabel: string | null;
  audioBitrate: number | null;
  bitrate: number | null;
  /** Bytes, when YouTube says; live and HLS streams never do. */
  contentLength: number | null;
  audioCodec: string | null;
  videoCodec: string | null;
  isLive: boolean;
}

/** What `getInfo` answers: the video, and every stream it can be downloaded as. */
export interface MediaInfo {
  videoId: string;
  title: string;
  author: string | null;
  lengthSeconds: number | null;
  isLive: boolean;
  thumbnail: string | null;
  /** Audio-only streams, best first. */
  audioFormats: MediaFormatSummary[];
  /** Video-only streams (DASH), highest resolution first. */
  videoFormats: MediaFormatSummary[];
  /** Streams carrying both audio and video. */
  progressiveFormats: MediaFormatSummary[];
  /** Caption track language codes; empty is normal, not an error. */
  captionLanguages: string[];
}

export interface DownloadAudioOptions {
  /** Output container. Default `mp3`; `m4a` and `webm` are YouTube's own, untouched. */
  container?: AudioContainer;
  /** MP3 bitrate in kbps. Default 128. Speech-to-text needs no more than 48–64. */
  bitrateKbps?: number;
  /** Downmix MP3 to one channel — halves the size, loses nothing for speech. */
  mono?: boolean;
  /** MP3 sample rate in Hz; 16000 is what speech models resample to anyway. */
  sampleRate?: number;
}

/** A download in flight: the bytes, plus what the caller needs to label them. */
export interface MediaDownload {
  stream: Readable;
  container: string;
  mimeType: string;
  /** A filesystem-safe file name built from the title. */
  filename: string;
  /** Source stream size in bytes when known; MP3 output size is never known up front. */
  contentLength: number | null;
  format: MediaFormatSummary;
  info: MediaInfo;
}

/** Thrown for every failure this module can name. */
export class MediaExtractionError extends Error {
  constructor(
    message: string,
    /** `unavailable` for a video or format that is not there; `dependency` for a missing peer or ffmpeg. */
    readonly code: 'unavailable' | 'dependency' | 'invalid' | 'failed' = 'failed',
  ) {
    super(message);
    this.name = 'MediaExtractionError';
  }
}

const AUDIO_MIME: Record<AudioContainer, string> = {
  m4a: 'audio/mp4',
  webm: 'audio/webm',
  mp3: 'audio/mpeg',
};

let ytdlPromise: Promise<CloudYtdl> | null = null;

/** Held in a variable so neither tsc nor a bundler tries to resolve the optional peer. */
const CLOUD_YTDL = 'cloud-ytdl';

/** Imports the optional `cloud-ytdl` peer once, with an actionable error if it is missing. */
async function loadCloudYtdl(): Promise<CloudYtdl> {
  ytdlPromise ??= import(CLOUD_YTDL)
    .then((mod: { default?: CloudYtdl }) => (mod.default ?? mod) as CloudYtdl)
    .catch((error: unknown) => {
      ytdlPromise = null;
      throw new MediaExtractionError(
        `extract-youtube/download needs the optional peer "cloud-ytdl" (npm install cloud-ytdl): ${
          (error as Error)?.message ?? error
        }`,
        'dependency',
      );
    });
  return ytdlPromise;
}

function toNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Flattens a `cloud-ytdl` format into the stable summary shape. */
export function summarizeFormat(format: CloudYtdlFormat): MediaFormatSummary {
  return {
    itag: toNumber(format.itag),
    mimeType: format.mimeType ?? null,
    container: format.container ?? null,
    hasAudio: Boolean(format.hasAudio),
    hasVideo: Boolean(format.hasVideo),
    qualityLabel: format.qualityLabel ?? null,
    audioBitrate: toNumber(format.audioBitrate),
    bitrate: toNumber(format.bitrate),
    contentLength: toNumber(format.contentLength),
    audioCodec: format.audioCodec ?? null,
    videoCodec: format.videoCodec ?? null,
    isLive: Boolean(format.isLive),
  };
}

const byAudioQuality = (a: CloudYtdlFormat, b: CloudYtdlFormat) =>
  (toNumber(b.audioBitrate) ?? 0) - (toNumber(a.audioBitrate) ?? 0) ||
  (toNumber(b.bitrate) ?? 0) - (toNumber(a.bitrate) ?? 0);

const byVideoHeight = (a: CloudYtdlFormat, b: CloudYtdlFormat) =>
  (parseInt(b.qualityLabel ?? '', 10) || 0) - (parseInt(a.qualityLabel ?? '', 10) || 0) ||
  (toNumber(b.bitrate) ?? 0) - (toNumber(a.bitrate) ?? 0);

function audioOnly(formats: CloudYtdlFormat[]): CloudYtdlFormat[] {
  return formats.filter((f) => f.hasAudio && !f.hasVideo && f.url).sort(byAudioQuality);
}

/**
 * Picks the source stream for an audio download: an audio-only stream in the
 * requested container, best bitrate first. For MP3 any container will do (ffmpeg
 * reads both), so the best audio-only stream wins; a video with no audio-only
 * stream at all falls back to its best progressive one.
 */
export function pickAudioFormat(
  formats: CloudYtdlFormat[],
  container: AudioContainer = 'mp3',
): CloudYtdlFormat | null {
  const audio = audioOnly(formats);
  // Segmented streams (HLS / DASH manifests) cannot be piped as one file.
  const direct = audio.filter((f) => !f.isHLS && !f.isDashMPD);
  const pool = direct.length ? direct : audio;

  if (container === 'm4a') return pool.find((f) => f.container === 'mp4' || /audio\/mp4/.test(f.mimeType ?? '')) ?? null;
  if (container === 'webm') return pool.find((f) => f.container === 'webm' || /audio\/webm/.test(f.mimeType ?? '')) ?? null;

  if (pool.length) return pool[0];
  return formats.filter((f) => f.hasAudio && f.url).sort(byAudioQuality)[0] ?? null;
}

/** Turns a title into a file name that is safe on every filesystem. */
export function safeFilename(title: string, extension: string): string {
  const base = title
    .normalize('NFKD')
    .replace(/[^\w\s.-]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 120);
  return `${base || 'youtube-media'}.${extension}`;
}

function summarizeInfo(info: CloudYtdlInfo, fallbackId: string): MediaInfo {
  const details = info.videoDetails ?? {};
  const formats = info.formats ?? [];
  const author =
    typeof details.author === 'string' ? details.author : details.author?.name ?? details.ownerChannelName ?? null;
  const thumbnails = [...(details.thumbnails ?? [])].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  const tracks = info.player_response?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];

  return {
    videoId: details.videoId ?? fallbackId,
    title: details.title ?? fallbackId,
    author,
    lengthSeconds: toNumber(details.lengthSeconds),
    isLive: Boolean(details.isLiveContent),
    thumbnail: thumbnails[0]?.url ?? null,
    audioFormats: audioOnly(formats).map(summarizeFormat),
    videoFormats: formats.filter((f) => f.hasVideo && !f.hasAudio).sort(byVideoHeight).map(summarizeFormat),
    progressiveFormats: formats.filter((f) => f.hasVideo && f.hasAudio).sort(byVideoHeight).map(summarizeFormat),
    captionLanguages: [...new Set(tracks.map((t) => t.languageCode).filter((c): c is string => !!c))],
  };
}

/**
 * Pipes `source` through ffmpeg into MP3. ffmpeg failing — missing binary,
 * unreadable input — destroys the returned stream with a named error rather
 * than ending it early, so a caller writing a file never keeps a truncated one.
 */
function transcodeToMp3(
  source: Readable,
  spawn: SpawnFn,
  ffmpegPath: string,
  { bitrateKbps = 128, mono = false, sampleRate }: DownloadAudioOptions,
  PassThroughCtor: typeof import('node:stream').PassThrough,
): Readable {
  const out = new PassThroughCtor();
  const args = ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-vn'];
  if (mono) args.push('-ac', '1');
  if (sampleRate) args.push('-ar', String(sampleRate));
  args.push('-codec:a', 'libmp3lame', '-b:a', `${Math.max(8, Math.round(bitrateKbps))}k`, '-f', 'mp3', 'pipe:1');

  const child = spawn(ffmpegPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr?.on('data', (chunk: Buffer) => {
    stderr = (stderr + chunk.toString()).slice(-2000);
  });

  const fail = (error: Error) => {
    source.destroy();
    child.kill('SIGKILL');
    if (!out.destroyed) out.destroy(error);
  };

  child.on('error', (error: Error & { code?: string }) =>
    fail(
      new MediaExtractionError(
        error.code === 'ENOENT'
          ? `ffmpeg was not found at "${ffmpegPath}"; install it or request container "m4a" / "webm" instead of "mp3"`
          : `ffmpeg failed to start: ${error.message}`,
        'dependency',
      ),
    ),
  );
  child.on('close', (code: number | null) => {
    if (code !== 0 && code !== null) fail(new MediaExtractionError(`ffmpeg exited with ${code}: ${stderr.trim()}`));
  });
  source.on('error', (error: Error) => fail(new MediaExtractionError(`Download failed: ${error.message}`)));
  out.on('close', () => {
    if (!out.readableEnded) {
      source.destroy();
      child.kill('SIGKILL');
    }
  });

  // EPIPE when ffmpeg exits first is reported through `close`, not here.
  child.stdin?.on('error', () => undefined);
  if (child.stdin) source.pipe(child.stdin as NodeJS.WritableStream);
  child.stdout?.pipe(out);
  return out;
}

/**
 * Builds a media extractor. Nothing is fetched or imported until a method is
 * called, so constructing one is free.
 *
 * @example
 * ```ts
 * import { createMediaExtractor } from 'extract-youtube/download';
 * const media = createMediaExtractor();
 * const { stream, filename } = await media.downloadAudio('dQw4w9WgXcQ', { container: 'mp3', bitrateKbps: 64, mono: true });
 * stream.pipe(fs.createWriteStream(filename));
 * ```
 */
export function createMediaExtractor(options: MediaExtractorOptions = {}) {
  const ytdl = async () => options.ytdl ?? loadCloudYtdl();
  let agent: unknown;

  /** Request options carrying the cookie / proxy agent, built once. */
  const requestOptions = async (): Promise<Record<string, unknown>> => {
    if (!options.cookies && !options.proxy) return {};
    const lib = await ytdl();
    if (agent === undefined) {
      agent = options.proxy
        ? lib.createProxyAgent?.(options.proxy, options.cookies)
        : lib.createAgent?.(options.cookies);
    }
    return agent ? { agent } : {};
  };

  const resolveId = async (idOrUrl: string): Promise<string> => {
    const value = (idOrUrl ?? '').trim();
    if (!value) throw new MediaExtractionError('A YouTube video id or URL is required', 'invalid');
    if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;
    try {
      return (await ytdl()).getVideoID(value);
    } catch (error) {
      if (error instanceof MediaExtractionError) throw error;
      throw new MediaExtractionError(`Not a YouTube video id or URL: ${value}`, 'invalid');
    }
  };

  const fetchInfo = async (idOrUrl: string) => {
    const videoId = await resolveId(idOrUrl);
    const lib = await ytdl();
    let raw: CloudYtdlInfo;
    try {
      raw = await lib.getInfo(`https://www.youtube.com/watch?v=${videoId}`, await requestOptions());
    } catch (error) {
      throw new MediaExtractionError(`Could not read video ${videoId}: ${(error as Error)?.message ?? error}`, 'unavailable');
    }
    return { videoId, lib, raw, info: summarizeInfo(raw, videoId) };
  };

  return {
    /** Title, length and every downloadable stream, without downloading anything. */
    async getInfo(idOrUrl: string): Promise<MediaInfo> {
      return (await fetchInfo(idOrUrl)).info;
    },

    /**
     * Streams the video's audio track — YouTube's own M4A/WebM untouched, or
     * MP3 via ffmpeg. For a speech-to-text upload, ask for
     * `{ container: 'mp3', bitrateKbps: 48, mono: true, sampleRate: 16000 }`:
     * about 21 MB an hour, under the usual 25 MB transcription limit.
     */
    async downloadAudio(idOrUrl: string, audio: DownloadAudioOptions = {}): Promise<MediaDownload> {
      const container = audio.container ?? 'mp3';
      if (!(container in AUDIO_MIME)) {
        throw new MediaExtractionError(`Unsupported audio container "${container}"`, 'invalid');
      }
      const { lib, raw, info } = await fetchInfo(idOrUrl);
      const format = pickAudioFormat(raw.formats ?? [], container);
      if (!format) {
        throw new MediaExtractionError(`Video ${info.videoId} has no ${container === 'mp3' ? 'audio' : container} stream`, 'unavailable');
      }
      const source = lib.downloadFromInfo(raw, { format, ...(await requestOptions()) });
      const summary = summarizeFormat(format);

      if (container !== 'mp3') {
        return {
          stream: source,
          container,
          mimeType: AUDIO_MIME[container],
          filename: safeFilename(info.title, container),
          contentLength: summary.contentLength,
          format: summary,
          info,
        };
      }

      const { spawn: nodeSpawn } = await import('node:child_process');
      const { PassThrough } = await import('node:stream');
      const stream = transcodeToMp3(
        source,
        options.spawn ?? (nodeSpawn as unknown as SpawnFn),
        options.ffmpegPath ?? 'ffmpeg',
        audio,
        PassThrough,
      );
      return {
        stream,
        container,
        mimeType: AUDIO_MIME.mp3,
        filename: safeFilename(info.title, 'mp3'),
        contentLength: null,
        format: summary,
        info,
      };
    },

    /**
     * Streams the video itself. `quality` is an itag, or `highest` (the best
     * stream carrying both audio and video — YouTube caps those at 360p/720p)
     * or `highestvideo` (the best video-only DASH stream, no sound).
     */
    async downloadVideo(
      idOrUrl: string,
      { quality = 'highest' }: { quality?: 'highest' | 'highestvideo' | number } = {},
    ): Promise<MediaDownload> {
      const { lib, raw, info } = await fetchInfo(idOrUrl);
      const formats = (raw.formats ?? []).filter((f) => f.url && f.hasVideo);
      const format =
        typeof quality === 'number'
          ? formats.find((f) => f.itag === quality)
          : quality === 'highestvideo'
            ? formats.filter((f) => !f.hasAudio).sort(byVideoHeight)[0]
            : formats.filter((f) => f.hasAudio).sort(byVideoHeight)[0];
      if (!format) throw new MediaExtractionError(`Video ${info.videoId} has no stream matching quality ${quality}`, 'unavailable');
      const summary = summarizeFormat(format);
      const container = summary.container ?? 'mp4';
      return {
        stream: lib.downloadFromInfo(raw, { format, ...(await requestOptions()) }),
        container,
        mimeType: (summary.mimeType ?? `video/${container}`).split(';')[0],
        filename: safeFilename(info.title, container),
        contentLength: summary.contentLength,
        format: summary,
        info,
      };
    },

    /** Captions as SRT or YouTube's XML; `null` when the video has none in that language. */
    async getSubtitles(
      idOrUrl: string,
      { lang = 'en', format = 'srt' }: { lang?: string; format?: SubtitleFormat } = {},
    ): Promise<string | null> {
      const videoId = await resolveId(idOrUrl);
      return (await ytdl()).getSubtitles(videoId, { lang, format, cookie: options.cookies });
    },

    /** Playlist (or radio mix) metadata and its videos, as `cloud-ytdl` returns them. */
    async getPlaylist(url: string): Promise<unknown> {
      return (await ytdl()).getPlaylistInfo(url, await requestOptions());
    },

    /** A community post's text, images and poll, as `cloud-ytdl` returns them. */
    async getPost(url: string): Promise<unknown> {
      return (await ytdl()).getPostInfo(url);
    },
  };
}

export type MediaExtractor = ReturnType<typeof createMediaExtractor>;
